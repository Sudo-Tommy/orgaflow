import { pb } from './pocketbase';
import type { RecordModel } from 'pocketbase';
import { fetchInbox, MICROSERVICE_URL, markEmailAsRead as markImapRead } from './emailService';
import { getMailboxService } from './mailboxServiceStore';

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
  is_starred: boolean; // FIX: Fehlendes Feld hinzugefügt
  client?: string; // Optional relation to client
  attachments?: string[]; // E-Mail Anhänge (PocketBase File Array)
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
  userId?: string;
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

// Wandelt Base64 sicher in eine Datei um (Verhindert Abstürze bei großen Dateien durch Browser-URL-Limits)
function base64ToFile(base64: string, filename: string, mimeType: string): File {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], filename, { type: mimeType });
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
        
        if (filter.userId && filter.userId !== "all") {
          filterStr += ` && user = "${filter.userId}"`;
        } else {
          const user = pb.authStore.model;
          const isSuperAdmin = pb.authStore.isSuperuser || user?.role === 'superadmin';
          if (!isSuperAdmin) {
            filterStr += ` && user = "${user?.id}"`;
          }
        }

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
    async searchEmails(query: string, folder: string, userId?: string): Promise<MailboxMessage[]> {
      isLoading = true;
      error = null;
      try {
        const authData = pb.authStore.model;
        if (!authData?.id) {
          throw new Error('User not authenticated');
        }

      let filterStr = `folder = "${folder}" && (subject ~ "${query}" || body_text ~ "${query}" || from_address ~ "${query}")`;
      if (userId && userId !== "all") {
          filterStr += ` && user = "${userId}"`;
      } else {
          const user = pb.authStore.model;
          const isSuperAdmin = pb.authStore.isSuperuser || user?.role === 'superadmin';
          if (!isSuperAdmin) {
              filterStr += ` && user = "${user?.id}"`;
          }
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
              const currentUserId = pb.authStore.model?.id || "all";
              getMailboxService().loadFolders(currentUserId);
          }
        } else {
          const currentUserId = pb.authStore.model?.id || "all";
          getMailboxService().loadFolders(currentUserId);
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

    // FIX: toggleStar Funktion implementiert
    async toggleStar(emailId: string): Promise<void> {
      try {
        const email = emails.find(e => e.id === emailId);
        if (!email) return;
        const newStarred = !email.is_starred;
        await pb.collection('mailbox_messages').update(emailId, { is_starred: newStarred });
        
        // Lokalen State aktualisieren
        const index = emails.findIndex(e => e.id === emailId);
        if (index !== -1) emails[index] = { ...emails[index], is_starred: newStarred };
      } catch (err) {
        console.error('[Email] Toggle star error:', err);
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
        
        const formData = new FormData();
        formData.append('folder', 'Sent');
        formData.append('message_id', result.messageId || "sent-" + Date.now());
        formData.append('subject', input.subject);
        formData.append('from_address', authData?.email || "Ich");
        formData.append('to_address', input.to);
        formData.append('date', new Date().toISOString());
        formData.append('body_text', input.body);
        formData.append('body_html', input.body_html || input.body.replace(/\n/g, '<br>'));
        formData.append('is_read', 'true');
        if (authData?.id) formData.append('send_by', authData.id);
        if (companyId) formData.append('company', companyId);
        if (authData?.id) formData.append('user', authData.id);

        if (input.attachments) {
            for (const file of input.attachments) {
                formData.append('attachments', file);
            }
        }
        
        await pb.collection('mailbox_messages').create(formData);
        
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
        
        const currentUser = pb.authStore.model;
        
        const existing = await pb.collection('mailbox_messages').getFullList({
            filter: `folder = "INBOX" && user = "${currentUser?.id}"`,
            fields: 'message_id',
            requestKey: null
        });
        const existingUids = new Set(existing.map((e: any) => e.message_id));
        
        const companyId = currentUser?.company ? (Array.isArray(currentUser.company) ? currentUser.company[0] : currentUser.company) : null;
        
        let added = 0;
        for (const mail of newMails) {
            if (!existingUids.has(mail.uid.toString())) {
                const formData = new FormData();
                formData.append('folder', 'INBOX');
                formData.append('message_id', mail.uid.toString());
                formData.append('subject', mail.subject || '');
                formData.append('from_address', mail.from || '');
                formData.append('to_address', mail.to || '');
                formData.append('date', new Date(mail.date || Date.now()).toISOString());
                formData.append('body_text', mail.text || '');
                formData.append('body_html', mail.html || '');
                formData.append('is_read', 'false');
                if (companyId) formData.append('company', companyId);
                if (currentUser?.id) formData.append('user', currentUser.id);

                if (mail.attachments && Array.isArray(mail.attachments)) {
                    for (const att of mail.attachments) {
                        try {
                            const file = base64ToFile(att.content, att.filename || 'anhang', att.contentType || 'application/octet-stream');
                            formData.append('attachments', file);
                        } catch (e) {
                            console.error("Fehler beim Verarbeiten des Anhangs", e);
                        }
                    }
                }

                await pb.collection('mailbox_messages').create(formData);
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
