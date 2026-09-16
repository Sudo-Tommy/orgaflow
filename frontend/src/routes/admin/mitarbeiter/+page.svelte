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
    import { 
        Users, UserPlus, QrCode, Search, ArrowLeft, Shield, CheckCircle2, 
        Clock, Award, Phone, AlertCircle, Link, Edit3, Trash2, Calendar
    } from 'lucide-svelte';
    import type { UserRecord, EmployeeStatus } from '$lib/types/orgaTypes';

    // svelte-ignore non_reactive_update
    let employeeModal: ReturnType<typeof EmployeeModal>;
    // svelte-ignore non_reactive_update
    let assignmentModal: ReturnType<typeof EmployeeAssignmentModal>;
    // svelte-ignore non_reactive_update
    let qrModal: ReturnType<typeof EmployeeQrModal>;

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

    // Alle Mitarbeiter (Nutzer mit Rollen employee, caregiver, user oder admin)
    let allEmployees = $derived.by(() => {
        const users = orgaStore.users.data || [];
        return users.filter(u => rbacService.isRecordInScope(u, 'user'));
    });

    // Gefilterte Liste
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

    // KPIs
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
                class="min-h-11 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors flex items-center gap-2 shadow-2xs"
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
                onclick={() => employeeModal?.open()}
                class="min-h-11 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
                <UserPlus class="w-4 h-4" />
                <span>Neuer Mitarbeiter</span>
            </button>
        </div>
    </div>

    <!-- Header Card -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div class="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                <div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
                    <Shield class="w-4 h-4" />
                    <span>Rollenbasiertes Mitarbeiter-Management & Außendienst</span>
                </div>
                <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Mitarbeiter-Portal & Zuweisung</h1>
                <p class="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl">
                    Verwalten Sie Pflegekräfte und Betreuer, teilen Sie Klienten und schreibgeschützte Kontakte zu und generieren Sie direkte QR-Codes für den mobilen Schnellzugriff ohne Passworteingabe.
                </p>
            </div>
            <div class="flex items-center gap-2">
                <a 
                    href="/mitarbeiter" 
                    target="_blank" 
                    class="min-h-11 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 shadow-2xs"
                >
                    <QrCode class="w-4 h-4" />
                    <span>Mitarbeiterportal testen</span>
                </a>
            </div>
        </div>

        <!-- KPI Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
            <div class="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p class="text-xs font-medium text-slate-500">Mitarbeiter gesamt</p>
                <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</p>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p class="text-xs font-medium text-slate-500">Aktiv im Dienst</p>
                <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p class="text-xs font-medium text-slate-500">Klienten-Zuweisungen</p>
                <p class="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{totalAssignedClients}</p>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p class="text-xs font-medium text-slate-500">Heutige Einsätze</p>
                <p class="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{todayAppointmentsCount}</p>
            </div>
        </div>
    </div>

    <!-- Filter & Suchleiste -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        <!-- Status Filter Pills -->
        <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar w-full md:w-auto pb-1 md:pb-0">
            {#each [
                { id: 'all', label: 'Alle' },
                { id: 'Aktiv', label: '🟢 Aktiv' },
                { id: 'Urlaub', label: '🟡 Urlaub' },
                { id: 'Krank', label: '🔴 Krank' },
                { id: 'Inaktiv', label: '⚪ Inaktiv' }
            ] as tab}
                <button
                    type="button"
                    onclick={() => statusFilter = tab.id}
                    class="min-h-11 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap {statusFilter === tab.id ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}"
                >
                    {tab.label}
                </button>
            {/each}
        </div>

        <div class="flex items-center gap-3 w-full md:w-auto flex-1 md:justify-end">
            <!-- Anstellung Dropdown -->
            <select
                aria-label="Anstellungsverhältnis filtern"
                bind:value={employmentFilter}
                class="min-h-11 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
                <option value="all">Alle Anstellungen</option>
                <option value="Vollzeit">Vollzeit</option>
                <option value="Teilzeit">Teilzeit</option>
                <option value="Minijob">Minijob</option>
                <option value="Freiberuflich">Freiberuflich</option>
                <option value="Praktikum">Praktikum</option>
            </select>

            <!-- Search Input -->
            <div class="relative flex-1 max-w-md">
                <label for="search-employees" class="sr-only">Mitarbeiter suchen</label>
                <Search class="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input 
                    id="search-employees"
                    type="text" 
                    bind:value={searchQuery}
                    placeholder="Mitarbeiter suchen (Name, Mail, Qualifikation)..." 
                    class="w-full min-h-11 pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
            </div>
        </div>
    </div>

    <!-- Mitarbeiter-Liste -->
    {#if orgaStore.users?.isLoading}
        <div class="text-center py-16 text-slate-400 font-medium animate-pulse">Lade Mitarbeiter-Daten...</div>
    {:else if filteredEmployees.length === 0}
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
            <Users class="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">Keine Mitarbeiter gefunden</h3>
            <p class="text-sm text-slate-500 mt-1">Passen Sie die Filter an oder legen Sie einen neuen Mitarbeiter an.</p>
            <button 
                onclick={() => employeeModal?.open()} 
                class="mt-4 min-h-11 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
            >
                <UserPlus class="w-4 h-4" />
                <span>Neuen Mitarbeiter anlegen</span>
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {#each filteredEmployees as emp (emp.id)}
                {@const clientsCount = Array.isArray(emp.assigned_clients) ? emp.assigned_clients.length : 0}
                {@const contactsCount = Array.isArray(emp.assigned_contacts) ? emp.assigned_contacts.length : 0}
                {@const hasQr = Boolean(emp.quick_access_token)}

                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between group">
                    <div>
                        <!-- Card Header -->
                        <div class="flex items-start justify-between gap-3 mb-4">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-lg flex items-center justify-center shadow-xs shrink-0">
                                    {emp.name_first ? emp.name_first[0] : 'M'}{emp.name_last ? emp.name_last[0] : ''}
                                </div>
                                <div class="min-w-0">
                                    <h3 class="text-base font-bold text-slate-900 dark:text-white truncate">
                                        {emp.name_first} {emp.name_last}
                                    </h3>
                                    <p class="text-xs text-slate-500 truncate">{emp.email}</p>
                                </div>
                            </div>

                            <!-- Status Badge -->
                            <span class="text-xs font-bold px-2.5 py-1 rounded-xl shrink-0 {
                                emp.status === 'Urlaub' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                                emp.status === 'Krank' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                                emp.status === 'Inaktiv' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                                'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }">
                                {emp.status || 'Aktiv'}
                            </span>
                        </div>

                        <!-- Meta Info Pills -->
                        <div class="flex flex-wrap gap-2 mb-4 text-xs font-semibold">
                            <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {emp.employment_type || 'Vollzeit'}
                            </span>
                            <span class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                                Rolle: {emp.role || 'employee'}
                            </span>
                        </div>

                        <!-- Qualifikationen -->
                        {#if emp.qualifications}
                            <div class="mb-3">
                                <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <Award class="w-3 h-3 text-indigo-500" />
                                    <span>Qualifikationen</span>
                                </p>
                                <p class="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                                    {emp.qualifications}
                                </p>
                            </div>
                        {/if}

                        <!-- Zuweisungs-Zähler -->
                        <div class="grid grid-cols-2 gap-2 my-3">
                            <div class="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                                <span class="text-[11px] text-slate-500 block">Klienten</span>
                                <span class="text-base font-black text-indigo-600 dark:text-indigo-400">{clientsCount}</span>
                            </div>
                            <div class="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                                <span class="text-[11px] text-slate-500 block">Kontakte (Read-Only)</span>
                                <span class="text-base font-black text-amber-600 dark:text-amber-400">{contactsCount}</span>
                            </div>
                        </div>

                        <!-- QR Code Status Banner -->
                        <div class="mt-3 p-2.5 rounded-xl text-xs flex items-center justify-between {hasQr ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}">
                            <div class="flex items-center gap-1.5 truncate">
                                <QrCode class="w-4 h-4 shrink-0" />
                                <span class="truncate">
                                    {hasQr ? 'QR-Code aktiv' : 'Kein aktiver QR-Zugang'}
                                </span>
                            </div>
                            {#if hasQr && emp.token_expires_at}
                                <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                                    Bis {new Date(emp.token_expires_at).toLocaleDateString('de-DE')}
                                </span>
                            {/if}
                        </div>
                    </div>

                    <!-- Card Actions -->
                    <div class="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onclick={() => qrModal?.open(emp)}
                            class="min-h-11 flex-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-indigo-200 dark:border-indigo-800"
                        >
                            <QrCode class="w-4 h-4" />
                            <span>QR-Zugang</span>
                        </button>

                        <button
                            type="button"
                            onclick={() => assignmentModal?.open(emp)}
                            class="min-h-11 flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                            <Link class="w-4 h-4" />
                            <span>Zuweisen</span>
                        </button>

                        <button
                            type="button"
                            onclick={() => employeeModal?.open(emp)}
                            aria-label="Mitarbeiter bearbeiten"
                            title="Mitarbeiter bearbeiten"
                            class="min-h-11 min-w-11 px-2.5 py-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center"
                        >
                            <Edit3 class="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onclick={() => handleDeleteEmployee(emp)}
                            aria-label="Mitarbeiter unwiderruflich löschen"
                            title="Mitarbeiter löschen"
                            class="min-h-11 min-w-11 px-2.5 py-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center justify-center"
                        >
                            <Trash2 class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Modale -->
    <EmployeeModal bind:this={employeeModal} />
    <EmployeeAssignmentModal bind:this={assignmentModal} />
    <EmployeeQrModal bind:this={qrModal} />
</div>
