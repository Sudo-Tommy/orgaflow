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
    <div>
        <span class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Anzuzeigende Positionen</span>
        <div class="space-y-2 bg-neutral-50 dark:bg-slate-850 p-3 rounded-xl border border-neutral-200 dark:border-slate-800">
            {@render toggleSwitch("Anfahrtskosten (Pauschalen)", activeField.tableConfig.includeDriveLumpSum, v => activeField.tableConfig.includeDriveLumpSum = v)}
            {@render toggleSwitch("Fahrtkosten (Kilometer)", activeField.tableConfig.includeDriveKm, v => activeField.tableConfig.includeDriveKm = v)}
            {@render toggleSwitch("Sonderausgaben / Spesen", activeField.tableConfig.includeExpenditures, v => activeField.tableConfig.includeExpenditures = v)}
            {@render toggleSwitch("Zeiterfassungen (Stunden)", activeField.tableConfig.includeTimeRecords, v => activeField.tableConfig.includeTimeRecords = v)}
        </div>
    </div>

    <div>
        <span class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Tabellen-Fußzeile (Summen)</span>
        <div class="space-y-2 bg-neutral-50 dark:bg-slate-850 p-3 rounded-xl border border-neutral-200 dark:border-slate-800">
            {@render toggleSwitch("Gesamt-Brutto anzeigen", activeField.tableConfig.includeTotalBrutto, v => activeField.tableConfig.includeTotalBrutto = v)}
            {@render toggleSwitch("MwSt-Betrag anzeigen", activeField.tableConfig.includeTotalTax, v => activeField.tableConfig.includeTotalTax = v)}
            {@render toggleSwitch("Netto-Summe anzeigen", activeField.tableConfig.includeTotalNetto, v => activeField.tableConfig.includeTotalNetto = v)}
        </div>
    </div>

    <div>
        <span class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Spalten benennen</span>
        <div class="grid grid-cols-2 gap-2.5 bg-neutral-50 dark:bg-slate-850 p-3 rounded-xl border border-neutral-200 dark:border-slate-800">
            {#each activeField.tableConfig.columns as col}
                <div>
                    <label for="prop-col-{col.id}" class="text-[10px] text-neutral-400 font-bold uppercase tracking-widest block mb-1">{col.type}</label>
                    <input id="prop-col-{col.id}" type="text" bind:value={col.name} class="orga-input-clear py-1.5 text-xs" />
                </div>
            {/each}
        </div>
    </div>

    <div>
        <span class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Tabellen-Linien (WYSIWYG)</span>
        <div class="flex flex-col gap-2 bg-neutral-50 dark:bg-slate-850 p-3 rounded-xl border border-neutral-200 dark:border-slate-800">
            {@render toggleSwitch("Kopfzeile-Linie", activeField.tableConfig.showBorderHeader, v => activeField.tableConfig.showBorderHeader = v)}
            {@render toggleSwitch("Zeilen-Linien", activeField.tableConfig.showBorderRows, v => activeField.tableConfig.showBorderRows = v)}
            <div class="grid grid-cols-2 gap-3 mt-1">
                <div><label for="line-color" class="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Linienfarbe</label><input id="line-color" type="color" bind:value={activeField.tableConfig.borderColor} class="w-full h-10 rounded-xl cursor-pointer border-2 border-neutral-200 p-0.5" /></div>
                <div><label for="line-width" class="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Linienstärke (px)</label><input id="line-width" type="number" step="0.5" bind:value={activeField.tableConfig.borderWidth} class="orga-input-clear py-1.5 text-sm" /></div>
            </div>
        </div>
    </div>

    <div>
        <label for="prop-static-desc" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Feste Beschreibung (Leistungen)</label>
        <textarea id="prop-static-desc" bind:value={activeField.tableConfig.staticDescription} rows="3" placeholder="z.B. Betreuung/Entlastungsleistung nach § 45b SGB XI" class="orga-input-clear py-3 text-sm resize-none font-mono w-full"></textarea>
    </div>

    <div class="grid grid-cols-2 gap-3">
        <div><label for="prop-head-bg" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Kopf-Hintergrund</label><input id="prop-head-bg" type="color" bind:value={activeField.tableConfig.headerBackgroundColor} class="w-full h-10 rounded-xl cursor-pointer border-2 border-neutral-200 p-0.5" /></div>
        <div><label for="prop-head-color" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Kopf-Textfarbe</label><input id="prop-head-color" type="color" bind:value={activeField.tableConfig.headerTextColor} class="w-full h-10 rounded-xl cursor-pointer border-2 border-neutral-200 p-0.5" /></div>
        <div><label for="prop-table-font" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Schriftgröße</label><input id="prop-table-font" type="number" bind:value={activeField.tableConfig.fontSize} class="orga-input-clear py-2 text-sm" /></div>
        <div><label for="prop-table-pad" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Zellen-Abstand</label><input id="prop-table-pad" type="number" bind:value={activeField.tableConfig.cellPadding} placeholder="6" class="orga-input-clear py-2 text-sm" /></div>
        <div><label for="prop-footer-width" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Breite Fußzeile</label><input id="prop-footer-width" type="number" bind:value={activeField.tableConfig.footerWidth} placeholder="200" class="orga-input-clear py-2 text-sm" /></div>
        <div><label for="prop-first-limit" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Limit Seite 1</label><input id="prop-first-limit" type="number" bind:value={activeField.tableConfig.firstPageLimit} placeholder="6" class="orga-input-clear py-2 text-sm" /></div>
        <div class="col-span-2"><label for="prop-next-limit" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Limit Folgeseiten</label><input id="prop-next-limit" type="number" bind:value={activeField.tableConfig.nextPageLimit} placeholder="12" class="orga-input-clear py-2 text-sm" /></div>
        <div><label for="prop-head-align" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Ausrichtung (Kopf)</label><select id="prop-head-align" bind:value={activeField.tableConfig.headerTextAlign} class="orga-input-clear py-2 text-sm appearance-none"><option value="left">Links</option><option value="center">Mittig</option><option value="right">Rechts</option><option value="">Wie Spalten</option></select></div>
        <div><label for="prop-foot-align" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Ausrichtung (Fuß)</label><select id="prop-foot-align" bind:value={activeField.tableConfig.footerTextAlign} class="orga-input-clear py-2 text-sm appearance-none"><option value="left">Links</option><option value="center">Mittig</option><option value="right">Rechts</option></select></div>
        <div class="col-span-2"><label for="prop-row-valign" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Vertikal (Zeilen)</label><select id="prop-row-valign" bind:value={activeField.tableConfig.rowVerticalAlign} class="orga-input-clear py-2 text-sm appearance-none"><option value="middle">Mittig</option><option value="top">Oben</option><option value="bottom">Unten</option></select></div>
    </div>
</div>
