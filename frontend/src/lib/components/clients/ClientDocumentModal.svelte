<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { X, Save, Trash2, FileText, Upload, Calendar } from "lucide-svelte";

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

    // Formular-Felder
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

    // RBAC: Nur Admins und Superadmins dürfen löschen
    let canDelete = $derived(editId !== null && (userRole === 'admin' || userRole === 'superadmin'));

    // Hilfsfunktion für Datumskonvertierung (PocketBase -> HTML Date Input)
    function toYMD(val: string) {
        if (!val) return "";
        const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return `${match[1]}-${match[2]}-${match[3]}`;
        return val.substring(0, 10);
    }

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

    // Reagiert auf prop-Änderungen von Außen
    $effect(() => {
        if (isOpen && dialog && !dialog.open) {
            initData();
            dialog.showModal();
        } else if (!isOpen && dialog && dialog.open) {
            dialog.close();
        }
    });

    function handleClose() {
        dispatch('cancel');
    }

    function handleFileSelect(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            uploadFiles = [...uploadFiles, ...Array.from(target.files)];
        }
        target.value = ''; // Input zurücksetzen für erneute Auswahl
    }

    function removeUploadFile(index: number) {
        uploadFiles = uploadFiles.filter((_, i) => i !== index);
    }

    function markExistingFileForDeletion(filename: string) {
        filesToDelete = [...filesToDelete, filename];
        existingFiles = existingFiles.filter(f => f !== filename);
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            const formData = new FormData();
            formData.append('title', title.trim());
            formData.append('document_type', document_type);
            formData.append('status', status);
            if (valid_from) formData.append('valid_from', `${valid_from} 12:00:00.000Z`);
            if (valid_until) formData.append('valid_until', `${valid_until} 12:00:00.000Z`);
            formData.append('notes', notes.trim());
            
            if (clientId && !editId) {
                formData.append('client', clientId);
            }

            // Auto-Tracking des Erstellers
            if (!editId && pb.authStore.model?.id) {
                formData.append('created_by', pb.authStore.model.id);
            }

            // Neue Dateien anhängen
            for (const file of uploadFiles) {
                formData.append('file', file);
            }

            // Bestehende Dateien behalten (die nicht gelöscht wurden)
            if (editId) {
                for (const existing of existingFiles) {
                    formData.append('file', existing);
                }
                // Wenn alle Dateien gelöscht wurden und keine neuen hochgeladen werden
                if (existingFiles.length === 0 && uploadFiles.length === 0) {
                    formData.append('file', ''); 
                }
            }

            let savedRecord;
            if (editId) {
                savedRecord = await pb.collection('client_documents').update(editId, formData);
            } else {
                savedRecord = await pb.collection('client_documents').create(formData);
            }

            toastStore.success(editId ? "Dokument aktualisiert!" : "Dokument angelegt!");
            dispatch('save', savedRecord);
        } catch (err: any) {
            console.error("Fehler beim Speichern:", err);
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
                await pb.collection('client_documents').delete(editId);
                toastStore.info("Dokument erfolgreich gelöscht.");
                dispatch('delete', editId);
            } catch (err: any) {
                console.error(err);
                errorMsg = "Fehler beim Löschen des Dokuments.";
            } finally {
                isLoading = false;
            }
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) handleClose(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <!-- Header -->
        <div class="flex items-center justify-between mb-6 shrink-0 border-b border-neutral-100 pb-4">
            <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 flex items-center gap-3">
                <span class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner text-lg">📄</span>
                {editId ? 'Dokument bearbeiten' : 'Neues Dokument anlegen'}
            </h2>
            <button aria-label="Schließen" onclick={handleClose} class="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none">
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- Scrollbarer Body -->
        <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">
            {#if errorMsg}
                <div class="bg-rose-50 text-rose-700 p-4 rounded-xl mb-6 text-sm font-medium border border-rose-200 animate-enter shadow-sm">{errorMsg}</div>
            {/if}

            <form id="docForm" onsubmit={handleSubmit} class="space-y-6">
                <div><label for="doc-title" class="block text-sm font-semibold text-neutral-700 mb-1.5">Titel / Bezeichnung *</label><input id="doc-title" type="text" bind:value={title} class="orga-input-clear py-2.5 text-sm" placeholder="z.B. Vorsorgevollmacht" required disabled={isLoading} /></div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div><label for="doc-type" class="block text-sm font-semibold text-neutral-700 mb-1.5">Dokumentenart *</label><select id="doc-type" bind:value={document_type} class="orga-input-clear py-2.5 text-sm cursor-pointer" required disabled={isLoading}><option value="Vollmacht">Vollmacht</option><option value="Antrag">Antrag</option><option value="Kündigung">Kündigung</option><option value="Vertrag">Vertrag</option><option value="Sonstiges">Sonstiges</option></select></div>
                    <div><label for="doc-status" class="block text-sm font-semibold text-neutral-700 mb-1.5">Status *</label><select id="doc-status" bind:value={status} class="orga-input-clear py-2.5 text-sm cursor-pointer" required disabled={isLoading}><option value="Entwurf">Entwurf</option><option value="Zur Unterschrift vorgelegt">Zur Unterschrift vorgelegt</option><option value="Unterschrieben / Gültig">Unterschrieben / Gültig</option><option value="Eingereicht (Wartet auf Antwort)">Eingereicht (Wartet auf Antwort)</option><option value="Abgeschlossen">Abgeschlossen</option><option value="Widerrufen / Ungültig">Widerrufen / Ungültig</option></select></div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                    <div><label for="doc-valid-from" class="block text-xs font-semibold text-neutral-600 mb-1.5 items-center gap-1.5"><Calendar class="w-3.5 h-3.5" /> Gültig von</label><input id="doc-valid-from" type="date" bind:value={valid_from} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                    <div><label for="doc-valid-until" class="block text-xs font-semibold text-neutral-600 mb-1.5 items-center gap-1.5"><Calendar class="w-3.5 h-3.5" /> Gültig bis (optional)</label><input id="doc-valid-until" type="date" bind:value={valid_until} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                </div>

                <div class="space-y-2">
                    <label for="doc-files" class="block text-sm font-semibold text-neutral-700 mb-1.5">Dateien anhängen (Alle Formate erlaubt)</label>
                    <div class="flex items-center gap-3"><input type="file" id="doc-files" multiple accept="*/*" class="hidden" onchange={handleFileSelect} disabled={isLoading} /><button type="button" onclick={() => document.getElementById('doc-files')?.click()} class="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm active:scale-95" disabled={isLoading}><Upload class="w-4 h-4" /> Durchsuchen</button></div>
                    
                    <!-- Anzeige der ausgewählten/bestehenden Dateien -->
                    {#if existingFiles.length > 0 || uploadFiles.length > 0}
                        <div class="flex flex-col gap-2 mt-3 pt-3 border-t border-neutral-100">
                            {#each existingFiles as file}
                                <div class="flex items-center justify-between bg-white border border-neutral-200 px-3 py-2 rounded-lg shadow-sm"><span class="text-xs font-semibold text-neutral-700 truncate flex items-center gap-2"><FileText class="w-4 h-4 text-neutral-400" /> {file}</span><button type="button" onclick={() => markExistingFileForDeletion(file)} class="text-rose-500 hover:text-rose-700 p-1" title="Datei entfernen" disabled={isLoading}><X class="w-4 h-4" /></button></div>
                            {/each}
                            {#each uploadFiles as file, index}
                                <div class="flex items-center justify-between bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg shadow-sm animate-enter"><span class="text-xs font-bold text-indigo-800 truncate flex items-center gap-2"><FileText class="w-4 h-4 text-indigo-500" /> {file.name}</span><button type="button" onclick={() => removeUploadFile(index)} class="text-rose-500 hover:text-rose-700 p-1" title="Upload abbrechen" disabled={isLoading}><X class="w-4 h-4" /></button></div>
                            {/each}
                        </div>
                    {/if}
                </div>

                <div><label for="doc-notes" class="block text-sm font-semibold text-neutral-700 mb-1.5">Interne Notizen / Bemerkungen</label><textarea id="doc-notes" bind:value={notes} rows="3" class="orga-input-clear resize-y custom-scrollbar text-sm" placeholder="Ergänzende Informationen zum Dokument..." disabled={isLoading}></textarea></div>
            </form>
        </div>

        <!-- Footer (Aktionen) -->
        <div class="pt-5 flex flex-col-reverse sm:flex-row justify-between items-center gap-3 border-t border-neutral-100 shrink-0 mt-2">
            {#if canDelete}
                <button type="button" onclick={handleDelete} class="w-full sm:w-auto py-3 sm:py-2.5 px-6 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 active:scale-95" disabled={isLoading}><Trash2 class="w-4 h-4" /> Dokument löschen</button>
            {:else}
                <div class="hidden sm:block"></div>
            {/if}
            <div class="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
                <button type="button" onclick={handleClose} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5 px-6" disabled={isLoading}>Abbrechen</button>
                <button type="submit" form="docForm" class="orga-button-primary shadow-indigo-600/30 w-full sm:w-auto py-3 sm:py-2.5 px-8 flex items-center justify-center gap-2" disabled={isLoading}>
                    {#if isLoading}<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>{:else}<Save class="w-4 h-4" />{/if}
                    {isLoading ? "Speichert..." : "Speichern"}
                </button>
            </div>
        </div>
    </div>
</dialog>