<script lang="ts">
    import { landingCmsStore, type CmsProcessStep } from '$lib/services/landingCmsStore.svelte';
    import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-svelte';

    let process = $derived(landingCmsStore.content.process);

    function addStep() {
        const nextNum = process.steps.length + 1;
        process.steps.push({
            id: String(Date.now()),
            step: `${nextNum}. Schritt`,
            title: 'Neuer Ablaufschritt',
            text: 'Beschreiben Sie hier, wie dieser Schritt im Detail für Klienten abläuft.'
        });
    }

    function removeStep(index: number) {
        if (confirm('Diesen Schritt wirklich entfernen?')) {
            process.steps.splice(index, 1);
        }
    }

    function moveStep(index: number, direction: 'up' | 'down') {
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= process.steps.length) return;
        const item = process.steps.splice(index, 1)[0];
        process.steps.splice(target, 0, item);
    }
</script>

<div class="space-y-6">
    <div class="pb-3 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between">
        <div>
            <h3 class="font-bold text-neutral-900 dark:text-white text-base">Ablauf & Unser Weg</h3>
            <p class="text-xs text-neutral-500 dark:text-slate-400">Veranschaulichen Sie Interessenten den typischen Weg der Zusammenarbeit in verständlichen Schritten</p>
        </div>
        <span class="text-xl">👣</span>
    </div>

    <!-- Sektions-Header -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label for="cms-process-head" class="block text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-1">
                Bereichs-Überschrift
            </label>
            <input 
                id="cms-process-head" 
                type="text" 
                bind:value={process.headline} 
                class="orga-input-clear min-h-[44px] w-full" 
            />
        </div>
        <div>
            <label for="cms-process-sub" class="block text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-1">
                Bereichs-Untertitel
            </label>
            <input 
                id="cms-process-sub" 
                type="text" 
                bind:value={process.subtitle} 
                class="orga-input-clear min-h-[44px] w-full" 
            />
        </div>
    </div>

    <!-- Schritte Liste -->
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-neutral-700 dark:text-slate-300 uppercase">
                Ablaufschritte ({process.steps.length})
            </span>
            <button 
                type="button" 
                onclick={addStep} 
                class="orga-button-primary text-xs py-2 px-3.5 flex items-center gap-1.5 min-h-[40px] cursor-pointer"
            >
                <Plus class="w-4 h-4" />
                <span>Schritt hinzufügen</span>
            </button>
        </div>

        {#each process.steps as item, idx}
            <div class="p-4 bg-neutral-50 dark:bg-slate-900/60 rounded-xl border border-neutral-200 dark:border-slate-800 space-y-3 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-bold text-neutral-400 dark:text-slate-500">Schritt {idx + 1}</span>
                    <div class="flex items-center gap-1">
                        <button 
                            type="button" 
                            onclick={() => moveStep(idx, 'up')} 
                            disabled={idx === 0}
                            class="p-1.5 text-neutral-500 hover:text-indigo-600 disabled:opacity-30 rounded cursor-pointer"
                            title="Nach oben"
                        >
                            <ArrowUp class="w-3.5 h-3.5" />
                        </button>
                        <button 
                            type="button" 
                            onclick={() => moveStep(idx, 'down')} 
                            disabled={idx === process.steps.length - 1}
                            class="p-1.5 text-neutral-500 hover:text-indigo-600 disabled:opacity-30 rounded cursor-pointer"
                            title="Nach unten"
                        >
                            <ArrowDown class="w-3.5 h-3.5" />
                        </button>
                        <button 
                            type="button" 
                            onclick={() => removeStep(idx)} 
                            class="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer ml-1"
                            title="Schritt entfernen"
                        >
                            <Trash2 class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label for="cms-step-badge-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">
                            Schritt-Kürzel
                        </label>
                        <input 
                            id="cms-step-badge-{idx}"
                            type="text" 
                            bind:value={item.step} 
                            class="font-bold text-xs bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 w-full min-h-[44px] text-neutral-900 dark:text-white" 
                            placeholder="z. B. 1. Tasse Kaffee" 
                        />
                    </div>
                    <div class="sm:col-span-2">
                        <label for="cms-step-title-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">
                            Schritt-Titel
                        </label>
                        <input 
                            id="cms-step-title-{idx}"
                            type="text" 
                            bind:value={item.title} 
                            class="font-bold text-xs bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 w-full min-h-[44px] text-neutral-900 dark:text-white" 
                            placeholder="z. B. Unverbindliches Kennenlernen" 
                        />
                    </div>
                </div>

                <div>
                    <label for="cms-step-desc-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">
                        Erklärung des Ablaufs
                    </label>
                    <textarea 
                        id="cms-step-desc-{idx}"
                        rows="3" 
                        bind:value={item.text} 
                        class="w-full text-xs bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-lg p-2.5 text-neutral-900 dark:text-white leading-relaxed" 
                        placeholder="Erklären Sie verständlich, wie Sie vorgehen..."
                    ></textarea>
                </div>
            </div>
        {/each}
    </div>
</div>
