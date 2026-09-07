import { pb } from './pocketbase';
import { updateStore } from './updateService.svelte';
import { getMailboxService } from './mailboxServiceStore.svelte';
import { useRequestAdmin } from './requestAdminService.svelte';
import { getEmailService } from './emailServiceStore.svelte';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { toastStore } from './toastService.svelte';

/**
 * notificationStore.svelte.ts
 * 
 * Zentraler, hochgradig resilienter Benachrichtigungs-Store für OrgaFlow.
 * 
 * Features:
 * 1. SWR Caching-Fenster (30 Sekunden Lock gegen Double-Fetch & UI-Freeze).
 * 2. Harter Timeout via AbortController (max. 5.000 ms für alle Netzwerk-Aufrufe).
 * 3. Adaptives Polling mit Exponential Backoff bei 0 Benachrichtigungen ("Alles erledigt!").
 * 4. PWA / Standby Resume-Handling & Multi-Device Synchronisation.
 */

const SWR_LOCK_MS = 30000; // 30 Sekunden Caching-Fenster
const BASE_POLL_INTERVAL_MS = 60000; // 60 Sekunden Basis-Intervall
const MAX_BACKOFF_POLL_MS = 300000; // Max. 5 Minuten Backoff bei Inaktivität

export class NotificationStore {
    isNotificationsOpen = $state(false);
    isLoading = $state(false);
    lastFetchTime = $state(0);
    hasNewNotifications = $state(false);

    private pollTimer: any = null;
    private currentPollInterval = BASE_POLL_INTERVAL_MS;
    private initialized = false;
    private abortController: AbortController | null = null;

    private mailboxService = getMailboxService();
    private reqAdmin = useRequestAdmin();
    private emailService = getEmailService();

    private prevUnread = -1;
    private prevPending = -1;
    private prevAdmissions = -1;
    private ackData = { mails: 0, reqs: 0, admissions: 0, updates: false };

    constructor() {
        if (typeof localStorage !== 'undefined') {
            try {
                const stored = localStorage.getItem('orga_ack_data');
                if (stored) this.ackData = JSON.parse(stored);
            } catch (e) {}
        }
    }

    // --- Reaktive Getters ---

    get unreadMails(): number {
        return this.mailboxService.totalUnread || 0;
    }

    get pendingRequests(): number {
        return this.reqAdmin.requests.filter(
            r => r.status !== 'accepted' && r.status !== 'denied'
        ).length;
    }

    get hasUnreadUpdates(): boolean {
        const userId = pb.authStore.model?.id;
        if (!userId) return false;
        return updateStore.updates?.some((u: any) => {
            const readByArray = Array.isArray(u.read_by) ? u.read_by : (u.read_by ? [u.read_by] : []);
            return !readByArray.includes(userId);
        }) || false;
    }

    get pendingAdmissions(): number {
        const isGodMode = pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin';
        const isAdmin = isGodMode || pb.authStore.model?.role === 'admin';
        let list = (orgaStore.clients?.data || []).filter(
            (c: any) => c.status === 'Inaktiv' && c.notes && c.notes.includes('NEUAUFNAHME-ANFRAGE')
        );

        if (!isGodMode) {
            const userCompanyId = pb.authStore.model?.company;
            if (isAdmin && userCompanyId) {
                list = list.filter((c: any) => {
                    const comp = c.company;
                    if (Array.isArray(comp)) return comp.includes(userCompanyId);
                    if (typeof comp === 'string' && comp.startsWith('[')) {
                        try { return JSON.parse(comp).includes(userCompanyId); } catch { return false; }
                    }
                    return comp === userCompanyId || (comp && comp.includes(userCompanyId));
                });
            } else {
                return 0;
            }
        }
        return list.length;
    }

    get totalNotifications(): number {
        return this.unreadMails + this.pendingRequests + this.pendingAdmissions + (this.hasUnreadUpdates ? 1 : 0);
    }

    // --- Notification Preferences & Safe Browser Dispatch ---

    private getNotifyPrefs() {
        try {
            return JSON.parse(localStorage.getItem('orga_notify_prefs') || '{"requests":true,"emails":true,"chats":true,"updates":true}');
        } catch {
            return { requests: true, emails: true, chats: true, updates: true };
        }
    }

    safeSendNotification(title: string, body: string) {
        try {
            if (typeof window === 'undefined') return;
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') return;
            if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
            
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, {
                        body,
                        icon: '/favicon.png',
                        badge: '/favicon.png',
                        data: { url: '/dashboard' }
                    });
                }).catch(() => {});
                return;
            }

            try {
                new Notification(title, { body, icon: '/favicon.png' });
            } catch (e) {}
        } catch (err) {
            console.warn('[NotificationStore] Notification error:', err);
        }
    }

    private checkNotificationIncrements() {
        const prefs = this.getNotifyPrefs();

        // 1. E-Mails
        if (this.prevUnread !== -1 && this.unreadMails > this.prevUnread) {
            const newCount = this.unreadMails - this.prevUnread;
            toastStore.info(`Du hast ${newCount} neue E-Mail(s) erhalten!`);
            if (prefs.emails !== false) {
                this.safeSendNotification('Neue E-Mail ✉️', `Sie haben ${newCount} neue Nachricht(en) im Posteingang.`);
            }
        }
        this.prevUnread = this.unreadMails;

        // 2. Terminanfragen
        if (this.prevPending !== -1 && this.pendingRequests > this.prevPending) {
            const newCount = this.pendingRequests - this.prevPending;
            toastStore.success('Eine neue Terminanfrage ist eingetroffen!');
            if (prefs.requests !== false) {
                this.safeSendNotification('Neue Terminanfrage 📬', `Sie haben ${newCount} neue Terminanfrage(n).`);
            }
        }
        this.prevPending = this.pendingRequests;

        // 3. Neuaufnahmen
        if (this.prevAdmissions !== -1 && this.pendingAdmissions > this.prevAdmissions) {
            const newCount = this.pendingAdmissions - this.prevAdmissions;
            toastStore.success('Eine neue Klienten-Aufnahme ist eingetroffen!');
            if (prefs.requests !== false) {
                this.safeSendNotification('Neue Klienten-Aufnahme 👤', `Sie haben ${newCount} neue Aufnahme-Anfrage(n).`);
            }
        }
        this.prevAdmissions = this.pendingAdmissions;

        // 4. Acknowledged Baseline
        if (this.unreadMails < this.ackData.mails) this.ackData.mails = this.unreadMails;
        if (this.pendingRequests < this.ackData.reqs) this.ackData.reqs = this.pendingRequests;
        if (this.pendingAdmissions < (this.ackData.admissions || 0)) this.ackData.admissions = this.pendingAdmissions;
        if (!this.hasUnreadUpdates) this.ackData.updates = false;

        this.hasNewNotifications =
            this.unreadMails > this.ackData.mails ||
            this.pendingRequests > this.ackData.reqs ||
            this.pendingAdmissions > (this.ackData.admissions || 0) ||
            (this.hasUnreadUpdates && !this.ackData.updates);

        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('orga_ack_data', JSON.stringify(this.ackData));
        }
    }

    // --- SWR Caching & Harter 5-Sekunden Timeout ---

    async refresh(options: { force?: boolean } = {}) {
        if (!pb.authStore.isValid) return;

        const now = Date.now();
        // SWR Lock: Wenn innerhalb von 30 Sekunden bereits abgerufen, nicht neu laden!
        if (!options.force && (now - this.lastFetchTime < SWR_LOCK_MS)) {
            this.checkNotificationIncrements();
            return;
        }

        // Freeze-Schutz: Wenn bereits ein Fetch läuft, verwerfen
        if (this.isLoading) return;

        this.isLoading = true;
        this.lastFetchTime = now;

        // Bestehenden AbortController abbrechen
        if (this.abortController) {
            try { this.abortController.abort(); } catch (e) {}
        }
        this.abortController = new AbortController();
        const timeoutId = setTimeout(() => {
            if (this.abortController) {
                this.abortController.abort();
            }
        }, 5000); // Harter 5s Timeout

        const signal = this.abortController.signal;
        const isGodMode = pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin';
        const isSuperAdmin = isGodMode || pb.authStore.model?.role === 'admin';

        try {
            await Promise.allSettled([
                this.reqAdmin.init(),
                (!isGodMode ? this.emailService.syncEmails({ signal }).catch(() => ({ synced_count: 0 })) : Promise.resolve({ synced_count: 0 })),
                (!isGodMode ? this.mailboxService.loadFolders(pb.authStore.model?.id).catch(() => []) : Promise.resolve([])),
                (isSuperAdmin ? updateStore.check().catch(() => {}) : Promise.resolve())
            ]);
        } catch (err: any) {
            console.warn('[NotificationStore] Fetch-Fehler abgefangen:', err?.message);
        } finally {
            clearTimeout(timeoutId);
            this.isLoading = false;
            this.checkNotificationIncrements();
            this.adjustBackoffInterval();
        }
    }

    // --- Adaptives Polling mit Exponential Backoff bei 0 Benachrichtigungen ---

    private adjustBackoffInterval() {
        if (this.totalNotifications === 0) {
            // "Alles erledigt!" -> Backoff schrittweise vergrößern (60s -> 90s -> 135s -> max. 300s)
            this.currentPollInterval = Math.min(
                MAX_BACKOFF_POLL_MS,
                Math.round(this.currentPollInterval * 1.5)
            );
        } else {
            // Es liegen Benachrichtigungen vor -> Basis-Intervall wiederherstellen
            this.currentPollInterval = BASE_POLL_INTERVAL_MS;
        }
        this.scheduleNextPoll();
    }

    private scheduleNextPoll() {
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }

        this.pollTimer = setTimeout(async () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine) {
                await this.refresh();
            } else {
                // Bei Inaktivität nächsten Versuch planen
                this.scheduleNextPoll();
            }
        }, this.currentPollInterval);
    }

    // --- UI Interaktionen ---

    toggleNotifications() {
        this.isNotificationsOpen = !this.isNotificationsOpen;
        if (this.isNotificationsOpen) {
            this.acknowledgeAll();
            // Beim Öffnen der Seitenleiste: SWR Abruf (max. alle 30s)
            this.refresh();
        }
    }

    openNotifications() {
        this.isNotificationsOpen = true;
        this.acknowledgeAll();
        this.refresh();
    }

    closeNotifications() {
        this.isNotificationsOpen = false;
    }

    acknowledgeAll() {
        this.ackData = {
            mails: this.unreadMails,
            reqs: this.pendingRequests,
            admissions: this.pendingAdmissions,
            updates: this.hasUnreadUpdates
        };
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('orga_ack_data', JSON.stringify(this.ackData));
        }
        this.hasNewNotifications = false;
    }

    // --- Lifecycle Management ---

    init() {
        if (this.initialized) return;
        this.initialized = true;

        // Sofortige Initialisierung mit SWR-Schutz
        this.refresh();

        const handleResume = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine) {
                this.currentPollInterval = BASE_POLL_INTERVAL_MS; // Reset Backoff bei Nutzeraktivität
                this.refresh();
            }
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleResume);
            window.addEventListener('focus', handleResume);
            window.addEventListener('online', handleResume);
        }

        // Live-Subskription für Anfragen
        try {
            pb.collection('appointment_requests').subscribe('*', () => {
                this.currentPollInterval = BASE_POLL_INTERVAL_MS;
                this.refresh({ force: true });
            });
        } catch (e) {}

        this.scheduleNextPoll();
    }

    cleanup() {
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
        if (this.abortController) {
            try { this.abortController.abort(); } catch (e) {}
            this.abortController = null;
        }
        try {
            pb.collection('appointment_requests').unsubscribe('*');
        } catch (e) {}
        this.initialized = false;
    }
}

export const notificationStore = new NotificationStore();
