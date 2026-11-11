<script lang="ts">
    import { Clock, Car, Utensils, Receipt, Wallet } from "lucide-svelte";
    import type { VmaTotals } from "./vmaTypes";
    import { formatDuration } from "./vmaCalculationService";

    let { totals, reportsCount }: { totals: VmaTotals; reportsCount: number } = $props();
</script>

<div class="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
    <!-- Karte 1: Gesamte Reisezeit & Kilometer -->
    <div class="bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
        <div class="flex items-center justify-between text-neutral-500 dark:text-slate-400 mb-1">
            <span class="text-xs font-semibold">Abwesenheit & Distanz</span>
            <Clock class="w-4 h-4 text-neutral-400 dark:text-slate-500" />
        </div>
        <div class="text-xl sm:text-2xl font-black text-neutral-900 dark:text-slate-100 tabular-nums">
            {formatDuration(totals.absence)}
        </div>
        <div class="text-xs text-neutral-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>{reportsCount} Reisetage</span>
            <span class="font-bold text-neutral-700 dark:text-slate-300">{totals.km} km</span>
        </div>
    </div>

    <!-- Karte 2: 1. Säule Fahrtkosten -->
    <div class="bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
        <div class="flex items-center justify-between text-neutral-500 dark:text-slate-400 mb-1">
            <span class="text-xs font-semibold">1. Fahrtkosten</span>
            <Car class="w-4 h-4 text-amber-500" />
        </div>
        <div class="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
            {totals.travel.toFixed(2).replace('.', ',')} €
        </div>
        <div class="text-[11px] text-neutral-500 dark:text-slate-400 mt-1 truncate">
            PKW: {totals.mileage.toFixed(2).replace('.', ',')} € &bull; Ticket: {totals.ticket.toFixed(2).replace('.', ',')} €
        </div>
    </div>

    <!-- Karte 3: 2. Säule VMA Netto -->
    <div class="bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
        <div class="flex items-center justify-between text-neutral-500 dark:text-slate-400 mb-1">
            <span class="text-xs font-semibold">2. VMA Netto</span>
            <Utensils class="w-4 h-4 text-emerald-500" />
        </div>
        <div class="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {totals.vma.toFixed(2).replace('.', ',')} €
        </div>
        <div class="text-[11px] text-neutral-500 dark:text-slate-400 mt-1 truncate">
            Brutto: {totals.grossVma.toFixed(2).replace('.', ',')} € | Kürzg: -{totals.deductions.toFixed(2).replace('.', ',')} €
        </div>
    </div>

    <!-- Karte 4: 3. & 4. Säule Übernachtung / Nebenkosten -->
    <div class="bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
        <div class="flex items-center justify-between text-neutral-500 dark:text-slate-400 mb-1">
            <span class="text-xs font-semibold">3. & 4. Übern. / Neben</span>
            <Receipt class="w-4 h-4 text-sky-500" />
        </div>
        <div class="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 tabular-nums">
            {(totals.accommodation + totals.incidental).toFixed(2).replace('.', ',')} €
        </div>
        <div class="text-[11px] text-neutral-500 dark:text-slate-400 mt-1 truncate">
            Hotel: {totals.accommodation.toFixed(2).replace('.', ',')} € | Neben: {totals.incidental.toFixed(2).replace('.', ',')} €
        </div>
    </div>

    <!-- Karte 5: Gesamter Erstattungsbetrag -->
    <div class="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl p-4 shadow-md col-span-2 lg:col-span-1">
        <div class="flex items-center justify-between text-indigo-100 mb-1">
            <span class="text-xs font-bold uppercase tracking-wider">Auszahlung</span>
            <Wallet class="w-4 h-4 text-amber-300" />
        </div>
        <div class="text-2xl sm:text-3xl font-black text-white tabular-nums">
            {totals.total.toFixed(2).replace('.', ',')} €
        </div>
        <div class="text-[11px] text-indigo-200 mt-1">
            Gesamtsumme aller 4 Säulen
        </div>
    </div>
</div>
