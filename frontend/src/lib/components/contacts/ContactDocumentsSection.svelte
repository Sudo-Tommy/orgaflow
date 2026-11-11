<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { Paperclip, UploadCloud, Trash2, ExternalLink, FileText, Image as ImageIcon, File as FileIcon, CheckCircle2 } from "lucide-svelte";
    import type { ContactModalState } from "./contactModalState.svelte";

    let { state: modalState }: { state: ContactModalState } = $props();

    let isDragging = $state(false);
    let fileInput: HTMLInputElement;

    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

    function formatFileSize(bytes: number): string {
        if (!bytes || bytes === 0) return "0 KB";
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(0)} KB`;
        return `${(kb / 1024).toFixed(1)} MB`;
    }

    function getCleanFileName(fileName: string): string {
        if (!fileName) return "Dokument";
        return fileName.replace(/^[a-zA-Z0-9_]{10,}_/, "");
    }

    function isImageFile(fileName: string): boolean {
        return /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName);
    }

    function isPdfFile(fileName: string): boolean {
        return /\.pdf$/i.test(fileName);
    }

    function handleFileSelection(files: FileList | File[] | null) {
        if (!files || files.length === 0) return;
        const validFiles: File[] = [];

        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if (f.size > MAX_FILE_SIZE) {
                toastStore.error(`"${f.name}" überschreitet die maximale Dateigröße von 15 MB.`);
                continue;
            }
            validFiles.push(f);
        }

        if (validFiles.length > 0) {
            modalState.addNewDocuments(validFiles);
            toastStore.info(`${validFiles.length} ${validFiles.length === 1 ? 'Datei' : 'Dateien'} zum Hochladen vorgemerkt.`);
        }
    }

    function onDrop(e: DragEvent) {
        e.preventDefault();
        isDragging = false;
        if (e.dataTransfer?.files) {
            handleFileSelection(e.dataTransfer.files);
        }
    }

    function onDragOver(e: DragEvent) {
        e.preventDefault();
        isDragging = true;
    }

    function onDragLeave(e: DragEvent) {
        e.preventDefault();
        isDragging = false;
    }
</script>

<div class="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
            <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Dokumente & Nachweise</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Vollmachten, Betreuerausweise, Gerichtsbeschlüsse oder Korrespondenzen (bis 15 MB).
            </p>
        </div>
        <button
            type="button"
            onclick={() => fileInput?.click()}
            class="px-3 py-1.5 min-h-[38px] text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
        >
            <UploadCloud class="w-4 h-4" />
            <span>Datei hinzufügen</span>
        </button>
    </div>

    <!-- Drag & Drop Ablagezone -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        ondragover={onDragOver}
        ondragleave={onDragLeave}
        ondrop={onDrop}
        class="border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all {isDragging ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 hover:border-indigo-300 dark:hover:border-indigo-700'}"
    >
        <input
            type="file"
            bind:this={fileInput}
            multiple
            accept=".pdf,image/png,image/jpeg,image/webp"
            class="hidden"
            onchange={(e) => {
                handleFileSelection(e.currentTarget.files);
                e.currentTarget.value = "";
            }}
        />
        <div class="flex flex-col items-center justify-center gap-1.5">
            <span class="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg">
                📁
            </span>
            <p class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Dateien hierher ziehen oder <button type="button" onclick={() => fileInput?.click()} class="text-indigo-600 dark:text-indigo-400 font-bold underline hover:text-indigo-700 cursor-pointer">auswählen</button>
            </p>
            <p class="text-[11px] text-slate-400 dark:text-slate-500">
                Erlaubt: PDF, PNG, JPG, WebP (max. 15 MB)
            </p>
        </div>
    </div>

    <!-- Vorhandene Dokumente aus PocketBase -->
    {#if modalState.existingDocuments.length > 0}
        <div class="space-y-2 pt-2">
            <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gespeicherte Dokumente ({modalState.existingDocuments.length}):</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {#each modalState.existingDocuments as docName (docName)}
                    {@const isDeleting = modalState.documentsToDelete.includes(docName)}
                    {@const docUrl = modalState.currentRecord ? pb.files.getURL(modalState.currentRecord, docName) : ""}
                    <div class="p-2.5 rounded-xl border {isDeleting ? 'border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30' : 'border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900'} flex items-center justify-between gap-2 shadow-2xs transition-all">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="w-7 h-7 rounded-lg {isPdfFile(docName) ? 'bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400' : isImageFile(docName) ? 'bg-teal-100 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'} flex items-center justify-center shrink-0">
                                {#if isPdfFile(docName)}
                                    <FileText class="w-3.5 h-3.5" />
                                {:else if isImageFile(docName)}
                                    <ImageIcon class="w-3.5 h-3.5" />
                                {:else}
                                    <FileIcon class="w-3.5 h-3.5" />
                                {/if}
                            </span>
                            <div class="min-w-0">
                                <p class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate {isDeleting ? 'line-through text-red-600 dark:text-red-400' : ''}">
                                    {getCleanFileName(docName)}
                                </p>
                                <span class="text-[10px] text-slate-400 dark:text-slate-500">
                                    {isDeleting ? 'Wird beim Speichern gelöscht' : 'In Kontakt-Akte hinterlegt'}
                                </span>
                            </div>
                        </div>

                        <div class="flex items-center gap-1 shrink-0">
                            {#if !isDeleting && docUrl}
                                <a
                                    href={docUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Dokument öffnen"
                                    aria-label="Dokument öffnen"
                                >
                                    <ExternalLink class="w-3.5 h-3.5" />
                                </a>
                            {/if}
                            <button
                                type="button"
                                onclick={() => modalState.toggleDeleteExistingDocument(docName)}
                                class="p-1.5 rounded-lg transition-colors cursor-pointer {isDeleting ? 'text-slate-500 hover:text-slate-700 bg-slate-100 dark:bg-slate-800' : 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50'}"
                                title={isDeleting ? 'Löschen rückgängig machen' : 'Dokument entfernen'}
                                aria-label={isDeleting ? 'Löschen rückgängig machen' : 'Dokument entfernen'}
                            >
                                <Trash2 class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Neu vorgemerkte Dateien (Warteschlange) -->
    {#if modalState.newDocuments.length > 0}
        <div class="space-y-2 pt-2">
            <p class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 class="w-3.5 h-3.5" />
                <span>Neue Uploads ({modalState.newDocuments.length}) – werden beim Speichern hochgeladen:</span>
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {#each modalState.newDocuments as file, idx (file.name + idx)}
                    <div class="p-2.5 rounded-xl border border-indigo-200/90 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-between gap-2 shadow-2xs">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                {#if isPdfFile(file.name)}
                                    <FileText class="w-3.5 h-3.5" />
                                {:else if isImageFile(file.name)}
                                    <ImageIcon class="w-3.5 h-3.5" />
                                {:else}
                                    <FileIcon class="w-3.5 h-3.5" />
                                {/if}
                            </span>
                            <div class="min-w-0">
                                <p class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{file.name}</p>
                                <p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{formatFileSize(file.size)}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onclick={() => modalState.removeNewDocument(idx)}
                            class="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer shrink-0"
                            title="Entfernen"
                            aria-label="Aus Upload-Liste entfernen"
                        >
                            <Trash2 class="w-3.5 h-3.5" />
                        </button>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>
