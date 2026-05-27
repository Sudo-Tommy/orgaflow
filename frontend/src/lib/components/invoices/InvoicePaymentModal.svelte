<script lang="ts">
    import { X, Check } from "lucide-svelte";
    
    let dialog: HTMLDialogElement | undefined = $state();
    let paymentDate = $state("");
    let invoiceId = $state("");
    let onConfirm: ((id: string, date: string) => void) | null = null;
    
    export function open(id: string, callback: (id: string, date: string) => void, existingDate?: string | null) {
        invoiceId = id;
        onConfirm = callback;
        if (existingDate) {
            paymentDate = new Date(existingDate).toISOString().split('T')[0];
        } else {
            paymentDate = new Date().toISOString().split('T')[0]; // Heute standardmäßig
        }
        dialog?.showModal();
    }
    
    export function close() {
        dialog?.close();
    }
    
    function submit(e: Event) {
        e.preventDefault();
        if (onConfirm && paymentDate) {
            // Datum wieder in einen validen ISO-String inklusive korrekter Zeitzone umwandeln
            const d = new Date(paymentDate);
            d.setHours(12, 0, 0, 0); // Mittagszeit setzen, um UTC-Verschiebungen zu vermeiden
            onConfirm(invoiceId, d.toISOString());
            close();
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-sm mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <X class="w-5 h-5" />
        </button>
        
        <h2 class="text-xl font-bold text-neutral-900 mb-2 flex items-center gap-2"><span>💶</span> Zahlungseingang</h2>
        <p class="text-sm text-neutral-500 mb-6">Wann wurde die Rechnung bezahlt?</p>

        <form onsubmit={submit} class="space-y-4">
            <div>
                <label for="paid-date" class="block text-sm font-semibold text-neutral-700 mb-1.5">Zahlungsdatum</label>
                <input id="paid-date" type="date" bind:value={paymentDate} class="orga-input-clear py-3 sm:py-2.5 text-sm" required />
            </div>

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5 px-4">Abbrechen</button>
                <button type="submit" class="orga-button-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 w-full sm:w-auto py-3 sm:py-2.5 px-6 flex items-center justify-center gap-2">
                    <Check class="w-4 h-4" /> Speichern
                </button>
            </div>
        </form>
    </div>
</dialog>