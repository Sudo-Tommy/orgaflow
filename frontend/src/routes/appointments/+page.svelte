<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import Calendar from "$lib/components/Calendar.svelte";
    import AppointmentModal from "$lib/components/AppointmentModal.svelte";
    import { useRequestAdmin } from "$lib/services/requestAdminService.svelte";
    import AppointmentRequestsModal from "$lib/components/AppointmentRequestsModal.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { onMount } from "svelte";

    const reqAdmin = useRequestAdmin();

    // svelte-ignore non_reactive_update
    let appointmentModal: ReturnType<typeof AppointmentModal>;
    let requestsModal: any = $state();

    let pendingRequests = $derived(
        rbacService.isAdmin
            ? reqAdmin.requests.filter(r => r.status !== 'accepted' && r.status !== 'denied').length
            : 0
    );

    let scopedAppointments = $derived(
        (orgaStore.appointments?.data || []).filter((a: any) => rbacService.isRecordInScope(a, 'appointment'))
    );
    let scopedClients = $derived(
        (orgaStore.clients?.data || []).filter((c: any) => rbacService.isRecordInScope(c, 'client'))
    );

    onMount(() => {
        if (rbacService.isAdmin) {
            reqAdmin.init();
        }
    });

    function handleNewAppointment(date?: Date) {
        appointmentModal?.open(date);
    }
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Terminkalender</h1>
        <p class="orga-page-subtitle">
            Alle Einsätze, Besuche und Termine im Überblick.
        </p>
    </div>
    <button
        onclick={() => handleNewAppointment()}
        class="orga-button-primary hidden sm:inline-flex w-auto justify-center py-2.5 cursor-pointer"
    >
        <svg
            class="w-5 h-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 4v16m8-8H4"
            /></svg
        >
        Neuer Termin
    </button>
</div>

{#if pendingRequests > 0}
    <div class="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-enter">
        <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xl shrink-0">
                📬
            </div>
            <div class="min-w-0">
                <p class="text-sm font-bold text-amber-950 dark:text-amber-200 truncate">
                    {pendingRequests} offene Terminanfrage{pendingRequests > 1 ? 'n' : ''}
                </p>
                <p class="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                    Neue Anfragen von der Website warten auf Prüfung und Zuweisung.
                </p>
            </div>
        </div>
        <button
            type="button"
            onclick={() => requestsModal?.open()}
            class="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 active:scale-95 cursor-pointer text-center"
        >
            Anfragen ansehen &amp; bearbeiten
        </button>
    </div>
{/if}

<div class="animate-enter delay-100">
    <Calendar
        appointments={scopedAppointments}
        clients={scopedClients}
        onNewAppointment={handleNewAppointment}
    />
</div>

<AppointmentModal bind:this={appointmentModal} />
<AppointmentRequestsModal bind:this={requestsModal} />
