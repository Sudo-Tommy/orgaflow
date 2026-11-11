<script lang="ts">
    // Props
    let { invoice } = $props<{ invoice: any }>();
    
    // Use derived state to prevent infinite loops. This recalculates automatically when 'invoice' changes.
    const budgetBreakdown = $derived.by(() => {
        if (!invoice) {
            return { vhp: 0, elb: 0, other: 0, total: 0 };
        }
        
        let vhp = 0;
        let elb = 0;
        const totalInvoiceAmount = invoice.brutto || 0;
        let assignedAmount = 0;
        
        const invoiceAssigned = (() => {
            const invoiceTaxRate = parseFloat(invoice.tax_rate || '0'); // Get tax rate, default to 0 if not present
            if (invoice.table_positions && invoice.table_positions.length > 0) {
                for (const pos of invoice.table_positions) {
                    const title = pos.title?.toLowerCase() || ''; // Get position title for keyword matching
                    if (title.includes('verhinderungspflege') || title.includes('kurzzeitpflege')) {
                        vhp = totalInvoiceAmount;
                        assignedAmount = totalInvoiceAmount;
                        return true;
                    } else if (title.includes('entlastungsleistung') || title.includes('betreuungsleistung')) {
                        elb = totalInvoiceAmount;
                        assignedAmount = totalInvoiceAmount;
                        return true;
                    }
                }
            }
            if (invoiceTaxRate === 0) {
                vhp = totalInvoiceAmount;
                assignedAmount = totalInvoiceAmount;
                return true;
            }
            return false;
        })();
        
        const other = totalInvoiceAmount - assignedAmount;
        return { vhp, elb, other: other < 0 ? 0 : other, total: totalInvoiceAmount };
    });

    // Helper function for currency formatting
    function formatCurrency(amount: number) {
        // Ensure amount is a valid number before formatting
        return (amount ?? 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }
</script>

<div class="rounded-3xl border border-neutral-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 border-l-4 border-l-indigo-500 shadow-sm p-5 sm:p-6 relative overflow-hidden">
    <div class="flex items-center justify-between mb-4 border-b border-neutral-100 dark:border-slate-800 pb-2.5">
        <h3 class="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wider">
            Budget-Aufschlüsselung
        </h3>
        {#if invoice?.status}
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300">
                {invoice.status}
            </span>
        {/if}
    </div>

    {#if invoice}
        <div class="space-y-3.5">
            <div class="flex items-center justify-between p-3 rounded-2xl bg-neutral-50/70 dark:bg-slate-800/60 border border-neutral-200/60 dark:border-slate-700/60">
                <p class="text-xs font-bold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">Rechnungssumme (Brutto)</p>
                <p class="text-base font-black text-neutral-900 dark:text-white">{formatCurrency(budgetBreakdown.total)}</p>
            </div>

            <div class="pt-2 space-y-2.5">
                <div class="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/50">
                    <span class="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                        <span class="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-xs"></span> Verhinderungspflege / Kurzzeitpflege
                    </span>
                    <span class="text-xs font-black text-indigo-900 dark:text-indigo-200">{formatCurrency(budgetBreakdown.vhp)}</span>
                </div>
                <div class="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                    <span class="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                        <span class="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-xs"></span> Entlastungsleistungen
                    </span>
                    <span class="text-xs font-black text-emerald-900 dark:text-emerald-200">{formatCurrency(budgetBreakdown.elb)}</span>
                </div>
                {#if budgetBreakdown.other > 0}
                    <div class="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-slate-800/50 border border-neutral-200/50 dark:border-slate-700/50">
                        <span class="text-xs font-bold text-neutral-600 dark:text-slate-300 flex items-center gap-2">
                            <span class="w-2.5 h-2.5 bg-neutral-400 rounded-full"></span> Sonstiges / Privat
                        </span>
                        <span class="text-xs font-black text-neutral-900 dark:text-white">{formatCurrency(budgetBreakdown.other)}</span>
                    </div>
                {/if}
            </div>
        </div>
    {:else}
        <p class="text-xs text-neutral-400 dark:text-slate-500 italic py-2">Keine Rechnungsdaten verfügbar.</p>
    {/if}
</div>