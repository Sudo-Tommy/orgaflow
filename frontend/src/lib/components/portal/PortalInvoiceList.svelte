<script lang="ts">
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { resolveDocumentUrl, downloadFileAsBlob } from "$lib/utils/documentUrl";
    import { compareInvoicesByDateDesc } from "$lib/utils/invoice";
    import { Clock, Calendar } from "lucide-svelte";
    import PortalInvoiceStatsHeader from "./PortalInvoiceStatsHeader.svelte";
    import PortalInvoiceFilterBar from "./PortalInvoiceFilterBar.svelte";
    import PortalInvoiceRow from "./PortalInvoiceRow.svelte";

    let { invoices = [], companyInfo = null, onPreview } = $props<{
        invoices: any[];
        companyInfo?: any;
        onPreview: (url: string, title: string, filename: string) => void;
    }>();

    let showUnpaidFirst = $state(true);
    let invoiceSearchQuery = $state("");
    let selectedStatusFilter = $state<'all' | 'open' | 'paid'>('all');
    let downloadingInvoiceKey = $state<string | null>(null);

    onMount(() => {
        invoiceSearchQuery = "";
        const t1 = setTimeout(() => { invoiceSearchQuery = ""; }, 50);
        const t2 = setTimeout(() => { invoiceSearchQuery = ""; }, 250);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    });

    let clientOnlyInvoices = $derived(invoices);
    let paidInvoices = $derived(clientOnlyInvoices.filter((inv: any) => inv.status === 'Abgeschlossen'));
    let paidTotal = $derived(paidInvoices.reduce((sum: number, inv: any) => sum + (inv.brutto || inv.total_gross || 0), 0));

    let openInvoices = $derived(clientOnlyInvoices.filter((inv: any) => !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(inv.status)));
    let openTotal = $derived(openInvoices.reduce((sum: number, inv: any) => sum + (inv.brutto || inv.total_gross || 0), 0));

    let overdueInvoices = $derived(openInvoices.filter((inv: any) => {
        if (!inv.due_date) return false;
        return new Date(inv.due_date).getTime() < new Date().setHours(0, 0, 0, 0);
    }));
    let overdueTotal = $derived(overdueInvoices.reduce((sum: number, inv: any) => sum + (inv.brutto || inv.total_gross || 0), 0));

    let filteredInvoices = $derived.by(() => {
        let list = clientOnlyInvoices;
        if (selectedStatusFilter === 'open') {
            list = list.filter((inv: any) => !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(inv.status));
        } else if (selectedStatusFilter === 'paid') {
            list = list.filter((inv: any) => inv.status === 'Abgeschlossen');
        }

        const query = invoiceSearchQuery.toLowerCase().trim();
        if (!query) return list;

        return list.filter((inv: any) => {
            const nr = (inv.invoice_nr || '').toLowerCase();
            const status = (inv.status || '').toLowerCase();
            const dateStr = inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('de-DE') : (inv.created ? new Date(inv.created).toLocaleDateString('de-DE') : '');
            const clientName = inv.expand?.client ? `${inv.expand.client.name_first || ''} ${inv.expand.client.name_last || ''}`.toLowerCase() : '';
            const totalGross = inv.brutto ? String(inv.brutto) : (inv.total_gross ? String(inv.total_gross) : '');
            return nr.includes(query) || status.includes(query) || dateStr.includes(query) || clientName.includes(query) || totalGross.includes(query);
        });
    });

    let sortedInvoices = $derived.by(() => {
        return [...filteredInvoices].sort((a, b) => {
            if (showUnpaidFirst) {
                const aIsOpen = !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(a.status);
                const bIsOpen = !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(b.status);
                if (aIsOpen && !bIsOpen) return -1;
                if (!aIsOpen && bIsOpen) return 1;
            }
            return compareInvoicesByDateDesc(a, b);
        });
    });

    let groupedInvoices = $derived.by(() => {
        const groups: { title: string, isActionNeeded: boolean, invs: any[] }[] = [];
        for (const inv of sortedInvoices) {
            const isOpen = !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(inv.status);
            let groupTitle = "";
            let isActionNeeded = false;

            if (showUnpaidFirst && isOpen) {
                groupTitle = "Aktuell & Offen";
                isActionNeeded = true;
            } else {
                const dateObj = inv.issue_date ? new Date(inv.issue_date) : (inv.created ? new Date(inv.created) : new Date());
                groupTitle = dateObj.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
            }

            let group = groups.find(g => g.title === groupTitle);
            if (!group) {
                group = { title: groupTitle, isActionNeeded, invs: [] };
                groups.push(group);
            }
            group.invs.push(inv);
        }
        return groups;
    });

    function handlePreview(inv: any, e: Event, fileIndex: number = 0) {
        e.stopPropagation();
        const precomputedUrl = inv.files?.[fileIndex]?.url;
        const filename = inv.files?.[fileIndex]?.name || (Array.isArray(inv.pdf) ? inv.pdf[fileIndex] : inv.pdf);
        if (!filename && !precomputedUrl) return;

        let url = precomputedUrl ? resolveDocumentUrl(precomputedUrl) : '';
        if (!url && filename) {
            url = pb.files.getURL(inv, filename);
            if (pb.authStore.token) url += (url.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
            url = resolveDocumentUrl(url);
        }
        if (!url) return;
        const isTimesheet = fileIndex > 0 || inv.files?.[fileIndex]?.isTimesheet || /^(az_|zeitnachweis_|nachweis_)/i.test(filename || '');
        const title = isTimesheet ? `Zeitnachweis ${inv.invoice_nr || ''}`.trim() : `Rechnung ${inv.invoice_nr || ''}`.trim();
        onPreview(url, title, filename || 'dokument.pdf');
    }

    async function handleDownload(inv: any, e: Event, fileIndex: number = 0) {
        e.stopPropagation();
        const downloadKey = `${inv.id}_${fileIndex}`;
        if (downloadingInvoiceKey) return;

        const precomputedUrl = inv.files?.[fileIndex]?.url;
        const filename = inv.files?.[fileIndex]?.name || (Array.isArray(inv.pdf) ? inv.pdf[fileIndex] : inv.pdf);
        if (!filename && !precomputedUrl) return;

        let url = precomputedUrl ? resolveDocumentUrl(precomputedUrl) : '';
        if (!url && filename) {
            url = pb.files.getURL(inv, filename);
            if (pb.authStore.token) url += (url.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
            url = resolveDocumentUrl(url);
        }
        if (!url) return;

        downloadingInvoiceKey = downloadKey;
        const isTimesheet = fileIndex > 0 || inv.files?.[fileIndex]?.isTimesheet || /^(az_|zeitnachweis_|nachweis_)/i.test(filename || '');
        const docTitle = isTimesheet ? `Zeitnachweis_${inv.invoice_nr || 'Dokument'}.pdf` : `Rechnung_${inv.invoice_nr || 'Dokument'}.pdf`;
        toastStore.info(`Download für "${docTitle}" wird vorbereitet...`);

        try {
            const result = await downloadFileAsBlob(url, docTitle);
            if (!result.success) {
                toastStore.error(result.error || "Download fehlgeschlagen.");
            } else {
                toastStore.success(`"${docTitle}" erfolgreich heruntergeladen.`);
            }
        } catch (err: any) {
            console.error("Download error:", err);
            toastStore.error(err.message || "Fehler beim Herunterladen.");
        } finally {
            downloadingInvoiceKey = null;
        }
    }

    let userType = $state("client");
    $effect(() => {
        if (typeof window !== 'undefined') {
            const t = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            if (t) try { userType = JSON.parse(atob(t.split('.')[1])).type; } catch(e){}
        }
    });
</script>

<div class="space-y-6 animate-enter">
    <PortalInvoiceStatsHeader
        clientInvoicesCount={clientOnlyInvoices.length}
        paidInvoicesCount={paidInvoices.length}
        {paidTotal}
        openInvoicesCount={openInvoices.length}
        {openTotal}
        overdueInvoicesCount={overdueInvoices.length}
        {overdueTotal}
        {companyInfo}
        {userType}
    />

    <PortalInvoiceFilterBar
        bind:invoiceSearchQuery
        bind:selectedStatusFilter
        bind:showUnpaidFirst
        totalCount={clientOnlyInvoices.length}
        openCount={openInvoices.length}
        paidCount={paidInvoices.length}
    />

    {#if clientOnlyInvoices.length === 0}
        <div class="bg-white dark:bg-slate-900 p-12 sm:p-16 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xl text-center space-y-4">
            <div class="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-slate-800 text-neutral-400 dark:text-slate-400 flex items-center justify-center mx-auto text-2xl shadow-inner">
                🧾
            </div>
            <div>
                <h3 class="text-base font-black text-neutral-900 dark:text-white">Keine Rechnungen vorhanden</h3>
                <p class="text-xs text-neutral-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                    Für diesen Zugang liegen aktuell noch keine gestellten Rechnungen vor. Sobald Einsätze abgerechnet werden, erscheinen die Rechnungen hier automatisch.
                </p>
            </div>
        </div>
    {:else if filteredInvoices.length === 0}
        <div class="bg-white dark:bg-slate-900 p-12 sm:p-16 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xl text-center space-y-4">
            <span class="text-3xl">🔍</span>
            <div>
                <h3 class="text-base font-black text-neutral-900 dark:text-white">Keine passenden Rechnungen gefunden</h3>
                <p class="text-xs text-neutral-500 dark:text-slate-400 mt-1">Passen Sie Ihre Suchbegriffe oder Statusfilter an.</p>
            </div>
            <button
                type="button"
                onclick={() => { invoiceSearchQuery = ""; selectedStatusFilter = "all"; }}
                class="orga-button-ghost text-xs font-bold px-4 py-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800"
            >
                Filter zurücksetzen
            </button>
        </div>
    {:else}
        <div class="flex flex-col gap-6">
            {#each groupedInvoices as group}
                <div class="space-y-3">
                    <h3 class="text-xs font-black {group.isActionNeeded ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-400 dark:text-slate-400'} uppercase tracking-widest flex items-center gap-2 px-1">
                        {#if group.isActionNeeded}
                            <Clock class="w-3.5 h-3.5" />
                        {:else}
                            <Calendar class="w-3.5 h-3.5" />
                        {/if}
                        {group.title}
                    </h3>

                    <div class="grid grid-cols-1 gap-3">
                        {#each group.invs as inv (inv.id)}
                            <PortalInvoiceRow
                                {inv}
                                {downloadingInvoiceKey}
                                onPreview={handlePreview}
                                onDownload={handleDownload}
                            />
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
