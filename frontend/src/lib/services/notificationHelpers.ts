import { toastStore } from './toastService.svelte';

export interface AckData {
    mails: number;
    reqs: number;
    admissions: number;
    changes: number;
    proposals?: number;
    supportTickets?: number;
    updates: boolean;
}

export interface NotifyPrefs {
    requests?: boolean;
    emails?: boolean;
    chats?: boolean;
    updates?: boolean;
    proposals?: boolean;
}

export function getNotifyPrefs(): NotifyPrefs {
    try {
        return JSON.parse(localStorage.getItem('orga_notify_prefs') || '{"requests":true,"emails":true,"chats":true,"updates":true,"proposals":true}');
    } catch {
        return { requests: true, emails: true, chats: true, updates: true, proposals: true };
    }
}

export function safeSendNotification(title: string, body: string) {
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

export function checkNotificationIncrements(params: {
    unreadMails: number;
    pendingRequests: number;
    pendingAdmissions: number;
    pendingChanges: number;
    unreadProposals?: number;
    openSupportTickets?: number;
    hasUnreadUpdates: boolean;
    prev: { unread: number; pending: number; admissions: number; changes: number; proposals?: number; supportTickets?: number };
    ackData: AckData;
}): { ackData: AckData; hasNew: boolean } {
    const { unreadMails, pendingRequests, pendingAdmissions, pendingChanges, unreadProposals = 0, openSupportTickets = 0, hasUnreadUpdates, prev, ackData } = params;
    const prefs = getNotifyPrefs();

    // 1. E-Mails
    if (prev.unread !== -1 && unreadMails > prev.unread) {
        const newCount = unreadMails - prev.unread;
        toastStore.info(`Du hast ${newCount} neue E-Mail(s) erhalten!`);
        if (prefs.emails !== false) {
            safeSendNotification('Neue E-Mail ✉️', `Sie haben ${newCount} neue Nachricht(en) im Posteingang.`);
        }
    }
    prev.unread = unreadMails;

    // 2. Terminanfragen
    if (prev.pending !== -1 && pendingRequests > prev.pending) {
        const newCount = pendingRequests - prev.pending;
        toastStore.success('Eine neue Terminanfrage ist eingetroffen!');
        if (prefs.requests !== false) {
            safeSendNotification('Neue Terminanfrage 📬', `Sie haben ${newCount} neue Terminanfrage(n).`);
        }
    }
    prev.pending = pendingRequests;

    // 3. Neuaufnahmen
    if (prev.admissions !== -1 && pendingAdmissions > prev.admissions) {
        const newCount = pendingAdmissions - prev.admissions;
        toastStore.success('Eine neue Klienten-Aufnahme ist eingetroffen!');
        if (prefs.requests !== false) {
            safeSendNotification('Neue Klienten-Aufnahme 👤', `Sie haben ${newCount} neue Aufnahme-Anfrage(n).`);
        }
    }
    prev.admissions = pendingAdmissions;

    // 4. Termin-Änderungswünsche
    if (prev.changes !== -1 && pendingChanges > prev.changes) {
        const newCount = pendingChanges - prev.changes;
        toastStore.info('Ein neuer Termin-Änderungswunsch ist eingetroffen!');
        if (prefs.requests !== false) {
            safeSendNotification('Termin-Änderungswunsch 🔄', `Sie haben ${newCount} neue(n) Änderungswunsch(e) für Ihre Termine.`);
        }
    }
    prev.changes = pendingChanges;

    // 5. Verbesserungsvorschläge
    if (prev.proposals !== undefined && prev.proposals !== -1 && unreadProposals > prev.proposals) {
        const newCount = unreadProposals - prev.proposals;
        toastStore.info(`Neuer Verbesserungsvorschlag eingetroffen! 💡`);
        if (prefs.proposals !== false) {
            safeSendNotification('Neuer Verbesserungsvorschlag 💡', `Es gibt ${newCount} neue(n) Vorschlag/Vorschläge im Backlog.`);
        }
    }
    prev.proposals = unreadProposals;

    // 6. Support-Tickets / Fehlerberichte
    if (prev.supportTickets !== undefined && prev.supportTickets !== -1 && openSupportTickets > prev.supportTickets) {
        const newCount = openSupportTickets - prev.supportTickets;
        toastStore.info(`Neuer Fehlerbericht / Support-Eintrag eingetroffen! 🐞`);
        if (prefs.requests !== false) {
            safeSendNotification('Neuer Support-Eintrag 🐞', `Es gibt ${newCount} neue(n) Fehlerbericht(e).`);
        }
    }
    prev.supportTickets = openSupportTickets;

    // 7. Acknowledged Baseline
    if (unreadMails < ackData.mails) ackData.mails = unreadMails;
    if (pendingRequests < ackData.reqs) ackData.reqs = pendingRequests;
    if (pendingAdmissions < (ackData.admissions || 0)) ackData.admissions = pendingAdmissions;
    if (pendingChanges < (ackData.changes || 0)) ackData.changes = pendingChanges;
    if (unreadProposals < (ackData.proposals || 0)) ackData.proposals = unreadProposals;
    if (openSupportTickets < (ackData.supportTickets || 0)) ackData.supportTickets = openSupportTickets;
    if (!hasUnreadUpdates) ackData.updates = false;

    const hasNew =
        unreadMails > ackData.mails ||
        pendingRequests > ackData.reqs ||
        pendingAdmissions > (ackData.admissions || 0) ||
        pendingChanges > (ackData.changes || 0) ||
        unreadProposals > (ackData.proposals || 0) ||
        openSupportTickets > (ackData.supportTickets || 0) ||
        (hasUnreadUpdates && !ackData.updates);

    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('orga_ack_data', JSON.stringify(ackData));
    }

    return { ackData, hasNew };
}
