<!-- src/lib/components/MailLayout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import MailSidebar from './MailSidebar.svelte';
  import MailMainPanels from './mail/MailMainPanels.svelte';
  import MailComposer from './MailComposer.svelte';
  import MailConfigModal from './MailConfigModal.svelte';
  import MailUnconfiguredState from './mail/MailUnconfiguredState.svelte';
  import MassMailModal from './mail/MassMailModal.svelte';
  import { createMailController } from './mail/mailLayoutController.svelte';
  import { AlertTriangle, RefreshCw } from 'lucide-svelte';

  const ctrl = createMailController();
  let massMailModal = $state<ReturnType<typeof MassMailModal> | null>(null);

  onMount(() => {
    ctrl.initializeMail();
  });
</script>

<div class="flex flex-1 w-full bg-white dark:bg-slate-900 relative sm:rounded-3xl">
  {#if ctrl.mobileMenuOpen}
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button 
      type="button"
      class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden border-none w-full h-full cursor-default" 
      onclick={() => ctrl.mobileMenuOpen = false}
    ></button>
  {/if}

  <!-- Linke Spalte: Schlanke Gmail-Ordner-Sidebar (Sticky auf Desktop, gleitend auf Mobilgeräten) -->
  <div class="fixed lg:sticky lg:top-14 lg:self-start inset-y-0 left-0 z-50 w-64 lg:w-56 xl:w-60 shrink-0 border-r border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 transform transition-transform duration-300 {ctrl.mobileMenuOpen ? 'translate-x-0 shadow-2xl bg-white dark:bg-slate-900' : '-translate-x-full lg:translate-x-0'} flex flex-col sm:rounded-l-3xl overflow-y-auto max-h-screen lg:max-h-[calc(94dvh-4rem)]">
    {#if ctrl.mailConfigService.isLoading}
      <div class="p-8 text-center text-xs font-medium text-slate-400 flex flex-col items-center gap-3">
        <RefreshCw class="w-6 h-6 animate-spin text-indigo-500" />
        <span>Postfach wird geladen...</span>
      </div>
    {:else if ctrl.mailConfigService.error}
      <div class="p-6 text-center text-xs font-bold text-rose-500">
        {ctrl.mailConfigService.error}
      </div>
    {:else}
      <MailSidebar
        folders={ctrl.mailboxService.folders}
        selectedFolderPath={ctrl.mailboxService.selectedFolderPath}
        totalUnread={ctrl.mailboxService.totalUnread}
        onFolderSelect={ctrl.handleFolderSelect}
        onConfigClick={() => ctrl.showConfigModal = true}
        onComposeClick={() => ctrl.showComposer = true}
        onMassMailClick={() => massMailModal?.open()}
        onSyncClick={ctrl.syncMailServer}
        isLoading={ctrl.mailboxService.isLoading}
        isSyncing={ctrl.isSyncing}
        onCloseMenu={() => ctrl.mobileMenuOpen = false}
        isSuperAdmin={ctrl.isSuperAdmin}
        users={ctrl.users}
        selectedUserEmail={ctrl.selectedUserEmail}
        onUserChange={ctrl.handleUserChange}
      />
    {/if}
  </div>

  <!-- Hauptbereich: Volle Breite für E-Mail Liste oder Leseansicht -->
  <div class="flex-1 flex flex-col w-full min-w-0">
    {#if !ctrl.mailConfigService.hasConfig && !ctrl.mailConfigService.isLoading}
      <MailUnconfiguredState onConfigure={() => ctrl.showConfigModal = true} />
    {:else}
      {#if ctrl.emailService.error || ctrl.mailboxService.error}
        <div class="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2 z-10 shrink-0">
          <AlertTriangle class="w-4 h-4 shrink-0" />
          <span>{ctrl.emailService.error || ctrl.mailboxService.error}</span>
        </div>
      {/if}

      <MailMainPanels
        emails={ctrl.emailService.emails}
        selectedEmailId={ctrl.selectedEmailId}
        currentPage={ctrl.emailService.currentPage}
        totalPages={ctrl.emailService.totalPages}
        pageSize={ctrl.emailService.pageSize}
        isLoading={ctrl.emailService.isLoading}
        folderName={ctrl.mailboxService.selectedFolder?.folder_name || 'Posteingang'}
        onEmailSelect={ctrl.handleEmailSelect}
        onPageChange={(page) => ctrl.emailService.currentPage = page}
        onToggleMenu={() => ctrl.mobileMenuOpen = true}
        onComposeClick={() => ctrl.showComposer = true}
        onMarkAllRead={ctrl.handleMarkAllRead}
        onRefresh={ctrl.syncMailServer}
        onDeleteEmail={ctrl.handleEmailDelete}
        onBulkDelete={ctrl.handleBulkDelete}
        onBulkMarkRead={ctrl.handleBulkMarkRead}
        onToggleStar={ctrl.handleToggleStar}
        onReplyEmail={ctrl.handleEmailReply}
        onForwardEmail={ctrl.handleEmailForward}
        onCloseDetail={() => { ctrl.selectedEmailId = null; ctrl.mobileDetailOpen = false; }}
      />
    {/if}
  </div>

  {#if ctrl.showComposer}
    <MailComposer
      initialData={ctrl.replyData}
      onSend={ctrl.handleEmailSend}
      onClose={() => { ctrl.showComposer = false; ctrl.replyData = null; }}
    />
  {/if}

  {#if ctrl.showConfigModal}
    <MailConfigModal
      currentConfig={ctrl.mailConfigService.config}
      isLoading={ctrl.mailConfigService.isLoading}
      error={ctrl.mailConfigService.error}
      onSave={ctrl.handleConfigSave}
      onClose={() => ctrl.showConfigModal = false}
    />
  {/if}

  <MassMailModal bind:this={massMailModal} />
</div>
