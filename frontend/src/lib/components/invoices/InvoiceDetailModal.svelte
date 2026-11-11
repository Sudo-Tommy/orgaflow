<script lang="ts">
    import { X, FileText } from "lucide-svelte";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import DocumentGeneratorModal from "$lib/components/DocumentGeneratorModal.svelte";
    import InvoiceEmailModal from "$lib/components/invoices/InvoiceEmailModal.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import AppointmentDetailModal from "$lib/components/AppointmentDetailModal.svelte";
    import InvoiceBudgetBreakdown from "$lib/components/clients/InvoiceBudgetBreakdown.svelte";
    import { stampInvoiceAsStorniert } from "$lib/services/invoiceStornoStampService";
    import { executeInvoiceStorno } from "$lib/services/invoiceStornoService";
    import { openPdfDocument } from "$lib/utils/pdfViewerHelper";
    import { isNativeApp } from "$lib/services/apiConfig";
    import InvoiceStornoModal from "./InvoiceStornoModal.svelte";
    import InvoiceDetailActions from "./InvoiceDetailActions.svelte";
    import InvoicePositionsTable from "./InvoicePositionsTable.svelte";
    import InvoiceRelatedAppointments from "./InvoiceRelatedAppointments.svelte";

    let dialog: HTMLDialogElement;
    let invoiceId = $state<string | null>(null);
    let invoice = $derived(invoiceId ? orgaStore.invoices?.getById(invoiceId) : null);
    let client = $derived(invoice && invoice.client ? orgaStore.clients?.getById(Array.isArray(invoice.client) ? invoice.client[0] : invoice.client) : null);
    
    let relatedAppointments = $derived.by(() => {
        if (!invoice || !invoice.appointments) return [];
        const appointmentIds = Array.isArray(invoice.appointments) ? invoice.appointments : [invoice.appointments];
        return (orgaStore.appointments?.data || [])
            .filter((app: any) => appointmentIds.includes(app.id))
            .sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
    });

    let isLoadingStatus = $state(false);
    let showStornoModal = $state(false);
    let stornoReason = $state("Rechnungsfehler / Korrektur von Positionen");
    let stornoNote = $state("");
    let isCreatingStorno = $state(false);
    let isDownloadingPdf = $state(false);

    let docGenModal: ReturnType<typeof DocumentGeneratorModal>;
    let emailModal: ReturnType<typeof InvoiceEmailModal>;
    let appointmentDetailModal: ReturnType<typeof AppointmentDetailModal>;

    const statusOptions = ['Abgelehnt', 'Abgeschlossen', 'Eingereicht', 'Entwurf', 'In Bearbeitung', 'Storniert']
        .sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

    function formatDate(dateStr: string | undefined) {
        if (!dateStr) return 'Unbekannt';
        return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    export function open(id: string) {
        invoiceId = id;
        showStornoModal = false;
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
        invoiceId = null;
        showStornoModal = false;
    }

    async function updateStatus(newStatus: string) {
        if (!invoice) return;
        isLoadingStatus = true;
        try {
            const payload: any = { status: newStatus };
            if (newStatus === 'Abgeschlossen' && !invoice.paid_at) {
                payload.paid_at = new Date().toISOString();
            }
            await pb.collection('invoices').update(invoice.id, payload);
            
            if (newStatus === 'Storniert') {
                const stampRes = await stampInvoiceAsStorniert(invoice.id);
                if (stampRes.success) toastStore.success("Rechnungs-PDF wurde mit Storno-Stempel markiert.");
            }

            setTimeout(async () => {
                const updatedInvoice = await pb.collection('invoices').getOne(invoice!.id, { requestKey: null }) as any;
                const index = orgaStore.invoices?.data.findIndex((i: any) => i.id === invoice!.id) ?? -1;
                if (index !== -1 && orgaStore.invoices) orgaStore.invoices.data[index] = updatedInvoice;
            }, 400);

            toastStore.success(`Status auf "${newStatus}" geändert.`);
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Ändern des Status.");
        } finally {
            isLoadingStatus = false;
        }
    }

    async function handleStorno() {
        if (!invoice) return;
        isCreatingStorno = true;
        try {
            const newId = await executeInvoiceStorno(invoice, stornoReason, stornoNote);
            toastStore.success('Stornorechnung erfolgreich und GoBD-konform erstellt!');
            showStornoModal = false;
            invoiceId = newId;
        } catch (err: any) {
            console.error("Fehler beim Erstellen der Stornorechnung:", err);
            toastStore.error(`Fehler bei der Stornierung: ${err.message || err}`);
        } finally {
            isCreatingStorno = false;
        }
    }

    function getPdfUrl(index: number = 0) {
        if (!invoice || !invoice.pdf || invoice.pdf.length === 0) return null;
        const pdfFile = Array.isArray(invoice.pdf) ? invoice.pdf[index] : (index === 0 ? invoice.pdf : null);
        if (!pdfFile) return null;
        let url = pb.files.getURL(invoice, pdfFile);
        if (pb.authStore.token) url += (url.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
        return url;
    }

    async function downloadPdfFile(index: number = 0, typeName: string = 'Rechnung') {
        const url = getPdfUrl(index);
        if (!url || !invoice) return;
        const filename = (Array.isArray(invoice.pdf) ? invoice.pdf[index] : invoice.pdf) || `${typeName}_${invoice.invoice_nr}.pdf`;
        
        if (isNativeApp()) {
            openPdfDocument(url, filename);
            return;
        }

        isDownloadingPdf = true;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Fehler beim Herunterladen der Datei.");
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(blobUrl); }, 100);
            toastStore.success(`${filename} heruntergeladen.`);
        } catch (e: any) {
            openPdfDocument(url, filename);
        } finally {
            isDownloadingPdf = false;
        }
    }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-3xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-3xl w-full relative shadow-2xl border border-slate-200/80 dark:border-slate-800">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-4 right-4 min-w-[40px] min-h-[40px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors z-20 cursor-pointer touch-manipulation">
            <X class="w-5 h-5" />
        </button>
        
        {#if invoice}
            <div class="bg-white dark:bg-slate-900 p-4 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 shadow-sm shrink-0 rounded-t-3xl">
                <div class="flex items-center gap-2.5 flex-wrap">
                    <FileText class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">{invoice.is_cancellation ? 'Stornorechnung' : 'Rechnung'} {invoice.invoice_nr || '(Entwurf)'}</h2>
                    {#if invoice.is_cancellation}<span class="px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 rounded-lg">Rechnungskorrektur</span>{/if}
                </div>
                {#if client}<p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">für {client.name_first} {client.name_last}</p>{/if}
            </div>

            <div class="p-4 sm:p-6 space-y-5">
                <InvoiceDetailActions 
                    {invoice} 
                    {isDownloadingPdf} 
                    {getPdfUrl} 
                    onEdit={() => {
                        const clientId = Array.isArray(invoice.client) ? invoice.client[0] : invoice.client;
                        const userId = Array.isArray(invoice.user) ? invoice.user[0] : invoice.user;
                        docGenModal?.open('', 1, clientId, 'rechnung', userId);
                    }} 
                    onDownloadPdf={downloadPdfFile} 
                    onSendEmail={() => emailModal?.open(invoice)} 
                    onSendMahnung={() => emailModal?.open(invoice, true, Math.min(3, (invoice.dunning_level || 0) + 1))} 
                    onMarkPaid={() => updateStatus('Abgeschlossen')} 
                    onOpenStorno={() => showStornoModal = true} 
                />

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="orga-card-white p-4">
                        <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Status</p>
                        <select bind:value={invoice.status} onchange={(e) => updateStatus(e.currentTarget.value)} disabled={isLoadingStatus} class="orga-input-clear p-0 font-bold text-base text-neutral-800 cursor-pointer w-full bg-transparent touch-manipulation min-h-[44px]">
                            {#each statusOptions as opt}
                                <option value={opt}>{opt}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="orga-card-white p-4"><p class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Rechnungsdatum</p><p class="font-bold text-neutral-800">{formatDate(invoice.issue_date)}</p></div>
                    <div class="orga-card-white p-4"><p class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Fälligkeitsdatum</p><p class="font-bold text-neutral-800">{formatDate(invoice.due_date)}</p></div>
                </div>

                <InvoicePositionsTable 
                    positions={invoice.table_positions || []} 
                    netto={invoice.netto} 
                    taxRate={invoice.tax_rate} 
                    taxSum={invoice.tax_sum} 
                    brutto={invoice.brutto} 
                />

                <InvoiceBudgetBreakdown invoice={invoice} />

                <InvoiceRelatedAppointments 
                    appointments={relatedAppointments} 
                    onSelectAppointment={(id) => appointmentDetailModal?.open(id)} 
                />
            </div>
        {:else}
            <div class="p-12 text-center"><p class="text-neutral-500 text-sm">Rechnung wird geladen...</p></div>
        {/if}

        <InvoiceStornoModal 
            bind:show={showStornoModal} 
            {invoice} 
            bind:stornoReason 
            bind:stornoNote 
            {isCreatingStorno} 
            onClose={() => showStornoModal = false} 
            onExecute={handleStorno} 
        />
    </div>
</dialog>

<DocumentGeneratorModal bind:this={docGenModal} />
<InvoiceEmailModal bind:this={emailModal} />
<AppointmentDetailModal bind:this={appointmentDetailModal} />