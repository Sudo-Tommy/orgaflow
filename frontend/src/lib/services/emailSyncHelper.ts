import { pb } from './pocketbase';
import { fetchInbox } from './emailService';
import { base64ToFile } from './emailSenderHelper';

interface ExistingMailInfo {
    id: string;
    message_id: string;
    folder: string;
    is_read: boolean;
}

export async function syncMailboxInbox(options?: { signal?: AbortSignal }): Promise<{ synced_count: number }> {
    const newMails = await fetchInbox(options?.signal);
    if (!newMails || !newMails.length) return { synced_count: 0 };

    const currentUser = pb.authStore.model;
    const companyId = currentUser?.company 
        ? (Array.isArray(currentUser.company) ? currentUser.company[0] : currentUser.company) 
        : null;

    let existing: ExistingMailInfo[] = [];
    try {
        existing = await pb.collection('mailbox_messages').getFullList<ExistingMailInfo>({
            fields: 'id,message_id,folder,is_read',
            requestKey: null
        });
    } catch {
        existing = [];
    }

    const existingMap = new Map<string, ExistingMailInfo>();
    for (const e of existing) {
        if (e.message_id) existingMap.set(e.message_id, e);
    }

    let added = 0;
    for (const mail of newMails) {
        const uidStr = mail.uid.toString();
        const existingRecord = existingMap.get(uidStr);

        if (existingRecord) {
            // Bereits vorhanden: Niemals gelöschte Mails (Trash) wieder in INBOX verschieben
            // und niemals bereits gelesene Mails in ungelesen zurücksetzen
            if (!existingRecord.is_read && mail.is_read) {
                pb.collection('mailbox_messages').update(existingRecord.id, { is_read: true }, { requestKey: null }).catch(() => {});
            }
            continue;
        }

        const formData = new FormData();
        formData.append('folder', 'INBOX');
        formData.append('message_id', uidStr);
        formData.append('subject', mail.subject || '');
        formData.append('from_address', mail.from || '');
        formData.append('to_address', mail.to || '');
        formData.append('date', new Date(mail.date || Date.now()).toISOString());
        formData.append('body_text', (mail.text || '').slice(0, 500000));
        formData.append('body_html', mail.html || '');
        formData.append('is_read', mail.is_read ? 'true' : 'false');
        if (companyId) formData.append('company', companyId);

        if (currentUser?.id) {
            formData.append('user', currentUser.id);
            formData.append('send_by', currentUser.id);
        }

        if (mail.attachments && Array.isArray(mail.attachments)) {
            const safeAttachments = mail.attachments.slice(0, 10);
            for (const att of safeAttachments) {
                try {
                    const file = base64ToFile(att.content, att.filename || 'anhang', att.contentType || 'application/octet-stream');
                    formData.append('attachments', file);
                } catch (e) {
                    console.error('[EmailSync] Fehler beim Verarbeiten des Anhangs:', e);
                }
            }
        }

        try {
            await pb.collection('mailbox_messages').create(formData, { requestKey: null });
            added++;
        } catch (createErr: any) {
            console.warn('[EmailSync] Fehler beim Speichern der Mail UID ' + uidStr + ':', createErr?.data || createErr?.message);
        }
    }
    return { synced_count: added };
}
