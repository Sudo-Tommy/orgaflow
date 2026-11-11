<script lang="ts">
    import { Upload, FileText, X } from "lucide-svelte";
    import DocumentScanButton from "$lib/components/common/DocumentScanButton.svelte";

    let {
        existingFiles = $bindable([]),
        uploadFiles = $bindable([]),
        filesToDelete = $bindable([]),
        isLoading = false
    }: {
        existingFiles: string[];
        uploadFiles: File[];
        filesToDelete: string[];
        isLoading?: boolean;
    } = $props();

    function handleFileSelect(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            uploadFiles = [...uploadFiles, ...Array.from(target.files)];
        }
        target.value = '';
    }

    function removeUploadFile(index: number) {
        uploadFiles = uploadFiles.filter((_, i) => i !== index);
    }

    function markExistingFileForDeletion(filename: string) {
        filesToDelete = [...filesToDelete, filename];
        existingFiles = existingFiles.filter(f => f !== filename);
    }
</script>

<div class="space-y-2">
    <label for="doc-files" class="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-slate-300 mb-1.5">Dateien anhängen</label>
    <div class="flex flex-wrap items-center gap-3">
        <input type="file" id="doc-files" multiple accept="*/*" class="hidden" onchange={handleFileSelect} disabled={isLoading} />
        <button 
            type="button" 
            onclick={() => document.getElementById('doc-files')?.click()} 
            class="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 px-4 min-h-11 rounded-xl flex items-center gap-2 transition-all shadow-2xs active:scale-95 cursor-pointer touch-manipulation" 
            disabled={isLoading}
        >
            <Upload class="w-4 h-4" /> Durchsuchen & Auswählen
        </button>
        <DocumentScanButton
            variant="secondary"
            label="Dokument scannen"
            documentTitle="Klient_Dokument"
            disabled={isLoading}
            onScanComplete={(file) => { uploadFiles = [...uploadFiles, file]; }}
        />
    </div>
    
    {#if existingFiles.length > 0 || uploadFiles.length > 0}
        <div class="flex flex-col gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-slate-800">
            {#each existingFiles as file}
                <div class="flex items-center justify-between bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl shadow-2xs">
                    <span class="text-xs font-semibold text-neutral-700 dark:text-slate-200 truncate flex items-center gap-2">
                        <FileText class="w-4 h-4 text-neutral-400 dark:text-slate-400" /> {file}
                    </span>
                    <button 
                        type="button" 
                        onclick={() => markExistingFileForDeletion(file)} 
                        class="w-8 h-8 flex items-center justify-center text-rose-500 hover:text-rose-700 dark:text-rose-400 rounded-lg p-1 cursor-pointer touch-manipulation" 
                        title="Datei entfernen" 
                        aria-label="Datei entfernen"
                        disabled={isLoading}
                    >
                        <X class="w-4 h-4" />
                    </button>
                </div>
            {/each}
            {#each uploadFiles as file, index}
                <div class="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3.5 py-2.5 rounded-xl shadow-2xs animate-enter">
                    <span class="text-xs font-bold text-indigo-800 dark:text-indigo-300 truncate flex items-center gap-2">
                        <FileText class="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> {file.name}
                    </span>
                    <button 
                        type="button" 
                        onclick={() => removeUploadFile(index)} 
                        class="w-8 h-8 flex items-center justify-center text-rose-500 hover:text-rose-700 dark:text-rose-400 rounded-lg p-1 cursor-pointer touch-manipulation" 
                        title="Upload abbrechen" 
                        aria-label="Upload abbrechen"
                        disabled={isLoading}
                    >
                        <X class="w-4 h-4" />
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</div>
