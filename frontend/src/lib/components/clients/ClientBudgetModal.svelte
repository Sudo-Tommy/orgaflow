<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { X, Save } from "lucide-svelte";

    let { usedGemeinsamerJahresbetrag, usedEntlastungsleistungen } = $props<{ usedGemeinsamerJahresbetrag: number, usedEntlastungsleistungen: number }>();

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");
    let client = $state<any>(null);

    // Wir verwenden einen String für die Anzeige, um Kommas zu erlauben
    let displayBudget = $state("0,00");

    export function open(clientData: any) {
        client = clientData;
        if (client) {
            const budgetValue = client.restbudget_vorjahr ?? 0; // Hier immer den DB-Wert anzeigen
            displayBudget = budgetValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        errorMsg = "";
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        if (!client) {
            errorMsg = "Kein Klient ausgewählt.";
            isLoading = false;
            return;
        }

        try {
            // Konvertiere den deutschen String (z.B. "1.234,56") in eine Zahl (1234.56)
            // Behandelt auch leere Eingaben als 0
            const cleanString = displayBudget.trim();
            const numericValue = cleanString === "" ? 0 : parseFloat(cleanString.replace(/\./g, '').replace(',', '.'));

            if (isNaN(numericValue)) {
                throw new Error("Ungültiger Betrag. Bitte geben Sie eine gültige Zahl ein.");
            }

            const payload = {
                restbudget_vorjahr: numericValue
            };

            await pb.collection('clients').update(client.id, payload, { requestKey: null });

            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(client.id, { expand: 'insurance,retirement_homes,contacts,caregiver', requestKey: null }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 400);

            toastStore.success("Budget erfolgreich gespeichert.");
            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Speichern des Budgets.";
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-md mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <X class="w-5 h-5" />
        </button>
        <h2 class="text-2xl font-bold text-neutral-900 mb-6">Budget verwalten</h2>
        
        {#if errorMsg}
            <div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>
        {/if}

        <div class="space-y-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100 mb-6">
            <div>
                <p class="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Genutzter Gemeinsamer Jahresbetrag</p>
                <p class="text-sm font-bold text-neutral-900">{(usedGemeinsamerJahresbetrag ?? 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
            </div>
             <div>
                <p class="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Genutzte Entlastungsleistungen</p>
                <p class="text-sm font-bold text-neutral-900">{(usedEntlastungsleistungen ?? 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
            </div>
            <p class="text-xs text-neutral-400 pt-2 border-t border-neutral-200">
                Diese Werte werden automatisch aus Rechnungen und offenen Terminen berechnet und sind hier nicht änderbar.
            </p>
        </div>

        <form onsubmit={handleSubmit} class="space-y-6">
            <div>
                <label for="restbudget_vorjahr" class="block text-sm font-semibold text-neutral-700 mb-1.5">Restbudget Vorjahr (€)</label>
                <input id="restbudget_vorjahr" type="text" inputmode="decimal" bind:value={displayBudget} class="orga-input-clear" disabled={isLoading} placeholder="z.B. 150,00" onfocus={(e) => (e.target as HTMLInputElement).select()} />
                <p class="text-xs text-neutral-500 mt-2">Trage hier das übertragene Budget aus dem Vorjahr ein. Beachte: Dieses Budget verfällt automatisch nach dem 30. Juni des laufenden Jahres.</p>
            </div>

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>
                    <Save class="w-4 h-4 mr-2" /> {isLoading ? "Speichert..." : "Speichern"}
                </button>
            </div>
        </form>
    </div>
</dialog>