<!-- src/lib/components/systemDialog/AdminReplyModal.svelte -->
<script lang="ts">
    import { systemDialogService } from "$lib/services/systemDialogService.svelte";
    import { MessageSquareCheck, Check, CornerDownRight, User, X, Clock, Reply } from "lucide-svelte";

    let dialog = $state<HTMLDialogElement>();
    let activeReply = $derived(systemDialogService.activeAdminReply);

    $effect(() => {
        if (activeReply && dialog && !dialog.open) {
            dialog.showModal();
        } else if (!activeReply && dialog && dialog.open) {
            dialog.close();
        }
    });

    async function handleAcknowledge() {
        if (!activeReply) return;
        await systemDialogService.markAdminReplySeen(activeReply.dialog.id, activeReply.userId);
    }

    function handleReplyFollowUp() {
        if (!activeReply) return;
        const targetUserId = activeReply.userId;
        const originalTitle = activeReply.dialog.title;
        systemDialogService.markAdminReplySeen(activeReply.dialog.id, activeReply.userId);
        systemDialogService.isSendModalOpen = true;
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('compose-follow-up-dialog', {
                detail: { recipientId: targetUserId, title: `Re: ${originalTitle}` }
            }));
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/80 backdrop:backdrop-blur-md w-full max-w-lg mx-auto my-auto rounded-3xl outline-none border-none shadow-2xl select-none touch-manipulation"
    onclick={(e) => { if (e.target === dialog) handleAcknowledge(); }}
    oncancel={(e) => { e.preventDefault(); handleAcknowledge(); }}
>
    {#if activeReply}
        <div class="w-full bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-500 shadow-2xl shadow-emerald-950/50 overflow-hidden transition-all my-auto animate-enter">
            <!-- Header -->
            <div class="p-4 sm:p-5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <MessageSquareCheck class="w-5 h-5" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                                Neue Rückmeldung
                            </span>
                            <span class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                                <Clock class="w-3 h-3" />
                                {new Date(activeReply.replyAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                            </span>
                        </div>
                        <h3 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
                            {activeReply.userName} hat geantwortet
                        </h3>
                    </div>
                </div>

                <button
                    type="button"
                    onclick={handleAcknowledge}
                    class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Schließen"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Content -->
            <div class="p-5 sm:p-6 space-y-4">
                <!-- Originale Mitteilung -->
                <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 text-xs">
                    <span class="font-bold text-slate-500 dark:text-slate-400 block mb-1">Deine ursprüngliche Mitteilung:</span>
                    <p class="font-semibold text-slate-800 dark:text-slate-200">{activeReply.dialog.title}</p>
                    <p class="text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">{activeReply.dialog.message}</p>
                </div>

                <!-- Rückantwort des Mitarbeiters -->
                <div class="space-y-1.5">
                    <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CornerDownRight class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Antwort von {activeReply.userName}:
                    </span>
                    <div class="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/80 text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                        „{activeReply.replyText}“
                    </div>
                </div>
            </div>

            <!-- Footer / Aktionen -->
            <div class="p-4 sm:p-5 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 flex-wrap">
                <button
                    type="button"
                    onclick={handleReplyFollowUp}
                    class="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-2xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                    <Reply class="w-4 h-4" />
                    <span>Folge-Nachricht</span>
                </button>
                <button
                    type="button"
                    onclick={handleAcknowledge}
                    class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                    <Check class="w-4 h-4" />
                    <span>Kenntnis genommen</span>
                </button>
            </div>
        </div>
    {/if}
</dialog>
