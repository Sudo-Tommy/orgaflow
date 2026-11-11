<!-- src/lib/components/systemDialog/AdminDialogHistoryModal.svelte -->
<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { systemDialogService, type SystemDialogRecord } from "$lib/services/systemDialogService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { X, CheckCheck, Trash2, Bell } from "lucide-svelte";
    import DialogReadStatusList from "./DialogReadStatusList.svelte";

    let dialog = $state<HTMLDialogElement>();
    let sentDialogs = $derived(systemDialogService.sentDialogs);
    const currentUserId = $derived(pb.authStore.model?.id || "");
    let userNames = $state<Record<string, string>>({});

    const canViewAllReads = $derived(rbacService.isDeveloper || rbacService.isOwner || rbacService.isFacilityAdmin);

    async function loadUserNames() {
        try {
            const users = await pb.collection('users').getFullList({ fields: 'id,name_first,name_last,email', requestKey: null });
            userNames = Object.fromEntries(users.map((u: any) => [u.id, `${u.name_first || ''} ${u.name_last || ''}`.trim() || u.email || 'Unbekannt']));
        } catch {}
    }

    $effect(() => {
        if (systemDialogService.isHistoryModalOpen && dialog && !dialog.open) {
            loadUserNames();
            dialog.showModal();
        } else if (!systemDialogService.isHistoryModalOpen && dialog && dialog.open) {
            dialog.close();
        }
    });

    function canDelete(d: SystemDialogRecord): boolean {
        return rbacService.isDeveloper || d.sender === currentUserId || rbacService.isOwner;
    }

    async function handleComplete(id: string) {
        try {
            await pb.collection('system_dialogs').update(id, { status: 'completed' }, { requestKey: null });
            toastStore.success("Mitteilung als erledigt archiviert.");
            systemDialogService.loadSentDialogs();
        } catch {
            toastStore.error("Fehler beim Archivieren.");
        }
    }

    async function handleDelete(d: SystemDialogRecord) {
        const confirmed = await confirmStore.ask(
            `Möchten Sie die Mitteilung "${d.title}" wirklich unwiderruflich löschen? Sie wird sofort bei allen Empfängern vom Bildschirm entfernt.`,
            "Mitteilung löschen",
            "Unwiderruflich löschen",
            "Abbrechen",
            true
        );
        if (confirmed) {
            await systemDialogService.deleteDialog(d.id);
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/80 backdrop:backdrop-blur-md w-full max-w-xl sm:max-w-2xl md:max-w-3xl mx-auto my-auto rounded-3xl outline-none border-none shadow-2xl"
    onclick={(e) => { if (e.target === dialog) systemDialogService.isHistoryModalOpen = false; }}
    oncancel={(e) => { e.preventDefault(); systemDialogService.isHistoryModalOpen = false; }}
>
    {#if systemDialogService.isHistoryModalOpen}
        <div class="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl my-auto flex flex-col relative animate-enter">
            <!-- Header im Benchmark-Design (AppointmentModal) -->
            <div class="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-200/80 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex justify-between items-center gap-3 rounded-t-3xl">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center font-bold shadow-xs shrink-0">
                        <Bell class="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">Verlauf &amp; Lesebestätigungen</h2>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                {sentDialogs.length}
                            </span>
                        </div>
                        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">Übersicht aller Mitteilungen, Lese- und Antwortbestätigungen</p>
                    </div>
                </div>

                <button
                    type="button"
                    onclick={() => (systemDialogService.isHistoryModalOpen = false)}
                    class="w-10 h-10 min-w-10 min-h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer border border-slate-200 dark:border-slate-700"
                    title="Schließen"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- List -->
            <div class="p-4 sm:p-5 space-y-3.5 divide-y divide-slate-100 dark:divide-slate-800 flex-1">
                {#if sentDialogs.length === 0}
                    <div class="py-12 text-center text-slate-400 text-xs font-bold">
                        Bisher keine gesendeten Mitteilungen vorhanden.
                    </div>
                {:else}
                    {#each sentDialogs as d (d.id)}
                        <div class="pt-3.5 first:pt-0 space-y-2">
                            <div class="flex items-start justify-between gap-2">
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full {d.priority === 'urgent' ? 'bg-rose-500 text-white' : (d.priority === 'important' ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white')}">
                                            {d.priority === 'urgent' ? 'Dringend' : (d.priority === 'important' ? 'Wichtig' : 'Info')}
                                        </span>
                                        <h3 class="text-sm font-bold text-slate-900 dark:text-white truncate">{d.title}</h3>
                                        <span class="text-[10px] text-slate-400 font-medium">
                                            {d.created ? new Date(d.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''} Uhr
                                        </span>
                                    </div>
                                    <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{d.message}</p>
                                </div>

                                <div class="flex items-center gap-1.5 shrink-0">
                                    {#if d.status !== 'completed'}
                                        <button type="button" onclick={() => handleComplete(d.id)} class="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 text-slate-500 text-xs font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700" title="Als erledigt markieren">
                                            <CheckCheck class="w-4 h-4" />
                                        </button>
                                    {/if}
                                    {#if canDelete(d)}
                                        <button type="button" onclick={() => handleDelete(d)} class="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-500 text-xs font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700" title="Unwiderruflich löschen">
                                            <Trash2 class="w-4 h-4" />
                                        </button>
                                    {/if}
                                </div>
                            </div>

                            <!-- Empfänger-Statusliste -->
                            {#if canViewAllReads || d.sender === currentUserId}
                                <DialogReadStatusList dialog={d} {userNames} />
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>

            <!-- Footer im Benchmark-Design -->
            <div class="p-3.5 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 pb-[max(env(safe-area-inset-bottom,0px),1rem)] rounded-b-3xl flex justify-end">
                <button
                    type="button"
                    onclick={() => (systemDialogService.isHistoryModalOpen = false)}
                    class="min-h-11 px-6 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                >
                    Schließen
                </button>
            </div>
        </div>
    {/if}
</dialog>
