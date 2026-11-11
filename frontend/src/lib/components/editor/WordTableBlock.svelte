<script lang="ts">
    import type { WordBlock } from "./wordTypes";
    import WordTableResizeHandle from "./WordTableResizeHandle.svelte";
    import WordStaticTableBlock from "./WordStaticTableBlock.svelte";
    import { resizeColumnPair } from "./tableStylesHelper";

    let { block = $bindable(), isSelected, zoom = 1, onFocus } = $props<{
        block: WordBlock;
        isSelected: boolean;
        zoom?: number;
        onFocus: () => void;
    }>();

    let tableWrapperEl = $state<HTMLElement | null>(null);

    function handleResize(index: number, deltaPct: number) {
        if (!block.tableConfig?.columns) return;
        resizeColumnPair(block.tableConfig.columns, index, deltaPct);
    }

    const sampleRows = $derived.by(() => {
        const showUnits = block.tableConfig?.showPriceUnits !== false;
        return [
            {
                pos: '1',
                date: '07.08.2026',
                duration: '2,75 h',
                title: block.tableConfig?.descriptionMode === 'static' 
                    ? (block.tableConfig?.staticDescription || 'Begleitung Arztbesuch') 
                    : (block.tableConfig?.descriptionMode === 'appointment_tasks'
                        ? 'Alltagsbegleitung, Besorgungen & Einkauf'
                        : (block.tableConfig?.descriptionMode === 'appointment_desc'
                            ? 'Unterstützung im Haushalt (Beschreibung)'
                            : 'Begleitung Arztbesuch (Termintitel)')),
                price: showUnits ? '40,00 €/Std.' : '40,00 €',
                total: '110,00 €'
            },
            {
                pos: '2',
                date: '07.08.2026',
                duration: '1',
                title: block.tableConfig?.descriptionMode === 'static' 
                    ? (block.tableConfig?.staticDescription || 'Begleitung Arztbesuch') 
                    : 'Anfahrt',
                price: '6,50 €',
                total: '6,50 €'
            },
            {
                pos: '3',
                date: '07.08.2026',
                duration: '10 km',
                title: block.tableConfig?.descriptionMode === 'static' 
                    ? (block.tableConfig?.staticDescription || 'Begleitung Arztbesuch') 
                    : 'Fahrtkosten (10 km)',
                price: showUnits ? '0,85 €/km' : '0,85 €',
                total: '8,50 €'
            }
        ];
    });

    const dividerColor = $derived((block.tableConfig?.borderColor && block.tableConfig.borderColor !== 'transparent') ? block.tableConfig.borderColor : '#cbd5e1');
    const cellPaddingY = $derived(block.tableConfig?.cellPadding !== undefined ? `${block.tableConfig.cellPadding}mm` : '1.8mm');
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div 
    bind:this={tableWrapperEl}
    class="my-2 select-text" 
    onclick={onFocus} 
    role="region" 
    aria-label="Tabelle"
>
    {#if block.type === 'billing_table'}
        <div class="w-full my-1">
            <table 
                class="w-full text-left border-collapse table-fixed my-1"
                style="font-size: {block.tableConfig?.fontSize ? block.tableConfig.fontSize + 'pt' : '9.5pt'}; color: {block.tableConfig?.textColor || block.tableConfig?.headerTextColor || '#000000'};"
            >
                {#if block.tableConfig?.showHeaders !== false}
                    <thead>
                        <tr style="background-color: {block.tableConfig?.headerBackgroundColor || '#f4f4f5'}; color: {block.tableConfig?.textColor || block.tableConfig?.headerTextColor || '#000000'}; font-size: {block.tableConfig?.headerFontSize ? block.tableConfig.headerFontSize + 'pt' : (block.tableConfig?.fontSize ? block.tableConfig.fontSize + 'pt' : '9.5pt')};">
                            {#each block.tableConfig?.columns || [] as col, idx}
                                <th 
                                    class="font-bold relative select-none align-middle" 
                                    style="width: {col.width}%; text-align: {col.align || (col.type === 'price' || col.type === 'total' ? 'right' : 'left')}; padding: {cellPaddingY} 2.2mm; border-bottom: {block.tableConfig?.borderMode === 'none' || block.tableConfig?.borderColor === 'transparent' ? 'none' : '1.5px solid ' + (block.tableConfig?.borderColor || '#cbd5e1')}; background-color: {block.tableConfig?.headerBackgroundColor || '#f4f4f5'}; color: {block.tableConfig?.textColor || block.tableConfig?.headerTextColor || '#000000'}; font-size: {block.tableConfig?.headerFontSize ? block.tableConfig.headerFontSize + 'pt' : (block.tableConfig?.fontSize ? block.tableConfig.fontSize + 'pt' : '9.5pt')};"
                                    onclick={() => {
                                        if (block.tableConfig) block.tableConfig._selectedColIdx = idx;
                                    }}
                                >
                                    <input 
                                        type="text" 
                                        bind:value={col.name}
                                        onfocus={() => {
                                            if (block.tableConfig) block.tableConfig._selectedColIdx = idx;
                                        }}
                                        class="w-full bg-transparent font-bold outline-none text-inherit p-0 border-none hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
                                        style="text-align: {col.align || (col.type === 'price' || col.type === 'total' ? 'right' : 'left')}; font-size: inherit;"
                                        title="Spaltentitel bearbeiten: {col.name}"
                                    />

                                    <!-- Unscheinbarer Zieh-Griff für Spaltenbreite (Word-Style) -->
                                    {#if idx < (block.tableConfig?.columns?.length || 0) - 1}
                                        <WordTableResizeHandle 
                                            columnIndex={idx}
                                            tableElement={tableWrapperEl}
                                            {zoom}
                                            onResize={handleResize}
                                        />
                                    {/if}
                                </th>
                            {/each}
                        </tr>
                    </thead>
                {/if}
                <tbody style="color: {block.tableConfig?.textColor || '#111827'};">
                    {#each sampleRows as sRow, rIdx}
                        {@const isZebraRow = block.tableConfig?.isZebra && rIdx % 2 === 1}
                        <tr 
                            class="{block.tableConfig?.showBorderRows ? 'border-b border-neutral-200 dark:border-neutral-800' : ''}"
                            style={isZebraRow ? `background-color: ${block.tableConfig?.zebraColor || '#f8fafc'};` : 'background-color: transparent;'}
                        >
                            {#each block.tableConfig?.columns || [] as col, cIdx}
                                {@const align = col.align || (col.type === 'price' || col.type === 'total' ? 'right' : 'left')}
                                {@const isBold = col.type === 'total' || (block.tableConfig?.firstColumnHighlight && cIdx === 0)}
                                <td 
                                    class="break-words {isBold ? 'font-semibold' : ''}" 
                                    style="text-align: {align}; padding: {cellPaddingY} 2.2mm; vertical-align: top;"
                                >
                                    {(sRow as any)[col.type] || '...'}
                                </td>
                            {/each}
                        </tr>
                    {/each}
                </tbody>

                <!-- Summenzeilen 1:1 wie im PDF: schlicht, transparent, rechtsbündig -->
                <tfoot style="color: {block.tableConfig?.textColor || '#111827'};">
                    {#if block.tableConfig?.includeTotalNetto !== false}
                        {@const showLine = block.tableConfig?.showTotalDivider !== false}
                        {@const showFullLine = showLine && block.tableConfig?.dividerScope !== 'totals'}
                        <tr class="font-normal">
                            <td colspan={(block.tableConfig?.columns?.length || 2) - 1} style="padding: {cellPaddingY} 2.2mm; text-align: right; {showFullLine ? `border-top: 1.5px solid ${dividerColor};` : ''}">
                                <input 
                                    type="text" 
                                    bind:value={block.tableConfig!.labelNetto} 
                                    placeholder="Netto:"
                                    class="bg-transparent text-right outline-none text-inherit hover:bg-black/5 dark:hover:bg-white/5 px-1 rounded transition-colors"
                                    style="font-size: inherit;"
                                />
                            </td>
                            <td style="padding: {cellPaddingY} 2.2mm; text-align: right; {showLine ? `border-top: 1.5px solid ${dividerColor};` : ''}">125,00 €</td>
                        </tr>
                    {/if}
                    {#if block.tableConfig?.includeTotalTax !== false}
                        {@const showLine = block.tableConfig?.includeTotalNetto === false && block.tableConfig?.showTotalDivider !== false}
                        {@const showFullLine = showLine && block.tableConfig?.dividerScope !== 'totals'}
                        <tr class="font-normal">
                            <td colspan={(block.tableConfig?.columns?.length || 2) - 1} style="padding: {cellPaddingY} 2.2mm; text-align: right; {showFullLine ? `border-top: 1.5px solid ${dividerColor};` : ''}">
                                <input 
                                    type="text" 
                                    bind:value={block.tableConfig!.labelTax} 
                                    placeholder="MwSt (19%):"
                                    class="bg-transparent text-right outline-none text-inherit hover:bg-black/5 dark:hover:bg-white/5 px-1 rounded transition-colors max-w-full"
                                    style="font-size: inherit;"
                                />
                            </td>
                            <td style="padding: {cellPaddingY} 2.2mm; text-align: right; {showLine ? `border-top: 1.5px solid ${dividerColor};` : ''}">23,75 €</td>
                        </tr>
                    {/if}
                    {#if block.tableConfig?.includeTotalBrutto !== false}
                        {@const showLine = block.tableConfig?.includeTotalNetto === false && block.tableConfig?.includeTotalTax === false && block.tableConfig?.showTotalDivider !== false}
                        {@const showFullLine = showLine && block.tableConfig?.dividerScope !== 'totals'}
                        <tr class="font-bold" style="font-size: calc({block.tableConfig?.fontSize || 9.5}pt + 0.5pt);">
                            <td colspan={(block.tableConfig?.columns?.length || 2) - 1} style="padding: {cellPaddingY} 2.2mm; text-align: right; {showFullLine ? `border-top: 1.5px solid ${dividerColor};` : ''}">
                                <input 
                                    type="text" 
                                    bind:value={block.tableConfig!.labelBrutto} 
                                    placeholder="Gesamt:"
                                    class="bg-transparent text-right font-bold outline-none text-inherit hover:bg-black/5 dark:hover:bg-white/5 px-1 rounded transition-colors"
                                    style="font-size: inherit;"
                                />
                            </td>
                            <td style="padding: {cellPaddingY} 2.2mm; text-align: right; font-weight: bold; {showLine ? `border-top: 1.5px solid ${dividerColor};` : ''}">148,75 €</td>
                        </tr>
                    {/if}
                </tfoot>
            </table>
        </div>
    {:else}
        <WordStaticTableBlock bind:block />
    {/if}
</div>
