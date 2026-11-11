<script lang="ts">
    import { landingCmsStore, type CmsServiceItem } from '$lib/services/landingCmsStore.svelte';
    import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-svelte';

    let services = $derived(landingCmsStore.content.services);

    const iconPresets = ['🤝', '📑', '🏡', '💶', '🚗', '⏱️', '🩺', '🛒', '👵', '💬'];

    function addService() {
        const newId = String(Date.now());
        services.items.push({
            id: newId,
            icon: '🤝',
            title: 'Neuer Leistungsbaustein',
            desc: 'Beschreiben Sie hier die konkrete Unterstützung für Klienten und Angehörige.'
        });
    }

    function removeService(index: number) {
        if (confirm('Möchten Sie diese Leistung wirklich aus der Liste entfernen?')) {
            services.items.splice(index, 1);
        }
    }

    function moveService(index: number, direction: 'up' | 'down') {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= services.items.length) return;
        const item = services.items.splice(index, 1)[0];
        services.items.splice(targetIndex, 0, item);
    }
</script>

<div class="space-y-6">
    <div class="pb-3 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between">
        <div>
            <h3 class="font-bold text-neutral-900 dark:text-white text-base">Leistungsbausteine</h3>
            <p class="text-xs text-neutral-500 dark:text-slate-400">Verwalten Sie Ihre angebotenen Hilfsleistungen flexibel und dynamisch</p>
        </div>
        <span class="text-xl">🛠️</span>
    </div>

    <!-- Sektions-Header -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label for="cms-services-head" class="block text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-1">
                Bereichs-Überschrift
            </label>
            <input 
                id="cms-services-head" 
                type="text" 
                bind:value={services.headline} 
                class="orga-input-clear min-h-[44px] w-full" 
            />
        </div>
        <div>
            <label for="cms-services-sub" class="block text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-1">
                Bereichs-Untertitel
            </label>
            <input 
                id="cms-services-sub" 
                type="text" 
                bind:value={services.subtitle} 
                class="orga-input-clear min-h-[44px] w-full" 
            />
        </div>
    </div>

    <!-- Leistungs-Karten Liste -->
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-neutral-700 dark:text-slate-300 uppercase">
                Aktive Leistungen ({services.items.length})
            </span>
            <button 
                type="button" 
                onclick={addService} 
                class="orga-button-primary text-xs py-2 px-3.5 flex items-center gap-1.5 min-h-[40px] cursor-pointer"
            >
                <Plus class="w-4 h-4" />
                <span>Neue Leistung hinzufügen</span>
            </button>
        </div>

        {#each services.items as item, idx}
            <div class="p-4 bg-neutral-50 dark:bg-slate-900/60 rounded-xl border border-neutral-200 dark:border-slate-800 space-y-3 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-bold text-neutral-400 dark:text-slate-500">#{idx + 1}</span>
                    <div class="flex items-center gap-1">
                        <button 
                            type="button" 
                            onclick={() => moveService(idx, 'up')} 
                            disabled={idx === 0}
                            class="p-1.5 text-neutral-500 hover:text-indigo-600 disabled:opacity-30 rounded cursor-pointer"
                            title="Nach oben verschieben"
                        >
                            <ArrowUp class="w-3.5 h-3.5" />
                        </button>
                        <button 
                            type="button" 
                            onclick={() => moveService(idx, 'down')} 
                            disabled={idx === services.items.length - 1}
                            class="p-1.5 text-neutral-500 hover:text-indigo-600 disabled:opacity-30 rounded cursor-pointer"
                            title="Nach unten verschieben"
                        >
                            <ArrowDown class="w-3.5 h-3.5" />
                        </button>
                        <button 
                            type="button" 
                            onclick={() => removeService(idx)} 
                            class="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer ml-1"
                            title="Leistung entfernen"
                        >
                            <Trash2 class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <input 
                        type="text" 
                        bind:value={item.icon} 
                        class="w-14 text-center text-xl bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-lg p-1.5 min-h-[44px] text-neutral-900 dark:text-white" 
                        title="Emoji oder Symbol"
                        aria-label="Symbol für Leistung {idx + 1}"
                    />
                    <input 
                        type="text" 
                        bind:value={item.title} 
                        class="font-bold text-sm bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-lg px-3 py-2 w-full min-h-[44px] text-neutral-900 dark:text-white" 
                        placeholder="Titel der Leistung" 
                        aria-label="Titel der Leistung {idx + 1}"
                    />
                </div>

                <!-- Schnellauswahl Icon-Presets -->
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[10px] text-neutral-400 font-medium mr-1">Symbol-Vorschlag:</span>
                    {#each iconPresets as ico}
                        <button 
                            type="button" 
                            onclick={() => item.icon = ico} 
                            class="text-xs p-1 rounded hover:bg-neutral-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                            {ico}
                        </button>
                    {/each}
                </div>

                <div>
                    <label for="cms-service-desc-{idx}" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400 mb-1">
                        Leistungsbeschreibung
                    </label>
                    <textarea 
                        id="cms-service-desc-{idx}"
                        rows="3" 
                        bind:value={item.desc} 
                        class="w-full text-xs bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-lg p-2.5 text-neutral-900 dark:text-white leading-relaxed" 
                        placeholder="Detaillierte Beschreibung der Tätigkeit..."
                    ></textarea>
                </div>
            </div>
        {/each}
    </div>
</div>
