<script lang="ts">
    import { rbacService } from '$lib/services/rbacService.svelte';

    interface Props {
        activeClientsCount?: number;
        openInvoicesCount?: number;
        openInvoicesSum?: number;
        missingFollowUpsCount?: number;
        onOpenFollowUps?: () => void;
        unsettledAppointmentsCount?: number;
        unsettledIncompleteCount?: number;
        onOpenUnsettled?: () => void;
        monthlyKms?: number;
    }

    let {
        activeClientsCount = 0,
        openInvoicesCount = 0,
        openInvoicesSum = 0,
        missingFollowUpsCount = 0,
        onOpenFollowUps,
        unsettledAppointmentsCount = 0,
        unsettledIncompleteCount = 0,
        onOpenUnsettled,
        monthlyKms = 0
    }: Props = $props();

    let isOwner = $derived(rbacService.isOwner);
    let canAccessFinances = $derived(rbacService.canAccessFinances);
</script>

<!-- Section 2: Vorgänge & Status-Aktionen -->
<div class="pt-4 border-t border-slate-200/80 dark:border-white/10">
    <div class="grid grid-cols-2 {canAccessFinances ? 'sm:grid-cols-3 xl:grid-cols-6' : 'sm:grid-cols-3'} gap-2.5 sm:gap-3">
        
        <!-- A. Aktive Klienten -->
        <a 
            href="/clients" 
            class="p-3 sm:p-3.5 rounded-2xl bg-white/90 hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 hover:border-indigo-400/50 dark:hover:border-indigo-400/40 shadow-xs transition-all group flex flex-col justify-between min-h-[72px] text-left active:scale-[0.98]"
        >
            <div class="flex items-center justify-between gap-1.5">
                <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider truncate">
                    {isOwner ? 'Aktive Klienten' : 'Klienten'}
                </span>
                <div class="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs shrink-0 group-hover:scale-110 transition-transform">
                    👥
                </div>
            </div>
            <div class="mt-1">
                <p class="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-none">
                    {activeClientsCount}
                </p>
            </div>
        </a>

        <!-- B. Offene Rechnungen (Finanzen) -->
        {#if canAccessFinances}
            <a 
                href="/invoices?status=offen" 
                class="p-3 sm:p-3.5 rounded-2xl bg-white/90 hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 hover:border-rose-400/50 dark:hover:border-rose-400/40 shadow-xs transition-all group flex flex-col justify-between min-h-[72px] text-left active:scale-[0.98]"
                title="Offene Rechnungen gefiltert anzeigen"
            >
                <div class="flex items-center justify-between gap-1.5">
                    <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider truncate">
                        {isOwner ? 'Offene Rechnungen' : 'Rechnungen'}
                    </span>
                    <div class="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 flex items-center justify-center text-xs shrink-0 group-hover:scale-110 transition-transform">
                        💶
                    </div>
                </div>
                <div class="mt-1">
                    <p class="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-none">
                        {openInvoicesCount}
                    </p>
                </div>
            </a>

            <!-- C. Offener Betrag (Finanzen) -->
            <a 
                href="/invoices?status=offen" 
                class="p-3 sm:p-3.5 rounded-2xl bg-white/90 hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 hover:border-emerald-400/50 dark:hover:border-emerald-400/40 shadow-xs transition-all group flex flex-col justify-between min-h-[72px] text-left active:scale-[0.98]"
                title="Offenen Betrag und offene Rechnungen anzeigen"
            >
                <div class="flex items-center justify-between gap-1.5">
                    <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider truncate">
                        Offener Betrag
                    </span>
                    <div class="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-xs shrink-0 group-hover:scale-110 transition-transform">
                        💰
                    </div>
                </div>
                <div class="mt-1">
                    <p class="text-base sm:text-lg lg:text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none truncate" title="{openInvoicesSum.toFixed(2).replace('.', ',')} €">
                        {openInvoicesSum.toFixed(2).replace('.', ',')} €
                    </p>
                </div>
            </a>
        {/if}

        <!-- D. Nachbereitungen -->
        <button 
            type="button" 
            onclick={onOpenFollowUps} 
            class="p-3 sm:p-3.5 rounded-2xl bg-white/90 hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 hover:border-orange-400/50 dark:hover:border-orange-400/40 shadow-xs transition-all group flex flex-col justify-between min-h-[72px] text-left active:scale-[0.98] cursor-pointer"
        >
            <div class="flex items-center justify-between gap-1.5">
                <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider truncate">
                    Nachbereitungen
                </span>
                <div class="w-6 h-6 rounded-lg bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 flex items-center justify-center text-xs shrink-0 group-hover:scale-110 transition-transform">
                    ⚠️
                </div>
            </div>
            <div class="mt-1 flex items-baseline gap-1.5">
                <p class="text-lg sm:text-2xl font-black leading-none {missingFollowUpsCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}">
                    {missingFollowUpsCount}
                </p>
                {#if missingFollowUpsCount > 0}
                    <span class="text-[9px] font-bold text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-500/20 px-1 rounded">offen</span>
                {/if}
            </div>
        </button>

        <!-- E. Ohne Rechnung (nur für Finanzen/Admins) -->
        {#if canAccessFinances}
            <button 
                type="button" 
                onclick={onOpenUnsettled} 
                class="p-3 sm:p-3.5 rounded-2xl bg-white/90 hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 hover:border-cyan-400/50 dark:hover:border-cyan-400/40 shadow-xs transition-all group flex flex-col justify-between min-h-[72px] text-left active:scale-[0.98] cursor-pointer"
            >
                <div class="flex items-center justify-between gap-1.5">
                    <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider truncate">
                        Offene Abrechnungen
                    </span>
                    <div class="w-6 h-6 rounded-lg bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 flex items-center justify-center text-xs shrink-0 group-hover:scale-110 transition-transform">
                        📄
                    </div>
                </div>
                <div class="mt-1 flex items-baseline gap-1.5 flex-wrap">
                    <p class="text-lg sm:text-2xl font-black leading-none {unsettledAppointmentsCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}">
                        {unsettledAppointmentsCount}
                    </p>
                    {#if unsettledAppointmentsCount > 0}
                        <span class="text-[9px] font-bold text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/20 px-1 rounded">bereit</span>
                    {/if}
                    {#if unsettledIncompleteCount > 0}
                        <span class="text-[9px] font-bold text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-500/20 px-1 rounded flex items-center gap-0.5" title={`${unsettledIncompleteCount} Termine unvollständig (Zeit/Leistung fehlt)`}>
                            ⚠️ {unsettledIncompleteCount}
                        </span>
                    {/if}
                </div>
            </button>
        {/if}

        <!-- F. Team-KM (Monat) / Gefahrene KM -->
        <div 
            class="p-3 sm:p-3.5 rounded-2xl bg-white/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-xs transition-all group flex flex-col justify-between min-h-[72px] text-left"
        >
            <div class="flex items-center justify-between gap-1.5">
                <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider truncate">
                    {isOwner ? 'Team-KM (Monat)' : 'Gefahrene KM'}
                </span>
                <div class="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300 flex items-center justify-center text-xs shrink-0">
                    🚗
                </div>
            </div>
            <div class="mt-1">
                <p class="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-none">
                    {monthlyKms.toFixed(0)} <span class="text-xs font-bold text-slate-400">km</span>
                </p>
            </div>
        </div>

    </div>
</div>
