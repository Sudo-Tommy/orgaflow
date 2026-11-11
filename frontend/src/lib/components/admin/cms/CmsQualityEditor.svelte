<script lang="ts">
    import { landingCmsStore, type CmsQualityFeature } from '$lib/services/landingCmsStore.svelte';
    import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-svelte';

    let quality = $derived(landingCmsStore.content.quality);

    function addFeature() {
        if (!quality.features) quality.features = [];
        quality.features.push({
            id: String(Date.now()),
            title: 'Neues Qualitätsmerkmal',
            text: 'Beschreiben Sie ein konkretes Vertrauensmerkmal (z. B. Datenschutz, Verlässlichkeit, Versicherung).'
        });
    }

    function removeFeature(index: number) {
        if (confirm('Dieses Qualitätsmerkmal wirklich entfernen?')) {
            quality.features.splice(index, 1);
        }
    }

    function moveFeature(index: number, direction: 'up' | 'down') {
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= quality.features.length) return;
        const item = quality.features.splice(index, 1)[0];
        quality.features.splice(target, 0, item);
    }
</script>

<div class="space-y-6">
    <div class="pb-3 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between">
        <div>
            <h3 class="font-bold text-neutral-900 dark:text-white text-base">Qualität & Vertrauen</h3>
            <p class="text-xs text-neutral-500 dark:text-slate-400">Heben Sie Ihre Seriosität, Datensicherheit und Qualitätsstandards hervor</p>
        </div>
        <span class="text-xl">🛡️</span>
    </div>

    <!-- Sektions-Header -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label for="cms-qual-head" class="block text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-1">
                Bereichs-Überschrift
            </label>
            <input id="cms-qual-head" type="text" bind:value={quality.headline} class="orga-input-clear min-h-[44px] w-full" />
        </div>
        <div>
            <label for="cms-qual-sub" class="block text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-1">
                Bereichs-Untertitel
            </label>
            <input id="cms-qual-sub" type="text" bind:value={quality.subtitle} class="orga-input-clear min-h-[44px] w-full" />
        </div>
    </div>

    <!-- Qualitätsmerkmale Liste -->
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-neutral-700 dark:text-slate-300 uppercase">
                Merkmale ({quality.features?.length || 0})
            </span>
            <button 
                type="button" 
                onclick={addFeature} 
                class="orga-button-primary text-xs py-2 px-3.5 flex items-center gap-1.5 min-h-[40px] cursor-pointer"
            >
                <Plus class="w-4 h-4" />
                <span>Merkmal hinzufügen</span>
            </button>
        </div>

        {#each (quality.features || []) as item, idx}
            <div class="p-4 bg-neutral-50 dark:bg-slate-900/60 rounded-xl border border-neutral-200 dark:border-slate-800 space-y-3 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-bold text-neutral-400 dark:text-slate-500">Merkmal {idx + 1}</span>
                    <div class="flex items-center gap-1">
                        <button 
                            type="button" 
                            onclick={() => moveFeature(idx, 'up')} 
                            disabled={idx === 0}
                            class="p-1.5 text-neutral-500 hover:text-indigo-600 disabled:opacity-30 rounded cursor-pointer"
                            title="Nach oben"
                        >
                            <ArrowUp class="w-3.5 h-3.5" />
                        </button>
                        <button 
                            type="button" 
                            onclick={() => moveFeature(idx, 'down')} 
                            disabled={idx === quality.features.length - 1}
                            class="p-1.5 text-neutral-500 hover:text-indigo-600 disabled:opacity-30 rounded cursor-pointer"
                            title="Nach unten"
                        >
                            <ArrowDown class="w-3.5 h-3.5" />
                        </button>
                        <button 
                            type="button" 
                            onclick={() => removeFeature(idx)} 
                            class="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer ml-1"
                            title="Merkmal entfernen"
                        >
                            <Trash2 class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div>
                    <label for="cms-qual-title-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">
                        Überschrift des Merkmals
                    </label>
                    <input 
                        id="cms-qual-title-{idx}"
                        type="text" 
                        bind:value={item.title} 
                        class="font-bold text-xs bg-white dark:bg-slate-800 border rounded-lg px-2.5 py-1.5 w-full min-h-[44px] text-neutral-900 dark:text-white" 
                        placeholder="z. B. Verschwiegen wie ein Tresor" 
                    />
                </div>

                <div>
                    <label for="cms-qual-text-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">
                        Beschreibung & Erklärung
                    </label>
                    <textarea 
                        id="cms-qual-text-{idx}"
                        rows="3" 
                        bind:value={item.text} 
                        class="w-full text-xs bg-white dark:bg-slate-800 border rounded-lg p-2.5 text-neutral-900 dark:text-white leading-relaxed" 
                        placeholder="Detaillierte Erläuterung für Klienten..."
                    ></textarea>
                </div>
            </div>
        {/each}
    </div>
</div>
