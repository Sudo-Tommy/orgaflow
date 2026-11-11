// src/lib/services/systemDialogService.svelte.ts
import { pb } from "$lib/services/pocketbase";
import { playSystemDialogChime } from "./systemDialogAudio";
import { toastStore } from "./toastService.svelte";
import { findUnseenAdminReply } from "./systemDialogHelpers";
import type { SystemDialogRecord, AdminReplyEvent } from "./systemDialogTypes";

export type { SystemDialogRecord, AdminReplyEvent };

class SystemDialogService {
    unconfirmedDialogs = $state<SystemDialogRecord[]>([]);
    activeAdminReply = $state<AdminReplyEvent | null>(null);
    isSendModalOpen = $state(false);
    isHistoryModalOpen = $state(false);
    sentDialogs = $state<SystemDialogRecord[]>([]);

    activeDialog = $derived<SystemDialogRecord | null>(
        this.unconfirmedDialogs.length > 0 ? this.unconfirmedDialogs[0] : null
    );

    private unsubscribePb: (() => void) | null = null;
    private unsubscribeAuth: (() => void) | null = null;
    private currentUserId: string = "";

    init() {
        if (typeof window === 'undefined') return;
        const syncUser = () => {
            const user = pb.authStore.record || pb.authStore.model;
            const newId = user?.id || "";
            if (newId !== this.currentUserId) {
                this.currentUserId = newId;
                if (newId) {
                    this.loadIncomingDialogs();
                    this.loadSentDialogs();
                    this.subscribeRealtime();
                } else {
                    this.unconfirmedDialogs = [];
                    this.sentDialogs = [];
                    this.activeAdminReply = null;
                }
            }
        };

        syncUser();
        this.unsubscribeAuth = pb.authStore.onChange(syncUser);
    }

    destroy() {
        if (this.unsubscribePb) { this.unsubscribePb(); this.unsubscribePb = null; }
        if (this.unsubscribeAuth) { this.unsubscribeAuth(); this.unsubscribeAuth = null; }
    }

    async loadIncomingDialogs() {
        if (!this.currentUserId) return;
        try {
            const filter = `(recipients ~ "${this.currentUserId}" || is_broadcast = true) && status != "completed"`;
            const records = await pb.collection('system_dialogs').getFullList<SystemDialogRecord>({
                filter, sort: '-created', expand: 'sender', requestKey: null
            }).catch(() => pb.collection('system_dialogs').getFullList<SystemDialogRecord>({
                filter, expand: 'sender', requestKey: null
            }));

            this.unconfirmedDialogs = records.filter(d => !d.read_status?.[this.currentUserId]?.confirmed_at);
            if (this.unconfirmedDialogs.length > 0) {
                playSystemDialogChime(this.unconfirmedDialogs[0].priority === 'urgent');
                this.markAsViewed(this.unconfirmedDialogs[0].id);
            }
        } catch (e) {
            console.warn('[SystemDialogService] Fehler bei eingehenden Dialogen:', e);
        }
    }

    async loadSentDialogs() {
        if (!this.currentUserId) return;
        try {
            const records = await pb.collection('system_dialogs').getFullList<SystemDialogRecord>({
                filter: `sender = "${this.currentUserId}"`, sort: '-created', expand: 'recipients', requestKey: null
            }).catch(() => pb.collection('system_dialogs').getFullList<SystemDialogRecord>({
                filter: `sender = "${this.currentUserId}"`, expand: 'recipients', requestKey: null
            }));
            this.sentDialogs = records;
            this.activeAdminReply = findUnseenAdminReply(records);
            if (this.activeAdminReply) playSystemDialogChime(false);
        } catch {}
    }

    private subscribeRealtime() {
        if (this.unsubscribePb) this.unsubscribePb();
        pb.collection('system_dialogs').subscribe('*', (e) => {
            const record = e.record as unknown as SystemDialogRecord;
            if (e.action === 'delete') {
                this.unconfirmedDialogs = this.unconfirmedDialogs.filter(d => d.id !== record.id);
                this.sentDialogs = this.sentDialogs.filter(d => d.id !== record.id);
                if (this.activeAdminReply?.dialog.id === record.id) this.activeAdminReply = null;
            } else if (e.action === 'create' || e.action === 'update') {
                this.handleIncomingRealtime(record);
            }
        }).then(unsub => { this.unsubscribePb = unsub; }).catch(() => {});
    }

    private async handleIncomingRealtime(record: SystemDialogRecord) {
        if (!this.currentUserId) return;

        const isRecipient = Array.isArray(record.recipients) && record.recipients.includes(this.currentUserId);
        const isForMe = record.is_broadcast || isRecipient;
        const userStatus = record.read_status?.[this.currentUserId];
        const isSender = record.sender === this.currentUserId;

        if (isForMe && !userStatus?.confirmed_at && (!isSender || isRecipient)) {
            const exists = this.unconfirmedDialogs.some(d => d.id === record.id);
            if (!exists) {
                let enriched = record;
                try {
                    enriched = await pb.collection('system_dialogs').getOne<SystemDialogRecord>(record.id, { expand: 'sender', requestKey: null });
                } catch {}
                this.unconfirmedDialogs = [enriched, ...this.unconfirmedDialogs];
                playSystemDialogChime(record.priority === 'urgent');
                this.markAsViewed(record.id);
            }
        }

        if (isSender && record.read_status) {
            const reply = findUnseenAdminReply([record]);
            if (reply) {
                this.activeAdminReply = reply;
                playSystemDialogChime(false);
            }
            this.loadSentDialogs();
        }
    }

    async markAsViewed(dialogId: string) {
        if (!this.currentUserId) return;
        try {
            const d = await pb.collection('system_dialogs').getOne<SystemDialogRecord>(dialogId, { requestKey: null });
            const currentReadStatus = d.read_status || {};
            if (!currentReadStatus[this.currentUserId]?.first_viewed_at) {
                currentReadStatus[this.currentUserId] = {
                    ...currentReadStatus[this.currentUserId],
                    first_viewed_at: new Date().toISOString()
                };
                await pb.collection('system_dialogs').update(dialogId, { read_status: currentReadStatus }, { requestKey: null });
            }
        } catch {}
    }

    async confirmAndReply(dialogId: string, replyText: string = "") {
        if (!this.currentUserId) return;
        try {
            const d = await pb.collection('system_dialogs').getOne<SystemDialogRecord>(dialogId, { requestKey: null });
            const currentReadStatus = d.read_status || {};
            const now = new Date().toISOString();
            currentReadStatus[this.currentUserId] = {
                ...currentReadStatus[this.currentUserId],
                first_viewed_at: currentReadStatus[this.currentUserId]?.first_viewed_at || now,
                confirmed_at: now,
                reply_text: replyText.trim() || undefined,
                reply_at: replyText.trim() ? now : undefined,
                reply_seen_by_admin: replyText.trim() ? false : undefined
            };

            const patchData: any = { read_status: currentReadStatus };
            if (replyText.trim()) patchData.status = 'answered';

            await pb.collection('system_dialogs').update(dialogId, patchData, { requestKey: null });
            this.unconfirmedDialogs = this.unconfirmedDialogs.filter(item => item.id !== dialogId);
            toastStore.success("Kenntnisnahme bestätigt.");

            if (this.unconfirmedDialogs.length > 0) {
                playSystemDialogChime(this.unconfirmedDialogs[0].priority === 'urgent');
                this.markAsViewed(this.unconfirmedDialogs[0].id);
            }
        } catch (err: any) {
            toastStore.error("Fehler beim Bestätigen.");
            throw err;
        }
    }

    // Sofortiges Schließen für Entwickler ohne Zwangseingabe
    dismissForDeveloper(dialogId: string) {
        this.unconfirmedDialogs = this.unconfirmedDialogs.filter(item => item.id !== dialogId);
        toastStore.info("Mitteilung geschlossen (Entwickler-Override).");
    }

    // Löscht eine Mitteilung endgültig aus der Datenbank (Hard Delete)
    async deleteDialog(dialogId: string) {
        try {
            await pb.collection('system_dialogs').delete(dialogId, { requestKey: null });
            this.sentDialogs = this.sentDialogs.filter(d => d.id !== dialogId);
            this.unconfirmedDialogs = this.unconfirmedDialogs.filter(d => d.id !== dialogId);
            if (this.activeAdminReply?.dialog.id === dialogId) {
                this.activeAdminReply = null;
            }
            toastStore.success("Mitteilung erfolgreich gelöscht.");
        } catch (err: any) {
            toastStore.error("Fehler beim Löschen der Mitteilung.");
            throw err;
        }
    }

    async markAdminReplySeen(dialogId: string, userId: string) {
        try {
            const d = await pb.collection('system_dialogs').getOne<SystemDialogRecord>(dialogId, { requestKey: null });
            const currentReadStatus = d.read_status || {};
            if (currentReadStatus[userId]) {
                currentReadStatus[userId].reply_seen_by_admin = true;
                await pb.collection('system_dialogs').update(dialogId, { read_status: currentReadStatus }, { requestKey: null });
            }
        } catch {}
        this.activeAdminReply = null;
        this.loadSentDialogs();
    }
}

export const systemDialogService = new SystemDialogService();
