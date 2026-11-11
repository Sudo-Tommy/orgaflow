<script lang="ts">
    import { CreditCard, Building2, Copy, Check } from "lucide-svelte";
    import { formatCurrency } from "./portalInvoiceHelper";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { triggerHaptic } from "$lib/services/hapticFeedback";

    interface Props {
        clientInvoicesCount: number;
        paidInvoicesCount: number;
        paidTotal: number;
        openInvoicesCount: number;
        openTotal: number;
        overdueInvoicesCount: number;
        overdueTotal: number;
        companyInfo?: any;
        userType?: string;
    }

    let {
        clientInvoicesCount,
        paidInvoicesCount,
        paidTotal,
        openInvoicesCount,
        openTotal,
        overdueInvoicesCount,
        overdueTotal,
        companyInfo,
        userType = 'client'
    }: Props = $props();

    let copiedIban = $state(false);

    async function copyIban(iban: string) {
        if (!iban) return;
        triggerHaptic('tap');
        try {
            await navigator.clipboard.writeText(iban.replace(/\s+/g, ''));
            copiedIban = true;
            toastStore.success("IBAN in die Zwischenablage kopiert!");
            setTimeout(() => { copiedIban = false; }, 2500);
        } catch {
            toastStore.info(`IBAN: ${iban}`);
        }
    }
</script>

<div class="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xl overflow-hidden relative">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <div class="flex items-center gap-2 mb-2">
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <CreditCard class="w-3 h-3" /> Rechnungsansicht
                </span>
                <span class="text-xs font-bold text-neutral-400 dark:text-slate-500">&bull;</span>
                <span class="text-xs font-bold text-neutral-500 dark:text-slate-400">
                    {clientInvoicesCount} Rechnung{clientInvoicesCount === 1 ? '' : 'en'} erfasst
                </span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                {userType === 'client' ? 'Ihre Rechnungen & Zahlungen' : 'Rechnungen der Klienten'}
            </h2>
            <p class="text-neutral-500 dark:text-slate-400 font-medium text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Hier finden Sie alle gestellten Rechnungen, Zahlungsstatus und Zeitnachweise. Dokumente können Sie mit einem Klick einsehen oder als PDF herunterladen.
            </p>
        </div>

        <!-- FINANZ-KPI STATISTIK-KARTEN -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
            <div class="p-3.5 sm:p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 text-left min-w-[120px]">
                <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Bezahlt</span>
                <p class="text-base sm:text-lg font-black text-emerald-950 dark:text-emerald-200 mt-0.5">{formatCurrency(paidTotal)}</p>
                <span class="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">{paidInvoicesCount} Rechnung{paidInvoicesCount === 1 ? '' : 'en'}</span>
            </div>

            <div class="p-3.5 sm:p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 text-left min-w-[120px]">
                <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">Ausstehend</span>
                <p class="text-base sm:text-lg font-black text-blue-950 dark:text-blue-200 mt-0.5">{formatCurrency(openTotal)}</p>
                <span class="text-[10px] text-blue-700 dark:text-blue-400 font-semibold">{openInvoicesCount} offen</span>
            </div>

            <div class="col-span-2 sm:col-span-1 p-3.5 sm:p-4 {overdueInvoicesCount > 0 ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50' : 'bg-neutral-50 dark:bg-slate-800/60 border-neutral-200 dark:border-slate-700'} rounded-2xl border text-left min-w-[120px]">
                <span class="text-[10px] font-bold uppercase tracking-wider {overdueInvoicesCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-400 dark:text-slate-400'} block">Überfällig</span>
                <p class="text-base sm:text-lg font-black {overdueInvoicesCount > 0 ? 'text-rose-950 dark:text-rose-200' : 'text-neutral-700 dark:text-slate-200'} mt-0.5">{formatCurrency(overdueTotal)}</p>
                <span class="text-[10px] {overdueInvoicesCount > 0 ? 'text-rose-700 dark:text-rose-400 font-bold' : 'text-neutral-400 dark:text-slate-400 font-medium'}">
                    {overdueInvoicesCount > 0 ? `${overdueInvoicesCount} dringlich` : 'Keine Überfälligkeiten'}
                </span>
            </div>
        </div>
    </div>

    <!-- BANKVERBINDUNG (Falls offene Rechnungen vorhanden) -->
    {#if openInvoicesCount > 0 && companyInfo?.bank_iban}
        <div class="mt-6 pt-6 border-t border-neutral-100 dark:border-slate-800">
            <div class="bg-linear-to-r from-neutral-50 to-indigo-50/40 dark:from-slate-800/90 dark:to-indigo-950/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="flex items-start gap-3.5">
                    <div class="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-neutral-200 dark:border-slate-600 shadow-2xs shrink-0">
                        <Building2 class="w-5 h-5" />
                    </div>
                    <div>
                        <h4 class="font-bold text-neutral-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                            <span>Bankverbindung für Überweisungen</span>
                            {#if companyInfo.name}
                                <span class="text-neutral-500 dark:text-slate-400 font-normal">({companyInfo.name})</span>
                            {/if}
                        </h4>
                        <div class="flex items-center gap-3 text-xs text-neutral-600 dark:text-slate-300 mt-1 flex-wrap">
                            <span><strong>Bank:</strong> {companyInfo.bank_name || 'Geschäftskonto'}</span>
                            {#if companyInfo.bank_bic}
                                <span>&bull; <strong>BIC:</strong> {companyInfo.bank_bic}</span>
                            {/if}
                        </div>
                        <p class="text-[11px] text-neutral-400 dark:text-slate-400 mt-1">
                            Verwendungszweck: Bitte stets die jeweilige <strong>Rechnungsnummer</strong> angeben.
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span class="font-mono font-bold text-xs sm:text-sm bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 text-neutral-800 dark:text-slate-100 shadow-2xs">
                        {companyInfo.bank_iban}
                    </span>
                    <button
                        type="button"
                        onclick={() => copyIban(companyInfo.bank_iban)}
                        class="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs min-h-[36px] touch-manipulation active:scale-95 {copiedIban ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 border border-neutral-200 dark:border-slate-700'}"
                        title="IBAN kopieren"
                    >
                        {#if copiedIban}
                            <Check class="w-3.5 h-3.5" /> Kopiert
                        {:else}
                            <Copy class="w-3.5 h-3.5" /> Kopieren
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>
