<script lang="ts">
    import { Search, X, CheckCheck, Calendar, ChevronDown, UserCheck, AlertTriangle } from "lucide-svelte";
    import type { MonthOption } from "./unsettledPayerHelper";
    import type { BillingUserFilter, BillingUserOption } from "./unsettledBillingUserHelper";

    interface Props {
        searchQuery: string;
        filterStatus: "all" | "ready" | "incomplete";
        billingUserFilter: BillingUserFilter;
        monthFilter: string;
        userOptions: BillingUserOption[];
        unassignedCount: number;
        totalAppointmentsCount: number;
        statusCounts: {
            ready: number;
            incomplete: number;
            all: number;
        };
        monthOptions: MonthOption[];
        metrics: {
            totalCount: number;
            readyCount: number;
            incompleteCount: number;
            selectedHours: number;
            selectedKm: number;
        };
        filteredAppointmentsCount: number;
        selectedIds: string[];
        isProcessing: boolean;
        allSelected: boolean;
        canReassign?: boolean;
        canViewAll?: boolean;
        onToggleAll: () => void;
        onMarkSelectedSettled: () => void;
        onBatchAssignBillingUser?: (newUserId: string | null) => void;
    }

    let {
        searchQuery = $bindable(""),
        filterStatus = $bindable("ready"),
        billingUserFilter = $bindable("all"),
        monthFilter = $bindable("all"),
        userOptions = [],
        unassignedCount = 0,
        totalAppointmentsCount = 0,
        statusCounts = { ready: 0, incomplete: 0, all: 0 },
        monthOptions = [],
        metrics,
        filteredAppointmentsCount,
        selectedIds,
        isProcessing,
        allSelected,
        canReassign = true,
        canViewAll = true,
        onToggleAll,
        onMarkSelectedSettled,
        onBatchAssignBillingUser
    }: Props = $props();
</script>

<div class="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
    <!-- Schnellfilter-Reiter: Mitarbeiter-Pillen + Monats-Filter kompakt -->
    <div class="px-2.5 sm:px-6 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 min-w-0">
        <!-- Mitarbeiter Pillen (horizontal scrollbar) -->
        <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 sm:p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-x-auto max-w-full shrink min-w-0">
            {#if canViewAll}
                <button
                    type="button"
                    onclick={() => billingUserFilter = 'all'}
                    class="px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 {billingUserFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                >
                    <span>Alle</span>
                    <span class="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold {billingUserFilter === 'all' ? 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}">{totalAppointmentsCount}</span>
                </button>
            {/if}

            {#each userOptions as opt (opt.id)}
                {#if opt.count > 0}
                    <button
                        type="button"
                        onclick={() => billingUserFilter = opt.id}
                        class="px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 {billingUserFilter === opt.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                    >
                        <span class="truncate max-w-[120px]">{opt.name}</span>
                        <span class="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold {billingUserFilter === opt.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}">{opt.count}</span>
                    </button>
                {/if}
            {/each}

            {#if canViewAll && unassignedCount > 0}
                <button
                    type="button"
                    onclick={() => billingUserFilter = 'unassigned'}
                    class="px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 {billingUserFilter === 'unassigned' ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-xs' : 'text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-white'}"
                    title="Termine ohne zugewiesenen Abrechnungs-Mitarbeiter"
                >
                    <AlertTriangle class="w-3 h-3" />
                    <span>Offen</span>
                    <span class="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold {billingUserFilter === 'unassigned' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'}">{unassignedCount}</span>
                </button>
            {/if}
        </div>

        <!-- Monats-Filter Dropdown -->
        {#if monthOptions.length > 0}
            <div class="relative shrink-0 max-w-[140px] sm:max-w-none">
                <select
                    bind:value={monthFilter}
                    class="appearance-none pl-6 sm:pl-7 pr-5 sm:pr-6 py-1 rounded-xl text-[11px] sm:text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500 truncate"
                >
                    <option value="all">Alle Monate</option>
                    {#each monthOptions as opt (opt.key)}
                        <option value={opt.key}>{opt.label}</option>
                    {/each}
                </select>
                <Calendar class="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown class="w-2.5 h-2.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
        {/if}
    </div>

    <!-- Suchleiste & Status-Umschalter -->
    <div class="px-2.5 sm:px-6 py-2 flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center min-w-0">
        <div class="relative flex-1 min-w-0">
            <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="Klient oder Termin suchen..."
                class="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
            />
            {#if searchQuery}
                <button type="button" onclick={() => searchQuery = ""} class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer">
                    <X class="w-3 h-3" />
                </button>
            {/if}
        </div>
        <div class="grid grid-cols-3 sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
            <button 
                type="button" 
                onclick={() => filterStatus = 'ready'} 
                class="px-2 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer {filterStatus === 'ready' ? 'bg-emerald-500 text-white shadow-xs' : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'}"
            >
                ✓ Bereit ({statusCounts.ready})
            </button>
            <button 
                type="button" 
                onclick={() => filterStatus = 'incomplete'} 
                class="px-2 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer {filterStatus === 'incomplete' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'}"
            >
                ⚠️ Prüfen ({statusCounts.incomplete})
            </button>
            <button 
                type="button" 
                onclick={() => filterStatus = 'all'} 
                class="px-2 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer {filterStatus === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}"
            >
                Alle ({statusCounts.all})
            </button>
        </div>
    </div>

    <!-- Mehrfachauswahl-Leiste -->
    {#if filteredAppointmentsCount > 0}
        <div class="bg-slate-50/95 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 px-2.5 sm:px-6 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-1.5 min-w-0">
            <label class="flex items-center gap-2 cursor-pointer text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 select-none min-w-0">
                <input 
                    type="checkbox" 
                    checked={allSelected} 
                    onchange={onToggleAll} 
                    class="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 transition-colors cursor-pointer shrink-0" 
                    disabled={isProcessing} 
                />
                <span class="truncate">
                    {#if selectedIds.length > 0}
                        {selectedIds.length} von {filteredAppointmentsCount} ausgewählt
                    {:else}
                        Alle {filteredAppointmentsCount} sichtbaren auswählen
                    {/if}
                </span>
            </label>
            {#if selectedIds.length > 0}
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[10px] sm:text-[11px] font-bold text-slate-500 hidden md:inline">
                        Summe: {metrics.selectedHours.toFixed(1)} h • {metrics.selectedKm.toFixed(0)} km
                    </span>

                    {#if canReassign && userOptions.length > 0}
                        <div class="relative inline-flex items-center">
                            <select
                                value=""
                                disabled={isProcessing}
                                onchange={(e) => {
                                    const val = e.currentTarget.value;
                                    if (val !== "") {
                                        onBatchAssignBillingUser?.(val === "none" ? null : val);
                                        e.currentTarget.value = "";
                                    }
                                }}
                                class="appearance-none cursor-pointer pl-5 pr-4 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs hover:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 max-w-[130px] truncate"
                            >
                                <option value="" disabled selected>Zuweisen an...</option>
                                <option value="none">⚠️ Nicht zugewiesen</option>
                                {#each userOptions as opt (opt.id)}
                                    <option value={opt.id}>{opt.name}</option>
                                {/each}
                            </select>
                            <UserCheck class="w-3 h-3 text-cyan-600 absolute left-1.5 pointer-events-none" />
                            <ChevronDown class="w-2.5 h-2.5 text-slate-400 absolute right-1 pointer-events-none" />
                        </div>
                    {/if}

                    <button 
                        type="button" 
                        onclick={onMarkSelectedSettled} 
                        disabled={isProcessing} 
                        class="text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer min-h-[30px] sm:min-h-[34px]"
                    >
                        <CheckCheck class="w-3.5 h-3.5" />
                        <span>{isProcessing ? '...' : `${selectedIds.length} abrechnen`}</span>
                    </button>
                </div>
            {/if}
        </div>
    {/if}
</div>
