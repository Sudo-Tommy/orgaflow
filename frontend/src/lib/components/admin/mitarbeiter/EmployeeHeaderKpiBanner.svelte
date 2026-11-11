<script lang="ts">
    import { Shield } from 'lucide-svelte';

    interface Props {
        totalCount: number;
        activeCount: number;
        totalAssignedClients: number;
        todayAppointmentsCount: number;
    }

    let {
        totalCount,
        activeCount,
        totalAssignedClients,
        todayAppointmentsCount
    }: Props = $props();
</script>

<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
    <div class="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
                <Shield class="w-4 h-4" />
                <span>Rollenbasiertes Mitarbeiter-Management &amp; Außendienst</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Mitarbeiter-Verwaltung &amp; Zuweisung</h1>
            <p class="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl">
                Verwalten Sie Pflegekräfte und Betreuer, weisen Sie Klienten zu und steuern Sie individuelle Zugriffsrechte für den operativen Dienst.
            </p>
        </div>
    </div>

    <!-- KPI Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
        <div class="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Mitarbeiter gesamt</p>
            <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</p>
        </div>
        <div class="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Aktiv im Dienst</p>
            <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
        </div>
        <div class="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Klienten-Zuweisungen</p>
            <p class="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{totalAssignedClients}</p>
        </div>
        <div class="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Heutige Einsätze</p>
            <p class="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{todayAppointmentsCount}</p>
        </div>
    </div>
</div>
