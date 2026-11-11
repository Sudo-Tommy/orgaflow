<script lang="ts">
    import { X, Check } from "lucide-svelte";
    import type { WordBlock } from "./wordTypes";

    let { 
        block = $bindable(), 
        isOpen = $bindable(),
        onClose 
    } = $props<{
        block: WordBlock;
        isOpen: boolean;
        onClose: () => void;
    }>();

    let dialog = $state<HTMLDialogElement>();

    $effect(() => {
        if (!dialog) return;
        if (isOpen) {
            if (!dialog.open) {
                try { dialog.showModal(); } catch {}
            }
        } else if (dialog.open) {
            try { dialog.close(); } catch {}
        }
    });

    const availableColumns = [
        { id: "pos", name: "Pos", type: "pos", defaultWidth: 8, align: "left" },
        { id: "date", name: "Datum", type: "date", defaultWidth: 14, align: "left" },
        { id: "duration", name: "Dauer/Menge", type: "duration", defaultWidth: 14, align: "left" },
        { id: "title", name: "Leistungsbeschreibung", type: "title", defaultWidth: 36, align: "left" },
        { id: "price", name: "Einzelpreis", type: "price", defaultWidth: 14, align: "right" },
        { id: "total", name: "Gesamtbetrag", type: "total", defaultWidth: 14, align: "right" }
    ];

    function toggleColumn(colId: string) {
        if (!block.tableConfig) return;
        const cols = block.tableConfig.columns || [];
        const exists = cols.some((c: any) => c.type === colId);
        if (exists) {
            block.tableConfig.columns = cols.filter((c: any) => c.type !== colId);
        } else {
            const template = availableColumns.find(c => c.id === colId);
            if (template) {
                block.tableConfig.columns = [...cols, {
                    id: String(Date.now()),
                    name: template.name,
                    type: template.type,
                    width: template.defaultWidth,
                    align: template.align
                }];
            }
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-xs w-full max-w-lg mx-auto my-auto rounded-2xl border-none outline-none shadow-2xl"
    onclick={(e) => { if (e.target === dialog) onClose(); }}
    onclose={onClose}
>
    {#if isOpen && block?.tableConfig}
        <div class="bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full overflow-hidden">
            <div class="p-4 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                <div>
                    <h3 class="font-bold text-neutral-900 dark:text-neutral-100 text-sm">Abrechnungstabelle konfigurieren</h3>
                    <p class="text-xs text-neutral-500">Spalten, Schriftgrößen und Summen anpassen</p>
                </div>
                <button type="button" onclick={onClose} class="w-8 h-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-500 cursor-pointer">
                    <X class="w-4 h-4" />
                </button>
            </div>

            <div class="p-4 space-y-3.5 text-xs text-neutral-800 dark:text-neutral-200">
                <div>
                    <span class="block font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">Angezeigte Spalten</span>
                    <div class="grid grid-cols-2 gap-2">
                        {#each availableColumns as col}
                            {@const isChecked = block.tableConfig?.columns?.some((c: any) => c.type === col.id)}
                            <button
                                type="button"
                                onclick={() => toggleColumn(col.id)}
                                class="flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer {isChecked ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 font-bold text-violet-900 dark:text-violet-200' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50'}"
                            >
                                <span>{col.name}</span>
                                {#if isChecked}<Check class="w-3.5 h-3.5 text-violet-600" />{/if}
                            </button>
                        {/each}
                    </div>
                </div>

                <div class="pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between gap-4">
                    <div>
                        <span class="font-bold text-neutral-700 dark:text-neutral-300 block">Schriftgrößen (pt)</span>
                        <span class="text-[10px] text-neutral-400">Zeilen &amp; Tabellenkopf</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <label class="flex items-center gap-1">
                            <span class="text-[11px] text-neutral-500">Zeilen:</span>
                            <input type="number" min="6" max="24" step="0.5" bind:value={block.tableConfig.fontSize} class="w-14 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded px-1.5 py-0.5 text-xs font-mono text-center" />
                        </label>
                        <label class="flex items-center gap-1">
                            <span class="text-[11px] text-neutral-500">Kopf:</span>
                            <input type="number" min="6" max="24" step="0.5" bind:value={block.tableConfig.headerFontSize} class="w-14 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded px-1.5 py-0.5 text-xs font-mono text-center" />
                        </label>
                    </div>
                </div>

                <div class="pt-2 border-t border-neutral-100 dark:border-neutral-700">
                    <span class="block font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">Summenzeilen am Tabellenende</span>
                    <div class="space-y-2">
                        <div class="space-y-1">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" bind:checked={block.tableConfig.includeTotalNetto} class="rounded text-violet-600 focus:ring-violet-500" />
                                <span class="font-medium text-neutral-800 dark:text-neutral-200">Nettobetrag anzeigen</span>
                            </label>
                            {#if block.tableConfig?.includeTotalNetto !== false}
                                <div class="pl-6">
                                    <input type="text" bind:value={block.tableConfig.labelNetto} placeholder="Standard: Summe Netto:" class="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2.5 py-1 text-xs outline-none" />
                                </div>
                            {/if}
                        </div>
                        <div class="space-y-1">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" bind:checked={block.tableConfig.includeTotalTax} class="rounded text-violet-600 focus:ring-violet-500" />
                                <span class="font-medium text-neutral-800 dark:text-neutral-200">MwSt. anzeigen</span>
                            </label>
                            {#if block.tableConfig?.includeTotalTax !== false}
                                <div class="pl-6">
                                    <input type="text" bind:value={block.tableConfig.labelTax} placeholder={"z. B. MwSt. ({taxRate}%):"} class="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2.5 py-1 text-xs outline-none" />
                                </div>
                            {/if}
                        </div>
                        <div class="space-y-1">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" bind:checked={block.tableConfig.includeTotalBrutto} class="rounded text-violet-600 focus:ring-violet-500" />
                                <span class="font-medium text-neutral-800 dark:text-neutral-200">Gesamtbetrag (Brutto) anzeigen</span>
                            </label>
                            {#if block.tableConfig?.includeTotalBrutto !== false}
                                <div class="pl-6"><input type="text" bind:value={block.tableConfig.labelBrutto} placeholder="Standard: Gesamtbetrag:" class="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2.5 py-1 text-xs outline-none" /></div>
                            {/if}
                        </div>
                        <div class="flex items-center justify-between pt-1">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" bind:checked={block.tableConfig.showTotalDivider} class="rounded text-violet-600 focus:ring-violet-500" />
                                <span class="font-medium text-neutral-800 dark:text-neutral-200">Trennlinie über Summenzeilen ('Strich')</span>
                            </label>
                            {#if block.tableConfig?.showTotalDivider}
                                <select bind:value={block.tableConfig.dividerScope} class="bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2 py-1 text-xs outline-none">
                                    <option value="full">Ganze Breite</option>
                                    <option value="totals">Nur Summenspalten</option>
                                </select>
                            {/if}
                        </div>
                    </div>
                </div>

                <div class="pt-2 border-t border-neutral-100 dark:border-neutral-700">
                    <span class="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">Positionsbeschreibung</span>
                    <div class="flex flex-wrap items-center gap-3 mb-1.5 text-neutral-800 dark:text-neutral-200">
                        <label class="flex items-center gap-1.5 cursor-pointer text-xs font-medium"><input type="radio" value="appointment_title" bind:group={block.tableConfig.descriptionMode} class="text-violet-600 focus:ring-violet-500" /><span>Termintitel</span></label>
                        <label class="flex items-center gap-1.5 cursor-pointer text-xs font-medium"><input type="radio" value="appointment_desc" bind:group={block.tableConfig.descriptionMode} class="text-violet-600 focus:ring-violet-500" /><span>Terminbeschreibung</span></label>
                        <label class="flex items-center gap-1.5 cursor-pointer text-xs font-medium"><input type="radio" value="appointment_tasks" bind:group={block.tableConfig.descriptionMode} class="text-violet-600 focus:ring-violet-500" /><span>Leistungen (aus Termin)</span></label>
                        <label class="flex items-center gap-1.5 cursor-pointer text-xs font-medium"><input type="radio" value="static" bind:group={block.tableConfig.descriptionMode} class="text-violet-600 focus:ring-violet-500" /><span class="font-bold text-violet-700 dark:text-violet-300">Fester Text</span></label>
                    </div>
                    {#if block.tableConfig?.descriptionMode === 'static'}
                        <div class="space-y-1 bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700">
                            <input id="static-desc-input" type="text" bind:value={block.tableConfig.staticDescription} placeholder="z. B. Umwandlungsleistung nach §45a SGB XI" class="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2.5 py-1 text-xs outline-none" />
                        </div>
                    {/if}
                    <label class="flex items-center gap-2 cursor-pointer mt-2 pt-1 border-t border-neutral-100 dark:border-neutral-700/60">
                        <input type="checkbox" bind:checked={block.tableConfig.showPriceUnits} class="rounded text-violet-600 focus:ring-violet-500" />
                        <span class="font-medium text-neutral-800 dark:text-neutral-200">Einheiten bei Einzelpreis anzeigen (/Std., /km)</span>
                    </label>
                </div>

                <div class="pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between gap-4">
                    <div class="flex items-center justify-between flex-1">
                        <span class="font-bold text-neutral-700 dark:text-neutral-300">Schriftfarbe</span>
                        <input type="color" value={block.tableConfig?.textColor || block.tableConfig?.headerTextColor || '#000000'} oninput={(e) => {
                            const val = e.currentTarget.value;
                            if (block.tableConfig) { block.tableConfig.textColor = val; block.tableConfig.headerTextColor = val; }
                        }} class="w-7 h-7 rounded-lg cursor-pointer border border-neutral-300 dark:border-neutral-700 p-0" />
                    </div>
                    <div class="flex items-center justify-between flex-1">
                        <span class="font-bold text-neutral-700 dark:text-neutral-300">Kopf-Farbe</span>
                        <div class="flex items-center gap-1.5">
                            <input type="color" value={block.tableConfig?.headerBackgroundColor && block.tableConfig.headerBackgroundColor !== 'transparent' ? block.tableConfig.headerBackgroundColor : '#ffffff'} oninput={(e) => { if (block.tableConfig) block.tableConfig.headerBackgroundColor = e.currentTarget.value; }} class="w-7 h-7 rounded-lg cursor-pointer border border-neutral-300 dark:border-neutral-700 p-0" />
                            <button type="button" onclick={() => { if (block.tableConfig) block.tableConfig.headerBackgroundColor = 'transparent'; }} class="px-1.5 py-0.5 text-[10px] rounded border transition-colors {block.tableConfig?.headerBackgroundColor === 'transparent' ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200 border-violet-400 font-bold' : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100'}" title="Kopfzeile transparent ohne Hintergrund">Ohne</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="p-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-700 flex justify-end">
                <button type="button" onclick={onClose} class="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer">
                    Übernehmen
                </button>
            </div>
        </div>
    {/if}
</dialog>
