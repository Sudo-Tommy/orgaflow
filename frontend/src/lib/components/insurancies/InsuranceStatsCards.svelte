<script lang="ts">
    let {
        stats,
        typeFilter,
        clientFilter,
        onSelectType,
        onToggleClients
    } = $props<{
        stats: {
            total: number;
            gkv: number;
            pkv: number;
            beihilfeAndBg: number;
            clientsWithInsurance: number;
        };
        typeFilter: string;
        clientFilter: string;
        onSelectType: (type: string) => void;
        onToggleClients: () => void;
    }>();
</script>

<div class="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6 animate-enter delay-100">
    <button
        type="button"
        onclick={() => onSelectType("all")}
        class="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group relative overflow-hidden min-h-[44px]"
    >
        <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gesamt</span>
            <span class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs">🏛️</span>
        </div>
        <p class="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{stats.total}</p>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Erfasste Kassen</p>
    </button>

    <button
        type="button"
        onclick={() => onSelectType("GKV (Gesetzlich)")}
        class="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-teal-300 dark:hover:border-teal-800/80 transition-all cursor-pointer group relative overflow-hidden min-h-[44px] {typeFilter.includes('GKV') ? 'ring-2 ring-teal-500/30 border-teal-400 dark:border-teal-700' : ''}"
    >
        <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">Gesetzlich (GKV)</span>
            <span class="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 text-xs">🛡️</span>
        </div>
        <p class="text-2xl font-black text-teal-700 dark:text-teal-300 tracking-tight">{stats.gkv}</p>
        <p class="text-[11px] text-teal-600/80 dark:text-teal-400/80 mt-0.5">Gesetzliche Kassen</p>
    </button>

    <button
        type="button"
        onclick={() => onSelectType("PKV (Privat)")}
        class="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800/80 transition-all cursor-pointer group relative overflow-hidden min-h-[44px] {typeFilter.includes('PKV') ? 'ring-2 ring-indigo-500/30 border-indigo-400 dark:border-indigo-700' : ''}"
    >
        <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Privat (PKV)</span>
            <span class="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs">💎</span>
        </div>
        <p class="text-2xl font-black text-indigo-700 dark:text-indigo-300 tracking-tight">{stats.pkv}</p>
        <p class="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">Private Versicherer</p>
    </button>

    <button
        type="button"
        onclick={onToggleClients}
        class="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800/80 transition-all cursor-pointer group relative overflow-hidden min-h-[44px] {clientFilter === 'with_clients' ? 'ring-2 ring-emerald-500/30 border-emerald-400 dark:border-emerald-700' : ''}"
    >
        <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Versicherte</span>
            <span class="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs">👥</span>
        </div>
        <p class="text-2xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight">{stats.clientsWithInsurance}</p>
        <p class="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Klienten mit Zuordnung</p>
    </button>
</div>
