import { pb } from './pocketbase';
import { rbacService } from './rbacService.svelte';
import { updateStore } from './updateService.svelte';
import { getMailboxService } from './mailboxServiceStore.svelte';
import { useRequestAdmin } from './requestAdminService.svelte';
import { getEmailService } from './emailServiceStore.svelte';
import { proposalService } from './improvementProposalService.svelte';
import { type AckData, checkNotificationIncrements, safeSendNotification } from './notificationHelpers';
import { countPendingAdmissions, countPendingChanges } from './notificationCounts';

const SWR_LOCK_MS = 30000;
const BASE_POLL_INTERVAL_MS = 60000;
const MAX_BACKOFF_POLL_MS = 300000;

export class NotificationStore {
    isNotificationsOpen = $state(false);
    isLoading = $state(false);
    lastFetchTime = $state(0);
    hasNewNotifications = $state(false);
    openSupportTickets = $state(0);

    private pollTimer: any = null;
    private currentPollInterval = BASE_POLL_INTERVAL_MS;
    private initialized = false;
    private abortController: AbortController | null = null;

    private mailboxService = getMailboxService();
    private reqAdmin = useRequestAdmin();
    private emailService = getEmailService();

    private lastEmailSyncTime = 0;
    private prev = { unread: -1, pending: -1, admissions: -1, changes: -1, proposals: -1, supportTickets: -1 };
    private ackData: AckData = { mails: 0, reqs: 0, admissions: 0, changes: 0, proposals: 0, supportTickets: 0, updates: false };

    constructor() {
        if (typeof localStorage !== 'undefined') {
            try {
                const stored = localStorage.getItem('orga_ack_data');
                if (stored) this.ackData = JSON.parse(stored);
            } catch (e) {}
        }
    }

    get unreadMails(): number {
        return this.mailboxService.totalUnread || 0;
    }

    get pendingRequests(): number {
        return this.reqAdmin.requests.filter(r => r.status !== 'accepted' && r.status !== 'denied').length;
    }

    get hasUnreadUpdates(): boolean {
        const userId = pb.authStore.model?.id;
        if (!userId) return false;
        return updateStore.updates?.some((u: any) => {
            const arr = Array.isArray(u.read_by) ? u.read_by : (u.read_by ? [u.read_by] : []);
            return !arr.includes(userId);
        }) || false;
    }

    get pendingAdmissions(): number {
        return countPendingAdmissions();
    }

    get pendingChanges(): number {
        return countPendingChanges();
    }

    get unreadProposals(): number {
        const isSuper = pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'developer' || rbacService.isOwner || pb.authStore.model?.role === 'admin';
        return isSuper ? proposalService.unreadCount : 0;
    }

    get totalIncomingCount(): number {
        return this.pendingRequests + this.pendingAdmissions + this.pendingChanges + this.openSupportTickets + this.unreadProposals;
    }

    get totalNotifications(): number {
        return this.unreadMails + this.totalIncomingCount + (this.hasUnreadUpdates ? 1 : 0);
    }

    safeSendNotification(title: string, body: string) {
        safeSendNotification(title, body);
    }

    private runNotificationCheck() {
        const res = checkNotificationIncrements({
            unreadMails: this.unreadMails,
            pendingRequests: this.pendingRequests,
            pendingAdmissions: this.pendingAdmissions,
            pendingChanges: this.pendingChanges,
            unreadProposals: this.unreadProposals,
            openSupportTickets: this.openSupportTickets,
            hasUnreadUpdates: this.hasUnreadUpdates,
            prev: this.prev,
            ackData: this.ackData
        });
        this.ackData = res.ackData;
        this.hasNewNotifications = res.hasNew;
    }

    async refresh(options: { force?: boolean } = {}) {
        if (!pb.authStore.isValid) return;
        const now = Date.now();
        if (!options.force && (now - this.lastFetchTime < SWR_LOCK_MS)) {
            this.runNotificationCheck();
            return;
        }
        if (this.isLoading) return;
        this.isLoading = true;
        this.lastFetchTime = now;

        if (this.abortController) { try { this.abortController.abort(); } catch {} }
        this.abortController = new AbortController();
        const timeoutId = setTimeout(() => { if (this.abortController) this.abortController.abort(); }, 5000);

        const signal = this.abortController.signal;
        const currentUserId = pb.authStore.model?.id;
        const isSuperAdmin = pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'developer' || rbacService.isOwner || pb.authStore.model?.role === 'admin';

        const canSyncEmail = currentUserId && (now - this.lastEmailSyncTime >= BASE_POLL_INTERVAL_MS);
        if (canSyncEmail) this.lastEmailSyncTime = now;

        try {
            await Promise.allSettled([
                this.reqAdmin.init(),
                (canSyncEmail ? this.emailService.syncEmails({ signal }).catch(() => ({ synced_count: 0 })) : Promise.resolve({ synced_count: 0 })),
                (currentUserId ? this.mailboxService.loadFolders(currentUserId).catch(() => []) : Promise.resolve([])),
                (isSuperAdmin ? updateStore.check().catch(() => {}) : Promise.resolve()),
                (isSuperAdmin ? proposalService.init().catch(() => {}) : Promise.resolve()),
                (isSuperAdmin ? pb.collection('support_tickets').getFullList({
                    filter: 'status != "Gelöst" && status != "Geschlossen" && status != "resolved"',
                    requestKey: null
                }).then(t => {
                    this.openSupportTickets = t.filter((ticket: any) => {
                        const s = (ticket.status || '').toLowerCase();
                        return !s.includes('gelöst') && !s.includes('geschlossen') && s !== 'resolved';
                    }).length;
                }).catch(() => {}) : Promise.resolve())
            ]);
        } catch (err: any) {
            console.warn('[NotificationStore] Fetch-Fehler:', err?.message);
        } finally {
            clearTimeout(timeoutId);
            this.isLoading = false;
            this.runNotificationCheck();
            this.adjustBackoffInterval();
        }
    }

    private adjustBackoffInterval() {
        this.currentPollInterval = (this.totalNotifications === 0) ? Math.min(MAX_BACKOFF_POLL_MS, Math.round(this.currentPollInterval * 1.5)) : BASE_POLL_INTERVAL_MS;
        this.scheduleNextPoll();
    }

    private scheduleNextPoll() {
        if (this.pollTimer) { clearTimeout(this.pollTimer); this.pollTimer = null; }
        this.pollTimer = setTimeout(async () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine) {
                await this.refresh();
            } else {
                this.scheduleNextPoll();
            }
        }, this.currentPollInterval);
    }

    toggleNotifications() {
        this.isNotificationsOpen = !this.isNotificationsOpen;
        if (this.isNotificationsOpen) { this.acknowledgeAll(); this.refresh(); }
    }

    closeNotifications() {
        this.isNotificationsOpen = false;
    }

    acknowledgeAll() {
        this.ackData = {
            mails: this.unreadMails,
            reqs: this.pendingRequests,
            admissions: this.pendingAdmissions,
            changes: this.pendingChanges,
            proposals: this.unreadProposals,
            supportTickets: this.openSupportTickets,
            updates: this.hasUnreadUpdates
        };
        if (typeof localStorage !== 'undefined') localStorage.setItem('orga_ack_data', JSON.stringify(this.ackData));
        this.hasNewNotifications = false;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.refresh();

        const handleResume = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine) {
                this.currentPollInterval = BASE_POLL_INTERVAL_MS;
                this.refresh();
            }
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleResume);
            window.addEventListener('focus', handleResume);
            window.addEventListener('online', handleResume);
        }

        try {
            pb.collection('appointment_requests').subscribe('*', () => { this.currentPollInterval = BASE_POLL_INTERVAL_MS; this.refresh({ force: true }); });
            pb.collection('appointments').subscribe('*', () => { this.currentPollInterval = BASE_POLL_INTERVAL_MS; this.refresh({ force: true }); });
            pb.collection('clients').subscribe('*', () => { this.currentPollInterval = BASE_POLL_INTERVAL_MS; this.refresh({ force: true }); });
            pb.collection('mailbox_messages').subscribe('*', () => { this.currentPollInterval = BASE_POLL_INTERVAL_MS; this.refresh({ force: true }); });
            pb.collection('improvement_proposals').subscribe('*', () => { this.currentPollInterval = BASE_POLL_INTERVAL_MS; this.refresh({ force: true }); });
            pb.collection('support_tickets').subscribe('*', () => { this.currentPollInterval = BASE_POLL_INTERVAL_MS; this.refresh({ force: true }); });
        } catch (e) {
            console.warn('[NotificationStore] Realtime subscription failed:', e);
        }

        this.scheduleNextPoll();
    }

    cleanup() {
        if (this.pollTimer) { clearTimeout(this.pollTimer); this.pollTimer = null; }
        if (this.abortController) { try { this.abortController.abort(); } catch {} this.abortController = null; }
        try {
            pb.collection('appointment_requests').unsubscribe('*');
            pb.collection('appointments').unsubscribe('*');
            pb.collection('clients').unsubscribe('*');
            pb.collection('mailbox_messages').unsubscribe('*');
            pb.collection('improvement_proposals').unsubscribe('*');
            pb.collection('support_tickets').unsubscribe('*');
        } catch {}
        this.initialized = false;
    }
}

export const notificationStore = new NotificationStore();
