<script lang="ts">
    import { X, Edit, FileText, Download, Mail, CheckCircle, Circle, AlertCircle, XCircle, Calendar } from "lucide-svelte";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import DocumentGeneratorModal from "$lib/components/DocumentGeneratorModal.svelte";
    import InvoiceEmailModal from "$lib/components/invoices/InvoiceEmailModal.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import AppointmentDetailModal from "$lib/components/AppointmentDetailModal.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import InvoiceBudgetBreakdown from "$lib/components/clients/InvoiceBudgetBreakdown.svelte";
    import { stampInvoiceAsStorniert } from "$lib/services/invoiceStornoStampService";

    let dialog: HTMLDialogElement;
    let invoiceId = $state<string | null>(null);
    let invoice = $derived(invoiceId ? orgaStore.invoices?.getById(invoiceId) : null);
    let client = $derived(invoice && invoice.client ? orgaStore.clients?.getById(Array.isArray(invoice.client) ? invoice.client[0] : invoice.client) : null);
    
    // Lade die zugehörigen Termine aus dem Store
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

    // svelte-ignore non_reactive_update
    let docGenModal: ReturnType<typeof DocumentGeneratorModal>;
    // svelte-ignore non_reactive_update
    let emailModal: ReturnType<typeof InvoiceEmailModal>;
    // svelte-ignore non_reactive_update
    let appointmentDetailModal: ReturnType<typeof AppointmentDetailModal>;

    function formatCurrency(amount: number | null | undefined) {
        return (amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }

    function formatDate(dateStr: string | undefined) {
        if (!dateStr) return 'Unbekannt';
        return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    function formatTime(dateStr: string | undefined) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
    
    function formatAppointmentDate(dateStr: string | undefined) {
        if (!dateStr) return 'Datum unbekannt';
        return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
                if (stampRes.success) {
                    toastStore.success("Rechnungs-PDF wurde mit Storno-Stempel markiert.");
                }
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

    async function executeStorno() {
        if (!invoice) return;
        isCreatingStorno = true;
        try {
            const year = new Date().getFullYear();
            const originalNr = invoice.invoice_nr || `${Date.now()}`;
            const numPart = originalNr.replace(/^[A-Za-z]+-?(\d{4}-?)?/, '') || String(Math.floor(1000 + Math.random() * 9000));
            const stornoNr = `SR-${year}-${numPart.padStart(4, '0')}`;
            const fullReason = `${stornoReason}${stornoNote.trim() ? ': ' + stornoNote.trim() : ''}`;

            // Invertierte Positionen
            const invertedPositions = (invoice.table_positions || []).map((pos: any, idx: number) => ({
                ...pos,
                pos: pos.pos || idx + 1,
                duration: pos.duration?.startsWith('-') ? pos.duration : `-${pos.duration}`,
                total: -Math.abs(Number(pos.total) || 0)
            }));

            // 1. Erstelle die GoBD-konforme Stornorechnung
            const stornoPayload: any = {
                invoice_nr: stornoNr,
                cancellation_nr: stornoNr,
                is_cancellation: true,
                reference_invoice_id: invoice.id,
                cancellation_reason: fullReason,
                client: invoice.client,
                company: invoice.company,
                user: invoice.user,
                appointments: invoice.appointments,
                issue_date: new Date().toISOString(),
                due_date: new Date().toISOString(),
                paid_at: new Date().toISOString(),
                status: 'Abgeschlossen',
                tax_rate: invoice.tax_rate || 0,
                netto: -Math.abs(Number(invoice.netto) || 0),
                brutto: -Math.abs(Number(invoice.brutto) || 0),
                tax_sum: -Math.abs(Number(invoice.tax_sum) || 0),
                table_positions: invertedPositions,
                notes: `Stornorechnung zu Rechnung ${originalNr}. Grund: ${fullReason}`
            };

            const createdStorno = await pb.collection('invoices').create(stornoPayload);

            // 2. Setze die Originalrechnung auf Storniert
            await pb.collection('invoices').update(invoice.id, {
                status: 'Storniert',
                cancellation_nr: stornoNr,
                cancellation_reason: fullReason
            });

            // 2b. PDF der Originalrechnung mit STORNIERT-Stempel versehen
            await stampInvoiceAsStorniert(invoice.id);

            // 3. Aktualisiere lokalen Store
            if (orgaStore.invoices) {
                const idx = orgaStore.invoices.data.findIndex((i: any) => i.id === invoice!.id);
                if (idx !== -1) {
                    orgaStore.invoices.data[idx].status = 'Storniert';
                    orgaStore.invoices.data[idx].cancellation_nr = stornoNr;
                }
                orgaStore.invoices.data.unshift(createdStorno as any);
            }

            toastStore.success(`Stornorechnung ${stornoNr} erfolgreich und GoBD-konform erstellt!`);
            showStornoModal = false;

            // Optional: Öffne direkt die neue Stornorechnung
            invoiceId = createdStorno.id;
        } catch (err: any) {
            console.error("Fehler beim Erstellen der Stornorechnung:", err);
            toastStore.error(`Fehler bei der Stornierung: ${err.message || err}`);
        } finally {
            isCreatingStorno = false;
        }
    }

    let isDownloadingPdf = $state(false);

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
        
        isDownloadingPdf = true;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Fehler beim Herunterladen der Datei.");
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            const safeNr = (invoice.invoice_nr || 'Dokument').replace(/\//g, '-');
            let clientLastName = '';
            if (client?.name_last) clientLastName = `-${client.name_last}`;
            
            let filename = `${typeName}-${safeNr}${clientLastName}.pdf`;
            if (index === 1 || invoice.invoice_nr === 'Zeitnachweis') {
                filename = `AZ-${safeNr}${clientLastName}.pdf`;
            } else if (invoice.is_cancellation) {
                filename = `STORNO-${safeNr}${clientLastName}.pdf`;
            } else {
                filename = `RE-${safeNr}${clientLastName}.pdf`;
            }

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            }, 100);
            toastStore.success(`${filename} heruntergeladen.`);
        } catch (e: any) {
            console.error("PDF Download fehlgeschlagen:", e);
            window.open(url, '_blank');
        } finally {
            isDownloadingPdf = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-4xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-3xl w-full relative shadow-2xl max-h-[90vh] flex flex-col overflow-y-auto custom-scrollbar border border-slate-200/80 dark:border-slate-800">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors z-20 cursor-pointer">
            <X class="w-5 h-5" />
        </button>
        
        {#if invoice}
            <div class="bg-white dark:bg-slate-900 p-6 md:p-8 border-b border-slate-200/80 dark:border-slate-800 shadow-sm shrink-0">
                <div class="flex items-center gap-3 flex-wrap">
                    <FileText class="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                    <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {invoice.is_cancellation ? 'Stornorechnung' : 'Rechnung'} {invoice.invoice_nr || '(Entwurf)'}
                    </h2>
                    {#if invoice.is_cancellation}
                        <span class="px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 rounded-lg">
                            Rechnungskorrektur
                        </span>
                    {/if}
                </div>
                {#if client}
                    <p class="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">für {client.name_first} {client.name_last}</p>
                {/if}
                {#if invoice.is_cancellation && invoice.cancellation_reason}
                    <div class="mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-950 dark:text-rose-200 flex items-start gap-2">
                        <span class="text-base">ℹ️</span>
                        <div>
                            <p class="font-bold">GoBD-Rechnungskorrektur</p>
                            <p class="text-rose-900/80 dark:text-rose-300/80 mt-0.5"><strong>Grund:</strong> {invoice.cancellation_reason}</p>
                        </div>
                    </div>
                {/if}
            </div>

            <div class="flex-1 p-6 md:p-8 space-y-6">
                
                <!-- Aktionen -->
                <div class="grid grid-cols-2 sm:grid-cols-4 {getPdfUrl(1) ? 'lg:grid-cols-5' : ''} gap-3">
                    <button onclick={() => {
                        const clientId = Array.isArray(invoice.client) ? invoice.client[0] : invoice.client;
                        const userId = Array.isArray(invoice.user) ? invoice.user[0] : invoice.user;
                        docGenModal?.open('', 1, clientId, 'rechnung', userId);
                    }} class="orga-button-ghost bg-white dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex-col h-24 shadow-sm cursor-pointer"><Edit class="w-6 h-6 mb-1 text-indigo-500" /><span class="text-xs font-bold">Bearbeiten</span></button>
                    <button onclick={() => downloadPdfFile(0, 'Rechnung')} disabled={!getPdfUrl(0) || isDownloadingPdf} class="orga-button-ghost bg-white dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex-col h-24 shadow-sm {!getPdfUrl(0) ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}"><Download class="w-6 h-6 mb-1 text-blue-500" /><span class="text-xs font-bold">{getPdfUrl(1) ? 'Rechnung PDF' : 'Download'}</span></button>
                    {#if getPdfUrl(1)}
                        <button onclick={() => downloadPdfFile(1, 'Zeitnachweis')} disabled={isDownloadingPdf} class="orga-button-ghost bg-white dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex-col h-24 shadow-sm cursor-pointer"><Download class="w-6 h-6 mb-1 text-cyan-600" /><span class="text-xs font-bold">Zeitnachweis PDF</span></button>
                    {/if}
                    <button onclick={() => emailModal?.open(invoice)} class="orga-button-ghost bg-white dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex-col h-24 shadow-sm cursor-pointer"><Mail class="w-6 h-6 mb-1 text-emerald-500" /><span class="text-xs font-bold">Senden</span></button>
                    {#if invoice.is_cancellation}
                        <button disabled class="orga-button-ghost bg-slate-100 dark:bg-slate-800/50 flex-col h-24 shadow-sm opacity-50 cursor-not-allowed"><XCircle class="w-6 h-6 mb-1 text-slate-400" /><span class="text-xs font-bold">Stornorechnung</span></button>
                    {:else if invoice.status === 'Storniert'}
                        <button disabled class="orga-button-ghost bg-rose-50 dark:bg-rose-950/40 flex-col h-24 shadow-sm opacity-60 cursor-not-allowed"><XCircle class="w-6 h-6 mb-1 text-rose-400" /><span class="text-xs font-bold">Bereits storniert</span></button>
                    {:else}
                        <button onclick={() => showStornoModal = true} class="orga-button-ghost bg-white dark:bg-slate-800 flex-col h-24 shadow-sm hover:border-rose-300 hover:bg-rose-50/40 dark:hover:bg-rose-950/40 cursor-pointer"><XCircle class="w-6 h-6 mb-1 text-rose-500" /><span class="text-xs font-bold">Stornieren</span></button>
                    {/if}
                </div>

                <!-- Status & Daten -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="orga-card-white p-4">
                        <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Status</p>
                        <select bind:value={invoice.status} onchange={(e) => updateStatus(e.currentTarget.value)} disabled={isLoadingStatus} class="orga-input-clear p-0 font-bold text-base text-neutral-800 cursor-pointer w-full bg-transparent">
                            <option>Entwurf</option>
                            <option>Eingereicht</option>
                            <option>In Bearbeitung</option>
                            <option>Abgeschlossen</option>
                            <option>Abgelehnt</option>
                            <option>Storniert</option>
                        </select>
                    </div>
                    <div class="orga-card-white p-4">
                        <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Rechnungsdatum</p>
                        <p class="font-bold text-neutral-800">{formatDate(invoice.issue_date)}</p>
                    </div>
                    <div class="orga-card-white p-4">
                        <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Fälligkeitsdatum</p>
                        <p class="font-bold text-neutral-800">{formatDate(invoice.due_date)}</p>
                    </div>
                </div>

                <!-- Positionen -->
                <div class="orga-card-white p-4 sm:p-6">
                    <h3 class="text-base font-bold text-neutral-900 mb-4">Rechnungspositionen</h3>
                    <div class="overflow-x-auto custom-scrollbar orga-table-container">
                        <table class="w-full text-left min-w-150 tabular-nums">
                            <thead class="bg-slate-100/90 dark:bg-slate-800/90 border-b-2 border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th class="p-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider w-12">Pos.</th>
                                    <th class="p-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Datum</th>
                                    <th class="p-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Beschreibung</th>
                                    <th class="p-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-right">Menge</th>
                                    <th class="p-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-right">Einzelpreis</th>
                                    <th class="p-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-right">Gesamt</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                                {#each invoice.table_positions || [] as pos, i}
                                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td class="p-3 text-sm font-mono text-slate-500 dark:text-slate-400">{pos.pos || i + 1}</td>
                                        <td class="p-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{pos.date}</td>
                                        <td class="p-3 text-sm font-medium text-slate-800 dark:text-slate-200">{pos.title}</td>
                                        <td class="p-3 text-sm font-medium text-slate-800 dark:text-slate-200 text-right">{pos.duration}</td>
                                        <td class="p-3 text-sm font-medium text-slate-800 dark:text-slate-200 text-right">{pos.price}</td>
                                        <td class="p-3 text-sm font-bold text-slate-900 dark:text-slate-100 text-right">{formatCurrency(pos.total)}</td>
                                    </tr>
                                {/each}
                            </tbody>
                            <tfoot class="font-bold bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700">
                                <tr><td colspan="5" class="pt-4 pr-4 pb-1 text-right text-sm text-slate-600 dark:text-slate-300">Netto</td><td class="pt-4 pr-4 pb-1 text-right text-sm text-slate-900 dark:text-slate-100">{formatCurrency(invoice.netto)}</td></tr>
                                <tr><td colspan="5" class="px-4 pb-1 text-right text-sm text-slate-600 dark:text-slate-300">zzgl. {invoice.tax_rate || 0}% USt.</td><td class="px-4 pb-1 text-right text-sm text-slate-900 dark:text-slate-100">{formatCurrency(invoice.tax_sum)}</td></tr>
                                <tr class="text-base font-black text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60"><td colspan="5" class="p-4 text-right">Gesamtbetrag (Brutto)</td><td class="p-4 text-right text-lg text-indigo-700 dark:text-indigo-300">{formatCurrency(invoice.brutto)}</td></tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <!-- Budget-Aufschlüsselung -->
                <InvoiceBudgetBreakdown invoice={invoice} />

                <!-- Zugehörige Termine -->
                <div class="orga-card-white p-4 sm:p-6">
                    <h3 class="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
                        <Calendar class="w-5 h-5 text-neutral-400" />
                        Zugehörige Termine
                    </h3>
                    {#if relatedAppointments.length === 0}
                        <div class="text-center py-8 px-4 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                            <p class="text-sm font-medium text-neutral-500">Für diese Rechnung wurden keine Termine verknüpft.</p>
                        </div>
                    {:else}
                        <div class="space-y-3">
                            {#each relatedAppointments as app (app.id)}
                                <div class="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-neutral-200 bg-neutral-50 hover:border-indigo-300 transition-all shadow-sm group">
                                    <div class="min-w-0">
                                        <p class="text-xs font-bold text-indigo-600">
                                            {formatAppointmentDate(app.appointment)}
                                            - {formatTime(app.appointment)} Uhr
                                        </p>
                                        <p class="text-sm font-semibold text-neutral-900 truncate mt-0.5">{app.description?.replace('[BLOCK]', '').trim() || 'Termin ohne Beschreibung'}</p>
                                    </div>
                                    <div class="flex items-center gap-2 shrink-0 ml-4">
                                        <button onclick={() => appointmentDetailModal?.open(app.id)} class="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none" title="Termin-Details ansehen">
                                            <Edit class="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
        {:else}
            <div class="p-12 text-center">
                <p class="text-neutral-500 text-sm">Rechnung wird geladen...</p>
            </div>
        {/if}

        <!-- GoBD Storno Dialog Overlay -->
        {#if showStornoModal && invoice}
            <div class="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-enter">
                <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-rose-100">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl shrink-0">⚠️</div>
                        <div>
                            <h3 class="font-black text-lg text-neutral-900">Rechnungskorrektur erstellen (GoBD)</h3>
                            <p class="text-xs text-neutral-500">Rechnung {invoice.invoice_nr} wird storniert und eine Gutschrift erzeugt.</p>
                        </div>
                    </div>

                    <div class="space-y-4 text-xs">
                        <div>
                            <label for="storno-reason" class="block font-bold text-neutral-700 uppercase mb-1">Stornogrund (Pflichtangabe)</label>
                            <select id="storno-reason" bind:value={stornoReason} class="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-3 font-semibold text-neutral-800">
                                <option>Rechnungsfehler / Korrektur von Positionen</option>
                                <option>Falsche Klienten- oder Kassenanschrift</option>
                                <option>Kundenstorno / Kulanzregelung</option>
                                <option>Doppelte Rechnungsstellung</option>
                                <option>Sonstige Korrektur</option>
                            </select>
                        </div>

                        <div>
                            <label for="storno-note" class="block font-bold text-neutral-700 uppercase mb-1">Ergänzende Begründung</label>
                            <textarea 
                                id="storno-note"
                                rows="3" 
                                bind:value={stornoNote} 
                                placeholder="Details zur Stornierung für das Finanzamt..."
                                class="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-3 text-neutral-800"
                            ></textarea>
                        </div>

                        <div class="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 space-y-1">
                            <p class="font-bold">GoBD-Hinweis:</p>
                            <p class="text-[11px] leading-relaxed">
                                Es wird eine neue Stornorechnung (SR-...) mit negativem Vorzeichen (-{formatCurrency(invoice.brutto)}) angelegt. Die Buchhaltung wird exakt ausgeglichen und beide Belege bleiben revisionssicher erhalten.
                            </p>
                        </div>
                    </div>

                    <div class="flex items-center justify-end gap-3 pt-2">
                        <button 
                            type="button" 
                            onclick={() => showStornoModal = false}
                            class="orga-button-ghost py-2.5 px-4 text-xs font-bold"
                            disabled={isCreatingStorno}
                        >
                            Abbrechen
                        </button>
                        <button 
                            type="button" 
                            onclick={executeStorno}
                            class="bg-rose-600 hover:bg-rose-700 text-white py-2.5 px-5 rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-2"
                            disabled={isCreatingStorno}
                        >
                            <span>{isCreatingStorno ? 'Erstelle Stornorechnung...' : 'Storno verbindlich buchen'}</span>
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</dialog>

<DocumentGeneratorModal bind:this={docGenModal} />
<InvoiceEmailModal bind:this={emailModal} />
<AppointmentDetailModal bind:this={appointmentDetailModal} />