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
            case 'Abgeschlossen': return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 dark:border dark:border-emerald-800';
            case 'Eingereicht': return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 dark:border dark:border-blue-800';
            case 'In Bearbeitung': return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 dark:border dark:border-amber-800';
            case 'Entwurf': return 'bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300';
            case 'Abgelehnt': return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 dark:border dark:border-rose-800';
            case 'Storniert': return 'bg-red-100 dark:bg-rose-950/60 text-red-700 dark:text-rose-300 dark:border dark:border-rose-800';
            default: return 'bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300';
        }
    }
</script>

<div class="rounded-3xl border border-neutral-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 border-l-4 border-l-blue-500 shadow-sm p-5 sm:p-6 relative overflow-hidden group">
    <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-8 -mt-8 z-0 pointer-events-none"></div>
    
    <div class="flex items-center justify-between mb-5 border-b border-neutral-100 dark:border-slate-800 pb-3 relative z-10">
        <div class="flex items-center gap-2.5">
            <span class="w-9 h-9 flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 shadow-xs">
                <FileText class="w-4 h-4" />
            </span>
            <div>
                <h3 class="text-base font-black text-neutral-900 dark:text-white">
                    Rechnungen
                </h3>
                <p class="text-[11px] text-neutral-500 dark:text-slate-400 font-medium">Abrechnungsverlauf & Status</p>
            </div>
        </div>
        <button onclick={() => {
            const empId = Array.isArray(client?.assigned_employee) ? client.assigned_employee[0] : client?.assigned_employee;
            docGenModal?.open('', 1, client?.id, 'rechnung', empId);
        }} class="text-xs font-bold text-white transition-colors bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer">
            <Plus class="w-3.5 h-3.5" />
            <span>Neue Rechnung</span>
        </button>
    </div>

    <div class="relative z-10 space-y-3">
        {#if clientInvoices.length > 0}
            <div class="grid grid-cols-1 gap-2.5">
                {#each clientInvoices as invoice}
                    <button type="button" onclick={() => invoiceDetailModal?.open(invoice.id)} class="w-full flex items-center justify-between bg-neutral-50/60 dark:bg-slate-800/60 border border-neutral-200/80 dark:border-slate-700/80 p-3.5 rounded-2xl shadow-xs hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all group cursor-pointer">
                        <div class="min-w-0 pr-2 text-left flex-1">
                            <p class="text-sm font-bold text-neutral-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{invoice.invoice_nr || 'Rechnung (Entwurf)'}</p>
                            <p class="text-[10px] font-medium text-neutral-500 dark:text-slate-400 mt-0.5">
                                {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Datum unbekannt'}
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 text-[10px] font-bold rounded-full {getInvoiceStatusClass(invoice.status || 'Entwurf')}">
                                {invoice.status || 'Entwurf'}
                            </span>
                            <span class="text-sm font-black text-blue-700 dark:text-blue-400">{formatCurrency(invoice.brutto || 0)}</span>
                            <ExternalLink class="w-4 h-4 text-neutral-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
                        </div>
                    </button>
                {/each}
            </div>
        {:else}
            <div class="p-6 bg-neutral-50/50 dark:bg-slate-800/30 border border-dashed border-neutral-200 dark:border-slate-700 rounded-2xl text-center">
                <FileText class="w-8 h-8 text-neutral-300 dark:text-slate-600 mx-auto mb-1.5" />
                <p class="text-xs text-neutral-500 dark:text-slate-400 font-medium">Keine Rechnungen für diesen Klienten gefunden.</p>
            </div>
        {/if}
    </div>
</div>

<DocumentGeneratorModal bind:this={docGenModal} />
<InvoiceDetailModal bind:this={invoiceDetailModal} />