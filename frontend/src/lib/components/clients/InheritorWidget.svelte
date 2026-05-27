<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { slide } from "svelte/transition";
    import ContactModal from "$lib/components/contacts/ContactModal.svelte";

    let { client } = $props<{ client: any }>();

    let isEditing = $state(false);
    let selectedContactId = $state("");
    let isCreatingNew = $state(false);
    let isLoading = $state(false);

    let newFirstName = $state("");
    let newLastName = $state("");
    let newPhone = $state("");
    let newEmail = $state("");
    let newCompany = $state("Erbe / Nachlassverwalter");
    let newSalutation = $state("Keine Angabe");
    let newBirthdate = $state("");
    let newStreet = $state("");
    let newHousenr = $state("");
    let newZip = $state("");
    let newCity = $state("");
    let newNotes = $state("");

    // svelte-ignore non_reactive_update
    let contactModal: any;

    let inheritors = $derived.by(() => {
        if (!client?.expand?.inheritor) return [];
        return Array.isArray(client.expand.inheritor) ? client.expand.inheritor : [client.expand.inheritor];
    });

    async function linkExisting() {
        if (!selectedContactId) return;
        isLoading = true;
        try {
            let currentInheritors = client.inheritor || [];
            if (!Array.isArray(currentInheritors)) currentInheritors = [currentInheritors];

            if (!currentInheritors.includes(selectedContactId)) {
                const updated = [...currentInheritors, selectedContactId];
                await pb.collection('clients').update(client.id, { inheritor: updated }, { requestKey: null });
                
                toastStore.success("Erbe erfolgreich verknüpft.");
                isEditing = false;
                selectedContactId = "";
                
                if (orgaStore.clients) await orgaStore.clients.init();
            }
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Verknüpfen.");
        } finally {
            isLoading = false;
        }
    }

    async function createAndLinkNew() {
        if (!newFirstName || !newLastName) {
            toastStore.warning("Bitte Vor- und Nachname angeben.");
            return;
        }
        isLoading = true;
        try {
            const newContact = await pb.collection('contacts').create({
                name_first: newFirstName,
                name_last: newLastName,
                phone: newPhone,
                email: newEmail,
                company_name: newCompany,
                salutation: newSalutation,
                birthdate: newBirthdate,
                street: newStreet,
                housenr: newHousenr,
                zip: newZip,
                city: newCity,
                notes: newNotes
            }, { requestKey: null });
            
            if (orgaStore.contacts) await orgaStore.contacts.init();

            let currentInheritors = client.inheritor || [];
            if (!Array.isArray(currentInheritors)) currentInheritors = [currentInheritors];

            const updated = [...currentInheritors, newContact.id];
            await pb.collection('clients').update(client.id, { inheritor: updated }, { requestKey: null });
            
            toastStore.success("Erbe erfolgreich angelegt und verknüpft.");
            isCreatingNew = false;
            isEditing = false;
            newFirstName = "";
            newLastName = "";
            newPhone = "";
            newEmail = "";
            newCompany = "Erbe / Nachlassverwalter";
            newSalutation = "Keine Angabe";
            newBirthdate = "";
            newStreet = "";
            newHousenr = "";
            newZip = "";
            newCity = "";
            newNotes = "";
            
            if (orgaStore.clients) await orgaStore.clients.init();
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Erstellen des Erben.");
        } finally {
            isLoading = false;
        }
    }

    async function removeInheritor(contactId: string) {
        isLoading = true;
        try {
            let currentInheritors = client.inheritor || [];
            if (!Array.isArray(currentInheritors)) currentInheritors = [currentInheritors];

            const updated = currentInheritors.filter((id: string) => id !== contactId);
            await pb.collection('clients').update(client.id, { inheritor: updated }, { requestKey: null });
            
            toastStore.info("Erbe wurde entfernt.");
            if (orgaStore.clients) await orgaStore.clients.init();
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Entfernen des Erben.");
        } finally {
            isLoading = false;
        }
    }
</script>

{#if client && (client.status === 'Verstorben' || client.status === 'verstorben')}
    <div class="orga-card-white p-5 relative overflow-hidden group border border-neutral-200 mt-6 animate-enter">
        <div class="absolute top-0 right-0 w-24 h-24 bg-red-500 rounded-full blur-2xl -mr-8 -mt-8 z-0 pointer-events-none"></div>
        
        <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2 relative z-10">
            <h3 class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <span class="text-sm">📜</span> Erben / Nachlassverwaltung
            </h3>
            {#if !isEditing}
                <button onclick={() => isEditing = true} class="text-xs font-bold text-white transition-colors bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg shadow-sm">
                    + Erbe hinzufügen
                </button>
            {/if}
        </div>

        <div class="relative z-10 space-y-3">
            {#if inheritors.length > 0}
                <div class="grid grid-cols-1 sm:grid-cols-1 gap-3">
                    {#each inheritors as inheritor}
                        <div class="w-full flex items-start justify-between bg-neutral-50 border border-neutral-100 p-3.5 rounded-xl shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group">
                            <button type="button" onclick={() => contactModal?.open(inheritor)} class="min-w-0 pr-2 text-left flex-1 cursor-pointer">
                                <p class="text-sm font-bold text-neutral-900 truncate">{inheritor.name_first} {inheritor.name_last}</p>
                                {#if inheritor.company_name}<p class="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 truncate">{inheritor.company_name}</p>{/if}
                                <div class="flex flex-col gap-1 text-xs text-neutral-600 mt-1.5">
                                    {#if inheritor.phone}<span class="flex items-center gap-1.5 truncate">📞 {inheritor.phone}</span>{/if}
                                    {#if inheritor.email}<span class="flex items-center gap-1.5 truncate">✉️ {inheritor.email}</span>{/if}
                                </div>
                            </button>
                            <button type="button" onclick={(e) => { e.stopPropagation(); removeInheritor(inheritor.id); }} disabled={isLoading} class="text-neutral-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-neutral-100 hover:border-rose-200 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm shrink-0" title="Verknüpfung aufheben">✕</button>
                        </div>
                    {/each}
                </div>
            {:else if !isEditing}
                <div class="p-4 bg-neutral-50 border border-dashed border-neutral-200 rounded-xl text-center">
                    <p class="text-sm text-neutral-500 font-medium">Es wurde noch kein Erbe oder Nachlassverwalter hinterlegt.</p>
                </div>
            {/if}

            {#if isEditing}
                <div transition:slide class="bg-neutral-50 border border-neutral-200 rounded-xl p-4 sm:p-5 mt-4 shadow-sm">
                    {#if !isCreatingNew}
                        <label for="inheritor-select" class="block text-sm font-semibold text-neutral-700 mb-1.5">Aus bestehenden Kontakten wählen</label>
                        <div class="flex flex-col sm:flex-row gap-3">
                            <select id="inheritor-select" bind:value={selectedContactId} class="orga-input-clear py-2.5 text-sm bg-white cursor-pointer flex-1" disabled={isLoading}>
                                <option value="">Bitte wählen...</option>
                                {#each orgaStore.contacts?.data || [] as contact}
                                    <option value={contact.id}>{contact.name_first} {contact.name_last} {contact.company_name ? `(${contact.company_name})` : ''}</option>
                                {/each}
                            </select>
                            <button onclick={linkExisting} disabled={isLoading || !selectedContactId} class="orga-button-primary py-2.5 px-6 shadow-sm w-full sm:w-auto">Verknüpfen</button>
                        </div>
                        
                        <div class="flex items-center gap-3 my-4">
                            <div class="h-px flex-1 bg-neutral-200"></div>
                            <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">oder</span>
                            <div class="h-px flex-1 bg-neutral-200"></div>
                        </div>

                        <button onclick={() => isCreatingNew = true} class="w-full py-3 bg-white border border-neutral-200 text-neutral-700 font-bold text-sm rounded-xl hover:bg-neutral-50 hover:border-neutral-300 shadow-sm transition-colors flex justify-center items-center gap-2">
                            <span class="text-lg leading-none">+</span> Neuen Kontakt / Erben erstellen
                        </button>
                    {:else}
                        <div class="space-y-4">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="text-sm font-bold text-neutral-900">Neuen Erben anlegen</h4>
                                <button onclick={() => isCreatingNew = false} class="text-xs font-bold text-neutral-500 hover:text-neutral-800 transition-colors">Zurück zur Auswahl</button>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div class="sm:col-span-1"><label for="new-salutation" class="block text-xs font-semibold text-neutral-600 mb-1">Anrede</label><select id="new-salutation" bind:value={newSalutation} class="orga-input-clear py-2 text-sm bg-white"><option>Keine Angabe</option><option>Herr</option><option>Frau</option></select></div>
                                <div class="sm:col-span-3"><label for="new-company" class="block text-xs font-semibold text-neutral-600 mb-1">Zusatz (Firma, Rolle)</label><input id="new-company" type="text" bind:value={newCompany} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                                
                                <div class="sm:col-span-2"><label for="new-firstname" class="block text-xs font-semibold text-neutral-600 mb-1">Vorname *</label><input id="new-firstname" type="text" bind:value={newFirstName} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                                <div class="sm:col-span-2"><label for="new-lastname" class="block text-xs font-semibold text-neutral-600 mb-1">Nachname *</label><input id="new-lastname" type="text" bind:value={newLastName} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                                
                                <div class="sm:col-span-2"><label for="new-birthdate" class="block text-xs font-semibold text-neutral-600 mb-1">Geburtsdatum</label><input id="new-birthdate" type="date" bind:value={newBirthdate} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                                
                                <div class="sm:col-span-2"><label for="new-phone" class="block text-xs font-semibold text-neutral-600 mb-1">Telefon</label><input id="new-phone" type="text" bind:value={newPhone} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                                <div class="sm:col-span-2"><label for="new-email" class="block text-xs font-semibold text-neutral-600 mb-1">E-Mail</label><input id="new-email" type="email" bind:value={newEmail} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>

                                <div class="sm:col-span-3"><label for="new-street" class="block text-xs font-semibold text-neutral-600 mb-1">Straße</label><input id="new-street" type="text" bind:value={newStreet} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                                <div class="sm:col-span-1"><label for="new-housenr" class="block text-xs font-semibold text-neutral-600 mb-1">Hausnr.</label><input id="new-housenr" type="text" bind:value={newHousenr} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>

                                <div class="sm:col-span-1"><label for="new-zip" class="block text-xs font-semibold text-neutral-600 mb-1">PLZ</label><input id="new-zip" type="text" bind:value={newZip} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                                <div class="sm:col-span-3"><label for="new-city" class="block text-xs font-semibold text-neutral-600 mb-1">Stadt</label><input id="new-city" type="text" bind:value={newCity} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>

                                <div class="sm:col-span-4"><label for="new-notes" class="block text-xs font-semibold text-neutral-600 mb-1">Notizen</label><textarea id="new-notes" bind:value={newNotes} rows="2" class="orga-input-clear py-2 text-sm bg-white resize-y custom-scrollbar" disabled={isLoading}></textarea></div>
                            </div>
                            <div class="flex justify-end pt-2">
                                <button onclick={createAndLinkNew} disabled={isLoading || !newFirstName || !newLastName} class="orga-button-primary py-2.5 px-6 shadow-sm w-full sm:w-auto">Erstellen & Verknüpfen</button>
                            </div>
                        </div>
                    {/if}

                    {#if !isCreatingNew}
                        <div class="flex justify-end mt-4 pt-4 border-t border-neutral-100">
                            <button onclick={() => isEditing = false} class="orga-button-ghost py-2.5 px-6 w-full sm:w-auto">Abbrechen</button>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
{/if}

<ContactModal bind:this={contactModal} />