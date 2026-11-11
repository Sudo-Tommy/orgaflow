<script lang="ts">
    import type { ElementType } from './flyerTypes';

    interface Props {
        activeSheetIndex: number;
        isFullscreen: boolean;
        isLoadingPreview: boolean;
        isDownloadingPdf: boolean;
        onAddElement: (type: ElementType) => void;
        onSelectSheet: (idx: number) => void;
        onToggleFullscreen: () => void;
        onOpenPreview: () => void;
        onDownloadPdf: () => void;
        onPrint: () => void;
        onReset: () => void;
    }

    let {
        activeSheetIndex,
        isFullscreen,
        isLoadingPreview,
        isDownloadingPdf,
        onAddElement,
        onSelectSheet,
        onToggleFullscreen,
        onOpenPreview,
        onDownloadPdf,
        onPrint,
        onReset
    }: Props = $props();
</script>

<div class="w-16 sm:w-20 bg-neutral-900 flex flex-col items-center py-6 gap-6 no-print shrink-0 z-20 shadow-2xl">
    <!-- Elemente hinzufügen -->
    <div class="flex flex-col gap-3 w-full px-2 border-b border-neutral-800 pb-6">
        <button
            type="button"
            onclick={() => onAddElement('text')}
            title="Text hinzufügen"
            class="w-full min-h-[44px] aspect-square bg-neutral-800 hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-colors font-bold text-xl touch-manipulation cursor-pointer active:scale-95"
        >
            T
        </button>
        <button
            type="button"
            onclick={() => onAddElement('box')}
            title="Farbfläche/Box hinzufügen"
            class="w-full min-h-[44px] aspect-square bg-neutral-800 hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-colors font-bold text-xl touch-manipulation cursor-pointer active:scale-95"
        >
            ⬛
        </button>
        <button
            type="button"
            onclick={() => onAddElement('image')}
            title="Bild / Logo hinzufügen"
            class="w-full min-h-[44px] aspect-square bg-neutral-800 hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-colors font-bold text-xl touch-manipulation cursor-pointer active:scale-95"
        >
            🖼️
        </button>
    </div>
    
    <!-- Seiten-Umschalter -->
    <div class="flex flex-col gap-3 w-full px-2">
        <button
            type="button"
            onclick={() => onSelectSheet(0)}
            title="Außenseite (Bogen 1)"
            class="w-full min-h-[44px] aspect-square rounded-xl flex flex-col items-center justify-center transition-colors font-bold text-xs touch-manipulation cursor-pointer active:scale-95 {activeSheetIndex === 0 ? 'bg-indigo-600 text-white shadow-inner' : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'}"
        >
            S. 1
        </button>
        <button
            type="button"
            onclick={() => onSelectSheet(1)}
            title="Innenseite (Bogen 2)"
            class="w-full min-h-[44px] aspect-square rounded-xl flex flex-col items-center justify-center transition-colors font-bold text-xs touch-manipulation cursor-pointer active:scale-95 {activeSheetIndex === 1 ? 'bg-indigo-600 text-white shadow-inner' : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'}"
        >
            S. 2
        </button>
    </div>

    <!-- Export & Aktionen -->
    <div class="mt-auto flex flex-col gap-3 w-full px-2">
        <button
            type="button"
            onclick={onToggleFullscreen}
            title={isFullscreen ? 'Fenster-Modus' : 'Vollbild-Modus'}
            class="w-full min-h-[44px] aspect-square bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl flex items-center justify-center transition-colors touch-manipulation cursor-pointer active:scale-95"
        >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d={isFullscreen ? "M6 18L18 6M6 6l12 12" : "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"} />
            </svg>
        </button>
        <button
            type="button"
            onclick={onOpenPreview}
            disabled={isLoadingPreview}
            title="PDF-Druckvorschau öffnen"
            class="w-full min-h-[44px] aspect-square bg-sky-600 hover:bg-sky-500 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg touch-manipulation cursor-pointer active:scale-95 {isLoadingPreview ? 'opacity-50 cursor-wait' : ''}"
        >
            {#if isLoadingPreview}
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            {:else}
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            {/if}
        </button>
        <button
            type="button"
            onclick={onDownloadPdf}
            disabled={isDownloadingPdf}
            title="Als echte PDF-Datei herunterladen"
            class="w-full min-h-[44px] aspect-square bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg touch-manipulation cursor-pointer active:scale-95 {isDownloadingPdf ? 'opacity-50 cursor-wait' : ''}"
        >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
        </button>
        <button
            type="button"
            onclick={onPrint}
            title="Druckansicht / Drucken"
            class="w-full min-h-[44px] aspect-square bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg touch-manipulation cursor-pointer active:scale-95"
        >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
        </button>
        <button
            type="button"
            onclick={onReset}
            title="Flyer auf Standard zurücksetzen"
            class="w-full min-h-[44px] aspect-square bg-rose-600 hover:bg-rose-500 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg mt-2 touch-manipulation cursor-pointer active:scale-95"
        >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        </button>
    </div>
</div>
