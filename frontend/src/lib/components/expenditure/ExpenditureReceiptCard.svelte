<script lang="ts">
    import { Eye, RotateCcw, Trash2, Check, FileText, Camera, Upload, Sparkles } from "lucide-svelte";
    import DocumentScanButton from "$lib/components/common/DocumentScanButton.svelte";

    let {
        receiptFile,
        existingReceiptUrl,
        existingReceiptName,
        localPreviewUrl,
        removeReceipt,
        isLoading,
        isScanningReceipt,
        onPreviewReceipt,
        onOpenCameraScanner,
        onOpenFilePicker,
        onRemoveReceipt,
        onScanComplete
    } = $props<{
        receiptFile: File | null;
        existingReceiptUrl: string | null;
        existingReceiptName: string | null;
        localPreviewUrl: string | null;
        removeReceipt: boolean;
        isLoading: boolean;
        isScanningReceipt: boolean;
        onPreviewReceipt: () => void;
        onOpenCameraScanner: () => void;
        onOpenFilePicker: () => void;
        onRemoveReceipt: () => void;
        onScanComplete?: (file: File) => void;
    }>();

    let hasActiveReceipt = $derived(receiptFile || (existingReceiptUrl && !removeReceipt));
</script>

<div class="pt-2">
    <div class="flex items-center justify-between mb-2">
        <span class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Beleg / Quittung
        </span>
        <span class="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
            <Sparkles class="w-3 h-3 text-amber-500" />
            <span>Mit automatischer Kantenerkennung</span>
        </span>
    </div>

    {#if hasActiveReceipt}
        <div class="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800/70 flex flex-col gap-3 shadow-xs">
            <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                    {#if localPreviewUrl}
                        <button type="button" onclick={onPreviewReceipt} class="relative group cursor-pointer shrink-0 min-h-[44px]" title="Großansicht öffnen">
                            <img src={localPreviewUrl} alt="Beleg" class="w-14 h-14 rounded-xl object-cover border border-indigo-300 dark:border-indigo-700 shadow-sm group-hover:opacity-85 transition-opacity" />
                            <span class="absolute inset-0 bg-black/35 rounded-xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"><Eye class="w-5 h-5" /></span>
                        </button>
                    {:else if existingReceiptUrl && /\.(jpg|jpeg|png|webp|gif)$/i.test(existingReceiptName || '')}
                        <button type="button" onclick={onPreviewReceipt} class="relative group cursor-pointer shrink-0 min-h-[44px]" title="Großansicht öffnen">
                            <img src={existingReceiptUrl} alt="Beleg" class="w-14 h-14 rounded-xl object-cover border border-indigo-300 dark:border-indigo-700 shadow-sm group-hover:opacity-85 transition-opacity" />
                            <span class="absolute inset-0 bg-black/35 rounded-xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"><Eye class="w-5 h-5" /></span>
                        </button>
                    {:else}
                        <div class="w-14 h-14 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-700 flex items-center justify-center text-indigo-700 dark:text-indigo-300 shrink-0">
                            <FileText class="w-7 h-7" />
                        </div>
                    {/if}

                    <div class="min-w-0 flex-1">
                        <p class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {receiptFile ? receiptFile.name : (existingReceiptName || 'Beleg vorhanden')}
                        </p>
                        <div class="flex items-center gap-1.5 mt-1">
                            <p class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <Check class="w-3.5 h-3.5 stroke-[3]" />
                                <span>{receiptFile ? 'Dokument zugeschnitten' : 'Gespeicherter Beleg'}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <button 
                    type="button" 
                    onclick={onRemoveReceipt} 
                    class="p-2.5 text-slate-400 hover:text-rose-600 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center" 
                    title="Beleg entfernen"
                >
                    <Trash2 class="w-4 h-4" />
                </button>
            </div>

            <!-- Buttons unter Beleg -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/60">
                <button 
                    type="button" 
                    onclick={onPreviewReceipt} 
                    class="flex-1 min-h-[44px] py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                    <Eye class="w-4 h-4 shrink-0" />
                    <span class="truncate">Beleg in Großansicht öffnen</span>
                </button>

                {#if onScanComplete}
                    <DocumentScanButton
                        onScanComplete={onScanComplete}
                        variant="compact"
                        label="Neu scannen"
                        documentTitle="Ausgaben_Beleg"
                        disabled={isLoading || isScanningReceipt}
                    />
                {:else}
                    <button 
                        type="button" 
                        onclick={onOpenCameraScanner} 
                        class="min-h-[44px] py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                        title="Erneut per Kamera scannen"
                    >
                        <RotateCcw class="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Neu scannen</span>
                    </button>
                {/if}
            </div>
        </div>
    {:else}
        <!-- Upload- & Live-Scan-Buttons -->
        <div class="flex flex-col gap-2.5">
            {#if onScanComplete}
                <DocumentScanButton
                    onScanComplete={onScanComplete}
                    variant="primary"
                    label="Beleg scannen (Multi-Page PDF)"
                    documentTitle="Ausgaben_Beleg"
                    disabled={isLoading || isScanningReceipt}
                    class="w-full"
                />
            {/if}

            <div class="grid grid-cols-2 gap-2.5">
                <button 
                    type="button" 
                    onclick={onOpenCameraScanner} 
                    disabled={isLoading || isScanningReceipt}
                    class="min-h-[48px] py-3.5 px-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 active:scale-98 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                >
                    {#if isScanningReceipt}
                        <span class="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></span>
                        <span>Liest Beleg...</span>
                    {:else}
                        <Camera class="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        <span>Kamera-Scan</span>
                    {/if}
                </button>

                <button 
                    type="button" 
                    onclick={onOpenFilePicker} 
                    disabled={isLoading || isScanningReceipt}
                    class="min-h-[48px] py-3.5 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-98 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                >
                    <Upload class="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
                    <span>Datei / PDF</span>
                </button>
            </div>
        </div>
    {/if}
</div>
