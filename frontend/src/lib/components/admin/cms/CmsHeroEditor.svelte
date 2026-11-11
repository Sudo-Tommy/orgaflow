<script lang="ts">
    import { landingCmsStore } from '$lib/services/landingCmsStore.svelte';
    import { Plus, Trash2, ShieldCheck, Sparkles } from 'lucide-svelte';

    let hero = $derived(landingCmsStore.content.hero);

    let newTrustPoint = $state('');

    function addTrustPoint() {
        if (!newTrustPoint.trim()) return;
        if (!hero.trust_points) hero.trust_points = [];
        hero.trust_points.push(newTrustPoint.trim());
        newTrustPoint = '';
    }

    function removeTrustPoint(index: number) {
        hero.trust_points.splice(index, 1);
    }
</script>

<div class="space-y-6">
    <div class="pb-3 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between">
        <div>
            <h3 class="font-bold text-neutral-900 dark:text-white text-base">Hero-Bereich & Startansicht</h3>
            <p class="text-xs text-neutral-500 dark:text-slate-400">Erster Eindruck der Besucher: Hauptbotschaft, Buttons und Vertrauenssignale</p>
        </div>
        <span class="text-xl">🚀</span>
    </div>

    <!-- H1 & Untertitel -->
    <div class="space-y-4">
        <div>
            <label for="cms-hero-title" class="block text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-1">
                Hauptüberschrift (H1)
            </label>
            <input 
                id="cms-hero-title" 
                type="text" 
                bind:value={hero.title} 
                class="orga-input-clear min-h-[44px] w-full" 
                placeholder="z. B. Zuhause wohlfühlen. Selbstbestimmt leben."
            />
        </div>

        <div>
            <label for="cms-hero-subtitle" class="block text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-1">
                Untertitel / Einleitungstext
            </label>
            <textarea 
                id="cms-hero-subtitle" 
                rows="3" 
                bind:value={hero.subtitle} 
                class="orga-input-clear w-full leading-relaxed" 
                placeholder="Ausführlicher Einleitungstext für Interessenten..."
            ></textarea>
        </div>

        <div>
            <label for="cms-hero-badge" class="block text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-1">
                Vertrauens-Badge (oberhalb von H1)
            </label>
            <input 
                id="cms-hero-badge" 
                type="text" 
                bind:value={hero.badge} 
                class="orga-input-clear min-h-[44px] w-full" 
                placeholder="z. B. Anerkannter Partner aller Pflegekassen nach § 45b SGB XI"
            />
        </div>
    </div>

    <!-- Aktions-Buttons -->
    <div class="p-4 bg-neutral-50 dark:bg-slate-900/50 rounded-xl border border-neutral-200 dark:border-slate-800 space-y-3">
        <h4 class="text-xs font-bold text-neutral-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
            <Sparkles class="w-3.5 h-3.5 text-amber-500" />
            <span>Hauptaktions-Buttons (Call to Action)</span>
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
                <label for="cms-hero-cta1-text" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400">Button 1 Text (Primär)</label>
                <input id="cms-hero-cta1-text" type="text" bind:value={hero.cta_primary} class="orga-input-clear min-h-[44px] w-full" />
                <label for="cms-hero-cta1-link" class="block text-[11px] font-medium text-neutral-500 dark:text-slate-400">Button 1 Ziel / Verlinkung</label>
                <input id="cms-hero-cta1-link" type="text" bind:value={hero.cta_primary_link} class="orga-input-clear min-h-[40px] text-xs w-full" placeholder="#terminanfrage" />
            </div>

            <div class="space-y-2">
                <label for="cms-hero-cta2-text" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400">Button 2 Text (Sekundär)</label>
                <input id="cms-hero-cta2-text" type="text" bind:value={hero.cta_secondary} class="orga-input-clear min-h-[44px] w-full" />
                <label for="cms-hero-cta2-link" class="block text-[11px] font-medium text-neutral-500 dark:text-slate-400">Button 2 Ziel / Verlinkung</label>
                <input id="cms-hero-cta2-link" type="text" bind:value={hero.cta_secondary_link} class="orga-input-clear min-h-[40px] text-xs w-full" placeholder="#leistungen" />
            </div>
        </div>
    </div>

    <!-- Vertrauens-Punkte mit Häkchen -->
    <div class="p-4 bg-neutral-50 dark:bg-slate-900/50 rounded-xl border border-neutral-200 dark:border-slate-800 space-y-3">
        <h4 class="text-xs font-bold text-neutral-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
            <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" />
            <span>Vertrauens-Vorteile (mit grünem Häkchen unter den Buttons)</span>
        </h4>
        <div class="space-y-2">
            {#each (hero.trust_points || []) as point, idx}
                <div class="flex items-center gap-2">
                    <span class="text-emerald-500 font-bold">✓</span>
                    <input 
                        type="text" 
                        bind:value={hero.trust_points[idx]} 
                        class="orga-input-clear flex-1 min-h-[40px] text-xs" 
                        aria-label="Vertrauenspunkt {idx + 1}"
                    />
                    <button 
                        type="button" 
                        onclick={() => removeTrustPoint(idx)} 
                        class="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg min-h-[40px] cursor-pointer"
                        title="Vorteil entfernen"
                    >
                        <Trash2 class="w-4 h-4" />
                    </button>
                </div>
            {/each}

            <div class="flex gap-2 pt-2">
                <input 
                    type="text" 
                    bind:value={newTrustPoint} 
                    onkeydown={(e) => e.key === 'Enter' && addTrustPoint()}
                    placeholder="Neuen Vorteil hinzufügen (z. B. Flexible Termine)..." 
                    class="orga-input-clear flex-1 min-h-[40px] text-xs" 
                />
                <button 
                    type="button" 
                    onclick={addTrustPoint} 
                    class="orga-button-primary text-xs py-2 px-3 min-h-[40px] flex items-center gap-1 cursor-pointer"
                >
                    <Plus class="w-3.5 h-3.5" />
                    <span>Hinzufügen</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Eyecatcher-Kasten: Kostenübernahme -->
    <div class="p-4 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/40 space-y-3">
        <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase flex items-center gap-1.5">
                <span>💡</span>
                <span>Eyecatcher-Box: Pflegekassen-Hinweis</span>
            </h4>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div class="sm:col-span-1">
                <label for="cms-hero-eye-icon" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400">Icon / Emoji</label>
                <input id="cms-hero-eye-icon" type="text" bind:value={hero.eyecatcher_badge} class="orga-input-clear min-h-[44px] text-center text-lg w-full" />
            </div>
            <div class="sm:col-span-3">
                <label for="cms-hero-eye-title" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400">Überschrift</label>
                <input id="cms-hero-eye-title" type="text" bind:value={hero.eyecatcher_title} class="orga-input-clear min-h-[44px] font-bold w-full" />
            </div>
        </div>
        <div>
            <label for="cms-hero-eye-text" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400">Erklärungstext (131 € Entlastungsbetrag & Verhinderungspflege)</label>
            <textarea id="cms-hero-eye-text" rows="3" bind:value={hero.eyecatcher_text} class="orga-input-clear w-full text-xs"></textarea>
        </div>
        <div>
            <label for="cms-hero-eye-btn" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400">Button-Beschriftung</label>
            <input id="cms-hero-eye-btn" type="text" bind:value={hero.eyecatcher_button} class="orga-input-clear min-h-[40px] text-xs w-full max-w-xs" />
        </div>
    </div>
</div>
