<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";
    import { slide } from "svelte/transition";
    import ContactModal from "$lib/components/contacts/ContactModal.svelte";
    import { Scale, Plus } from "lucide-svelte";
    import { sortAlphabetical } from "$lib/utils/sortHelper";
    import InheritorCard from "./inheritor/InheritorCard.svelte";

    let { client } = $props<{ client: any }>();

    let isEditing = $state(false);
    let selectedContactId = $state("");
    let isLoading = $state(false);

    // svelte-ignore non_reactive_update
    let contactModal: any;

    let inheritors = $derived.by(() => {
        if (!client?.expand?.inheritor) return [];
        return Array.isArray(client.expand.inheritor) ? client.expand.inheritor : [client.expand.inheritor];
    });

    let inheritorData = $derived.by(() => {
        const info = client?.inheritor_info || {};
        const name = client?.inheritor_name || info.inheritor_name || (client?.expand?.inheritor ? (Array.isArray(client.expand.inheritor) ? `${client.expand.inheritor[0]?.name_first || ''} ${client.expand.inheritor[0]?.name_last || ''}`.trim() : `${client.expand.inheritor.name_first || ''} ${client.expand.inheritor.name_last || ''}`.trim()) : '');
        const relation = client?.inheritor_relation || info.inheritor_relation || 'Ehepartner/in';
        const phone = client?.inheritor_phone || info.inheritor_phone || (client?.expand?.inheritor ? (Array.isArray(client.expand.inheritor) ? client.expand.inheritor[0]?.phone : client.expand.inheritor.phone) : '');
        const email = client?.inheritor_email || info.inheritor_email || (client?.expand?.inheritor ? (Array.isArray(client.expand.inheritor) ? client.expand.inheritor[0]?.email : client.expand.inheritor.email) : '');
        const hasPowerOfAttorney = client?.inheritor_has_power_of_attorney ?? info.has_power_of_attorney ?? false;
        const notes = client?.inheritor_notes || info.inheritor_notes || '';
        return { name, relation, phone, email, hasPowerOfAttorney, notes };
    });

    let sortedContacts = $derived(
        sortAlphabetical(orgaStore.contacts?.data || [], (c: any) => `${c.name_last || ''} ${c.name_first || ''}`.trim())
    );

    async function linkInheritorAndNetwork(contactId: string) {
        let currentInheritors = client.inheritor || [];
        if (!Array.isArray(currentInheritors)) currentInheritors = currentInheritors ? [currentInheritors] : [];
        if (!currentInheritors.includes(contactId)) {
            currentInheritors = [...currentInheritors, contactId];
        }

        let currentContacts = client.contacts || [];
        if (!Array.isArray(currentContacts)) currentContacts = currentContacts ? [currentContacts] : [];
        if (!currentContacts.includes(contactId)) {
            currentContacts = [...currentContacts, contactId];
        }

        const currentRelations = { ...(client.contact_relations || {}) };
        if (!currentRelations[contactId]) {
            currentRelations[contactId] = 'Pflegeperson';
        }

        await pb.collection('clients').update(client.id, {
            inheritor: currentInheritors,
            contacts: currentContacts,
            contact_relations: currentRelations
        }, { requestKey: null });

        hapticFeedback.success();
        isEditing = false;
        if (orgaStore.clients) await orgaStore.clients.init();
        if (orgaStore.contacts) await orgaStore.contacts.init();
    }

    async function linkExisting() {
        if (!selectedContactId) return;
        isLoading = true;
        hapticFeedback.tap();
        try {
            await linkInheritorAndNetwork(selectedContactId);
            toastStore.success("Pflegeperson erfolgreich verknüpft.");
            selectedContactId = "";
        } catch (err) {
            console.error(err);
            hapticFeedback.error();
            toastStore.error("Fehler beim Verknüpfen.");
        } finally {
            isLoading = false;
        }
    }

    function openCreateInheritorModal() {
        contactModal?.open(null, {
            targetClient: client,
            isInheritorMode: true,
            requireSignature: true,
            onSaved: async (newContact: any) => {
                await linkInheritorAndNetwork(newContact.id);
            }
        });
    }

    async function removeInheritor(contactId: string) {
        isLoading = true;
        hapticFeedback.tap();
        try {
            let currentInheritors = client.inheritor || [];
            if (!Array.isArray(currentInheritors)) currentInheritors = [currentInheritors];

            const updated = currentInheritors.filter((id: string) => id !== contactId);
            await pb.collection('clients').update(client.id, { inheritor: updated }, { requestKey: null });
            hapticFeedback.success();
            toastStore.info("Pflegeperson wurde entfernt.");
            if (orgaStore.clients) await orgaStore.clients.init();
        } catch (err) {
            console.error(err);
            hapticFeedback.error();
            toastStore.error("Fehler beim Entfernen der Pflegeperson.");
        } finally {
            isLoading = false;
        }
    }
</script>

{#if client && (parseInt(client.level_of_care, 10) >= 2 || inheritors.length > 0 || inheritorData.name || client.inheritor_info?.name || client.status === 'Verstorben' || client.status === 'verstorben')}
    <div class="p-6 relative overflow-hidden group border border-neutral-200/80 dark:border-slate-800 border-l-4 border-l-teal-500 bg-white dark:bg-slate-900 rounded-3xl shadow-sm mt-6 animate-enter">
        <div class="space-y-4">
            <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
                        <Scale class="w-5 h-5" />
                    </div>
                    <div>
                        <h4 class="font-bold text-neutral-800 dark:text-slate-100 text-base">Rechtliche Vertretung & Pflegeperson</h4>
                        <p class="text-xs text-neutral-500 dark:text-slate-400">Angehörige, Bevollmächtigte oder Erben</p>
                    </div>
                </div>
                
                {#if !isEditing}
                    <button 
                        type="button" 
                        onclick={() => isEditing = true}
                        class="px-3 py-1.5 min-h-[44px] bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
                    >
                        <Plus class="w-3.5 h-3.5" />
                        <span>Hinzufügen</span>
                    </button>
                {/if}
            </div>

            {#if (inheritorData.name || inheritors.length > 0)}
                <div class="mt-4">
                    <InheritorCard
                        {inheritorData}
                        {inheritors}
                        {isLoading}
                        onOpenContact={(contact) => contactModal?.open(contact?.id ? contact : orgaStore.contacts?.data?.find(c => c.id === contact) || null, { targetClient: client, isInheritorMode: true, requireSignature: true })}
                        onRemoveInheritor={(id: string) => removeInheritor(id)}
                    />
                </div>
            {:else if !isEditing}
                <div class="p-4 rounded-xl border border-dashed border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20 text-center mt-4">
                    <p class="text-xs text-teal-800 dark:text-teal-300">Noch keine Pflegeperson verknüpft.</p>
                </div>
            {/if}

            {#if isEditing}
                <div transition:slide class="bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-900/60 rounded-xl p-4 sm:p-5 mt-4 shadow-sm">
                    <label for="inheritor-select" class="block text-sm font-semibold text-neutral-700 dark:text-slate-200 mb-1.5">Aus bestehenden Kontakten wählen</label>
                    <div class="flex flex-col sm:flex-row gap-3">
                        <select id="inheritor-select" bind:value={selectedContactId} class="orga-input-clear py-2.5 min-h-11 text-sm bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 cursor-pointer flex-1 touch-manipulation" disabled={isLoading}>
                            <option value="">Bitte wählen...</option>
                            {#each sortedContacts as contact (contact.id)}
                                <option value={contact.id}>{contact.name_last}, {contact.name_first} {contact.company_name ? `(${contact.company_name})` : ''}</option>
                            {/each}
                        </select>
                        <button type="button" onclick={linkExisting} disabled={isLoading || !selectedContactId} class="orga-button-primary bg-teal-600 hover:bg-teal-700 min-h-11 py-2.5 px-6 shadow-sm w-full sm:w-auto cursor-pointer touch-manipulation">Verknüpfen</button>
                    </div>
                    
                    <div class="flex items-center gap-3 my-4">
                        <div class="h-px flex-1 bg-neutral-200 dark:bg-slate-700"></div>
                        <span class="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">oder</span>
                        <div class="h-px flex-1 bg-neutral-200 dark:bg-slate-700"></div>
                    </div>

                    <button type="button" onclick={openCreateInheritorModal} class="w-full min-h-11 py-3 bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-bold text-sm rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:border-teal-300 shadow-sm transition-colors flex justify-center items-center gap-2 cursor-pointer touch-manipulation">
                        <span class="text-lg leading-none">+</span> Neue Pflegeperson erstellen
                    </button>

                    <div class="flex justify-end mt-4 pt-4 border-t border-neutral-100 dark:border-slate-700">
                        <button type="button" onclick={() => isEditing = false} class="orga-button-ghost dark:text-slate-300 dark:hover:bg-slate-700 min-h-11 py-2.5 px-6 w-full sm:w-auto cursor-pointer touch-manipulation">Abbrechen</button>
                    </div>
                </div>
            {/if}
        </div>
    </div>
{/if}

<ContactModal bind:this={contactModal} />
