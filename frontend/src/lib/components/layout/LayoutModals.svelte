<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import ToastLayer from "$lib/components/ToastLayer.svelte";
    import ConfirmLayer from "$lib/components/ConfirmLayer.svelte";
    import UpdateLogModal from "$lib/components/UpdateLogModal.svelte";
    import AppointmentDetailModal from "$lib/components/AppointmentDetailModal.svelte";
    import AppointmentCompleteModal from "$lib/components/appointmentDetail/AppointmentCompleteModal.svelte";
    import FollowUpAppointmentModal from "$lib/components/FollowUpAppointmentModal.svelte";
    import SunCycleModal from "$lib/components/SunCycleModal.svelte";
    import FeedbackWidget from "$lib/components/FeedbackWidget.svelte";
    import UserSwitchModal from "$lib/components/UserSwitchModal.svelte";
    import SystemDialogOverlay from "$lib/components/systemDialog/SystemDialogOverlay.svelte";
    import AdminReplyModal from "$lib/components/systemDialog/AdminReplyModal.svelte";
    import AdminSendDialogModal from "$lib/components/systemDialog/AdminSendDialogModal.svelte";
    import AdminDialogHistoryModal from "$lib/components/systemDialog/AdminDialogHistoryModal.svelte";
    import LexOfficeConnectModal from "$lib/components/lexoffice/LexOfficeConnectModal.svelte";
    import { systemDialogService } from "$lib/services/systemDialogService.svelte";

    let { 
        isSuperuser = false, 
        globalAppointmentModal = $bindable(), 
        sunCycleModal = $bindable() 
    }: {
        isSuperuser?: boolean;
        globalAppointmentModal?: any;
        sunCycleModal?: any;
    } = $props();

    let isLandingPage = $derived($page.url.pathname === '/');
    let userSwitchModal = $state<ReturnType<typeof UserSwitchModal>>();
    let globalFollowUpModal = $state<ReturnType<typeof FollowUpAppointmentModal>>();

    onMount(() => {
        systemDialogService.init();
        const handleOpenUserSwitch = () => userSwitchModal?.open();
        const handleOpenFollowUp = (e: any) => {
            if (e.detail) globalFollowUpModal?.open(e.detail);
        };
        window.addEventListener('open-user-switch-modal', handleOpenUserSwitch);
        window.addEventListener('open-follow-up-modal', handleOpenFollowUp);
        return () => {
            window.removeEventListener('open-user-switch-modal', handleOpenUserSwitch);
            window.removeEventListener('open-follow-up-modal', handleOpenFollowUp);
            systemDialogService.destroy();
        };
    });
</script>

<ToastLayer />
<ConfirmLayer />
<UpdateLogModal />
<AppointmentDetailModal bind:this={globalAppointmentModal} />
<AppointmentCompleteModal />
<FollowUpAppointmentModal bind:this={globalFollowUpModal} />
<SunCycleModal bind:this={sunCycleModal} />
{#if !isLandingPage}
    <FeedbackWidget {isSuperuser} />
{/if}
<UserSwitchModal bind:this={userSwitchModal} />
<LexOfficeConnectModal />

<!-- Eil-Mitteilungen & Hinweis-Popups -->
<SystemDialogOverlay />
<AdminReplyModal />
<AdminSendDialogModal />
<AdminDialogHistoryModal />

<!-- Dynamische Tag-/Nacht-Atmosphäre (Sonnenaufgang, Mittag, Sonnenuntergang, Nacht) -->
<div id="ambient-horizon-glow" aria-hidden="true"></div>
<div id="ambient-sun-overlay" aria-hidden="true"></div>
