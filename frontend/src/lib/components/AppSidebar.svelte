<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import { onMount, onDestroy } from 'svelte';
	import { updateStore } from "$lib/services/updateService.svelte";
	import { pb } from "$lib/services/pocketbase";
	import { rbacService } from "$lib/services/rbacService.svelte";
	import { impersonationService } from "$lib/services/impersonationService.svelte";
	import { notificationStore } from "$lib/services/notificationStore.svelte";
	import SidebarProfileCard from "./sidebar/SidebarProfileCard.svelte";
	import SidebarNavLinks from "./sidebar/SidebarNavLinks.svelte";
	import SidebarActions from "./sidebar/SidebarActions.svelte";
	import SidebarModals from "./sidebar/SidebarModals.svelte";

	interface SidebarItem {
		label: string;
		href: string;
		icon: Snippet;
		group?: 'core' | 'finance' | 'system';
		badgeKey?: 'requests' | 'admissions' | 'mails' | string;
		roles?: string[];
	}

	let { items } = $props<{
		items: SidebarItem[];
	}>();

	const coreItems = $derived(items.filter((i: SidebarItem) => i.group === 'core'));
	const financeItems = $derived(items.filter((i: SidebarItem) => i.group === 'finance'));
	const systemItems = $derived(items.filter((i: SidebarItem) => i.group === 'system'));

	let currentPath = $derived($page.url.pathname);

	// Modals references
	let supportModal: HTMLDialogElement | undefined = $state();
	let notificationModal: any = $state();
	let requestsModal: any = $state();
	let proposalModal: any = $state();
	let mailModal: any = $state();
	let eingangszentraleModal: any = $state();

	let appVersion = $derived(updateStore.updates?.length > 0
		? (String(updateStore.updates[0].number).toLowerCase().startsWith('v')
			? updateStore.updates[0].number
			: `v${updateStore.updates[0].number}`)
		: "v1.0.0");

	let isGodMode = $derived(rbacService.canSwitchCompanyFilter);
	let isAdmin = $derived(rbacService.isAdmin);

	let user = $derived(pb.authStore.model);
	let userName = $derived(user ? `${user.name_first || ''} ${user.name_last || ''}`.trim() || user.email || 'Benutzer' : 'Benutzer');
	let userRole = $derived(rbacService.roleDisplayLabel);
	let userInitials = $derived(user
		? `${(user.name_first?.[0] || user.email?.[0] || 'O').toUpperCase()}${(user.name_last?.[0] || '').toUpperCase()}`
		: 'OF');

	let globalCompanyId = $state('all');
	function updateGlobalCompany(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		globalCompanyId = val;
		localStorage.setItem('global_company_id', val);
		window.dispatchEvent(new CustomEvent('global-company-changed', { detail: val }));
	}

	let unreadMails = $derived(notificationStore.unreadMails);
	let pendingRequests = $derived(notificationStore.pendingRequests);
	let pendingAdmissions = $derived(notificationStore.pendingAdmissions);
	let hasUnreadUpdates = $derived(notificationStore.hasUnreadUpdates);

	onMount(() => {
		if (typeof localStorage !== 'undefined') {
			globalCompanyId = localStorage.getItem('global_company_id') || 'all';
		}
		const handleCompanySync = (e: any) => { globalCompanyId = e.detail; };
		window.addEventListener('global-company-changed', handleCompanySync);
		notificationStore.init();

		return () => window.removeEventListener('global-company-changed', handleCompanySync);
	});

	onDestroy(() => {
		notificationStore.cleanup();
	});

	function handleLogout() {
		impersonationService.clearSessionBackup();
		pb.realtime.unsubscribe();
		pb.authStore.clear();
	}
</script>

<aside class="w-64 bg-white dark:bg-neutral-950 text-slate-600 dark:text-neutral-400 flex flex-col border-r border-slate-200/80 dark:border-neutral-900 hidden lg:flex h-full shadow-2xl relative overflow-hidden z-30 isolate">
	<div class="absolute top-0 left-0 w-full h-32 bg-indigo-500/5 blur-3xl pointer-events-none"></div>

	<div class="flex flex-col h-full overflow-y-auto overscroll-contain custom-scrollbar relative z-10 min-h-0 bg-white dark:bg-neutral-950">
		<SidebarProfileCard 
			{userInitials} 
			{userName} 
			{userRole} 
			{isGodMode} 
			{globalCompanyId} 
			onUpdateGlobalCompany={updateGlobalCompany} 
		/>

		<SidebarNavLinks 
			{coreItems} 
			{financeItems} 
			{systemItems} 
			{currentPath} 
			{pendingRequests} 
			{pendingAdmissions} 
			{unreadMails} 
		/>

		<SidebarActions 
			{isAdmin} 
			{appVersion} 
			{unreadMails} 
			onOpenMail={() => mailModal?.open()} 
			onOpenEingangszentrale={() => eingangszentraleModal?.open()} 
			onOpenSettings={() => notificationModal?.open?.()} 
			onOpenSupport={() => supportModal?.showModal()} 
			onLogout={handleLogout} 
		/>
	</div>
</aside>

<SidebarModals 
	bind:supportModal 
	bind:notificationModal 
	bind:requestsModal 
	bind:proposalModal 
	bind:mailModal 
	bind:eingangszentraleModal
/>