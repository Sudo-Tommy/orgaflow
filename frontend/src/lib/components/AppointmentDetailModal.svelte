<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { createAppointmentDetailState } from "./appointmentDetail/appointmentDetailState.svelte";
    import * as appService from "./appointmentDetail/appointmentDetailService";
    import { deleteSingleAppointment, deleteAppointmentSeries } from "./appointmentDetail/appointmentDeleteService";
    import AppointmentDetailHeader from "./appointmentDetail/AppointmentDetailHeader.svelte";
    import AppointmentDetailTabs from "./appointmentDetail/AppointmentDetailTabs.svelte";
    import AppointmentDetailBody from "./appointmentDetail/AppointmentDetailBody.svelte";
    import AppointmentDetailModals from "./appointmentDetail/AppointmentDetailModals.svelte";

    let dialog: HTMLDialogElement;
    const s = createAppointmentDetailState();
    let modals: ReturnType<typeof AppointmentDetailModals>;

    export function open(id: string) {
        if (!id || id.startsWith('google_')) return;
        s.openAppointment(id);
        dialog?.showModal();
    }
    export function close() { s.closeAppointment(); dialog?.close(); }
</script>

<dialog 
    bind:this={dialog} 
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-neutral-900/60 backdrop:backdrop-blur-sm w-full max-w-3xl mx-auto my-auto rounded-3xl shadow-2xl z-50 outline-none" 
    onclick={(e) => { if (e.target === dialog) close(); }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl w-full flex flex-col relative border border-neutral-100 dark:border-slate-800 shadow-2xl transition-colors">
        <AppointmentDetailHeader
            appointment={s.appointment} runningTimeRecord={s.runningTimeRecord} isSuperAdmin={s.isSuperAdmin}
            currentUserId={pb.authStore.model?.id} client={s.fullClient || s.client} onClose={close}
            onToggleSettled={() => s.appointment && appService.toggleAppointmentSettled(s.appointment.id, Boolean(s.appointment.settled))}
            onTogglePrivate={() => s.appointment && appService.toggleAppointmentPrivate(s.appointment.id, Boolean(s.appointment.is_private))}
            onToggleVisibility={() => s.appointment && appService.toggleAppointmentVisibility(s.appointment.id, Boolean(s.appointment.is_visible))}
            onOpenCancelModal={() => modals?.openCancel()}
            onOpenFollowUp={() => modals?.openFollowUp(s.appointment)}
            onOpenRequest={() => modals?.openRequest(s.appointment)}
            onOpenReminder={() => modals?.openReminder(s.appointment, s.fullClient)}
            onToggleBillingType={() => s.appointment && appService.cycleBillingType(s.appointment.id, s.appointment.billing_type || '')}
            onDeleteSingle={() => s.appointment && deleteSingleAppointment(s.appointment, close)}
            onDeleteSeries={() => s.appointment && deleteAppointmentSeries(s.appointment, close)}
            onSelectTab={(t) => s.currentTab = t}
        />

        <AppointmentDetailTabs
            currentTab={s.currentTab} runningTimeRecord={s.runningTimeRecord} totalRecordedMinutes={s.totalRecordedMinutes}
            taskCount={s.tasks.length} voiceRecordCount={s.appointment?.voice_records?.length || 0} totalKm={s.totalKm}
            expenditureCount={s.expenditures.length} totalExpenditure={s.totalExpenditure} billingType={s.appointment?.billing_type}
            hasDestinationAddress={Boolean(s.route.activeDestinationAddress)} onSelectTab={(t) => s.currentTab = t}
        />

        <div class="p-4 sm:p-6 flex-1">
            {#if !s.appointment}
                <div class="flex flex-col items-center justify-center py-20">
                    <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                    <p class="text-xs text-neutral-500 font-bold">Laden...</p>
                </div>
            {:else}
                <AppointmentDetailBody {s} {modals} />
            {/if}
        </div>
    </div>
</dialog>

<AppointmentDetailModals 
    bind:this={modals} 
    appointment={s.appointment} 
    onRefresh={() => s.appointment?.id && s.openAppointment(s.appointment.id)} 
    onBeforeEdit={() => dialog?.close()}
    onReopenAfterEdit={() => {
        if (s.appointment?.id) {
            s.openAppointment(s.appointment.id);
            dialog?.showModal();
        }
    }}
    onAiSave={() => {}} 
/>