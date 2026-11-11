<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { orgaStore } from "$lib/stores/orgaStore.svelte";
	import { pb } from "$lib/services/pocketbase";
	import { rbacService } from "$lib/services/rbacService.svelte";
	import { useRequestAdmin } from "$lib/services/requestAdminService.svelte";
	import { toastStore } from "$lib/services/toastService.svelte";
	import Calendar from "$lib/components/Calendar.svelte";
	import AppInstallButton from "$lib/components/pwa/AppInstallButton.svelte";
	import DashboardHero from "$lib/components/dashboard/DashboardHero.svelte";
	import QuickAccessGrid from "$lib/components/dashboard/QuickAccessGrid.svelte";
	import DashboardModals from "$lib/components/dashboard/DashboardModals.svelte";
	import { fetchDashboardGoogleEvents } from "$lib/services/dashboardDataLoader";
	import {
		filterAppointmentsForToday,
		getOpenInvoices,
		getMonthlyStats,
		getMissingFollowUps,
		getUnsettledAppointments,
		isWorkAppointment,
		isBlock
	} from "$lib/services/dashboardStats";
	import { isAppointmentSettlementReady } from "$lib/services/appointmentStatusHelper";

	// Modal-Referenzen
	let appointmentModal = $state<any>();
	let detailModal = $state<any>();
	let googleDetailModal = $state<any>();
	let followUpsModal = $state<any>();
	let unsettledModal = $state<any>();
	let followUpModal = $state<any>();
	let quickMailModal = $state<any>();
	let quickLetterModal = $state<any>();
	let shareQrModal = $state<any>();
	let requestsModal = $state<any>();
	let eingangszentraleModal = $state<any>();

	const reqAdmin = useRequestAdmin();

	let isSuperAdmin = $derived(rbacService.isOwner);
	let isAdmin = $derived(rbacService.isOwner || rbacService.isFacilityAdmin);
	let myUserId = $derived((pb.authStore.record || pb.authStore.model)?.id);
	let unhandledInquiriesCount = $derived(
		reqAdmin.requests.filter(r => r.status !== 'accepted' && r.status !== 'denied').length
	);

	let dashboardGoogleEvents = $state<any[]>([]);
	let isLoadingGoogleEvents = $state(false);

	async function loadDashboardGoogleEvents() {
		try {
			isLoadingGoogleEvents = true;
			dashboardGoogleEvents = await fetchDashboardGoogleEvents(isAdmin, 'mine', myUserId);
		} finally {
			isLoadingGoogleEvents = false;
		}
	}

	const handleGoogleMessage = (event: MessageEvent) => {
		if (event.data?.type === 'GOOGLE_CALENDAR_CONNECTED') loadDashboardGoogleEvents();
	};

	const handleVisibilityChange = () => {
		if (!document.hidden && pb.authStore.isValid) loadDashboardGoogleEvents();
	};

	onMount(async () => {
		reqAdmin.init();
		loadDashboardGoogleEvents();
		if (typeof window !== 'undefined') {
			window.addEventListener('message', handleGoogleMessage);
			document.addEventListener('visibilitychange', handleVisibilityChange);
		}
	});

	onDestroy(() => {
		reqAdmin.cleanup();
		if (typeof window !== 'undefined') {
			window.removeEventListener('message', handleGoogleMessage);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		}
	});

	let todaysAppointments = $derived(
		filterAppointmentsForToday(orgaStore.appointments?.data || [], dashboardGoogleEvents, isAdmin, 'mine', myUserId)
	);

	let todaysWorkAppointmentsCount = $derived(
		todaysAppointments.filter(isWorkAppointment).length
	);
	let hasBlockedDayToday = $derived(
		todaysAppointments.some(isBlock)
	);

	let openInvoices = $derived(
		getOpenInvoices(orgaStore.invoices?.data || [], isSuperAdmin, myUserId, rbacService.canAccessFinances, rbacService.isRecordInScope)
	);
	let openInvoicesSum = $derived(openInvoices.reduce((sum: number, inv: any) => sum + (inv.brutto || 0), 0));

	let activeClientsCount = $derived(
		(orgaStore.clients?.data || []).filter((c: any) => {
			if ((c.status || '').toLowerCase() !== 'aktiv') return false;
			if (isAdmin) return rbacService.isRecordInScope(c);
			return rbacService.isDirectlyAssignedClient(c);
		}).length
	);

	let monthlyStats = $derived(
		getMonthlyStats(orgaStore.appointments?.data || [], isAdmin, myUserId, rbacService.isRecordInScope)
	);

	let missingFollowUps = $derived(
		getMissingFollowUps(orgaStore.appointments?.data || [], isAdmin, myUserId, rbacService.isRecordInScope)
	);
	let missingFollowUpsCount = $derived(missingFollowUps.length);

	let allUnsettledAppointments = $derived(
		getUnsettledAppointments(orgaStore.appointments?.data || [], true, myUserId, rbacService.isRecordInScope)
	);
	let myUnsettledAppointments = $derived(
		isAdmin ? allUnsettledAppointments : getUnsettledAppointments(orgaStore.appointments?.data || [], false, myUserId, rbacService.isRecordInScope)
	);
	let unsettledAppointmentsCount = $derived(
		myUnsettledAppointments.filter((a: any) => isAppointmentSettlementReady(a)).length
	);
	let unsettledIncompleteCount = $derived(myUnsettledAppointments.length - unsettledAppointmentsCount);

	function handleNewAppointment(date?: Date) {
		appointmentModal?.open(date);
	}
</script>

<div class="orga-layout-wrapper">
	<div class="orga-layout-content">
		<header class="orga-dashboard-header animate-enter">
			<div class="flex flex-col items-center justify-center text-center w-full">
				<h1 class="orga-dashboard-title text-center">
					Dashboard
				</h1>
				<AppInstallButton />
			</div>
		</header>
		
		<div class="mb-6 w-full animate-enter">
			<DashboardHero 
				todaysAppointmentsCount={todaysWorkAppointmentsCount}
				{hasBlockedDayToday}
				missingFollowUpsCount={missingFollowUpsCount}
				{unhandledInquiriesCount}
				onOpenFollowUps={() => followUpsModal?.open()}
				onOpenInquiries={() => eingangszentraleModal?.open('requests')}
				onScrollToAppointments={() => {
					const el = document.getElementById('appointments-section');
					if (el) el.scrollIntoView({ behavior: 'smooth' });
				}}
			/>
		</div>

		<QuickAccessGrid 
			{unhandledInquiriesCount}
			{activeClientsCount}
			openInvoicesCount={openInvoices.length}
			{openInvoicesSum}
			{missingFollowUpsCount}
			{unsettledAppointmentsCount}
			{unsettledIncompleteCount}
			monthlyKms={monthlyStats.kms}
			onOpenFollowUp={() => {
				const myApp = todaysAppointments.find((a: any) => isWorkAppointment(a) && (a.user === myUserId || (Array.isArray(a.user) && a.user.includes(myUserId)))) ||
							  (orgaStore.appointments?.data || []).find((a: any) => isWorkAppointment(a) && (a.user === myUserId || (Array.isArray(a.user) && a.user.includes(myUserId))));
				if (myApp) followUpModal?.open(myApp);
				else toastStore.info("Kein eigener Termin als Vorlage gefunden.");
			}}
			onOpenShareQr={() => shareQrModal?.open()}
			onOpenLetter={() => quickLetterModal?.open()}
			onOpenInquiries={() => eingangszentraleModal?.open('requests')}
			onOpenEingangszentrale={() => eingangszentraleModal?.open()}
			onOpenFollowUps={() => followUpsModal?.open()}
			onOpenUnsettled={() => unsettledModal?.open()}
		/>

		<!-- Vollbreiten-Kalenderübersicht (Zero-Inner-Scroll & Glance-and-Edit) -->
		<div id="appointments-section" class="orga-card-white overflow-hidden animate-enter delay-200 flex flex-col w-full mb-8">
			<div class="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-between items-center">
				<h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><span>🗓️</span> Kalenderübersicht</h2>
			</div>
			<div class="p-0 bg-white dark:bg-slate-900 flex-1">
				<Calendar 
					appointments={orgaStore.appointments?.data || []} 
					clients={orgaStore.clients?.data || []} 
					onNewAppointment={handleNewAppointment}
					isWidget={true}
				/>
			</div>
		</div>
	</div>
</div>

<DashboardModals 
	bind:appointmentModal
	bind:detailModal
	bind:googleDetailModal
	bind:followUpsModal
	bind:unsettledModal
	bind:followUpModal
	bind:quickMailModal
	bind:quickLetterModal
	bind:shareQrModal
	bind:requestsModal
	bind:eingangszentraleModal
	{missingFollowUps}
	unsettledAppointments={allUnsettledAppointments}
/>
