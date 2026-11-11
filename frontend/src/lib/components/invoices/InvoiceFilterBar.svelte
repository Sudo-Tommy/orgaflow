<script lang="ts">
    import { Search, Hourglass } from "lucide-svelte";
    import { triggerHaptic } from "$lib/services/hapticFeedback";

    let {
        searchQuery = $bindable(''),
        statusFilter = $bindable('all'),
        totalCount = 0,
        openCount = 0,
        openSum = 0,
        paidCount = 0
    }: {
        searchQuery?: string;
        statusFilter?: string;
        totalCount?: number;
        openCount?: number;
        openSum?: number;
        paidCount?: number;
    } = $props();

    function setFilter(val: string) {
        triggerHaptic('selection');
        statusFilter = val;
    }
</script>

<div class="px-4 sm:px-6 mb-4 animate-enter delay-100">
    <!-- Schnellfilter-Pills analog zur Klienten-Ansicht -->
    <div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div class="flex items-center gap-2">
            <button 
                type="button" 
                onclick={() => setFilter('all')} 
                class="px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer {statusFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'}"
            >
                Alle ({totalCount})
            </button>
            <button 
                type="button" 
                onclick={() => setFilter('offen')} 
                class="px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 {statusFilter === 'offen' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'}"
            >
                <span>Ausstehend</span>
                <span class="px-1.5 py-0.2 rounded-md text-[10px] {statusFilter === 'offen' ? 'bg-white/20 text-white' : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'} font-black">{openCount}</span>
            </button>
            <button 
                type="button" 
                onclick={() => setFilter('Abgeschlossen')} 
                class="px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 {statusFilter === 'Abgeschlossen' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'}"
            >
                <span>Bezahlt</span>
                <span class="px-1.5 py-0.2 rounded-md text-[10px] {statusFilter === 'Abgeschlossen' ? 'bg-white/20 text-white' : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'} font-black">{paidCount}</span>
            </button>
        </div>

        {#if statusFilter === 'offen' && openSum > 0}
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-800/60 text-xs font-black text-amber-700 dark:text-amber-300">
                <span>Offener Gesamtbetrag:</span>
                <span class="text-sm font-black">{openSum.toFixed(2).replace('.', ',')} €</span>
            </div>
        {/if}
    </div>

    <!-- Filterleiste mit Suche und Dropdown -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm w-full">
        <div class="flex-1 relative flex items-center">
            <span class="absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500 text-base"><Search class="w-4 h-4" /></span>
            <input 
                id="search-inv"
                type="text" 
                aria-label="Rechnungen durchsuchen"
                bind:value={searchQuery} 
                placeholder="Rechnungsnummer, Klient..." 
                class="w-full bg-transparent border-none py-3 min-h-12 pl-9 pr-3 text-sm focus:ring-0 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
            />
            {#if statusFilter !== 'all'}
                <div class="mr-2 shrink-0">
                    <button 
                        type="button" 
                        onclick={() => setFilter('all')} 
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
                        title="Filter zurücksetzen"
                    >
                        <span>Filter: {statusFilter === 'offen' ? 'Ausstehend' : statusFilter}</span>
                        <span class="text-xs font-black">✕</span>
                    </button>
                </div>
            {/if}
        </div>
        <div class="w-px h-8 hidden sm:block bg-slate-200 dark:bg-slate-800" aria-hidden="true"></div>
        <div class="w-full sm:w-56 shrink-0 relative border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-2 sm:pt-0">
            <span class="absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500 text-base"><Hourglass class="w-4 h-4" /></span>
            <select id="status-filter" aria-label="Status Filter" bind:value={statusFilter} class="w-full min-h-12 bg-transparent border-none py-3 pl-9 pr-3 text-sm focus:ring-0 outline-none cursor-pointer font-semibold text-slate-700 dark:text-slate-200 appearance-none rounded-xl">
                <option value="all" class="dark:bg-slate-900 dark:text-slate-100">Alle Status anzeigen</option>
                <option value="Abgelehnt" class="dark:bg-slate-900 dark:text-slate-100">Abgelehnt</option>
                <option value="Abgeschlossen" class="dark:bg-slate-900 dark:text-slate-100">Abgeschlossen (Bezahlt)</option>
                <option value="offen" class="dark:bg-slate-900 dark:text-slate-100">Ausstehend (Offen)</option>
                <option value="Eingereicht" class="dark:bg-slate-900 dark:text-slate-100">Eingereicht (Gesendet)</option>
                <option value="Entwurf" class="dark:bg-slate-900 dark:text-slate-100">Entwurf</option>
                <option value="In Bearbeitung" class="dark:bg-slate-900 dark:text-slate-100">In Bearbeitung</option>
                <option value="Storniert" class="dark:bg-slate-900 dark:text-slate-100">Storniert</option>
                <option value="Teilweise bezahlt" class="dark:bg-slate-900 dark:text-slate-100">Teilweise bezahlt</option>
            </select>
        </div>
    </div>
</div>
