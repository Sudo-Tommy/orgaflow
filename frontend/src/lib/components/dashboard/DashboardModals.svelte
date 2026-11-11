<script lang="ts">
	import AppointmentModal from "$lib/components/AppointmentModal.svelte";
	import AppointmentDetailModal from "$lib/components/AppointmentDetailModal.svelte";
	import GoogleEventDetailModal from "$lib/components/GoogleEventDetailModal.svelte";
	import MissingFollowUpsModal from "$lib/components/MissingFollowUpsModal.svelte";
	import UnsettledAppointmentsModal from "$lib/components/UnsettledAppointmentsModal.svelte";
	import FollowUpAppointmentModal from "$lib/components/FollowUpAppointmentModal.svelte";
	import QuickAccessMailModal from "$lib/components/portal/QuickAccessMailModal.svelte";
	import QuickLetterModal from "$lib/components/dashboard/QuickLetterModal.svelte";
	import ShareQrModal from "$lib/components/dashboard/ShareQrModal.svelte";
	import AppointmentRequestsModal from "$lib/components/AppointmentRequestsModal.svelte";
	import EingangszentraleModal from "$lib/components/eingangszentrale/EingangszentraleModal.svelte";
	import DocumentGeneratorModal from "$lib/components/DocumentGeneratorModal.svelte";
	import { orgaStore } from "$lib/stores/orgaStore.svelte";
	import { rbacService } from "$lib/services/rbacService.svelte";

	let {
		appointmentModal = $bindable(),
		detailModal = $bindable(),
		googleDetailModal = $bindable(),
		followUpsModal = $bindable(),
		unsettledModal = $bindable(),
		followUpModal = $bindable(),
		quickMailModal = $bindable(),
		quickLetterModal = $bindable(),
		shareQrModal = $bindable(),
		requestsModal = $bindable(),
		eingangszentraleModal = $bindable(),
		missingFollowUps = [],
		unsettledAppointments = []
	}: {
		appointmentModal?: any;
		detailModal?: any;
		googleDetailModal?: any;
		followUpsModal?: any;
		unsettledModal?: any;
		followUpModal?: any;
		quickMailModal?: any;
		quickLetterModal?: any;
		shareQrModal?: any;
		requestsModal?: any;
		eingangszentraleModal?: any;
		missingFollowUps: any[];
		unsettledAppointments: any[];
	} = $props();

	// svelte-ignore non_reactive_update
	let docGenModal: ReturnType<typeof DocumentGeneratorModal>;
</script>

<AppointmentModal bind:this={appointmentModal} />
<AppointmentDetailModal bind:this={detailModal} />
<GoogleEventDetailModal bind:this={googleDetailModal} />
<MissingFollowUpsModal bind:this={followUpsModal} {missingFollowUps} onOpenDetail={(id: string) => detailModal?.open(id)} />
{#if rbacService.canAccessFinances}
	<UnsettledAppointmentsModal
		bind:this={unsettledModal}
		{unsettledAppointments}
		onOpenDetail={(id: string) => detailModal?.open(id)}
		onOpenInvoiceGenerator={(clientId: string, appointmentIds: string[]) => {
			const firstApp = (orgaStore.appointments?.data || []).find((a: any) => appointmentIds.includes(a.id));
			const billingUserId = firstApp?.billing_user || undefined;
			docGenModal?.open('', 3, clientId, 'rechnung', billingUserId, appointmentIds);
		}}
	/>
	<DocumentGeneratorModal bind:this={docGenModal} />
{/if}
<FollowUpAppointmentModal bind:this={followUpModal} />
<QuickAccessMailModal bind:this={quickMailModal} />
<QuickLetterModal bind:this={quickLetterModal} />
<ShareQrModal bind:this={shareQrModal} />
<AppointmentRequestsModal bind:this={requestsModal} />
<EingangszentraleModal bind:this={eingangszentraleModal} />
