<!-- src/routes/invoices/+page.svelte -->
<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { useInvoiceFilter } from "$lib/services/invoiceFilterService.svelte";
    import DocumentGeneratorModal from "$lib/components/DocumentGeneratorModal.svelte";
    import InvoiceEmailModal from "$lib/components/invoices/InvoiceEmailModal.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import { onMount } from "svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";

    import InvoiceList from "$lib/components/invoices/InvoiceList.svelte";
    import InvoiceMobileMenu from "$lib/components/invoices/InvoiceMobileMenu.svelte";
    import InvoiceBottomBar from "$lib/components/invoices/InvoiceBottomBar.svelte";
    import InvoicePaymentModal from "$lib/components/invoices/InvoicePaymentModal.svelte";
    
    import type { InvoicePayload, SyncAction } from "$lib/utils/invoice";
    import { getPdfUrl } from "$lib/utils/invoiceHelpers";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { goto } from "$app/navigation";
    import { syncInvoicePaymentToAccounting, syncInvoiceCancellationToAccounting } from "$lib/services/invoiceAccountingService";
    // @ts-ignore
    import { Plus, Mail, RefreshCw, Trash2, Search, Hourglass, Inbox } from "lucide-svelte";

    const invoicesStore = orgaStore.invoices;
    const filterService = useInvoiceFilter(() => invoicesStore?.data || []);

    $effect(() => {
        if (!rbacService.canAccessFinances) {
            toastStore.warning("Keine Berechtigung für Rechnungsdaten.");
            goto('/dashboard');
        }
    });

    // --- 2. Offline-First & Optimistic UI: Sync Queue ---
    let syncQueue = $state<SyncAction[]>([]);

    // Rechnungen absteigend nach Rechnungsnummer sortieren (neueste oben)
    let sortedInvoices = $derived(
        [...filterService.filtered].sort((a, b) => {
            const nrA = a.invoice_nr ?? '';
            const nrB = b.invoice_nr ?? '';
            return nrB.localeCompare(nrA, undefined, { numeric: true });
        }) as InvoicePayload[]
    );

    // Rechnungen nach Firmen unterteilen
    let groupedInvoices = $derived.by(() => {
        const groups: Record<string, InvoicePayload[]> = {};
        for (const inv of sortedInvoices) {
            const companyName = inv.expand?.company?.name ?? 'Allgemein / Keine Firmenzuordnung';
            if (!groups[companyName]) {
                groups[companyName] = [];
            }
            groups[companyName].push(inv);
        }
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    });

    // Status und Logik für die Mehrfachauswahl (Massen-E-Mail)
    let selectedInvoiceIds = $state<string[]>([]);
    let selectedInvoices = $derived(
        (invoicesStore?.data || []).filter((inv: any) => selectedInvoiceIds.includes(inv.id))
    );

    function toggleSelection(id: string) {
        if (selectedInvoiceIds.includes(id)) selectedInvoiceIds = selectedInvoiceIds.filter(i => i !== id);
        else selectedInvoiceIds = [...selectedInvoiceIds, id];
    }

    function toggleAll() {
        if (selectedInvoiceIds.length === filterService.filtered.length && filterService.filtered.length > 0) {
            selectedInvoiceIds = [];
        } else {
            selectedInvoiceIds = filterService.filtered.map(inv => inv.id);
        }
    }

    // svelte-ignore non_reactive_update
    let generatorModal: ReturnType<typeof DocumentGeneratorModal>;
    // svelte-ignore non_reactive_update
    let emailModal: ReturnType<typeof InvoiceEmailModal>;
    // svelte-ignore non_reactive_update
    let pdfPreviewModal: ReturnType<typeof PdfPreviewModal>;
    
    let mobileActionDialog: HTMLDialogElement | undefined = $state();
    let activeMobileInvoice = $state<InvoicePayload | null>(null);
    
    // svelte-ignore non_reactive_update
    let paymentModal: ReturnType<typeof InvoicePaymentModal>;

    // --- Optimistic UI & Sync-Queue ---
    async function updateStatus(id: string, newStatus: string) {
        if (newStatus === 'Abgeschlossen') {
            const invoice = orgaStore.invoices?.data.find((i: any) => i.id === id);
            paymentModal?.open(id, async (invId, date) => {
                await performStatusUpdate(invId, newStatus, date);
            }, invoice?.paid_at);
        } else {
            await performStatusUpdate(id, newStatus, null);
        }
    }

    async function performStatusUpdate(id: string, newStatus: string, paidAtDate: string | null) {
        const payload: any = { status: newStatus };
        if (newStatus === 'Abgeschlossen' && paidAtDate) {
            payload.paid_at = paidAtDate;
        } else {
            payload.paid_at = null;
        }

        // Optimistic Update
        let previousStatus = "";
        if (orgaStore.invoices) {
            const idx = orgaStore.invoices.data.findIndex((i: any) => i.id === id);
            if (idx !== -1) {
                previousStatus = orgaStore.invoices.data[idx].status ?? "";
                orgaStore.invoices.data[idx].status = newStatus as any;
                orgaStore.invoices.data[idx].paid_at = payload.paid_at;
            }
        }

        try {
            await pb.collection('invoices').update(id, payload);
            toastStore.success("Status erfolgreich aktualisiert.");

            // Automatische Verbuchung als Einnahme im Haushaltsbuch wenn Status 'Abgeschlossen' (Bezahlt)
            if (newStatus === 'Abgeschlossen') {
                const targetInvoice = orgaStore.invoices?.data.find((i: any) => i.id === id);
                if (targetInvoice) {
                    await syncInvoicePaymentToAccounting(targetInvoice, paidAtDate);
                }
            } else if (newStatus === 'Storniert') {
                const targetInvoice = orgaStore.invoices?.data.find((i: any) => i.id === id);
                if (targetInvoice) {
                    await syncInvoiceCancellationToAccounting(id, targetInvoice.invoice_nr);
                }
            }
        } catch (err) {
            console.error("Fehler beim Status-Update (Offline?):", err);
            toastStore.info("Offline: Status-Änderung in der Sync-Queue gespeichert.");
            syncQueue.push({ id, action: 'updateStatus', payload, timestamp: Date.now() });
        }
    }

    async function cancelInvoice(id: string) {
        const invoice = orgaStore.invoices?.data.find((i: any) => i.id === id);
        if (!invoice) return;

        const confirmation = await confirmStore.ask(
            "Möchten Sie diese Rechnung wirklich stornieren? Der Status wird auf 'Storniert' gesetzt und es wird versucht, eine Stornorechnung zu generieren.",
            "Rechnung stornieren?",
            "Ja, stornieren",
            "Abbrechen",
            true
        );

        if (!confirmation) return;

        try {
            await performStatusUpdate(id, 'Storniert', null);
            await syncInvoiceCancellationToAccounting(invoice.id, invoice.invoice_nr);

            const stornoTemplate = orgaStore.document_templates?.data.find(
                (t: any) => (t.name?.toLowerCase().includes('storno') || t.type?.toLowerCase().includes('storno'))
            );

            if (stornoTemplate) {
                generatorModal?.open(
                    stornoTemplate.id, 
                    1, 
                    Array.isArray(invoice.client) ? invoice.client[0] : invoice.client, 
                    invoice.id
                );
                toastStore.info("Storno-Dokument wird erstellt...");
            } else {
                toastStore.warning("Rechnung storniert, aber es wurde keine Vorlage für 'Storno' gefunden.");
            }
        } catch (err) {
            toastStore.error("Ein Fehler ist beim Stornieren aufgetreten.");
        }
    }

    async function deleteSelected() {
        if (selectedInvoiceIds.length === 0) return;
        if (await confirmStore.ask(`Möchten Sie ${selectedInvoiceIds.length} Rechnungen wirklich unwiderruflich löschen?`, "Rechnungen löschen?", "Löschen", "Abbrechen", true)) {
            // Optimistic Multi-Delete
            const idsToDelete = [...selectedInvoiceIds];
            if (orgaStore.invoices) {
                orgaStore.invoices.data = orgaStore.invoices.data.filter((i: any) => !idsToDelete.includes(i.id));
            }
            selectedInvoiceIds = [];

            try {
                const promises = idsToDelete.map(id => pb.collection('invoices').delete(id));
                for (let i = 0; i < promises.length; i += 20) await Promise.all(promises.slice(i, i + 20));
                toastStore.success(`${idsToDelete.length} Rechnungen gelöscht.`);
            } catch (err) {
                console.error("Fehler beim Löschen:", err);
                toastStore.info("Offline: Lösch-Aufträge in die Sync-Queue aufgenommen.");
                idsToDelete.forEach(id => syncQueue.push({ id, action: 'delete', timestamp: Date.now() }));
            }
        }
    }

    async function deleteInvoice(id: string) {
        if (await confirmStore.ask("Möchten Sie diese Rechnung wirklich unwiderruflich löschen?", "Rechnung löschen?", "Löschen", "Abbrechen", true)) {
            // Optimistic Remove
            if (orgaStore.invoices) {
                const idx = orgaStore.invoices.data.findIndex((i: any) => i.id === id);
                if (idx !== -1) orgaStore.invoices.data.splice(idx, 1);
            }

            try {
                await pb.collection('invoices').delete(id);
                toastStore.info("Rechnung wurde gelöscht.");
            } catch (err) {
                console.error("Fehler beim Löschen:", err);
                toastStore.info("Offline: Löschung in der Sync-Queue gespeichert.");
                syncQueue.push({ id, action: 'delete', timestamp: Date.now() });
            }
        }
    }

    function previewPdf(record: InvoicePayload, index: number, prefix: string) {
        const url = getPdfUrl(record, index, pb);
        if (!url) return;

        let clientLastName = '';
        if (record.expand?.client) {
            const client = Array.isArray(record.expand.client) ? record.expand.client[0] : record.expand.client;
            if (client?.name_last) clientLastName = `-${client.name_last}`;
        }
        
        const safeNr = (record.invoice_nr ?? 'Unbekannt').replace(/\//g, '-');
        let finalName = `${prefix}_${safeNr}.pdf`;
        
        if (index === 0 && record.invoice_nr !== 'Zeitnachweis') {
            finalName = `RE-${safeNr}${clientLastName}.pdf`;
        } else if (index === 1 || record.invoice_nr === 'Zeitnachweis') {
            finalName = `AZ-${safeNr}${clientLastName}.pdf`;
        }
        
        pdfPreviewModal?.open(url, prefix, finalName);
    }

    function openGenerator() {
        const invoiceTemplate = orgaStore.document_templates?.data.find((t: any) => (t.type ?? '').toLowerCase() === 'rechnung');
        generatorModal?.open(invoiceTemplate?.id, 1, '', 'rechnung');
    }

    function openMobileActions(inv: InvoicePayload) {
        activeMobileInvoice = inv;
        mobileActionDialog?.showModal();
    }
    
    function closeMobileActions() {
        mobileActionDialog?.close();
        setTimeout(() => activeMobileInvoice = null, 300);
    }

    onMount(() => {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('global_company_id');
            if (stored) filterService.companyFilter = stored;
        }
        const handleSync = (e: any) => { filterService.companyFilter = e.detail; };
        window.addEventListener('global-company-changed', handleSync);
        return () => window.removeEventListener('global-company-changed', handleSync);
    });
</script>

<div class="orga-page-header animate-enter pb-2 sm:pb-6">
    <div class="flex justify-between items-center w-full gap-4">
        <div class="min-w-0">
            <h1 class="orga-page-title truncate">Rechnungen</h1>
            <p class="orga-page-subtitle hidden sm:block">Verwalten Sie hier alle generierten Rechnungen, Einnahmen und deren Status.</p>
        </div>
        
        <!-- Actions: Desktop & Mobile Header Button -->
        <div class="flex items-center gap-2">
            {#if selectedInvoiceIds.length > 0}
                <div class="hidden md:flex items-center gap-2">
                    <button aria-label="Ausgewählte senden" onclick={() => emailModal?.open(selectedInvoices)} class="orga-button-primary bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 py-2 px-4 min-h-12 text-sm flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none">
                        <Mail class="w-4 h-4" /> Senden ({selectedInvoiceIds.length})
                    </button>
                    <button aria-label="Layout neu generieren" onclick={() => generatorModal?.openForRegenerate(selectedInvoices)} class="orga-button-ghost bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 py-2 px-4 min-h-12 text-sm flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none">
                        <RefreshCw class="w-4 h-4" /> Refresh ({selectedInvoiceIds.length})
                    </button>
                    <button aria-label="Ausgewählte löschen" onclick={deleteSelected} class="orga-button-ghost bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 py-2 px-4 min-h-12 text-sm flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none">
                        <Trash2 class="w-4 h-4" /> Löschen ({selectedInvoiceIds.length})
                    </button>
                    <div class="w-px h-8 bg-neutral-200 mx-2" aria-hidden="true"></div>
                </div>
            {/if}
            <button aria-label="Neue Rechnung erstellen" onclick={openGenerator} class="orga-button-primary py-2 px-4 sm:px-6 min-h-11 sm:min-h-12 text-sm font-bold flex items-center gap-1.5 shadow-indigo-600/30 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none shrink-0">
                <Plus class="w-4 h-4 sm:w-5 sm:h-5" /> <span>Neue Rechnung</span>
            </button>
        </div>
    </div>
</div>

<div class="px-4 sm:px-6 mb-4 animate-enter delay-100">
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2 rounded-2xl border border-neutral-200 shadow-sm w-full">
        <div class="flex-1 relative">
            <span class="absolute inset-y-0 left-3 flex items-center text-neutral-400 text-base" aria-hidden="true"><Search class="w-4 h-4" /></span>
            <input 
                id="search-inv"
                type="text" 
                aria-label="Rechnungen durchsuchen"
                bind:value={filterService.searchQuery} 
                placeholder="Rechnungsnummer, Klient..." 
                class="w-full bg-transparent border-none py-3 min-h-12 pl-9 pr-3 text-sm focus:ring-0 outline-none text-neutral-800 placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
            />
        </div>
        <div class="w-px h-8  hidden sm:block" aria-hidden="true"></div>
        <div class="w-full sm:w-48 shrink-0 relative border-t sm:border-t-0 border-neutral-100 sm:border-transparent pt-2 sm:pt-0">
            <span class="absolute inset-y-0 left-3 flex items-center text-neutral-400 text-base pt-2 sm:pt-0" aria-hidden="true"><Hourglass class="w-4 h-4" /></span>
            <select id="status-filter" aria-label="Status Filter" bind:value={filterService.statusFilter} class="w-full min-h-12 bg-transparent border-none py-3 pl-9 pr-3 text-sm focus:ring-0 outline-none cursor-pointer font-semibold text-neutral-700 appearance-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl">
                <option value="all">Alle Status anzeigen</option>
                <option value="Entwurf">Entwurf</option>
                <option value="Eingereicht">Eingereicht</option>
                <option value="In Bearbeitung">In Bearbeitung</option>
                <option value="Abgeschlossen">Abgeschlossen (Bezahlt)</option>
                <option value="Abgelehnt">Abgelehnt</option>
                <option value="Storniert">Storniert</option>
            </select>
        </div>
    </div>
</div>

<!-- pb-28 adds space for the mobile bottom bar -->
<div class="animate-enter delay-200 sm:px-6 pb-28 md:pb-6">
    <!-- 2. Offline-First & Optimistic UI: Skeleton Loaders -->
    {#if invoicesStore?.isLoading}
        <div class="space-y-4" aria-busy="true" aria-label="Lade Rechnungen">
            {#each Array(4) as _}
                <div class="w-full h-24  animate-pulse rounded-2xl"></div>
            {/each}
        </div>
    {:else if filterService.filtered.length === 0}
        <div class="rounded-3xl p-12 text-center text-neutral-500 border border-neutral-100 shadow-sm flex flex-col items-center justify-center">
            <Inbox class="w-12 h-12 mb-4 opacity-50 text-neutral-400" />
            <p class="text-lg font-bold text-neutral-900 mb-2">Keine Treffer</p>
            <p class="text-sm">Passen Sie die Filter an oder erstellen Sie eine neue Rechnung.</p>
        </div>
    {:else}
        <InvoiceList 
            {groupedInvoices}
            {filterService}
            selectedInvoiceIds={selectedInvoiceIds}
            onToggleAll={toggleAll}
            onToggleSelection={toggleSelection}
            onUpdateStatus={updateStatus}
            onRegenerate={(invs) => generatorModal?.openForRegenerate(invs)}
            onPreviewPdf={previewPdf}
            onEmail={(inv, isMahnung, mLevel) => emailModal?.open(inv, 'pdf', isMahnung, mLevel)}
            onDelete={deleteInvoice}
            onOpenMobileActions={openMobileActions}
        />
    {/if}
</div>

<InvoiceBottomBar 
    selectedCount={selectedInvoiceIds.length}
    onClear={() => selectedInvoiceIds = []}
    onEmail={() => emailModal?.open(selectedInvoices)}
    onRegenerate={() => generatorModal?.openForRegenerate(selectedInvoices)}
    onDelete={deleteSelected}
    onNew={openGenerator}
/>

<InvoiceMobileMenu 
    bind:dialog={mobileActionDialog}
    bind:activeMobileInvoice
    onUpdateStatus={updateStatus}
    onPreviewPdf={previewPdf}
    onEmail={(inv, isMahnung, mLevel) => emailModal?.open(inv, 'pdf', isMahnung, mLevel)}
    onRegenerate={(invs) => generatorModal?.openForRegenerate(invs)}
    onDelete={deleteInvoice}
    onCancel={cancelInvoice}
/>

<DocumentGeneratorModal bind:this={generatorModal} />
<InvoiceEmailModal bind:this={emailModal} />
<PdfPreviewModal bind:this={pdfPreviewModal} />
<InvoicePaymentModal bind:this={paymentModal} />