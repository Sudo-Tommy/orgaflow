<script lang="ts">
    import { Users, User } from "lucide-svelte";
    import PortalClientMainCard from "./PortalClientMainCard.svelte";
    import PortalClientAppointments from "./PortalClientAppointments.svelte";
    import PortalClientCaregivers from "./PortalClientCaregivers.svelte";
    import PortalClientEmergencyContacts from "./PortalClientEmergencyContacts.svelte";

    let {
        myClients = [],
        filteredMyClients = [],
        selectedContactClientId = $bindable(""),
        clientSearchQuery = $bindable(""),
        activeClientRecord = null,
        appointments = [],
        onSelectAppointment = () => {},
        onRequestAppointment = () => {},
        onEditClient = () => {},
        onAddContact = () => {},
        onEditContact = () => {},
        onDeleteContact = () => {}
    }: {
        myClients?: any[];
        filteredMyClients?: any[];
        selectedContactClientId?: string;
        clientSearchQuery?: string;
        activeClientRecord?: any;
        appointments?: any[];
        onSelectAppointment?: (app: any) => void;
        onRequestAppointment?: () => void;
        onEditClient?: (c: any) => void;
        onAddContact?: () => void;
        onEditContact?: (c: any) => void;
        onDeleteContact?: (id: string) => void;
    } = $props();
</script>

<div class="space-y-6 animate-enter">
    {#if myClients.length > 1}
        <div class="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Users class="w-5 h-5 text-indigo-600" /> Klient auswählen ({myClients.length} Klienten)
                    </h2>
                    <p class="text-xs text-slate-500 mt-0.5">Wählen Sie den Klienten aus, dessen Termine und Kontakte Sie verwalten möchten.</p>
                </div>
                <div class="w-full md:w-72">
                    <input type="text" bind:value={clientSearchQuery} placeholder="Klient suchen..." class="orga-input-clear py-2 text-xs" />
                </div>
            </div>
            <div class="flex items-center gap-2 overflow-x-auto custom-scrollbar mt-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                {#each filteredMyClients as c}
                    <button type="button" onclick={() => selectedContactClientId = c.id} class="px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border {selectedContactClientId === c.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}">
                        <span class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{(c.name_first?.charAt(0) || '')}{(c.name_last?.charAt(0) || '')}</span>
                        <span>{c.name_first} {c.name_last}</span>
                    </button>
                {/each}
            </div>
        </div>
    {/if}

    {#if !activeClientRecord}
        <div class="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center text-slate-500">
            <User class="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
            <p class="font-bold text-base text-slate-700 dark:text-slate-300">Keine Klientendaten gefunden.</p>
        </div>
    {:else}
        <PortalClientMainCard client={activeClientRecord} onEdit={() => onEditClient(activeClientRecord)} {onRequestAppointment} />
        <PortalClientAppointments client={activeClientRecord} {appointments} {onSelectAppointment} {onRequestAppointment} />
        <PortalClientCaregivers client={activeClientRecord} />
        <PortalClientEmergencyContacts client={activeClientRecord} {onAddContact} {onEditContact} {onDeleteContact} />
    {/if}
</div>
