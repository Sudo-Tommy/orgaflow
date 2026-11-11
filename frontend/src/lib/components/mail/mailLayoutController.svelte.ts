import { pb } from '$lib/services/pocketbase';
import { rbacService } from '$lib/services/rbacService.svelte';
import { toastStore } from '$lib/services/toastService.svelte';
import { getMailConfigService, type MailConfigInput } from '$lib/services/mailConfigServiceStore.svelte';
import { getMailboxService } from '$lib/services/mailboxServiceStore.svelte';
import { getEmailService, type SendEmailInput } from '$lib/services/emailServiceStore.svelte';
import { buildReplyPayload, buildForwardPayload } from './mailLayoutHelper';
import { sortAlphabetical } from '$lib/utils/sortHelper';

export function createMailController() {
  const mailConfigService = getMailConfigService();
  const mailboxService = getMailboxService();
  const emailService = getEmailService();

  let selectedEmailId = $state<string | null>(null);
  let showComposer = $state(false);
  let replyData = $state<any>(null);
  let showConfigModal = $state(false);
  let isInitialized = $state(false);
  let isSyncing = $state(false);
  let mobileMenuOpen = $state(false);
  let mobileDetailOpen = $state(false);

  let users = $state<any[]>([]);
  let isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'developer' || rbacService.isOwner);
  let selectedUserEmail = $state(pb.authStore.model?.email || '');

  async function initializeMail() {
    if (isInitialized) return;
    try {
      if (isSuperAdmin) {
        pb.collection('users').getFullList({ requestKey: null })
          .then(res => { users = sortAlphabetical(res, u => `${u.name_last || ''} ${u.name_first || ''} ${u.email || ''}`.trim()); })
          .catch(() => {});
      }

      const config = await mailConfigService.loadConfig();
      if (!config) {
        showConfigModal = true;
      } else {
        await mailboxService.loadFolders(selectedUserEmail);
        if (mailboxService.selectedFolderPath) {
          await emailService.loadEmails({ folder: mailboxService.selectedFolderPath, userEmail: selectedUserEmail });
        }
        syncMailServer().catch(() => {});
      }
      isInitialized = true;
    } catch (err) {
      console.error('[MailLayout] Init-Fehler:', err);
    }
  }

  async function syncMailServer() {
    if (isSyncing) return;
    isSyncing = true;
    try {
      await emailService.syncEmails();
      if (mailboxService.selectedFolderPath) {
        await emailService.loadEmails({ folder: mailboxService.selectedFolderPath, userEmail: selectedUserEmail });
      }
      await mailboxService.loadFolders(selectedUserEmail);
    } catch (err) {
      console.warn('[MailLayout] Sync-Hinweis:', err);
    } finally {
      isSyncing = false;
    }
  }

  async function handleConfigSave(input: MailConfigInput) {
    try {
      await mailConfigService.saveConfig(input);
      showConfigModal = false;
      toastStore.success('E-Mail-Konfiguration erfolgreich gespeichert.');
      await mailboxService.loadFolders(selectedUserEmail);
      await syncMailServer();
    } catch (err: any) {
      toastStore.error('Fehler beim Speichern der Konfiguration.');
      throw err;
    }
  }

  async function handleUserChange(email: string) {
    selectedUserEmail = email;
    selectedEmailId = null;
    mobileDetailOpen = false;
    await mailboxService.loadFolders(selectedUserEmail);
    if (mailboxService.selectedFolderPath) {
      await emailService.loadEmails({ folder: mailboxService.selectedFolderPath, userEmail: selectedUserEmail });
    }
  }

  function handleFolderSelect(folderPath: string) {
    mailboxService.selectedFolderPath = folderPath;
    selectedEmailId = null;
    mobileMenuOpen = false;
    mobileDetailOpen = false;
    emailService.loadEmails({ folder: folderPath, userEmail: selectedUserEmail });
  }

  async function handleEmailSelect(emailId: string) {
    selectedEmailId = emailId;
    mobileDetailOpen = true;
    const email = emailService.emails.find(e => e.id === emailId);
    if (email && !email.is_read) {
      try {
        await emailService.markAsRead(emailId, true);
        await mailboxService.loadFolders();
      } catch {}
    }
  }

  async function handleMarkAllRead() {
    try {
      const folder = mailboxService.selectedFolderPath || 'INBOX';
      const unread = emailService.emails.filter(e => !e.is_read);
      for (const mail of unread) {
        await emailService.markAsRead(mail.id, true).catch(() => {});
      }
      await mailboxService.loadFolders();
      await emailService.loadEmails({ folder, userEmail: selectedUserEmail });
      toastStore.success('Alle E-Mails als gelesen markiert.');
    } catch {
      toastStore.error('Fehler beim Aktualisieren der E-Mails.');
    }
  }

  async function handleEmailDelete(emailId: string) {
    try {
      await emailService.deleteEmail(emailId);
      if (selectedEmailId === emailId) { selectedEmailId = null; mobileDetailOpen = false; }
      toastStore.success('E-Mail gelöscht.');
      await mailboxService.loadFolders();
    } catch {
      toastStore.error('E-Mail konnte nicht gelöscht werden.');
    }
  }

  async function handleBulkDelete(ids: string[]) {
    if (!ids.length) return;
    try {
      for (const id of ids) await emailService.deleteEmail(id).catch(() => {});
      if (selectedEmailId && ids.includes(selectedEmailId)) { selectedEmailId = null; mobileDetailOpen = false; }
      await mailboxService.loadFolders();
      toastStore.success(`${ids.length} E-Mail(s) gelöscht.`);
    } catch {
      toastStore.error('Fehler beim Löschen.');
    }
  }

  async function handleBulkMarkRead(ids: string[], isRead: boolean) {
    if (!ids.length) return;
    try {
      for (const id of ids) await emailService.markAsRead(id, isRead).catch(() => {});
      await mailboxService.loadFolders();
      toastStore.success(isRead ? 'Als gelesen markiert.' : 'Als ungelesen markiert.');
    } catch {
      toastStore.error('Fehler beim Aktualisieren.');
    }
  }

  async function handleToggleStar(emailId: string) {
    await emailService.toggleStar(emailId);
  }

  async function handleEmailReply(emailId: string) {
    const email = await emailService.getEmail(emailId).catch(() => null);
    if (email) { replyData = buildReplyPayload(email); showComposer = true; }
  }

  async function handleEmailForward(emailId: string) {
    const email = await emailService.getEmail(emailId).catch(() => null);
    if (email) { replyData = buildForwardPayload(email); showComposer = true; }
  }

  async function handleEmailSend(input: SendEmailInput) {
    try {
      await emailService.sendEmail(input);
      showComposer = false;
      replyData = null;
      toastStore.success('E-Mail erfolgreich im OrgaFlow-Design versendet.');
      await syncMailServer();
    } catch (err: any) {
      toastStore.error(err?.message || 'Fehler beim Versenden der E-Mail.');
      throw err;
    }
  }

  return {
    mailConfigService,
    mailboxService,
    emailService,
    get selectedEmailId() { return selectedEmailId; },
    set selectedEmailId(v) { selectedEmailId = v; },
    get showComposer() { return showComposer; },
    set showComposer(v) { showComposer = v; },
    get replyData() { return replyData; },
    set replyData(v) { replyData = v; },
    get showConfigModal() { return showConfigModal; },
    set showConfigModal(v) { showConfigModal = v; },
    get isSyncing() { return isSyncing; },
    get mobileMenuOpen() { return mobileMenuOpen; },
    set mobileMenuOpen(v) { mobileMenuOpen = v; },
    get mobileDetailOpen() { return mobileDetailOpen; },
    set mobileDetailOpen(v) { mobileDetailOpen = v; },
    get users() { return users; },
    get isSuperAdmin() { return isSuperAdmin; },
    get selectedUserEmail() { return selectedUserEmail; },
    initializeMail,
    syncMailServer,
    handleConfigSave,
    handleUserChange,
    handleFolderSelect,
    handleEmailSelect,
    handleMarkAllRead,
    handleEmailDelete,
    handleBulkDelete,
    handleBulkMarkRead,
    handleToggleStar,
    handleEmailReply,
    handleEmailForward,
    handleEmailSend
  };
}
