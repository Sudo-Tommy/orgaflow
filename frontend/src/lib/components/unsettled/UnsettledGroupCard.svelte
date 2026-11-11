<script lang="ts">
    import { User, Clock, Car, ChevronDown, ChevronRight, FileText, AlertTriangle, PiggyBank, UserCheck } from "lucide-svelte";
    import { getClientBillingForm, type ClientAppointmentGroup, isAppReady } from "./unsettledHelper";
    import { getClientBudgetSummary, findExistingClientInvoiceForMonth } from "./unsettledPayerHelper";
    import { getAppointmentBillingUserId, type BillingUserOption } from "./unsettledBillingUserHelper";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import UnsettledAppointmentCard from "./UnsettledAppointmentCard.svelte";

    interface Props {
        group: ClientAppointmentGroup;
        isCollapsed: boolean;
        selectedIds: string[];
        expandedAppIds: Record<string, boolean>;
        isProcessing: boolean;
        activeMonthKey?: string;
        allUsers?: any[];
        userOptions?: BillingUserOption[];
        canReassign?: boolean;
        onToggleGroupCollapse: (clientName: string) => void;
        onToggleGroupSelection: (groupApps: any[]) => void;
        onToggleSelection: (id: string) => void;
        onToggleAppExpand: (id: string) => void;
        onMarkSettled: (app: any) => void;
        onOpenDetail: (id: string) => void;
        onUpdateBillingType: (app: any, type: string) => void;
        onUpdateBillingUser?: (app: any, newUserId: string | null) => void;
        onUpdateGroupBillingUser?: (groupApps: any[], clientId: string | undefined, newUserId: string | null) => void;
        onOpenInvoiceGenerator?: (clientId: string, appointmentIds: string[]) => void;
    }

    let {
        group,
        isCollapsed,
        selectedIds,
        expandedAppIds,
        isProcessing,
        activeMonthKey = "",
        allUsers = [],
        userOptions = [],
        canReassign = true,
        onToggleGroupCollapse,
        onToggleGroupSelection,
        onToggleSelection,
        onToggleAppExpand,
        onMarkSettled,
        onOpenDetail,
        onUpdateBillingType,
        onUpdateBillingUser,
        onUpdateGroupBillingUser,
        onOpenInvoiceGenerator
    }: Props = $props();

    let clientObj = $derived(group.client || group.apps[0]?.expand?.client?.[0]);
    let readyApps = $derived(group.apps.filter(a => isAppReady(a)));
    let allGroupSelected = $derived(readyApps.length > 0 && readyApps.every(a => selectedIds.includes(a.id)));
    let someGroupSelected = $derived(readyApps.some(a => selectedIds.includes(a.id)));
    let billingForm = $derived(getClientBillingForm(clientObj));

    let budgetSummary = $derived.by(() => {
        if (!clientObj) return null;
        return getClientBudgetSummary(clientObj, orgaStore.appointments?.data || [], orgaStore.invoices?.data || []);
    });

    let existingInvoice = $derived.by(() => {
        if (!group.clientId) return null;
        const month = activeMonthKey || (group.apps[0]?.appointment ? group.apps[0].appointment.slice(0, 7) : '');
        return findExistingClientInvoiceForMonth(group.clientId, month, orgaStore.invoices?.data || []);
    });

    let privateCount = $derived(group.apps.filter(a => a.billing_type === 'Privat').length);
    let kasseCount = $derived(group.apps.filter(a => a.billing_type && a.billing_type !== 'Privat').length);
    let hasMixedBilling = $derived(privateCount > 0 && kasseCount > 0);

    let groupBillingUserId = $derived.by(() => {
        if (!group.apps || group.apps.length === 0) return "none";
        const ids = group.apps.map(a => getAppointmentBillingUserId(a, clientObj, allUsers)).filter(Boolean);
        if (ids.length === 0) return "none";
        const first = ids[0];
        return ids.every(id => id === first) ? first : "mixed";
    });
</script>

<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all min-w-0">
    <!-- Group Header: Mobil in 2 saubere Zeilen unterteilt, ab Tablet einzeilig -->
    <div class="px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
        <!-- Zeile 1 (Klienten-Identität & Auswahl) -->
        <div class="flex items-center justify-between gap-2 min-w-0 flex-1">
            <div class="flex items-center gap-2 min-w-0 flex-1">
                <input
                    type="checkbox"
                    checked={allGroupSelected}
                    indeterminate={someGroupSelected && !allGroupSelected}
                    onchange={() => onToggleGroupSelection(readyApps)}
                    class="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer transition-colors shrink-0"
                    title="Alle abrechenbaren Termine für diesen Klienten auswählen"
                    disabled={isProcessing || readyApps.length === 0}
                />
                <button
                    type="button"
                    onclick={() => onToggleGroupCollapse(group.clientName)}
                    class="flex items-center gap-2 text-left min-w-0 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors group cursor-pointer flex-1"
                >
                    {#if isCollapsed}
                        <ChevronRight class="w-4 h-4 text-slate-400 group-hover:text-cyan-600 shrink-0" />
                    {:else}
                        <ChevronDown class="w-4 h-4 text-slate-400 group-hover:text-cyan-600 shrink-0" />
                    {/if}
                    <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-cyan-100 dark:bg-cyan-950/50 flex items-center justify-center shrink-0 border border-cyan-200 dark:border-cyan-800">
                        <User class="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
                    </div>
                    <span class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{group.clientName}</span>
                    {#if billingForm}
                        <span
                            class="text-[9px] sm:text-[10px] font-extrabold {billingForm.bgClass} {billingForm.textClass} border {billingForm.borderClass} px-1.5 py-0.5 rounded-md shrink-0"
                            title={`Abrechnungsform: ${billingForm.label}`}
                        >{billingForm.short}</span>
                    {/if}
                    <span class="text-[10px] sm:text-[11px] font-semibold text-slate-400 shrink-0">({group.apps.length})</span>
                </button>
            </div>

            {#if existingInvoice}
                <span class="text-[9px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-1" title={`Für diesen Monat existiert bereits Rechnung ${existingInvoice.invoice_nr || ''}`}>
                    <FileText class="w-3 h-3 text-amber-600" /> #{existingInvoice.invoice_nr}
                </span>
            {/if}
        </div>

        <!-- Zeile 2 (Kennzahlen, Abrechner-Wahl & Rechnungs-Button) -->
        <div class="flex items-center justify-between sm:justify-end gap-1.5 min-w-0 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 sm:border-0 sm:pt-0 shrink-0">
            <!-- Linke Kennzahlen (Stunden, Budget, KM) -->
            <div class="flex items-center gap-1 min-w-0 flex-wrap">
                {#if budgetSummary && budgetSummary.annualMaxEntlastung > 0}
                    <span class="text-[9px] sm:text-[10px] font-bold {budgetSummary.isExhausted ? 'text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' : 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'} border px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 shrink-0" title="Verbleibendes Entlastungsbudget (§45b)">
                        <PiggyBank class="w-3 h-3 {budgetSummary.isExhausted ? 'text-rose-600' : 'text-emerald-600'}" />
                        <span>{budgetSummary.isExhausted ? '0 €' : budgetSummary.remainingEntlastung.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
                    </span>
                {/if}

                {#if hasMixedBilling}
                    <span class="text-[9px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 px-1.5 py-0.5 rounded-md hidden sm:inline-flex items-center gap-1" title="Kassen- und Privattermine gemischt">
                        <AlertTriangle class="w-3 h-3 text-amber-600" /> Mix
                    </span>
                {/if}

                <span class="text-[9px] sm:text-[10px] font-bold text-cyan-900 dark:text-cyan-200 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 shrink-0">
                    <Clock class="w-3 h-3 shrink-0" /> {group.totalHours.toFixed(1)} h
                </span>

                {#if group.totalKm > 0}
                    <span class="text-[9px] sm:text-[10px] font-bold text-teal-900 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 px-1.5 py-0.5 rounded-lg hidden sm:flex items-center gap-0.5 shrink-0">
                        <Car class="w-3 h-3 shrink-0" /> {group.totalKm.toFixed(0)} km
                    </span>
                {/if}
            </div>

            <!-- Rechte Aktionen (Abrechner-Auswahl + Rechnung-Button) -->
            <div class="flex items-center gap-1.5 shrink-0">
                {#if canReassign && userOptions.length > 0}
                    <div class="relative inline-flex items-center">
                        <select
                            value={groupBillingUserId}
                            disabled={isProcessing}
                            onchange={(e) => {
                                const val = e.currentTarget.value;
                                if (val && val !== "mixed") {
                                    onUpdateGroupBillingUser?.(group.apps, group.clientId, val === "none" ? null : val);
                                }
                            }}
                            class="appearance-none cursor-pointer pl-5 sm:pl-6 pr-4 sm:pr-5 py-1 text-[10px] sm:text-[11px] font-bold rounded-lg shadow-2xs border transition-all text-left focus:outline-none focus:ring-1 focus:ring-cyan-500 max-w-[105px] sm:max-w-[145px] truncate {
                                groupBillingUserId === 'mixed'
                                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700'
                                    : groupBillingUserId === 'none'
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                    : 'bg-blue-50 dark:bg-blue-950/80 text-blue-950 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                            }"
                            title="Abrechner für diesen Klienten festlegen"
                        >
                            {#if groupBillingUserId === 'mixed'}
                                <option value="mixed" disabled>Gemischt</option>
                            {/if}
                            <option value="none">⚠️ Offen</option>
                            {#each userOptions as opt (opt.id)}
                                <option value={opt.id}>{opt.name}</option>
                            {/each}
                        </select>
                        <UserCheck class="w-3 h-3 text-cyan-600 absolute left-1.5 pointer-events-none" />
                        <ChevronDown class="w-2.5 h-2.5 text-slate-400 absolute right-1 pointer-events-none" />
                    </div>
                {/if}

                {#if onOpenInvoiceGenerator && group.clientId}
                    <button
                        type="button"
                        onclick={() => onOpenInvoiceGenerator?.(group.clientId!, readyApps.map(a => a.id))}
                        disabled={readyApps.length === 0}
                        class="px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-2xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer touch-manipulation shrink-0"
                        title="Rechnung / Leistungsnachweis für bereite Termine erstellen"
                    >
                        <FileText class="w-3 h-3 shrink-0" />
                        <span class="hidden xs:inline">Rechnung</span>
                        <span class="xs:hidden">Rechn.</span>
                    </button>
                {/if}
            </div>
        </div>
    </div>

    <!-- Group Appointments -->
    {#if !isCollapsed}
        <div class="p-2 sm:p-3 space-y-2 min-w-0">
            {#each group.apps as app (app.id)}
                <UnsettledAppointmentCard
                    {app}
                    client={clientObj}
                    isSelected={selectedIds.includes(app.id)}
                    isExpanded={Boolean(expandedAppIds[app.id])}
                    {isProcessing}
                    {allUsers}
                    {userOptions}
                    {canReassign}
                    {onToggleSelection}
                    onToggleExpand={onToggleAppExpand}
                    {onMarkSettled}
                    {onOpenDetail}
                    {onUpdateBillingType}
                    {onUpdateBillingUser}
                />
            {/each}
        </div>
    {/if}
</div>
