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

<div class="orga-card-white p-5 relative overflow-hidden">
    <h3 class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-100 pb-2">
        Budget-Aufschlüsselung
    </h3>

    {#if invoice}
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-neutral-700">Rechnungssumme (Brutto)</p>
                <p class="text-sm font-bold text-neutral-900">{formatCurrency(budgetBreakdown.total)}</p>
            </div>

            <div class="border-t border-neutral-100 pt-3 space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                        <span class="w-2 h-2 bg-indigo-500 rounded-full"></span> Verhinderungspflege / Kurzzeitpflege
                    </span>
                    <span class="text-xs font-bold text-indigo-900">{formatCurrency(budgetBreakdown.vhp)}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <span class="w-2 h-2 bg-emerald-500 rounded-full"></span> Entlastungsleistungen
                    </span>
                    <span class="text-xs font-bold text-emerald-900">{formatCurrency(budgetBreakdown.elb)}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                        <span class="w-2 h-2 bg-neutral-400 rounded-full"></span> Sonstiges / Privat
                    </span>
                    <span class="text-xs font-bold text-neutral-900">{formatCurrency(budgetBreakdown.other)}</span>
                </div>
            </div>
        </div>
    {:else}
        <p class="text-sm text-neutral-500 italic">Keine Rechnungsdaten verfügbar.</p>
    {/if}
</div>