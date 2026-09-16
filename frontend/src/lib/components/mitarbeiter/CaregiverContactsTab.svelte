<script lang="ts">
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { pb } from '$lib/services/pocketbase';
    import { rbacService } from '$lib/services/rbacService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { 
        BookOpen, Plus, Search, Phone, MapPin, Navigation, 
        Lock, Edit3, X, Check, ShieldAlert, Mail, Building
    } from 'lucide-svelte';
    import type { ContactRecord, Salutation } from '$lib/types/orgaTypes';

    let filterType = $state<'all' | 'own' | 'assigned'>('all');
    let searchQuery = $state('');

    // Modal State
    let isModalOpen = $state(false);
    let isEditing = $state(false);
    let isReadOnly = $state(false);
    let editingContactId = $state('');

    let salutation = $state<Salutation>('Keine Angabe');
    let company_name = $state('');
    let name_first = $state('');
    let name_last = $state('');
    let email = $state('');
    let phone = $state('');
    let street = $state('');
    let housenr = $state('');
    let zip = $state('');
    let city = $state('');

    const currentUser = $derived(pb.authStore.model);
    const currentUserId = $derived(currentUser?.id);

    // Alle für den Mitarbeiter relevanten Kontakte
    let allContacts = $derived.by(() => {
        return orgaStore.contacts.data || [];
    });

    let filteredContacts = $derived.by(() => {
        let list = allContacts;

        if (filterType === 'own') {
            list = list.filter(c => c.created_by === currentUserId);
        } else if (filterType === 'assigned') {
            list = list.filter(c => c.created_by !== currentUserId);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(c => 
                `${c.name_first || ''} ${c.name_last || ''}`.toLowerCase().includes(q) ||
                (c.company_name || '').toLowerCase().includes(q) ||
                (c.city || '').toLowerCase().includes(q) ||
                (c.phone || '').toLowerCase().includes(q) ||
                (c.email || '').toLowerCase().includes(q)
            );
        }

        return list;
    });

    function openCreateModal() {
        isEditing = false;
        isReadOnly = false;
        editingContactId = '';
        salutation = 'Keine Angabe';
        company_name = '';
        name_first = '';
        name_last = '';
        email = '';
        phone = '';
        street = '';
        housenr = '';
        zip = '';
        city = '';
        isModalOpen = true;
    }

    function openContactModal(contact: ContactRecord) {
        editingContactId = contact.id;
        salutation = (contact.salutation as Salutation) || 'Keine Angabe';
        company_name = contact.company_name || '';
        name_first = contact.name_first || '';
        name_last = contact.name_last || '';
        email = contact.email || '';
        phone = contact.phone || '';
        street = contact.street || '';
        housenr = contact.housenr || '';
        zip = contact.zip || '';
        city = contact.city || '';

        const canEdit = rbacService.canEditContact(contact);
        isEditing = true;
        isReadOnly = !canEdit;
        isModalOpen = true;
    }

    function closeModal() {
        isModalOpen = false;
        editingContactId = '';
    }

    async function handleSaveContact(e: Event) {
        e.preventDefault();
        if (isReadOnly) return;

        if (!name_first.trim() && !name_last.trim() && !company_name.trim()) {
            toastStore.warning('Bitte mindestens einen Namen oder Firmennamen angeben.');
            return;
        }

        const data: any = {
            salutation,
            company_name: company_name.trim(),
            name_first: name_first.trim(),
            name_last: name_last.trim(),
            email: email.trim(),
            phone: phone.trim(),
            street: street.trim(),
            housenr: housenr.trim(),
            zip: zip.trim(),
            city: city.trim()
        };

        try {
            if (isEditing && editingContactId) {
                await pb.collection('contacts').update(editingContactId, data);
                toastStore.success('Kontakt erfolgreich aktualisiert.');
            } else {
                data.created_by = currentUserId;
                await pb.collection('contacts').create(data);
                toastStore.success('Neuer Kontakt erfolgreich angelegt.');
            }
            await orgaStore.contacts.init();
            closeModal();
        } catch (err: any) {
            console.error('Fehler beim Speichern des Kontakts:', err);
            toastStore.error(err?.message || 'Kontakt konnte nicht gespeichert werden.');
        }
    }

    function callContact(num?: string) {
        if (!num) {
            toastStore.warning('Keine Telefonnummer vorhanden.');
            return;
        }
        window.location.href = `tel:${num.replace(/\s+/g, '')}`;
    }

    function openNavigation(address?: string) {
        if (!address) {
            toastStore.warning('Keine Adresse vorhanden.');
            return;
        }
        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
        window.open(url, '_blank');
    }
</script>

<div class="space-y-4 pb-20">
    
    <!-- Top Action & Neuer Kontakt -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {#each [
                { id: 'all', label: 'Alle Kontakte' },
                { id: 'own', label: '🟢 Selbst erstellt' },
                { id: 'assigned', label: '🔒 Zugewiesen' }
            ] as tab}
                <button
                    type="button"
                    onclick={() => filterType = tab.id as any}
                    class="min-h-11 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 {
                        filterType === tab.id 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }"
                >
                    {tab.label}
                </button>
            {/each}
        </div>

        <button
            type="button"
            onclick={openCreateModal}
            class="min-h-11 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
        >
            <Plus class="w-4 h-4" />
            <span>Neuer Kontakt</span>
        </button>
    </div>

    <!-- Suchleiste -->
    <div class="relative">
        <label for="search-contacts-input" class="sr-only">Kontakte suchen</label>
        <Search class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input 
            id="search-contacts-input"
            type="text" 
            bind:value={searchQuery}
            placeholder="Name, Arzt, Firma oder Ort suchen..." 
            class="w-full min-h-12 pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
        />
    </div>

    <!-- Kontakt-Liste -->
    {#if orgaStore.contacts?.isLoading}
        <div class="text-center py-16 text-slate-400 font-medium animate-pulse">Lade Kontakte...</div>
    {:else if filteredContacts.length === 0}
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xs">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <BookOpen class="w-6 h-6" />
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Keine Kontakte gefunden</h3>
            <p class="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Legen Sie eigene Kontakte für Ärzte, Therapeuten oder Angehörige an oder wenden Sie sich an die Betriebsleitung für Zuweisungen.
            </p>
        </div>
    {:else}
        <div class="space-y-3">
            {#each filteredContacts as contact (contact.id)}
                {@const isOwn = contact.created_by === currentUserId}
                {@const address = `${contact.street || ''} ${contact.housenr || ''}, ${contact.zip || ''} ${contact.city || ''}`.trim()}
                {@const phoneNum = contact.phone}

                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs transition-all hover:border-indigo-300 dark:hover:border-indigo-700 space-y-3.5">
                    
                    <!-- Header mit Status-Badge -->
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            {#if contact.company_name}
                                <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-0.5 truncate">
                                    {contact.company_name}
                                </span>
                            {/if}
                            <h3 class="text-base font-bold text-slate-900 dark:text-white truncate">
                                {contact.name_last ? `${contact.name_last}, ${contact.name_first || ''}` : (contact.company_name || 'Kontakt')}
                            </h3>
                        </div>

                        <!-- Visuelle Unterscheidung: Selbst erstellt (Editierbar) vs. Zugewiesen (Schreibgeschützt) -->
                        {#if isOwn}
                            <span class="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                                <Edit3 class="w-3 h-3" />
                                <span>Eigener Kontakt</span>
                            </span>
                        {:else}
                            <span class="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1 shrink-0">
                                <Lock class="w-3 h-3" />
                                <span>Zugewiesen (Read-Only)</span>
                            </span>
                        {/if}
                    </div>

                    <!-- Kontaktdaten -->
                    <div class="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {#if phoneNum}
                            <div class="flex items-center gap-2">
                                <Phone class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span class="font-semibold select-all">{phoneNum}</span>
                            </div>
                        {/if}
                        {#if contact.email}
                            <div class="flex items-center gap-2">
                                <Mail class="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span class="truncate select-all">{contact.email}</span>
                            </div>
                        {/if}
                        {#if address}
                            <div class="flex items-center gap-2">
                                <MapPin class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span class="truncate">{address}</span>
                            </div>
                        {/if}
                    </div>

                    <!-- Aktionen (Mindestens 44x44 px) -->
                    <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onclick={() => callContact(phoneNum)}
                            disabled={!phoneNum}
                            class="min-h-11 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                        >
                            <Phone class="w-3.5 h-3.5 text-emerald-500" />
                            <span>Anrufen</span>
                        </button>

                        <button
                            type="button"
                            onclick={() => openNavigation(address)}
                            disabled={!address}
                            class="min-h-11 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                        >
                            <Navigation class="w-3.5 h-3.5 text-indigo-500" />
                            <span>Route</span>
                        </button>

                        <button
                            type="button"
                            onclick={() => openContactModal(contact)}
                            class="min-h-11 px-2.5 py-2 rounded-xl {isOwn ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200'} text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                            {#if isOwn}
                                <Edit3 class="w-3.5 h-3.5" />
                                <span>Editieren</span>
                            {:else}
                                <Lock class="w-3.5 h-3.5" />
                                <span>Details</span>
                            {/if}
                        </button>
                    </div>

                </div>
            {/each}
        </div>
    {/if}

    <!-- Kontakt Detail- & Bearbeiten-Modal -->
    {#if isModalOpen}
        <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
                
                <!-- Modal Header -->
                <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl {isReadOnly ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600' : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600'} flex items-center justify-center font-bold">
                            {#if isReadOnly}
                                <Lock class="w-5 h-5" />
                            {:else}
                                <BookOpen class="w-5 h-5" />
                            {/if}
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-slate-900 dark:text-white">
                                {#if isReadOnly}
                                    Zugewiesener Kontakt (Schreibgeschützt)
                                {:else if isEditing}
                                    Eigenen Kontakt bearbeiten
                                {:else}
                                    Neuen Kontakt anlegen
                                {/if}
                            </h3>
                            <p class="text-xs text-slate-500">
                                {#if isReadOnly}
                                    Von Betriebsleitung zugewiesen • Keine Schreibberechtigung
                                {:else}
                                    Eigener Kontakt • Vollzugriff
                                {/if}
                            </p>
                        </div>
                    </div>
                    <button 
                        onclick={closeModal} 
                        aria-label="Schließen"
                        class="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <!-- Form -->
                <form onsubmit={handleSaveContact} class="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                    
                    {#if isReadOnly}
                        <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                            <ShieldAlert class="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                                <strong>Schreibschutz aktiv:</strong> Dieser Kontakt wurde Ihnen zugewiesen. Änderungen oder Löschungen können nur durch die Administration vorgenommen werden.
                            </span>
                        </div>
                    {/if}

                    <div class="space-y-1">
                        <label for="contact-salutation" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Anrede</label>
                        <select 
                            id="contact-salutation"
                            bind:value={salutation}
                            disabled={isReadOnly}
                            class="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs disabled:opacity-60"
                        >
                            <option value="Keine Angabe">Keine Angabe</option>
                            <option value="Herr">Herr</option>
                            <option value="Frau">Frau</option>
                            <option value="Divers">Divers</option>
                        </select>
                    </div>

                    <div class="space-y-1">
                        <label for="contact-company" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Firma / Praxis / Einrichtung</label>
                        <input 
                            id="contact-company"
                            type="text"
                            bind:value={company_name}
                            disabled={isReadOnly}
                            placeholder="z. B. Hausarztpraxis Dr. Schmidt"
                            class="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs disabled:opacity-60"
                        />
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1">
                            <label for="contact-firstname" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Vorname</label>
                            <input 
                                id="contact-firstname"
                                type="text"
                                bind:value={name_first}
                                disabled={isReadOnly}
                                placeholder="Vorname"
                                class="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs disabled:opacity-60"
                            />
                        </div>
                        <div class="space-y-1">
                            <label for="contact-lastname" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Nachname</label>
                            <input 
                                id="contact-lastname"
                                type="text"
                                bind:value={name_last}
                                disabled={isReadOnly}
                                placeholder="Nachname"
                                class="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs disabled:opacity-60"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1">
                            <label for="contact-phone" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Telefon</label>
                            <input 
                                id="contact-phone"
                                type="text"
                                bind:value={phone}
                                disabled={isReadOnly}
                                placeholder="0351 123456"
                                class="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs disabled:opacity-60"
                            />
                        </div>
                        <div class="space-y-1">
                            <label for="contact-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300">E-Mail</label>
                            <input 
                                id="contact-email"
                                type="email"
                                bind:value={email}
                                disabled={isReadOnly}
                                placeholder="praxis@beispiel.de"
                                class="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs disabled:opacity-60"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-2">
                        <div class="col-span-2 space-y-1">
                            <label for="contact-street" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Straße</label>
                            <input 
                                id="contact-street"
                                type="text"
                                bind:value={street}
                                disabled={isReadOnly}
                                placeholder="Straße"
                                class="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs disabled:opacity-60"
                            />
                        </div>
                        <div class="space-y-1">
                            <label for="contact-housenr" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Nr.</label>
                            <input 
                                id="contact-housenr"
                                type="text"
                                bind:value={housenr}
                                disabled={isReadOnly}
                                placeholder="Nr."
                                class="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs disabled:opacity-60"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-2">
                        <div class="space-y-1">
                            <label for="contact-zip" class="block text-xs font-bold text-slate-700 dark:text-slate-300">PLZ</label>
                            <input 
                                id="contact-zip"
                                type="text"
                                bind:value={zip}
                                disabled={isReadOnly}
                                placeholder="PLZ"
                                class="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs disabled:opacity-60"
                            />
                        </div>
                        <div class="col-span-2 space-y-1">
                            <label for="contact-city" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Stadt</label>
                            <input 
                                id="contact-city"
                                type="text"
                                bind:value={city}
                                disabled={isReadOnly}
                                placeholder="Stadt"
                                class="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs disabled:opacity-60"
                            />
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onclick={closeModal}
                            class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            {isReadOnly ? 'Schließen' : 'Abbrechen'}
                        </button>

                        {#if !isReadOnly}
                            <button
                                type="submit"
                                class="min-h-11 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
                            >
                                <Check class="w-4 h-4" />
                                <span>{isEditing ? 'Kontakt aktualisieren' : 'Kontakt erstellen'}</span>
                            </button>
                        {/if}
                    </div>
                </form>

            </div>
        </div>
    {/if}

</div>
