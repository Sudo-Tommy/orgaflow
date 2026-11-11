<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { rbacService } from '$lib/services/rbacService.svelte';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { confirmStore } from '$lib/services/confirmService.svelte';
    import { employeeService } from '$lib/services/employeeService.svelte';
    import EmployeeModal from '$lib/components/admin/mitarbeiter/EmployeeModal.svelte';
    import EmployeeAssignmentModal from '$lib/components/admin/mitarbeiter/EmployeeAssignmentModal.svelte';
    import EmployeeQrModal from '$lib/components/admin/mitarbeiter/EmployeeQrModal.svelte';
    import EmployeeHeaderKpiBanner from '$lib/components/admin/mitarbeiter/EmployeeHeaderKpiBanner.svelte';
    import EmployeeFilterBar from '$lib/components/admin/mitarbeiter/EmployeeFilterBar.svelte';
    import EmployeeCard from '$lib/components/admin/mitarbeiter/EmployeeCard.svelte';
    import EmployeeOnboardingModal from '$lib/components/admin/mitarbeiter/EmployeeOnboardingModal.svelte';
    import { Users, UserPlus, ArrowLeft, Link as LinkIcon } from 'lucide-svelte';
    import type { UserRecord } from '$lib/types/orgaTypes';

    // svelte-ignore non_reactive_update
    let employeeModal: ReturnType<typeof EmployeeModal>;
    // svelte-ignore non_reactive_update
    let assignmentModal: ReturnType<typeof EmployeeAssignmentModal>;
    // svelte-ignore non_reactive_update
    let qrModal: ReturnType<typeof EmployeeQrModal>;
    // svelte-ignore non_reactive_update
    let onboardingModal: ReturnType<typeof EmployeeOnboardingModal>;

    let searchQuery = $state('');
    let statusFilter = $state<string>('all');
    let employmentFilter = $state<string>('all');

    $effect(() => {
        if (!rbacService.canAccessAdmin) {
            toastStore.warning('Keine Berechtigung für das Mitarbeiter-Verwaltungsportal.');
            goto('/dashboard');
        }
    });

    onMount(async () => {
        await Promise.allSettled([
            orgaStore.users.init(),
            orgaStore.clients.init(),
            orgaStore.contacts.init(),
            orgaStore.appointments.init()
        ]);
    });

    async function handleDeleteEmployee(emp: UserRecord) {
        const confirmed = await confirmStore.ask(
            `Möchten Sie den Mitarbeiter "${emp.name_first} ${emp.name_last}" (${emp.email}) wirklich unwiderruflich löschen? Alle Zugänge und QR-Token werden sofort deaktiviert.`,
            'Mitarbeiter löschen',
            'Unwiderruflich löschen',
            'Abbrechen',
            true
        );

        if (confirmed) {
            await employeeService.deleteEmployee(emp.id);
        }
    }

    let allEmployees = $derived.by(() => {
        const users = orgaStore.users.data || [];
        return users.filter(u => rbacService.isRecordInScope(u, 'user'));
    });

    let filteredEmployees = $derived.by(() => {
        let list = allEmployees;

        if (statusFilter !== 'all') {
            list = list.filter(u => (u.status || 'Aktiv') === statusFilter);
        }

        if (employmentFilter !== 'all') {
            list = list.filter(u => u.employment_type === employmentFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(u => 
                `${u.name_first || ''} ${u.name_last || ''}`.toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.qualifications || '').toLowerCase().includes(q) ||
                (u.city || '').toLowerCase().includes(q)
            );
        }

        return list;
    });

    let totalCount = $derived(allEmployees.length);
    let activeCount = $derived(allEmployees.filter(u => (u.status || 'Aktiv') === 'Aktiv').length);
    let totalAssignedClients = $derived.by(() => {
        let count = 0;
        allEmployees.forEach(u => {
            if (Array.isArray(u.assigned_clients)) count += u.assigned_clients.length;
        });
        return count;
    });
    let todayAppointmentsCount = $derived.by(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        return (orgaStore.appointments.data || []).filter(a => 
            (a.appointment || '').startsWith(todayStr)
        ).length;
    });
</script>

<svelte:head>
    <title>Mitarbeiter-Verwaltung & QR-Zugang | OrgaFlow</title>
</svelte:head>

<div class="space-y-6 animate-enter max-w-7xl mx-auto pb-16">
    <!-- Top Bar & Breadcrumb -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
            <a 
                href="/admin" 
                class="min-h-11 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors flex items-center gap-2 shadow-2xs touch-manipulation"
            >
                <ArrowLeft class="w-4 h-4" />
                <span>Zurück zur Administration</span>
            </a>
            <div class="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>
            <div class="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span>Administration</span>
                <span>/</span>
                <span class="text-slate-900 dark:text-white font-bold">Mitarbeiter-Verwaltung</span>
            </div>
        </div>

        <div class="flex items-center gap-3">
            <button 
                type="button"
                onclick={() => onboardingModal?.open()}
                class="min-h-11 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-2 cursor-pointer touch-manipulation active:scale-95"
            >
                <LinkIcon class="w-4 h-4" />
                <span>Mitarbeiter-Einladungslink</span>
            </button>
            <button 
                type="button"
                onclick={() => employeeModal?.open()}
                class="min-h-11 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer touch-manipulation active:scale-95"
            >
                <UserPlus class="w-4 h-4" />
                <span>Neuer Mitarbeiter</span>
            </button>
        </div>
    </div>

    <!-- Header & KPI Banner -->
    <EmployeeHeaderKpiBanner
        {totalCount}
        {activeCount}
        {totalAssignedClients}
        {todayAppointmentsCount}
    />

    <!-- Filter & Suchleiste -->
    <EmployeeFilterBar
        bind:statusFilter
        bind:employmentFilter
        bind:searchQuery
    />

    <!-- Mitarbeiter-Liste -->
    {#if orgaStore.users?.isLoading}
        <div class="text-center py-16 text-slate-400 font-medium animate-pulse">Lade Mitarbeiter-Daten...</div>
    {:else if filteredEmployees.length === 0}
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
            <Users class="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">Keine Mitarbeiter gefunden</h3>
            <p class="text-sm text-slate-500 mt-1">Passen Sie die Filter an oder legen Sie einen neuen Mitarbeiter an.</p>
            <button 
                type="button"
                onclick={() => employeeModal?.open()} 
                class="mt-4 min-h-11 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2 cursor-pointer touch-manipulation active:scale-95"
            >
                <UserPlus class="w-4 h-4" />
                <span>Neuen Mitarbeiter anlegen</span>
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {#each filteredEmployees as emp (emp.id)}
                <EmployeeCard
                    {emp}
                    onOpenQr={(e) => qrModal?.open(e)}
                    onOpenAssignment={(e) => assignmentModal?.open(e)}
                    onEdit={(e) => employeeModal?.open(e)}
                    onDelete={handleDeleteEmployee}
                />
            {/each}
        </div>
    {/if}

    <!-- Modale -->
    <EmployeeModal bind:this={employeeModal} />
    <EmployeeAssignmentModal bind:this={assignmentModal} />
    <EmployeeQrModal bind:this={qrModal} />
    <EmployeeOnboardingModal bind:this={onboardingModal} />
</div>
