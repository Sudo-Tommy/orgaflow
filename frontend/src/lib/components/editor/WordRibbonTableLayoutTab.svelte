<script lang="ts">
    import { 
        Plus, 
        Trash2, 
        StretchHorizontal, 
        ArrowUpDown, 
        Calculator, 
        FileText, 
        Settings2,
        RotateCw,
        Columns,
        Check,
        Sparkles,
        ChevronLeft,
        ChevronRight
    } from "lucide-svelte";
    import type { WordBlock } from "./wordTypes";
    import { NINE_POINT_ALIGNMENTS, distributeEvenly, AVAILABLE_COLUMNS, toggleColumn, autoFitBillingColumns } from "./tableStylesHelper";
    import { 
        insertRow, 
        insertColumn, 
        deleteRow, 
        deleteColumn, 
        autoFitTable 
    } from "./tableOperationsHelper";
    import { sortTableRows, convertTableToText } from "./tableFormulasHelper";

    let { 
        activeBlock = null,
        selectedRowIdx = 0,
        selectedColIdx = 0,
        onOpenProperties
    } = $props<{
        activeBlock: WordBlock | null;
        selectedRowIdx?: number;
        selectedColIdx?: number;
        onOpenProperties: () => void;
    }>();

    let showColumnsMenu = $state(false);

    let curColIdx = $derived(
        activeBlock?.tableConfig?._selectedColIdx ?? selectedColIdx ?? 0
    );

    function handleMoveCol(direction: 'left' | 'right') {
        if (!activeBlock?.tableConfig?.columns) return;
        const cols = activeBlock.tableConfig.columns, target = direction === 'left' ? curColIdx - 1 : curColIdx + 1;
        if (target < 0 || target >= cols.length) return;
        const temp = cols[curColIdx]; cols[curColIdx] = cols[target]; cols[target] = temp;
        if (activeBlock.tableConfig) activeBlock.tableConfig._selectedColIdx = target;
    }

    function handleInsertRow(pos: 'above' | 'below') { if (activeBlock) insertRow(activeBlock, selectedRowIdx, pos); }
    function handleInsertCol(pos: 'left' | 'right') { if (activeBlock) insertColumn(activeBlock, curColIdx, pos); }
    function handleDeleteRow() { if (activeBlock) deleteRow(activeBlock, selectedRowIdx); }
    function handleDeleteCol() {
        if (!activeBlock) return;
        if (activeBlock.type === 'billing_table' && activeBlock.tableConfig?.columns) {
            const cols = activeBlock.tableConfig.columns;
            if (cols.length <= 1) return;
            cols.splice(curColIdx, 1);
            if (activeBlock.tableConfig) activeBlock.tableConfig._selectedColIdx = Math.max(0, curColIdx - 1);
        } else {
            deleteColumn(activeBlock, selectedColIdx);
        }
    }

    function handleAutoFit() {
        if (!activeBlock) return;
        if (activeBlock.type === 'billing_table' && activeBlock.tableConfig?.columns) {
            autoFitBillingColumns(activeBlock.tableConfig.columns);
        } else {
            autoFitTable(activeBlock, 'window');
        }
    }

    function handleSetAlign(alignId: string) {
        if (!activeBlock) return;
        if (activeBlock.type === 'billing_table' && activeBlock.tableConfig?.columns) {
            const col = activeBlock.tableConfig.columns[curColIdx];
            if (col) col.align = alignId.includes('right') ? 'right' : alignId.includes('center') ? 'center' : 'left';
        } else if (activeBlock.tableData?.rows) {
            const row = activeBlock.tableData.rows[selectedRowIdx];
            if (row && row[selectedColIdx]) {
                const cell = row[selectedColIdx];
                if (typeof cell === 'object') { cell.style = cell.style || {}; cell.style.align = alignId; }
                else { row[selectedColIdx] = { content: String(cell), style: { align: alignId } }; }
            }
        }
    }

    function handleRotateText() {
        if (!activeBlock?.tableData?.rows) return;
        const row = activeBlock.tableData.rows[selectedRowIdx];
        if (!row || !row[selectedColIdx]) return;
        const cell = row[selectedColIdx];
        const curDir = typeof cell === 'object' ? cell.style?.textDirection : 'horizontal';
        const nextDir = curDir === 'horizontal' ? 'vertical-lr' : curDir === 'vertical-lr' ? 'vertical-rl' : 'horizontal';
        if (typeof cell === 'object') { cell.style = cell.style || {}; cell.style.textDirection = nextDir; }
        else { row[selectedColIdx] = { content: String(cell), style: { textDirection: nextDir } }; }
    }

    function handleInsertFormula(fStr: string) {
        if (!activeBlock?.tableData?.rows) return;
        const row = activeBlock.tableData.rows[selectedRowIdx];
        if (row) row[selectedColIdx] = { content: fStr, style: { fontWeight: 'bold' }, formula: fStr };
    }

    function handleSort(asc: boolean) {
        if (activeBlock?.tableData?.rows) activeBlock.tableData.rows = sortTableRows(activeBlock.tableData.rows, curColIdx, asc);
    }

    function handleConvertToText() {
        if (!activeBlock?.tableData) return;
        activeBlock.content = convertTableToText(activeBlock.tableData.headers, activeBlock.tableData.rows);
        activeBlock.type = 'paragraph';
        delete activeBlock.tableData;
    }

    function handleToggleDescMode() {
        if (!activeBlock) return;
        if (!activeBlock.tableConfig) activeBlock.tableConfig = {};
        const cur = activeBlock.tableConfig.descriptionMode;
        if (cur === 'appointment_title' || cur === 'appointment') activeBlock.tableConfig.descriptionMode = 'appointment_desc';
        else if (cur === 'appointment_desc') activeBlock.tableConfig.descriptionMode = 'appointment_tasks';
        else if (cur === 'appointment_tasks') {
            activeBlock.tableConfig.descriptionMode = 'static';
            if (!activeBlock.tableConfig.staticDescription) activeBlock.tableConfig.staticDescription = 'Begleitung Arztbesuch';
        } else activeBlock.tableConfig.descriptionMode = 'appointment_title';
    }
</script>

<div class="flex flex-wrap items-center gap-2 sm:gap-3 py-1 text-neutral-800 dark:text-neutral-200 text-xs">
    <!-- Gruppe 1: Spalten & Zeilen -->
    <div class="flex flex-col gap-1 border-r border-neutral-300 dark:border-neutral-700 pr-2.5">
        <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Spalten & Zeilen</span>
        <div class="flex items-center gap-1">
            {#if activeBlock?.type === 'billing_table'}
                <!-- Spaltenauswahl & Verschieben -->
                <select 
                    value={curColIdx} 
                    onchange={(e) => { if (activeBlock?.tableConfig) activeBlock.tableConfig._selectedColIdx = Number(e.currentTarget.value); }}
                    class="px-1.5 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px] font-semibold max-w-[90px] truncate"
                    title="Aktive Spalte für Aktionen auswählen"
                >
                    {#each activeBlock.tableConfig?.columns || [] as col, cIdx}
                        <option value={cIdx}>{col.name || col.type || `Spalte ${cIdx + 1}`}</option>
                    {/each}
                </select>
                <button type="button" onclick={() => handleMoveCol('left')} disabled={curColIdx === 0} class="p-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer" title="Spalte nach links verschieben">
                    <ChevronLeft class="w-3.5 h-3.5 text-violet-600" />
                </button>
                <button type="button" onclick={() => handleMoveCol('right')} disabled={!activeBlock.tableConfig?.columns || curColIdx >= activeBlock.tableConfig.columns.length - 1} class="p-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer" title="Spalte nach rechts verschieben">
                    <ChevronRight class="w-3.5 h-3.5 text-violet-600" />
                </button>
                <div class="relative">
                    <button type="button" onclick={() => showColumnsMenu = !showColumnsMenu} class="px-2 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px] font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-1 cursor-pointer" title="Spalten ein-/ausblenden">
                        <Columns class="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                        <span>Spalten</span>
                    </button>
                    {#if showColumnsMenu}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div class="absolute left-0 top-full mt-1.5 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl p-1.5 z-50 space-y-0.5 text-xs" onclick={(e) => e.stopPropagation()}>
                            <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">Spalten anzeigen</div>
                            {#each AVAILABLE_COLUMNS as col}
                                {@const isColActive = activeBlock.tableConfig?.columns?.some((c: any) => c.type === col.id)}
                                <button type="button" onclick={() => { if (activeBlock?.tableConfig) toggleColumn(activeBlock.tableConfig, col.id); }} class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left transition-colors cursor-pointer text-neutral-800 dark:text-neutral-200">
                                    <span class="text-[11px]">{col.name}</span>
                                    {#if isColActive}<Check class="w-3.5 h-3.5 text-emerald-500" />{/if}
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>
            {:else}
                <button type="button" onclick={() => handleInsertRow('above')} class="px-1.5 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-medium text-[10px] hover:bg-neutral-100 flex items-center gap-0.5" title="Zeile oberhalb einfügen"><Plus class="w-3 h-3 text-violet-600" /> Oben</button>
                <button type="button" onclick={() => handleInsertRow('below')} class="px-1.5 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-medium text-[10px] hover:bg-neutral-100 flex items-center gap-0.5" title="Zeile unterhalb einfügen"><Plus class="w-3 h-3 text-violet-600" /> Unten</button>
                <button type="button" onclick={() => handleInsertCol('left')} class="px-1.5 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-medium text-[10px] hover:bg-neutral-100 flex items-center gap-0.5" title="Spalte links einfügen"><Plus class="w-3 h-3 text-emerald-600" /> Links</button>
                <button type="button" onclick={() => handleInsertCol('right')} class="px-1.5 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-medium text-[10px] hover:bg-neutral-100 flex items-center gap-0.5" title="Spalte rechts einfügen"><Plus class="w-3 h-3 text-emerald-600" /> Rechts</button>
            {/if}
            <button type="button" onclick={handleDeleteCol} class="px-1.5 py-1 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 font-medium text-[10px] hover:bg-rose-100 cursor-pointer" title="Spalte löschen"><Trash2 class="w-3 h-3" /> Spalte</button>
        </div>
    </div>

    <!-- Gruppe 2: Breiten anpassen -->
    <div class="flex flex-col gap-1 border-r border-neutral-300 dark:border-neutral-700 pr-2.5">
        <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Breiten</span>
        <div class="flex items-center gap-1">
            <button type="button" onclick={handleAutoFit} class="px-2 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px] font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-1 cursor-pointer" title="Optimal an Inhalt anpassen">
                <Sparkles class="w-3 h-3 text-amber-500" /> Optimal
            </button>
            <button type="button" onclick={() => { if (activeBlock?.tableConfig?.columns) distributeEvenly(activeBlock.tableConfig.columns); }} class="px-2 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px] font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-1 cursor-pointer" title="Gleichmäßig verteilen">
                <StretchHorizontal class="w-3 h-3 text-emerald-600" /> Verteilen
            </button>
        </div>
    </div>

    <!-- Gruppe 3: 9-Punkte-Ausrichtung -->
    <div class="flex flex-col gap-1 border-r border-neutral-300 dark:border-neutral-700 pr-2.5">
        <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Ausrichtung</span>
        <div class="flex items-center gap-2">
            <div class="grid grid-cols-3 gap-0.5 bg-neutral-200 dark:bg-neutral-750 p-0.5 rounded border border-neutral-300 dark:border-neutral-600">
                {#each NINE_POINT_ALIGNMENTS as align}
                    <button type="button" onclick={() => handleSetAlign(align.id)} class="w-4 h-4 rounded-xs bg-white dark:bg-neutral-800 hover:bg-violet-100 dark:hover:bg-violet-900 text-[9px] font-bold flex items-center justify-center transition-colors cursor-pointer" title={align.label}>
                        {align.icon}
                    </button>
                {/each}
            </div>
            {#if activeBlock?.type !== 'billing_table'}
                <button type="button" onclick={handleRotateText} class="px-2 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px] font-medium hover:bg-neutral-100 flex items-center gap-1" title="Drehen">
                    <RotateCw class="w-3 h-3 text-violet-500" /> Drehen
                </button>
            {/if}
        </div>
    </div>

    <!-- Gruppe 4: Daten & Formeln -->
    <div class="flex flex-col gap-1 border-r border-neutral-300 dark:border-neutral-700 pr-2.5">
        <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Daten & Formeln</span>
        <div class="flex items-center gap-1">
            {#if activeBlock?.type === 'billing_table'}
                <button 
                    type="button" 
                    onclick={handleToggleDescMode}
                    class="px-2 py-1 rounded border text-[10px] font-semibold flex items-center gap-1 cursor-pointer {activeBlock.tableConfig?.descriptionMode === 'static' ? 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700' : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'}"
                    title="Umschalten: Termintitel -> Beschreibung -> Leistungen -> Fester Text"
                >
                    {activeBlock.tableConfig?.descriptionMode === 'static' ? '📌 Fester Text' : (activeBlock.tableConfig?.descriptionMode === 'appointment_tasks' ? '📋 Leistungen' : (activeBlock.tableConfig?.descriptionMode === 'appointment_desc' ? '📝 Beschreibung' : '🏷️ Termintitel'))}
                </button>
            {:else}
                <button type="button" onclick={() => handleInsertFormula('=SUM(ABOVE)')} class="px-1.5 py-1 rounded bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-bold text-[10px] hover:bg-violet-100 flex items-center gap-0.5" title="Summenformel"><Calculator class="w-3 h-3" /> =SUM</button>
                <button type="button" onclick={() => handleSort(true)} class="px-1.5 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px] font-medium hover:bg-neutral-100 flex items-center gap-0.5" title="Sortieren"><ArrowUpDown class="w-3 h-3" /> A-Z</button>
                <button type="button" onclick={handleConvertToText} class="px-1.5 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px] font-medium hover:bg-neutral-100 flex items-center gap-0.5 text-neutral-500" title="In Text"><FileText class="w-3 h-3" /> Text</button>
            {/if}
        </div>
    </div>

    <!-- Gruppe 5: Eigenschaften -->
    <div class="flex flex-col gap-1">
        <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Optionen</span>
        <button type="button" onclick={onOpenProperties} class="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer" title="Tabelleneigenschaften öffnen">
            <Settings2 class="w-3.5 h-3.5 text-violet-400" />
            <span>Optionen</span>
        </button>
    </div>
</div>
