<script lang="ts">
    import { ArrowLeft, Calendar, Loader2, Check } from "lucide-svelte";
    import { invoiceSettlementService } from "$lib/services/invoiceSettlementService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import type { InvoiceRecord } from "$lib/types/orgaTypes";
    import InvoiceSettlementHeader from "./InvoiceSettlementHeader.svelte";
    import InvoiceSettlementStepFullPayment from "./InvoiceSettlementStepFullPayment.svelte";
    import InvoiceSettlementStepDecisionTree from "./InvoiceSettlementStepDecisionTree.svelte";

    let { 
        onSettled = () => {}, 
        onOpenGenerator = (templateId: string, clientId: string, newInvoiceId: string) => {} 
    } = $props<{
        onSettled?: (invoiceId: string, actionType: string) => void;
        onOpenGenerator?: (templateId: string, clientId: string, newInvoiceId: string) => void;
    }>();

    let dialog = $state<HTMLDialogElement>();
    let activeInvoice = $state<InvoiceRecord | null>(null);
    let step = $state<1 | 2>(1);
    let paymentDate = $state<string>(new Date().toISOString().split('T')[0]);
    let receivedAmount = $state<number>(0);
    let referenceNr = $state<string>('');
    let notes = $state<string>('');
    let selectedDecision = $state<'dispute' | 'bill_client_privat' | 'write_off'>('dispute');
    let isSubmitting = $state<boolean>(false);

    let totalGross = $derived<number>(activeInvoice ? Number(activeInvoice.brutto || 0) : 0);
    let differenceAmount = $derived<number>(
        Math.max(0, Math.round((totalGross - Number(receivedAmount || 0)) * 100) / 100)
    );

    let clientName = $derived.by<string>(() => {
        if (!activeInvoice) return 'Klient unbekannt';
        const cl = activeInvoice.expand?.client;
        if (Array.isArray(cl)) {
            const first = cl[0];
            return first ? `${first.name_first || ''} ${first.name_last || ''}`.trim() : 'Klient unbekannt';
        }
        return cl && typeof cl === 'object' ? `${cl.name_first || ''} ${cl.name_last || ''}`.trim() : 'Klient';
    });

    export function open(invoice: InvoiceRecord, existingDate?: string | null) {
        activeInvoice = invoice;
        step = 1;
        isSubmitting = false;
        referenceNr = '';
        notes = '';
        selectedDecision = 'dispute';
        paymentDate = existingDate ? new Date(existingDate).toISOString().split('T')[0]
            : invoice.paid_at ? new Date(invoice.paid_at).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
        receivedAmount = Number(invoice.brutto || 0);
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
        activeInvoice = null;
        isSubmitting = false;
    }

    function getIsoDate() {
        const d = new Date(paymentDate);
        d.setHours(12, 0, 0, 0);
        return d.toISOString();
    }

    async function handleConfirmFullPayment() {
        if (!activeInvoice || isSubmitting) return;
        isSubmitting = true;
        try {
            await invoiceSettlementService.settleFullPayment({
                invoice: activeInvoice,
                receivedAmount: totalGross,
                paymentDate: getIsoDate(),
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

    async function handleExecuteDecision() {
        if (!activeInvoice || isSubmitting) return;
        if (receivedAmount < 0) {
            toastStore.warning("Der erhaltene Betrag darf nicht negativ sein.");
            return;
        }
        if (differenceAmount <= 0 && receivedAmount === totalGross) {
            await handleConfirmFullPayment();
            return;
        }
        isSubmitting = true;
        try {
            const isoDate = getIsoDate();
            const inv = activeInvoice;
            const payload = {
                invoice: inv,
                receivedAmount: Number(receivedAmount),
                differenceAmount,
                paymentDate: isoDate,
                referenceNr: referenceNr.trim() || undefined,
                notes: notes.trim() || undefined
            };

            if (selectedDecision === 'dispute') {
                await invoiceSettlementService.settleDispute(payload);
            } else if (selectedDecision === 'bill_client_privat') {
                const res = await invoiceSettlementService.settleBillClientPrivat(payload);
                if (res.newInvoiceId && res.clientId) onOpenGenerator('', res.clientId, res.newInvoiceId);
            } else if (selectedDecision === 'write_off') {
                await invoiceSettlementService.settleWriteOff({
                    ...payload,
                    reason: notes.trim() || referenceNr.trim() || 'Kürzung Kostenträger akzeptiert'
                });
            }
            onSettled(inv.id, selectedDecision);
            close();
        } catch (err: any) {
            console.error("Fehler beim Ausführen der Kürzungsentscheidung:", err);
            toastStore.error("Fehler bei der Zahlungsabwicklung.");
        } finally {
            isSubmitting = false;
        }
    }
</script>

<dialog 
    bind:this={dialog} 
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-6 sm:my-10 rounded-3xl border-none z-50" 
    onclick={(e) => { if (e.target === dialog && !isSubmitting) close(); }}
>
    <div class="w-full flex flex-col bg-white dark:bg-slate-900 shadow-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100">
        <InvoiceSettlementHeader 
            invoiceNr={activeInvoice?.invoice_nr} 
            {clientName} 
            {isSubmitting} 
            onClose={close} 
        />

        <div class="px-6 pt-5">
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Rechnungsbetrag (Brutto)</span>
                    <span class="text-2xl font-black text-violet-600 dark:text-violet-400">
                        {totalGross.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </span>
                </div>
                <div class="flex items-center gap-2">
                    <label for="settlement-paid-date" class="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                        <Calendar class="w-3.5 h-3.5" /> Zahlungsdatum:
                    </label>
                    <input 
                        id="settlement-paid-date" 
                        type="date" 
                        bind:value={paymentDate} 
                        class="min-h-11 px-3 py-1 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 focus:outline-none touch-manipulation"
                    />
                </div>
            </div>
        </div>

        <div class="px-6 py-3 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
            <div class="flex items-center gap-2 text-xs font-bold">
                <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] {step === 1 ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'}">
                    {step === 1 ? '1' : '✓'}
                </span>
                <span class="{step === 1 ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}">Prüfung Vollzahlung</span>
                <span class="text-slate-300 dark:text-slate-700">→</span>
                <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] {step === 2 ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}">
                    2
                </span>
                <span class="{step === 2 ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}">Kürzungsentscheidung</span>
            </div>
            {#if step === 2}
                <button 
                    type="button" 
                    onclick={() => step = 1} 
                    disabled={isSubmitting}
                    class="min-h-11 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-1 transition-colors cursor-pointer touch-manipulation"
                >
                    <ArrowLeft class="w-3.5 h-3.5" /> Zurück
                </button>
            {/if}
        </div>

        <div class="p-6 flex-1 space-y-4">
            {#if step === 1}
                <InvoiceSettlementStepFullPayment 
                    {totalGross} 
                    {isSubmitting} 
                    onConfirmFull={handleConfirmFullPayment} 
                    onSwitchPartial={() => { step = 2; if (receivedAmount === totalGross) receivedAmount = 0; }} 
                />
            {:else}
                <InvoiceSettlementStepDecisionTree 
                    {totalGross} 
                    {differenceAmount} 
                    bind:receivedAmount 
                    bind:referenceNr 
                    bind:notes 
                    bind:selectedDecision 
                />
            {/if}
        </div>

        <div class="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 rounded-b-3xl">
            <button 
                type="button" 
                onclick={close} 
                disabled={isSubmitting}
                class="min-h-11 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer touch-manipulation"
            >
                Abbrechen
            </button>
            {#if step === 2}
                <button 
                    type="button" 
                    onclick={handleExecuteDecision} 
                    disabled={isSubmitting}
                    class="min-h-11 px-5 py-2 text-sm font-medium rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-600/25 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 touch-manipulation"
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
