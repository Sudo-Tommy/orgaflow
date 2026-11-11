<!-- src/lib/components/systemDialog/SystemDialogOverlay.svelte -->
<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { systemDialogService } from "$lib/services/systemDialogService.svelte";
    import { AlertTriangle, Bell, Send, Paperclip, ExternalLink, ShieldAlert, Check, X, Code2, Sparkles } from "lucide-svelte";

    let dialog = $state<HTMLDialogElement>();
    let replyText = $state("");
    let isAcknowledged = $state(false);
    let isSubmitting = $state(false);
    let showReplyBox = $state(false);

    let activeDialog = $derived(systemDialogService.activeDialog);
    let sender = $derived(activeDialog?.expand?.sender);
    let isDeveloper = $derived(rbacService.isDeveloper);
    let isSimpleInfo = $derived(activeDialog?.priority === 'info' || activeDialog?.title?.includes('✨'));
    let canSubmit = $derived(isDeveloper || isSimpleInfo || isAcknowledged || replyText.trim().length > 0);

    const QUICK_REPLIES = [
        "Verstanden & erledigt",
        "Wird sofort umgesetzt",
        "Habe eine kurze Rückfrage",
        "Bin aktuell im Einsatz"
    ];

    $effect(() => {
        if (activeDialog && dialog && !dialog.open) {
            showReplyBox = false;
            dialog.showModal();
        } else if (!activeDialog && dialog && dialog.open) {
            dialog.close();
        }
    });

    function applyQuickReply(text: string) {
        replyText = text;
        isAcknowledged = true;
    }

    function handleDismissDev() {
        if (!activeDialog) return;
        systemDialogService.dismissForDeveloper(activeDialog.id);
    }

    async function handleConfirm() {
        if (!activeDialog || !canSubmit || isSubmitting) return;
        isSubmitting = true;
        try {
            await systemDialogService.confirmAndReply(activeDialog.id, replyText);
            replyText = "";
            isAcknowledged = false;
            showReplyBox = false;
        } finally {
            isSubmitting = false;
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/85 backdrop:backdrop-blur-md w-full max-w-xl mx-auto my-auto rounded-3xl outline-none border-none shadow-2xl select-none touch-manipulation"
    oncancel={(e) => { e.preventDefault(); if (isDeveloper) handleDismissDev(); }}
>
    {#if activeDialog}
        <div class="w-full bg-white dark:bg-slate-900 rounded-3xl border-2 shadow-2xl overflow-hidden transition-all my-auto {activeDialog.priority === 'urgent' ? 'border-rose-500 shadow-rose-950/50' : (activeDialog.priority === 'important' ? 'border-amber-500 shadow-amber-950/50' : 'border-indigo-500 shadow-indigo-950/50')}">
            <!-- Banner / Header -->
            <div class="p-4 sm:p-5 flex items-start gap-3.5 border-b {activeDialog.priority === 'urgent' ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60' : (activeDialog.priority === 'important' ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60' : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60')}">
                <div class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm {activeDialog.priority === 'urgent' ? 'bg-rose-500 text-white' : (activeDialog.priority === 'important' ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white')}">
                    {#if activeDialog.priority === 'urgent'}
                        <ShieldAlert class="w-6 h-6 animate-pulse" />
                    {:else if activeDialog.priority === 'important'}
                        <AlertTriangle class="w-6 h-6" />
                    {:else}
                        <Sparkles class="w-6 h-6" />
                    {/if}
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full {activeDialog.priority === 'urgent' ? 'bg-rose-600 text-white' : (activeDialog.priority === 'important' ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white')}">
                            {activeDialog.priority === 'urgent' ? 'Dringend' : (activeDialog.priority === 'important' ? 'Wichtig' : 'Kurz & Einfach • Neuigkeit')}
                        </span>
                        <span class="text-xs font-bold text-slate-800 dark:text-slate-200">Eil-Mitteilung</span>
                        <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {activeDialog.created ? new Date(activeDialog.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr' : ''}
                        </span>
                    </div>
                    <p class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                        Von: <span class="text-indigo-600 dark:text-indigo-400">{sender?.name_first || 'Tommy'} {sender?.name_last || 'Jenzsch'}</span>
                    </p>
                </div>
                {#if isDeveloper}
                    <div class="flex items-center gap-1.5 shrink-0">
                        <button type="button" onclick={handleDismissDev} title="Schließen" class="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer">
                            <X class="w-5 h-5" />
                        </button>
                    </div>
                {/if}
            </div>

            <!-- Nachrichtentext (Kurz & Übersichtlich) -->
            <div class="p-5 sm:p-6 space-y-4">
                <div>
                    <h2 id="system-dialog-title" class="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                        {activeDialog.title}
                    </h2>
                    <div class="mt-2.5 text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed font-medium bg-slate-50 dark:bg-slate-800/70 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                        {activeDialog.message}
                    </div>
                </div>

                <!-- Dateianhänge -->
                {#if activeDialog.attachments && activeDialog.attachments.length > 0}
                    <div class="space-y-1.5 pt-1">
                        <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Paperclip class="w-3.5 h-3.5" /> Anhänge ({activeDialog.attachments.length})
                        </span>
                        <div class="flex flex-wrap gap-2">
                            {#each activeDialog.attachments as att}
                                <a href={pb.files.getURL(activeDialog, att)} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">
                                    <ExternalLink class="w-3 h-3 text-indigo-500" />
                                    <span>{att.replace(/_[a-zA-Z0-9]{10}\./, '.')}</span>
                                </a>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if isSimpleInfo && !showReplyBox}
                    <div class="flex items-center justify-between pt-1">
                        <span class="text-xs text-slate-500 dark:text-slate-400">Mit 1 Klick bestätigen oder Frage stellen:</span>
                        <button type="button" onclick={() => showReplyBox = true} class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                            + Kurze Frage / Antwort schreiben
                        </button>
                    </div>
                {:else}
                    <!-- Schnellauswahl-Antworten -->
                    <div class="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400">Schnell-Rückmeldung:</span>
                        <div class="flex flex-wrap gap-1.5">
                            {#each QUICK_REPLIES as qr}
                                <button type="button" onclick={() => applyQuickReply(qr)} class="px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer {replyText === qr ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'}">
                                    {qr}
                                </button>
                            {/each}
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label for="system-dialog-reply-input" class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                            <span>Deine Antwort (optional):</span>
                        </label>
                        <textarea id="system-dialog-reply-input" bind:value={replyText} rows="2" placeholder="Hier Rückmeldung oder Fragen eintippen..." class="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"></textarea>
                    </div>
                {/if}

                {#if !isSimpleInfo && !isDeveloper}
                    <label class="flex items-start gap-3 p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 cursor-pointer select-none">
                        <input type="checkbox" bind:checked={isAcknowledged} class="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer" />
                        <span class="text-xs font-bold text-amber-950 dark:text-amber-200 leading-tight">Ich habe diesen Hinweis vollständig gelesen und nehme ihn zur Kenntnis.</span>
                    </label>
                {/if}
            </div>

            <!-- Footer / 1-Klick-Bestätigung -->
            <div class="p-4 sm:p-5 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                <span class="text-[11px] text-slate-400 font-medium">
                    {#if isSimpleInfo}✨ Einfach auf den Button rechts klicken zum Schließen.{:else if isDeveloper}💻 Entwickler-Modus aktiv.{:else if !canSubmit}⚠️ Bitte kurz bestätigen.{:else}Bereit.{/if}
                </span>

                <div class="flex items-center gap-2 w-full sm:w-auto">
                    {#if isDeveloper}
                        <button type="button" onclick={handleDismissDev} class="px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5">
                            <X class="w-4 h-4" /> <span>Schließen</span>
                        </button>
                    {/if}

                    <button type="button" onclick={handleConfirm} disabled={!canSubmit || isSubmitting} class="flex-1 sm:flex-initial min-h-[44px] px-6 py-2.5 rounded-2xl font-black text-xs sm:text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed {activeDialog.priority === 'urgent' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'}">
                        {#if isSubmitting}
                            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Wird gespeichert...</span>
                        {:else if replyText.trim().length > 0}
                            <Send class="w-4 h-4" /> <span>Antworten &amp; Schließen</span>
                        {:else if isSimpleInfo}
                            <Check class="w-4 h-4 stroke-[2.5]" /> <span>Super, verstanden! 👍</span>
                        {:else}
                            <Check class="w-4 h-4 stroke-[2.5]" /> <span>Gelesen &amp; Verstanden</span>
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    {/if}
</dialog>
