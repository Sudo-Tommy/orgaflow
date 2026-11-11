<script lang="ts">
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { useInvoiceFilter } from "$lib/services/invoiceFilterService.svelte";
    import { useInvoicePageController } from "$lib/components/invoices/useInvoicePageController.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { getPdfUrl } from "$lib/utils/invoiceHelpers";
    import { openPdfDocument } from "$lib/utils/pdfViewerHelper";
    import { buildCorrectionEmailContent } from "$lib/services/invoiceCorrectionHelper";
    import { Inbox } from "lucide-svelte";
    import { compareInvoicesByDateDesc, type InvoicePayload } from "$lib/utils/invoice";

    import InvoicePageHeader from "$lib/components/invoices/InvoicePageHeader.svelte";
    import LexOfficeFinanceStatusBar from "$lib/components/lexoffice/LexOfficeFinanceStatusBar.svelte";
    import InvoiceFilterBar from "$lib/components/invoices/InvoiceFilterBar.svelte";
    import InvoiceList from "$lib/components/invoices/InvoiceList.svelte";
    import InvoiceBottomBar from "$lib/components/invoices/InvoiceBottomBar.svelte";
    import InvoiceMobileMenu from "$lib/components/invoices/InvoiceMobileMenu.svelte";
    import DocumentGeneratorModal from "$lib/components/DocumentGeneratorModal.svelte";
    import InvoiceEmailModal from "$lib/components/invoices/InvoiceEmailModal.svelte";
    import InvoicePaymentSettlementModal from "$lib/components/invoices/InvoicePaymentSettlementModal.svelte";
    import { lexofficeService } from "$lib/services/lexofficeService.svelte";

    const invoicesStore = orgaStore.invoices;
    const filterService = useInvoiceFilter(() => invoicesStore?.data || []);
    const ctrl = useInvoicePageController(() => filterService.filtered);

    $effect(() => {
        if (!rbacService.canAccessFinances) goto('/dashboard');
    });

    $effect(() => {
        const urlStatus = $page.url.searchParams.get('status');
        if (urlStatus && (urlStatus === 'offen' || urlStatus === 'open') && filterService.statusFilter !== 'offen') {
            filterService.statusFilter = 'offen';
        } else if (urlStatus && urlStatus !== 'offen' && urlStatus !== 'open' && urlStatus !== filterService.statusFilter) {
            filterService.statusFilter = urlStatus;
        }
    });

    $effect(() => {
        if (typeof window !== 'undefined') {
            const currentUrl = new URL(window.location.href);
            const currentParam = currentUrl.searchParams.get('status') || 'all';
            if (filterService.statusFilter !== currentParam) {
                if (filterService.statusFilter === 'all') currentUrl.searchParams.delete('status');
                else currentUrl.searchParams.set('status', filterService.statusFilter);
                window.history.replaceState({}, '', currentUrl.toString());
            }
        }
    });

    let sortedInvoices = $derived(
        [...filterService.filtered].sort(compareInvoicesByDateDesc) as InvoicePayload[]
    );

    let groupedInvoices = $derived.by(() => {
        const groups: Record<string, InvoicePayload[]> = {};
        for (const inv of sortedInvoices) {
            const comp = inv.expand?.company?.name 
                ?? (orgaStore.company?.data as any[])?.find((c: any) => c.id === inv.company)?.name 
                ?? 'Allgemein / Keine Firmenzuordnung';
            if (!groups[comp]) groups[comp] = [];
            groups[comp].push(inv);
        }
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    });

    let generatorModal: ReturnType<typeof DocumentGeneratorModal>;
    let emailModal: ReturnType<typeof InvoiceEmailModal>;
    let settlementModal: ReturnType<typeof InvoicePaymentSettlementModal>;
    let mobileActionDialog = $state<HTMLDialogElement>();

    function previewPdf(record: InvoicePayload, index: number, prefix?: string) {
        const url = getPdfUrl(record, index, pb);
        if (!url) return;
        openPdfDocument(url, record.invoice_nr);
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

    async function handleOpenGeneratorForSettlement(templateId: string, clientId: string, newInvoiceId: string) {
        await new Promise(r => setTimeout(r, 300));
        try {
            const newInv = await pb.collection('invoices').getOne(newInvoiceId, { expand: 'client,company,user' });
            await ctrl.performRegenerate([newInv as any]);
        } catch {
            const localInv = orgaStore.invoices?.data.find((i: any) => i.id === newInvoiceId);
            if (localInv) {
                await ctrl.performRegenerate([localInv as any]);
            } else {
                const defaultTplId = templateId || orgaStore.document_templates?.data.find((t: any) => (t.type ?? '').toLowerCase() === 'rechnung')?.id;
                generatorModal?.open(defaultTplId, 1, clientId, 'rechnung');
            }
        }
    }

    function handleCorrectInvoice(inv: InvoicePayload) {
        ctrl.correctInvoice(inv, (targetInv) => {
            generatorModal?.openForCorrection(targetInv);
        });
    }

    async function handleCorrectionComplete(newInvoiceId: string, origInv: any) {
        if (orgaStore.invoices) await orgaStore.invoices.init();
        let newInv = orgaStore.invoices?.data.find((i: any) => i.id === newInvoiceId);
        if (!newInv) {
            try { newInv = await pb.collection('invoices').getOne(newInvoiceId, { expand: 'client,company,user' }); } catch {}
        }
        if (newInv) {
            const { subject, text } = buildCorrectionEmailContent(origInv?.invoice_nr || '', newInv.invoice_nr || '');
            emailModal?.open(newInv, false, 1, 'pdf', { subject, text });
        }
    }

    onMount(() => {
        orgaStore.document_templates?.init().catch(() => {});
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('global_company_id') : null;
        if (stored) filterService.companyFilter = stored;
        lexofficeService.autoRefreshOnPageVisit(filterService.companyFilter).catch(() => {});
        const handleSync = (e: any) => {
            filterService.companyFilter = e.detail;
            lexofficeService.autoRefreshOnPageVisit(e.detail).catch(() => {});
        };
        window.addEventListener('global-company-changed', handleSync);
        return () => window.removeEventListener('global-company-changed', handleSync);
    });
</script>

<InvoicePageHeader 
    selectedCount={ctrl.selectedInvoiceIds.length} 
    isRefreshing={ctrl.selectedInvoiceIds.some(id => ctrl.isRegenerating(id))}
    companyId={filterService.companyFilter}
    onSend={() => emailModal?.open(ctrl.selectedInvoices)}
    onRefresh={() => ctrl.performRegenerate(ctrl.selectedInvoices)}
    onDelete={ctrl.deleteSelected}
    onNew={() => generatorModal?.open(orgaStore.document_templates?.data.find((t: any) => (t.type ?? '').toLowerCase() === 'rechnung')?.id, 1, '', 'rechnung')}
/>

<LexOfficeFinanceStatusBar companyId={filterService.companyFilter} />

<InvoiceFilterBar 
    bind:searchQuery={filterService.searchQuery} 
    bind:statusFilter={filterService.statusFilter}
    totalCount={invoicesStore?.data?.length || 0}
    openCount={filterService.openCount}
    openSum={filterService.openSum}
    paidCount={filterService.paidCount}
/>

<div class="animate-enter delay-200 sm:px-6 pb-28 md:pb-6">
    {#if invoicesStore?.isLoading}
        <div class="space-y-4">{#each Array(4) as _}<div class="w-full h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"></div>{/each}</div>
    {:else if filterService.filtered.length === 0}
        <div class="rounded-3xl p-10 sm:p-12 text-center text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col items-center justify-center">
            <div class="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mb-4">
                🎉
            </div>
            <p class="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 mb-1">
                {filterService.statusFilter === 'offen' ? 'Keine offenen Rechnungen vorhanden – Alles beglichen!' : 'Keine Treffer'}
            </p>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-5 leading-relaxed">
                {filterService.statusFilter === 'offen' ? 'Aktuell gibt es keine ausstehenden Rechnungen im ausgewählten Zeitraum.' : 'Für die gewählten Such- und Filterkriterien wurden keine Rechnungen gefunden.'}
            </p>
            <button 
                type="button" 
                onclick={() => filterService.statusFilter = 'all'} 
                class="orga-button-primary px-4 py-2 text-xs sm:text-sm font-bold cursor-pointer"
            >
                Alle Rechnungen anzeigen
            </button>
        </div>
    {:else}
        <InvoiceList 
            {groupedInvoices} 
            {filterService} 
            selectedInvoiceIds={ctrl.selectedInvoiceIds} 
            regeneratingInvoiceIds={ctrl.regeneratingInvoiceIds}
            onToggleAll={ctrl.toggleAll} 
            onToggleSelection={ctrl.toggleSelection} 
            onUpdateStatus={handleUpdateStatus} 
            onRegenerate={(invs) => ctrl.performRegenerate(invs)} 
            onPreviewPdf={previewPdf} 
            onEmail={(inv, isMahnung, mLevel) => emailModal?.open(inv, 'pdf', isMahnung, mLevel)} 
            onDelete={ctrl.deleteInvoice} 
            onCancel={(id) => ctrl.cancelInvoice(id, (tId, cId) => generatorModal?.open(tId, 1, cId, 'all'))}
            onCorrect={handleCorrectInvoice}
            onOpenMobileActions={(inv) => { ctrl.activeMobileInvoice = inv; mobileActionDialog?.showModal(); }} 
        />
    {/if}
</div>

<InvoiceBottomBar 
    selectedCount={ctrl.selectedInvoiceIds.length} 
    isRefreshing={ctrl.selectedInvoiceIds.some(id => ctrl.isRegenerating(id))}
    onClear={() => ctrl.selectedInvoiceIds = []} 
    onEmail={() => emailModal?.open(ctrl.selectedInvoices)} 
    onRegenerate={() => ctrl.performRegenerate(ctrl.selectedInvoices)} 
    onDelete={ctrl.deleteSelected} 
    onNew={() => generatorModal?.open(orgaStore.document_templates?.data.find((t: any) => (t.type ?? '').toLowerCase() === 'rechnung')?.id, 1, '', 'rechnung')} 
/>

<InvoiceMobileMenu 
    bind:dialog={mobileActionDialog} 
    activeMobileInvoice={ctrl.activeMobileInvoice} 
    isRegenerating={ctrl.isRegenerating}
    onUpdateStatus={handleUpdateStatus} 
    onPreviewPdf={previewPdf} 
    onEmail={(inv, isMahnung, mLevel) => emailModal?.open(inv, 'pdf', isMahnung, mLevel)} 
    onRegenerate={(invs) => ctrl.performRegenerate(invs)} 
    onDelete={ctrl.deleteInvoice} 
    onCancel={(id) => ctrl.cancelInvoice(id, (tId, cId) => generatorModal?.open(tId, 1, cId, 'all'))} 
    onCorrect={handleCorrectInvoice}
/>

<DocumentGeneratorModal bind:this={generatorModal} onCorrectionComplete={handleCorrectionComplete} />
<InvoiceEmailModal bind:this={emailModal} />
<InvoicePaymentSettlementModal 
    bind:this={settlementModal} 
    onOpenGenerator={handleOpenGeneratorForSettlement}
/>
