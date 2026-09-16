<script lang="ts">
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { employeeService } from '$lib/services/employeeService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { Users, BookOpen, Calendar, X, Search, Check, Lock, ShieldCheck, ArrowRight } from 'lucide-svelte';
    import type { UserRecord, ClientRecord, ContactRecord, AppointmentRecord } from '$lib/types/orgaTypes';

    let isOpen = $state(false);
    let currentEmployee: UserRecord | null = $state(null);
    let activeTab = $state<'clients' | 'contacts' | 'appointments'>('clients');

    let clientSearch = $state('');
    let contactSearch = $state('');

    // Lokale Checkbox-Zustände für Zuweisungen
    let selectedClientIds = $state<string[]>([]);
    let selectedContactIds = $state<string[]>([]);
    let syncAppointmentsWithClients = $state(true);

    export function open(employee: UserRecord) {
        currentEmployee = employee;
        isOpen = true;
        activeTab = 'clients';
        clientSearch = '';
        contactSearch = '';

        // Initialisiere ausgewählte Klienten
        selectedClientIds = Array.isArray(employee.assigned_clients) ? [...employee.assigned_clients] : [];
        
        // Initialisiere ausgewählte Kontakte
        selectedContactIds = Array.isArray(employee.assigned_contacts) ? [...employee.assigned_contacts] : [];

        // Zusätzlich prüfen, ob Kontakte den Mitarbeiter in assigned_employees haben
        const allContacts = orgaStore.contacts.data || [];
        allContacts.forEach(c => {
            if (Array.isArray(c.assigned_employees) && c.assigned_employees.includes(employee.id)) {
                if (!selectedContactIds.includes(c.id)) {
                    selectedContactIds.push(c.id);
                }
            }
        });
    }

    export function close() {
        isOpen = false;
        currentEmployee = null;
        selectedClientIds = [];
        selectedContactIds = [];
    }

    function toggleClient(id: string) {
        if (selectedClientIds.includes(id)) {
            selectedClientIds = selectedClientIds.filter(cId => cId !== id);
        } else {
            selectedClientIds = [...selectedClientIds, id];
        }
    }

    function toggleContact(id: string) {
        if (selectedContactIds.includes(id)) {
            selectedContactIds = selectedContactIds.filter(cId => cId !== id);
        } else {
            selectedContactIds = [...selectedContactIds, id];
        }
    }

    async function handleSaveClients() {
        if (!currentEmployee) return;
        const success = await employeeService.assignClients(currentEmployee.id, selectedClientIds, syncAppointmentsWithClients);
        if (success) {
            currentEmployee.assigned_clients = selectedClientIds;
        }
    }

    async function handleSaveContacts() {
        if (!currentEmployee) return;
        const success = await employeeService.assignContacts(currentEmployee.id, selectedContactIds);
        if (success) {
            currentEmployee.assigned_contacts = selectedContactIds;
        }
    }

    // Gefilterte Klienten
    let filteredClients = $derived.by(() => {
        const list = orgaStore.clients.data || [];
        if (!clientSearch) return list;
        const q = clientSearch.toLowerCase();
        return list.filter(c => 
            `${c.name_first || ''} ${c.name_last || ''}`.toLowerCase().includes(q) ||
            (c.city || '').toLowerCase().includes(q) ||
            (c.insurance_nr || '').toLowerCase().includes(q)
        );
    });

    // Gefilterte Kontakte
    let filteredContacts = $derived.by(() => {
        const list = orgaStore.contacts.data || [];
        if (!contactSearch) return list;
        const q = contactSearch.toLowerCase();
        return list.filter(c => 
            `${c.name_first || ''} ${c.name_last || ''}`.toLowerCase().includes(q) ||
            (c.company_name || '').toLowerCase().includes(q) ||
            (c.city || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q)
        );
    });

    // Zugewiesene Termine
    let employeeAppointments = $derived.by(() => {
        if (!currentEmployee) return [];
        const empId = currentEmployee.id;
        return (orgaStore.appointments.data || []).filter(a => 
            a.assigned_to === empId || a.user === empId
        );
    });
</script>

{#if isOpen && currentEmployee}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            
            <!-- Header -->
            <div class="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                        <Users class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                            Zuweisungs-Manager
                        </h3>
                        <p class="text-xs text-slate-500">
                            Klienten, Kontakte und Termine für <strong class="text-slate-700 dark:text-slate-300">{currentEmployee.name_first} {currentEmployee.name_last}</strong> verwalten
                        </p>
                    </div>
                </div>
                <button 
                    onclick={close} 
                    aria-label="Schließen"
                    class="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Tab Navigation -->
            <div class="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-2 bg-slate-50/30 dark:bg-slate-900/30 gap-2 shrink-0">
                <button 
                    type="button"
                    onclick={() => activeTab = 'clients'}
                    class="min-h-11 px-4 py-2 border-b-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 {activeTab === 'clients' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800'}"
                >
                    <Users class="w-4 h-4" />
                    <span>Klienten ({selectedClientIds.length})</span>
                </button>

                <button 
                    type="button"
                    onclick={() => activeTab = 'contacts'}
                    class="min-h-11 px-4 py-2 border-b-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 {activeTab === 'contacts' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800'}"
                >
                    <BookOpen class="w-4 h-4" />
                    <span>Kontakte ({selectedContactIds.length})</span>
                </button>

                <button 
                    type="button"
                    onclick={() => activeTab = 'appointments'}
                    class="min-h-11 px-4 py-2 border-b-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 {activeTab === 'appointments' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800'}"
                >
                    <Calendar class="w-4 h-4" />
                    <span>Einsätze ({employeeAppointments.length})</span>
                </button>
            </div>

            <!-- Tab Content -->
            <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
                
                <!-- === TAB: KLIENTEN === -->
                {#if activeTab === 'clients'}
                    <div class="space-y-4">
                        <div class="flex items-center justify-between gap-3 flex-wrap">
                            <div class="relative flex-1 min-w-48">
                                <label for="search-assign-clients" class="sr-only">Klienten durchsuchen</label>
                                <Search class="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <input 
                                    id="search-assign-clients"
                                    type="text" 
                                    bind:value={clientSearch}
                                    placeholder="Klienten durchsuchen..." 
                                    class="w-full min-h-11 pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <button
                                type="button"
                                onclick={handleSaveClients}
                                disabled={employeeService.isSubmitting}
                                class="min-h-11 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
                            >
                                <Check class="w-4 h-4" />
                                <span>Klienten-Zuweisung speichern</span>
                            </button>
                        </div>

                        <label class="flex items-center gap-2.5 p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl cursor-pointer">
                            <input 
                                type="checkbox"
                                bind:checked={syncAppointmentsWithClients}
                                class="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                            />
                            <span class="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                                Offene und zukünftige Termine dieser Klienten automatisch dem Mitarbeiter zuweisen (Termin-Sync)
                            </span>
                        </label>

                        <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto custom-scrollbar">
                            {#if filteredClients.length === 0}
                                <div class="p-8 text-center text-slate-400 text-sm">Keine passenden Klienten gefunden.</div>
                            {:else}
                                {#each filteredClients as client (client.id)}
                                    {@const isSelected = selectedClientIds.includes(client.id)}
                                    <label class="flex items-center justify-between p-3.5 hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors {isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''}">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <input 
                                                type="checkbox"
                                                checked={isSelected}
                                                onchange={() => toggleClient(client.id)}
                                                class="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                                            />
                                            <div class="min-w-0">
                                                <p class="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                    {client.name_last}, {client.name_first}
                                                </p>
                                                <p class="text-xs text-slate-500 truncate">
                                                    {client.street || ''} {client.housenr || ''}, {client.zip || ''} {client.city || ''}
                                                    {#if client.level_of_care}
                                                        • PG {client.level_of_care}
                                                    {/if}
                                                </p>
                                            </div>
                                        </div>
                                        <span class="text-xs font-bold px-2.5 py-1 rounded-lg {isSelected ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
                                            {isSelected ? 'Zugewiesen' : 'Nicht zugewiesen'}
                                        </span>
                                    </label>
                                {/each}
                            {/if}
                        </div>
                    </div>
                {/if}

                <!-- === TAB: KONTAKTE === -->
                {#if activeTab === 'contacts'}
                    <div class="space-y-4">
                        <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                            <Lock class="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                                <strong>DSGVO & GoBD Schutz:</strong> Zugewiesene Kontakte werden im Mitarbeiterportal mit einem Schloss-Symbol als <em>schreibgeschützt</em> dargestellt. Nur selbst angelegte Kontakte dürfen von Mitarbeitern editiert werden.
                            </span>
                        </div>

                        <div class="flex items-center justify-between gap-3 flex-wrap">
                            <div class="relative flex-1 min-w-48">
                                <label for="search-assign-contacts" class="sr-only">Kontakte durchsuchen</label>
                                <Search class="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <input 
                                    id="search-assign-contacts"
                                    type="text" 
                                    bind:value={contactSearch}
                                    placeholder="Kontakte durchsuchen..." 
                                    class="w-full min-h-11 pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <button
                                type="button"
                                onclick={handleSaveContacts}
                                disabled={employeeService.isSubmitting}
                                class="min-h-11 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
                            >
                                <Check class="w-4 h-4" />
                                <span>Kontakt-Zuweisung speichern</span>
                            </button>
                        </div>

                        <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto custom-scrollbar">
                            {#if filteredContacts.length === 0}
                                <div class="p-8 text-center text-slate-400 text-sm">Keine passenden Kontakte gefunden.</div>
                            {:else}
                                {#each filteredContacts as contact (contact.id)}
                                    {@const isSelected = selectedContactIds.includes(contact.id)}
                                    <label class="flex items-center justify-between p-3.5 hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors {isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''}">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <input 
                                                type="checkbox"
                                                checked={isSelected}
                                                onchange={() => toggleContact(contact.id)}
                                                class="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                                            />
                                            <div class="min-w-0">
                                                <p class="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                    {#if contact.company_name}
                                                        <span class="text-indigo-600 dark:text-indigo-400">[{contact.company_name}]</span>
                                                    {/if}
                                                    {contact.name_last}, {contact.name_first}
                                                </p>
                                                <p class="text-xs text-slate-500 truncate">
                                                    {contact.phone || contact.email || 'Keine Direkt-Kontaktdaten hinterlegt'} • {contact.city || ''}
                                                </p>
                                            </div>
                                        </div>
                                        <span class="text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 {isSelected ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
                                            {#if isSelected}
                                                <Lock class="w-3 h-3" />
                                                <span>Zugewiesen (Read-Only)</span>
                                            {:else}
                                                <span>Nicht zugewiesen</span>
                                            {/if}
                                        </span>
                                    </label>
                                {/each}
                            {/if}
                        </div>
                    </div>
                {/if}

                <!-- === TAB: TERMINE === -->
                {#if activeTab === 'appointments'}
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <p class="text-xs text-slate-500 font-medium">
                                Alle diesem Mitarbeiter zugewiesenen Einsätze ({employeeAppointments.length})
                            </p>
                        </div>

                        {#if employeeAppointments.length === 0}
                            <div class="p-8 text-center text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                Derzeit sind keine Einsätze für diesen Mitarbeiter hinterlegt.
                            </div>
                        {:else}
                            <div class="space-y-2.5 max-h-96 overflow-y-auto custom-scrollbar">
                                {#each employeeAppointments as appt (appt.id)}
                                    <div class="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-center justify-between gap-3">
                                        <div class="min-w-0">
                                            <p class="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                {appt.description || 'Pflege- & Betreuungseinsatz'}
                                            </p>
                                            <p class="text-xs text-slate-500">
                                                📅 {new Date(appt.appointment || '').toLocaleString('de-DE')}
                                                {#if appt.location_address}
                                                    • 📍 {appt.location_address}
                                                {/if}
                                            </p>
                                        </div>
                                        <span class="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
                                            Zugewiesen
                                        </span>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}

            </div>

            <!-- Footer -->
            <div class="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-end">
                <button 
                    type="button" 
                    onclick={close}
                    class="min-h-11 px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                    Schließen
                </button>
            </div>
        </div>
    </div>
{/if}
