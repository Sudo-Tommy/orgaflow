<script lang="ts">
    import type { CanvasField } from "$lib/services/editorService.svelte";

    interface Props {
        field: CanvasField;
        elementHeight: number;
    }

    let { field = $bindable(), elementHeight = $bindable() }: Props = $props();
</script>

<div bind:clientHeight={elementHeight} class="w-full h-full bg-transparent">
    <table class="w-full text-left border-collapse table-fixed" style="font-size: {field.tableConfig?.fontSize ? field.tableConfig.fontSize + 'px' : '12px'};">
        {#if field.tableConfig?.showHeaders !== false}
            <thead>
                <tr style="background-color: {field.tableConfig?.headerBackgroundColor || '#f4f4f5'}; color: {field.tableConfig?.headerTextColor || '#000'}; border-bottom: {(field.tableConfig?.showBorderHeader ?? true) ? (field.tableConfig?.borderWidth || 1) + 'px solid ' + (field.tableConfig?.borderColor || '#cbd5e1') : 'none'};">
                    {#each field.tableConfig?.columns || [] as col}
                        <th style="padding: {field.tableConfig?.cellPadding ?? 6}px 4px; width: {col.width}%; text-align: {field.tableConfig?.headerTextAlign || col.align}; font-weight: bold;">
                            <input type="text" bind:value={col.name} class="bg-transparent outline-none w-full hover:bg-black/5 rounded transition-colors" style="text-align: inherit; font-weight: inherit;" />
                        </th>
                    {/each}
                </tr>
            </thead>
        {/if}
        <tbody class="text-neutral-600">
            {#if field.tableConfig?.includeTimeRecords !== false}
                <tr style="border-bottom: {(field.tableConfig?.showBorderRows ?? true) ? ((field.tableConfig?.borderWidth || 1) * 0.5) + 'px solid ' + (field.tableConfig?.borderColor || '#cbd5e1') : 'none'}; vertical-align: {field.tableConfig?.rowVerticalAlign || 'top'};">
                    {#each field.tableConfig?.columns || [] as col}
                        <td style="padding: {field.tableConfig?.cellPadding ?? 6}px 4px; text-align: {col.align};" class="truncate">{col.type === 'pos' ? '1' : col.type === 'date' ? '12.05.2026' : col.type === 'duration' ? '2.00 h' : col.type === 'title' ? (field.tableConfig.staticDescription || 'Betreuung: Alltagshilfe') : col.type === 'price' ? '40,00 €' : '80,00 €'}</td>
                    {/each}
                </tr>
            {/if}
            {#if field.tableConfig?.includeDriveLumpSum !== false}
                <tr style="border-bottom: {(field.tableConfig?.showBorderRows ?? true) ? ((field.tableConfig?.borderWidth || 1) * 0.5) + 'px solid ' + (field.tableConfig?.borderColor || '#cbd5e1') : 'none'}; vertical-align: {field.tableConfig?.rowVerticalAlign || 'top'};">
                    {#each field.tableConfig?.columns || [] as col}
                        <td style="padding: {field.tableConfig?.cellPadding ?? 6}px 4px; text-align: {col.align};" class="truncate">{col.type === 'pos' ? '2' : col.type === 'date' ? '12.05.2026' : col.type === 'duration' ? '1' : col.type === 'title' ? 'Anfahrt' : col.type === 'price' ? '5,00 €' : '5,00 €'}</td>
                    {/each}
                </tr>
            {/if}
            {#if field.tableConfig?.includeDriveKm !== false}
                <tr style="border-bottom: {(field.tableConfig?.showBorderRows ?? true) ? ((field.tableConfig?.borderWidth || 1) * 0.5) + 'px solid ' + (field.tableConfig?.borderColor || '#cbd5e1') : 'none'}; vertical-align: {field.tableConfig?.rowVerticalAlign || 'top'};">
                    {#each field.tableConfig?.columns || [] as col}
                        <td style="padding: {field.tableConfig?.cellPadding ?? 6}px 4px; text-align: {col.align};" class="truncate">{col.type === 'pos' ? '3' : col.type === 'date' ? '12.05.2026' : col.type === 'duration' ? '15 km' : col.type === 'title' ? 'Fahrtkosten (15 km)' : col.type === 'price' ? '0,30 €' : '4,50 €'}</td>
                    {/each}
                </tr>
            {/if}
            {#if field.tableConfig?.includeExpenditures !== false}
                <tr style="border-bottom: {(field.tableConfig?.showBorderRows ?? true) ? ((field.tableConfig?.borderWidth || 1) * 0.5) + 'px solid ' + (field.tableConfig?.borderColor || '#cbd5e1') : 'none'}; vertical-align: {field.tableConfig?.rowVerticalAlign || 'top'};">
                    {#each field.tableConfig?.columns || [] as col}
                        <td style="padding: {field.tableConfig?.cellPadding ?? 6}px 4px; text-align: {col.align};" class="truncate">{col.type === 'pos' ? '4' : col.type === 'date' ? '12.05.2026' : col.type === 'duration' ? '1' : col.type === 'title' ? 'Auslage: Apothekeneinkauf' : col.type === 'price' ? '14,50 €' : '14,50 €'}</td>
                    {/each}
                </tr>
            {/if}
        </tbody>
    </table>
    <!-- Dummy Footer -->
    {#if field.tableConfig?.includeTotalNetto !== false || field.tableConfig?.includeTotalTax !== false || field.tableConfig?.includeTotalBrutto !== false}
        <div class="ml-auto mt-3.75 pt-2.5 flex flex-col" style="width: {field.tableConfig?.footerWidth ?? 200}px; border-top: {field.tableConfig?.borderWidth || 1}px solid {field.tableConfig?.borderColor || '#cbd5e1'}; font-size: {field.tableConfig?.fontSize ? field.tableConfig.fontSize + 'px' : '12px'}; text-align: {field.tableConfig?.footerTextAlign || 'right'};">
            {#if field.tableConfig?.includeTotalNetto !== false}
                <div class="flex justify-between mb-1"><span>Netto:</span> <span>104,00 €</span></div>
            {/if}
            {#if field.tableConfig?.includeTotalTax !== false}
                <div class="flex justify-between mb-1"><span>MwSt (0%):</span> <span>0,00 €</span></div>
            {/if}
            {#if field.tableConfig?.includeTotalBrutto !== false}
                <div class="flex justify-between font-bold" style="font-size: {field.tableConfig?.fontSize ? (field.tableConfig.fontSize + 1) + 'px' : '13px'};"><span>Gesamt:</span> <span>104,00 €</span></div>
            {/if}
        </div>
    {/if}
</div>
