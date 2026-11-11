<!-- src/lib/components/clients/ClientEditModal.svelte -->
<script lang="ts">
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { triggerHaptic } from "$lib/services/hapticFeedback";
    import { X, User, Heart, FolderOpen } from "lucide-svelte";
    import { createClientEditState } from "./clientEdit/clientEditState.svelte";
    import { saveClientEdit } from "./clientEdit/clientEditSaveAction";
    import ClientMasterDataTab from "./clientEdit/ClientMasterDataTab.svelte";
    import ClientCareTab from "./clientEdit/ClientCareTab.svelte";
    import ClientSignatureDocumentsTab from "./clientEdit/ClientSignatureDocumentsTab.svelte";

    let { client } = $props<{ client: any }>();

    let dialog: HTMLDialogElement;
    let formBodyRef = $state<HTMLDivElement | null>(null);
    let sigTab = $state<ReturnType<typeof ClientSignatureDocumentsTab>>();

    const editState = createClientEditState();

    function switchTab(tab: 'master' | 'care' | 'documents') {
        triggerHaptic('tap');
        editState.activeTab = tab;
        if (formBodyRef) formBodyRef.scrollTop = 0;
    }

    export function open(overrideClient?: any) {
        editState.initForm(overrideClient || client);
        dialog?.showModal();
        setTimeout(() => { sigTab?.clearSignature(); }, 50);
    }

    export function close() {
        dialog?.close();
    }

    export async function attemptClose() {
        if (editState.isDirty()) {
            if (!(await confirmStore.ask("Sie haben ungespeicherte Änderungen. Möchten Sie wirklich abbrechen?", "Änderungen verwerfen?", "Verwerfen", "Abbrechen", true))) return;
        }
        close();
    }

    function onSubmit(e: Event) {
        e.preventDefault();
        saveClientEdit(client, editState, close);
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/80 backdrop:backdrop-blur-md w-full max-w-xl sm:max-w-2xl md:max-w-3xl mx-auto my-auto rounded-3xl outline-none border-none shadow-2xl z-9999"
    onclick={(e) => { if (e.target === dialog) attemptClose(); }}
    oncancel={(e) => { e.preventDefault(); attemptClose(); }}
>
    <div class="bg-white dark:bg-slate-900 rounded-3xl w-full flex flex-col relative shadow-2xl border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100">
        <!-- Header im Benchmark-Design -->
        <div class="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-200/80 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex justify-between items-center gap-3 rounded-t-3xl">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center font-black text-sm sm:text-base shadow-xs shrink-0">
                    {((editState.formData.name_first?.[0] || client?.name_first?.[0] || 'K') + (editState.formData.name_last?.[0] || client?.name_last?.[0] || '')).toUpperCase()}
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                            {`${editState.formData.name_first || client?.name_first || ''} ${editState.formData.name_last || client?.name_last || ''}`.trim() || 'Klient bearbeiten'}
                        </h2>
                        {#if editState.formData.status}
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold {editState.formData.status === 'Aktiv' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}">
                                {editState.formData.status}
                            </span>
                        {/if}
                        {#if editState.formData.level_of_care}
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                PG {editState.formData.level_of_care}
                            </span>
                        {/if}
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                        Klient bearbeiten · ID: <span class="font-mono text-indigo-600 dark:text-indigo-400">{client?.id || 'neu'}</span>
                    </p>
                </div>
            </div>

            <button
                type="button"
                aria-label="Schließen"
                title="Schließen"
                onclick={attemptClose}
                class="w-10 h-10 min-w-10 min-h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer border border-slate-200 dark:border-slate-700"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- 3-Tab Navigation Bar -->
        <div class="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
            <div class="grid grid-cols-3 gap-2">
                <button
                    type="button"
                    onclick={() => switchTab('master')}
                    class="min-h-11 px-2.5 sm:px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs border {editState.activeTab === 'master' ? 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-500 dark:text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200/90 dark:border-slate-700/80'}"
                >
                    <User class="w-3.5 h-3.5" /> <span class="truncate">Stammdaten</span>
                </button>
                <button
                    type="button"
                    onclick={() => switchTab('care')}
                    class="min-h-11 px-2.5 sm:px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs border {editState.activeTab === 'care' ? 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-500 dark:text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200/90 dark:border-slate-700/80'}"
                >
                    <Heart class="w-3.5 h-3.5" /> <span class="truncate">Pflege &amp; Kasse</span>
                </button>
                <button
                    type="button"
                    onclick={() => switchTab('documents')}
                    class="min-h-11 px-2.5 sm:px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs border {editState.activeTab === 'documents' ? 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-500 dark:text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200/90 dark:border-slate-700/80'}"
                >
                    <FolderOpen class="w-3.5 h-3.5" /> <span class="truncate">Dokumente</span>
                </button>
            </div>
        </div>

        <!-- Form Body -->
        <div bind:this={formBodyRef} class="flex-1 p-4 sm:p-6">
            {#if editState.errorMsg}
                <div class="bg-rose-50 text-rose-700 p-4 rounded-xl mb-6 text-sm font-bold border border-rose-200 shadow-sm">{editState.errorMsg}</div>
            {/if}

            <form id="clientEditForm" onsubmit={onSubmit} class="space-y-6">
                {#if editState.activeTab === 'master'}
                    <ClientMasterDataTab {editState} />
                {:else if editState.activeTab === 'care'}
                    <ClientCareTab {editState} />
                {:else if editState.activeTab === 'documents'}
                    <ClientSignatureDocumentsTab bind:this={sigTab} {editState} {client} />
                {/if}
            </form>
        </div>

        <!-- Footer -->
        <div class="p-3.5 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 pb-[max(env(safe-area-inset-bottom,0px),1rem)] rounded-b-3xl">
            <div class="flex flex-col-reverse sm:flex-row justify-between items-center gap-3">
                <div class="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                    Tab: <span class="font-bold text-slate-700 dark:text-slate-200">{editState.activeTab === 'master' ? 'Stammdaten' : editState.activeTab === 'care' ? 'Pflege & Kasse' : 'Dokumente'}</span>
                </div>
                <div class="flex flex-col-reverse sm:flex-row gap-2.5 w-full sm:w-auto">
                    <button type="button" onclick={attemptClose} class="min-h-11 px-5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors w-full sm:w-auto" disabled={editState.isLoading}>Abbrechen</button>
                    <button type="submit" form="clientEditForm" class="min-h-11 px-6 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs cursor-pointer transition-colors w-full sm:w-auto" disabled={editState.isLoading}>
                        {editState.isLoading ? "Speichert..." : "Änderungen speichern"}
                    </button>
                </div>
            </div>
        </div>
    </div>
</dialog>
