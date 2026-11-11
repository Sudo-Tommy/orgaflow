<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { triggerAutoChecklistGeneration } from "./appointmentDetail/appointmentChecklistService";
    import {
        computeFollowUpDescription,
        getLocalDateString,
        calculateEndTime,
        checkAppointmentCollision,
        extractStartTimeAndDuration
    } from "./followUp/followUpHelpers";
    import FollowUpDateTimeSection from "./followUp/FollowUpDateTimeSection.svelte";
    import FollowUpDetailsSection from "./followUp/FollowUpDetailsSection.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    // Ausgangs-Termin & Klient
    let sourceAppointment = $state<any>(null);
    let selectedClient = $state<any>(null);

    // Formular-State
    let description = $state("");
    let targetDate = $state("");
    let startTime = $state("09:00");
    let durationMinutes = $state(90);
    let locationAddress = $state("");
    let internalNotes = $state("");
    let selectedTasks = $state<string[]>([]);
    let selectedUserId = $state("");

    let clientName = $derived(
        selectedClient ? `${selectedClient.name_first} ${selectedClient.name_last}`.trim() : 'Klient'
    );
    let endTime = $derived(calculateEndTime(startTime, durationMinutes));
    let collisionWarning = $derived(
        checkAppointmentCollision(orgaStore.appointments?.data, targetDate, startTime, endTime, selectedUserId)
    );

    export function open(sourceApp: any) {
        const myUserId = pb.authStore.model?.id;
        const isAdmin = pb.authStore.isSuperuser || pb.authStore.model?.role === 'developer' || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin';
        
        if (sourceApp) {
            const isMyApp = sourceApp.user === myUserId || (Array.isArray(sourceApp.user) && sourceApp.user.includes(myUserId));
            if (!isMyApp && !isAdmin) {
                toastStore.error("Ein schneller Folgetermin kann nur für eigene Termine oder durch Administratoren vereinbart werden.");
                return;
            }
        }

        sourceAppointment = sourceApp;
        errorMsg = "";
        
        const clientId = Array.isArray(sourceApp?.client) ? sourceApp.client[0] : sourceApp?.client;
        selectedClient = orgaStore.clients?.data?.find((c: any) => c.id === clientId) || sourceApp?.expand?.client;

        if (sourceApp) {
            const parsed = extractStartTimeAndDuration(sourceApp);
            startTime = parsed.startTime;
            durationMinutes = parsed.durationMinutes;

            const baseDate = sourceApp.appointment ? new Date(sourceApp.appointment) : new Date();
            const nextWeek = new Date(baseDate);
            nextWeek.setDate(nextWeek.getDate() + 7);
            targetDate = getLocalDateString(nextWeek);

            description = sourceApp.description || "";
            locationAddress = sourceApp.location_address || "";
            internalNotes = sourceApp.internal_notes || "";
            selectedTasks = Array.isArray(sourceApp.tasks) ? [...sourceApp.tasks] : [];
            selectedUserId = Array.isArray(sourceApp.user) ? sourceApp.user[0] : (sourceApp.user || myUserId || "");
        } else {
            const defaultDate = new Date();
            defaultDate.setDate(defaultDate.getDate() + 7);
            targetDate = getLocalDateString(defaultDate);
            startTime = "09:00";
            durationMinutes = 90;
            description = "";
            locationAddress = "";
            internalNotes = "";
            selectedTasks = [];
            selectedUserId = myUserId || "";
        }

        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function handleSave() {
        if (!targetDate || !startTime) {
            errorMsg = "Bitte Datum und Uhrzeit angeben.";
            return;
        }

        isLoading = true;
        errorMsg = "";

        try {
            const startDateTime = new Date(`${targetDate}T${startTime}:00`);
            const endDateTime = new Date(`${targetDate}T${endTime}:00`);
            const clientId = selectedClient?.id || (Array.isArray(sourceAppointment?.client) ? sourceAppointment.client[0] : sourceAppointment?.client);
            const finalDesc = description.trim() || computeFollowUpDescription(sourceAppointment?.description, clientName);

            const newAppointment = await pb.collection('appointments').create({
                appointment: startDateTime.toISOString(),
                appointment_end: endDateTime.toISOString(),
                description: finalDesc,
                client: clientId ? [clientId] : [],
                user: selectedUserId ? [selectedUserId] : [],
                location_address: locationAddress,
                internal_notes: internalNotes,
                tasks: selectedTasks,
                is_private: false,
                settled: false,
                status: 'offen',
                time_record: []
            });

            const expandedRecord = await pb.collection('appointments').getOne(newAppointment.id, {
                expand: 'client,user,time_record,drive_record,tasks',
                requestKey: null
            });
            if (orgaStore.appointments?.data) {
                orgaStore.appointments.data.unshift(expandedRecord as any);
            }

            if (navigator.vibrate) navigator.vibrate(50);
            toastStore.success(`Folgetermin für ${clientName} am ${new Date(targetDate).toLocaleDateString('de-DE')} um ${startTime} Uhr gebucht!`);
            close();

            triggerAutoChecklistGeneration(newAppointment.id, {
                previousAppointmentId: sourceAppointment?.id,
                isPrivate: false
            });
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Erstellen des Folgetermins.";
            toastStore.error(errorMsg);
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog 
    bind:this={dialog} 
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-neutral-900/60 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-4 sm:my-8 landscape:my-2 rounded-3xl border-none shadow-2xl z-60 outline-none"
    onclick={(e) => { if (e.target === dialog) close(); }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-slate-800 w-full flex flex-col relative overflow-hidden transition-colors">
        <div class="p-4 sm:p-6 bg-gradient-to-r from-indigo-500/10 via-sky-500/5 to-transparent border-b border-neutral-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 text-lg shrink-0">
                    ⚡
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                            Folgetermin
                        </span>
                        {#if selectedClient}
                            <span class="text-[10px] font-semibold text-neutral-400 dark:text-slate-400 truncate max-w-[180px]">
                                {clientName}
                            </span>
                        {/if}
                    </div>
                    <h3 class="text-base sm:text-lg font-bold text-neutral-900 dark:text-white mt-0.5 line-clamp-1">
                        Schneller Folgetermin
                    </h3>
                </div>
            </div>
            <button 
                type="button" 
                onclick={close} 
                class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-300 flex items-center justify-center transition-colors text-sm shrink-0 cursor-pointer"
                title="Schließen"
                aria-label="Schließen"
            >✕</button>
        </div>

        <div class="p-4 sm:p-6 space-y-4 flex-1">
            {#if errorMsg}
                <div class="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold rounded-2xl border border-red-200 dark:border-red-900/60 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{errorMsg}</span>
                </div>
            {/if}

            <FollowUpDateTimeSection 
                bind:targetDate 
                bind:startTime 
                bind:durationMinutes 
                {endTime} 
                {sourceAppointment} 
                {collisionWarning} 
            />

            <FollowUpDetailsSection 
                bind:description 
                bind:locationAddress 
                bind:internalNotes 
                {clientName} 
            />
        </div>

        <div class="p-3 sm:p-4 bg-neutral-50 dark:bg-slate-900/80 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button 
                type="button" 
                onclick={close} 
                class="orga-button-ghost py-2 sm:py-2.5 px-3 sm:px-4 text-xs dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                disabled={isLoading}
            >
                Schließen
            </button>
            <button 
                type="button" 
                onclick={handleSave} 
                class="orga-button-primary py-2 sm:py-2.5 px-4 sm:px-5 text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                disabled={isLoading}
            >
                {#if isLoading}
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Wird gebucht...</span>
                {:else}
                    <span>⚡ Folgetermin buchen</span>
                {/if}
            </button>
        </div>
    </div>
</dialog>
