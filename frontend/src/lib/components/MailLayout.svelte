<script lang="ts">
  import { getMailConfigService, type MailConfigInput } from '$lib/services/mailConfigService.svelte';
  import { getMailboxService } from '$lib/services/mailboxService.svelte';
  import { getEmailService } from '$lib/services/emailService.svelte';
  import MailSidebar from './MailSidebar.svelte';
  import MailList from './MailList.svelte';
  import MailDetail from './MailDetail.svelte';
  import MailComposer from './MailComposer.svelte';
  import MailConfigModal from './MailConfigModal.svelte';
  import { pb } from "$lib/services/pocketbase";


  const mailConfigService = getMailConfigService();
  const mailboxService = getMailboxService();
  const emailService = getEmailService();

  let selectedEmailId = $state<string | null>(null);
  let showComposer = $state(false);
  let replyData = $state<any>(null);
  let showConfigModal = $state(false);
  let isInitialized = $state(false);
  let mobileMenuOpen = $state(false);
  let mobileDetailOpen = $state(false);

   // New states for User Filter
  let users = $state<any[]>([]);
  let isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin');
  let selectedUserEmail = $state(pb.authStore.model?.email || '');


  // Initialize on mount
  async function initializeMail() {
    if (isInitialized) return;
    
    try {

      if (isSuperAdmin) {
      pb.collection('users').getFullList({ requestKey: null }).then(res => users = res).catch(()=>{});
      }

      // Check if config exists
      const config = await mailConfigService.loadConfig();
      
      if (!config) {
        // Show config modal if no config
        showConfigModal = true;
      } else {
        // Load folders and sync
        await mailboxService.loadFolders(selectedUserEmail);
        
        // E-Mails sofort initial für den ausgewählten Ordner laden
        if (mailboxService.selectedFolderPath) {
          await emailService.loadEmails({ folder: mailboxService.selectedFolderPath, userEmail: selectedUserEmail });
        }
        
        await emailService.syncEmails();
        
        // Nach dem Sync die E-Mails und Ordner nochmal aktualisieren
        if (mailboxService.selectedFolderPath) {
          await emailService.loadEmails({ folder: mailboxService.selectedFolderPath, userEmail: selectedUserEmail });
          await mailboxService.loadFolders(selectedUserEmail);
        }
      }
      
      isInitialized = true;
    } catch (err) {
      console.error('[Mail Layout] Init error:', err);
    }
  }

  // Handle config save
  async function handleConfigSave(input: MailConfigInput) {
    try {
      await mailConfigService.saveConfig(input);
      showConfigModal = false;
      
      // Now load mailbox
      await mailboxService.loadFolders(selectedUserEmail);
      await emailService.syncEmails();
    } catch (err) {
      console.error('[Mail Layout] Config save error:', err);
    }
  }

  // Handle user change
  async function handleUserChange(email: string) {
      selectedUserEmail = email;
      selectedEmailId = null;
      await mailboxService.loadFolders(selectedUserEmail);
      if (mailboxService.selectedFolderPath) {
          await emailService.loadEmails({
              folder: mailboxService.selectedFolderPath,
              userEmail: selectedUserEmail
          });
      }
  }

  // Handle folder selection
  function handleFolderSelect(folderPath: string) {
    mailboxService.selectedFolderPath = folderPath;
    selectedEmailId = null;
    mobileMenuOpen = false;
    mobileDetailOpen = false;
    if (mailboxService.selectedFolder) {
      emailService.loadEmails({
        folder: folderPath,
        userEmail: selectedUserEmail
      });
    }
  }

  // Handle email selection
  function handleEmailSelect(emailId: string) {
    selectedEmailId = emailId;
    mobileDetailOpen = true;

    // E-Mail sofort im Moment des Anklickens als gelesen markieren
    const email = emailService.emails.find(e => e.id === emailId);
    if (email && !email.is_read) {
      emailService.markAsRead(emailId, true).catch(console.error);
    }
  }

  // Handle email delete
  async function handleEmailDelete(emailId: string) {
    try {
      await emailService.deleteEmail(emailId);
      selectedEmailId = null;
      // Reload emails for current folder
      if (mailboxService.selectedFolder) {
        await emailService.loadEmails({
          folder: mailboxService.selectedFolder.folder_path,
          userEmail: selectedUserEmail
        });
      }
    mobileDetailOpen = false;
    } catch (err) {
      console.error('[Mail Layout] Delete error:', err);
    }
  }

  // Handle reply
  async function handleEmailReply(emailId: string) {
    try {
      const email = await emailService.getEmail(emailId);
      if (email) {
        replyData = {
          to: email.from_address?.match(/<(.+)>/)?.[1] || email.from_address,
          subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
          body: `\n\n\n--- Ursprüngliche Nachricht ---\nVon: ${email.from_address}\nDatum: ${new Date(email.date).toLocaleString('de-DE')}\nBetreff: ${email.subject}\n\n${email.body_text}`
        };
        showComposer = true;
      }
    } catch (err) {
      console.error('Reply error:', err);
    }
  }

  // Handle email send
  async function handleEmailSend(input: any) {
    try {
      await emailService.sendEmail(input);
      showComposer = false;
      // Sync to get updated sent folder
      await emailService.syncEmails();
      // Reload with new sent emails if applicable
      if (mailboxService.selectedFolderPath) {
        await emailService.loadEmails({ folder: mailboxService.selectedFolderPath, userEmail: selectedUserEmail });
      }
    } catch (err) {
      console.error('[Mail Layout] Send error:', err);
    }
  }

  // Initialize on component mount
  $effect.pre(() => {
    initializeMail();
  });
</script>

<div class="flex h-full w-full bg-white relative overflow-hidden">
  <!-- Sidebar -->
  {#if mobileMenuOpen}
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button class="fixed inset-0 bg-neutral-900/20 backdrop-blur-sm z-40 md:hidden border-none w-full h-full cursor-default" onclick={() => (mobileMenuOpen = false)}></button>
  {/if}
  <div class="absolute inset-y-0 left-0 z-50 w-72 md:w-64 md:relative border-r border-neutral-100 bg-white transform transition-transform duration-300 {mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}">
    {#if mailConfigService.isLoading}
      <div class="p-4 text-center text-sm text-neutral-500">Lädt...</div>
    {:else if mailConfigService.error}
      <div class="p-4 text-center text-sm text-rose-500">{mailConfigService.error}</div>
    {:else}
      <MailSidebar
        folders={mailboxService.folders}
        selectedFolderPath={mailboxService.selectedFolderPath}
        totalUnread={mailboxService.totalUnread}
        onFolderSelect={handleFolderSelect}
        onConfigClick={() => (showConfigModal = true)}
        onComposeClick={() => (showComposer = true)}
        isLoading={mailboxService.isLoading}
        onCloseMenu={() => (mobileMenuOpen = false)}
        {isSuperAdmin}
        {users}
        {selectedUserEmail}
        onUserChange={handleUserChange}
      />
    {/if}
  </div>

  <!-- Main content -->
  <div class="flex-1 flex flex-col w-full">
    {#if !mailConfigService.hasConfig}
      <div class="flex-1 flex items-center justify-center bg-neutral-50/50">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-neutral-900 mb-4">E-Mail konfigurieren</h2>
          <p class="text-neutral-600 mb-6">
            Bitte konfigurieren Sie Ihre SMTP/IMAP-Einstellungen, um E-Mails zu versenden und zu empfangen.
          </p>
          <button
            onclick={() => (showConfigModal = true)}
            class="orga-button-primary shadow-indigo-600/20 px-8 py-3"
          >
            Einstellungen öffnen
          </button>
        </div>
      </div>
    {:else}
      {#if emailService.error || mailboxService.error}
        <div class="bg-rose-50 border-b border-rose-200 p-3 text-sm font-semibold text-rose-700 flex items-center z-10 shadow-sm animate-enter">
           <span>⚠️ {emailService.error || mailboxService.error}</span>
        </div>
      {/if}
      <!-- Mail list and detail -->
      <div class="flex-1 flex overflow-hidden relative">
        <!-- List -->
        <div class="flex-1 md:w-96 md:flex-none border-r border-neutral-100 bg-white flex flex-col min-w-0 relative">
          <MailList
            emails={emailService.paginatedEmails}
            selectedEmailId={selectedEmailId}
            currentPage={emailService.currentPage}
            totalPages={emailService.totalPages}
            isLoading={emailService.isLoading}
            folderName={mailboxService.selectedFolder?.folder_name || 'Posteingang'}
            isMobileDetailOpen={mobileDetailOpen}
            onEmailSelect={handleEmailSelect}
            onPageChange={(page: number) => (emailService.currentPage = page)}
            onToggleMenu={() => (mobileMenuOpen = true)}
            onComposeClick={() => (showComposer = true)}
          />
        </div>

        <!-- Detail -->
        <div class="absolute inset-0 z-30 md:relative md:z-auto bg-neutral-50 flex-1 flex flex-col overflow-hidden transition-transform duration-300 transform {mobileDetailOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}">
          {#if selectedEmailId}
            <MailDetail
              emailId={selectedEmailId}
              onDelete={() => handleEmailDelete(selectedEmailId || '')}
              onReply={() => handleEmailReply(selectedEmailId || '')}
              onBack={() => (mobileDetailOpen = false)}
            />
          {:else}
            <div class="hidden md:flex items-center justify-center h-full bg-neutral-50/50">
              <div class="text-center flex flex-col items-center">
                <span class="text-6xl mb-4 opacity-20">✉️</span>
                <p class="font-medium text-neutral-400">Wähle eine Nachricht aus, um sie zu lesen.</p>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Composer Modal -->
  {#if showComposer}
    <MailComposer initialData={replyData} onSend={handleEmailSend} onClose={() => { showComposer = false; replyData = null; }} />
  {/if}

  <!-- Config Modal -->
  {#if showConfigModal}
    <MailConfigModal
      currentConfig={mailConfigService.config}
      isLoading={mailConfigService.isLoading}
      error={mailConfigService.error}
      onSave={handleConfigSave}
      onClose={() => (showConfigModal = false)}
    />
  {/if}
</div>
