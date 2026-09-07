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
    let newCompany = $state("Pflegeperson (Angehörige/r)");
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

    async function linkExisting() {
        if (!selectedContactId) return;
        isLoading = true;
        try {
            let currentInheritors = client.inheritor || [];
            if (!Array.isArray(currentInheritors)) currentInheritors = [currentInheritors];

            if (!currentInheritors.includes(selectedContactId)) {
                const updated = [...currentInheritors, selectedContactId];
                await pb.collection('clients').update(client.id, { inheritor: updated }, { requestKey: null });
                
                toastStore.success("Pflegeperson erfolgreich verknüpft.");
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
            
            toastStore.success("Pflegeperson erfolgreich angelegt und verknüpft.");
            isCreatingNew = false;
            isEditing = false;
            newFirstName = "";
            newLastName = "";
            newPhone = "";
            newEmail = "";
            newCompany = "Pflegeperson (Angehörige/r)";
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
            toastStore.error("Fehler beim Erstellen der Pflegeperson.");
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
            
            toastStore.info("Pflegeperson wurde entfernt.");
            if (orgaStore.clients) await orgaStore.clients.init();
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Entfernen der Pflegeperson.");
        } finally {
            isLoading = false;
        }
    }
</script>

{#if client && (parseInt(client.level_of_care, 10) >= 2 || inheritors.length > 0 || inheritorData.name || client.inheritor_info?.name || client.status === 'Verstorben' || client.status === 'verstorben')}
    <div class="orga-card-white p-5 relative overflow-hidden group border border-teal-200/80 bg-teal-50/10 mt-6 animate-enter">
        <div class="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl -mr-8 -mt-8 z-0 pointer-events-none"></div>
        
        <!-- Header -->
        <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2 relative z-10">
            <div>
                <h3 class="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span class="text-sm">⚖️</span> Erbe, Vollmacht & Verhinderungspflege
                </h3>
                <p class="text-[11px] text-neutral-500 font-medium">Rechtliche Nachfolge, Vollmachten (§ 39 SGB XI) und private Pflegeperson</p>
            </div>
            {#if !isEditing}
                <button onclick={() => isEditing = true} class="text-xs font-bold text-white transition-colors bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-lg shadow-sm">
                    + Pflegeperson verknüpfen
                </button>
            {/if}
        </div>

        <div class="relative z-10 space-y-4">
            <!-- 1. Gesetzlicher Erbe / Bevollmächtigter (falls Daten vorliegen) -->
            {#if inheritorData.name}
                <div class="w-full bg-white border border-indigo-100 p-4 rounded-xl shadow-xs hover:border-indigo-300 transition-all">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-2 mb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-base">👤</span>
                            <div>
                                <p class="text-sm font-bold text-neutral-900">{inheritorData.name}</p>
                                <p class="text-[11px] text-neutral-500 font-medium">{inheritorData.relation || 'Rechtlicher Vertreter'}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5">
                            {#if inheritorData.hasPowerOfAttorney}
                                <span class="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span>✓</span> Vollmacht erteilt
                                </span>
                            {/if}
                            <span class="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                                Erbe / Bevollmächtigte/r
                            </span>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600 pt-1">
                        {#if inheritorData.phone}
                            <a href="tel:{inheritorData.phone}" class="inline-flex items-center gap-1 hover:text-indigo-600 font-medium">
                                <span>📞</span> {inheritorData.phone}
                            </a>
                        {/if}
                        {#if inheritorData.email}
                            <a href="mailto:{inheritorData.email}" class="inline-flex items-center gap-1 hover:text-indigo-600 font-medium">
                                <span>✉️</span> {inheritorData.email}
                            </a>
                        {/if}
                        {#if inheritorData.notes}
                            <span class="text-neutral-500 italic">Hinweis: {inheritorData.notes}</span>
                        {/if}
                    </div>
                </div>
            {/if}

            <!-- 2. Verknüpfte Pflegepersonen (Kontakte) -->
            {#if inheritors.length > 0}
                <div class="space-y-2">
                    <p class="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Verknüpfte Kontaktpersonen für Verhinderungspflege</p>
                    <div class="grid grid-cols-1 sm:grid-cols-1 gap-3">
                        {#each inheritors as inheritor}
                            <div class="w-full flex items-start justify-between bg-white border border-teal-100 p-3.5 rounded-xl shadow-xs hover:border-teal-300 transition-all group">
                                <button type="button" onclick={() => contactModal?.open(inheritor)} class="min-w-0 pr-2 text-left flex-1 cursor-pointer">
                                    <div class="flex items-center gap-2">
                                        <p class="text-sm font-bold text-neutral-900 truncate">{inheritor.name_first} {inheritor.name_last}</p>
                                        <span class="text-[9px] font-bold bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">Hauptpflegeperson</span>
                                    </div>
                                    {#if inheritor.company_name}<p class="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 truncate">{inheritor.company_name}</p>{/if}
                                    <div class="flex flex-col gap-1 text-xs text-neutral-600 mt-1.5">
                                        {#if inheritor.phone}<span class="flex items-center gap-1.5 truncate">📞 {inheritor.phone}</span>{/if}
                                        {#if inheritor.email}<span class="flex items-center gap-1.5 truncate">✉️ {inheritor.email}</span>{/if}
                                        {#if inheritor.street}<span class="flex items-center gap-1.5 truncate">🏠 {inheritor.street} {inheritor.housenr || ''}, {inheritor.zip || ''} {inheritor.city || ''}</span>{/if}
                                    </div>
                                </button>
                                <button type="button" onclick={(e) => { e.stopPropagation(); removeInheritor(inheritor.id); }} disabled={isLoading} class="text-neutral-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-neutral-100 hover:border-rose-200 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-xs shrink-0" title="Verknüpfung aufheben">✕</button>
                            </div>
                        {/each}
                    </div>
                </div>
            {:else if !isEditing && !inheritorData.name}
                <div class="p-4 bg-white/70 border border-dashed border-teal-200 rounded-xl text-center">
                    <p class="text-sm text-neutral-500 font-medium">Es wurde noch keine Pflegeperson für Verhinderungspflege oder Erben-Zuordnung hinterlegt.</p>
                </div>
            {/if}

            <!-- 3. Bearbeitungsformular für neue / bestehende Kontakte -->
            {#if isEditing}
                <div transition:slide class="bg-white border border-teal-200 rounded-xl p-4 sm:p-5 mt-4 shadow-sm">
                    {#if !isCreatingNew}
                        <label for="inheritor-select" class="block text-sm font-semibold text-neutral-700 mb-1.5">Aus bestehenden Kontakten wählen</label>
                        <div class="flex flex-col sm:flex-row gap-3">
                            <select id="inheritor-select" bind:value={selectedContactId} class="orga-input-clear py-2.5 text-sm bg-white cursor-pointer flex-1" disabled={isLoading}>
                                <option value="">Bitte wählen...</option>
                                {#each orgaStore.contacts?.data || [] as contact}
                                    <option value={contact.id}>{contact.name_first} {contact.name_last} {contact.company_name ? `(${contact.company_name})` : ''}</option>
                                {/each}
                            </select>
                            <button onclick={linkExisting} disabled={isLoading || !selectedContactId} class="orga-button-primary bg-teal-600 hover:bg-teal-700 py-2.5 px-6 shadow-sm w-full sm:w-auto">Verknüpfen</button>
                        </div>
                        
                        <div class="flex items-center gap-3 my-4">
                            <div class="h-px flex-1 bg-neutral-200"></div>
                            <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">oder</span>
                            <div class="h-px flex-1 bg-neutral-200"></div>
                        </div>

                        <button onclick={() => isCreatingNew = true} class="w-full py-3 bg-white border border-teal-200 text-teal-800 font-bold text-sm rounded-xl hover:bg-teal-50 hover:border-teal-300 shadow-sm transition-colors flex justify-center items-center gap-2">
                            <span class="text-lg leading-none">+</span> Neue Pflegeperson erstellen
                        </button>
                    {:else}
                        <div class="space-y-4">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="text-sm font-bold text-neutral-900">Neue Pflegeperson für Verhinderungspflege anlegen</h4>
                                <button onclick={() => isCreatingNew = false} class="text-xs font-bold text-neutral-500 hover:text-neutral-800 transition-colors">Zurück zur Auswahl</button>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div class="sm:col-span-1"><label for="new-salutation" class="block text-xs font-semibold text-neutral-600 mb-1">Anrede</label><select id="new-salutation" bind:value={newSalutation} class="orga-input-clear py-2 text-sm bg-white"><option>Keine Angabe</option><option>Herr</option><option>Frau</option></select></div>
                                <div class="sm:col-span-3"><label for="new-company" class="block text-xs font-semibold text-neutral-600 mb-1">Funktion / Rolle</label><input id="new-company" type="text" bind:value={newCompany} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                                
                                <div class="sm:col-span-2"><label for="new-firstname" class="block text-xs font-semibold text-neutral-600 mb-1">Vorname *</label><input id="new-firstname" type="text" bind:value={newFirstName} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                                <div class="sm:col-span-2"><label for="new-lastname" class="block text-xs font-semibold text-neutral-600 mb-1">Nachname *</label><input id="new-lastname" type="text" bind:value={newLastName} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                                
                                <div class="sm:col-span-2"><label for="new-birthdate" class="block text-xs font-semibold text-neutral-600 mb-1">Geburtsdatum</label><input id="new-birthdate" type="date" bind:value={newBirthdate} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                                
                                <div class="sm:col-span-2"><label for="new-phone" class="block text-xs font-semibold text-neutral-600 mb-1">Telefon</label><input id="new-phone" type="text" bind:value={newPhone} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                                <div class="sm:col-span-2"><label for="new-email" class="block text-xs font-semibold text-neutral-600 mb-1">E-Mail</label><input id="new-email" type="email" bind:value={newEmail} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>

                                <div class="sm:col-span-3"><label for="new-street" class="block text-xs font-semibold text-neutral-600 mb-1">Straße</label><input id="new-street" type="text" bind:value={newStreet} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                                <div class="sm:col-span-1"><label for="new-housenr" class="block text-xs font-semibold text-neutral-600 mb-1">Hausnr.</label><input id="new-housenr" type="text" bind:value={newHousenr} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>

                                <div class="sm:col-span-1"><label for="new-zip" class="block text-xs font-semibold text-neutral-600 mb-1">PLZ</label><input id="new-zip" type="text" bind:value={newZip} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>
                                <div class="sm:col-span-3"><label for="new-city" class="block text-xs font-semibold text-neutral-600 mb-1">Stadt</label><input id="new-city" type="text" bind:value={newCity} class="orga-input-clear py-2 text-sm bg-white" disabled={isLoading} /></div>

                                <div class="sm:col-span-4"><label for="new-notes" class="block text-xs font-semibold text-neutral-600 mb-1">Notizen zum Verhinderungspflege-Antrag</label><textarea id="new-notes" bind:value={newNotes} rows="2" class="orga-input-clear py-2 text-sm bg-white resize-y custom-scrollbar" disabled={isLoading}></textarea></div>
                            </div>
                            <div class="flex justify-end pt-2">
                                <button onclick={createAndLinkNew} disabled={isLoading || !newFirstName || !newLastName} class="orga-button-primary bg-teal-600 hover:bg-teal-700 py-2.5 px-6 shadow-sm w-full sm:w-auto">Erstellen & Verknüpfen</button>
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