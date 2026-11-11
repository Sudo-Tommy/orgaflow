<script lang="ts">
    let {
        viewMode = $bindable('monthly'),
        selectedYear = $bindable(new Date().getFullYear()),
        selectedMonth = $bindable(new Date().getMonth() + 1),
        selectedQuarter = $bindable(Math.ceil((new Date().getMonth() + 1) / 3)),
        availableYears = [],
        onOpenMonthModal = () => {}
    }: {
        viewMode?: 'monthly' | 'quarterly' | 'yearly';
        selectedYear?: number;
        selectedMonth?: number;
        selectedQuarter?: number;
        availableYears?: number[];
        onOpenMonthModal?: () => void;
    } = $props();

    const quarters = [
        { q: 1, label: 'Q1', desc: 'Januar – März' },
        { q: 2, label: 'Q2', desc: 'April – Juni' },
        { q: 3, label: 'Q3', desc: 'Juli – September' },
        { q: 4, label: 'Q4', desc: 'Oktober – Dezember' }
    ];
</script>

<div class="bg-white rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm p-3.5 sm:p-6 mb-6 sm:mb-8 animate-enter delay-150">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-neutral-100">
        <div class="flex items-center gap-1 sm:gap-1.5 bg-neutral-100/90 p-1 sm:p-1.5 rounded-2xl shadow-inner w-full md:w-auto">
            <button onclick={() => viewMode = 'monthly'} class="flex-1 md:flex-none px-2.5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all {viewMode === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}">📅 Monatlich</button>
            <button onclick={() => viewMode = 'quarterly'} class="flex-1 md:flex-none px-2.5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all {viewMode === 'quarterly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}">📊 Quartal</button>
            <button onclick={() => viewMode = 'yearly'} class="flex-1 md:flex-none px-2.5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all {viewMode === 'yearly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}">📆 Jährlich</button>
        </div>

        <div class="flex items-center justify-between md:justify-end gap-2 sm:gap-3 w-full md:w-auto">
            <div class="flex items-center bg-neutral-50 border border-neutral-200/70 rounded-2xl p-1 shadow-sm">
                <button onclick={() => selectedYear--} class="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-500 hover:text-indigo-600 hover:bg-white transition-colors">◀</button>
                <select bind:value={selectedYear} aria-label="Haushaltsjahr" class="bg-transparent text-sm sm:text-base font-black text-neutral-900 px-2 outline-none cursor-pointer text-center">
                    {#each availableYears as yr}<option value={yr}>{yr}</option>{/each}
                </select>
                <button onclick={() => selectedYear++} class="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-500 hover:text-indigo-600 hover:bg-white transition-colors">▶</button>
            </div>
            <button onclick={onOpenMonthModal} class="px-3 sm:px-4 py-2 sm:py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition-all flex items-center gap-1.5">
                <span>📊</span><span>Monatsbericht</span>
            </button>
        </div>
    </div>

    <div class="pt-3 sm:pt-4">
        {#if viewMode === 'monthly'}
            <div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 sm:gap-2">
                {#each Array.from({length: 12}) as _, i}
                    {@const mNum = i + 1}
                    {@const isSel = selectedMonth === mNum}
                    <button onclick={() => selectedMonth = mNum} class="min-h-[46px] flex flex-col items-center justify-center rounded-2xl text-xs sm:text-sm font-black transition-all {isSel ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2' : 'bg-neutral-50 hover:bg-indigo-50 text-neutral-700 hover:text-indigo-600 border border-neutral-100'}">
                        <span>{new Date(2000, i, 1).toLocaleString('de-DE', { month: 'short' })}</span>
                        <span class="text-[9px] font-medium {isSel ? 'text-indigo-100' : 'text-neutral-400'}">{mNum < 10 ? `0${mNum}` : mNum}</span>
                    </button>
                {/each}
            </div>
        {:else if viewMode === 'quarterly'}
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {#each quarters as qItem}
                    {@const isSel = selectedQuarter === qItem.q}
                    <button onclick={() => selectedQuarter = qItem.q} class="min-h-[52px] p-2.5 sm:p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between text-left transition-all {isSel ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2' : 'bg-neutral-50 hover:bg-indigo-50 text-neutral-700 hover:text-indigo-600 border border-neutral-100'}">
                        <span class="font-black text-sm sm:text-base">{qItem.label}</span>
                        <span class="text-[10px] sm:text-xs font-medium {isSel ? 'text-indigo-100' : 'text-neutral-400'}">{qItem.desc}</span>
                    </button>
                {/each}
            </div>
        {:else}
            <div class="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 text-center text-xs font-bold text-neutral-500">Gesamtjahr {selectedYear} ausgewählt (Kumulierte Summe aller Monate)</div>
        {/if}
    </div>
</div>
