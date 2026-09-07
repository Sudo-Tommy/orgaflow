<script lang="ts">
    import { onMount } from "svelte";
    import {
        FileText,
        Download,
        Eye,
        CheckCircle2,
        Clock,
        AlertCircle,
        Calendar,
        Search,
        CreditCard,
        Copy,
        Check,
        Building2,
        ShieldCheck,
        ArrowRight,
        Loader2
    } from "lucide-svelte";
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { resolveDocumentUrl, downloadFileAsBlob } from "$lib/utils/documentUrl";

    let { invoices = [], companyInfo = null, onPreview } = $props<{
        invoices: any[];
        companyInfo?: any;
        onPreview: (url: string, title: string, filename: string) => void;
    }>();

    let showUnpaidFirst = $state(true);
    let invoiceSearchQuery = $state("");
    let selectedStatusFilter = $state<'all' | 'open' | 'paid'>('all');
    let copiedIban = $state(false);
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

    function isInsuranceInvoice(inv: any): boolean {
        let meta = inv.table_sum_positions;
        if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch(e){}
        }
        if (meta?.recipientType === 'insurance') return true;
        const insuranceTemplateIds = ['299p3n08p25vmeu', 'dkdyu0mrlcqkcoc', 'unm9kzapp3zailt'];
        if (meta?.templateId && insuranceTemplateIds.includes(meta.templateId)) return true;

        let positions = inv.table_positions;
        if (typeof positions === 'string') {
            try { positions = JSON.parse(positions); } catch(e){}
        }
        if (Array.isArray(positions)) {
            return positions.some((p: any) => 
                /entlastungsleistung|verhinderungspflege|umwandlungsleistung|sgb\s*xi|pflegekasse|krankenkasse/i.test(p.title || '')
            );
        }
        return false;
    }

    let clientOnlyInvoices = $derived(invoices.filter((inv: any) => !isInsuranceInvoice(inv)));

    // KPI Aggregationen
    let paidInvoices = $derived(clientOnlyInvoices.filter((inv: any) => inv.status === 'Abgeschlossen'));
    let paidTotal = $derived(paidInvoices.reduce((sum: number, inv: any) => sum + (inv.brutto || inv.total_gross || 0), 0));

    let openInvoices = $derived(clientOnlyInvoices.filter((inv: any) => !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(inv.status)));
    let openTotal = $derived(openInvoices.reduce((sum: number, inv: any) => sum + (inv.brutto || inv.total_gross || 0), 0));

    let overdueInvoices = $derived(openInvoices.filter((inv: any) => {
        if (!inv.due_date) return false;
        return new Date(inv.due_date).getTime() < new Date().setHours(0, 0, 0, 0);
    }));
    let overdueTotal = $derived(overdueInvoices.reduce((sum: number, inv: any) => sum + (inv.brutto || inv.total_gross || 0), 0));

    // Filtering
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
        if (!showUnpaidFirst) return filteredInvoices;
        return [...filteredInvoices].sort((a, b) => {
            const aIsOpen = !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(a.status);
            const bIsOpen = !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(b.status);
            if (aIsOpen && !bIsOpen) return -1;
            if (!aIsOpen && bIsOpen) return 1;
            return 0;
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

    function getStatusStyle(status: string) {
        switch (status) {
            case 'Abgeschlossen': return { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2, label: 'Bezahlt' };
            case 'Eingereicht':
            case 'Offen': return { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: FileText, label: 'Offen' };
            case 'In Bearbeitung': return { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock, label: 'In Prüfung' };
            case 'Storniert': return { color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', icon: AlertCircle, label: 'Storniert' };
            default: return { color: 'text-neutral-600', bg: 'bg-neutral-100', border: 'border-neutral-200', icon: FileText, label: status || 'Offen' };
        }
    }

    function handlePreview(inv: any, e: Event, fileIndex: number = 0) {
        e.stopPropagation();
        const precomputedUrl = inv.files?.[fileIndex]?.url;
        const filename = Array.isArray(inv.pdf) ? inv.pdf[fileIndex] : inv.pdf;
        if (!filename && !precomputedUrl) return;

        let url = precomputedUrl ? resolveDocumentUrl(precomputedUrl) : '';
        if (!url && filename) {
            url = pb.files.getURL(inv, filename);
            if (pb.authStore.token) url += (url.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
            url = resolveDocumentUrl(url);
        }
        if (!url) return;
        const title = fileIndex === 0 ? `Rechnung ${inv.invoice_nr || ''}` : `Zeitnachweis ${inv.invoice_nr || ''}`;
        onPreview(url, title, filename || 'dokument.pdf');
    }

    async function handleDownload(inv: any, e: Event, fileIndex: number = 0) {
        e.stopPropagation();
        const downloadKey = `${inv.id}_${fileIndex}`;
        if (downloadingInvoiceKey) return;

        const precomputedUrl = inv.files?.[fileIndex]?.url;
        const filename = Array.isArray(inv.pdf) ? inv.pdf[fileIndex] : inv.pdf;
        if (!filename && !precomputedUrl) return;

        let url = precomputedUrl ? resolveDocumentUrl(precomputedUrl) : '';
        if (!url && filename) {
            url = pb.files.getURL(inv, filename);
            if (pb.authStore.token) url += (url.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
            url = resolveDocumentUrl(url);
        }
        if (!url) return;

        downloadingInvoiceKey = downloadKey;
        const docTitle = fileIndex === 0 ? `Rechnung_${inv.invoice_nr || 'Dokument'}.pdf` : `Zeitnachweis_${inv.invoice_nr || 'Dokument'}.pdf`;
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

    async function copyIban(iban: string) {
        if (!iban) return;
        try {
            await navigator.clipboard.writeText(iban.replace(/\s+/g, ''));
            copiedIban = true;
            toastStore.success("IBAN in die Zwischenablage kopiert!");
            setTimeout(() => { copiedIban = false; }, 2500);
        } catch {
            toastStore.info(`IBAN: ${iban}`);
        }
    }

    function formatCurrency(amount: number) {
        return amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
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

    <!-- HEADER & FINANZ-COCKPIT -->
    <div class="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xl overflow-hidden relative">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                <div class="flex items-center gap-2 mb-2">
                    <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        <CreditCard class="w-3 h-3" /> Rechnungsansicht
                    </span>
                    <span class="text-xs font-bold text-neutral-400 dark:text-slate-500">&bull;</span>
                    <span class="text-xs font-bold text-neutral-500 dark:text-slate-400">
                        {clientOnlyInvoices.length} Rechnung{clientOnlyInvoices.length === 1 ? '' : 'en'} erfasst
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
                <!-- Bezahlt -->
                <div class="p-3.5 sm:p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 text-left min-w-[120px]">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Bezahlt</span>
                    <p class="text-base sm:text-lg font-black text-emerald-950 dark:text-emerald-200 mt-0.5">{formatCurrency(paidTotal)}</p>
                    <span class="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">{paidInvoices.length} Rechnung{paidInvoices.length === 1 ? '' : 'en'}</span>
                </div>

                <!-- Offen -->
                <div class="p-3.5 sm:p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 text-left min-w-[120px]">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">Ausstehend</span>
                    <p class="text-base sm:text-lg font-black text-blue-950 dark:text-blue-200 mt-0.5">{formatCurrency(openTotal)}</p>
                    <span class="text-[10px] text-blue-700 dark:text-blue-400 font-semibold">{openInvoices.length} offen</span>
                </div>

                <!-- Überfällig (falls vorhanden) -->
                <div class="col-span-2 sm:col-span-1 p-3.5 sm:p-4 {overdueInvoices.length > 0 ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50' : 'bg-neutral-50 dark:bg-slate-800/60 border-neutral-200 dark:border-slate-700'} rounded-2xl border text-left min-w-[120px]">
                    <span class="text-[10px] font-bold uppercase tracking-wider {overdueInvoices.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-400 dark:text-slate-400'} block">Überfällig</span>
                    <p class="text-base sm:text-lg font-black {overdueInvoices.length > 0 ? 'text-rose-950 dark:text-rose-200' : 'text-neutral-700 dark:text-slate-200'} mt-0.5">{formatCurrency(overdueTotal)}</p>
                    <span class="text-[10px] {overdueInvoices.length > 0 ? 'text-rose-700 dark:text-rose-400 font-bold' : 'text-neutral-400 dark:text-slate-400 font-medium'}">
                        {overdueInvoices.length > 0 ? `${overdueInvoices.length} dringlich` : 'Keine Überfälligkeiten'}
                    </span>
                </div>
            </div>
        </div>

        <!-- BANKVERBINDUNG & ÜBERWEISUNGSHILFE (Falls offene Rechnungen vorhanden) -->
        {#if openInvoices.length > 0 && companyInfo?.bank_iban}
            <div class="mt-6 pt-6 border-t border-neutral-100 dark:border-slate-800">
                <div class="bg-gradient-to-r from-neutral-50 to-indigo-50/40 dark:from-slate-800/90 dark:to-indigo-950/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                            class="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs {copiedIban ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 border border-neutral-200 dark:border-slate-700'}"
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

    <!-- FILTERLEISTE & SUCHE -->
    <div class="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xl space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            <!-- Suchfeld -->
            <div class="relative flex-1">
                <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-slate-400 pointer-events-none" />
                <input
                    type="search"
                    id="portal-invoice-search-filter"
                    name="portal_invoice_search_filter"
                    autocomplete="off"
                    bind:value={invoiceSearchQuery}
                    placeholder="Nach Rechnungsnummer, Datum oder Betrag suchen..."
                    class="orga-input-clear py-2.5 pl-10 pr-9 text-xs sm:text-sm bg-neutral-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-neutral-900 dark:text-slate-100 transition-colors w-full rounded-2xl border border-neutral-200 dark:border-slate-700"
                />
                {#if invoiceSearchQuery}
                    <button
                        type="button"
                        onclick={() => invoiceSearchQuery = ""}
                        class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-neutral-200 dark:bg-slate-700 hover:bg-neutral-300 dark:hover:bg-slate-600 text-neutral-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                        title="Suche leeren"
                    >
                        ✕
                    </button>
                {/if}
            </div>

            <!-- Status Filter-Pills -->
            <div class="flex items-center gap-1.5 bg-neutral-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0 self-start sm:self-center">
                <button
                    type="button"
                    onclick={() => selectedStatusFilter = 'all'}
                    class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer {selectedStatusFilter === 'all' ? 'bg-white dark:bg-slate-700 text-neutral-900 dark:text-white shadow-2xs' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'}"
                >
                    Alle ({clientOnlyInvoices.length})
                </button>
                <button
                    type="button"
                    onclick={() => selectedStatusFilter = 'open'}
                    class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer {selectedStatusFilter === 'open' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-2xs' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'}"
                >
                    Offen ({openInvoices.length})
                </button>
                <button
                    type="button"
                    onclick={() => selectedStatusFilter = 'paid'}
                    class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer {selectedStatusFilter === 'paid' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-2xs' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'}"
                >
                    Bezahlt ({paidInvoices.length})
                </button>
            </div>

            <!-- Sortierung: Offene zuerst -->
            {#if clientOnlyInvoices.length > 0}
                <label class="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-slate-300 cursor-pointer bg-neutral-50 dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors border border-neutral-200 dark:border-slate-700 shrink-0">
                    <input type="checkbox" bind:checked={showUnpaidFirst} class="w-4 h-4 text-brand-600 rounded border-neutral-300 focus:ring-brand-500" />
                    Offene zuerst
                </label>
            {/if}
        </div>
    </div>

    <!-- RECHNUNGSLISTE NACH MONATEN / GRUPPEN -->
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
                            {@const isOverdue = !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(inv.status) && inv.due_date && new Date(inv.due_date).getTime() < new Date().setHours(0,0,0,0)}
                            {@const style = isOverdue ? { color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-900/60', icon: AlertCircle, label: 'Überfällig' } : getStatusStyle(inv.status)}
                            {@const Icon = style.icon}
                            {@const gross = inv.brutto || inv.total_gross || 0}
                            {@const hasTimesheet = Array.isArray(inv.pdf) && inv.pdf.length > 1}

                            <div
                                role="button"
                                tabindex="0"
                                onclick={(e) => handlePreview(inv, e, 0)}
                                onkeydown={(e) => e.key === 'Enter' && handlePreview(inv, e, 0)}
                                class="w-full text-left bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border {isOverdue ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/60 dark:hover:bg-rose-950/30' : 'border-neutral-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-500/50 hover:bg-neutral-50/50 dark:hover:bg-slate-800/50'} transition-all hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
                            >
                                <div class="flex items-center gap-4 min-w-0">
                                    <div class="w-12 h-12 rounded-2xl {style.bg} {style.color} flex items-center justify-center shrink-0 border {style.border} shadow-2xs group-hover:scale-105 transition-transform">
                                        <Icon class="w-6 h-6" />
                                    </div>

                                    <div class="min-w-0">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <h4 class="font-black text-neutral-900 dark:text-white text-base group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                                                {inv.invoice_nr || 'Rechnung'}
                                            </h4>
                                            <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold border {style.border} {style.bg} {style.color}">
                                                {style.label}
                                            </span>
                                        </div>

                                        <p class="text-xs font-medium text-neutral-500 dark:text-slate-400 mt-1 truncate">
                                            {#if inv.expand?.client}
                                                <span class="font-bold text-neutral-800 dark:text-slate-200">{inv.expand.client.name_first} {inv.expand.client.name_last} &bull; </span>
                                            {/if}
                                            <span>Rechnungsdatum: {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Kein Datum'}</span>
                                        </p>
                                    </div>
                                </div>

                                <div class="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-neutral-100 dark:border-slate-800 shrink-0">
                                    <!-- Betrag & Fälligkeit -->
                                    <div class="text-left sm:text-right">
                                        <p class="font-black text-lg {gross > 0 ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-slate-500'}">
                                            {formatCurrency(gross)}
                                        </p>

                                        <div class="text-[11px] mt-0.5 font-medium">
                                            {#if inv.status === 'Abgeschlossen'}
                                                <span class="text-emerald-600 dark:text-emerald-400 font-bold">
                                                    ✓ Bezahlt {inv.paid_at ? `am ${new Date(inv.paid_at).toLocaleDateString('de-DE')}` : ''}
                                                </span>
                                            {:else if isOverdue}
                                                <span class="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 sm:justify-end">
                                                    <AlertCircle class="w-3 h-3" /> Fällig war {new Date(inv.due_date).toLocaleDateString('de-DE')}
                                                </span>
                                            {:else if inv.due_date}
                                                <span class="text-blue-600 dark:text-blue-400 font-semibold">
                                                    Fällig bis {new Date(inv.due_date).toLocaleDateString('de-DE')}
                                                </span>
                                            {:else}
                                                <span class="text-neutral-400 dark:text-slate-500">Offen</span>
                                            {/if}
                                        </div>
                                    </div>

                                    <!-- Action Buttons -->
                                    <div class="flex items-center gap-2">
                                        <!-- Rechnung Vorschau & Download -->
                                        <div class="flex items-center gap-1.5 bg-neutral-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-neutral-200 dark:border-slate-700">
                                            <button
                                                type="button"
                                                onclick={(e) => handlePreview(inv, e, 0)}
                                                class="min-w-[44px] min-h-[44px] px-3.5 py-2 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 touch-manipulation"
                                                title="Rechnung ansehen"
                                                aria-label="Rechnung ansehen"
                                            >
                                                <Eye class="w-4 h-4" />
                                                <span class="hidden md:inline">Rechnung</span>
                                            </button>
                                            <button
                                                type="button"
                                                onclick={(e) => handleDownload(inv, e, 0)}
                                                disabled={downloadingInvoiceKey === `${inv.id}_0`}
                                                class="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed"
                                                title="Rechnung PDF herunterladen"
                                                aria-label="Rechnung PDF herunterladen"
                                            >
                                                {#if downloadingInvoiceKey === `${inv.id}_0`}
                                                    <Loader2 class="w-4 h-4 animate-spin text-brand-600" />
                                                {:else}
                                                    <Download class="w-4 h-4" />
                                                {/if}
                                            </button>
                                        </div>

                                        <!-- Zeitnachweis (falls vorhanden) -->
                                        {#if hasTimesheet}
                                            <div class="flex items-center gap-1.5 bg-indigo-50/70 dark:bg-indigo-950/50 p-1.5 rounded-2xl border border-indigo-100 dark:border-indigo-800/60">
                                                <button
                                                    type="button"
                                                    onclick={(e) => handlePreview(inv, e, 1)}
                                                    class="min-w-[44px] min-h-[44px] px-3.5 py-2 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 touch-manipulation"
                                                    title="Zeitnachweis ansehen"
                                                    aria-label="Zeitnachweis ansehen"
                                                >
                                                    <Clock class="w-4 h-4" />
                                                    <span class="hidden md:inline">Nachweis</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onclick={(e) => handleDownload(inv, e, 1)}
                                                    disabled={downloadingInvoiceKey === `${inv.id}_1`}
                                                    class="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed"
                                                    title="Zeitnachweis PDF herunterladen"
                                                    aria-label="Zeitnachweis PDF herunterladen"
                                                >
                                                    {#if downloadingInvoiceKey === `${inv.id}_1`}
                                                        <Loader2 class="w-4 h-4 animate-spin text-indigo-600" />
                                                    {:else}
                                                        <Download class="w-4 h-4" />
                                                    {/if}
                                                </button>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {/if}

</div>