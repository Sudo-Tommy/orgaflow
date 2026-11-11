import { pb } from './pocketbase';
import { rbacService } from './rbacService.svelte';
import type { RecordModel } from 'pocketbase';

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

export function createMailboxService() {
  let folders = $state<MailboxFolder[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let selectedFolderPath = $state<string>('INBOX');
  let activeUser = $state<string>('all');

  const selectedFolder = $derived.by(() => {
    return folders.find((f: MailboxFolder) => f.folder_path === selectedFolderPath) || folders[0];
  });

  const totalUnread = $derived.by(() => {
    return folders.reduce((sum: number, f: MailboxFolder) => sum + (f.unread_count || 0), 0);
  });

  return {
    get folders() { return folders; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    get selectedFolder() { return selectedFolder; },
    get totalUnread() { return totalUnread; },
    get selectedFolderPath() { return selectedFolderPath; },
    set selectedFolderPath(path: string) { selectedFolderPath = path; },
    get activeUser() { return activeUser; },

    async loadFolders(selectedUserEmail?: string): Promise<MailboxFolder[]> {
      isLoading = true;
      error = null;
      try {
        const authData = pb.authStore.model;
        if (!authData?.id) throw new Error('User not authenticated');

        if (selectedUserEmail !== undefined) {
          activeUser = selectedUserEmail;
        }
        const target = activeUser;
        let userFilter = "";
        const isSuperAdmin = pb.authStore.isSuperuser || authData?.role === 'superadmin' || authData?.role === 'developer' || rbacService.isOwner;

        if (target === "all" && isSuperAdmin) {
          userFilter = "";
        } else if (target && target !== "all") {
          if (target.includes('@')) {
            let targetUserId = "";
            try {
              const uRec = await pb.collection('users').getFirstListItem(`email = "${target}"`, { requestKey: null }).catch(() => null);
              if (uRec?.id) targetUserId = uRec.id;
            } catch {}
            if (targetUserId) {
              userFilter = ` && (user = "${targetUserId}" || from_address ~ "${target}" || to_address ~ "${target}")`;
            } else {
              userFilter = ` && (from_address ~ "${target}" || to_address ~ "${target}")`;
            }
          } else {
            userFilter = ` && user = "${target}"`;
          }
        } else {
          userFilter = ` && user = "${authData.id}"`;
        }

        const [unreadInbox, totalInbox, totalSent, totalStarred, totalTrash] = await Promise.all([
          pb.collection('mailbox_messages').getList(1, 1, { filter: `folder = "INBOX" && is_read = false${userFilter}`, requestKey: null }),
          pb.collection('mailbox_messages').getList(1, 1, { filter: `folder = "INBOX"${userFilter}`, requestKey: null }),
          pb.collection('mailbox_messages').getList(1, 1, { filter: `folder = "Sent"${userFilter}`, requestKey: null }),
          pb.collection('mailbox_messages').getList(1, 1, { filter: `is_starred = true${userFilter}`, requestKey: null }).catch(() => ({ totalItems: 0 })),
          pb.collection('mailbox_messages').getList(1, 1, { filter: `folder = "Trash"${userFilter}`, requestKey: null })
        ]);

        folders = [
          { id: 'inbox', folder_name: 'Posteingang', folder_path: 'INBOX', unread_count: unreadInbox.totalItems, total_count: totalInbox.totalItems } as MailboxFolder,
          { id: 'sent', folder_name: 'Gesendet', folder_path: 'Sent', unread_count: 0, total_count: totalSent.totalItems } as MailboxFolder,
          { id: 'starred', folder_name: 'Markiert', folder_path: 'STARRED', unread_count: 0, total_count: totalStarred.totalItems } as MailboxFolder,
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

    async syncFolders(): Promise<MailboxFolder[]> {
      return await this.loadFolders();
    }
  };
}

let mailboxService: ReturnType<typeof createMailboxService>;

export function getMailboxService() {
  if (!mailboxService) {
    mailboxService = createMailboxService();
  }
  return mailboxService;
}
