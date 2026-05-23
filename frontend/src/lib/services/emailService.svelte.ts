import { pb } from './pocketbase';
import type { RecordModel } from 'pocketbase';
import { fetchInbox, MICROSERVICE_URL, markEmailAsRead as markImapRead } from './emailService';
import { getMailboxService } from './mailboxService.svelte';

/**
 * Email Service
 * 
 * Manages email CRUD operations:
 * - Read emails from mailbox
 * - Send new emails
 * - Delete emails
 * - Manage attachments
 */

export interface MailboxMessage extends RecordModel {
  user: string;
  message_id: string;
  folder: string;
  from_address: string;
  to_address: string;
  subject: string;
  body_text: string;
  body_html?: string;
  date: string;
  is_read: boolean;
  client?: string; // Optional relation to client
  created: string;
  updated: string;
}

export interface SendEmailInput {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  body_html?: string;
  attachments?: File[];
}

export interface EmailFilter {
  folder: string;
  isRead?: boolean;
  fromAddress?: string;
  search?: string;
}

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
}

export function createEmailService() {
  let emails = $state<MailboxMessage[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let totalEmails = $state(0);
  let currentPage = $state(1);
  const pageSize = 20;

  const paginatedEmails = $derived.by(() => {
    const start = (currentPage - 1) * pageSize;
    return emails.slice(start, start + pageSize);
  });

  const totalPages = $derived.by(() => {
    return Math.ceil(totalEmails / pageSize);
  });

  return {
    get emails() {
      return emails;
    },
    get paginatedEmails() {
      return paginatedEmails;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
    get totalEmails() {
      return totalEmails;
    },
    get currentPage() {
      return currentPage;
    },
    get totalPages() {
      return totalPages;
    },
    set currentPage(page: number) {
      currentPage = Math.max(1, Math.min(page, totalPages));
    },

    // Fetch emails for a specific folder
    async loadEmails(filter: EmailFilter): Promise<MailboxMessage[]> {
      isLoading = true;
      error = null;
      try {
        const authData = pb.authStore.model;
        if (!authData?.id) {
          throw new Error('User not authenticated');
        }

        let filterStr = `folder = "${filter.folder}"`;
        
        if (filter.isRead !== undefined) {
          filterStr += ` && is_read = ${filter.isRead}`;
        }
        if (filter.fromAddress) {
          filterStr += ` && from_address ~ "${filter.fromAddress}"`;
        }

        const records = await pb.collection('mailbox_messages').getFullList<MailboxMessage>({
          filter: filterStr,
          sort: '-date',
          requestKey: null
        });

        emails = records;
        totalEmails = records.length;
        return emails;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load emails';
        console.error('[Email] Load error:', error);
        return [];
      } finally {
        isLoading = false;
      }
    },

    // Search emails
    async searchEmails(query: string, folder: string): Promise<MailboxMessage[]> {
      isLoading = true;
      error = null;
      try {
        const authData = pb.authStore.model;
        if (!authData?.id) {
          throw new Error('User not authenticated');
        }

      const filterStr = `folder = "${folder}" && (subject ~ "${query}" || body_text ~ "${query}" || from_address ~ "${query}")`;

        const records = await pb.collection('mailbox_messages').getFullList<MailboxMessage>({
          filter: filterStr,
          sort: '-date',
          requestKey: null
        });

        emails = records;
        totalEmails = records.length;
        return emails;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Search failed';
        console.error('[Email] Search error:', error);
        return [];
      } finally {
        isLoading = false;
      }
    },

    // Get single email
    async getEmail(emailId: string): Promise<MailboxMessage | null> {
      isLoading = true;
      error = null;
      try {
        const email = await pb.collection('mailbox_messages').getOne<MailboxMessage>(emailId);
        return email;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to fetch email';
        console.error('[Email] Get error:', error);
        return null;
      } finally {
        isLoading = false;
      }
    },

    // Mark email as read/unread
    async markAsRead(emailId: string, isRead: boolean): Promise<MailboxMessage> {
      isLoading = true;
      error = null;
      try {
        const emailToMark = emails.find(e => e.id === emailId);
        if (emailToMark && emailToMark.message_id && isRead) {
            // 1. IMAP Server informieren (E-Mail Anbieter), dass Mail gelesen wurde
            await markImapRead(emailToMark.message_id);
        }

        const formData = new FormData();
        formData.append('is_read', isRead.toString());

        const updated = await pb.collection('mailbox_messages').update<MailboxMessage>(
          emailId,
          formData
        );

        // Update in local state
        const index = emails.findIndex(e => e.id === emailId);
        if (index !== -1) {
          const wasRead = emails[index].is_read;
          emails[index] = updated;
          
          // Wenn sich der Status geändert hat, Glöckchen-Badge aktualisieren!
          if (wasRead !== isRead) {
              getMailboxService().loadFolders();
          }
        } else {
          getMailboxService().loadFolders();
        }

        return updated;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to update email';
        console.error('[Email] Mark read error:', error);
        throw err;
      } finally {
        isLoading = false;
      }
    },

    // Send new email
    async sendEmail(input: SendEmailInput): Promise<{ success: boolean; messageId?: string }> {
      isLoading = true;
      error = null;
      try {
        const authData = pb.authStore.model;
        let attachmentPayload;
        if (input.attachments && input.attachments.length > 0) {
            attachmentPayload = await Promise.all(input.attachments.map(async (file) => ({
                filename: file.name,
                content: await fileToBase64(file),
                encoding: 'base64'
            })));
        }

        const response = await fetch(`${MICROSERVICE_URL}/send`, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${pb.authStore.token}` 
          },
          body: JSON.stringify({
            to: input.to,
            cc: input.cc,
            bcc: input.bcc,
            subject: input.subject,
            text: input.body,
            html: input.body_html || input.body.replace(/\n/g, '<br>'),
            attachments: attachmentPayload
          })
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Gesendete E-Mail in der Datenbank speichern, damit sie im Ordner "Gesendet" auftaucht
        const companyId = authData?.company ? (Array.isArray(authData.company) ? authData.company[0] : authData.company) : null;
        
        await pb.collection('mailbox_messages').create({
            folder: "Sent",
            message_id: result.messageId || "sent-" + Date.now(),
            subject: input.subject,
            from_address: authData?.email || "Ich",
            to_address: input.to,
            date: new Date().toISOString(),
            body_text: input.body,
            body_html: input.body_html || input.body.replace(/\n/g, '<br>'),
            is_read: true,
            send_by: authData?.id || null,
            company: companyId
        });
        
        return { success: true, messageId: result.messageId };
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to send email';
        console.error('[Email] Send error:', error);
        throw err;
      } finally {
        isLoading = false;
      }
    },

    // Delete email
    async deleteEmail(emailId: string): Promise<void> {
      isLoading = true;
      error = null;
      try {
        const emailToDelete = emails.find(e => e.id === emailId);
        if (!emailToDelete) throw new Error('E-Mail nicht gefunden');

        await pb.collection('mailbox_messages').delete(emailId);

        if (emailToDelete.folder === 'INBOX' && emailToDelete.message_id) {
            await fetch(`${MICROSERVICE_URL}/delete`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${pb.authStore.token}` 
                },
                body: JSON.stringify({ uid: emailToDelete.message_id })
            });
        }

        // Remove from local state
        emails = emails.filter(e => e.id !== emailId);
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to delete email';
        console.error('[Email] Delete error:', error);
        throw err;
      } finally {
        isLoading = false;
      }
    },

    // Sync emails from IMAP
    async syncEmails(): Promise<{ synced_count: number }> {
      isLoading = true;
      error = null;
      try {
        const newMails = await fetchInbox();
        
        const existing = await pb.collection('mailbox_messages').getFullList({
            filter: `folder = "INBOX"`,
            fields: 'message_id',
            requestKey: null
        });
        const existingUids = new Set(existing.map((e: any) => e.message_id));
        
        let added = 0;
        for (const mail of newMails) {
            if (!existingUids.has(mail.uid.toString())) {
                await pb.collection('mailbox_messages').create({
                    folder: "INBOX",
                    message_id: mail.uid.toString(),
                    subject: mail.subject,
                    from_address: mail.from,
                    to_address: mail.to,
                    date: new Date(mail.date || Date.now()).toISOString(),
                    body_text: mail.text,
                    body_html: mail.html,
                    is_read: false
                });
                added++;
            }
        }
        return { synced_count: added };
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to sync emails';
        console.error('[Email] Sync error:', error);
        throw err;
      } finally {
        isLoading = false;
      }
    }
  };
}

// Singleton instance
let emailService: ReturnType<typeof createEmailService>;

export function getEmailService() {
  if (!emailService) {
    emailService = createEmailService();
  }
  return emailService;
}
