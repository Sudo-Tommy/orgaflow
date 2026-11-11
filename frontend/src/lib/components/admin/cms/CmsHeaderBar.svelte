<script lang="ts">
    import { landingCmsStore, type CmsData } from '$lib/services/landingCmsStore.svelte';
    import { RefreshCw, Eye, Save } from 'lucide-svelte';

    interface Props {
        activeSection: keyof CmsData;
        showLivePreview: boolean;
        onTogglePreview: () => void;
        onSaveSection: (key: keyof CmsData) => void;
    }

    let { activeSection, showLivePreview, onTogglePreview, onSaveSection }: Props = $props();
</script>

<div class="space-y-4">
    <!-- Header Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
            <h2 class="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <span>🌐</span> Landing-Page CMS
            </h2>
            <p class="text-xs text-neutral-500 dark:text-slate-400">Zentrale Verwaltung der Texte für Website, Werbemittel und KI-Generierung</p>
        </div>
        
        <div class="flex items-center gap-3 flex-wrap">
            <button 
                type="button" 
                onclick={() => landingCmsStore.load()} 
                class="orga-button-ghost text-xs py-2 px-3 flex items-center gap-1.5 min-h-[44px] cursor-pointer"
                disabled={landingCmsStore.isLoading || landingCmsStore.isSaving}
                title="Aktuelle Inhalte aus PocketBase neu laden"
            >
                <RefreshCw class="w-3.5 h-3.5 {landingCmsStore.isLoading ? 'animate-spin' : ''}" />
                <span>Neu laden</span>
            </button>

            <button 
                type="button" 
                onclick={onTogglePreview} 
                class="orga-button-ghost text-xs py-2 px-3.5 flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 min-h-[44px] cursor-pointer"
                title="Sofortige Vorschau der aktiven Sektion anzeigen"
            >
                <Eye class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{showLivePreview ? 'Vorschau schließen' : 'Live-Vorschau'}</span>
            </button>

            <button 
                type="button" 
                onclick={() => landingCmsStore.saveAll()} 
                class="orga-button-primary text-xs py-2.5 px-5 flex items-center gap-1.5 shadow-brand-600/20 min-h-[44px] cursor-pointer"
                disabled={landingCmsStore.isSaving}
            >
                <Save class="w-4 h-4" />
                <span>{landingCmsStore.isSaving ? "Speichert..." : "Alle Sektionen speichern"}</span>
            </button>
        </div>
    </div>

    <!-- Section Control & Status Bar -->
    <div class="bg-neutral-50 dark:bg-slate-900/60 p-4 rounded-xl border border-neutral-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="flex items-center gap-4 flex-wrap">
            <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700 dark:text-slate-300 select-none">
                <input 
                    type="checkbox" 
                    bind:checked={landingCmsStore.meta[activeSection].is_active}
                    class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" 
                />
                <span>Auf Landing-Page anzeigen (Aktiv)</span>
            </label>

            <div class="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-slate-400 font-medium">
                <label for="cms-section-order" class="font-bold">Reihenfolge:</label>
                <input 
                    id="cms-section-order"
                    type="number" 
                    bind:value={landingCmsStore.meta[activeSection].order} 
                    min="1" 
                    max="10" 
                    class="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-lg text-xs font-bold text-center text-neutral-900 dark:text-white" 
                />
            </div>
        </div>

        <button 
            type="button" 
            onclick={() => onSaveSection(activeSection)} 
            class="orga-button-primary text-xs py-2 px-4 shadow-sm min-h-[44px] cursor-pointer"
            disabled={landingCmsStore.isSaving}
        >
            <Save class="w-3.5 h-3.5 mr-1" />
            <span>Bereich "{landingCmsStore.meta[activeSection]?.title || activeSection.toUpperCase()}" speichern</span>
        </button>
    </div>
</div>
