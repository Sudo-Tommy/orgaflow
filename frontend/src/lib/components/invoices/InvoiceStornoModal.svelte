<script lang="ts">
    import { autoGrow } from "$lib/actions/autoGrow";

    interface Props {
        show: boolean;
        invoice: any;
        stornoReason: string;
        stornoNote: string;
        isCreatingStorno: boolean;
        onClose: () => void;
        onExecute: () => Promise<void>;
    }

    let {
        show = $bindable(),
        invoice,
        stornoReason = $bindable(),
        stornoNote = $bindable(),
        isCreatingStorno,
        onClose,
        onExecute
    }: Props = $props();

    let dialog = $state<HTMLDialogElement>();

    $effect(() => {
        if (show && dialog && !dialog.open) {
            dialog.showModal();
        } else if (!show && dialog && dialog.open) {
            dialog.close();
        }
    });

    function formatCurrency(amount: number | null | undefined) {
        return (amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-xs w-full max-w-lg mx-auto my-auto rounded-3xl outline-none border-none shadow-2xl"
    onclick={(e) => { if (e.target === dialog && !isCreatingStorno) onClose(); }}
    oncancel={(e) => { e.preventDefault(); if (!isCreatingStorno) onClose(); }}
>
    {#if show && invoice}
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-rose-200 dark:border-rose-900/60 animate-enter text-slate-900 dark:text-slate-100">
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl shrink-0">⚠️</div>
                <div>
                    <h3 class="font-black text-lg text-slate-900 dark:text-slate-100">Rechnungskorrektur erstellen (GoBD)</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Rechnung {invoice.invoice_nr} wird storniert und eine Gutschrift erzeugt.</p>
                </div>
            </div>

            <div class="space-y-4 text-xs">
                <div>
                    <label for="storno-reason" class="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Stornogrund (Pflichtangabe)</label>
                    <select id="storno-reason" bind:value={stornoReason} class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-semibold text-slate-800 dark:text-slate-100">
                        <option>Rechnungsfehler / Korrektur von Positionen</option>
                        <option>Falsche Klienten- oder Kassenanschrift</option>
                        <option>Kundenstorno / Kulanzregelung</option>
                        <option>Doppelte Rechnungsstellung</option>
                        <option>Sonstige Korrektur</option>
                    </select>
                </div>

                <div>
                    <label for="storno-note" class="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Ergänzende Begründung</label>
                    <textarea 
                        use:autoGrow
                        id="storno-note"
                        rows="2" 
                        bind:value={stornoNote} 
                        placeholder="Details zur Stornierung für das Finanzamt..."
                        class="auto-grow w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none overflow-hidden min-h-16"
                    ></textarea>
                </div>

                <div class="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 space-y-1">
                    <p class="font-bold">GoBD-Hinweis:</p>
                    <p class="text-[11px] leading-relaxed">
                        Es wird eine neue Stornorechnung (SR-...) mit negativem Vorzeichen (-{formatCurrency(invoice.brutto)}) angelegt. Die Buchhaltung wird exakt ausgeglichen und beide Belege bleiben revisionssicher erhalten.
                    </p>
                </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-2">
                <button 
                    type="button" 
                    onclick={onClose}
                    class="orga-button-ghost py-2.5 px-4 text-xs font-bold cursor-pointer"
                    disabled={isCreatingStorno}
                >
                    Abbrechen
                </button>
                <button 
                    type="button" 
                    onclick={onExecute}
                    class="bg-rose-600 hover:bg-rose-700 text-white py-2.5 px-5 rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-2 cursor-pointer"
                    disabled={isCreatingStorno}
                >
                    <span>{isCreatingStorno ? 'Erstelle Stornorechnung...' : 'Storno verbindlich buchen'}</span>
                </button>
            </div>
        </div>
    {/if}
</dialog>
