<script lang="ts">
    import type { WordBlock } from "./wordTypes";
    import { htmlToWysiwyg, wysiwygToHtml } from "./wordVariables";
    import { 
        addColumn, 
        deleteColumn, 
        setColumnsCount, 
        distributeColumnsEvenly, 
        applyColumnsPreset, 
        startSplitterDrag, 
        renderColumnPreview 
    } from "./columnsOperationsHelper";
    import { 
        Repeat, 
        Columns2, 
        Columns3, 
        Columns4, 
        Plus, 
        Trash2, 
        StretchHorizontal, 
        AlignLeft, 
        AlignCenter, 
        AlignRight 
    } from "lucide-svelte";

    let { 
        block = $bindable(), 
        isSelected,
        isPreview = false,
        onFocus 
    } = $props<{
        block: WordBlock;
        isSelected: boolean;
        isPreview?: boolean;
        onFocus: () => void;
    }>();

    let containerRef: HTMLElement | null = $state(null);
    let columns = $derived(block.columnsConfig?.columns || []);
    let count = $derived(block.columnsConfig?.count || columns.length || 2);
    let repeatOnAllPages = $derived(block.columnsConfig?.repeatOnAllPages ?? false);
    let borderTop = $derived(block.columnsConfig?.borderTop ?? false);
    let activeColIdx = $derived(block.columnsConfig?.selectedColIndex ?? 0);
    let returnAddressFontSize = $derived(block.columnsConfig?.returnAddressFontSize ?? 7);

    function setReturnAddressFontSize(size: number) {
        if (!block.columnsConfig) return;
        block.columnsConfig.returnAddressFontSize = size;
    }

    function columnContentAction(node: HTMLElement, params: { content: string }) {
        node.innerHTML = htmlToWysiwyg(params.content);
        return {
            update(newParams: { content: string }) {
                if (typeof document !== 'undefined' && document.activeElement === node) return;
                const currentHtml = wysiwygToHtml(node.innerHTML);
                if (currentHtml !== newParams.content) {
                    node.innerHTML = htmlToWysiwyg(newParams.content);
                }
            }
        };
    }

    function handleColumnInput(e: Event, index: number) {
        const el = e.currentTarget as HTMLElement;
        if (!block.columnsConfig?.columns[index]) return;
        block.columnsConfig.columns[index].content = wysiwygToHtml(el.innerHTML);
    }

    function handleColumnBlur(e: Event, index: number) {
        const el = e.currentTarget as HTMLElement;
        if (!block.columnsConfig?.columns[index]) return;
        block.columnsConfig.columns[index].content = wysiwygToHtml(el.innerHTML);
    }

    function handleColumnKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.execCommand('insertLineBreak');
        }
    }

    function handleColumnFocus(index: number) {
        if (!block.columnsConfig) return;
        block.columnsConfig.selectedColIndex = index;
        onFocus();
    }

    function toggleRepeat() { if (block.columnsConfig) block.columnsConfig.repeatOnAllPages = !block.columnsConfig.repeatOnAllPages; }
    function toggleBorder() { if (block.columnsConfig) block.columnsConfig.borderTop = !block.columnsConfig.borderTop; }

    function setColAlign(al: 'left' | 'center' | 'right') {
        if (!block.columnsConfig?.columns[activeColIdx]) return;
        block.columnsConfig.columns[activeColIdx].textAlign = al;
    }

    function handleDeleteCurrentColumn() {
        const transformed = deleteColumn(block, activeColIdx);
        onFocus();
    }

    const isHeaderAddress = $derived(Boolean(block.id?.includes('head_cols') || block.columnsConfig?.columns?.some((c: any) => c.id?.includes('recipient') || c.id?.includes('anschrift') || String(c.content).includes('return_address'))));
    const marginBottomStyle = $derived(isHeaderAddress && (block.style?.marginBottom === undefined || block.style?.marginBottom < 60) ? '110px' : (block.style?.marginBottom ? block.style.marginBottom + 'px' : '8px'));
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="my-2 select-text" onclick={onFocus} role="region" aria-label="Mehrspaltiger Bereich" style="--ret-font-size: {returnAddressFontSize}pt; margin-bottom: {marginBottomStyle};">
    {#if isSelected && !isPreview && block.columnsConfig}
        <!-- Controls Toolbar -->
        <div class="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 mb-1.5 border-b border-neutral-200 dark:border-neutral-700 text-xs">
            <div class="flex flex-wrap items-center gap-1">
                <span class="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1 mr-1">
                    {#if count === 2}<Columns2 class="w-3.5 h-3.5" />{:else if count === 3}<Columns3 class="w-3.5 h-3.5" />{:else}<Columns4 class="w-3.5 h-3.5" />{/if}
                    {count} Spalten
                </span>

                <!-- Spaltenzahl 2, 3, 4 -->
                <div class="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded p-0.5">
                    {#each [2, 3, 4] as n}
                        <button type="button" onclick={() => setColumnsCount(block, n as 2 | 3 | 4)} class="px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer {count === n ? 'bg-white dark:bg-neutral-700 text-violet-600 shadow-xs' : 'text-neutral-600 dark:text-neutral-400'}" title="{n} Spalten">{n}</button>
                    {/each}
                </div>

                <!-- Spalte hinzufügen / löschen -->
                <button type="button" onclick={() => addColumn(block)} disabled={count >= 4} class="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 disabled:opacity-30 cursor-pointer" title="Weitere Spalte rechts hinzufügen (max. 4)">
                    <Plus class="w-3 h-3 text-violet-600" /> Spalte
                </button>
                <button type="button" onclick={handleDeleteCurrentColumn} class="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 cursor-pointer" title="Aktive Spalte löschen (bei 1 verbleibender Spalte autom. einfacher Absatz)">
                    <Trash2 class="w-3 h-3 text-rose-600" /> Spalte {activeColIdx + 1}
                </button>

                <div class="h-3 w-px bg-neutral-200 dark:bg-neutral-700 mx-0.5"></div>

                <!-- Breiten Presets & Gleichmäßig verteilen -->
                <button type="button" onclick={() => distributeColumnsEvenly(columns)} class="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer" title="Breiten gleichmäßig aufteilen">
                    <StretchHorizontal class="w-3 h-3 text-emerald-600" /> Verteilen
                </button>
                {#if count === 2}
                    <button type="button" onclick={() => applyColumnsPreset(block, '50/50')} class="px-1 py-0.5 rounded text-[10px] font-mono bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">50/50</button>
                    <button type="button" onclick={() => applyColumnsPreset(block, '40/60')} class="px-1 py-0.5 rounded text-[10px] font-mono bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">40/60</button>
                    <button type="button" onclick={() => applyColumnsPreset(block, '60/40')} class="px-1 py-0.5 rounded text-[10px] font-mono bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">60/40</button>
                {:else if count === 3}
                    <button type="button" onclick={() => applyColumnsPreset(block, 'wide-left')} class="px-1 py-0.5 rounded text-[10px] font-mono bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">40/30/30</button>
                    <button type="button" onclick={() => applyColumnsPreset(block, 'wide-center')} class="px-1 py-0.5 rounded text-[10px] font-mono bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">25/50/25</button>
                {/if}
            </div>

            <div class="flex flex-wrap items-center gap-1">
                <!-- Textausrichtung für aktive Spalte -->
                <div class="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded p-0.5">
                    <button type="button" onclick={() => setColAlign('left')} class="p-1 hover:bg-white dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-300 {columns[activeColIdx]?.textAlign === 'left' ? 'text-violet-600 font-bold bg-white dark:bg-neutral-700' : ''}" title="Aktive Spalte linksbündig"><AlignLeft class="w-3 h-3" /></button>
                    <button type="button" onclick={() => setColAlign('center')} class="p-1 hover:bg-white dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-300 {columns[activeColIdx]?.textAlign === 'center' ? 'text-violet-600 font-bold bg-white dark:bg-neutral-700' : ''}" title="Aktive Spalte zentriert"><AlignCenter class="w-3 h-3" /></button>
                    <button type="button" onclick={() => setColAlign('right')} class="p-1 hover:bg-white dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-300 {columns[activeColIdx]?.textAlign === 'right' ? 'text-violet-600 font-bold bg-white dark:bg-neutral-700' : ''}" title="Aktive Spalte rechtsbündig"><AlignRight class="w-3 h-3" /></button>
                </div>

                <div class="h-3 w-px bg-neutral-200 dark:bg-neutral-700 mx-0.5"></div>

                <!-- Rücksendeadresse Schriftgröße -->
                <div class="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded px-1.5 py-0.5" title="Schriftgröße für die DIN 5008 Rücksendeadresse">
                    <span class="text-[10px] text-neutral-500 font-medium">Absender:</span>
                    <select 
                        value={returnAddressFontSize}
                        onchange={(e) => setReturnAddressFontSize(parseFloat(e.currentTarget.value))}
                        class="bg-transparent text-[10px] font-bold text-violet-600 dark:text-violet-400 outline-none cursor-pointer"
                    >
                        <option value={6}>6 pt</option>
                        <option value={6.5}>6,5 pt</option>
                        <option value={7}>7 pt (Standard)</option>
                        <option value={7.5}>7,5 pt</option>
                        <option value={8}>8 pt</option>
                        <option value={9}>9 pt</option>
                        <option value={10}>10 pt</option>
                    </select>
                </div>

                <div class="h-3 w-px bg-neutral-200 dark:bg-neutral-700 mx-0.5"></div>

                <button type="button" onclick={toggleBorder} class="px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors {borderTop ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800'}" title="Trennlinie oben an/aus">Linie</button>
                <button type="button" onclick={toggleRepeat} class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors {repeatOnAllPages ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800'}" title="Auf allen Folgeseiten wiederholen"><Repeat class="w-2.5 h-2.5" /><span>Folgeseiten</span></button>
            </div>
        </div>
    {/if}

    <!-- Columns Container with Draggable Splitters between ALL Columns -->
    <div 
        bind:this={containerRef}
        class="flex items-start gap-1 pt-2 relative {borderTop ? 'border-t border-neutral-300 dark:border-neutral-700' : ''}"
    >
        {#each columns as col, cIdx}
            {@const widthStyle = col.widthPercent ? `flex: 0 0 ${col.widthPercent}%; max-width: ${col.widthPercent}%;` : 'flex: 1;'}
            <div style="{widthStyle}" class="min-w-0">
                {#if isPreview}
                    <div 
                        class="text-[8.5pt] text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed"
                        style="text-align: {col.textAlign || (cIdx === 1 && count === 2 ? 'right' : 'left')};"
                    >
                        {@html renderColumnPreview(col.content || '', returnAddressFontSize)}
                    </div>
                {:else}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                        contenteditable="true"
                        use:columnContentAction={{ content: col.content || '' }}
                        onfocus={() => handleColumnFocus(cIdx)}
                        onclick={() => handleColumnFocus(cIdx)}
                        oninput={(e) => handleColumnInput(e, cIdx)}
                        onblur={(e) => handleColumnBlur(e, cIdx)}
                        onkeydown={handleColumnKeydown}
                        style="text-align: {col.textAlign || (cIdx === 1 && count === 2 ? 'right' : 'left')};"
                        class="min-h-12 text-[9.5pt] text-neutral-800 dark:text-neutral-200 p-2 rounded-lg border border-dashed transition-all outline-none whitespace-pre-wrap leading-[1.45] empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-300 {activeColIdx === cIdx && isSelected ? 'border-violet-400 bg-violet-50/20 dark:bg-violet-950/10 ring-1 ring-violet-400/40' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'}"
                        data-placeholder={`Spalte ${cIdx + 1} (${col.widthPercent ? Math.round(col.widthPercent) + '%' : ''})...`}
                    ></div>
                {/if}
            </div>

            <!-- Draggable Splitter between all neighboring columns -->
            {#if cIdx < columns.length - 1 && !isPreview}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                    class="w-3 self-stretch flex items-center justify-center cursor-col-resize group/split touch-none hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded py-2 transition-colors select-none"
                    onpointerdown={(e) => startSplitterDrag(e, block, cIdx, containerRef)}
                    title={`Spaltenteiler zwischen Spalte ${cIdx + 1} und ${cIdx + 2} ziehen (${Math.round(col.widthPercent || 0)}% / ${Math.round(columns[cIdx + 1]?.widthPercent || 0)}%)`}
                >
                    <div class="w-1 h-8 bg-neutral-300 dark:bg-neutral-600 group-hover/split:bg-violet-600 rounded-full transition-colors"></div>
                </div>
            {/if}
        {/each}
    </div>
</div>

<style>
    :global(.orga-return-chip) {
        font-size: var(--ret-font-size, 7pt) !important;
        text-decoration: underline !important;
        color: #4b5563 !important;
        background: transparent !important;
        border: none !important;
        padding: 0 !important;
        display: inline-block;
        margin-bottom: 2px;
        line-height: 1.35 !important;
        box-shadow: none !important;
    }
</style>
