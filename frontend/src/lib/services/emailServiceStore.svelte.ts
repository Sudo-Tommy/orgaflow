import { pb } from './pocketbase';
import { rbacService } from './rbacService.svelte';
import { markEmailAsRead as markImapRead, deleteEmailFromImap } from './emailService';
import { getMailboxService } from './mailboxServiceStore.svelte';
import { sendMailboxEmail, type SendEmailInput } from './emailSenderHelper';
import { syncMailboxInbox } from './emailSyncHelper';
import { repairSentEmailsInBackground, needsSentEmailRepair, buildRepairedSentHtml } from './emailSentRetroRepair';
import type { MailboxMessage, EmailFilter } from './emailServiceTypes';

export type { SendEmailInput } from './emailSenderHelper';
export type { MailboxMessage, EmailFilter } from './emailServiceTypes';

export function createEmailService() {
  let emails = $state<MailboxMessage[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let totalEmails = $state(0);
  let currentPage = $state(1);
  const pageSize = 25;

  const paginatedEmails = $derived.by(() => {
    const start = (currentPage - 1) * pageSize;
    return emails.slice(start, start + pageSize);
  });

  const totalPages = $derived.by(() => Math.max(1, Math.ceil(totalEmails / pageSize)));

  return {
    get emails() { return emails; },
    get paginatedEmails() { return paginatedEmails; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    get totalEmails() { return totalEmails; },
    get currentPage() { return currentPage; },
    get totalPages() { return totalPages; },
    get pageSize() { return pageSize; },
    set currentPage(page: number) { currentPage = Math.max(1, Math.min(page, totalPages)); },

    async loadEmails(filter: EmailFilter): Promise<MailboxMessage[]> {
      isLoading = true;
      error = null;
      try {
        const authData = pb.authStore.model;
        if (!authData?.id) throw new Error('User not authenticated');

        let filterStr = filter.folder === 'STARRED'
          ? `is_starred = true`
          : `folder = "${filter.folder}"`;

        const isSuperAdmin = pb.authStore.isSuperuser || authData?.role === 'superadmin' || authData?.role === 'developer' || rbacService.isOwner;
        if (filter.userId && filter.userId !== "all") {
          filterStr += ` && user = "${filter.userId}"`;
        } else if (filter.userEmail && filter.userEmail !== "all") {
          let targetUserId = "";
          try {
            const uRec = await pb.collection('users').getFirstListItem(`email = "${filter.userEmail}"`, { requestKey: null }).catch(() => null);
            if (uRec?.id) targetUserId = uRec.id;
          } catch {}
          if (targetUserId) {
            filterStr += ` && (user = "${targetUserId}" || from_address ~ "${filter.userEmail}" || to_address ~ "${filter.userEmail}")`;
          } else {
            filterStr += ` && (from_address ~ "${filter.userEmail}" || to_address ~ "${filter.userEmail}")`;
          }
        } else if (!isSuperAdmin) {
          filterStr += ` && user = "${authData?.id}"`;
        }

        if (filter.isRead !== undefined) filterStr += ` && is_read = ${filter.isRead}`;
        if (filter.fromAddress) filterStr += ` && from_address ~ "${filter.fromAddress}"`;

        const records = await pb.collection('mailbox_messages').getFullList<MailboxMessage>({
          filter: filterStr,
          sort: '-date',
          requestKey: null
        });

        // Rückwirkende Korrektur für gesendete E-Mails ohne Briefbogen oder mit ">>>"
        if (filter.folder === 'Sent' || filter.folder === 'STARRED') {
          for (const rec of records) {
            if (needsSentEmailRepair(rec)) {
              rec.body_html = buildRepairedSentHtml(rec);
            }
          }
          repairSentEmailsInBackground(records).catch(() => {});
        }

        emails = records;
        totalEmails = records.length;
        currentPage = 1;
        return emails;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load emails';
        console.error('[Email] Load error:', error);
        return [];
      } finally {
        isLoading = false;
      }
    },

    async getEmail(emailId: string): Promise<MailboxMessage | null> {
      isLoading = true;
      error = null;
      try {
        const rec = await pb.collection('mailbox_messages').getOne<MailboxMessage>(emailId);
        if (rec && needsSentEmailRepair(rec)) {
          const repaired = buildRepairedSentHtml(rec);
          rec.body_html = repaired;
          pb.collection('mailbox_messages').update(rec.id, { body_html: repaired }, { requestKey: null }).catch(() => {});
        }
        return rec;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to fetch email';
        console.error('[Email] Get error:', error);
        return null;
      } finally {
        isLoading = false;
      }
    },

    async markAsRead(emailId: string, isRead: boolean): Promise<MailboxMessage> {
      try {
        const emailToMark = emails.find(e => e.id === emailId);
        if (emailToMark && emailToMark.message_id) {
          markImapRead(emailToMark.message_id, isRead).catch(() => {});
        }
        const formData = new FormData();
        formData.append('is_read', isRead.toString());
        const updated = await pb.collection('mailbox_messages').update<MailboxMessage>(emailId, formData, { requestKey: null });

        const index = emails.findIndex(e => e.id === emailId);
        if (index !== -1) emails[index] = { ...emails[index], is_read: isRead };
        getMailboxService().loadFolders();
        return updated;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to update email';
        throw err;
      }
    },

    async toggleStar(emailId: string): Promise<void> {
      try {
        const email = emails.find(e => e.id === emailId);
        if (!email) return;
        const newStarred = !email.is_starred;
        const index = emails.findIndex(e => e.id === emailId);
        if (index !== -1) emails[index] = { ...emails[index], is_starred: newStarred };
        await pb.collection('mailbox_messages').update(emailId, { is_starred: newStarred }, { requestKey: null });
        getMailboxService().loadFolders();
      } catch (err) {
        console.error('[Email] Toggle star error:', err);
      }
    },

    async sendEmail(input: SendEmailInput): Promise<{ success: boolean; messageId?: string }> {
      isLoading = true;
      error = null;
      try {
        return await sendMailboxEmail(input);
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to send email';
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async deleteEmail(emailId: string): Promise<void> {
      isLoading = true;
      error = null;
      try {
        const target = emails.find(e => e.id === emailId);
        const folder = target?.folder || 'INBOX';
        if (folder !== 'Trash') {
          await pb.collection('mailbox_messages').update(emailId, { folder: 'Trash' }, { requestKey: null });
        } else {
          if (target?.message_id) {
            deleteEmailFromImap(target.message_id).catch(() => {});
          }
          await pb.collection('mailbox_messages').delete(emailId, { requestKey: null });
        }
        emails = emails.filter(e => e.id !== emailId);
        totalEmails = emails.length;
        getMailboxService().loadFolders();
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to delete email';
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async syncMailServer(options?: { signal?: AbortSignal }): Promise<{ synced_count: number }> {
      isLoading = true;
      error = null;
      try {
        return await syncMailboxInbox(options);
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to sync emails';
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async syncEmails(options?: { signal?: AbortSignal }): Promise<{ synced_count: number }> {
      return this.syncMailServer(options);
    }
  };
}

let emailServiceInstance: ReturnType<typeof createEmailService> | null = null;

export function getEmailService() {
  if (!emailServiceInstance) emailServiceInstance = createEmailService();
  return emailServiceInstance;
}
