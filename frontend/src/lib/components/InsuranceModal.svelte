<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { autoGrow } from "$lib/actions/autoGrow";
    import InsuranceClientsList from "./insurance/InsuranceClientsList.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let editId = $state<string | null>(null);
    let name = $state("");
    let type = $state("GKV (Gesetzlich)");
    let email = $state("");
    let phone = $state("");
    let street = $state("");
    let zip = $state("");
    let city = $state("");
    let addition = $state("");
    let notes = $state("");
    let initialDataHash = $state("");

    let linkedClients = $derived.by(() => {
        if (!editId) return [];
        const allClients = orgaStore.clients?.data || [];
        return allClients.filter((c: any) => {
            const insId = typeof c.insurance === 'string' ? c.insurance : (c.insurance?.id || c.expand?.insurance?.id);
            return insId === editId;
        });
    });

    export function open(record?: any) {
        if (record) {
            editId = record.id;
            name = record.name || "";
            type = record.type || "GKV (Gesetzlich)";
            email = record.email || "";
            phone = record.phone || "";
            street = record.street || "";
            zip = record.zip || "";
            city = record.city || "";
            addition = record.addition || "";
            notes = typeof record.notes === 'string' ? record.notes.replace(/<[^>]*>?/gm, '') : "";
        } else {
            editId = null;
            name = "";
            type = "GKV (Gesetzlich)";
            email = "";
            phone = "";
            street = "";
            zip = "";
            city = "";
            addition = "";
            notes = "";
        }
        errorMsg = "";
        initialDataHash = JSON.stringify({ name, type, email, phone, street, zip, city, addition, notes });
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    export async function attemptClose() {
        const currentData = JSON.stringify({ name, type, email, phone, street, zip, city, addition, notes });
        if (currentData !== initialDataHash) {
            const confirmed = await confirmStore.ask("Sie haben ungespeicherte Änderungen. Möchten Sie das Fenster wirklich schließen?", "Änderungen verwerfen?", "Verwerfen", "Weiter bearbeiten", true);
            if (!confirmed) return;
        }
        close();
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";
        try {
            const payload = { name, type, email, phone, street, zip, city, addition, notes };
            if (editId) {
                await pb.collection("insurancies").update(editId, payload);
                toastStore.success("Krankenkasse erfolgreich aktualisiert.");
            } else {
                await pb.collection("insurancies").create(payload);
                toastStore.success("Krankenkasse erfolgreich angelegt.");
            }
            await orgaStore.insurancies?.init();
            close();
        } catch (err: any) {
            errorMsg = err.message || "Fehler beim Speichern der Krankenkasse.";
            toastStore.error("Fehler beim Speichern der Krankenkasse.");
        } finally {
            isLoading = false;
        }
    }

    async function onDelete() {
        if (!editId) return;
        if (linkedClients.length > 0) {
            toastStore.error(`Löschen nicht möglich: Diese Krankenkasse ist noch ${linkedClients.length} Klienten zugeordnet.`);
            return;
        }
        const confirmed = await confirmStore.ask(`Möchten Sie die Krankenkasse "${name}" wirklich unwiderruflich löschen?`, "Krankenkasse löschen?", "Löschen", "Abbrechen", true);
        if (!confirmed) return;

        isLoading = true;
        try {
            await pb.collection("insurancies").delete(editId);
            toastStore.success("Krankenkasse gelöscht.");
            await orgaStore.insurancies?.init();
            close();
        } catch (err: any) {
            errorMsg = err.message || "Fehler beim Löschen.";
            toastStore.error("Fehler beim Löschen der Krankenkasse.");
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-xl mx-auto my-6 sm:my-10 rounded-3xl" onclick={(e) => { if (e.target === dialog) attemptClose(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl p-6 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" title="Schließen" onclick={attemptClose} class="absolute top-5 right-5 w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors cursor-pointer">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div class="flex items-center gap-3 mb-6">
            <div class="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center text-2xl shrink-0 border border-teal-200/60 dark:border-teal-800/60 shadow-xs">🛡️</div>
            <div>
                <h2 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{editId ? 'Krankenkasse bearbeiten' : 'Neue Krankenkasse anlegen'}</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">{editId ? 'Stammdaten, Kontaktdaten und Zuordnungen anpassen' : 'Erfassen Sie einen neuen Kostenträger oder eine Krankenkasse'}</p>
            </div>
        </div>

        {#if errorMsg}
            <div class="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 p-4 rounded-xl mb-6 text-sm font-medium border border-red-200 dark:border-red-900/60 flex items-start gap-2.5">
                <span class="text-base leading-none">⚠️</span>
                <span>{errorMsg}</span>
            </div>
        {/if}
        
        <form onsubmit={onSubmit} class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                    <label for="ins-name" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Name der Kasse <span class="text-rose-500">*</span></label>
                    <input id="ins-name" type="text" bind:value={name} placeholder="z. B. Techniker Krankenkasse" class="orga-input-clear" required disabled={isLoading} />
                </div>
                <div>
                    <label for="ins-type" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Versicherungsart</label>
                    <select id="ins-type" bind:value={type} class="orga-input-clear" disabled={isLoading}>
                        <option value="GKV (Gesetzlich)">GKV (Gesetzlich)</option>
                        <option value="PKV (Privat)">PKV (Privat)</option>
                        <option value="Beihilfe">Beihilfe</option>
                        <option value="Sozialamt">Sozialamt</option>
                        <option value="Berufsgenossenschaft">Berufsgenossenschaft</option>
                        <option value="Selbstzahler">Selbstzahler</option>
                    </select>
                </div>
                <div>
                    <label for="ins-addition" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Zusatzbezeichnung</label>
                    <input id="ins-addition" type="text" bind:value={addition} placeholder="z. B. Pflegekasse, Regionaldirektion..." class="orga-input-clear" disabled={isLoading} />
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                    <label for="ins-email" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">E-Mail</label>
                    <input id="ins-email" type="email" bind:value={email} placeholder="abrechnung@kasse.de" class="orga-input-clear" disabled={isLoading} />
                </div>
                <div>
                    <label for="ins-phone" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Telefon</label>
                    <input id="ins-phone" type="text" bind:value={phone} placeholder="0800 1234567" class="orga-input-clear" disabled={isLoading} />
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div class="md:col-span-2">
                    <label for="ins-street" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Straße & Hausnr.</label>
                    <input id="ins-street" type="text" bind:value={street} placeholder="Musterstraße 10" class="orga-input-clear" disabled={isLoading} />
                </div>
                <div>
                    <label for="ins-zip" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">PLZ</label>
                    <input id="ins-zip" type="text" bind:value={zip} placeholder="12345" class="orga-input-clear" disabled={isLoading} />
                </div>
                <div>
                    <label for="ins-city" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Stadt</label>
                    <input id="ins-city" type="text" bind:value={city} placeholder="Musterstadt" class="orga-input-clear" disabled={isLoading} />
                </div>
            </div>

            {#if street || city}
                <div class="flex justify-end pt-1">
                    <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${name || ''}, ${street || ''}, ${zip || ''} ${city || ''}`)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800/80 shadow-2xs">
                        <span>🗺️</span> Auf Google Maps ansehen
                    </a>
                </div>
            {/if}
            
            <div class="pt-2">
                <label for="ins-notes" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Interne Notizen & Hinweise</label>
                <textarea use:autoGrow id="ins-notes" bind:value={notes} placeholder="Ansprechpartner, IK-Nummern, Abrechnungskennzeichen..." class="auto-grow orga-input-clear py-2.5 text-sm resize-none overflow-hidden min-h-16" rows="2" disabled={isLoading}></textarea>
            </div>

            {#if editId}
                <InsuranceClientsList {linkedClients} />
            {/if}

            <div class="pt-4 flex flex-col sm:flex-row justify-between items-center border-t border-slate-100 dark:border-slate-800 mt-6 gap-3">
                {#if editId}
                    <button type="button" onclick={onDelete} class="w-full sm:w-auto py-2.5 px-4 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:text-rose-700 rounded-xl transition-colors cursor-pointer border border-rose-200/60 dark:border-rose-900/60" disabled={isLoading}>Krankenkasse löschen</button>
                {:else}
                    <div class="hidden sm:block"></div>
                {/if}
                <div class="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
                    <button type="button" onclick={attemptClose} class="orga-button-ghost w-full sm:w-auto py-2.5 px-4" disabled={isLoading}>Abbrechen</button>
                    <button type="submit" class="orga-button-primary w-full sm:w-auto py-2.5 px-5" disabled={isLoading}>{isLoading ? "Speichert..." : "Speichern"}</button>
                </div>
            </div>
        </form>
    </div>
</dialog>