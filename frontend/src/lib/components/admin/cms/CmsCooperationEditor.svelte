<script lang="ts">
    import { landingCmsStore, type CmsScenarioItem } from '$lib/services/landingCmsStore.svelte';
    import { Plus, Trash2, ArrowUp, ArrowDown, X, ShieldAlert } from 'lucide-svelte';

    let coop = $derived(landingCmsStore.content.cooperation);

    let newBadge = $state('');

    function addBadge() {
        if (!newBadge.trim()) return;
        if (!coop.partner_badges) coop.partner_badges = [];
        coop.partner_badges.push(newBadge.trim());
        newBadge = '';
    }

    function removeBadge(index: number) {
        coop.partner_badges.splice(index, 1);
    }

    function addScenario() {
        if (!coop.scenarios) coop.scenarios = [];
        coop.scenarios.push({
            id: String(Date.now()),
            tag: 'Zusammenarbeit',
            title: 'Neue Kooperations-Situation',
            text: 'Beschreiben Sie hier, wie Angehörige und Betreuer durch diese Form der Zusammenarbeit entlastet werden.'
        });
    }

    function removeScenario(index: number) {
        if (confirm('Dieses Kooperations-Szenario entfernen?')) {
            coop.scenarios.splice(index, 1);
        }
    }

    function moveScenario(index: number, direction: 'up' | 'down') {
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= coop.scenarios.length) return;
        const item = coop.scenarios.splice(index, 1)[0];
        coop.scenarios.splice(target, 0, item);
    }
</script>

<div class="space-y-6">
    <div class="pb-3 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between">
        <div>
            <h3 class="font-bold text-neutral-900 dark:text-white text-base">Kassen & Kooperation</h3>
            <p class="text-xs text-neutral-500 dark:text-slate-400">Verwalten Sie Partnerkassen (§ 45b SGB XI) und Szenarien für Angehörige & Betreuer</p>
        </div>
        <span class="text-xl">💶</span>
    </div>

    <!-- Sektions-Header -->
    <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="cms-coop-head" class="block text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-1">
                    Bereichs-Überschrift
                </label>
                <input id="cms-coop-head" type="text" bind:value={coop.headline} class="orga-input-clear min-h-[44px] w-full" />
            </div>
            <div>
                <label for="cms-coop-sub" class="block text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-1">
                    Bereichs-Untertitel
                </label>
                <input id="cms-coop-sub" type="text" bind:value={coop.subtitle} class="orga-input-clear min-h-[44px] w-full" />
            </div>
        </div>

        <div>
            <label for="cms-coop-text" class="block text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-1">
                Ausführlicher Kassen-Erklärungstext (SGB XI, Abtretungserklärung etc.)
            </label>
            <textarea id="cms-coop-text" rows="3" bind:value={coop.text} class="orga-input-clear w-full text-xs leading-relaxed"></textarea>
        </div>
    </div>

    <!-- Partnerkassen Badges -->
    <div class="p-4 bg-neutral-50 dark:bg-slate-900/60 rounded-xl border border-neutral-200 dark:border-slate-800 space-y-3">
        <h4 class="text-xs font-bold text-neutral-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
            <span>🏷️</span>
            <span>Partnerkassen & Anerkannte Kassen ({coop.partner_badges?.length || 0})</span>
        </h4>
        
        <div class="flex flex-wrap gap-2">
            {#each (coop.partner_badges || []) as badge, idx}
                <span class="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 text-neutral-800 dark:text-slate-200 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xs">
                    <span>{badge}</span>
                    <button type="button" onclick={() => removeBadge(idx)} class="text-neutral-400 hover:text-rose-500 cursor-pointer">
                        <X class="w-3.5 h-3.5" />
                    </button>
                </span>
            {/each}
        </div>

        <div class="flex gap-2 pt-2">
            <input 
                type="text" 
                bind:value={newBadge} 
                onkeydown={(e) => e.key === 'Enter' && addBadge()}
                placeholder="Kassenname hinzufügen (z. B. AOK PLUS, Barmer)..." 
                class="orga-input-clear flex-1 min-h-[40px] text-xs" 
            />
            <button 
                type="button" 
                onclick={addBadge} 
                class="orga-button-primary text-xs py-2 px-3 min-h-[40px] flex items-center gap-1 cursor-pointer"
            >
                <Plus class="w-3.5 h-3.5" />
                <span>Hinzufügen</span>
            </button>
        </div>
    </div>

    <!-- Kooperations-Szenarien -->
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-neutral-700 dark:text-slate-300 uppercase">
                Kooperations-Szenarien ({coop.scenarios?.length || 0})
            </span>
            <button 
                type="button" 
                onclick={addScenario} 
                class="orga-button-primary text-xs py-2 px-3.5 flex items-center gap-1.5 min-h-[40px] cursor-pointer"
            >
                <Plus class="w-4 h-4" />
                <span>Szenario hinzufügen</span>
            </button>
        </div>

        {#each (coop.scenarios || []) as item, idx}
            <div class="p-4 bg-neutral-50 dark:bg-slate-900/60 rounded-xl border border-neutral-200 dark:border-slate-800 space-y-3 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-bold text-neutral-400 dark:text-slate-500">Szenario {idx + 1}</span>
                    <div class="flex items-center gap-1">
                        <button 
                            type="button" 
                            onclick={() => moveScenario(idx, 'up')} 
                            disabled={idx === 0}
                            class="p-1.5 text-neutral-500 hover:text-indigo-600 disabled:opacity-30 rounded cursor-pointer"
                            title="Nach oben"
                        >
                            <ArrowUp class="w-3.5 h-3.5" />
                        </button>
                        <button 
                            type="button" 
                            onclick={() => moveScenario(idx, 'down')} 
                            disabled={idx === coop.scenarios.length - 1}
                            class="p-1.5 text-neutral-500 hover:text-indigo-600 disabled:opacity-30 rounded cursor-pointer"
                            title="Nach unten"
                        >
                            <ArrowDown class="w-3.5 h-3.5" />
                        </button>
                        <button 
                            type="button" 
                            onclick={() => removeScenario(idx)} 
                            class="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer ml-1"
                            title="Szenario entfernen"
                        >
                            <Trash2 class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label for="cms-scen-tag-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">Kategorie / Tag</label>
                        <input id="cms-scen-tag-{idx}" type="text" bind:value={item.tag} class="font-bold text-xs bg-white dark:bg-slate-800 border rounded-lg px-2.5 py-1.5 w-full min-h-[44px] text-neutral-900 dark:text-white" placeholder="z. B. Clever vorsorgen" />
                    </div>
                    <div class="sm:col-span-2">
                        <label for="cms-scen-title-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">Überschrift</label>
                        <input id="cms-scen-title-{idx}" type="text" bind:value={item.title} class="font-bold text-xs bg-white dark:bg-slate-800 border rounded-lg px-2.5 py-1.5 w-full min-h-[44px] text-neutral-900 dark:text-white" placeholder="z. B. Hilfe, bevor es stressig wird" />
                    </div>
                </div>

                <div>
                    <label for="cms-scen-text-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">Beschreibung</label>
                    <textarea id="cms-scen-text-{idx}" rows="2" bind:value={item.text} class="w-full text-xs bg-white dark:bg-slate-800 border rounded-lg p-2.5 text-neutral-900 dark:text-white leading-relaxed"></textarea>
                </div>
            </div>
        {/each}
    </div>
</div>
