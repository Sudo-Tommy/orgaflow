<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { confirmStore } from "$lib/services/confirmService.svelte";

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
            // Notes kommt aus einem Editor-Feld als HTML, wir bereinigen es für ein einfaches Textfeld
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
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            const data = { name, type, email, phone, street, zip, city, addition, notes };
            if (editId) {
                await pb.collection('insurancies').update(editId, data);
            } else {
                await pb.collection('insurancies').create(data);
            }
            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Speichern.";
            if (err.response?.data) {
                const details = Object.entries(err.response.data).map(([k, v]: any) => `${k}: ${v.message}`).join(", ");
                if (details) errorMsg += ` (${details})`;
            }
        } finally {
            isLoading = false;
        }
    }
    
    async function onDelete() {
        if (!editId || !(await confirmStore.ask("Möchten Sie diese Krankenkasse wirklich löschen?", "Krankenkasse löschen?", "Löschen", "Abbrechen", true))) return;
        isLoading = true;
        try {
            await pb.collection('insurancies').delete(editId);
            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Löschen.";
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-neutral-900 mb-6">{editId ? 'Krankenkasse bearbeiten' : 'Neue Krankenkasse anlegen'}</h2>
        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}
        
        <form onsubmit={onSubmit} class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2"><label for="ins-name" class="block text-sm font-semibold text-neutral-700 mb-1.5">Name der Kasse</label><input id="ins-name" type="text" bind:value={name} class="orga-input-clear" required disabled={isLoading} /></div>
                <div><label for="ins-type" class="block text-sm font-semibold text-neutral-700 mb-1.5">Versicherungsart</label><select id="ins-type" bind:value={type} class="orga-input-clear" disabled={isLoading}><option value="GKV (Gesetzlich)">GKV (Gesetzlich)</option><option value="PKV (Privat)">PKV (Privat)</option><option value="Beihilfe">Beihilfe</option><option value="Berufsgenossenschaft">Berufsgenossenschaft</option></select></div>
                <div><label for="ins-extra" class="block text-sm font-semibold text-neutral-700 mb-1.5">Abt. / Zusatz (optional)</label><input id="ins-extra" type="text" bind:value={addition} class="orga-input-clear" disabled={isLoading} /></div>
                <div><label for="ins-email" class="block text-sm font-semibold text-neutral-700 mb-1.5">E-Mail</label><input id="ins-email" type="email" bind:value={email} class="orga-input-clear" disabled={isLoading} /></div>
                <div><label for="ins-phone" class="block text-sm font-semibold text-neutral-700 mb-1.5">Telefon</label><input id="ins-phone" type="text" bind:value={phone} class="orga-input-clear" disabled={isLoading} /></div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div class="md:col-span-2"><label for="ins-street" class="block text-sm font-semibold text-neutral-700 mb-1.5">Straße & Hausnr.</label><input id="ins-street" type="text" bind:value={street} class="orga-input-clear" disabled={isLoading} /></div>
                <div><label for="ins-zip" class="block text-sm font-semibold text-neutral-700 mb-1.5">PLZ</label><input id="ins-zip" type="text" bind:value={zip} class="orga-input-clear" disabled={isLoading} /></div>
                <div><label for="ins-city" class="block text-sm font-semibold text-neutral-700 mb-1.5">Stadt</label><input id="ins-city" type="text" bind:value={city} class="orga-input-clear" disabled={isLoading} /></div>
            </div>
            {#if street || city}
                <div class="flex justify-end mt-1">
                    <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${name || ''}, ${street || ''}, ${zip || ''} ${city || ''}`)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors border border-blue-200 shadow-sm">
                        <span>🗺️</span> Auf Karte prüfen
                    </a>
                </div>
            {/if}
            
            <div class="pt-2"><label for="ins-notes" class="block text-sm font-semibold text-neutral-700 mb-1.5">Notizen</label><textarea id="ins-notes" bind:value={notes} class="orga-input-clear resize-none py-3 sm:py-2" rows="2" disabled={isLoading}></textarea></div>
            <div class="pt-4 flex flex-col sm:flex-row justify-between items-center border-t border-neutral-100 mt-6 gap-3">
                {#if editId}
                    <button type="button" onclick={onDelete} class="w-full sm:w-auto py-3 sm:py-2.5 text-sm font-bold text-red-500 bg-red-50 sm:bg-transparent hover:bg-red-100 sm:hover:bg-transparent hover:text-red-700 rounded-lg sm:rounded-none transition-colors" disabled={isLoading}>Löschen</button>
                {:else}
                    <div class="hidden sm:block"></div>
                {/if}
                <div class="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
                    <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                    <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : "Speichern"}</button>
                </div>
            </div>
        </form>
    </div>
</dialog>