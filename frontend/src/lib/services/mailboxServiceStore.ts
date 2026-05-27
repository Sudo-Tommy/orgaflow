import { pb } from './pocketbase';
import type { RecordModel } from 'pocketbase';

/**
 * Mailbox Folders Service
 * 
 * Manages mailbox folder structure and metadata.
 * Tracks unread counts, sync status, and folder hierarchy.
 */

export interface MailboxFolder extends RecordModel {
  user: string;
  folder_name: string;
  folder_path: string;
  unread_count: number;
  total_count: number;
  last_synced: string;
  created: string;
  updated: string;
}

export interface MailboxFolderInput {
  folder_name: string;
  folder_path: string;
  unread_count?: number;
  total_count?: number;
}

export function createMailboxService() { // FIX: No change needed
  let folders = $state<MailboxFolder[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let selectedFolderPath = $state<string>('INBOX'); // FIX: $state is recognized here

  const selectedFolder = $derived.by(() => {
    return folders.find((f: MailboxFolder) => f.folder_path === selectedFolderPath) || folders[0];
  });

  const totalUnread = $derived.by(() => {
    return folders.reduce((sum: number, f: MailboxFolder) => sum + (f.unread_count || 0), 0);
  });

  return {
    get folders() {
      return folders;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
    get selectedFolder() {
      return selectedFolder;
    },
    get totalUnread() {
      return totalUnread;
    },
    get selectedFolderPath() {
      return selectedFolderPath;
    },
    set selectedFolderPath(path: string) {
      selectedFolderPath = path;
    },

    // Fetch all folders for current user
    async loadFolders(selectedUserEmail?: string): Promise<MailboxFolder[]> {
      isLoading = true;
      error = null;
      try {
        const authData = pb.authStore.model;
        if (!authData?.id) {
          throw new Error('User not authenticated');
        }

      // Identischer Nutzer-Filter für die Live-Berechnung der Ordner-Zähler
      let userFilter = "";
      if (selectedUserEmail && selectedUserEmail !== "all") {
          userFilter = ` && (to_address ~ "${selectedUserEmail}" || from_address ~ "${selectedUserEmail}")`;
      }

      // Wir rufen die ungelesenen Mails für den Badge live ab
      const unreadInbox = await pb.collection('mailbox_messages').getList(1, 1, {
          filter: `folder = "INBOX" && is_read = false${userFilter}`,
          requestKey: null
      });
      const totalInbox = await pb.collection('mailbox_messages').getList(1, 1, { filter: `folder = "INBOX"${userFilter}`, requestKey: null });
      const totalSent = await pb.collection('mailbox_messages').getList(1, 1, { filter: `folder = "Sent"${userFilter}`, requestKey: null });
      const totalTrash = await pb.collection('mailbox_messages').getList(1, 1, { filter: `folder = "Trash"${userFilter}`, requestKey: null });

      // Standard-Ordnerstruktur erzwingen
      folders = [
          { id: 'inbox', folder_name: 'Posteingang', folder_path: 'INBOX', unread_count: unreadInbox.totalItems, total_count: totalInbox.totalItems } as MailboxFolder,
          { id: 'sent', folder_name: 'Gesendet', folder_path: 'Sent', unread_count: 0, total_count: totalSent.totalItems } as MailboxFolder,
          { id: 'trash', folder_name: 'Papierkorb', folder_path: 'Trash', unread_count: 0, total_count: totalTrash.totalItems } as MailboxFolder,
      ];
        return folders;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load folders';
        console.error('[Mailbox] Load error:', error);
        return [];
      } finally {
        isLoading = false;
      }
    },

    // Create a new folder
    async createFolder(input: MailboxFolderInput): Promise<MailboxFolder> {
      isLoading = true;
      error = null;
      try {
        const authData = pb.authStore.model;
        if (!authData?.id) {
          throw new Error('User not authenticated');
        }

        const formData = new FormData();
        formData.append('user', authData.id);
        formData.append('folder_name', input.folder_name);
        formData.append('folder_path', input.folder_path);
        formData.append('unread_count', (input.unread_count || 0).toString());
        formData.append('total_count', (input.total_count || 0).toString());

        const folder = await pb.collection('mailboxFolders').create<MailboxFolder>(formData);
        folders.push(folder);
        return folder;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to create folder';
        console.error('[Mailbox] Create error:', error);
        throw err;
      } finally {
        isLoading = false;
      }
    },

    // Update folder metadata (unread count, total count)
    async updateFolder(folderId: string, updates: Partial<MailboxFolderInput>): Promise<MailboxFolder> {
      isLoading = true;
      error = null;
      try {
        const formData = new FormData();
        if (updates.folder_name !== undefined) {
          formData.append('folder_name', updates.folder_name);
        }
        if (updates.unread_count !== undefined) {
          formData.append('unread_count', updates.unread_count.toString());
        }
        if (updates.total_count !== undefined) {
          formData.append('total_count', updates.total_count.toString());
        }

        const updated = await pb.collection('mailboxFolders').update<MailboxFolder>(
          folderId,
          formData
        );

        // Update in local state
        const index = folders.findIndex((f: MailboxFolder) => f.id === folderId);
        if (index !== -1) {
          folders[index] = updated;
        }

        return updated;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to update folder';
        console.error('[Mailbox] Update error:', error);
        throw err;
      } finally {
        isLoading = false;
      }
    },

    // Delete a folder
    async deleteFolder(folderId: string): Promise<void> {
      isLoading = true;
      error = null;
      try {
        await pb.collection('mailboxFolders').delete(folderId);
        folders = folders.filter((f: MailboxFolder) => f.id !== folderId);
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to delete folder';
        console.error('[Mailbox] Delete error:', error);
        throw err;
      } finally {
        isLoading = false;
      }
    },

    // Fetch folders via API (triggers backend sync)
    async syncFolders(): Promise<MailboxFolder[]> {
      isLoading = true;
      error = null;
      try {
        // Aktuell gibt es noch keine echte IMAP-Ordner Sync API im Microservice
        // Lade einfach die aktuellen Stände aus der Datenbank
        return await this.loadFolders();
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to sync folders';
        console.error('[Mailbox] Sync error:', error);
        throw err;
      } finally {
        isLoading = false;
      }
    }
  };
}

// Singleton instance
let mailboxService: ReturnType<typeof createMailboxService>;

export function getMailboxService() {
  if (!mailboxService) {
    mailboxService = createMailboxService();
  }
  return mailboxService;
}
