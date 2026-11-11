<script lang="ts">
    import type { CanvasField } from "$lib/services/editorService.svelte";

    let { activeField = $bindable() }: { activeField: CanvasField } = $props();
</script>

{#snippet toggleSwitch(label: string, checked: boolean, onToggle: (val: boolean) => void)}
    <button 
        type="button"
        role="switch" 
        aria-checked={checked}
        onclick={() => onToggle(!checked)}
        class="flex items-center justify-between gap-3 w-full p-2.5 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 hover:border-brand-300 rounded-lg transition-all cursor-pointer group active:scale-[0.98] min-h-11 shadow-xs touch-manipulation"
    >
        <span class="text-[11px] leading-tight text-left font-medium text-neutral-700 dark:text-slate-200 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors flex-1">{label}</span>
        <div class="w-8 h-5 rounded-full relative transition-colors duration-300 shrink-0 shadow-inner {checked ? 'bg-brand-500' : 'bg-neutral-200 dark:bg-slate-700'}">
            <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-xs {checked ? 'translate-x-3' : 'translate-x-0'}"></div>
        </div>
    </button>
{/snippet}

<div class="space-y-4 pt-2 border-t border-neutral-100 dark:border-slate-800">
    <div class="grid grid-cols-2 gap-3">
        <div>
            <label for="prop-font-size" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Schriftgröße</label>
            <input id="prop-font-size" type="number" bind:value={activeField.style.fontSize} class="orga-input-clear py-2 text-sm" />
        </div>
        <div>
            <label for="prop-padding" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Innenabstand (px)</label>
            <input id="prop-padding" type="number" bind:value={activeField.style.padding} class="orga-input-clear py-2 text-sm" />
        </div>
        <div>
            <label for="prop-align" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Horizontal</label>
            <select id="prop-align" bind:value={activeField.style.textAlign} class="orga-input-clear py-2 text-sm appearance-none cursor-pointer">
                <option value="left">Links</option>
                <option value="center">Mittig</option>
                <option value="right">Rechts</option>
            </select>
        </div>
        <div>
            <label for="prop-valign" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Vertikal</label>
            <select id="prop-valign" bind:value={activeField.style.verticalAlign} class="orga-input-clear py-2 text-sm appearance-none cursor-pointer">
                <option value="middle">Mittig</option>
                <option value="top">Oben</option>
                <option value="bottom">Unten</option>
            </select>
        </div>
        <div>
            <label for="prop-weight" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Dicke</label>
            <select id="prop-weight" bind:value={activeField.style.fontWeight} class="orga-input-clear py-2 text-sm appearance-none cursor-pointer">
                <option value="bold">Fett</option>
                <option value="normal">Normal</option>
            </select>
        </div>
        <div>
            <label for="prop-color" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Farbe</label>
            <input id="prop-color" type="color" bind:value={activeField.style.color} class="w-full h-10 rounded-xl cursor-pointer border-2 border-neutral-200 dark:border-slate-700 p-0.5" />
        </div>
    </div>

    <div>
        <span class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Seiten-Verhalten (Kopf-/Fußzeile)</span>
        <div class="bg-neutral-50 dark:bg-slate-850 p-3 rounded-xl border border-neutral-200 dark:border-slate-800">
            {@render toggleSwitch("Auf jeder Seite wiederholen", activeField.style.repeatOnAllPages !== false, v => activeField.style.repeatOnAllPages = v)}
            <p class="text-[10px] text-neutral-500 mt-2 leading-relaxed">Wenn das Element im Bereich der Kopf- oder Fußzeile platziert ist, wird es bei Aktivierung auf jeder neu generierten PDF-Seite wiederholt.</p>
        </div>
    </div>

    {#if activeField.type === 'text'}
        <div>
            <span class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Mehrseitige Texte</span>
            <div class="bg-neutral-50 dark:bg-slate-850 p-3 rounded-xl border border-neutral-200 dark:border-slate-800">
                {@render toggleSwitch("Automatischer Seitenumbruch", activeField.style.dynamicHeight || false, v => activeField.style.dynamicHeight = v)}
                <p class="text-[10px] text-neutral-500 mt-2 leading-relaxed">Wenn aktiviert, passt sich die Höhe beim PDF-Export automatisch an den Text an und bricht bei Bedarf auf eine neue Seite um. Die feste Höhen-Einstellung wird ignoriert.</p>
            </div>
        </div>
    {/if}
</div>
