<script lang="ts">
    import { CheckCircle2, AlertCircle, Clock, Car } from "lucide-svelte";
    import { formatMinutes } from "../appointmentRouteService";

    let {
        isSettled = false,
        totalRecordedMinutes = 0,
        totalKm = 0,
        driveRecords = [],
        totalExpenditure = 0,
        expendituresCount = 0,
        onToggleSettled
    }: {
        isSettled: boolean;
        totalRecordedMinutes: number;
        totalKm: number;
        driveRecords?: any[];
        totalExpenditure: number;
        expendituresCount: number;
        onToggleSettled: () => void;
    } = $props();

    const money = (v: number) => `${v.toFixed(2).replace('.', ',')} €`;
    const totalLumpSum = $derived(driveRecords.reduce((sum: number, d: any) => sum + (Number(d.lump_sum) || 0), 0));
    const visibleDrives = $derived(driveRecords.filter((d: any) => (Number(d.km) || 0) > 0 || (Number(d.lump_sum) || 0) > 0));
</script>

<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <!-- Status Card -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Abrechnungsstatus</p>
            <div class="flex items-center gap-2">
                {#if isSettled}
                    <CheckCircle2 class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span class="text-sm font-black text-emerald-900 dark:text-emerald-200">Abgerechnet</span>
                {:else}
                    <AlertCircle class="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span class="text-sm font-black text-amber-900 dark:text-amber-200">Offen / Nicht abgerechnet</span>
                {/if}
            </div>
        </div>
        <button
            type="button"
            onclick={onToggleSettled}
            class="mt-3 min-h-11 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer touch-manipulation {isSettled ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'}"
        >
            {isSettled ? 'Auf "Offen" setzen' : 'Als abgerechnet markieren'}
        </button>
    </div>

    <!-- Arbeitszeit Card -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock class="w-3.5 h-3.5 text-indigo-500" />
                <span>Erfasste Arbeitszeit</span>
            </p>
            <p class="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {totalRecordedMinutes > 0 ? formatMinutes(totalRecordedMinutes) : '0 Min.'}
            </p>
        </div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-2">
            Basis für Stundennachweis & Kassenleistung
        </p>
    </div>

    <!-- Fahrt & Auslagen Card -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Car class="w-3.5 h-3.5 text-emerald-500" />
                <span>Fahrt & Auslagen</span>
            </p>
            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span class="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    {totalKm > 0 ? `${totalKm} km` : '0 km'}
                </span>
                {#if totalLumpSum > 0}
                    <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        + {money(totalLumpSum)} Pauschale
                    </span>
                {/if}
                {#if totalExpenditure > 0}
                    <span class="text-xs font-bold text-rose-600 dark:text-rose-400">
                        + {money(totalExpenditure)} Belege
                    </span>
                {/if}
            </div>

            {#if visibleDrives.length > 0}
                <ul class="mt-2 space-y-1">
                    {#each visibleDrives as drive (drive.id)}
                        <li class="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-2 py-1">
                            <span class="font-bold">{drive.type || 'Fahrt'}</span>
                            <span class="flex flex-wrap justify-end gap-x-2">
                                {#if (Number(drive.km) || 0) > 0}<span>{drive.km} km</span>{/if}
                                {#if (Number(drive.lump_sum) || 0) > 0}
                                    <span class="text-emerald-600 dark:text-emerald-400 font-bold">Pauschale {money(Number(drive.lump_sum))}</span>
                                {/if}
                            </span>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-2">
            {visibleDrives.length} Fahrt(en) · {expendituresCount} Beleg(e) erfasst
        </p>
    </div>
</div>
