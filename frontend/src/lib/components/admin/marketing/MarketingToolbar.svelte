<script lang="ts">
    import { Sparkles, Eye, Download } from 'lucide-svelte';
    import type { MarketingFormat, TargetAudience } from './marketingDefaults';

    interface Props {
        activeFormat: MarketingFormat;
        targetAudience: TargetAudience;
        isGenerating: boolean;
        isLoadingPreview: boolean;
        isDownloadingPdf: boolean;
        lastAiCacheHit: boolean | null;
        onSelectAudience: (aud: TargetAudience) => void;
        onTriggerAi: () => void;
        onOpenPreview: () => void;
        onDownloadPdf: () => void;
    }

    let {
        activeFormat,
        targetAudience,
        isGenerating,
        isLoadingPreview,
        isDownloadingPdf,
        lastAiCacheHit,
        onSelectAudience,
        onTriggerAi,
        onOpenPreview,
        onDownloadPdf
    }: Props = $props();

    const AUDIENCES: TargetAudience[] = ['Angehörige', 'Senioren', 'Ärzte', 'Allgemein'];
</script>

<div class="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
    <div>
        <h2 class="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <span>🎨</span> Werbemittel- & Marketing-Studio
        </h2>
        <p class="text-xs text-neutral-500">6 Formate für Druck & Social Media mit KI-Unterstützung und echtem Vektor-PDF-Export</p>
    </div>

    <div class="flex items-center gap-2.5 flex-wrap">
        <!-- Zielgruppen-Auswahl -->
        <div class="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200" title="Zielgruppe für die KI-Generierung">
            <span class="text-[10px] font-bold text-neutral-400 uppercase px-2 hidden sm:inline">Ziel:</span>
            {#each AUDIENCES as aud}
                <button 
                    type="button"
                    onclick={() => onSelectAudience(aud)}
                    class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all min-h-[32px] cursor-pointer touch-manipulation {targetAudience === aud ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-neutral-500 hover:text-neutral-700'}"
                >
                    {aud}
                </button>
            {/each}
        </div>

        {#if activeFormat !== 'flyer'}
            <div class="flex items-center gap-1">
                <button 
                    type="button" 
                    onclick={onTriggerAi}
                    class="orga-button-ghost text-xs py-2 px-3 flex items-center gap-1.5 border border-neutral-200 min-h-[40px] cursor-pointer touch-manipulation active:scale-95"
                    disabled={isGenerating}
                    title="Mit KI anpassen (nutzt Cache falls unverändert)"
                >
                    <Sparkles class="w-3.5 h-3.5 text-amber-500" />
                    <span>{isGenerating ? 'Generiert...' : 'Mit KI anpassen'}</span>
                </button>
                {#if lastAiCacheHit !== null}
                    <span class="text-[10px] font-bold px-2 py-1 rounded-md {lastAiCacheHit ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                        {lastAiCacheHit ? '⚡ Cache' : '✨ Neu'}
                    </span>
                {/if}
            </div>
        {/if}

        {#if activeFormat !== 'social_sheet'}
            <button 
                type="button" 
                onclick={onOpenPreview} 
                class="orga-button-primary text-xs py-2.5 px-4 flex items-center gap-1.5 shadow-brand-600/20 min-h-[40px] cursor-pointer touch-manipulation active:scale-95"
                disabled={isLoadingPreview}
                title="PDF-Druckvorschau im Fenster öffnen"
            >
                {#if isLoadingPreview}
                    <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Erstelle Vorschau...</span>
                {:else}
                    <Eye class="w-4 h-4" />
                    <span>Vorschau & Drucken</span>
                {/if}
            </button>

            <button 
                type="button" 
                onclick={onDownloadPdf} 
                class="orga-button-ghost text-xs py-2.5 px-4 flex items-center gap-1.5 border border-neutral-300 hover:bg-neutral-100 min-h-[40px] cursor-pointer touch-manipulation active:scale-95 {isDownloadingPdf ? 'opacity-50 cursor-wait' : ''}"
                disabled={isDownloadingPdf}
                title="Als echte druckfertige Vektor-PDF herunterladen"
            >
                <Download class="w-4 h-4 text-indigo-600" />
                <span>{isDownloadingPdf ? 'Erstelle PDF...' : 'PDF herunterladen'}</span>
            </button>
        {/if}
    </div>
</div>
