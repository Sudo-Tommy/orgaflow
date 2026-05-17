<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let startDate = $state("");
    let endDate = $state("");
    let description = $state("Wochenende / Geschlossen");
    let days = $state([false, false, false, false, false, true, true]); // Mo-So (Standard: Sa, So)
    const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

    export function open() {
        const now = new Date();
        startDate = now.toISOString().split('T')[0];
        const end = new Date();
        end.setMonth(end.getMonth() + 3); // Standardmäßig 3 Monate vorausgewählt
        endDate = end.toISOString().split('T')[0];
        
        errorMsg = "";
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        
        if (!startDate || !endDate) {
            errorMsg = "Bitte Start- und Enddatum wählen.";
            return;
        }
        
        const [sy, sm, sd] = startDate.split('-').map(Number);
        const start = new Date(sy, sm - 1, sd, 12, 0, 0); 
        
        const [ey, em, ed] = endDate.split('-').map(Number);
        const end = new Date(ey, em - 1, ed, 23, 59, 59);

        if (start > end) {
            errorMsg = "Das Enddatum muss nach dem Startdatum liegen.";
            return;
        }
        if (!days.some(d => d)) {
            errorMsg = "Bitte mindestens einen Wochentag auswählen.";
            return;
        }

        isLoading = true;
        errorMsg = "";

        try {
            let current = new Date(start);
            const promises = [];

            // Schleife durch alle Tage im ausgewählten Zeitraum
            while (current <= end) {
                const dayIdx = current.getDay() === 0 ? 6 : current.getDay() - 1;
                if (days[dayIdx]) {
                    promises.push(pb.collection('appointments').create({
                        appointment: current.toISOString(),
                        description: `[BLOCK] ${description.trim() || 'Gesperrt'}`,
                        is_private: false,
                        user: pb.authStore.model?.id,
                        client: []
                    }, { requestKey: null }));
                }
                current.setDate(current.getDate() + 1);
            }

            // In kleinen Blöcken (Chunks) senden, um die Datenbank nicht zu überlasten
            const chunkSize = 20;
            for (let i = 0; i < promises.length; i += chunkSize) {
                await Promise.all(promises.slice(i, i + chunkSize));
            }

            toastStore.success(`Erfolgreich ${promises.length} Tage blockiert!`);
            
            // Kalender im Hintergrund neu laden
            if (orgaStore.appointments) {
                await orgaStore.appointments.init();
            }

            close();
        } catch(err: any) {
            console.error(err);
            errorMsg = "Fehler beim Erstellen der Sperren. " + (err.message || "");
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-5 sm:p-6 md:p-8 w-full relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-4 right-4 sm:top-5 sm:right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 mb-2 flex items-center gap-2 pr-10">
            <span class="w-8 h-8 flex items-center justify-center bg-rose-100 text-rose-600 rounded-lg shadow-inner text-sm">🚫</span> Serien-Sperre
        </h2>
        <p class="text-sm text-neutral-500 mb-6">Sperren Sie bequem ganze Zeiträume, z.B. Wochenenden oder Urlaube.</p>

        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}
        
        <form onsubmit={onSubmit} class="space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="bulk-start" class="block text-sm font-semibold text-neutral-700 mb-1.5">Startdatum</label>
                    <input id="bulk-start" type="date" bind:value={startDate} class="orga-input-clear py-3 sm:py-2.5" disabled={isLoading} required />
                </div>
                <div>
                    <label for="bulk-end" class="block text-sm font-semibold text-neutral-700 mb-1.5">Enddatum</label>
                    <input id="bulk-end" type="date" bind:value={endDate} class="orga-input-clear py-3 sm:py-2.5" disabled={isLoading} required />
                </div>
            </div>

            <div>
                <span class="block text-sm font-semibold text-neutral-700 mb-2">An welchen Wochentagen?</span>
                <div class="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {#each dayNames as day, i}
                        <label class="flex flex-col items-center justify-center p-2 sm:py-3 rounded-xl border-2 cursor-pointer transition-colors shadow-sm {days[i] ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-rose-200 hover:bg-rose-50/50'}">
                            <input type="checkbox" bind:checked={days[i]} class="sr-only" disabled={isLoading} />
                            <span class="text-xs font-bold">{day}</span>
                        </label>
                    {/each}
                </div>
            </div>

            <div>
                <label for="bulk-desc" class="block text-sm font-semibold text-neutral-700 mb-1.5">Beschreibung / Grund</label>
                <input id="bulk-desc" type="text" bind:value={description} class="orga-input-clear py-3 sm:py-2.5" placeholder="z.B. Wochenende / Urlaub" disabled={isLoading} required />
            </div>

            <div class="mt-4 p-3.5 bg-rose-50 rounded-xl border border-rose-100 text-xs text-rose-700 flex gap-2.5 items-start shadow-sm">
                <span class="text-lg leading-none mt-0.5">⚠️</span>
                <p class="leading-relaxed">Diese Aktion legt für jeden ausgewählten Tag einen eigenständigen Blocker-Termin an. Bei großen Zeiträumen kann dies wenige Sekunden dauern.</p>
            </div>

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                <button type="submit" class="orga-button-primary bg-rose-600 hover:bg-rose-700 shadow-rose-600/30 w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Erstellt Sperren..." : "Tage sperren"}</button>
            </div>
        </form>
    </div>
</dialog>
