<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { isWorkAppointment } from "$lib/services/dashboardStats";
    import DashboardGoogleItem from "./DashboardGoogleItem.svelte";
    import DashboardAppointmentItem from "./DashboardAppointmentItem.svelte";

    let {
        appointmentViewTab = $bindable<'today' | 'upcoming'>('today'),
        todaysAppointments = [],
        upcoming7DaysAppointments = [],
        currentList = [],
        todaysWorkAppointmentsCount = 0,
        isAdmin = false,
        isSuperAdmin = false,
        dashboardUserFilter = $bindable<'mine' | 'all' | string>('mine'),
        dashboardUsers = [],
        onNewAppointment,
        onOpenDetail,
        onOpenFollowUp,
        onOpenGoogleDetail
    }: {
        appointmentViewTab: 'today' | 'upcoming';
        todaysAppointments: any[];
        upcoming7DaysAppointments: any[];
        currentList: any[];
        todaysWorkAppointmentsCount?: number;
        isAdmin: boolean;
        isSuperAdmin: boolean;
        dashboardUserFilter: 'mine' | 'all' | string;
        dashboardUsers: any[];
        onNewAppointment: () => void;
        onOpenDetail: (id: string) => void;
        onOpenFollowUp: (app: any) => void;
        onOpenGoogleDetail: (app: any) => void;
    } = $props();

    let selectedAppId = $state<string | null>(null);
</script>

<div id="appointments-section" class="orga-card-white p-5 sm:p-6 animate-enter delay-100 flex flex-col xl:col-span-1 scroll-mt-6">
    <!-- Tab Header -->
    <div class="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-neutral-100 dark:border-slate-800 flex-wrap sm:flex-nowrap">
        <div class="flex bg-neutral-100 dark:bg-slate-800/80 p-1 rounded-xl max-w-full overflow-x-auto border border-neutral-200/50 dark:border-slate-700/50">
            <button 
                type="button" 
                onclick={() => appointmentViewTab = 'today'}
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer {appointmentViewTab === 'today' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs' : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'}"
            >
                📅 Heute ({todaysWorkAppointmentsCount})
            </button>
            <button 
                type="button" 
                onclick={() => appointmentViewTab = 'upcoming'}
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer {appointmentViewTab === 'upcoming' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs' : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'}"
            >
                🗓️ Nächste 7 Tage ({upcoming7DaysAppointments.filter(isWorkAppointment).length})
            </button>
        </div>
        <button 
            type="button" 
            onclick={onNewAppointment} 
            class="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 dark:border dark:border-indigo-800/60 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
            title="Neuen Termin erstellen"
        >
            + Neu
        </button>
    </div>

    <!-- Admin-Filter: Wessen Termine? -->
    {#if isAdmin && appointmentViewTab === 'today'}
        <div class="mb-3 flex items-center gap-2 flex-wrap">
            <span class="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-wider shrink-0">Anzeigen:</span>
            <div class="flex items-center gap-1 flex-wrap">
                <button
                    type="button"
                    onclick={() => dashboardUserFilter = 'mine'}
                    class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer {dashboardUserFilter === 'mine' ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs' : 'bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border-neutral-200 dark:border-slate-700'}"
                >
                    👤 Meine
                </button>
                <button
                    type="button"
                    onclick={() => dashboardUserFilter = 'all'}
                    class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer {dashboardUserFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs' : 'bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border-neutral-200 dark:border-slate-700'}"
                >
                    👥 Alle
                </button>
                {#each dashboardUsers.filter(u => u.id !== pb.authStore.model?.id) as u}
                    <button
                        type="button"
                        onclick={() => dashboardUserFilter = u.id}
                        class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer {dashboardUserFilter === u.id ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs' : 'bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border-neutral-200 dark:border-slate-700'}"
                        title="{u.name_first} {u.name_last}"
                    >
                        {u.name_first?.charAt(0)}{u.name_last?.charAt(0) ?? ''}
                    </button>
                {/each}
            </div>
        </div>
    {/if}

    {#if currentList.length === 0}
        <div class="flex flex-col items-center justify-center py-10 text-center h-full opacity-90">
            <span class="text-3xl mb-2">🎉</span>
            <p class="text-sm font-bold text-slate-800 dark:text-slate-200">Keine Termine</p>
            <p class="text-xs text-slate-400 mt-1 max-w-[200px]">Für diesen Zeitraum stehen aktuell keine Einsätze an.</p>
        </div>
    {:else}
        <div class="space-y-3 flex-1 pr-1 zero-inner-scroll">
            {#each currentList as app (app.id)}
                {#if app.is_google || app.isGoogle || app.id?.startsWith('google_')}
                    <DashboardGoogleItem {app} {onOpenGoogleDetail} />
                {:else}
                    <DashboardAppointmentItem 
                        {app}
                        isSelected={selectedAppId === app.id}
                        {isAdmin}
                        {isSuperAdmin}
                        {appointmentViewTab}
                        onToggleSelect={(id) => selectedAppId = selectedAppId === id ? null : id}
                        {onOpenDetail}
                        {onOpenFollowUp}
                    />
                {/if}
            {/each}
        </div>
    {/if}
</div>
