<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    let { client } = $props<{ client: any }>();

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");
    
    let contacts = $state<string[]>([]);

    export function open() {
        contacts = Array.isArray(client?.contacts) ? client.contacts : (client?.contacts ? [client.contacts] : []);
        errorMsg = "";
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
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
            await pb.collection('clients').update(client.id, { contacts });
            
            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(client.id, { expand: 'insurance,retirement_homes,contacts', requestKey: null }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 400);
            
            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Verknüpfen der Kontakte.";
            if (err.response?.data) {
                const details = Object.entries(err.response.data).map(([k, v]: any) => `${k}: ${v.message}`).join(", ");
                if (details) errorMsg += ` (${details})`;
            }
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-md mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-neutral-900 mb-6">Bezugspersonen verknüpfen</h2>
        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}
        <form onsubmit={onSubmit} class="space-y-4">
            <div class="border border-neutral-200 rounded-xl max-h-64 overflow-y-auto custom-scrollbar p-1 bg-white">
                {#each orgaStore.contacts?.data || [] as c}
                    <label class="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-lg cursor-pointer transition-colors">
                        <input type="checkbox" checked={contacts.includes(c.id)} onchange={() => toggleContact(c.id)} class="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500" disabled={isLoading} />
                        <div>
                            <p class="text-sm font-bold text-neutral-900">{c.name_first} {c.name_last}</p>
                            {#if c.company_name}<p class="text-xs text-neutral-500">{c.company_name}</p>{/if}
                        </div>
                    </label>
                {/each}
                {#if (orgaStore.contacts?.data || []).length === 0}<p class="text-sm text-neutral-500 p-3 italic">Keine Kontakte im System vorhanden.</p>{/if}
            </div>
            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : "Verknüpfen"}</button>
            </div>
        </form>
    </div>
</dialog>