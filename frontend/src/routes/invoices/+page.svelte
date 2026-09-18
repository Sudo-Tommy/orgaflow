<script lang="ts">
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { useInvoiceFilter } from "$lib/services/invoiceFilterService.svelte";
    import { useInvoicePageController } from "$lib/components/invoices/useInvoicePageController.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { goto } from "$app/navigation";
    import { getPdfUrl } from "$lib/utils/invoiceHelpers";
    import { Inbox } from "lucide-svelte";
    import type { InvoicePayload } from "$lib/utils/invoice";

    import InvoicePageHeader from "$lib/components/invoices/InvoicePageHeader.svelte";
    import InvoiceFilterBar from "$lib/components/invoices/InvoiceFilterBar.svelte";
    import InvoiceList from "$lib/components/invoices/InvoiceList.svelte";
    import InvoiceBottomBar from "$lib/components/invoices/InvoiceBottomBar.svelte";
    import InvoiceMobileMenu from "$lib/components/invoices/InvoiceMobileMenu.svelte";
    import DocumentGeneratorModal from "$lib/components/DocumentGeneratorModal.svelte";
    import InvoiceEmailModal from "$lib/components/invoices/InvoiceEmailModal.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import InvoicePaymentSettlementModal from "$lib/components/invoices/InvoicePaymentSettlementModal.svelte";

    const invoicesStore = orgaStore.invoices;
    const filterService = useInvoiceFilter(() => invoicesStore?.data || []);
    const ctrl = useInvoicePageController(() => filterService.filtered);

    $effect(() => {
        if (!rbacService.canAccessFinances) goto('/dashboard');
    });

    let sortedInvoices = $derived(
        [...filterService.filtered].sort((a, b) => (b.invoice_nr ?? '').localeCompare(a.invoice_nr ?? '', undefined, { numeric: true })) as InvoicePayload[]
    );

    let groupedInvoices = $derived.by(() => {
        const groups: Record<string, InvoicePayload[]> = {};
        for (const inv of sortedInvoices) {
            const comp = inv.expand?.company?.name ?? 'Allgemein / Keine Firmenzuordnung';
            if (!groups[comp]) groups[comp] = [];
            groups[comp].push(inv);
        }
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    });

    let generatorModal: ReturnType<typeof DocumentGeneratorModal>;
    let emailModal: ReturnType<typeof InvoiceEmailModal>;
    let pdfPreviewModal: ReturnType<typeof PdfPreviewModal>;
    let settlementModal: ReturnType<typeof InvoicePaymentSettlementModal>;
    let mobileActionDialog = $state<HTMLDialogElement>();

    function previewPdf(record: InvoicePayload, index: number, prefix: string) {
        const url = getPdfUrl(record, index, pb);
        if (!url) return;
        const safeNr = (record.invoice_nr ?? 'Unbekannt').replace(/\//g, '-');
        pdfPreviewModal?.open(url, prefix, `${prefix}_${safeNr}.pdf`);
    }

    function handleUpdateStatus(id: string, newStatus: string) {
        if (newStatus === 'Abgeschlossen' || newStatus === 'Teilweise bezahlt') {
            const invoice = orgaStore.invoices?.data.find((i: any) => i.id === id);
            if (invoice) {
                settlementModal?.open(invoice as any, (invoice as any).paid_at);
                return;
            }
        }
        ctrl.performStatusUpdate(id, newStatus, null);
    }

    function handleOpenGeneratorForSettlement(templateId: string, clientId: string, newInvoiceId: string) {
        const defaultTplId = templateId || orgaStore.document_templates?.data.find((t: any) => (t.type ?? '').toLowerCase() === 'rechnung')?.id;
        generatorModal?.open(defaultTplId, 1, clientId, 'rechnung');
    }

    onMount(() => {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('global_company_id') : null;
        if (stored) filterService.companyFilter = stored;
        const handleSync = (e: any) => { filterService.companyFilter = e.detail; };
        window.addEventListener('global-company-changed', handleSync);
        return () => window.removeEventListener('global-company-changed', handleSync);
    });
</script>

<InvoicePageHeader 
    selectedCount={ctrl.selectedInvoiceIds.length}
    onSend={() => emailModal?.open(ctrl.selectedInvoices)}
    onRefresh={() => generatorModal?.openForRegenerate(ctrl.selectedInvoices)}
    onDelete={ctrl.deleteSelected}
    onNew={() => generatorModal?.open(orgaStore.document_templates?.data.find((t: any) => (t.type ?? '').toLowerCase() === 'rechnung')?.id, 1, '', 'rechnung')}
/>

<InvoiceFilterBar bind:searchQuery={filterService.searchQuery} bind:statusFilter={filterService.statusFilter} />

<div class="animate-enter delay-200 sm:px-6 pb-28 md:pb-6">
    {#if invoicesStore?.isLoading}
        <div class="space-y-4">{#each Array(4) as _}<div class="w-full h-24 animate-pulse rounded-2xl bg-neutral-100"></div>{/each}</div>
    {:else if filterService.filtered.length === 0}
        <div class="rounded-3xl p-12 text-center text-neutral-500 border border-neutral-100 shadow-sm flex flex-col items-center justify-center">
            <Inbox class="w-12 h-12 mb-4 opacity-50 text-neutral-400" /><p class="text-lg font-bold text-neutral-900 mb-2">Keine Treffer</p>
        </div>
    {:else}
        <InvoiceList 
            {groupedInvoices} 
            {filterService} 
            selectedInvoiceIds={ctrl.selectedInvoiceIds} 
            onToggleAll={ctrl.toggleAll} 
            onToggleSelection={ctrl.toggleSelection} 
            onUpdateStatus={handleUpdateStatus} 
            onRegenerate={(invs) => generatorModal?.openForRegenerate(invs)} 
            onPreviewPdf={previewPdf} 
            onEmail={(inv, isMahnung, mLevel) => emailModal?.open(inv, 'pdf', isMahnung, mLevel)} 
            onDelete={ctrl.deleteInvoice} 
            onOpenMobileActions={(inv) => { ctrl.activeMobileInvoice = inv; mobileActionDialog?.showModal(); }} 
        />
    {/if}
</div>

<InvoiceBottomBar 
    selectedCount={ctrl.selectedInvoiceIds.length} 
    onClear={() => ctrl.selectedInvoiceIds = []} 
    onEmail={() => emailModal?.open(ctrl.selectedInvoices)} 
    onRegenerate={() => generatorModal?.openForRegenerate(ctrl.selectedInvoices)} 
    onDelete={ctrl.deleteSelected} 
    onNew={() => generatorModal?.open(orgaStore.document_templates?.data.find((t: any) => (t.type ?? '').toLowerCase() === 'rechnung')?.id, 1, '', 'rechnung')} 
/>

<InvoiceMobileMenu 
    bind:dialog={mobileActionDialog} 
    activeMobileInvoice={ctrl.activeMobileInvoice} 
    onUpdateStatus={handleUpdateStatus} 
    onPreviewPdf={previewPdf} 
    onEmail={(inv, isMahnung, mLevel) => emailModal?.open(inv, 'pdf', isMahnung, mLevel)} 
    onRegenerate={(invs) => generatorModal?.openForRegenerate(invs)} 
    onDelete={ctrl.deleteInvoice} 
    onCancel={(id) => ctrl.cancelInvoice(id, (tId, cId, iId) => generatorModal?.open(tId, 1, cId, iId))} 
/>

<DocumentGeneratorModal bind:this={generatorModal} />
<InvoiceEmailModal bind:this={emailModal} />
<PdfPreviewModal bind:this={pdfPreviewModal} />
<InvoicePaymentSettlementModal 
    bind:this={settlementModal} 
    onOpenGenerator={handleOpenGeneratorForSettlement}
/>