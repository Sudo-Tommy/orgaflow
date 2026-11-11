<!-- src/lib/components/clients/ClientDocumentUploadZone.svelte -->
<script lang="ts">
    import { UploadCloud, FolderOpen, Loader2, CheckCircle2, HardDrive } from 'lucide-svelte';
    import DocumentScanButton from '$lib/components/common/DocumentScanButton.svelte';
    import GoogleDrivePickerModal from '$lib/components/drive/GoogleDrivePickerModal.svelte';

    let {
        isUploading = false,
        uploadProgress = 0,
        statusText = '',
        showSuccess = false,
        onupload
    } = $props<{
        isUploading?: boolean;
        uploadProgress?: number;
        statusText?: string;
        showSuccess?: boolean;
        onupload: (files: FileList | File[]) => void;
    }>();

    let isDraggingOver = $state(false);
    let fileInput = $state<HTMLInputElement>();
    let isGoogleDriveOpen = $state(false);

    function handleFiles(input: HTMLInputElement) {
        if (!input.files || input.files.length === 0) return;
        const files = Array.from(input.files);
        input.value = '';
        onupload(files);
    }

    export function openPicker() {
        fileInput?.click();
    }

    function handleDrop(e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        isDraggingOver = false;
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            onupload(files);
        }
    }
</script>

<div class="space-y-3">
    <!-- Touch-optimierte Schnellwahltasten: Kamera, Dateiauswahl & Google Drive -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 landscape:grid-cols-3">
        <!-- 1. Kamera-Scan (Multi-Page PDF Dokumentenscanner) -->
        <DocumentScanButton
            variant="card"
            label="Foto / Beleg scannen"
            subLabel="Kamera auf Smartphone öffnen"
            documentTitle="Dokumentenscan"
            disabled={isUploading}
            onScanComplete={(file) => onupload([file])}
        />

        <!-- 2. Lokale Dateiauswahl -->
        <label
            class="flex items-center justify-center gap-2.5 p-3.5 sm:p-4 landscape:p-3 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 active:bg-indigo-200 dark:active:bg-indigo-900 text-indigo-900 dark:text-indigo-100 rounded-2xl border-2 border-indigo-300 dark:border-indigo-700/80 font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-[0.98] cursor-pointer select-none touch-manipulation focus-within:ring-2 focus-within:ring-indigo-500 {isUploading ? 'opacity-50 pointer-events-none' : ''}"
        >
            <input
                type="file"
                multiple
                bind:this={fileInput}
                onchange={(e) => handleFiles(e.currentTarget)}
                class="sr-only"
                disabled={isUploading}
            />
            <FolderOpen class="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div class="text-left">
                <span class="block leading-tight font-black">Dateien auswählen</span>
                <span class="text-[11px] font-normal text-indigo-700/80 dark:text-indigo-300/80">PDF, Office, Bilder (alle Formate)</span>
            </div>
        </label>

        <!-- 3. Google Drive Import (OAuth2) -->
        <button
            type="button"
            onclick={() => isGoogleDriveOpen = true}
            disabled={isUploading}
            class="flex items-center justify-center gap-2.5 p-3.5 sm:p-4 landscape:p-3 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 active:bg-amber-200 dark:active:bg-amber-900 text-amber-900 dark:text-amber-100 rounded-2xl border-2 border-amber-300 dark:border-amber-700/80 font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-[0.98] cursor-pointer select-none touch-manipulation focus:ring-2 focus:ring-amber-500 {isUploading ? 'opacity-50 pointer-events-none' : ''}"
        >
            <HardDrive class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div class="text-left">
                <span class="block leading-tight font-black">Google Drive</span>
                <span class="text-[11px] font-normal text-amber-700/80 dark:text-amber-300/80">Dateien direkt importieren</span>
            </div>
        </button>
    </div>

    <!-- Upload-Fortschritt & Statusanzeige -->
    {#if isUploading}
        <div class="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 space-y-2 animate-enter">
            <div class="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <span class="flex items-center gap-2">
                    <Loader2 class="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
                    {statusText || 'Dateien werden hochgeladen...'}
                </span>
                <span class="text-indigo-600 dark:text-indigo-400">{uploadProgress}%</span>
            </div>
            <div class="w-full bg-indigo-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                    class="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
                    style={`width: ${Math.max(5, uploadProgress)}%`}
                ></div>
            </div>
        </div>
    {:else if showSuccess}
        <div class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 animate-enter">
            <CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Dokument(e) erfolgreich in der Klienten-Akte hinterlegt.</span>
        </div>
    {/if}

    <!-- Drag & Drop Zone -->
    <label
        ondragover={(e) => { e.preventDefault(); isDraggingOver = true; }}
        ondragleave={() => isDraggingOver = false}
        ondrop={handleDrop}
        class="block border-2 border-dashed rounded-3xl p-5 sm:p-7 landscape:p-4 text-center transition-all cursor-pointer select-none touch-manipulation focus-within:ring-2 focus-within:ring-indigo-500 {isUploading ? 'opacity-50 pointer-events-none' : ''} {isDraggingOver ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 scale-[1.01]' : 'border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:border-neutral-400 dark:hover:border-slate-600'}"
    >
        <input
            type="file"
            multiple
            onchange={(e) => handleFiles(e.currentTarget)}
            class="sr-only"
            disabled={isUploading}
        />
        <UploadCloud class="w-8 h-8 mx-auto text-indigo-500 dark:text-indigo-400 mb-1.5" />
        <p class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">Dateien hier ablegen oder antippen</p>
        <p class="text-[11px] text-neutral-400 dark:text-slate-400 mt-0.5">Scans, Arztbriefe, Pflegeverträge, Anträge & beliebige Dateien (bis 25 MB)</p>
    </label>

    <!-- Google Drive Modal -->
    <GoogleDrivePickerModal
        isOpen={isGoogleDriveOpen}
        onclose={() => isGoogleDriveOpen = false}
        onselect={(files) => {
            if (files && files.length > 0) {
                onupload(files);
            }
        }}
    />
</div>
