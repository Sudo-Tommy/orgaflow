<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";
    import { X, Save, Trash2, FileText, Calendar } from "lucide-svelte";
    import { autoGrow } from "$lib/actions/autoGrow";
    import { DOCUMENT_TYPE_OPTIONS, DOCUMENT_STATUS_OPTIONS, toYMD } from "./document/clientDocumentFormTypes";
    import { saveClientDocument, deleteClientDocument } from "./document/clientDocumentSubmitHelper";
    import ClientDocumentFilesSection from "./document/ClientDocumentFilesSection.svelte";

    const dispatch = createEventDispatcher();

    let {
        isOpen = false,
        documentData = null,
        userRole = 'user',
        clientId = ''
    } = $props<{
        isOpen?: boolean;
        documentData?: any | null;
        userRole?: string;
        clientId?: string;
    }>();

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let editId = $state<string | null>(null);
    let title = $state("");
    let document_type = $state("Sonstiges");
    let status = $state("Entwurf");
    let valid_from = $state("");
    let valid_until = $state("");
    let notes = $state("");
    let uploadFiles = $state<File[]>([]);
    let existingFiles = $state<string[]>([]);
    let filesToDelete = $state<string[]>([]);

    let canDelete = $derived(editId !== null && (userRole === 'admin' || userRole === 'superadmin' || userRole === 'developer'));

    function initData() {
        if (documentData) {
            editId = documentData.id;
            title = documentData.title || "";
            document_type = documentData.document_type || "Sonstiges";
            status = documentData.status || "Entwurf";
            valid_from = toYMD(documentData.valid_from);
            valid_until = toYMD(documentData.valid_until);
            notes = documentData.notes || "";
            existingFiles = Array.isArray(documentData.file) ? documentData.file : (documentData.file ? [documentData.file] : []);
        } else {
            editId = null;
            title = "";
            document_type = "Sonstiges";
            status = "Entwurf";
            valid_from = "";
            valid_until = "";
            notes = "";
            existingFiles = [];
        }
        uploadFiles = [];
        filesToDelete = [];
        errorMsg = "";
    }

    $effect(() => {
        if (isOpen && dialog && !dialog.open) {
            initData();
            dialog.showModal();
        } else if (!isOpen && dialog && dialog.open) {
            dialog.close();
        }
    });

    async function handleSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";
        hapticFeedback.tap();
        try {
            const savedRecord = await saveClientDocument({
                editId, title, document_type, status, valid_from, valid_until,
                notes, clientId, uploadFiles, existingFiles
            });
            hapticFeedback.success();
            toastStore.success(editId ? "Dokument aktualisiert!" : "Dokument angelegt!");
            dispatch('save', savedRecord);
        } catch (err: any) {
            console.error("Fehler beim Speichern:", err);
            hapticFeedback.error();
            errorMsg = err.message || "Es gab einen Fehler beim Speichern des Dokuments.";
        } finally {
            isLoading = false;
        }
    }

    async function handleDelete() {
        if (!editId || !canDelete) return;
        if (await confirmStore.ask("Möchten Sie dieses Dokument wirklich unwiderruflich löschen?", "Dokument löschen?", "Löschen", "Abbrechen", true)) {
            isLoading = true;
            try {
                await deleteClientDocument(editId);
                hapticFeedback.success();
                toastStore.info("Dokument erfolgreich gelöscht.");
                dispatch('delete', editId);
            } catch (err: any) {
                console.error(err);
                hapticFeedback.error();
                errorMsg = "Fehler beim Löschen des Dokuments.";
            } finally {
                isLoading = false;
            }
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-2xl mx-auto my-6 sm:my-10 rounded-3xl border-none outline-none shadow-2xl" onclick={(e) => { if (e.target === dialog) dispatch('cancel'); }}>
    <div class="bg-white dark:bg-slate-900 rounded-3xl w-full relative shadow-2xl border border-neutral-200/80 dark:border-slate-800 text-neutral-900 dark:text-slate-100 flex flex-col">
        <!-- Hero Header -->
        <div class="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0 overflow-hidden rounded-t-3xl">
            <div class="flex items-center gap-3.5 relative z-10">
                <div class="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-indigo-300 shadow-inner">
                    <FileText class="w-5 h-5" />
                </div>
                <div>
                    <h2 class="text-lg sm:text-xl font-black text-white">
                        {editId ? 'Dokument bearbeiten' : 'Neues Dokument anlegen'}
                    </h2>
                    <p class="text-xs text-indigo-200/70 font-medium mt-0.5">Metadaten, Gültigkeitszeiträume & Anhänge verwalten</p>
                </div>
            </div>

            <button aria-label="Schließen" onclick={() => dispatch('cancel')} class="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer relative z-10 touch-manipulation">
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- Body -->
        <div class="flex-1 p-6 sm:p-7 space-y-6">
            {#if errorMsg}
                <div class="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 p-4 rounded-2xl text-xs font-bold border border-rose-200 dark:border-rose-900 animate-enter shadow-xs">{errorMsg}</div>
            {/if}

            <form id="docForm" onsubmit={handleSubmit} class="space-y-5">
                <div>
                    <label for="doc-title" class="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-slate-300 mb-1.5">Titel / Bezeichnung *</label>
                    <input id="doc-title" type="text" bind:value={title} class="orga-input-clear bg-neutral-50/60 dark:bg-slate-800/80 dark:text-white dark:border-slate-700 py-2.5 min-h-11 text-sm rounded-xl touch-manipulation" placeholder="z.B. Vorsorgevollmacht" required disabled={isLoading} />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label for="doc-type" class="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-slate-300 mb-1.5">Dokumentenart *</label>
                        <select id="doc-type" bind:value={document_type} class="orga-input-clear bg-neutral-50/60 dark:bg-slate-800/80 dark:text-white dark:border-slate-700 py-2.5 min-h-11 text-sm rounded-xl cursor-pointer touch-manipulation" required disabled={isLoading}>
                            {#each DOCUMENT_TYPE_OPTIONS as opt (opt.value)}
                                <option value={opt.value}>{opt.label}</option>
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label for="doc-status" class="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-slate-300 mb-1.5">Status *</label>
                        <select id="doc-status" bind:value={status} class="orga-input-clear bg-neutral-50/60 dark:bg-slate-800/80 dark:text-white dark:border-slate-700 py-2.5 min-h-11 text-sm rounded-xl cursor-pointer touch-manipulation" required disabled={isLoading}>
                            {#each DOCUMENT_STATUS_OPTIONS as opt (opt.value)}
                                <option value={opt.value}>{opt.label}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-neutral-50/60 dark:bg-slate-800/50 rounded-2xl border border-neutral-200/80 dark:border-slate-700/80 border-l-4 border-l-indigo-500">
                    <div>
                        <label for="doc-valid-from" class="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <Calendar class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Gültig von
                        </label>
                        <input id="doc-valid-from" type="date" bind:value={valid_from} class="orga-input-clear py-2 min-h-11 text-sm bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 rounded-xl touch-manipulation" disabled={isLoading} />
                    </div>
                    <div>
                        <label for="doc-valid-until" class="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <Calendar class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Gültig bis (optional)
                        </label>
                        <input id="doc-valid-until" type="date" bind:value={valid_until} class="orga-input-clear py-2 min-h-11 text-sm bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 rounded-xl touch-manipulation" disabled={isLoading} />
                    </div>
                </div>

                <ClientDocumentFilesSection
                    bind:existingFiles
                    bind:uploadFiles
                    bind:filesToDelete
                    {isLoading}
                />

                <div>
                    <label for="doc-notes" class="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-slate-300 mb-1.5">Interne Notizen / Bemerkungen</label>
                    <textarea use:autoGrow id="doc-notes" bind:value={notes} class="auto-grow orga-input-clear bg-neutral-50/60 dark:bg-slate-800/80 dark:text-white dark:border-slate-700 resize-none overflow-hidden text-sm rounded-xl min-h-20" placeholder="Ergänzende Informationen zum Dokument..." disabled={isLoading}></textarea>
                </div>
            </form>
        </div>

        <!-- Footer -->
        <div class="p-5 sm:p-6 bg-neutral-50/50 dark:bg-slate-800/40 border-t border-neutral-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-between items-center gap-3 shrink-0 rounded-b-3xl">
            {#if canDelete}
                <button type="button" onclick={handleDelete} class="w-full sm:w-auto py-2.5 px-5 min-h-11 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:text-rose-700 border border-rose-200 dark:border-rose-900 rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 active:scale-95 cursor-pointer touch-manipulation" disabled={isLoading}>
                    <Trash2 class="w-4 h-4" /> Dokument löschen
                </button>
            {:else}
                <div class="hidden sm:block"></div>
            {/if}
            <div class="flex flex-col-reverse sm:flex-row gap-2.5 w-full sm:w-auto">
                <button type="button" onclick={() => dispatch('cancel')} class="orga-button-ghost dark:text-slate-300 dark:hover:bg-slate-800 w-full sm:w-auto py-2.5 px-5 min-h-11 text-xs font-bold cursor-pointer touch-manipulation" disabled={isLoading}>Abbrechen</button>
                <button type="submit" form="docForm" class="orga-button-primary shadow-indigo-600/20 w-full sm:w-auto py-2.5 px-6 min-h-11 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer touch-manipulation" disabled={isLoading}>
                    {#if isLoading}
                        <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {:else}
                        <Save class="w-4 h-4" />
                    {/if}
                    <span>{isLoading ? "Speichert..." : "Speichern"}</span>
                </button>
            </div>
        </div>
    </div>
</dialog>