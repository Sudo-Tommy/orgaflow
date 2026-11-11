<script lang="ts">
    import { ReceiptText, Clock, Car, Users, X } from "lucide-svelte";

    interface Props {
        metrics: {
            totalCount: number;
            readyCount: number;
            incompleteCount: number;
            totalHours: number;
            totalKm: number;
            clientCount: number;
        };
        filteredReadyCount?: number;
        isFiltered?: boolean;
        onClose: () => void;
    }

    let { metrics, filteredReadyCount, isFiltered = false, onClose }: Props = $props();
</script>

<div class="w-full shrink-0">
    <!-- Mobile Drag Indicator -->
    <div class="pt-2 pb-0 sm:hidden flex justify-center bg-gradient-to-br from-cyan-600 to-teal-600">
        <div class="w-10 h-1 bg-white/30 rounded-full"></div>
    </div>

    <!-- HEADER mit Gradient -->
    <div class="bg-gradient-to-br from-cyan-600 to-teal-600 px-3 sm:px-6 py-2.5 sm:py-5 flex items-center justify-between min-w-0 relative">
        <div class="flex items-center gap-2.5 sm:gap-4 min-w-0 pr-10 sm:pr-0">
            <div class="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/30 shadow-md">
                <ReceiptText class="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div class="min-w-0">
                <h2 class="text-sm sm:text-xl font-black text-white truncate tracking-tight drop-shadow-sm">
                    Offene Abrechnungen
                </h2>
                <p class="text-[11px] sm:text-sm text-cyan-100 font-medium truncate">
                    Noch nicht in Rechnung gestellte Einsätze
                </p>
            </div>
        </div>
        <button
            type="button"
            aria-label="Schließen"
            onclick={onClose}
            class="w-8 h-8 sm:w-10 sm:h-10 bg-white/15 hover:bg-white/25 text-white rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0 z-10 active:scale-95 touch-manipulation cursor-pointer border border-white/20"
        >
            <X class="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
    </div>

    <!-- KPI STATS: Mobil einzeilig kompakt, Desktop vollwertig -->
    <div class="px-2.5 sm:px-6 py-2 sm:py-4 grid grid-cols-4 gap-1.5 sm:gap-3 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <!-- 1. Bereit -->
        <div class="p-1.5 sm:p-3 rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row items-center sm:gap-2.5 min-w-0 shadow-2xs text-center sm:text-left">
            <div class="hidden sm:flex w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 items-center justify-center shrink-0">
                <ReceiptText class="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div class="min-w-0 w-full">
                <p class="text-[8px] sm:text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 truncate">Bereit</p>
                <p class="font-black text-emerald-950 dark:text-emerald-200 text-xs sm:text-base truncate">{metrics.readyCount}<span class="hidden sm:inline"> Termine</span></p>
                {#if isFiltered && filteredReadyCount !== undefined && filteredReadyCount !== metrics.readyCount}
                    <p class="text-[8px] sm:text-[9px] font-bold text-emerald-700 dark:text-emerald-300 truncate">({filteredReadyCount})</p>
                {/if}
            </div>
        </div>

        <!-- 2. Gesamtzeit -->
        <div class="p-1.5 sm:p-3 rounded-xl sm:rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/50 flex flex-col sm:flex-row items-center sm:gap-2.5 min-w-0 text-center sm:text-left">
            <div class="hidden sm:flex w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-900/50 items-center justify-center shrink-0">
                <Clock class="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
            </div>
            <div class="min-w-0 w-full">
                <p class="text-[8px] sm:text-[10px] font-bold uppercase text-cyan-700 dark:text-cyan-500 truncate">Zeit</p>
                <p class="font-black text-cyan-950 dark:text-cyan-200 text-xs sm:text-base truncate">{metrics.totalHours.toFixed(1)} h</p>
            </div>
        </div>

        <!-- 3. Fahrstrecke -->
        <div class="p-1.5 sm:p-3 rounded-xl sm:rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/50 flex flex-col sm:flex-row items-center sm:gap-2.5 min-w-0 text-center sm:text-left">
            <div class="hidden sm:flex w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/50 items-center justify-center shrink-0">
                <Car class="w-4 h-4 text-teal-700 dark:text-teal-400" />
            </div>
            <div class="min-w-0 w-full">
                <p class="text-[8px] sm:text-[10px] font-bold uppercase text-teal-700 dark:text-teal-500 truncate">Strecke</p>
                <p class="font-black text-teal-950 dark:text-teal-200 text-xs sm:text-base truncate">{metrics.totalKm.toFixed(0)} km</p>
            </div>
        </div>

        <!-- 4. Klienten -->
        <div class="p-1.5 sm:p-3 rounded-xl sm:rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center sm:gap-2.5 min-w-0 text-center sm:text-left">
            <div class="hidden sm:flex w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center shrink-0">
                <Users class="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
            </div>
            <div class="min-w-0 w-full">
                <p class="text-[8px] sm:text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-500 truncate">Klienten</p>
                <p class="font-black text-indigo-950 dark:text-indigo-200 text-xs sm:text-base truncate">{metrics.clientCount}</p>
            </div>
        </div>
    </div>
</div>
