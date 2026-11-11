<script lang="ts">
    import { Edit3, AlertTriangle, FileText, Plus, ExternalLink } from "lucide-svelte";
    import { formatCurrency, safeFormatDate } from "$lib/services/clientDetailHelper";

    interface Props {
        client: any;
        currentYear: number;
        totalAvailableBudget: number;
        hasBudgetWarning: boolean;
        careLevel: number;
        remainingEntlastung: number;
        usedEntlastungsleistungen: number;
        annualMaxEntlastung: number;
        hasManualEntlastung?: boolean;
        entlastungPercent: number;
        remainingVHP: number;
        usedGemeinsamerJahresbetrag: number;
        annualMaxVHP: number;
        vhpPercent: number;
        previousYearRemainingBudget: number;
        clientInvoices: any[];
        filteredInvoices: any[];
        invoiceFilter: 'all' | 'Abgeschlossen' | 'Eingereicht';
        onOpenBudgetModal: () => void;
        onSetInvoiceFilter: (filter: 'all' | 'Abgeschlossen' | 'Eingereicht') => void;
        onNewInvoice: () => void;
        onOpenInvoiceDetail: (id: string) => void;
    }

    let {
        client,
        currentYear,
        totalAvailableBudget,
        hasBudgetWarning,
        careLevel,
        remainingEntlastung,
        usedEntlastungsleistungen,
        annualMaxEntlastung,
        hasManualEntlastung = false,
        entlastungPercent,
        remainingVHP,
        usedGemeinsamerJahresbetrag,
        annualMaxVHP,
        vhpPercent,
        previousYearRemainingBudget,
        clientInvoices,
        filteredInvoices,
        invoiceFilter,
        onOpenBudgetModal,
        onSetInvoiceFilter,
        onNewInvoice,
        onOpenInvoiceDetail
    }: Props = $props();
</script>

<div class="space-y-4 sm:space-y-5 animate-enter">
    <!-- Hero Banner Budget Total -->
    <div class="orga-card-white p-5 sm:p-7 bg-gradient-to-br from-indigo-900 via-indigo-950 to-neutral-950 text-white rounded-3xl relative overflow-hidden shadow-xl">
        <div class="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <span class="text-xs font-black uppercase tracking-wider text-indigo-300">Pflegekassen-Budget ({currentYear})</span>
                <h3 class="text-2xl sm:text-3xl font-black text-white mt-1">
                    {formatCurrency(totalAvailableBudget)}
                </h3>
                <p class="text-xs text-indigo-200/80 mt-1 max-w-xl leading-relaxed">
                    Verfügbares Restguthaben aus gesetzlichen Ansprüchen (§ 45b Entlastungsbetrag, § 39 Verhinderungspflege & Vorjahresübertrag).
                </p>
            </div>

            <button
                type="button"
                onclick={onOpenBudgetModal}
                class="px-3.5 py-2 bg-white text-indigo-950 hover:bg-indigo-50 rounded-xl font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 self-start md:self-center"
            >
                <Edit3 class="w-3.5 h-3.5" />
                <span>Budget anpassen</span>
            </button>
        </div>
    </div>

    <!-- Warning if VHP booked for PG 0 or 1 -->
    {#if hasBudgetWarning}
        <div class="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl flex items-start gap-2.5 text-amber-900 dark:text-amber-200 text-xs">
            <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
                <p class="font-bold">Achtung: Eingetragene Verhinderungspflege ohne Anspruch</p>
                <p class="mt-0.5">Für Pflegegrad {careLevel} besteht kein gesetzlicher Anspruch auf den Gemeinsamen Jahresbetrag (§ 39 SGB XI).</p>
            </div>
        </div>
    {/if}

    <!-- Progress Meters Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- § 45b Entlastungsbetrag -->
        <div class="orga-card-white p-4 sm:p-5 space-y-3">
            <div class="flex items-center justify-between">
                <div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">§ 45b SGB XI</span>
                        {#if hasManualEntlastung}
                            <span class="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">Manuell</span>
                        {/if}
                    </div>
                    <h4 class="text-sm font-black text-neutral-900 dark:text-white mt-1">Entlastungsbetrag</h4>
                </div>
                <span class="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(remainingEntlastung)} Rest
                </span>
            </div>

            <div>
                <div class="flex items-center justify-between text-xs text-neutral-500 dark:text-slate-400 mb-1 font-medium">
                    <span>Genutzt: {formatCurrency(usedEntlastungsleistungen)} ({entlastungPercent}%)</span>
                    <span>Max: {formatCurrency(annualMaxEntlastung)}</span>
                </div>
                <div class="w-full h-2.5 bg-neutral-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-neutral-200 dark:border-slate-700">
                    <div
                        class="h-full rounded-full transition-all duration-500 {entlastungPercent >= 90 ? 'bg-rose-500' : (entlastungPercent >= 75 ? 'bg-amber-500' : 'bg-emerald-500')}"
                        style={`width: ${entlastungPercent}%`}
                    ></div>
                </div>
            </div>
            <p class="text-[10px] text-neutral-400 dark:text-slate-500">
                {#if hasManualEntlastung}
                    Individuell hinterlegtes Budget für {currentYear}.
                {:else}
                    131 € / Monat (1.572 € / Jahr ab PG 1).
                {/if}
            </p>
        </div>

        <!-- § 39 Verhinderungspflege -->
        <div class="orga-card-white p-4 sm:p-5 space-y-3">
            <div class="flex items-center justify-between">
                <div>
                    <span class="text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">§ 39 SGB XI</span>
                    <h4 class="text-sm font-black text-neutral-900 dark:text-white mt-1">Gemeinsamer Jahresbetrag (VHP)</h4>
                </div>
                <span class="text-sm font-black text-blue-700 dark:text-blue-400">
                    {formatCurrency(remainingVHP)} Rest
                </span>
            </div>

            <div>
                <div class="flex items-center justify-between text-xs text-neutral-500 dark:text-slate-400 mb-1 font-medium">
                    <span>Genutzt: {formatCurrency(usedGemeinsamerJahresbetrag)} ({vhpPercent}%)</span>
                    <span>Max: {formatCurrency(annualMaxVHP)}</span>
                </div>
                <div class="w-full h-2.5 bg-neutral-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-neutral-200 dark:border-slate-700">
                    <div
                        class="h-full rounded-full transition-all duration-500 {vhpPercent >= 90 ? 'bg-rose-500' : (vhpPercent >= 75 ? 'bg-amber-500' : 'bg-blue-600')}"
                        style={`width: ${vhpPercent}%`}
                    ></div>
                </div>
            </div>
            <p class="text-[10px] text-neutral-400 dark:text-slate-500">Ab PG 2: Bis zu 3.539 € / Jahr.</p>
        </div>
    </div>

    <!-- Rechnungen Übersicht -->
    <div class="orga-card-white p-4 sm:p-6 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-slate-800 pb-3">
            <div>
                <h4 class="text-sm sm:text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <FileText class="w-4 h-4 text-blue-600 dark:text-blue-400" /> Rechnungen ({clientInvoices.length})
                </h4>
                <p class="text-xs text-neutral-500 dark:text-slate-400">Alle gestellten Rechnungen des Klienten</p>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
                <div class="flex items-center bg-neutral-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold">
                    <button
                        type="button"
                        onclick={() => onSetInvoiceFilter('all')}
                        class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer {invoiceFilter === 'all' ? 'bg-white dark:bg-slate-900 text-neutral-900 dark:text-white shadow-2xs' : 'text-neutral-500 dark:text-slate-400'}"
                    >
                        Alle ({clientInvoices.length})
                    </button>
                    <button
                        type="button"
                        onclick={() => onSetInvoiceFilter('Abgeschlossen')}
                        class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer {invoiceFilter === 'Abgeschlossen' ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs' : 'text-neutral-500 dark:text-slate-400'}"
                    >
                        Bezahlt
                    </button>
                    <button
                        type="button"
                        onclick={() => onSetInvoiceFilter('Eingereicht')}
                        class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer {invoiceFilter === 'Eingereicht' ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs' : 'text-neutral-500 dark:text-slate-400'}"
                    >
                        Offen
                    </button>
                </div>

                <button
                    type="button"
                    onclick={onNewInvoice}
                    class="orga-button-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                    <Plus class="w-3.5 h-3.5" /> Neue Rechnung
                </button>
            </div>
        </div>

        {#if filteredInvoices.length === 0}
            <div class="text-center py-6 text-neutral-400 dark:text-slate-500 border border-dashed border-neutral-200 dark:border-slate-800 rounded-2xl">
                <p class="text-xs font-semibold">Keine Rechnungen in dieser Kategorie vorhanden.</p>
            </div>
        {:else}
            <div class="grid grid-cols-1 gap-2">
                {#each filteredInvoices as invoice}
                    <button
                        type="button"
                        onclick={() => onOpenInvoiceDetail(invoice.id)}
                        class="w-full flex items-center justify-between bg-white dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 p-3 rounded-xl shadow-2xs hover:shadow-md transition-all text-left cursor-pointer group"
                    >
                        <div class="min-w-0 pr-3">
                            <div class="flex items-center gap-2">
                                <p class="text-xs sm:text-sm font-black text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                    {invoice.invoice_nr || 'Rechnung (Entwurf)'}
                                </p>
                                <span class="px-1.5 py-0.5 text-[9px] font-bold rounded-full {invoice.status === 'Abgeschlossen' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : (invoice.status === 'Eingereicht' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-neutral-100 dark:bg-slate-700 text-neutral-600 dark:text-slate-300')}">
                                    {invoice.status || 'Entwurf'}
                                </span>
                            </div>
                            <p class="text-[11px] text-neutral-500 dark:text-slate-400 mt-0.5">
                                Datum: {safeFormatDate(invoice.issue_date)}
                                {#if invoice.due_date}
                                    • Fällig: {safeFormatDate(invoice.due_date)}
                                {/if}
                            </p>
                        </div>

                        <div class="flex items-center gap-2 shrink-0">
                            <span class="text-sm font-black text-neutral-900 dark:text-white">{formatCurrency(invoice.brutto || 0)}</span>
                            <ExternalLink class="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>
