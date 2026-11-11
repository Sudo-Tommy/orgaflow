<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { X, Save, PiggyBank } from "lucide-svelte";

    let { usedGemeinsamerJahresbetrag, usedEntlastungsleistungen } = $props<{ usedGemeinsamerJahresbetrag: number, usedEntlastungsleistungen: number }>();

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");
    let client = $state<any>(null);

    let displayBudget = $state("0,00");
    let displayAnnualBudget = $state("");

    export function open(clientData: any) {
        client = clientData;
        if (client) {
            const budgetValue = client.restbudget_vorjahr ?? 0;
            displayBudget = budgetValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            const annualValue = client.annual_budget_entlastung;
            if (annualValue != null && Number(annualValue) > 0) {
                displayAnnualBudget = Number(annualValue).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
                displayAnnualBudget = "";
            }
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
            const cleanString = displayBudget.trim();
            const numericValue = cleanString === "" ? 0 : parseFloat(cleanString.replace(/\./g, '').replace(',', '.'));

            if (isNaN(numericValue) || numericValue < 0) {
                throw new Error("Ungültiger Vorjahresbetrag. Bitte eine gültige Zahl eingeben.");
            }

            const cleanAnnual = displayAnnualBudget.trim();
            const annualNumericValue = cleanAnnual === "" ? 0 : parseFloat(cleanAnnual.replace(/\./g, '').replace(',', '.'));

            if (isNaN(annualNumericValue) || annualNumericValue < 0) {
                throw new Error("Ungültiges Jahresbudget. Bitte eine gültige Zahl eingeben.");
            }

            const payload: Record<string, any> = {
                restbudget_vorjahr: numericValue,
                annual_budget_entlastung: annualNumericValue
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

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-md w-full max-w-md mx-auto my-auto rounded-3xl border-none shadow-2xl z-9999" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 rounded-3xl w-full relative shadow-2xl border border-neutral-100 dark:border-slate-800 text-neutral-900 dark:text-slate-100 overflow-hidden">
        <!-- Hero Header -->
        <div class="bg-gradient-to-br from-emerald-600 to-teal-700 px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-white relative overflow-hidden">
            <div class="flex items-center gap-3 relative z-10 min-w-0 pr-10 sm:pr-0">
                <div class="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-lg shrink-0">
                    <PiggyBank class="w-5 h-5" />
                </div>
                <div class="min-w-0">
                    <h2 class="text-base sm:text-xl font-black text-white truncate drop-shadow-sm">Budget verwalten</h2>
                    <p class="text-xs text-emerald-100 font-medium truncate mt-0.5">
                        {client?.name_first || ''} {client?.name_last || ''} · Jahres- & Vorjahresbudget
                    </p>
                </div>
            </div>
            <button
                type="button"
                aria-label="Schließen"
                title="Schließen"
                onclick={close}
                class="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer border border-white/20 shrink-0 z-10"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <div class="p-5 sm:p-6 space-y-5">
            {#if errorMsg}
                <div class="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 p-4 rounded-2xl text-xs font-bold border border-rose-200 dark:border-rose-900">{errorMsg}</div>
            {/if}

            <div class="space-y-3 bg-neutral-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-neutral-200/80 dark:border-slate-700/80 border-l-4 border-l-emerald-500">
                <div class="flex justify-between items-center">
                    <p class="text-[11px] font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider">Genutzter Gemeinsamer Jahresbetrag</p>
                    <p class="text-sm font-black text-neutral-900 dark:text-white">{(usedGemeinsamerJahresbetrag ?? 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-neutral-200/60 dark:border-slate-700/60">
                    <p class="text-[11px] font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider">Genutzte Entlastungsleistungen</p>
                    <p class="text-sm font-black text-neutral-900 dark:text-white">{(usedEntlastungsleistungen ?? 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                </div>
                <p class="text-[10px] text-neutral-400 dark:text-slate-400 pt-2 border-t border-neutral-200 dark:border-slate-700">
                    Diese Werte werden automatisch aus Rechnungen und offenen Terminen berechnet und sind hier nicht änderbar.
                </p>
            </div>

            <form onsubmit={handleSubmit} class="space-y-5">
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label for="annual_budget_entlastung" class="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-slate-300">
                            Verfügbares Jahresbudget (§ 45b) (€)
                        </label>
                        <span class="text-[10px] font-semibold text-neutral-400 dark:text-slate-400">
                            Standard: 1.572,00 €
                        </span>
                    </div>
                    <div class="relative">
                        <input 
                            id="annual_budget_entlastung" 
                            type="text" 
                            inputmode="decimal" 
                            bind:value={displayAnnualBudget} 
                            class="orga-input-clear text-base font-bold dark:bg-slate-800 dark:text-white dark:border-slate-700 pr-10" 
                            disabled={isLoading} 
                            placeholder="z.B. 302,15 (oder leer für Standard)" 
                            onfocus={(e) => (e.target as HTMLInputElement).select()} 
                        />
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400 dark:text-slate-500 pointer-events-none">€</span>
                    </div>
                    <p class="text-[11px] text-neutral-500 dark:text-slate-400 mt-2 leading-relaxed">
                        Hier eintragen, wenn dem Klienten nicht die vollen 1.572 € zur Verfügung stehen (z.B. unterjähriger Beginn oder Vorverbrauch). Leer = 1.572,00 € gesetzlicher Standard.
                    </p>
                </div>

                <div>
                    <label for="restbudget_vorjahr" class="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-slate-300 mb-1.5">
                        Restbudget Vorjahr (€)
                    </label>
                    <div class="relative">
                        <input 
                            id="restbudget_vorjahr" 
                            type="text" 
                            inputmode="decimal" 
                            bind:value={displayBudget} 
                            class="orga-input-clear text-base font-bold dark:bg-slate-800 dark:text-white dark:border-slate-700 pr-10" 
                            disabled={isLoading} 
                            placeholder="z.B. 150,00" 
                            onfocus={(e) => (e.target as HTMLInputElement).select()} 
                        />
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400 dark:text-slate-500 pointer-events-none">€</span>
                    </div>
                    <p class="text-[11px] text-neutral-500 dark:text-slate-400 mt-2 leading-relaxed">
                        Trage hier das übertragene Budget aus dem Vorjahr ein. Beachte: Dieses Budget verfällt gesetzlich nach dem 30. Juni des laufenden Jahres.
                    </p>
                </div>

                <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-2.5 border-t border-neutral-100 dark:border-slate-800">
                    <button type="button" onclick={close} class="orga-button-ghost dark:text-slate-300 dark:hover:bg-slate-800 w-full sm:w-auto py-2.5 px-4 text-xs font-bold cursor-pointer" disabled={isLoading}>Abbrechen</button>
                    <button type="submit" class="orga-button-primary shadow-lg shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-500 w-full sm:w-auto py-2.5 px-5 text-xs font-bold cursor-pointer" disabled={isLoading}>
                        <Save class="w-4 h-4 mr-1.5" /> {isLoading ? "Speichert..." : "Speichern"}
                    </button>
                </div>
            </form>
        </div>
    </div>
</dialog>