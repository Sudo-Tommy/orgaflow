<script lang="ts">
    import { rbacService } from '$lib/services/rbacService.svelte';
    import QuickAccessWorkflowActions from './QuickAccessWorkflowActions.svelte';
    import QuickAccessStatusMetrics from './QuickAccessStatusMetrics.svelte';

    interface Props {
        unhandledInquiriesCount?: number;
        onOpenFollowUp: () => void;
        onOpenShareQr: () => void;
        onOpenLetter?: () => void;
        onOpenInquiries?: () => void;
        onOpenEingangszentrale?: () => void;
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
        unhandledInquiriesCount = 0,
        onOpenFollowUp,
        onOpenShareQr,
        onOpenLetter,
        onOpenInquiries,
        onOpenEingangszentrale,
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
    let isAdmin = $derived(rbacService.isOwner || rbacService.isFacilityAdmin);
    let isCaregiver = $derived(rbacService.isCaregiver);
</script>

<div class="mb-8 w-full animate-enter delay-50">
    <div class="bg-gradient-to-r from-white via-indigo-50/40 to-white dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 p-4 sm:p-6 rounded-3xl text-slate-900 dark:text-white shadow-xs dark:shadow-xl border border-slate-200/80 dark:border-slate-800/80 relative overflow-hidden transition-colors">
        <!-- Ambient background glow -->
        <div class="absolute top-0 right-0 w-72 h-72 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-200/80 dark:border-white/10">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white border border-indigo-100 dark:border-white/10 flex items-center justify-center text-xl shadow-inner shrink-0">
                    ⚡
                </div>
                <div>
                    <h3 class="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <span>Schnellzugriff & Aktionen</span>
                        <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100/80 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/30 dark:text-indigo-200 dark:border-indigo-400/20">
                            {isOwner ? 'Inhaber' : isAdmin ? 'Betriebsleitung' : 'Betreuung'}
                        </span>
                    </h3>
                    <p class="text-xs text-slate-500 dark:text-indigo-200/80 mt-0.5">
                        {isCaregiver 
                            ? 'Schneller Zugriff auf Vor-Ort-Workflows, Klienten und Nachbereitungen' 
                            : 'Zentrale Steuerung für Workflows, Finanzen, Klienten und Anfragen'}
                    </p>
                </div>
            </div>
        </div>

        <!-- Section 1: Workflow-Schnellaktionen (Mind. 44px Touch-Targets) -->
        <QuickAccessWorkflowActions
            {onOpenFollowUp}
            {onOpenShareQr}
            {onOpenLetter}
            {onOpenInquiries}
            {onOpenEingangszentrale}
            {unhandledInquiriesCount}
        />

        <!-- Section 2: Vorgänge & Status-Aktionen -->
        <QuickAccessStatusMetrics
            {activeClientsCount}
            {openInvoicesCount}
            {openInvoicesSum}
            {missingFollowUpsCount}
            {onOpenFollowUps}
            {unsettledAppointmentsCount}
            {unsettledIncompleteCount}
            {onOpenUnsettled}
            {monthlyKms}
        />

    </div>
</div>
