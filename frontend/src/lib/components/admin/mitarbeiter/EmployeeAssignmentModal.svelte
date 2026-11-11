<script lang="ts">
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { employeeService } from '$lib/services/employeeService.svelte';
    import { Users, BookOpen, Calendar, X } from 'lucide-svelte';
    import type { UserRecord } from '$lib/types/orgaTypes';
    import EmployeeClientsTab from './EmployeeClientsTab.svelte';
    import EmployeeContactsTab from './EmployeeContactsTab.svelte';
    import EmployeeAppointmentsTab from './EmployeeAppointmentsTab.svelte';

    let isOpen = $state(false);
    let currentEmployee: UserRecord | null = $state(null);
    let activeTab = $state<'clients' | 'contacts' | 'appointments'>('clients');
    let dialog = $state<HTMLDialogElement | null>(null);

    let clientSearch = $state('');
    let contactSearch = $state('');

    let selectedClientIds = $state<string[]>([]);
    let selectedContactIds = $state<string[]>([]);
    let syncAppointmentsWithClients = $state(true);

    $effect(() => {
        if (isOpen && currentEmployee) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    });

    export function open(employee: UserRecord) {
        currentEmployee = employee;
        isOpen = true;
        activeTab = 'clients';
        clientSearch = '';
        contactSearch = '';

        selectedClientIds = Array.isArray(employee.assigned_clients) ? [...employee.assigned_clients] : [];
        selectedContactIds = Array.isArray(employee.assigned_contacts) ? [...employee.assigned_contacts] : [];

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

    let employeeAppointments = $derived.by(() => {
        if (!currentEmployee) return [];
        const empId = currentEmployee.id;
        return (orgaStore.appointments.data || []).filter(a => 
            a.assigned_to === empId || a.user === empId
        );
    });
</script>

{#if isOpen && currentEmployee}
    <dialog
        bind:this={dialog}
        class="zero-inner-scroll-modal fixed inset-0 m-auto w-full max-w-3xl bg-transparent p-3 sm:p-6 border-none outline-none backdrop:bg-slate-950/70 backdrop:backdrop-blur-xs animate-enter z-50 overflow-visible"
        onclick={(e) => { if (e.target === dialog) close(); }}
        oncancel={(e) => { e.preventDefault(); close(); }}
    >
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full my-6 sm:my-10 flex flex-col">
            <!-- Header -->
            <div class="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0 rounded-t-3xl">
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
                    class="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors touch-manipulation cursor-pointer"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Tab Navigation -->
            <div class="px-5 sm:px-6 pt-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <button 
                    type="button" 
                    onclick={() => activeTab = 'clients'}
                    class="py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer {activeTab === 'clients' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}"
                >
                    <Users class="w-4 h-4" />
                    <span>Klienten ({selectedClientIds.length})</span>
                </button>
                <button 
                    type="button" 
                    onclick={() => activeTab = 'contacts'}
                    class="py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer {activeTab === 'contacts' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}"
                >
                    <BookOpen class="w-4 h-4" />
                    <span>Kontakte ({selectedContactIds.length})</span>
                </button>
                <button 
                    type="button" 
                    onclick={() => activeTab = 'appointments'}
                    class="py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer {activeTab === 'appointments' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}"
                >
                    <Calendar class="w-4 h-4" />
                    <span>Termine ({employeeAppointments.length})</span>
                </button>
            </div>

            <!-- Tab Content -->
            <div class="p-5 sm:p-6 space-y-4 flex-1">
                {#if activeTab === 'clients'}
                    <EmployeeClientsTab
                        bind:clientSearch
                        bind:selectedClientIds
                        bind:syncAppointmentsWithClients
                        {filteredClients}
                        isSubmitting={employeeService.isSubmitting}
                        onSave={handleSaveClients}
                        onToggleClient={toggleClient}
                    />
                {:else if activeTab === 'contacts'}
                    <EmployeeContactsTab
                        bind:contactSearch
                        bind:selectedContactIds
                        {filteredContacts}
                        isSubmitting={employeeService.isSubmitting}
                        onSave={handleSaveContacts}
                        onToggleContact={toggleContact}
                    />
                {:else if activeTab === 'appointments'}
                    <EmployeeAppointmentsTab {employeeAppointments} />
                {/if}
            </div>

            <!-- Footer -->
            <div class="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-end rounded-b-3xl">
                <button 
                    type="button" 
                    onclick={close}
                    class="min-h-11 px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                    Schließen
                </button>
            </div>
        </div>
    </dialog>
{/if}
