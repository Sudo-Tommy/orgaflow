<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import RetirementHomeRelations from "./retirementHomes/RetirementHomeRelations.svelte";

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let editId = $state<string | null>(null);
    let name = $state("");
    let phone = $state("");
    let email = $state("");
    let address = $state("");
    let address_addition = $state("");
    let website = $state("");
    let source = $state("manual");
    let is_verified = $state(true);
    let street = $state("");
    let zip = $state("");
    let city = $state("");
    let contacts = $state<string[]>([]);
    let linkedClients = $state<string[]>([]);
    let initialLinkedClients = $state<string[]>([]);
    let initialDataHash = $state("");

    export function open(record?: any) {
        if (record) {
            editId = record.id;
            name = record.name || "";
            phone = record.phone || "";
            email = record.email || "";
            address = record.address || "";
            address_addition = record.address_addition || "";
            website = record.website || "";
            source = record.source || (record.status === 'preliminary' ? 'portal' : 'manual');
            is_verified = record.is_verified ?? (source === 'portal' ? false : true);
            street = record.street || "";
            zip = record.zip || "";
            city = record.city || "";
            contacts = Array.isArray(record.contacts) ? record.contacts : (record.contacts ? [record.contacts] : []);

            const linked = (orgaStore.clients?.data || []).filter((c: any) => {
                const cHomes = Array.isArray(c.retirement_homes) ? c.retirement_homes : (c.retirement_homes ? [c.retirement_homes] : []);
                return cHomes.includes(record.id);
            }).map((c: any) => c.id);
            linkedClients = [...linked];
            initialLinkedClients = [...linked];
        } else {
            editId = null;
            name = "";
            phone = "";
            email = "";
            address = "";
            address_addition = "";
            website = "";
            source = "manual";
            is_verified = true;
            street = "";
            zip = "";
            city = "";
            contacts = [];
            linkedClients = [];
            initialLinkedClients = [];
        }
        initialDataHash = JSON.stringify({ name, phone, email, address, address_addition, website, is_verified, street, zip, city, contacts, linkedClients });
        errorMsg = "";
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function attemptClose() {
        const currentDataHash = JSON.stringify({ name, phone, email, address, address_addition, website, is_verified, street, zip, city, contacts, linkedClients });
        if (currentDataHash !== initialDataHash) {
            if (await confirmStore.ask("Ungespeicherte Änderungen verwerfen?", "Fenster schließen?", "Verwerfen", "Weiter bearbeiten")) close();
        } else close();
    }

    function toggleContact(contactId: string) {
        contacts = contacts.includes(contactId) ? contacts.filter(id => id !== contactId) : [...contacts, contactId];
    }

    function toggleClient(clientId: string) {
        linkedClients = linkedClients.includes(clientId) ? linkedClients.filter(id => id !== clientId) : [...linkedClients, clientId];
    }

    function formatWebsiteUrl() {
        if (!website) return;
        const trimmed = website.trim();
        if (trimmed && !/^https?:\/\//i.test(trimmed)) website = `https://${trimmed}`;
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";
        try {
            const data: any = { name, phone, email, address, address_addition, website, source, is_verified, street, zip, city, contacts };
            let homeId = editId;
            if (editId) {
                await pb.collection('retirement_homes').update(editId, data);
            } else {
                const created = await pb.collection('retirement_homes').create(data);
                homeId = created.id;
            }
            if (homeId) {
                const toAdd = linkedClients.filter(id => !initialLinkedClients.includes(id));
                const toRemove = initialLinkedClients.filter(id => !linkedClients.includes(id));
                for (const cId of toAdd) {
                    const client = (orgaStore.clients?.data || []).find((c: any) => c.id === cId);
                    const currentHomes = Array.isArray(client?.retirement_homes) ? client.retirement_homes : (client?.retirement_homes ? [client.retirement_homes] : []);
                    if (!currentHomes.includes(homeId)) await pb.collection('clients').update(cId, { retirement_homes: [...currentHomes, homeId] });
                }
                for (const cId of toRemove) {
                    const client = (orgaStore.clients?.data || []).find((c: any) => c.id === cId);
                    const currentHomes = Array.isArray(client?.retirement_homes) ? client.retirement_homes : (client?.retirement_homes ? [client.retirement_homes] : []);
                    await pb.collection('clients').update(cId, { retirement_homes: currentHomes.filter((id: string) => id !== homeId) });
                }
            }
            close();
        } catch (err: any) {
            errorMsg = err.message || "Fehler beim Speichern.";
        } finally { isLoading = false; }
    }

    async function onDelete() {
        if (!editId || !(await confirmStore.ask("Möchten Sie dieses Pflegeheim wirklich löschen?", "Pflegeheim löschen?", "Löschen", "Abbrechen", true))) return;
        isLoading = true;
        try {
            await pb.collection('retirement_homes').delete(editId);
            close();
        } catch (err: any) {
            errorMsg = err.message || "Fehler beim Löschen.";
        } finally { isLoading = false; }
    }
</script>

<dialog 
    bind:this={dialog} 
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-neutral-900/60 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-4 sm:my-8 landscape:my-2 rounded-3xl border-none shadow-2xl z-50 outline-none" 
    onclick={(e) => { if (e.target === dialog) attemptClose(); }}
    oncancel={(e) => { e.preventDefault(); attemptClose(); }}
>
    <div class="bg-white dark:bg-slate-900 border border-neutral-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl w-full flex flex-col relative shadow-2xl overflow-hidden transition-colors">
        <!-- Header Bild-3-Design -->
        <div class="p-6 bg-gradient-to-r from-indigo-500/10 via-sky-500/5 to-transparent border-b border-neutral-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-lg shadow-indigo-500/20 shrink-0">
                    🏢
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                            Pflegeheim
                        </span>
                        <span class="text-[10px] font-semibold text-neutral-400 dark:text-slate-400">
                            {editId ? 'Stammdaten anpassen' : 'Neue Einrichtung'}
                        </span>
                    </div>
                    <h3 class="text-lg font-bold text-neutral-900 dark:text-white mt-1 line-clamp-2">
                        {editId ? (name || 'Pflegeheim bearbeiten') : 'Neues Pflegeheim'}
                    </h3>
                </div>
            </div>
            <button
                type="button"
                aria-label="Schließen"
                onclick={attemptClose}
                class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-300 flex items-center justify-center transition-colors text-sm shrink-0 cursor-pointer"
            >✕</button>
        </div>

        <form onsubmit={onSubmit} class="flex flex-col flex-1">
            <div class="p-6 space-y-4 flex-1">
                {#if errorMsg}<div class="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 p-3.5 rounded-2xl text-xs font-semibold border border-red-200 dark:border-red-900/60">{errorMsg}</div>{/if}
                
                {#if source === 'portal' || !is_verified}
                    <div class="p-3.5 rounded-2xl {is_verified ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200' : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'} border flex items-center justify-between gap-3">
                        <div class="flex items-center gap-2.5">
                            <span class="text-lg">{is_verified ? '✅' : '🌐'}</span>
                            <span class="text-xs font-bold">{source === 'portal' ? 'Über Klienten-Portal eingereicht' : 'Prüfstatus'}</span>
                        </div>
                        <label class="inline-flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs font-bold">
                            <input type="checkbox" bind:checked={is_verified} class="rounded text-emerald-600 focus:ring-emerald-500" disabled={isLoading} />
                            <span>{is_verified ? 'Bestätigt' : 'Bestätigen'}</span>
                        </label>
                    </div>
                {/if}

                <div><label for="home-name" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Name der Einrichtung</label><input id="home-name" type="text" bind:value={name} class="orga-input-clear" required disabled={isLoading} /></div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><label for="home-email" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">E-Mail</label><input id="home-email" type="email" bind:value={email} class="orga-input-clear" disabled={isLoading} /></div>
                    <div><label for="home-phone" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Telefon</label><input id="home-phone" type="text" bind:value={phone} class="orga-input-clear" disabled={isLoading} /></div>
                    <div class="md:col-span-2"><label for="home-address" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Adresse</label><input id="home-address" type="text" bind:value={address} class="orga-input-clear" disabled={isLoading} /></div>
                    <div><label for="home-address-addition" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Adresszusatz</label><input id="home-address-addition" type="text" bind:value={address_addition} class="orga-input-clear" disabled={isLoading} /></div>
                    <div><label for="home-website" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Webseite</label><input id="home-website" type="text" inputmode="url" bind:value={website} onblur={formatWebsiteUrl} class="orga-input-clear" disabled={isLoading} /></div>
                </div>

                <RetirementHomeRelations {contacts} {linkedClients} {isLoading} onToggleContact={toggleContact} onToggleClient={toggleClient} />
            </div>

            <!-- Footer Bild-3-Design -->
            <div class="p-4 bg-neutral-50 dark:bg-slate-900/80 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                {#if editId}
                    <button type="button" onclick={onDelete} class="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-2 cursor-pointer" disabled={isLoading}>Löschen</button>
                {:else}
                    <button type="button" onclick={attemptClose} class="orga-button-ghost py-2.5 px-4 text-xs dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer" disabled={isLoading}>Schließen</button>
                {/if}
                <div class="flex items-center gap-2">
                    {#if editId}
                        <button type="button" onclick={attemptClose} class="orga-button-ghost py-2.5 px-4 text-xs dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer" disabled={isLoading}>Abbrechen</button>
                    {/if}
                    <button type="submit" class="orga-button-primary py-2.5 px-5 text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer" disabled={isLoading}>
                        {isLoading ? "Speichert..." : "Speichern"}
                    </button>
                </div>
            </div>
        </form>
    </div>
</dialog>