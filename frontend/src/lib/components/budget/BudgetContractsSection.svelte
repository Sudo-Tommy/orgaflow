<script lang="ts">
    import { Repeat, Plus } from 'lucide-svelte';
    import ContractCard from './ContractCard.svelte';
    import type { Contract } from '$lib/types/budget';
    import type { BudgetActions } from './useBudgetActions.svelte';

    interface Props {
        contracts: Contract[];
        actions: BudgetActions;
        selectedYear: number;
        selectedMonth: number;
        timeFilter: string;
        onNewContract: () => void;
        onEditContract: (contract: Contract) => void;
    }

    let {
        contracts,
        actions,
        selectedYear,
        selectedMonth,
        timeFilter,
        onNewContract,
        onEditContract
    }: Props = $props();
</script>

<section class="space-y-4">
    <div class="flex items-center justify-between">
        <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Repeat class="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span>Laufende Verträge & Fixkosten ({contracts.length})</span>
        </h2>
    </div>

    {#if contracts.length === 0}
        <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <Repeat class="mx-auto h-10 w-10 text-slate-400 mb-2" />
            <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">Keine Verträge gefunden</h3>
            <p class="text-sm text-slate-500 mt-1">Legen Sie Daueraufträge, Versicherungen oder Software-Abos an.</p>
            <button
                type="button"
                onclick={onNewContract}
                class="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-purple-700 active:scale-95 cursor-pointer touch-manipulation"
            >
                <Plus class="h-4 w-4" />
                <span>Vertrag anlegen</span>
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {#each contracts as contract (contract.id)}
                <ContractCard
                    {contract}
                    onBookNow={(c) => actions.handleBookContractNow(c, selectedYear, selectedMonth, timeFilter)}
                    onToggleStatus={actions.handleToggleContractStatus.bind(actions)}
                    onEdit={onEditContract}
                    onDelete={actions.handleDeleteContract.bind(actions)}
                />
            {/each}
        </div>
    {/if}
</section>
