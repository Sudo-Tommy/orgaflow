<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import ClientInfoCard from "$lib/components/clients/ClientInfoCard.svelte";
    import ClientRelations from "$lib/components/clients/ClientRelations.svelte";
    import ClientEditModal from "$lib/components/clients/ClientEditModal.svelte";
    import AiReportModal from "$lib/components/AiReportModal.svelte";
    import InheritorWidget from "$lib/components/clients/InheritorWidget.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    
    let clientId = $state<string | null>(null);
    let client = $derived(clientId ? orgaStore.clients?.getById(clientId) : null);
    
    let canDelete = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin');
    let isDeleting = $state(false);

    // svelte-ignore non_reactive_update
    let editModal: ReturnType<typeof ClientEditModal>;
    // svelte-ignore non_reactive_update
    let aiModal: ReturnType<typeof AiReportModal>;

    // --- Notizen Logik ---
    let notes = $state("");
    let isNotesSaving = $state(false);
    let currentClientIdForNotes = $state<string | null>(null);

    // --- Mailing-Liste Logik ---
    let mailingList = $state<string[]>([]);
    let newEmailInput = $state("");
    let isMailingListSaving = $state(false);
    let currentClientIdForMailingList = $state<string | null>(null);
    let showContactDropdown = $state(false);

    let availableContacts = $derived.by(() => {
        let list: any[] = [];
        const add = (name: string, email: string) => {
            if (email) list.push({ name, email });
        };
        orgaStore.clients?.data?.forEach((c: any) => {
            if (c.id !== client?.id) add(`${c.name_first} ${c.name_last} (Klient)`, c.email);
        });
        orgaStore.contacts?.data?.forEach((c: any) => {
            add(`${c.name_first} ${c.name_last} (${c.company_name || 'Kontakt'})`, c.email);
        });
        orgaStore.retirement_homes?.data?.forEach((h: any) => {
            add(`${h.name} (Pflegeheim)`, h.email);
        });
        orgaStore.insurancies?.data?.forEach((i: any) => {
            add(`${i.name} (Krankenkasse)`, i.email);
        });
        const unique: any[] = [];
        const seen = new Set();
        for (const item of list) {
            if (!seen.has(item.email)) { seen.add(item.email); unique.push(item); }
        }
        return unique.sort((a, b) => a.name.localeCompare(b.name));
    });

    async function updateMailingList(newList: string[]) {
        if (!client) return;
        isMailingListSaving = true;
        try {
            await pb.collection('clients').update(client.id, { mailing_list: newList });
            mailingList = newList;
            setTimeout(async () => {
                    const updatedClient = await pb.collection('clients').getOne(client.id, { expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', requestKey: null }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 400);
            toastStore.success("Mailing-Liste aktualisiert.");
        } catch (err) {
            toastStore.error("Fehler beim Aktualisieren der Mailing-Liste.");
        } finally {
            isMailingListSaving = false;
        }
    }

    function removeEmail(email: string) {
        updateMailingList(mailingList.filter(e => e !== email));
    }

    function addEmail(email: string) {
        const clean = email.trim();
        if (!clean || mailingList.includes(clean)) return;
        updateMailingList([...mailingList, clean]);
        newEmailInput = "";
        showContactDropdown = false;
    }

    export function open(id: string) {
        clientId = id;
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
        clientId = null;
    }

    $effect(() => {
        if (client && client.id !== currentClientIdForNotes) {
            notes = client.notes || "";
            currentClientIdForNotes = client.id;
        }
        
        if (client && client.id !== currentClientIdForMailingList) {
            mailingList = Array.isArray(client.mailing_list) ? [...client.mailing_list] : [];
            currentClientIdForMailingList = client.id;
        }
    });

    async function saveNotes() {
        if (!client) return;
        isNotesSaving = true;
        try {
            await pb.collection('clients').update(client.id, { notes });
            
            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(client.id, { expand: 'insurance,retirement_homes,contacts', requestKey: null }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 400);
            toastStore.success("Notizen erfolgreich gespeichert.");
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Speichern der Notizen.");
        } finally {
            isNotesSaving = false;
        }
    }

    function handleAiSave(newText: string, type: 'family' | 'internal', blobs?: Blob[]) {
        const dateHeader = `\n\n--- ${type === 'internal' ? 'Interne Notiz' : 'Bericht'} vom ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} ---\n`;
        const formattedText = dateHeader + newText.trim();
        
        notes = (notes ? notes.trim() : '') + formattedText;
        saveNotes();
    }

    async function deleteClient() {
        if (!client) return;
        if (!(await confirmStore.ask(`Möchten Sie die Akte von ${client.name_first} ${client.name_last} wirklich unwiderruflich löschen?`, "Klienten löschen?", "Löschen", "Abbrechen", true))) return;

        isDeleting = true;
        try {
            await pb.collection('clients').delete(client.id);
            toastStore.success("Klient erfolgreich gelöscht.");
            if (orgaStore.clients) await orgaStore.clients.init();
            close();
        } catch (err: any) {
            console.error("Fehler beim Löschen:", err);
            toastStore.error("Fehler beim Löschen des Klienten.");
        } finally {
            isDeleting = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-7xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-neutral-50 rounded-3xl w-full max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl">
        <!-- HEADER -->
        <div class="bg-white px-4 sm:px-6 md:px-8 py-4 sm:py-5 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 sticky top-0 z-20 shadow-sm gap-4">
            <div class="flex items-center gap-3 sm:gap-4 min-w-0">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-inner text-xl sm:text-2xl shrink-0">
                    {#if client}{(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}{:else}📂{/if}
                </div>
                <div class="min-w-0">
                    <h2 class="text-lg sm:text-2xl font-bold text-brand-950 leading-tight flex items-center gap-2 sm:gap-3 truncate">
                        {#if client}
                            <span class="truncate">{client.name_first} {client.name_last}</span>
                            <span class="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] font-bold rounded-full {(client.status || '').toLowerCase() === 'aktiv' ? 'bg-emerald-100 text-emerald-700' : ((client.status || '').toLowerCase() === 'verstorben' ? 'bg-neutral-800 text-neutral-100' : 'bg-neutral-100 text-neutral-600')} shrink-0">
                                {(client.status || '').toLowerCase() === 'aktiv' ? 'Aktiv' : ((client.status || '').toLowerCase() === 'verstorben' ? 'Verstorben 🕊️' : 'Inaktiv')}
                            </span>
                        {:else if orgaStore.clients?.isLoading}
                            <div class="h-6 w-48 bg-neutral-200 rounded-lg animate-pulse"></div>
                        {:else}
                            Klient nicht gefunden
                        {/if}
                    </h2>
                    <p class="text-[10px] sm:text-sm text-neutral-500 font-medium mt-0.5 sm:mt-1 truncate">Detaillierte Akte und Verknüpfungen</p>
                </div>
            </div>
            
            <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {#if client}
                    {#if canDelete}
                        <button onclick={deleteClient} disabled={isDeleting} class="orga-button-ghost py-1.5 sm:py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold shadow-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors">
                            <svg class="w-4 h-4 mr-1 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Löschen
                        </button>
                    {/if}
                    <button onclick={() => editModal?.open()} class="orga-button-ghost py-1.5 sm:py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold shadow-sm">
                        <svg class="w-4 h-4 mr-1 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        Bearbeiten
                    </button>
                {/if}
                <div class="w-px h-6 sm:h-8 bg-neutral-200 mx-1 sm:mx-2 hidden sm:block"></div>
                <button aria-label="Schließen" onclick={close} class="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 w-8 h-8 sm:w-10 sm:h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors shadow-sm sm:shadow-none shrink-0">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        <!-- CONTENT -->
        <div class="p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-neutral-50">
            {#if !client && orgaStore.clients?.isLoading}
            <div class="flex flex-col items-center justify-center py-20 animate-pulse animate-enter delay-100">
                <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p class="text-neutral-500 font-medium">Lade Klienten-Akte...</p>
            </div>
            {:else if !client}
            <div class="orga-card-white p-12 text-center text-neutral-500 border border-neutral-100 shadow-sm animate-enter delay-100">
                <p class="text-lg font-bold text-neutral-900 mb-2">Die angeforderte Akte existiert nicht</p>
                <p class="mb-6">Der Klient wurde möglicherweise gelöscht.</p>
                <button onclick={close} class="orga-button-primary w-full sm:w-auto inline-flex justify-center mx-auto">Schließen</button>
            </div>
            {:else}
            <div class="grid grid-cols-1 xl:grid-cols-1 gap-6 xl:gap-8 pb-4">
                <InheritorWidget {client} />
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8 pb-4">
                <div class="xl:col-span-1 space-y-6 animate-enter delay-100">
                    <ClientInfoCard {client} />
                        <!-- Mailing-Liste Widget -->
                        <div class="orga-card-white p-5 sm:p-6 md:p-8">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-4">
                                <h2 class="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
                                    <span>📧</span> CC-Verteiler (Mails)
                                </h2>
                            </div>
                            
                            <div class="flex flex-col gap-3">
                                {#if mailingList.length > 0}
                                    <div class="flex flex-col gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                                        {#each mailingList as email}
                                            <div class="flex items-center justify-between bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 shadow-sm animate-enter">
                                                <span class="text-xs font-medium text-neutral-700 truncate mr-2">{email}</span>
                                                <button type="button" onclick={() => removeEmail(email)} class="text-rose-500 hover:text-rose-700 w-6 h-6 flex items-center justify-center rounded-full hover:bg-rose-50 transition-colors font-bold text-sm" disabled={isMailingListSaving}>✕</button>
                                            </div>
                                        {/each}
                                    </div>
                                {:else}
                                    <p class="text-xs text-neutral-500 italic">Keine zusätzlichen Empfänger hinterlegt.</p>
                                {/if}

                                <div class="mt-2 relative">
                                    <div class="flex gap-2">
                                        <input type="email" bind:value={newEmailInput} placeholder="E-Mail hinzufügen..." class="orga-input-clear flex-1 py-2 text-sm" disabled={isMailingListSaving} onkeydown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addEmail(newEmailInput); } }} />
                                        <button type="button" onclick={() => showContactDropdown = !showContactDropdown} class="orga-button-ghost px-3 py-2 text-xs" title="Aus Adressbuch wählen" disabled={isMailingListSaving}>📖</button>
                                        <button type="button" onclick={() => addEmail(newEmailInput)} class="orga-button-primary px-3 py-2 text-xs" disabled={isMailingListSaving || !newEmailInput.trim()}>+</button>
                                    </div>
                                    
                                    {#if showContactDropdown}
                                        <!-- svelte-ignore a11y_consider_explicit_label -->
                                        <button type="button" class="fixed inset-0 z-40 w-full h-full cursor-default" onclick={() => showContactDropdown = false} tabindex="-1"></button>
                                        <div class="absolute bottom-full left-0 right-0 mb-1 bg-white border border-neutral-200 shadow-xl rounded-xl z-50 max-h-60 overflow-y-auto custom-scrollbar p-1">
                                            {#each availableContacts as c}
                                                <button type="button" onclick={() => addEmail(c.email)} class="w-full flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-lg cursor-pointer transition-colors text-left focus:outline-none"><div class="min-w-0"><p class="text-sm font-bold text-neutral-900 truncate">{c.name}</p><p class="text-[10px] text-neutral-500 truncate">{c.email}</p></div></button>
                                            {/each}
                                            {#if availableContacts.length === 0}<p class="text-xs text-neutral-500 p-2 text-center">Keine Kontakte gefunden</p>{/if}
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        </div>

                        <div class="orga-card-white p-5 sm:p-6 md:p-8">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-4">
                                <h2 class="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
                                    <span>📝</span> Klienten-Notizen
                                </h2>
                                <button onclick={() => aiModal?.open('internal')} class="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm">
                                    <span>🎙️</span> KI-Diktat
                                </button>
                            </div>
                            <div class="flex flex-col gap-3">
                                <textarea bind:value={notes} class="orga-input-clear resize-y min-h-37.5 text-sm" placeholder="Besondere Vorkommnisse, Krankheiten oder wichtige Hinweise zu diesem Klienten..." disabled={isNotesSaving}></textarea>
                                <div class="flex justify-end mt-1">
                                    <button onclick={saveNotes} disabled={isNotesSaving || notes === (client.notes || '')} class="orga-button-primary py-2 px-5 text-sm w-full sm:w-auto">
                                        {isNotesSaving ? 'Speichert...' : 'Speichern'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="xl:col-span-2 animate-enter delay-200">
                        <ClientRelations clientId={client.id} />
                    </div>
                </div>
            {/if}
        </div>
    </div>
</dialog>

{#if client}
    <!-- Das Bearbeitungs-Modal für den aktuellen Klienten -->
    <ClientEditModal bind:this={editModal} {client} />
    <!-- Das KI Sprach-Aufnahme Modal -->
    <AiReportModal bind:this={aiModal} onSave={handleAiSave} />
{/if}
