<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let editId = $state<string | null>(null);
    let name = $state("");
    let phone = $state("");
    let email = $state("");
    let contacts = $state<string[]>([]);
    let initialDataHash = $state("");

    export function open(record?: any) {
        if (record) {
            editId = record.id;
            name = record.name || "";
            phone = record.phone || "";
            email = record.email || "";
            contacts = Array.isArray(record.contacts) ? record.contacts : (record.contacts ? [record.contacts] : []);
        } else {
            editId = null;
            name = "";
            phone = "";
            email = "";
            contacts = [];
        }
        errorMsg = "";
        initialDataHash = JSON.stringify({ name, phone, email, contacts });
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    export async function attemptClose() {
        if (JSON.stringify({ name, phone, email, contacts }) !== initialDataHash) {
            if (!(await confirmStore.ask("Sie haben ungespeicherte Änderungen. Möchten Sie wirklich abbrechen?", "Änderungen verwerfen?", "Verwerfen", "Abbrechen", true))) return;
        }
        close();
    }

    function toggleContact(id: string) {
        if (contacts.includes(id)) {
            contacts = contacts.filter(cId => cId !== id);
        } else {
            contacts = [...contacts, id];
        }
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            const data = { name, phone, email, contacts };
            if (editId) {
                await pb.collection('retirement_homes').update(editId, data);
            } else {
                await pb.collection('retirement_homes').create(data);
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
        if (!editId || !(await confirmStore.ask("Möchten Sie dieses Pflegeheim wirklich löschen?", "Pflegeheim löschen?", "Löschen", "Abbrechen", true))) return;
        isLoading = true;
        try {
            await pb.collection('retirement_homes').delete(editId);
            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Löschen.";
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) attemptClose(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative">
        <button aria-label="Schließen" title="Schließen" onclick={attemptClose} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-neutral-900 mb-6">{editId ? 'Pflegeheim bearbeiten' : 'Neues Pflegeheim anlegen'}</h2>
        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}
        
        <form onsubmit={onSubmit} class="space-y-4">
            <div><label for="home-name" class="block text-sm font-semibold text-neutral-700 mb-1.5">Name der Einrichtung</label><input id="home-name" type="text" bind:value={name} class="orga-input-clear" required disabled={isLoading} /></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label for="home-email" class="block text-sm font-semibold text-neutral-700 mb-1.5">E-Mail</label><input id="home-email" type="email" bind:value={email} class="orga-input-clear" disabled={isLoading} /></div>
                <div><label for="home-phone" class="block text-sm font-semibold text-neutral-700 mb-1.5">Telefon</label><input id="home-phone" type="text" bind:value={phone} class="orga-input-clear" disabled={isLoading} /></div>
            </div>
            
            <div class="pt-2">
                <span class="block text-sm font-semibold text-neutral-700 mb-2">Ansprechpartner vor Ort</span>
                <div class="border border-neutral-200 rounded-xl max-h-48 overflow-y-auto custom-scrollbar p-1">
                    {#each orgaStore.contacts?.data || [] as c}
                        <label class="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-lg cursor-pointer transition-colors"><input type="checkbox" checked={contacts.includes(c.id)} onchange={() => toggleContact(c.id)} class="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500" /><div><p class="text-sm font-bold text-neutral-900">{c.name_first} {c.name_last}</p>{#if c.company_name}<p class="text-xs text-neutral-500">{c.company_name}</p>{/if}</div></label>
                    {/each}
                    {#if (orgaStore.contacts?.data || []).length === 0}<p class="text-sm text-neutral-500 p-3 italic">Keine Kontakte im System vorhanden.</p>{/if}
                </div>
            </div>
            
            <div class="pt-4 flex flex-col sm:flex-row justify-between items-center border-t border-neutral-100 mt-6 gap-3">
                {#if editId}
                    <button type="button" onclick={onDelete} class="w-full sm:w-auto py-3 sm:py-2.5 text-sm font-bold text-red-500 bg-red-50 sm:bg-transparent hover:bg-red-100 sm:hover:bg-transparent hover:text-red-700 rounded-lg sm:rounded-none transition-colors" disabled={isLoading}>Löschen</button>
                {:else}
                    <div class="hidden sm:block"></div>
                {/if}
                <div class="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
                    <button type="button" onclick={attemptClose} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                    <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : "Speichern"}</button>
                </div>
            </div>
        </form>
    </div>
</dialog>