<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    // @ts-ignore
    import type { ContactRecord } from "$lib/types/pocketbase-types";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    let { client } = $props<{ client: any }>();

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");
    let searchQuery = $state("");
    
    let contacts = $state<string[]>([]);
    let contact_relations = $state<Record<string, string>>({});

    export function open() {
        contacts = Array.isArray(client?.contacts) ? [...client.contacts] : (client?.contacts ? [client.contacts] : []);
        contact_relations = {};
        if (client?.contact_relations) {
            for (const [k, v] of Object.entries(client.contact_relations)) {
                contact_relations[k] = typeof v === 'string' ? v : (v as any)?.relation || 'Angehörige/r';
            }
        }
        errorMsg = "";
        try {
            if (!dialog?.open) dialog?.showModal();
        } catch (e) {}
    }

    export function close() {
        try {
            if (dialog?.open) dialog.close();
        } catch (e) {}
    }

    function toggleContact(id: string, defaultRelation?: string) {
        if (contacts.includes(id)) {
            contacts = contacts.filter(cId => cId !== id);
        } else {
            contacts = [...contacts, id];
            if (!contact_relations[id]) {
                contact_relations[id] = defaultRelation || "Tochter";
            }
        }
    }

    // Gefilterte Kontakte basierend auf der Suchanfrage
    let filteredContacts: ContactRecord[] = $derived.by(() => {
        const allContacts = orgaStore.contacts?.data || [];
        if (!searchQuery) {
            return allContacts;
        }
        const lowerCaseQuery = searchQuery.toLowerCase();
        return allContacts.filter(c => 
            (c.name_first && c.name_first.toLowerCase().includes(lowerCaseQuery)) ||
            (c.name_last && c.name_last.toLowerCase().includes(lowerCaseQuery)) ||
            (c.company_name && c.company_name.toLowerCase().includes(lowerCaseQuery))
        ) as ContactRecord[];
    });

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            // Aufbereiten von contact_relations für ausgewählte Kontakte
            const cleanRelations: Record<string, any> = {};
            const existingRels = client?.contact_relations || {};
            for (const cId of contacts) {
                const prev = existingRels[cId];
                const relStr = contact_relations[cId] || (typeof prev === 'string' ? prev : prev?.relation) || "Angehörige/r";
                if (typeof prev === 'object' && prev !== null) {
                    cleanRelations[cId] = { ...prev, relation: relStr };
                } else {
                    cleanRelations[cId] = { relation: relStr };
                }
            }

            await pb.collection('clients').update(client.id, { 
                contacts,
                contact_relations: cleanRelations
            });
            
            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(client.id, { 
                    expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', 
                    requestKey: null 
                }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 300);
            
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

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-neutral-900 mb-2">Bezugspersonen verknüpfen</h2>
        <p class="text-xs text-neutral-500 mb-6">Wählen Sie Kontakte aus und bestimmen Sie, in welcher Beziehung sie zum Klienten stehen.</p>
        
        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}
        
        <form onsubmit={onSubmit} class="space-y-5">
            <input type="text" bind:value={searchQuery} placeholder="Kontakte suchen..." class="orga-input-clear" />
            
            <div class="border border-neutral-200 rounded-xl max-h-72 overflow-y-auto custom-scrollbar p-2 bg-white space-y-2">
                {#each filteredContacts as c}
                    {@const isChecked = contacts.includes(c.id)}
                    <div class="p-2.5 hover:bg-neutral-50 rounded-xl transition-colors border {isChecked ? 'border-indigo-200 bg-indigo-50/20' : 'border-neutral-100'}">
                        <label class="flex items-center gap-3 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onchange={() => toggleContact(c.id, c.company_name)} 
                                class="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500" 
                                disabled={isLoading} 
                            />
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-neutral-900">{c.name_first} {c.name_last}</p>
                                {#if c.company_name}<p class="text-xs text-neutral-500">{c.company_name}</p>{/if}
                            </div>
                        </label>

                        {#if isChecked}
                            <div class="mt-2.5 pl-7 flex items-center gap-2">
                                <label for="rel-select-{c.id}" class="text-[11px] font-bold text-indigo-800 shrink-0">Beziehung:</label>
                                <select 
                                    id="rel-select-{c.id}"
                                    bind:value={contact_relations[c.id]} 
                                    class="text-xs bg-white border border-indigo-200 rounded-lg px-2.5 py-1 text-indigo-900 font-semibold focus:ring-indigo-500 w-full"
                                >
                                    <option value="Tochter">Tochter</option>
                                    <option value="Sohn">Sohn</option>
                                    <option value="Ehepartner/in">Ehepartner/in</option>
                                    <option value="Mutter">Mutter</option>
                                    <option value="Vater">Vater</option>
                                    <option value="Enkel/in">Enkel/in</option>
                                    <option value="Schwiegertochter">Schwiegertochter</option>
                                    <option value="Schwiegersohn">Schwiegersohn</option>
                                    <option value="Geschwister">Geschwister</option>
                                    <option value="Pflegeperson">Pflegeperson</option>
                                    <option value="Nachbar/in">Nachbar/in</option>
                                    <option value="Freund/in">Freund/in</option>
                                    <option value="Gesetzliche/r Betreuer/in">Gesetzliche/r Betreuer/in</option>
                                    <option value="Bevollmächtigte/r">Bevollmächtigte/r</option>
                                    <option value="Hausarzt / Hausärztin">Hausarzt / Hausärztin</option>
                                    <option value="Facharzt / Fachärztin">Facharzt / Fachärztin</option>
                                    <option value="Pflegedienst">Pflegedienst</option>
                                    <option value="Sonstiges">Sonstiges</option>
                                </select>
                            </div>
                        {/if}
                    </div>
                {/each}
                {#if filteredContacts.length === 0}<p class="text-sm text-neutral-500 p-3 italic text-center">Keine Kontakte gefunden.</p>{/if}
            </div>

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : "Verknüpfen"}</button>
            </div>
        </form>
    </div>
</dialog>