<script lang="ts">
    import FinanceContractCard from "./FinanceContractCard.svelte";

    let {
        contracts = [],
        tileSize = $bindable(33.33),
        onAddContract = () => {},
        onBookContract = () => {},
        onEditContract = () => {},
        onDeleteContract = () => {}
    }: {
        contracts?: any[];
        tileSize?: number;
        onAddContract?: () => void;
        onBookContract?: (c: any) => void;
        onEditContract?: (c: any) => void;
        onDeleteContract?: (id: string) => void;
    } = $props();
</script>

<div class="xl:col-span-5 orga-card-white overflow-hidden flex flex-col">
    <div class="p-3.5 sm:p-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between bg-neutral-50/50 gap-3">
        <div class="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
            <div>
                <h3 class="font-bold text-neutral-900 text-sm sm:text-base">Laufende Verträge</h3>
                <span class="text-[11px] text-neutral-400 font-medium">{contracts.length} Verträge erfasst</span>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                <span>Zoom:</span>
                <select bind:value={tileSize} class="orga-input py-1 px-2 text-xs bg-white border border-neutral-200 rounded-lg text-neutral-700 cursor-pointer">
                    <option value={100}>100%</option>
                    <option value={50}>50%</option>
                    <option value={33.33}>33%</option>
                    <option value={25}>25%</option>
                </select>
            </div>
        </div>
        <button onclick={onAddContract} class="orga-button-primary w-full sm:w-auto py-2 px-3.5 text-xs font-bold">Vertrag hinzufügen</button>
    </div>
    <div class="p-3 sm:p-4 flex-1">
        {#if contracts.length === 0}
            <p class="p-8 text-center text-neutral-400 italic text-sm">Noch keine Verträge erfasst.</p>
        {:else}
            <div class="flex flex-wrap gap-3 sm:gap-4">
                {#each contracts as c}
                    <FinanceContractCard contract={c} {tileSize} onBook={onBookContract} onEdit={onEditContract} onDelete={onDeleteContract} />
                {/each}
            </div>
        {/if}
    </div>
</div>
