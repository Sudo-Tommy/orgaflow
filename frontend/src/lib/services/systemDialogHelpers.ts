import type { SystemDialogRecord, AdminReplyEvent } from './systemDialogTypes';

/**
 * Durchsucht gesendete Dialoge nach ungesehenen Mitarbeiter-Antworten für den Admin/Absender.
 */
export function findUnseenAdminReply(records: SystemDialogRecord[]): AdminReplyEvent | null {
    for (const d of records) {
        if (!d.read_status) continue;
        for (const [uId, status] of Object.entries(d.read_status)) {
            if (status.reply_text && status.reply_seen_by_admin === false) {
                const recipientObj = (d.expand?.recipients as any[])?.find((u: any) => u.id === uId);
                const userName = recipientObj 
                    ? `${recipientObj.name_first || ''} ${recipientObj.name_last || ''}`.trim() 
                    : 'Mitarbeiter';
                return {
                    dialog: d,
                    userId: uId,
                    userName: userName || 'Mitarbeiter',
                    userAvatar: recipientObj?.avatar,
                    replyText: status.reply_text,
                    replyAt: status.reply_at || new Date().toISOString()
                };
            }
        }
    }
    return null;
}
