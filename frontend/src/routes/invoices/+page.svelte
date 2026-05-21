<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { useInvoiceFilter } from "$lib/services/invoiceFilterService.svelte";
    import DocumentGeneratorModal from "$lib/components/DocumentGeneratorModal.svelte";
    import InvoiceEmailModal from "$lib/components/InvoiceEmailModal.svelte";
    import { onMount } from "svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";

    const invoicesStore = orgaStore.invoices;
    const filterService = useInvoiceFilter(() => invoicesStore?.data || []);

    // svelte-ignore non_reactive_update
    let generatorModal: ReturnType<typeof DocumentGeneratorModal>;
    // svelte-ignore non_reactive_update
    let emailModal: ReturnType<typeof InvoiceEmailModal>;

    // Funktion für das direkte Aktualisieren des Status aus der Übersicht heraus
    async function updateStatus(id: string, newStatus: string) {
        try {
            await pb.collection('invoices').update(id, { status: newStatus });
            toastStore.success("Status erfolgreich aktualisiert.");
        } catch (err) {
            console.error("Fehler beim Status-Update:", err);
            toastStore.error("Der Status konnte nicht aktualisiert werden.");
        }
    }

    // Funktion zum Löschen einer Rechnung
    async function deleteInvoice(id: string) {
        if (await confirmStore.ask("Möchten Sie diese Rechnung wirklich unwiderruflich löschen?", "Rechnung löschen?", "Löschen", "Abbrechen", true)) {
            try {
                await pb.collection('invoices').delete(id);
                toastStore.info("Rechnung wurde gelöscht.");
            } catch (err) {
                console.error("Fehler beim Löschen:", err);
                toastStore.error("Die Rechnung konnte nicht gelöscht werden.");
            }
        }
    }

    // Hilfsfunktion: Gibt eine schöne CSS-Klasse basierend auf dem Status zurück
    function getStatusClass(status: string) {
        switch (status) {
            case 'Entwurf': return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
            case 'Eingereicht': return 'bg-blue-100 text-blue-700 border border-blue-200';
            case 'In Bearbeitung': return 'bg-amber-100 text-amber-700 border border-amber-200';
            case 'Abgeschlossen': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
            case 'Abgelehnt':
            case 'Storniert': return 'bg-rose-100 text-rose-700 border border-rose-200';
            default: return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
        }
    }

    // Hilfsfunktion: Holt die korrekte URL für die PDF-Datei
    function getPdfUrl(record: any, index: number = 0) {
        if (!record.pdf || record.pdf.length === 0) return null;
        
        if (Array.isArray(record.pdf)) {
            if (index < record.pdf.length) {
                return pb.files.getURL(record, record.pdf[index]);
            }
            return null;
        }
        return index === 0 ? pb.files.getURL(record, record.pdf) : null;
    }
    
    // PWA-Sicherer Download: Verhindert, dass iOS die App mit der PDF überschreibt
    async function downloadPdf(record: any, index: number, prefix: string) {
        const url = getPdfUrl(record, index);
        if (!url) return;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Netzwerkantwort war nicht ok");
            
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            
            let clientLastName = '';
            if (record.expand?.client) {
                const client = Array.isArray(record.expand.client) ? record.expand.client[0] : record.expand.client;
                if (client?.name_last) clientLastName = `-${client.name_last}`;
            }
            
            const safeNr = (record.invoice_nr || 'Unbekannt').replace(/\//g, '-');
            let finalName = `${prefix}_${safeNr}.pdf`;
            
            if (index === 0 && record.invoice_nr !== 'Zeitnachweis') {
                finalName = `RE-${safeNr}${clientLastName}.pdf`;
            } else if (index === 1 || record.invoice_nr === 'Zeitnachweis') {
                finalName = `AZ-${safeNr}${clientLastName}.pdf`;
            }
            
            a.download = finalName;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(blobUrl); }, 100);
        } catch (error) {
            console.error("Download fehlgeschlagen:", error);
            toastStore.error("Das Dokument konnte nicht geladen werden.");
        }
    }

    function getClient(record: any) {
        return Array.isArray(record.expand?.client) ? record.expand.client[0] : record.expand?.client;
    }

    function openGenerator() {
        const invoiceTemplate = orgaStore.document_templates?.data.find((t: any) => (t.type || '').toLowerCase() === 'rechnung');
        generatorModal?.open(invoiceTemplate?.id, 1);
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

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Rechnungen</h1>
        <p class="orga-page-subtitle">Verwalten Sie hier alle generierten Rechnungen, Einnahmen und deren Status.</p>
    </div>
    <button onclick={openGenerator} class="orga-button-primary inline-flex w-full sm:w-auto justify-center py-3 sm:py-2.5 mt-4 sm:mt-0">
        <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        Neue Rechnung
    </button>
</div>

<div class="orga-filter-bar animate-enter delay-100 items-center">
    <div class="flex-1 w-full">
        <label for="search-inv" class="sr-only">Suchen</label>
        <input 
            id="search-inv"
            type="text" 
            bind:value={filterService.searchQuery} 
            placeholder="Nach Rechnungsnummer oder Klient suchen..." 
            class="orga-input-clear py-3 sm:py-2.5"
        />
    </div>
    <div class="w-full md:w-64 shrink-0">
        <label for="status-filter" class="sr-only">Status</label>
        <select id="status-filter" bind:value={filterService.statusFilter} class="orga-input-clear py-3 sm:py-2.5 cursor-pointer">
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

<div class="animate-enter delay-200">
    {#if invoicesStore?.isLoading}
        <div class="text-center py-12 text-neutral-500 font-medium animate-pulse">Lade Rechnungen...</div>
    {:else if filterService.filtered.length === 0}
        <div class="orga-card-white p-12 text-center text-neutral-500 border border-neutral-100 shadow-sm">
            <p class="text-lg font-bold text-neutral-900 mb-2">Keine Rechnungen gefunden</p>
            <p>Passen Sie die Suche an oder generieren Sie eine neue Rechnung über die Vorlagen.</p>
        </div>
    {:else}
        <div class="orga-card-white overflow-hidden">
            <!-- Desktop View -->
            <div class="hidden lg:block overflow-x-auto custom-scrollbar">
                <table class="w-full text-left border-collapse min-w-200">
                    <thead class="bg-neutral-50 border-b border-neutral-100">
                        <tr>
                            <th class="p-4 font-bold text-neutral-500 text-xs uppercase tracking-wider">Rechnung</th>
                            <th class="p-4 font-bold text-neutral-500 text-xs uppercase tracking-wider">Klient</th>
                            <th class="p-4 font-bold text-neutral-500 text-xs uppercase tracking-wider text-right">Betrag</th>
                            <th class="p-4 font-bold text-neutral-500 text-xs uppercase tracking-wider text-center">Status</th>
                            <th class="p-4 font-bold text-neutral-500 text-xs uppercase tracking-wider text-right">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-neutral-50">
                        {#each filterService.filtered as inv (inv.id)}
                            <tr class="hover:bg-neutral-50/50 transition-colors group">
                                <td class="p-4">
                                    <div class="flex flex-col">
                                        <span class="font-bold text-neutral-900">{inv.invoice_nr || 'RE-Unbekannt'}</span>
                                        <span class="text-xs text-neutral-500 mt-0.5">{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</span>
                                    </div>
                                </td>
                                <td class="p-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">{(getClient(inv)?.name_first?.charAt(0) || '')}{(getClient(inv)?.name_last?.charAt(0) || '?')}</div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-sm font-bold text-neutral-900 truncate">{getClient(inv) ? `${getClient(inv).name_first} ${getClient(inv).name_last}` : 'Ohne Klient'}</p>
                                            <p class="text-xs text-neutral-500 mt-0.5 truncate">{Array.isArray(inv.appointments) ? inv.appointments.length : (inv.appointments ? 1 : 0)} Termin(e)</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="p-4 text-right">
                                    {#if inv.brutto > 0}
                                        <span class="font-black text-indigo-700 text-lg">{inv.brutto.toFixed(2).replace('.', ',')} €</span>
                                    {:else}
                                        <span class="font-bold text-neutral-400 text-sm">Nachweis</span>
                                    {/if}
                                </td>
                                <td class="p-4 text-center">
                                    <select 
                                        value={inv.status} 
                                        onchange={(e) => updateStatus(inv.id, e.currentTarget.value)}
                                        class="text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer shadow-sm transition-colors border {getStatusClass(inv.status)}"
                                    >
                                        <option value="Entwurf">Entwurf</option>
                                        <option value="Eingereicht">Eingereicht</option>
                                        <option value="In Bearbeitung">In Bearbeitung</option>
                                        <option value="Abgeschlossen">Abgeschlossen</option>
                                        <option value="Abgelehnt">Abgelehnt</option>
                                        <option value="Storniert">Storniert</option>
                                    </select>
                                </td>
                                <td class="p-4">
                                    <div class="flex items-center justify-end gap-1.5 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
                                        {#if getPdfUrl(inv, 0)}
                                            <button type="button" onclick={() => downloadPdf(inv, 0, 'Rechnung')} class="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900 rounded-lg transition-colors shadow-sm" title="Rechnung herunterladen">
                                                <span>📄</span> <span class="hidden 2xl:inline">Rechnung</span>
                                            </button>
                                        {/if}
                                        
                                        {#if getPdfUrl(inv, 1)}
                                            <button type="button" onclick={() => downloadPdf(inv, 1, 'Zeitnachweis')} class="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900 rounded-lg transition-colors shadow-sm" title="Zweites Dokument (z.B. Zeitnachweis) herunterladen">
                                                <span>⏱️</span> <span class="hidden 2xl:inline">Zeiten</span>
                                            </button>
                                        {/if}
                                        
                                        {#if getPdfUrl(inv, 0) || getPdfUrl(inv, 1)}
                                            <button type="button" onclick={() => emailModal?.open(inv)} class="p-2 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-colors border border-blue-100" title="Per E-Mail versenden">
                                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            </button>
                                        {/if}
                                        
                                        <button onclick={() => deleteInvoice(inv.id)} class="p-2 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-lg transition-colors border border-rose-100 ml-1" title="Rechnung löschen">
                                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Mobile View -->
            <div class="block lg:hidden divide-y divide-neutral-100">
                {#each filterService.filtered as inv (inv.id)}
                    <div class="p-4 flex flex-col gap-3">
                        <div class="flex justify-between items-start">
                            <div>
                                <span class="font-bold text-neutral-900">{inv.invoice_nr || 'RE-Unbekannt'}</span>
                                <span class="text-xs text-neutral-500 block mt-0.5">{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</span>
                            </div>
                            {#if inv.brutto > 0}
                                <span class="font-black text-indigo-700 text-lg">{inv.brutto.toFixed(2).replace('.', ',')} €</span>
                            {:else}
                                <span class="font-bold text-neutral-400 text-sm">Nachweis</span>
                            {/if}
                        </div>
                        
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">{(getClient(inv)?.name_first?.charAt(0) || '')}{(getClient(inv)?.name_last?.charAt(0) || '?')}</div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-neutral-900 truncate">{getClient(inv) ? `${getClient(inv).name_first} ${getClient(inv).name_last}` : 'Ohne Klient'}</p>
                                <p class="text-xs text-neutral-500 mt-0.5 truncate">{Array.isArray(inv.appointments) ? inv.appointments.length : (inv.appointments ? 1 : 0)} Termin(e)</p>
                            </div>
                        </div>

                        <div class="flex items-center justify-between gap-2 mt-1 pt-3 border-t border-neutral-50">
                            <select 
                                value={inv.status} 
                                onchange={(e) => updateStatus(inv.id, e.currentTarget.value)}
                                class="text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer shadow-sm border {getStatusClass(inv.status)}"
                            >
                                <option value="Entwurf">Entwurf</option>
                                <option value="Eingereicht">Eingereicht</option>
                                <option value="In Bearbeitung">In Bearbeitung</option>
                                <option value="Abgeschlossen">Abgeschlossen</option>
                                <option value="Abgelehnt">Abgelehnt</option>
                                <option value="Storniert">Storniert</option>
                            </select>

                            <div class="flex items-center gap-1.5">
                                {#if getPdfUrl(inv, 0)}<button type="button" onclick={() => downloadPdf(inv, 0, 'Rechnung')} class="p-2 text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-lg shadow-sm" title="Rechnung herunterladen"><span>📄</span></button>{/if}
                                {#if getPdfUrl(inv, 1)}<button type="button" onclick={() => downloadPdf(inv, 1, 'Zeitnachweis')} class="p-2 text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-lg shadow-sm" title="Zeitnachweis herunterladen"><span>⏱️</span></button>{/if}
                                {#if getPdfUrl(inv, 0) || getPdfUrl(inv, 1)}<button type="button" onclick={() => emailModal?.open(inv)} class="p-2 text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-600 hover:text-white rounded-lg" title="Per E-Mail versenden"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></button>{/if}
                                <button onclick={() => deleteInvoice(inv.id)} class="p-2 text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-500 hover:text-white rounded-lg ml-1" title="Rechnung löschen"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<DocumentGeneratorModal bind:this={generatorModal} />
<InvoiceEmailModal bind:this={emailModal} />