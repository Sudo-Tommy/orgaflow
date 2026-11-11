<script lang="ts">
    import FinanceTransactionCard from "./FinanceTransactionCard.svelte";
    import FinanceTransactionsTable from "./FinanceTransactionsTable.svelte";

    let {
        transactions = [],
        showAll = $bindable(false),
        displayMode = $bindable('grid'),
        typeFilter = $bindable('all'),
        searchQuery = $bindable(''),
        sortBy = $bindable('date_desc'),
        periodLabel = '',
        isScanning = false,
        onScanClick = () => {},
        onExportCsv = () => {},
        onBookDueContracts = () => {},
        onNewTransaction = () => {},
        onStorno = () => {},
        onEdit = () => {},
        onDelete = () => {},
        onBookNextInstallment = () => {}
    }: {
        transactions: any[];
        showAll?: boolean;
        displayMode?: 'grid' | 'table';
        typeFilter?: 'all' | 'income' | 'expense' | 'invoice' | 'contract';
        searchQuery?: string;
        sortBy?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
        periodLabel?: string;
        isScanning?: boolean;
        onScanClick?: () => void;
        onExportCsv?: () => void;
        onBookDueContracts?: () => void;
        onNewTransaction?: () => void;
        onStorno?: (t: any) => void;
        onEdit?: (t: any) => void;
        onDelete?: (id: string) => void;
        onBookNextInstallment?: (t: any) => void;
    } = $props();
</script>

<div class="xl:col-span-7 orga-card-white overflow-hidden flex flex-col">
    <div class="p-3.5 sm:p-4 border-b border-neutral-100 flex flex-col gap-3 bg-neutral-50/50">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-2">
                <h3 class="font-bold text-neutral-900 text-sm sm:text-base flex items-center gap-2">
                    <span>{showAll ? 'Alle Buchungen' : `Buchungen (${periodLabel})`}</span>
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{transactions.length}</span>
                </h3>
                <button onclick={() => showAll = !showAll} class="text-[11px] font-bold px-2 py-1 rounded-lg border {showAll ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-neutral-600 border-neutral-200'}">
                    {showAll ? '📅 Monat' : '🌐 Alle'}
                </button>
                <div class="inline-flex rounded-lg border border-neutral-200 p-0.5 bg-white">
                    <button type="button" onclick={() => displayMode = 'grid'} class="px-2 py-1 text-xs font-semibold rounded-md {displayMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-neutral-600'}">⊞</button>
                    <button type="button" onclick={() => displayMode = 'table'} class="px-2 py-1 text-xs font-semibold rounded-md {displayMode === 'table' ? 'bg-indigo-600 text-white' : 'text-neutral-600'}">☰</button>
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-1.5 justify-end">
                <button type="button" onclick={onExportCsv} class="orga-button-ghost py-1.5 px-2 text-xs bg-white border border-neutral-200" title="CSV-Export">📥 CSV</button>
                <button type="button" disabled={isScanning} onclick={onScanClick} class="orga-button-primary bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-2.5 text-xs font-bold" title="Beleg scannen">
                    {#if isScanning}⏳ Scanne...{:else}⚡ Scan{/if}
                </button>
                <button onclick={onBookDueContracts} class="orga-button-ghost py-1.5 px-2 text-xs bg-white border border-neutral-200" title="Fällige Fixkosten verbuchen">Fixkosten</button>
                <button onclick={onNewTransaction} class="orga-button-primary py-1.5 px-2.5 text-xs font-bold">+ Buchung</button>
            </div>
        </div>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-neutral-100">
            <div class="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                <button onclick={() => typeFilter = 'all'} class="px-2 py-1 rounded-lg text-xs font-bold {typeFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200'}">Alle</button>
                <button onclick={() => typeFilter = 'income'} class="px-2 py-1 rounded-lg text-xs font-bold {typeFilter === 'income' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200'}">📈 Einnahmen</button>
                <button onclick={() => typeFilter = 'expense'} class="px-2 py-1 rounded-lg text-xs font-bold {typeFilter === 'expense' ? 'bg-rose-600 text-white' : 'bg-white text-rose-700 border border-rose-200'}">📉 Ausgaben</button>
                <button onclick={() => typeFilter = 'invoice'} class="px-2 py-1 rounded-lg text-xs font-bold {typeFilter === 'invoice' ? 'bg-amber-600 text-white' : 'bg-white text-amber-800 border border-amber-200'}">📄 Rechnungen</button>
                <button onclick={() => typeFilter = 'contract'} class="px-2 py-1 rounded-lg text-xs font-bold {typeFilter === 'contract' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200'}">📜 Verträge</button>
            </div>
            <div class="flex items-center gap-2">
                <input type="text" bind:value={searchQuery} placeholder="Suchen..." class="pl-2 pr-2 py-1 text-xs bg-white border border-neutral-200 rounded-lg outline-none w-32 sm:w-40" />
                <select bind:value={sortBy} aria-label="Sortieren" class="py-1 px-1.5 text-xs bg-white border border-neutral-200 rounded-lg text-neutral-700 cursor-pointer">
                    <option value="date_desc">Neueste</option>
                    <option value="date_asc">Älteste</option>
                    <option value="amount_desc">Betrag ↓</option>
                    <option value="amount_asc">Betrag ↑</option>
                </select>
            </div>
        </div>
    </div>

    <div class="p-3 sm:p-4 flex-1">
        {#if transactions.length === 0}
            <div class="p-8 text-center text-neutral-400 italic text-sm">Keine Buchungen vorhanden.</div>
        {:else if displayMode === 'grid'}
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {#each transactions as t}
                    <FinanceTransactionCard transaction={t} {onStorno} {onEdit} {onDelete} {onBookNextInstallment} />
                {/each}
            </div>
        {:else}
            <FinanceTransactionsTable {transactions} {onStorno} {onEdit} {onDelete} />
        {/if}
    </div>
</div>
