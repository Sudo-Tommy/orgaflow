<script lang="ts">
    import type { WordBlock } from "./wordTypes";
    import { Plus, Trash2, Calculator } from "lucide-svelte";
    import { getAlignmentCss, getTextDirectionCss } from "./tableStylesHelper";
    import { evaluateFormula } from "./tableFormulasHelper";
    import { insertRow, insertColumn, deleteRow, deleteColumn } from "./tableOperationsHelper";

    let { 
        block = $bindable(), 
        isBorderPainterActive = false,
        onCellSelect 
    } = $props<{
        block: WordBlock;
        isBorderPainterActive?: boolean;
        onCellSelect?: (rIdx: number, cIdx: number) => void;
    }>();

    let activeCell = $state<{ r: number; c: number }>({ r: 0, c: 0 });

    function handleCellClick(rIdx: number, cIdx: number) {
        activeCell = { r: rIdx, c: cIdx };
        onCellSelect?.(rIdx, cIdx);

        if (isBorderPainterActive && block.tableData?.rows) {
            const row = block.tableData.rows[rIdx];
            if (row) {
                const cell = row[cIdx];
                const borderColor = block.tableConfig?.borderColor || '#cbd5e1';
                const borderWidth = block.tableConfig?.borderWidth || '1px';
                if (typeof cell === 'object') {
                    cell.style = cell.style || {};
                    cell.style.borderTop = `${borderWidth} solid ${borderColor}`;
                    cell.style.borderBottom = `${borderWidth} solid ${borderColor}`;
                    cell.style.borderLeft = `${borderWidth} solid ${borderColor}`;
                    cell.style.borderRight = `${borderWidth} solid ${borderColor}`;
                } else {
                    row[cIdx] = {
                        content: String(cell || ''),
                        style: {
                            borderTop: `${borderWidth} solid ${borderColor}`,
                            borderBottom: `${borderWidth} solid ${borderColor}`,
                            borderLeft: `${borderWidth} solid ${borderColor}`,
                            borderRight: `${borderWidth} solid ${borderColor}`
                        }
                    };
                }
            }
        }
    }

    function getCellContent(cell: any): string {
        return typeof cell === 'object' ? (cell?.content ?? '') : String(cell ?? '');
    }

    function setCellContent(rIdx: number, cIdx: number, val: string) {
        if (!block.tableData?.rows) return;
        const row = block.tableData.rows[rIdx];
        if (typeof row[cIdx] === 'object') {
            row[cIdx].content = val;
        } else {
            row[cIdx] = { content: val, style: {} };
        }
    }

    function getCellStyle(cell: any, rIdx: number, cIdx: number): string {
        const parts: string[] = [];
        const pad = block.tableConfig?.cellPadding ?? 6;
        parts.push(`padding: ${pad}px;`);

        if (typeof cell === 'object' && cell?.style) {
            if (cell.style.align) parts.push(getAlignmentCss(cell.style.align));
            if (cell.style.textDirection) parts.push(getTextDirectionCss(cell.style.textDirection));
            if (cell.style.backgroundColor) parts.push(`background-color: ${cell.style.backgroundColor};`);
            if (cell.style.color) parts.push(`color: ${cell.style.color};`);
            if (cell.style.fontWeight) parts.push(`font-weight: ${cell.style.fontWeight};`);
        }

        // Banded rows (Zebra)
        if (block.tableConfig?.isZebra && rIdx % 2 === 1) {
            parts.push(`background-color: ${block.tableConfig?.zebraColor || '#f8fafc'};`);
        }
        // First column highlight
        if (block.tableConfig?.firstColumnHighlight && cIdx === 0) {
            parts.push('font-weight: bold;');
        }

        return parts.join(' ');
    }
</script>

<div class="border border-neutral-300 dark:border-neutral-700 rounded-lg overflow-hidden shadow-xs relative">
    <table class="w-full text-left border-collapse" style="font-size: {block.tableConfig?.fontSize ? block.tableConfig.fontSize + 'pt' : '9.5pt'}; color: {block.tableConfig?.textColor || '#0f172a'};">
        {#if block.tableConfig?.showHeaders !== false}
            <thead 
                class="border-b border-neutral-300 dark:border-neutral-700" 
                style="background-color: {block.tableConfig?.headerBackgroundColor || '#f8fafc'}; color: {block.tableConfig?.textColor || block.tableConfig?.headerTextColor || '#0f172a'}; font-size: {block.tableConfig?.headerFontSize ? block.tableConfig.headerFontSize + 'pt' : (block.tableConfig?.fontSize ? block.tableConfig.fontSize + 'pt' : '9.5pt')};"
            >
                <tr>
                    {#each block.tableData?.headers || [] as header, hIdx}
                        <th class="p-2 border-r border-neutral-200 dark:border-neutral-700 last:border-r-0 relative group font-bold">
                            <input 
                                type="text" 
                                bind:value={block.tableData!.headers[hIdx]}
                                class="w-full bg-transparent font-bold outline-none text-inherit" 
                                style="font-size: inherit;"
                                placeholder="Überschrift"
                            />
                        </th>
                    {/each}
                </tr>
            </thead>
        {/if}

        <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
            {#each block.tableData?.rows || [] as row, rIdx}
                <tr class="group {activeCell.r === rIdx ? 'bg-violet-50/20 dark:bg-violet-950/10' : ''}">
                    {#each row as cell, cIdx}
                        {@const rawVal = getCellContent(cell)}
                        {@const isFormula = rawVal.startsWith('=')}
                        {@const displayVal = isFormula ? evaluateFormula(rawVal, rIdx, cIdx, block.tableData!.rows) : rawVal}
                        <td 
                            class="border-r border-neutral-200 dark:border-neutral-700 last:border-r-0 relative cursor-text {activeCell.r === rIdx && activeCell.c === cIdx ? 'ring-2 ring-violet-500/80 z-10' : ''}"
                            style={getCellStyle(cell, rIdx, cIdx)}
                            onclick={() => handleCellClick(rIdx, cIdx)}
                        >
                            {#if isFormula}
                                <div class="flex items-center gap-1 font-bold text-violet-700 dark:text-violet-300">
                                    <Calculator class="w-3 h-3 shrink-0" />
                                    <span>{displayVal}</span>
                                </div>
                            {:else}
                                <input 
                                    type="text" 
                                    value={rawVal}
                                    oninput={(e) => setCellContent(rIdx, cIdx, e.currentTarget.value)}
                                    class="w-full bg-transparent outline-none text-neutral-800 dark:text-neutral-200" 
                                    style="font-size: inherit;"
                                    placeholder="Text..."
                                />
                            {/if}
                        </td>
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
    
    <!-- Quick Add Footer -->
    <div class="p-1.5 bg-neutral-50 dark:bg-neutral-800/60 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs select-none">
        <button type="button" onclick={() => insertRow(block, (block.tableData?.rows.length || 1) - 1, 'below')} class="flex items-center gap-1 text-violet-600 font-bold hover:underline cursor-pointer">
            <Plus class="w-3.5 h-3.5" /> Zeile hinzufügen
        </button>
        <button type="button" onclick={() => insertColumn(block, (block.tableData?.headers.length || 1) - 1, 'right')} class="flex items-center gap-1 text-violet-600 font-bold hover:underline cursor-pointer">
            <Plus class="w-3.5 h-3.5" /> Spalte hinzufügen
        </button>
    </div>
</div>
