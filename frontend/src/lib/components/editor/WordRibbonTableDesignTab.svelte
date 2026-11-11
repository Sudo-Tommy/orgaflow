<script lang="ts">
    import { Palette, Brush, Type, SlidersHorizontal } from "lucide-svelte";
    import type { WordBlock } from "./wordTypes";
    import { TABLE_PRESETS, applyTablePreset } from "./tableStylesHelper";

    let { activeBlock = null, isBorderPainterActive = $bindable(false), onOpenProperties } = $props<{
        activeBlock?: WordBlock | null;
        isBorderPainterActive?: boolean;
        onOpenProperties?: () => void;
    }>();

    const fontSizes = [7, 8, 8.5, 9, 9.5, 10, 11, 12, 14];

    const lineWidths = [
        { label: '0.5 pt', value: '0.5px' }, { label: '1.0 pt', value: '1px' }, { label: '1.5 pt', value: '1.5px' }, { label: '2.25 pt', value: '2.25px' }, { label: '3.0 pt', value: '3px' }
    ];

    function applyPreset(preset: any) { if (!activeBlock?.tableConfig) activeBlock!.tableConfig = {}; applyTablePreset(activeBlock!.tableConfig, preset); }

    function setBorderType(type: 'all' | 'box' | 'none' | 'top' | 'bottom') {
        if (!activeBlock?.tableConfig) activeBlock!.tableConfig = {};
        activeBlock!.tableConfig.borderMode = type;
        activeBlock!.tableConfig.borderColor = type === 'none' ? 'transparent' : (activeBlock!.tableConfig.borderColor === 'transparent' ? '#cbd5e1' : activeBlock!.tableConfig.borderColor);
    }
</script>

<div class="flex flex-wrap items-center gap-2 sm:gap-3 py-1 text-neutral-800 dark:text-neutral-200 text-xs">
    <!-- Gruppe 1: Tabellenstiloptionen -->
    <div class="flex flex-col gap-1 border-r border-neutral-300 dark:border-neutral-700 pr-2.5">
        <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Tabellenstiloptionen</span>
        <div class="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
            <label class="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" bind:checked={activeBlock!.tableConfig!.showHeaders} class="rounded text-violet-600 focus:ring-violet-500" />
                <span>Überschrift</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" bind:checked={activeBlock!.tableConfig!.includeTotalBrutto} class="rounded text-violet-600 focus:ring-violet-500" />
                <span>Ergebnis</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" bind:checked={activeBlock!.tableConfig!.firstColumnHighlight} class="rounded text-violet-600 focus:ring-violet-500" />
                <span>Erste Spalte</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" bind:checked={activeBlock!.tableConfig!.isZebra} class="rounded text-violet-600 focus:ring-violet-500" />
                <span>Gebändert</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" bind:checked={activeBlock!.tableConfig!.showPriceUnits} class="rounded text-violet-600 focus:ring-violet-500" />
                <span>Einheiten</span>
            </label>
            <div class="flex items-center gap-1">
                <label class="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" bind:checked={activeBlock!.tableConfig!.showTotalDivider} class="rounded text-violet-600 focus:ring-violet-500" />
                    <span>Linie</span>
                </label>
                {#if activeBlock?.tableConfig?.showTotalDivider}
                    <select bind:value={activeBlock!.tableConfig!.dividerScope} class="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded px-1 py-0 text-[9px] outline-none" title="Umfang der Trennlinie">
                        <option value="full">Breit</option>
                        <option value="totals">Summen</option>
                    </select>
                {/if}
            </div>
        </div>
    </div>

    <!-- Gruppe 2: Tabellenformatvorlagen -->
    <div class="flex flex-col gap-1 border-r border-neutral-300 dark:border-neutral-700 pr-2.5">
        <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Formatvorlagen</span>
        <div class="flex items-center gap-1">
            {#each TABLE_PRESETS as preset}
                {@const isCurrent = activeBlock?.tableConfig?.headerBackgroundColor === preset.headerBg}
                <button
                    type="button"
                    onclick={() => applyPreset(preset)}
                    class="p-1 rounded-lg border transition-all cursor-pointer {isCurrent ? 'border-violet-500 ring-2 ring-violet-500/30 bg-violet-50/40 dark:bg-violet-950/20' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 bg-white dark:bg-neutral-800'}"
                    title={preset.name}
                >
                    <div class="w-7 h-4 rounded overflow-hidden border border-neutral-300 dark:border-neutral-600 flex flex-col">
                        <div class="h-1.5 w-full" style="background-color: {preset.headerBg === 'transparent' ? '#cbd5e1' : preset.headerBg};"></div>
                        <div class="h-2.5 w-full bg-white dark:bg-neutral-900"></div>
                    </div>
                </button>
            {/each}
        </div>
    </div>

    <!-- Gruppe 3: Schriftgrößen -->
    <div class="flex flex-col gap-1 border-r border-neutral-300 dark:border-neutral-700 pr-2.5">
        <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Schriftgröße</span>
        <div class="flex items-center gap-1.5">
            <div class="flex flex-col">
                <span class="text-[8px] text-neutral-400">Zeilen</span>
                <select
                    value={activeBlock?.tableConfig?.fontSize || 9.5}
                    onchange={(e) => {
                        if (!activeBlock?.tableConfig) activeBlock!.tableConfig = {};
                        activeBlock!.tableConfig.fontSize = Number(e.currentTarget.value);
                    }}
                    class="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded px-1 py-0.5 text-[10px] h-6 font-mono"
                    title="Schriftgröße der Tabellenzeilen"
                >
                    {#each fontSizes as sz}
                        <option value={sz}>{sz} pt</option>
                    {/each}
                </select>
            </div>
            <div class="flex flex-col">
                <span class="text-[8px] text-neutral-400">Kopf</span>
                <select
                    value={activeBlock?.tableConfig?.headerFontSize || activeBlock?.tableConfig?.fontSize || 9.5}
                    onchange={(e) => {
                        if (!activeBlock?.tableConfig) activeBlock!.tableConfig = {};
                        activeBlock!.tableConfig.headerFontSize = Number(e.currentTarget.value);
                    }}
                    class="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded px-1 py-0.5 text-[10px] h-6 font-mono"
                    title="Schriftgröße der Kopfzeile"
                >
                    {#each fontSizes as sz}
                        <option value={sz}>{sz} pt</option>
                    {/each}
                </select>
            </div>
        </div>
    </div>

    <!-- Gruppe 4: Farben (Kopf- & Schriftfarbe) -->
    <div class="flex flex-col gap-1 border-r border-neutral-300 dark:border-neutral-700 pr-2.5">
        <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Farben</span>
        <div class="flex items-center gap-1.5">
            <label class="flex items-center gap-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md px-1.5 py-0.5 h-7 cursor-pointer" title="Hintergrundfarbe der Kopfzeile ändern">
                <Palette class="w-3.5 h-3.5 text-violet-500" />
                <input 
                    type="color" 
                    value={activeBlock?.tableConfig?.headerBackgroundColor && activeBlock.tableConfig.headerBackgroundColor !== 'transparent' ? activeBlock.tableConfig.headerBackgroundColor : '#ffffff'}
                    oninput={(e) => { if (activeBlock?.tableConfig) activeBlock.tableConfig.headerBackgroundColor = e.currentTarget.value; }}
                    class="opacity-0 w-0 h-0 absolute pointer-events-none" 
                />
                <span class="text-[10px] font-medium">Kopf</span>
            </label>
            <button
                type="button"
                onclick={() => {
                    if (!activeBlock?.tableConfig) activeBlock!.tableConfig = {};
                    activeBlock!.tableConfig.headerBackgroundColor = 'transparent';
                }}
                class="px-1.5 py-1 rounded border text-[10px] transition-colors {activeBlock?.tableConfig?.headerBackgroundColor === 'transparent' ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/40 font-bold' : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100'}"
                title="Kopfzeile ohne Hintergrundfarbe (Transparent)"
            >
                Ohne
            </button>
            <label class="flex items-center gap-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md px-1.5 py-0.5 h-7 cursor-pointer" title="Schriftfarbe der gesamten Tabelle anpassen">
                <Type class="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                <input 
                    type="color" 
                    value={activeBlock?.tableConfig?.textColor || activeBlock?.tableConfig?.headerTextColor || '#000000'}
                    oninput={(e) => {
                        const val = e.currentTarget.value;
                        if (activeBlock?.tableConfig) {
                            activeBlock.tableConfig.textColor = val;
                            activeBlock.tableConfig.headerTextColor = val;
                        }
                    }}
                    class="opacity-0 w-0 h-0 absolute pointer-events-none" 
                />
                <span class="text-[10px] font-medium">Schrift</span>
            </label>
        </div>
    </div>

    <!-- Gruppe 5: Rahmen & Linienstile -->
    <div class="flex flex-col gap-1 border-r border-neutral-300 dark:border-neutral-700 pr-2.5">
        <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Rahmen</span>
        <div class="flex items-center gap-1">
            <button
                type="button"
                onclick={() => setBorderType('all')}
                class="px-1.5 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-medium text-[10px] hover:bg-neutral-100 cursor-pointer"
                title="Alle Rahmenlinien anzeigen"
            >
                Alle
            </button>
            <button
                type="button"
                onclick={() => setBorderType('box')}
                class="px-1.5 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-medium text-[10px] hover:bg-neutral-100 cursor-pointer"
                title="Nur Rahmen außen anzeigen"
            >
                Rahmen außen
            </button>
            <button
                type="button"
                onclick={() => setBorderType('none')}
                class="px-1.5 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-medium text-[10px] hover:bg-neutral-100 cursor-pointer text-rose-500"
                title="Kein Rahmen"
            >
                Kein Rahmen
            </button>
            <select
                bind:value={activeBlock!.tableConfig!.borderWidth}
                class="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded px-1 py-0.5 text-[10px] h-7"
                title="Linienstärke"
            >
                {#each lineWidths as lw}
                    <option value={lw.value}>{lw.label}</option>
                {/each}
            </select>
            <label class="flex items-center gap-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded px-1.5 py-0.5 h-7 cursor-pointer" title="Rahmenfarbe wählen">
                <span class="w-3.5 h-3.5 rounded border border-neutral-300" style="background-color: {activeBlock?.tableConfig?.borderColor || '#cbd5e1'};"></span>
                <input 
                    type="color" 
                    bind:value={activeBlock!.tableConfig!.borderColor}
                    class="opacity-0 w-0 h-0 absolute pointer-events-none" 
                />
            </label>
        </div>
    </div>

    <!-- Gruppe 6: Rahmen übertragen (Rahmenpinsel) -->
    <div class="flex flex-col gap-1">
        <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Rahmen übertragen</span>
        <button
            type="button"
            onclick={() => isBorderPainterActive = !isBorderPainterActive}
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold text-xs transition-all cursor-pointer {isBorderPainterActive ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400/40 animate-pulse' : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100'}"
            title="Rahmenpinsel aktivieren: Klicke auf eine Zelle, um den aktuellen Rahmenstil zu übertragen"
        >
            <Brush class="w-3.5 h-3.5" />
            <span>Rahmenpinsel</span>
        </button>
    </div>

    <!-- Gruppe 7: Optionen / Modal -->
    {#if onOpenProperties}
        <div class="flex flex-col gap-1 border-l border-neutral-300 dark:border-neutral-700 pl-2.5">
            <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Optionen</span>
            <button
                type="button"
                onclick={onOpenProperties}
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold text-xs bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
                title="Detaillierte Tabellen- und Spaltenoptionen öffnen"
            >
                <SlidersHorizontal class="w-3.5 h-3.5 text-violet-500" />
                <span>Optionen</span>
            </button>
        </div>
    {/if}
</div>
