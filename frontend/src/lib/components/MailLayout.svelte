<script lang="ts">
  import { getMailConfigService, type MailConfigInput } from '$lib/services/mailConfigServiceStore'; // FIX: Updated import path
  import { getMailboxService } from '$lib/services/mailboxServiceStore'; // FIX: Updated import path
  import { getEmailService } from '$lib/services/emailServiceStore';
  import type { MailboxMessage } from '$lib/types/mail'; // ARCHITEKTUR-FIX: MailboxMessage aus zentraler Datei
  import MailSidebar from './MailSidebar.svelte';
  import MailList from './MailList.svelte';
  import MailDetail from './MailDetail.svelte';
  import MailComposer from './MailComposer.svelte';
  import MailConfigModal from './MailConfigModal.svelte';
  import type { SendEmailInput } from '$lib/types/mail'; // FIX: Import SendEmailInput
  import { pb } from "$lib/services/pocketbase";
  import { onMount, onDestroy } from "svelte";
  import { slide, fade } from "svelte/transition";
  import { Mail, AlertTriangle, Settings, Loader2, Trash2, Forward, MailOpen, Mail as MailIcon } from 'lucide-svelte';


  const mailConfigService = getMailConfigService();
  const mailboxService = getMailboxService();
  const emailService = getEmailService();

  let selectedEmailId = $state<string | null>(null);
  let selectedEmailIds = $state<string[]>([]);
  let showComposer = $state(false);
  let replyData = $state<any>(null);
  let showConfigModal = $state(false);
  let isInitialized = $state(false);
  let mobileMenuOpen = $state(false);
  let mobileDetailOpen = $state(false);
  let searchQuery = $state('');

   // New states for User Filter
  let users = $state<any[]>([]);
  let isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin');
  let selectedUserId = $state(pb.authStore.model?.id || 'all');

  onMount(() => {
      if (isSuperAdmin) {
          pb.collection('users').getFullList({ requestKey: null }).then(res => users = res).catch(()=>{});
      }
  });

  // Derived filtered emails based on search query
  let filteredEmails = $derived.by(() => {
    return emailService.paginatedEmails.filter((e: MailboxMessage) => 
      e.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.from_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.body_text?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });


  // Initialize on mount
  async function initializeMail() {
    if (isInitialized) return;
    
    try {

      // Check if config exists
      const config = await mailConfigService.loadConfig();
      
      if (!config) {
        // Show config modal if no config
        showConfigModal = true;
      } else {
        // Load folders and sync
        await mailboxService.loadFolders(selectedUserId);

        // E-Mails sofort initial für den ausgewählten Ordner laden
        if (mailboxService.selectedFolderPath) {
          await emailService.loadEmails({ folder: mailboxService.selectedFolderPath, userId: selectedUserId });
        }
        
        await emailService.syncEmails();
        
        // Nach dem Sync die E-Mails und Ordner nochmal aktualisieren
        if (mailboxService.selectedFolderPath) {
          await emailService.loadEmails({ folder: mailboxService.selectedFolderPath, userId: selectedUserId }); // FIX: Ensure return type is handled
          await mailboxService.loadFolders(selectedUserId);
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
      await mailboxService.loadFolders(selectedUserId);
      await emailService.syncEmails();
    } catch (err) {
      console.error('[Mail Layout] Config save error:', err);
    }
  }

  // Handle user change
  async function handleUserChange(userId: string) {
      selectedUserId = userId;
      selectedEmailId = null;
      selectedEmailIds = [];
      await mailboxService.loadFolders(selectedUserId);
      if (mailboxService.selectedFolderPath) {
          await emailService.loadEmails({
              folder: mailboxService.selectedFolderPath,
              userId: selectedUserId
          });
      }
  }

  // Handle folder selection
  function handleFolderSelect(folderPath: string) {
    mailboxService.selectedFolderPath = folderPath;
    selectedEmailId = null;
    selectedEmailIds = [];
    mobileMenuOpen = false;
    mobileDetailOpen = false;
    if (mailboxService.selectedFolder) {
      emailService.loadEmails({
        folder: folderPath,
        userId: selectedUserId
      });
    }
  }

  // Handle email selection
  function handleEmailSelect(emailId: string) {
    selectedEmailId = emailId;
    mobileDetailOpen = true;

    // E-Mail sofort im Moment des Anklickens als gelesen markieren
    const email = emailService.emails.find((e: MailboxMessage) => e.id === emailId);
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
          userId: selectedUserId
        });
      }
    mobileDetailOpen = false;
    } catch (err) {
      console.error('[Mail Layout] Delete error:', err);
    }
  }

  // Multi-Selection Logic
  function handleToggleSelectEmail(id: string) {
    if (selectedEmailIds.includes(id)) {
      selectedEmailIds = selectedEmailIds.filter(i => i !== id);
    } else {
      selectedEmailIds = [...selectedEmailIds, id];
    }
  }

  function handleToggleSelectAll() {
    if (selectedEmailIds.length === emailService.paginatedEmails.length && emailService.paginatedEmails.length > 0) { // FIX: Added check for paginatedEmails.length > 0
      selectedEmailIds = [];
    } else {
      selectedEmailIds = emailService.paginatedEmails.map(e => e.id);
    }
  }

  async function handleBulkDelete() {
    if (selectedEmailIds.length === 0) return; // ARCHITEKTUR-FIX: Explizite Typisierung
    if (!confirm(`${selectedEmailIds.length} E-Mails wirklich löschen?`)) return;
    
    try {
      await Promise.all(selectedEmailIds.map(id => emailService.deleteEmail(id)));
      selectedEmailIds = [];
      selectedEmailId = null;
      await emailService.loadEmails({ folder: mailboxService.selectedFolderPath, userId: selectedUserId });
    } catch (err: any) { // ARCHITEKTUR-FIX: Explizite Typisierung
      console.error('Bulk delete error:', err);
    }
  }

  async function handleBulkMarkRead(read: boolean) {
    try {
      await Promise.all(selectedEmailIds.map(id => emailService.markAsRead(id, read)));
      selectedEmailIds = [];
      await emailService.loadEmails({ folder: mailboxService.selectedFolderPath, userId: selectedUserId });
    } catch (err: any) { // ARCHITEKTUR-FIX: Explizite Typisierung
      console.error('Bulk mark read error:', err);
    }
  }

  async function handleBulkForward() {
    if (selectedEmailIds.length === 0) return;
    try {
      const emails = await Promise.all(selectedEmailIds.map((id: string) => emailService.getEmail(id))); // FIX: Explicitly type 'id'
      const validEmails = emails.filter((e): e is MailboxMessage => e !== null);
      
      const combinedBody = validEmails.map((e: MailboxMessage) => {
        return `\n\n--- Weitergeleitete Nachricht ---\nVon: ${e.from_address}\nDatum: ${new Date(e.date).toLocaleString('de-DE')}\nBetreff: ${e.subject}\n\n${e.body_text}`;
      }).join('\n\n' + '='.repeat(40) + '\n\n');

      replyData = {
        to: '',
        subject: `Fwd: [Bulk] ${validEmails.length} Nachrichten`,
        body: combinedBody
      };
      showComposer = true;
      selectedEmailIds = [];
    } catch (err) {
      console.error('Bulk forward error:', err);
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
    } catch (err: any) { // FIX: No change needed, already typed
      console.error('Reply error:', err);
    }
  }

  // Handle forward
  async function handleEmailForward(emailId: string) {
    try {
      const email = await emailService.getEmail(emailId);
      if (email) {
        let forwardedAttachments: File[] = [];
        
        // Wenn Anhänge vorhanden sind, diese für den Composer vorbereiten
        if (email.attachments) {
          const attachmentsList = Array.isArray(email.attachments) ? email.attachments : [email.attachments];
          
          const downloadPromises = attachmentsList.map(async (filename: string) => {
            const url = pb.files.getURL(email, filename);
            const response = await fetch(url);
            const blob = await response.blob();
            return new File([blob], filename, { type: blob.type });
          });
          
          forwardedAttachments = await Promise.all(downloadPromises);
        }

        replyData = {
          to: '', // Weiterleitung startet ohne Empfänger
          subject: email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`,
          body: `\n\n\n--- Weitergeleitete Nachricht ---\nVon: ${email.from_address}\nDatum: ${new Date(email.date).toLocaleString('de-DE')}\nBetreff: ${email.subject}\nAn: ${email.to_address}\n\n${email.body_text}`,
          attachments: forwardedAttachments
        };
        showComposer = true;
      }
    } catch (err: any) {
      console.error('[Mail Layout] Forward error:', err);
    }
  }

  // Handle email send
  async function handleEmailSend(input: SendEmailInput) { // FIX: Explicitly type input
    try {
      await emailService.sendEmail(input);
      showComposer = false;
      // Sync to get updated sent folder
      await emailService.syncEmails();
      // Reload with new sent emails if applicable
      if (mailboxService.selectedFolderPath) {
        await emailService.loadEmails({ folder: mailboxService.selectedFolderPath, userId: selectedUserId });
      }
    } catch (err: any) {
      console.error('[Mail Layout] Send error:', err); // ARCHITEKTUR-FIX: Explizite Typisierung
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
  <div class="absolute inset-y-0 left-0 z-50 w-72 md:w-64 md:relative border-r border-neutral-100 bg-white transform transition-transform duration-300 {mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col min-h-0">
    {#if mailConfigService.isLoading}
      <div class="p-8 text-center text-sm font-medium text-neutral-400 flex flex-col items-center gap-3"><Loader2 class="w-6 h-6 animate-spin" /> Lädt...</div>
    {:else if mailConfigService.error}
      <div class="p-8 text-center text-sm font-bold text-rose-500">{mailConfigService.error}</div>
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
        {selectedUserId}
        onUserChange={handleUserChange}
      />
    {/if}
  </div>

  <!-- Main content -->
  <div class="flex-1 flex flex-col w-full min-w-0 min-h-0">
    {#if !mailConfigService.hasConfig}
      <div in:fade class="flex-1 flex items-center justify-center bg-neutral-50/50 p-6">
        <div class="text-center max-w-md bg-white p-8 sm:p-12 rounded-3xl border border-neutral-200 shadow-2xl">
          <div class="w-20 h-20 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Settings class="w-10 h-10" /></div>
          <h2 class="text-2xl font-black text-neutral-900 mb-4">E-Mail konfigurieren</h2>
          <p class="text-neutral-500 font-medium mb-8 leading-relaxed">
            Bitte konfigurieren Sie Ihre SMTP/IMAP-Einstellungen, um E-Mails zu versenden und zu empfangen.
          </p>
          <button
            onclick={() => (showConfigModal = true)}
            class="orga-button-primary shadow-brand-600/20 w-full min-h-14 px-8"
          >
            Einstellungen jetzt öffnen
          </button>
        </div>
      </div>
    {:else}
      {#if emailService.error || mailboxService.error}
        <div transition:slide class="bg-rose-50 border-b border-rose-200 p-4 text-sm font-bold text-rose-800 flex items-center gap-3 z-10 shadow-sm">
           <AlertTriangle class="w-5 h-5 text-rose-600 shrink-0" /> <span>{emailService.error || mailboxService.error}</span>
        </div>
      {/if}
      <!-- Mail list and detail -->
      <div class="flex-1 flex overflow-hidden relative min-h-0">
        <!-- List -->
        <div class="flex-1 md:w-96 md:flex-none border-r border-neutral-100 bg-white flex flex-col min-w-0 min-h-0 relative">
          <MailList
            emails={filteredEmails}
            {selectedEmailId}
            {selectedEmailIds}
            currentPage={emailService.currentPage}
            totalPages={emailService.totalPages}
            isLoading={emailService.isLoading}
            folderName={mailboxService.selectedFolder?.folder_name || 'Posteingang'}
            isMobileDetailOpen={mobileDetailOpen}
            onEmailSelect={handleEmailSelect}
            onToggleSelect={handleToggleSelectEmail}
            onToggleSelectAll={handleToggleSelectAll}
            onPageChange={(page: number) => (emailService.currentPage = page)}
            onToggleMenu={() => (mobileMenuOpen = true)}
            onComposeClick={() => (showComposer = true)}
            onBulkDelete={handleBulkDelete}
            onBulkForward={handleBulkForward}
            onBulkMarkRead={() => handleBulkMarkRead(true)}
            onBulkMarkUnread={() => handleBulkMarkRead(false)}
            bind:searchQuery
            onDeleteSingle={handleEmailDelete}
            onToggleRead={(id: string) => {
                const e = emailService.paginatedEmails.find((m: MailboxMessage) => m.id === id);
                if (e) emailService.markAsRead(id, !e.is_read);
            }}
            onToggleStar={(id: string) => {
                emailService.toggleStar(id);
            }}
          />
        </div>

        <!-- Detail -->
        <div class="absolute inset-0 z-30 md:relative md:z-auto bg-neutral-50 flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden transition-transform duration-300 transform {mobileDetailOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}">
          {#if selectedEmailId}
            <div in:fade={{ duration: 150 }} class="h-full">
              <MailDetail
                emailId={selectedEmailId}
                onDelete={() => handleEmailDelete(selectedEmailId || '')}
                onReply={() => handleEmailReply(selectedEmailId || '')}
                onForward={() => handleEmailForward(selectedEmailId || '')}
                onBack={() => (mobileDetailOpen = false)}
              />
            </div>
          {:else}
            <div in:fade class="hidden md:flex items-center justify-center h-full bg-neutral-50/50">
              <div class="text-center flex flex-col items-center">
                <div class="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-6 shadow-inner"><Mail class="w-10 h-10 text-neutral-300" /></div>
                <h3 class="text-xl font-black text-neutral-900 mb-2">Keine E-Mail ausgewählt</h3>
                <p class="font-medium text-neutral-500">Wähle eine Nachricht links aus der Liste, um sie zu lesen.</p>
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
