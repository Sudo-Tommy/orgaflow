<script lang="ts">
    import { Search } from 'lucide-svelte';

    interface Props {
        statusFilter: string;
        employmentFilter: string;
        searchQuery: string;
    }

    let {
        statusFilter = $bindable(),
        employmentFilter = $bindable(),
        searchQuery = $bindable()
    }: Props = $props();

    const STATUS_TABS = [
        { id: 'all', label: 'Alle' },
        { id: 'Aktiv', label: '🟢 Aktiv' },
        { id: 'Urlaub', label: '🟡 Urlaub' },
        { id: 'Krank', label: '🔴 Krank' },
        { id: 'Inaktiv', label: '⚪ Inaktiv' }
    ];

    // Alphabetisch sortiert nach deutschem Anzeigetext gemäß alphabetical-select.md
    const EMPLOYMENT_OPTIONS = [
        { value: 'all', label: 'Alle Anstellungen' },
        { value: 'Freiberuflich', label: 'Freiberuflich' },
        { value: 'Minijob', label: 'Minijob' },
        { value: 'Praktikum', label: 'Praktikum' },
        { value: 'Teilzeit', label: 'Teilzeit' },
        { value: 'Vollzeit', label: 'Vollzeit' },
        { value: 'Werkstudent', label: 'Werkstudent' }
    ];
</script>

<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
    <!-- Status Filter Pills -->
    <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar w-full md:w-auto pb-1 md:pb-0">
        {#each STATUS_TABS as tab}
            <button
                type="button"
                onclick={() => statusFilter = tab.id}
                class="min-h-11 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer touch-manipulation {statusFilter === tab.id ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}"
            >
                {tab.label}
            </button>
        {/each}
    </div>

    <div class="flex items-center gap-3 w-full md:w-auto flex-1 md:justify-end">
        <!-- Anstellung Dropdown (Alphabetisch sortiert) -->
        <select
            aria-label="Anstellungsverhältnis filtern"
            bind:value={employmentFilter}
            class="min-h-11 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer touch-manipulation"
        >
            {#each EMPLOYMENT_OPTIONS as opt}
                <option value={opt.value}>{opt.label}</option>
            {/each}
        </select>

        <!-- Search Input -->
        <div class="relative flex-1 max-w-md">
            <label for="search-employees" class="sr-only">Mitarbeiter suchen</label>
            <Search class="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input 
                id="search-employees"
                type="text" 
                bind:value={searchQuery}
                placeholder="Mitarbeiter suchen (Name, Mail, Qualifikation)..." 
                class="w-full min-h-11 pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white touch-manipulation"
            />
        </div>
    </div>
</div>
