<script lang="ts">
	import LoginLogout from "$lib/components/LoginLogout.svelte";
	import { page } from "$app/stores";
	import type { Snippet } from "svelte";
	import { onMount, onDestroy } from "svelte";
	import { pb } from "$lib/services/pocketbase";
	import { rbacService } from "$lib/services/rbacService.svelte";
	import { orgaStore } from "$lib/stores/orgaStore.svelte";
	import { notificationStore } from "$lib/services/notificationStore.svelte";
	import NotificationSettingsModal from "$lib/components/NotificationSettingsModal.svelte";
	import AppointmentRequestsModal from "$lib/components/AppointmentRequestsModal.svelte";
	import ImprovementProposalModal from "$lib/components/admin/ImprovementProposalModal.svelte";
	import MobileNavDrawer from "$lib/components/MobileNavDrawer.svelte";
	import NotificationBell from "$lib/components/navigation/NotificationBell.svelte";
	import { Lightbulb } from "lucide-svelte";
	import { themeService } from "$lib/services/themeService.svelte";
	import { sortAlphabetical } from "$lib/utils/sortHelper";
	import { triggerHaptic } from "$lib/services/hapticFeedback";

	let { items = [], isMobileMenuOpen = $bindable(false) } = $props<{
		items?: Array<{ label: string; href: string; icon: Snippet; roles?: string[] }>;
		isMobileMenuOpen?: boolean;
	}>();

	let isDarkMode = $derived(themeService.isDark);
	let isGodMode = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'developer' || rbacService.isOwner);
	let isAdmin = $derived(isGodMode || pb.authStore.model?.role === 'admin' || rbacService.isAdmin);
	let globalCompanyId = $state('all');

	// Alphabetisch sortierte Firmenliste nach Stadt und Name
	let sortedCompanies = $derived(
		sortAlphabetical(orgaStore.company?.data || [], c => `${c.city || ''} ${c.name || ''}`.trim())
	);

	// Modals
	let notificationModal: any = $state();
	let requestsModal: any = $state();
	let proposalModal: any = $state();

	function updateGlobalCompany(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		globalCompanyId = val;
		localStorage.setItem('global_company_id', val);
		window.dispatchEvent(new CustomEvent('global-company-changed', { detail: val }));
	}

	function toggleMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	function toggleTheme() {
		themeService.toggle();
	}

	let hasAnyRequests = $derived(
		notificationStore.pendingRequests > 0 || 
		notificationStore.pendingChanges > 0 || 
		notificationStore.pendingAdmissions > 0
	);

	onMount(() => {
		if (typeof localStorage !== 'undefined') {
			globalCompanyId = localStorage.getItem('global_company_id') || 'all';
		}
		const handleCompanySync = (e: any) => { globalCompanyId = e.detail; };
		window.addEventListener('global-company-changed', handleCompanySync);

		// Zentraler Start des Benachrichtigungs- und Sync-Stores
		notificationStore.init();

		return () => {
			window.removeEventListener('global-company-changed', handleCompanySync);
		};
	});

	onDestroy(() => {
		notificationStore.cleanup();
	});
</script>

<header class="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 px-4 md:px-6 flex flex-col z-20 sticky top-0 transition-all pt-[max(env(safe-area-inset-top,0px),0.75rem)] md:pt-[max(env(safe-area-inset-top,0px),1rem)]">
	<div class="flex items-center justify-between pb-3 md:pb-4 w-full">
		<div class="flex items-center gap-3">
			<!-- Hamburger Icon nur auf Mobile -->
			<button 
				aria-label={isMobileMenuOpen ? "Menü schließen" : "Menü öffnen"} 
				class="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
				onclick={toggleMenu}
			>
				<svg class="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
					{#if isMobileMenuOpen}
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					{:else}
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
					{/if}
				</svg>
			</button>
			
			<!-- Logo auf Mobile anzeigen -->
			<div class="md:hidden flex items-center gap-2 font-bold tracking-tight text-slate-900 dark:text-slate-100 text-xl">
				<img src="/favicon.png" alt="Logo" class="w-6 h-6 object-contain" />
				OrgaFlow
			</div>
		</div>
		
		<div class="flex items-center gap-2 sm:gap-4">
			{#if isGodMode}
				<select value={globalCompanyId} onchange={updateGlobalCompany} class="hidden md:block bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-sm font-bold text-indigo-700 dark:text-indigo-300 rounded-lg px-3 py-1.5 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer max-w-48 truncate">
					<option value="all">🏢 Alle Firmen</option>
					{#each sortedCompanies as comp}
						<option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>
					{/each}
				</select>
			{/if}
			{#if isAdmin}
				<a href="/portal" target="_blank" class="hidden md:flex items-center justify-center gap-1.5 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-sm font-bold rounded-lg px-3 py-1.5 shadow-sm transition-colors focus:ring-2 focus:ring-sky-500/20 outline-none touch-manipulation min-h-[44px]" title="Klienten-Portal testen">
					<span>📱</span> Portal
				</a>
			{/if}

			<!-- Theme Toggle -->
			<button 
				class="flex p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors relative rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 outline-none items-center justify-center cursor-pointer min-w-[44px] min-h-[44px] active:scale-95 touch-manipulation"
				onclick={() => { triggerHaptic('tap'); toggleTheme(); }}
				aria-label="Tag/Nacht Modus"
				title={themeService.tooltipText}
			>
				<span class="text-lg sm:text-xl leading-none">{themeService.icon}</span>
			</button>

			<!-- Anfragen Modal Button (Live-Hub Posteingang) -->
			<button 
				class="hidden md:flex p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors relative rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 outline-none items-center justify-center cursor-pointer min-w-[44px] min-h-[44px] touch-manipulation"
				onclick={() => { triggerHaptic('tap'); requestsModal?.open('requests'); }}
				aria-label="Posteingang"
				title="Anfragen, Änderungen & Feedback anzeigen"
			>
				<span class="text-xl leading-none">📬</span>
				{#if hasAnyRequests}
					<span class="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
					</span>
				{/if}
			</button>

			<!-- Verbesserungsvorschlag einreichen (Glühbirne) -->
			<button 
				type="button"
				class="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all rounded-full outline-none flex items-center justify-center min-w-[44px] min-h-[44px] active:scale-95 cursor-pointer"
				onclick={() => proposalModal?.open?.()}
				aria-label="Verbesserungsvorschlag einreichen"
				title="Neuen Verbesserungsvorschlag machen"
			>
				<Lightbulb class="w-5 h-5 text-amber-500" />
			</button>

			<!-- Zentrales Benachrichtigungs-Dropdown -->
			<NotificationBell 
				onOpenRequests={(tab) => requestsModal?.open(tab)}
				onOpenSettings={() => notificationModal?.open?.()}
			/>

			<div class="hidden md:block">
				<LoginLogout />
			</div>
			<div class="md:hidden flex items-center">
				<LoginLogout iconOnly={true} subtle={true} />
			</div>
		</div>
	</div>
</header>

<MobileNavDrawer 
	bind:isOpen={isMobileMenuOpen} 
	{items} 
	{isDarkMode} 
	onToggleTheme={toggleTheme} 
/>

<NotificationSettingsModal bind:this={notificationModal} />
<AppointmentRequestsModal bind:this={requestsModal} />
<ImprovementProposalModal bind:this={proposalModal} />