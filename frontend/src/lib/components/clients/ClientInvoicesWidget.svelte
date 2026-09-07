<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { FileText, Plus, ExternalLink } from "lucide-svelte";
    import DocumentGeneratorModal from "$lib/components/DocumentGeneratorModal.svelte"; // Assuming this can create invoices
    import InvoiceDetailModal from "$lib/components/invoices/InvoiceDetailModal.svelte";
    

    let { client } = $props<{ client: any }>();

    let clientInvoices = $derived.by(() => {
        if (!client || !orgaStore.invoices?.data) return [];
        return orgaStore.invoices.data.filter((inv: any) => {
            return (Array.isArray(inv.client) ? inv.client.includes(client.id) : inv.client === client.id) && inv.issue_date !== undefined;
        }).sort((a, b) => {
            const dateA = a.issue_date ? new Date(a.issue_date).getTime() : 0;
            const dateB = b.issue_date ? new Date(b.issue_date).getTime() : 0;
            return dateB - dateA;
        });
    });

    // svelte-ignore non_reactive_update
    let docGenModal: ReturnType<typeof DocumentGeneratorModal>;
    // svelte-ignore non_reactive_update
    let invoiceDetailModal: ReturnType<typeof InvoiceDetailModal>;

    function formatCurrency(amount: number) {
        return amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }

    function getInvoiceStatusClass(status: string) {
        switch (status) {
            case 'Abgeschlossen': return 'bg-emerald-100 text-emerald-700';
            case 'Eingereicht': return 'bg-blue-100 text-blue-700';
            case 'In Bearbeitung': return 'bg-amber-100 text-amber-700';
            case 'Entwurf': return 'bg-neutral-100 text-neutral-600';
            case 'Abgelehnt': return 'bg-rose-100 text-rose-700';
            case 'Storniert': return 'bg-red-100 text-red-700';
            default: return 'bg-neutral-100 text-neutral-600';
        }
    }
</script>

<div class="orga-card-white p-5 relative overflow-hidden group">
    <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-8 -mt-8 z-0 pointer-events-none"></div>
    
    <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2 relative z-10">
        <h3 class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <FileText class="w-3.5 h-3.5" /> Rechnungen
        </h3>
        <button onclick={() => {
            const empId = Array.isArray(client?.assigned_employee) ? client.assigned_employee[0] : client?.assigned_employee;
            docGenModal?.open('', 1, client?.id, 'rechnung', empId);
        }} class="text-xs font-bold text-white transition-colors bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1 cursor-pointer">
            <Plus class="w-3.5 h-3.5" /> Neue Rechnung
        </button>
    </div>

    <div class="relative z-10 space-y-3">
        {#if clientInvoices.length > 0}
            <div class="grid grid-cols-1 gap-3">
                {#each clientInvoices as invoice}
                    <button type="button" onclick={() => invoiceDetailModal?.open(invoice.id)} class="w-full flex items-center justify-between bg-neutral-50 border border-neutral-100 p-3.5 rounded-xl shadow-sm hover:border-blue-300 hover:shadow-md transition-all group">
                        <div class="min-w-0 pr-2 text-left flex-1">
                            <p class="text-sm font-bold text-neutral-900 truncate">{invoice.invoice_nr || 'Rechnung (Entwurf)'}</p>
                            <p class="text-[10px] font-medium text-neutral-500 mt-0.5">
                                {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Datum unbekannt'}
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 text-[10px] font-bold rounded-full {getInvoiceStatusClass(invoice.status || 'Entwurf')}">
                                {invoice.status || 'Entwurf'}
                            </span>
                            <span class="text-sm font-bold text-blue-700">{formatCurrency(invoice.brutto || 0)}</span>
                            <ExternalLink class="w-4 h-4 text-neutral-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                    </button>
                {/each}
            </div>
        {:else}
            <div class="p-4 bg-neutral-50 border border-dashed border-neutral-200 rounded-xl text-center">
                <p class="text-sm text-neutral-500 font-medium">Keine Rechnungen für diesen Klienten gefunden.</p>
            </div>
        {/if}
    </div>
</div>

<DocumentGeneratorModal bind:this={docGenModal} />
<InvoiceDetailModal bind:this={invoiceDetailModal} />