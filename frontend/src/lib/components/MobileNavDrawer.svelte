<script lang="ts">
	import { page } from '$app/stores';
	import { fly, fade } from 'svelte/transition';
	import type { Snippet } from 'svelte';
	import { pb } from '$lib/services/pocketbase';
	import { updateStore } from '$lib/services/updateService.svelte';
	import { rbacService } from '$lib/services/rbacService.svelte';
	import { impersonationService } from '$lib/services/impersonationService.svelte';
	import { notificationStore } from '$lib/services/notificationStore.svelte';
	import MobileNavHeader from "./sidebar/MobileNavHeader.svelte";
	import MobileNavSections from "./sidebar/MobileNavSections.svelte";
	import MobileNavActions from "./sidebar/MobileNavActions.svelte";
	import SidebarModals from "./sidebar/SidebarModals.svelte";

	let { 
		isOpen = $bindable(false), 
		items = [],
		isDarkMode = false
	} = $props<{
		isOpen: boolean;
		items: Array<{ label: string; href: string; icon: Snippet; roles?: string[] }>;
		isDarkMode?: boolean;
		onToggleTheme?: () => void;
	}>();

	let currentPath = $derived($page.url.pathname);

	let supportModal: HTMLDialogElement | undefined = $state();
	let notificationModal: any = $state();
	let requestsModal: any = $state();
	let proposalModal: any = $state();
	let mailModal: any = $state();
	let eingangszentraleModal: any = $state();

	let isGodMode = $derived(rbacService.canSwitchCompanyFilter);
	let isAdmin = $derived(rbacService.isAdmin);

	let unreadMails = $derived(notificationStore.unreadMails);
	let pendingRequests = $derived(notificationStore.pendingRequests);
	let pendingAdmissions = $derived(notificationStore.pendingAdmissions);
	let hasUnreadUpdates = $derived(notificationStore.hasUnreadUpdates);

	let user = $derived(pb.authStore.model);
	let userName = $derived(user ? `${user.name_first || ''} ${user.name_last || ''}`.trim() || user.email || 'Benutzer' : 'Benutzer');
	let userRole = $derived(rbacService.roleDisplayLabel);
	let userInitials = $derived(user ? `${(user.name_first?.[0] || user.email?.[0] || 'O').toUpperCase()}${(user.name_last?.[0] || '').toUpperCase()}` : 'OF');

	let appVersion = $derived(updateStore.updates?.length > 0 ? (String(updateStore.updates[0].number).toLowerCase().startsWith('v') ? updateStore.updates[0].number : `v${updateStore.updates[0].number}`) : "v1.0.0");

	let globalCompanyId = $state('all');
	if (typeof localStorage !== 'undefined') {
		globalCompanyId = localStorage.getItem('global_company_id') || 'all';
	}

	function updateGlobalCompany(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		globalCompanyId = val;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('global_company_id', val);
		}
		window.dispatchEvent(new CustomEvent('global-company-changed', { detail: val }));
	}

	function close() {
		isOpen = false;
	}

	function handleLogout() {
		close();
		impersonationService.clearSessionBackup();
		pb.realtime.unsubscribe();
		pb.authStore.clear();
	}

	const coreItems = $derived(items.filter((i: any) => i.group === 'core'));
	const financeDocItems = $derived(items.filter((i: any) => i.group === 'finance'));
	const systemItems = $derived(items.filter((i: any) => i.group === 'system'));
</script>

{#if isOpen}
	<div 
		transition:fade={{ duration: 200 }} 
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
		onclick={close}
		aria-hidden="true"
	></div>
	<aside 
		transition:fly={{ x: -320, duration: 280, opacity: 1 }}
		class="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-neutral-950 text-slate-600 dark:text-neutral-300 z-50 flex flex-col shadow-2xl border-r border-slate-200/80 dark:border-neutral-800/80 lg:hidden overflow-hidden isolate"
	>
		<div class="absolute top-0 left-0 w-full h-40 bg-indigo-500/10 blur-3xl pointer-events-none"></div>

		<div class="flex flex-col h-full overflow-y-auto overscroll-contain custom-scrollbar relative z-10 min-h-0 bg-white dark:bg-neutral-950">
			<MobileNavHeader 
				{userInitials} 
				{userName} 
				{userRole} 
				{isGodMode} 
				{globalCompanyId} 
				onClose={close} 
				onUpdateGlobalCompany={updateGlobalCompany} 
				onOpenUserSwitch={() => { close(); window.dispatchEvent(new CustomEvent('open-user-switch-modal')); }}
			/>

			<MobileNavSections 
				{coreItems} 
				{financeDocItems} 
				{systemItems} 
				{currentPath} 
				{pendingRequests} 
				{pendingAdmissions} 
				{unreadMails} 
				onClose={close} 
			/>

			<MobileNavActions 
				{isAdmin} 
				{appVersion} 
				{unreadMails} 
				onClose={close} 
				onOpenMail={() => { close(); mailModal?.open(); }} 
				onOpenEingangszentrale={() => { close(); eingangszentraleModal?.open(); }} 
				onOpenSettings={() => { close(); notificationModal?.open?.(); }} 
				onOpenSupport={() => { close(); supportModal?.showModal(); }} 
				onLogout={handleLogout} 
			/>
		</div>
	</aside>
{/if}

<SidebarModals 
	bind:supportModal 
	bind:notificationModal 
	bind:requestsModal 
	bind:proposalModal 
	bind:mailModal 
	bind:eingangszentraleModal
/>
