<script lang="ts">
    import { 
        X, Check, AlertCircle, Scale, FilePlus2, 
        TrendingDown, ArrowLeft, Calendar, FileText, 
        AlertTriangle, ShieldAlert, Sparkles, Loader2 
    } from "lucide-svelte";
    import { invoiceSettlementService } from "$lib/services/invoiceSettlementService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import type { InvoiceRecord } from "$lib/types/orgaTypes";

    // Props für Callbacks
    let { 
        onSettled = () => {}, 
        onOpenGenerator = (templateId: string, clientId: string, newInvoiceId: string) => {} 
    } = $props<{
        onSettled?: (invoiceId: string, actionType: string) => void;
        onOpenGenerator?: (templateId: string, clientId: string, newInvoiceId: string) => void;
    }>();

    // Dialog-Referenz
    let dialog = $state<HTMLDialogElement>();

    // Aktive Rechnung & Rechnungsdaten
    let activeInvoice = $state<InvoiceRecord | null>(null);

    // Workflow-Schritt: 1 = Vollzahlungs-Prüfung, 2 = Differenzerfassung & Decision Tree
    let step = $state<1 | 2>(1);

    // Formular-Zustände
    let paymentDate = $state<string>(new Date().toISOString().split('T')[0]);
    let receivedAmount = $state<number>(0);
    let referenceNr = $state<string>('');
    let notes = $state<string>('');
    let selectedDecision = $state<'dispute' | 'bill_client_privat' | 'write_off'>('dispute');
    let isSubmitting = $state<boolean>(false);

    // Berechnete Werte
    let totalGross = $derived<number>(
        activeInvoice ? Number(activeInvoice.brutto || 0) : 0
    );

    let differenceAmount = $derived<number>(
        Math.max(0, Math.round((totalGross - Number(receivedAmount || 0)) * 100) / 100)
    );

    let isOverpaid = $derived<boolean>(
        Number(receivedAmount || 0) > totalGross
    );

    let clientName = $derived.by<string>(() => {
        if (!activeInvoice) return 'Klient unbekannt';
        const cl = activeInvoice.expand?.client;
        if (Array.isArray(cl)) {
            const first = cl[0];
            return first ? `${first.name_first || ''} ${first.name_last || ''}`.trim() : 'Klient unbekannt';
        }
        if (cl && typeof cl === 'object') {
            return `${cl.name_first || ''} ${cl.name_last || ''}`.trim();
        }
        return 'Klient';
    });

    /**
     * Modal öffnen mit Rechnungsdatensatz
     */
    export function open(invoice: InvoiceRecord, existingDate?: string | null) {
        activeInvoice = invoice;
        step = 1;
        isSubmitting = false;
        referenceNr = '';
        notes = '';
        selectedDecision = 'dispute';

        if (existingDate) {
            paymentDate = new Date(existingDate).toISOString().split('T')[0];
        } else if (invoice.paid_at) {
            paymentDate = new Date(invoice.paid_at).toISOString().split('T')[0];
        } else {
            paymentDate = new Date().toISOString().split('T')[0];
        }

        // Standardmäßig Vorschlag auf Gesamtsumme
        receivedAmount = Number(invoice.brutto || 0);

        dialog?.showModal();
    }

    /**
     * Modal schließen
     */
    export function close() {
        dialog?.close();
        activeInvoice = null;
        isSubmitting = false;
    }

    /**
     * Schritt 1: Vollständig bezahlt bestätigen
     */
    async function handleConfirmFullPayment() {
        if (!activeInvoice || isSubmitting) return;
        isSubmitting = true;

        try {
            const d = new Date(paymentDate);
            d.setHours(12, 0, 0, 0);

            await invoiceSettlementService.settleFullPayment({
                invoice: activeInvoice,
                receivedAmount: totalGross,
                paymentDate: d.toISOString(),
                referenceNr: referenceNr.trim() || undefined,
                notes: notes.trim() || undefined
            });

            onSettled(activeInvoice.id, 'full_payment');
            close();
        } catch (err: any) {
            console.error("Fehler bei Vollzahlung:", err);
            toastStore.error("Fehler beim Verbuchen der vollständigen Zahlung.");
        } finally {
            isSubmitting = false;
        }
    }

    /**
     * Wechsel zu Schritt 2 (Kürzung / Teilzahlung)
     */
    function handleSwitchToPartialPayment() {
        step = 2;
        // Falls Betrag noch auf Gesamtsumme steht, leicht reduzieren oder auf 0 setzen zur Aufforderung
        if (receivedAmount === totalGross) {
            receivedAmount = 0;
        }
    }

    /**
     * Schritt 2: Decision Tree Entscheidung ausführen
     */
    async function handleExecuteDecision() {
        if (!activeInvoice || isSubmitting) return;

        if (receivedAmount < 0) {
            toastStore.warning("Der erhaltene Betrag darf nicht negativ sein.");
            return;
        }

        if (differenceAmount <= 0 && receivedAmount === totalGross) {
            // Falls der Betrag doch voll ist
            await handleConfirmFullPayment();
            return;
        }

        isSubmitting = true;
        try {
            const d = new Date(paymentDate);
            d.setHours(12, 0, 0, 0);
            const isoDate = d.toISOString();
            const invId = activeInvoice.id;

            if (selectedDecision === 'dispute') {
                // Option 1: Widerspruch einlegen
                await invoiceSettlementService.settleDispute({
                    invoice: activeInvoice,
                    receivedAmount: Number(receivedAmount),
                    differenceAmount,
                    paymentDate: isoDate,
                    referenceNr: referenceNr.trim() || undefined,
                    notes: notes.trim() || undefined
                });
                onSettled(invId, 'dispute');
                close();
            } else if (selectedDecision === 'bill_client_privat') {
                // Option 2: Privat an Klienten weiterberechnen
                const result = await invoiceSettlementService.settleBillClientPrivat({
                    invoice: activeInvoice,
                    receivedAmount: Number(receivedAmount),
                    differenceAmount,
                    paymentDate: isoDate,
                    referenceNr: referenceNr.trim() || undefined,
                    notes: notes.trim() || undefined
                });
                onSettled(invId, 'bill_client_privat');
                close();

                // Optional Generator öffnen für Klienten-Rechnung
                const clientId = Array.isArray(activeInvoice.client) 
                    ? activeInvoice.client[0] 
                    : (typeof activeInvoice.client === 'string' ? activeInvoice.client : '');
                
                if (result.newInvoiceId && clientId) {
                    onOpenGenerator('', clientId, result.newInvoiceId);
                }
            } else if (selectedDecision === 'write_off') {
                // Option 3: Als Verlust ausbuchen
                await invoiceSettlementService.settleWriteOff({
                    invoice: activeInvoice,
                    receivedAmount: Number(receivedAmount),
                    differenceAmount,
                    reason: notes.trim() || referenceNr.trim() || 'Kürzung Kostenträger akzeptiert',
                    paymentDate: isoDate,
                    referenceNr: referenceNr.trim() || undefined,
                    notes: notes.trim() || undefined
                });
                onSettled(invId, 'write_off');
                close();
            }
        } catch (err: any) {
            console.error("Fehler beim Ausführen der Kürzungsentscheidung:", err);
            toastStore.error("Fehler bei der Zahlungsabwicklung.");
        } finally {
            isSubmitting = false;
        }
    }
</script>

<!-- Nativer Dialog als reiner Rahmen nach Regel 4 -->
<dialog 
    bind:this={dialog} 
    class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-xl mx-auto my-auto rounded-3xl overflow-hidden border-none max-h-dvh sm:max-h-[90dvh]" 
    onclick={(e) => { if (e.target === dialog && !isSubmitting) close(); }}
>
    <!-- Innerer Modal-Container mit dem EINZIGEN Scrollbalken (Regel 4) -->
    <div class="w-full max-h-dvh sm:max-h-[90dvh] overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col bg-white dark:bg-slate-900 shadow-2xl rounded-3xl text-neutral-900 dark:text-neutral-100">
        
        <!-- HEADER (fließt mit nach oben weg, Regel 4) -->
        <div class="relative p-6 sm:p-8 bg-gradient-to-br from-indigo-50/80 via-white to-neutral-50/50 dark:from-slate-800/80 dark:via-slate-900 dark:to-slate-950 border-b border-neutral-100 dark:border-slate-800">
            <button 
                type="button"
                aria-label="Schließen" 
                title="Schließen" 
                disabled={isSubmitting}
                onclick={close} 
                class="absolute top-5 right-5 w-10 h-10 bg-white/80 dark:bg-slate-800/80 hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded-full flex items-center justify-center transition-all shadow-xs disabled:opacity-50"
            >
                <X class="w-5 h-5" />
            </button>

            <div class="flex items-center gap-3 mb-2">
                <span class="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-inner">
                    💶
                </span>
                <div>
                    <h2 class="text-xl font-bold tracking-tight">Zahlungsabwicklung & Bescheidausgleich</h2>
                    <p class="text-xs text-neutral-500 dark:text-neutral-400">
                        Rechnung: <span class="font-semibold text-neutral-800 dark:text-neutral-200">{activeInvoice?.invoice_nr || 'Unbekannt'}</span>
                        {#if clientName}
                            • <span class="text-neutral-600 dark:text-neutral-300">{clientName}</span>
                        {/if}
                    </p>
                </div>
            </div>

            <!-- KPI-Banner Gesamtsumme -->
            <div class="mt-4 p-4 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-neutral-200/70 dark:border-slate-700/70 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                    <span class="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">Rechnungsbetrag (Brutto)</span>
                    <span class="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {totalGross.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </span>
                </div>
                <div class="flex items-center gap-2">
                    <label for="settlement-paid-date" class="text-xs text-neutral-500 font-medium flex items-center gap-1">
                        <Calendar class="w-3.5 h-3.5" /> Zahlungsdatum:
                    </label>
                    <input 
                        id="settlement-paid-date" 
                        type="date" 
                        bind:value={paymentDate} 
                        class="px-2.5 py-1 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-slate-600 bg-neutral-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                </div>
            </div>
        </div>

        <!-- STICKY CONTROL / FORTSCHRITT (Regel 4) -->
        <div class="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-2.5 border-b border-neutral-200/70 dark:border-slate-800 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 text-xs font-bold">
                <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] {step === 1 ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}">
                    {step === 1 ? '1' : '✓'}
                </span>
                <span class="{step === 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400'}">Prüfung Vollzahlung</span>
                
                <span class="text-neutral-300 dark:text-neutral-700">→</span>

                <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] {step === 2 ? 'bg-indigo-600 text-white' : 'bg-neutral-100 dark:bg-slate-800 text-neutral-400'}">
                    2
                </span>
                <span class="{step === 2 ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400'}">Differenzerfassung & Decision Tree</span>
            </div>

            {#if step === 2}
                <button 
                    type="button" 
                    onclick={() => step = 1} 
                    disabled={isSubmitting}
                    class="text-xs font-semibold text-neutral-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                    <ArrowLeft class="w-3.5 h-3.5" /> Zurück
                </button>
            {/if}
        </div>

        <!-- INHALTSBEREICH (ohne eigenen Scrollbalken, Regel 4) -->
        <div class="p-6 flex-1 space-y-6">

            <!-- ================= SCHRITT 1: VOLLZAHLUNG ================= -->
            {#if step === 1}
                <div class="space-y-6 text-center py-2">
                    <div class="max-w-md mx-auto">
                        <h3 class="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                            Wurde der Betrag vollständig bezahlt?
                        </h3>
                        <p class="text-sm text-neutral-500 dark:text-neutral-400">
                            Wurde der gesamte Rechnungsbetrag in Höhe von 
                            <strong class="text-neutral-800 dark:text-neutral-200">{totalGross.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</strong> 
                            vom Kostenträger bzw. Klienten ohne Kürzungen beglichen?
                        </p>
                    </div>

                    <!-- Zwei prominente Aktions-Schaltflächen -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-2">
                        <!-- JA, VOLLSTÄNDIG BEZAHLT -->
                        <button 
                            type="button" 
                            disabled={isSubmitting}
                            onclick={handleConfirmFullPayment}
                            class="group p-5 rounded-2xl border-2 border-emerald-500/50 hover:border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 text-left transition-all shadow-sm hover:shadow-md flex flex-col justify-between gap-3 cursor-pointer"
                        >
                            <div class="flex items-center justify-between">
                                <span class="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                    <Check class="w-5 h-5 stroke-[3]" />
                                </span>
                                <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                                    1-Klick Abschluss
                                </span>
                            </div>
                            <div>
                                <h4 class="font-bold text-emerald-900 dark:text-emerald-200 text-base">Ja, vollständig bezahlt</h4>
                                <p class="text-xs text-emerald-700/80 dark:text-emerald-400 mt-1 leading-relaxed">
                                    Bucht {totalGross.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} als bezahlt und schließt die Rechnung direkt ab.
                                </p>
                            </div>
                        </button>

                        <!-- NEIN, KÜRZUNG / TEILZAHLUNG -->
                        <button 
                            type="button" 
                            disabled={isSubmitting}
                            onclick={handleSwitchToPartialPayment}
                            class="group p-5 rounded-2xl border-2 border-amber-400/60 hover:border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 text-left transition-all shadow-sm hover:shadow-md flex flex-col justify-between gap-3 cursor-pointer"
                        >
                            <div class="flex items-center justify-between">
                                <span class="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                                    <AlertTriangle class="w-5 h-5 stroke-[2.5]" />
                                </span>
                                <span class="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                                    Kassenkürzung
                                </span>
                            </div>
                            <div>
                                <h4 class="font-bold text-amber-900 dark:text-amber-200 text-base">Nein, gekürzt / Teilbetrag</h4>
                                <p class="text-xs text-amber-700/80 dark:text-amber-400 mt-1 leading-relaxed">
                                    Öffnet den geführten Decision Tree zur automatisierten Auflösung der Kürzungsdifferenz.
                                </p>
                            </div>
                        </button>
                    </div>
                </div>

            <!-- ================= SCHRITT 2: DIFFERENZERFASSUNG & DECISION TREE ================= -->
            {:else}
                <div class="space-y-6 animate-enter">
                    
                    <!-- EINGABEFELDER: Erhaltener Betrag & Live-Differenz -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="bg-neutral-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-neutral-200/80 dark:border-slate-700">
                            <label for="received-amount" class="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                                Tatsächlich erhaltener Betrag (€)
                            </label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">€</span>
                                <input 
                                    id="received-amount"
                                    type="number" 
                                    step="0.01" 
                                    min="0"
                                    max={totalGross}
                                    bind:value={receivedAmount}
                                    class="w-full pl-8 pr-3 py-2.5 rounded-xl border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-lg font-bold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <span class="text-[11px] text-neutral-400 mt-1 block">Laut Kontoauszug oder Kassenabrechnung</span>
                        </div>

                        <!-- Live Differenz-Anzeige -->
                        <div class="p-4 rounded-2xl border {differenceAmount > 0 ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/60' : 'bg-neutral-50 dark:bg-slate-800 border-neutral-200 dark:border-slate-700'} flex flex-col justify-center">
                            <span class="text-xs font-bold uppercase tracking-wider {differenceAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-400'}">
                                Kürzungsdifferenz (Offener Betrag)
                            </span>
                            <span class="text-2xl font-black {differenceAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-600 dark:text-neutral-300'} mt-1">
                                {differenceAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </span>
                            <span class="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                                {differenceAmount > 0 ? 'Kürzungsbetrag, der nun aufgelöst werden muss' : 'Keine Differenz festgestellt'}
                            </span>
                        </div>
                    </div>

                    <!-- Kassen-Aktenzeichen / Kürzungsvermerk -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="reference-nr" class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                Kassen-Aktenzeichen / Bescheid-Nr.
                            </label>
                            <input 
                                id="reference-nr"
                                type="text"
                                bind:value={referenceNr}
                                placeholder="z. B. AZ-2026-8849-KK"
                                class="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label for="notes" class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                Kürzungsvermerk / Begründung
                            </label>
                            <input 
                                id="notes"
                                type="text"
                                bind:value={notes}
                                placeholder="z. B. Anfahrt gekürzt, Budget überschritten"
                                class="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <!-- MULTIPLE-CHOICE ENTSCHEIDUNGSBAUM -->
                    <div class="space-y-3 pt-2">
                        <p class="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                            Wie soll die Kürzung aufgelöst werden? (Decision Tree)
                        </p>

                        <!-- Option 1: Widerspruch einlegen -->
                        <label class="relative flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer {selectedDecision === 'dispute' ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 shadow-xs' : 'border-neutral-200 dark:border-slate-800 hover:border-neutral-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'}">
                            <input 
                                type="radio" 
                                name="decision" 
                                value="dispute" 
                                bind:group={selectedDecision} 
                                class="mt-1 text-amber-600 focus:ring-amber-500" 
                            />
                            <div class="flex-1">
                                <div class="flex items-center gap-2">
                                    <ShieldAlert class="w-4 h-4 text-amber-600 shrink-0" />
                                    <span class="font-bold text-sm text-neutral-900 dark:text-neutral-100">1. Widerspruch einlegen (Kürzung unberechtigt)</span>
                                </div>
                                <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                                    Verbuche Teilbetrag als <span class="font-semibold text-amber-700 dark:text-amber-300">Teilweise bezahlt</span>, aktiviere den 
                                    <span class="font-semibold text-amber-700 dark:text-amber-300">Mahnstopp</span> und lege automatisch eine Nachforderungs-Aufgabe mit 
                                    <span class="font-semibold text-amber-700 dark:text-amber-300">14-Tage-Frist</span> zur Klärung des Bescheids an.
                                </p>
                            </div>
                        </label>

                        <!-- Option 2: Privat an Klienten weiterberechnen -->
                        <label class="relative flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer {selectedDecision === 'bill_client_privat' ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 shadow-xs' : 'border-neutral-200 dark:border-slate-800 hover:border-neutral-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'}">
                            <input 
                                type="radio" 
                                name="decision" 
                                value="bill_client_privat" 
                                bind:group={selectedDecision} 
                                class="mt-1 text-indigo-600 focus:ring-indigo-500" 
                            />
                            <div class="flex-1">
                                <div class="flex items-center gap-2">
                                    <FilePlus2 class="w-4 h-4 text-indigo-600 shrink-0" />
                                    <span class="font-bold text-sm text-neutral-900 dark:text-neutral-100">2. Privat an Klienten weiterberechnen</span>
                                </div>
                                <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                                    Schließt die Kassenrechnung ab und generiert automatisch eine neue <span class="font-semibold text-indigo-700 dark:text-indigo-300">Privatrechnung im Entwurfsstatus</span> 
                                    über die Differenz ({differenceAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}). Bleibt im Klienten-Portal verborgen, bis du sie finalisierst.
                                </p>
                            </div>
                        </label>

                        <!-- Option 3: Als Verlust ausbuchen -->
                        <label class="relative flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer {selectedDecision === 'write_off' ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 shadow-xs' : 'border-neutral-200 dark:border-slate-800 hover:border-neutral-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'}">
                            <input 
                                type="radio" 
                                name="decision" 
                                value="write_off" 
                                bind:group={selectedDecision} 
                                class="mt-1 text-rose-600 focus:ring-rose-500" 
                            />
                            <div class="flex-1">
                                <div class="flex items-center gap-2">
                                    <TrendingDown class="w-4 h-4 text-rose-600 shrink-0" />
                                    <span class="font-bold text-sm text-neutral-900 dark:text-neutral-100">3. Als Verlust ausbuchen (Kürzung akzeptieren)</span>
                                </div>
                                <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                                    Schließt die Kassenrechnung mit Restforderung 0 € ab (<span class="font-semibold text-emerald-600">Bezahlt</span>), bucht den Differenzbetrag revisionssicher als 
                                    <span class="font-semibold text-rose-600">Verlustausbuchung</span> im Haushaltsbuch und hinterlegt den Kürzungsvermerk.
                                </p>
                            </div>
                        </label>
                    </div>

                </div>
            {/if}
        </div>

        <!-- FOOTER (mt-auto, am natürlichen Ende der Liste, Regel 4) -->
        <div class="mt-auto p-4 sm:p-6 bg-neutral-50 dark:bg-slate-800/80 border-t border-neutral-200/70 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button 
                type="button" 
                onclick={close} 
                disabled={isSubmitting}
                class="px-5 py-2.5 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
            >
                Abbrechen
            </button>

            {#if step === 2}
                <button 
                    type="button" 
                    onclick={handleExecuteDecision} 
                    disabled={isSubmitting}
                    class="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                    {#if isSubmitting}
                        <Loader2 class="w-4 h-4 animate-spin" /> Verbuche...
                    {:else}
                        <Check class="w-4 h-4 stroke-[3]" /> Entscheidung verbindlich verbuchen
                    {/if}
                </button>
            {/if}
        </div>

    </div>
</dialog>
