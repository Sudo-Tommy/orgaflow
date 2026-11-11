<script lang="ts">
    import { lexofficeService } from '$lib/services/lexofficeService.svelte';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { CheckCircle2, Clock, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-svelte';

    let { companyId = 'all' }: { companyId?: string } = $props();

    function formatEur(val: number): string {
        return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }

    let liveStats = $derived.by(() => {
        const list = (orgaStore.invoices?.data || []).filter((inv: any) => {
            if (['Entwurf', 'Storniert', 'Abgelehnt'].includes(inv.status) || inv.is_cancellation) return false;
            if (companyId && companyId !== 'all') {
                const c = Array.isArray(inv.company) ? inv.company[0] : inv.company;
                if (c !== companyId) return false;
            }
            return true;
        });

        const now = new Date();
        const curYear = now.getFullYear();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        let openTotal = 0;
        let openCount = 0;
        let overdueTotal = 0;
        let overdueCount = 0;
        let paidYearTotal = 0;
        let paidCount = 0;

        for (const inv of list) {
            const brutto = Number(inv.brutto || 0);
            if (inv.status === 'Abgeschlossen') {
                const d = new Date(inv.paid_at || inv.issue_date || inv.created);
                if (d.getFullYear() === curYear) {
                    paidYearTotal += brutto;
                    paidCount++;
                }
            } else {
                const rem = Number(inv.remaining_amount) > 0 ? Number(inv.remaining_amount) : brutto;
                openTotal += rem;
                openCount++;
                if (inv.due_date && new Date(inv.due_date).getTime() < todayStart) {
                    overdueTotal += rem;
                    overdueCount++;
                }
            }
        }

        const activeCfg = lexofficeService.getConfigForCompany(companyId);
        return {
            openTotal,
            openCount,
            overdueTotal,
            overdueCount,
            paidYearTotal,
            paidCount,
            lastSync: activeCfg?.lastSync
                ? new Date(activeCfg.lastSync).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                : null,
            connected: Boolean(activeCfg?.connected || lexofficeService.hasAnyConnected)
        };
    });
</script>

<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 sm:px-6">
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 class="w-5 h-5" />
        </div>
        <div class="min-w-0">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Bezahlt ({new Date().getFullYear()})</span>
            <span class="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 block truncate">{formatEur(liveStats.paidYearTotal)}</span>
            <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{liveStats.paidCount} Rechnungen</span>
        </div>
    </div>

    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/70 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
            <Clock class="w-5 h-5" />
        </div>
        <div class="min-w-0">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Offene Forderungen</span>
            <span class="text-sm sm:text-base font-black text-slate-900 dark:text-white block truncate">{formatEur(liveStats.openTotal)}</span>
            <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{liveStats.openCount} offen</span>
        </div>
    </div>

    <div class="bg-white dark:bg-slate-900 border {liveStats.overdueCount > 0 ? 'border-amber-300 dark:border-amber-700/80' : 'border-slate-200/80 dark:border-slate-800'} rounded-2xl p-3.5 shadow-2xs flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl {liveStats.overdueCount > 0 ? 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'} flex items-center justify-center shrink-0">
            <AlertTriangle class="w-5 h-5" />
        </div>
        <div class="min-w-0">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Überfällig</span>
            <span class="text-sm sm:text-base font-black {liveStats.overdueCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'} block truncate">{formatEur(liveStats.overdueTotal)}</span>
            <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{liveStats.overdueCount} fällig</span>
        </div>
    </div>

    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between gap-2">
        <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200/70 dark:border-violet-800 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                <TrendingUp class="w-5 h-5" />
            </div>
            <div class="min-w-0">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">LexOffice Live-Stand</span>
                <span class="text-xs font-extrabold {liveStats.connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'} block truncate">
                    {liveStats.connected ? 'Verbunden & Synchron' : 'Nicht verbunden'}
                </span>
                <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium block truncate">
                    {liveStats.lastSync ? `Stand: ${liveStats.lastSync} Uhr` : '5-Min-Auto-Sync'}
                </span>
            </div>
        </div>
        {#if lexofficeService.canManageLexOffice && liveStats.connected}
            <button
                type="button"
                onclick={() => lexofficeService.syncNow(companyId)}
                disabled={lexofficeService.isSyncing}
                title="Finanzstände & Rechnungen jetzt mit LexOffice abgleichen"
                class="min-w-[40px] min-h-[40px] rounded-xl bg-slate-100 hover:bg-violet-100 dark:bg-slate-800 dark:hover:bg-violet-950/60 text-slate-600 hover:text-violet-600 dark:text-slate-300 dark:hover:text-violet-300 flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
                <RefreshCw class="w-4 h-4 {lexofficeService.isSyncing ? 'animate-spin text-violet-600' : ''}" />
            </button>
        {/if}
    </div>
</div>

