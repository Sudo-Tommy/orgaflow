<script lang="ts">
	import "../app.css";
	import { onMount } from "svelte";
	import { authManager } from "$lib/services/auth.svelte";
	import { goto } from "$app/navigation";
	import { page, updated } from "$app/stores";
	import { orgaStore } from "$lib/stores/orgaStore.svelte";
	import { rbacService } from "$lib/services/rbacService.svelte";
	import { toastStore } from "$lib/services/toastService.svelte";
	import { themeService } from "$lib/services/themeService.svelte";
	import ActiveTrackingBar from "$lib/components/ActiveTrackingBar.svelte";
	import AppBottomNav from "$lib/components/AppBottomNav.svelte";
	import { appointmentModalService } from "$lib/services/appointmentModalService.svelte";
	import { connectionManager } from "$lib/services/connectionManager.svelte";
	import LayoutNavigation from "$lib/components/layout/LayoutNavigation.svelte";
	import LayoutModals from "$lib/components/layout/LayoutModals.svelte";
	import ImpersonationBanner from "$lib/components/ImpersonationBanner.svelte";
	import { impersonationService } from "$lib/services/impersonationService.svelte";
	import { devRoleService } from "$lib/services/devRoleService.svelte";
	import { pullToRefresh } from "$lib/actions/pullToRefresh";
	import { initLayerStackService } from "$lib/services/layerStackService";
	import NativeAppManager from "$lib/components/app/NativeAppManager.svelte";
	import OfflineBanner from "$lib/components/app/OfflineBanner.svelte";

	let { children } = $props();
	let isSuperuser = $derived(devRoleService.isDevAccount || impersonationService.isImpersonating);

	let isMobileMenuOpen = $state(false);
	let isDarkMode = $derived(themeService.isDark);
	let globalAppointmentModal: any = $state();
	let sunCycleModal: any = $state();
	const auth = authManager();

	$effect(() => {
		if (globalAppointmentModal) {
			appointmentModalService.register(globalAppointmentModal);
		}
	});

	onMount(() => {
		connectionManager.init();
		impersonationService.init();
		const cleanupLayers = initLayerStackService();
		const cleanupAuth = auth.setup();
		return () => {
			cleanupLayers();
			if (typeof cleanupAuth === 'function') cleanupAuth();
		};
	});

	$effect(() => {
		if ($updated && typeof window !== 'undefined') {
			window.location.reload();
		}
	});

	// Reaktive Bestimmung der Sichtbarkeit (verfügbar im gesamten Layout)
	let isPublicPage = $derived(
		$page.url.pathname === '/' || 
		$page.url.pathname.startsWith('/login') || 
		$page.url.pathname.startsWith('/portal') ||
		$page.url.pathname.startsWith('/onboarding') ||
		$page.url.pathname.startsWith('/datenschutz') ||
		$page.url.pathname.startsWith('/privacy') ||
		$page.url.pathname.startsWith('/impressum') ||
		$page.url.pathname.startsWith('/legal')
	);
	
	// Prüft, ob wir im Editor sind (alles unter /documents/... außer die /documents/ Übersicht selbst)
	let isEditorPage = $derived($page.url.pathname.startsWith('/documents/') && $page.url.pathname.length > 11);

	// --- Auth & HRBAC Guard (Routenschutz) ---
	$effect(() => {
		if (!auth.isLoggedIn && !isPublicPage) {
			goto('/');
			Object.values(orgaStore).forEach(store => store.destroy());
		} else if (auth.isLoggedIn && ($page.url.pathname === '/' || $page.url.pathname.startsWith('/login') || ($page.url.pathname.startsWith('/portal') && !rbacService.isClient && !$page.url.pathname.startsWith('/portal/overview')))) {
			if (rbacService.isClient) {
				goto('/portal/overview');
			} else {
				goto('/dashboard');
			}
		} else if (auth.isLoggedIn && !isPublicPage) {
			const currentPath = $page.url.pathname;
			
			if (currentPath.startsWith('/mitarbeiter')) {
				goto('/dashboard');
				return;
			}

			if (rbacService.isClient && !currentPath.startsWith('/portal')) {
				goto('/portal/overview');
				return;
			}

			if (rbacService.isCaregiver) {
				const restrictedPaths = ['/invoices', '/bwa', '/finances', '/admin', '/company', '/vma', '/documents', '/mail', '/emails', '/mitarbeiter'];
				if (restrictedPaths.some(p => currentPath.startsWith(p))) {
					toastStore.warning("Keine Zugriffsberechtigung für diesen Unternehmensbereich.");
					goto('/dashboard');
					return;
				}
			}

			if (rbacService.isFacilityAdmin) {
				const ownerOnlyPaths = ['/admin/system-prompts', '/admin/system'];
				if (ownerOnlyPaths.some(p => currentPath.startsWith(p))) {
					toastStore.warning("Dieser Systembereich ist ausschließlich dem Inhaber vorbehalten.");
					goto('/admin');
					return;
				}
			}
		}
	});

	const FINANCE_COLLECTIONS = ['invoices', 'invoice_adjustments', 'accounting'];

	function initAllowedStores() {
		const isCaregiver = rbacService.isCaregiver;
		Object.entries(orgaStore).forEach(([key, store]) => {
			if (isCaregiver && FINANCE_COLLECTIONS.includes(key)) return;
			(store as any).init?.();
		});
	}

	// --- Lade die Daten, sobald der Nutzer eingeloggt ist ---
	$effect(() => {
		if (auth.isLoggedIn && !isPublicPage) {
			initAllowedStores();
		}
	});
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
</svelte:head>

<!-- Layout Wrapper -->
<div class="flex h-screen bg-neutral-100 dark:bg-neutral-950 font-sans antialiased text-slate-800 dark:text-neutral-200 overflow-hidden relative">

	<OfflineBanner />

	<ActiveTrackingBar />

	<!-- Hauptbereich: Sidebar + Content -->
	<div class="flex-1 flex overflow-hidden">
		<!-- Desktop & Mobile Navigation (Versteckt auf öffentlichen Seiten) -->
		{#if auth.isLoggedIn && !isPublicPage && !isEditorPage}
			<LayoutNavigation bind:isMobileMenuOpen {isDarkMode} />
		{/if}

		<!-- Dynamischer Seiteninhalt -->
		<div class="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-neutral-100/50 dark:bg-neutral-950">
			<!-- Simulierter Dev-Rollen-Banner (Nur für Tommy aktivierbar) -->
			<ImpersonationBanner />

			<main 
				use:pullToRefresh={{ enabled: auth.isLoggedIn && !isPublicPage, onRefresh: () => { if (auth.isLoggedIn) initAllowedStores(); } }}
				class="flex-1 min-w-0 overflow-y-auto overscroll-y-auto custom-scrollbar relative focus:outline-hidden {isEditorPage || isPublicPage ? 'p-0' : 'pt-[max(env(safe-area-inset-top,0px),1.25rem)] px-3.5 sm:px-6 lg:px-8 pb-24 lg:pb-8'}"
			>
				{@render children()}
			</main>

			<!-- Mobile Bottom Navigation Bar (Nur auf mobilen Geräten, eingeloggt & nicht öffentlich) -->
			{#if auth.isLoggedIn && !isPublicPage && !isEditorPage}
				<AppBottomNav onOpenMenu={() => isMobileMenuOpen = true} />
			{/if}
		</div>
	</div>

	<!-- Globale Modale (Termin anlegen, etc.) -->
	<LayoutModals 
		bind:globalAppointmentModal 
		bind:sunCycleModal 
		{isSuperuser} 
	/>

	<!-- Native App & PWA Manager -->
	<NativeAppManager isLoggedIn={auth.isLoggedIn} />

</div>
