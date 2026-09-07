<script lang="ts">
	import "../app.css";
	import { onMount } from "svelte";
	import { authManager } from "$lib/services/auth.svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import { pb } from "$lib/services/pocketbase";
	import { orgaStore } from "$lib/stores/orgaStore.svelte";
	import AppSidebar from "$lib/components/AppSidebar.svelte";
	import MobileNavDrawer from "$lib/components/MobileNavDrawer.svelte";
	import AppBottomNav from "$lib/components/AppBottomNav.svelte";
	import ToastLayer from "$lib/components/ToastLayer.svelte";
	import ConfirmLayer from "$lib/components/ConfirmLayer.svelte";
	import UpdateLogModal from "$lib/components/UpdateLogModal.svelte";
	import { rbacService } from "$lib/services/rbacService.svelte";
	import { toastStore } from "$lib/services/toastService.svelte";

	let { children } = $props();

	let isMobileMenuOpen = $state(false);
	let isDarkMode = $state(false);
	const auth = authManager();

	onMount(() => {
		return auth.setup();
	});

	// Reaktive Bestimmung der Sichtbarkeit (verfügbar im gesamten Layout)
	let isPublicPage = $derived(
		$page.url.pathname === '/' || 
		$page.url.pathname.startsWith('/login') || 
		$page.url.pathname.startsWith('/portal') ||
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
			// Ausgeloggte Nutzer auf geschützten Seiten zum Login leiten
			goto('/');
			
			// Verbindungen kappen bei Logout (Alle Tabellen dynamisch)
			Object.values(orgaStore).forEach(store => store.destroy());
			
		} else if (auth.isLoggedIn && ($page.url.pathname === '/' || $page.url.pathname.startsWith('/login'))) {
			// Eingeloggte Nutzer von der Start- oder Login-Seite weg zum Dashboard oder Portal leiten
			if (rbacService.isClient) {
				goto('/portal');
			} else {
				goto('/dashboard');
			}
		} else if (auth.isLoggedIn && !isPublicPage) {
			const currentPath = $page.url.pathname;
			
			// 1. Klient-Rolle: darf nur im Klientenportal bleiben
			if (rbacService.isClient && !currentPath.startsWith('/portal')) {
				goto('/portal');
				return;
			}

			// 2. Betreuer (Caregiver): kein Zugriff auf Finanzen, Rechnungen, BWA, Firma oder Admin
			if (rbacService.isCaregiver) {
				const restrictedPaths = ['/invoices', '/bwa', '/finances', '/admin', '/company', '/vma'];
				if (restrictedPaths.some(p => currentPath.startsWith(p))) {
					toastStore.warning("Keine Zugriffsberechtigung für diesen Unternehmensbereich.");
					goto('/dashboard');
					return;
				}
			}

			// 3. Betriebsleiter (Facility Admin): kein Zugriff auf Inhaber-exklusive Bereiche
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

	// --- Lade die Daten, sobald der Nutzer eingeloggt ist ---
	$effect(() => {
		if (auth.isLoggedIn) {
			// Initialisiert dynamisch die Tabellen im Store, basierend auf Rechten
			Object.entries(orgaStore).forEach(([key, store]) => {
				// Überspringe Kollektionen, die nur für Superuser (Admins) bestimmt sind
				if (key === 'superusers' && !pb.authStore.isSuperuser) return;
				if (key === 'letterboxes' && !rbacService.isOwner) return;
				if (key === 'system_prompts' && !rbacService.canAccessSystemPrompts) return;
				store.init();
			});
		}
	});

	// --- Automatischer, zeitgesteuerter Tag-/Nachtmodus ---
	$effect(() => {
		function checkTimeAndApplyTheme() {
			// Prüfen, ob der Nutzer manuell eingegriffen hat
			const manualTheme = localStorage.getItem('theme_preference');
			if (manualTheme === 'dark') {
				document.documentElement.classList.add('dark', 'theme-negative');
				isDarkMode = true;
				return;
			} else if (manualTheme === 'light') {
				document.documentElement.classList.remove('dark', 'theme-negative');
				isDarkMode = false;
				return;
			}

			const hour = new Date().getHours();
			
			// Nachtmodus zwischen 19:00 Uhr abends und 06:59 Uhr morgens
			const isNight = hour >= 19 || hour < 7;
			
			if (isNight) {
				document.documentElement.classList.add('dark', 'theme-negative');
				isDarkMode = true;
			} else {
				document.documentElement.classList.remove('dark', 'theme-negative');
				isDarkMode = false;
			}
		}

		checkTimeAndApplyTheme(); // Sofort beim Laden ausführen
		const interval = setInterval(checkTimeAndApplyTheme, 60000); // Jede Minute prüfen
		
		// Listener für unseren manuellen Umschalt-Button und die Sidebar
		window.addEventListener('theme-changed', checkTimeAndApplyTheme);

		return () => {
			clearInterval(interval);
			window.removeEventListener('theme-changed', checkTimeAndApplyTheme);
		};
	});

	// --- Navigation Setup (Rollen-basiert) ---
	let navItems = $derived.by(() => {
		const all = [
			{ label: 'Dashboard', href: '/dashboard', icon: iconDashboard },
			{ label: 'Termine', href: '/appointments', icon: iconCalendar },
			{ label: 'Klienten', href: '/clients', icon: iconClients },
			{ label: 'Krankenkassen', href: '/insurancies', icon: iconInsurance },
			{ label: 'Firmendaten', href: '/company', icon: iconClients },
			{ label: 'Vorlagen', href: '/documents', icon: iconDocuments },
			{ label: 'Rechnungen', href: '/invoices', icon: iconDocuments },
			{ label: 'BWA & Statistik', href: '/bwa', icon: iconChart },
			{ label: 'Kontakte', href: '/contacts', icon: iconProfile },
			{ label: 'Mein Profil', href: '/profile', icon: iconProfile },
			{ label: 'Haushaltsbuch', href: '/finances', icon: iconWallet },
			{ label: 'System-Admin', href: '/admin', icon: iconAdmin }
		];

		return all.filter(item => {
			if (item.label === 'System-Admin') return rbacService.canAccessAdmin;
			if (['Firmendaten'].includes(item.label)) return rbacService.isAdmin;
			if (['Rechnungen', 'BWA & Statistik', 'Haushaltsbuch'].includes(item.label)) return rbacService.canAccessFinances;
			return true;
		});
	});
</script>

{#snippet iconDashboard()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
{/snippet}

{#snippet iconProfile()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
{/snippet}

{#snippet iconClients()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
{/snippet}

{#snippet iconInsurance()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
{/snippet}

{#snippet iconDocuments()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
{/snippet}

{#snippet iconCalendar()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
{/snippet}

{#snippet iconAdmin()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
{/snippet}

{#snippet iconWallet()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0-2.25-4.5M3 12l2.25-4.5M12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" /></svg>
{/snippet}

{#snippet iconMail()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
{/snippet}

{#snippet iconChart()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
{/snippet}

<!-- Wenn wir im Editor sind (!isEditorPage), werden Sidebar und TopNav gar nicht erst geladen! -->
{#if auth.isLoggedIn && !isPublicPage && !isEditorPage}
	<div class="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-indigo-600 selection:text-white">
		<AppSidebar items={navItems} />
		<div class="flex-1 flex flex-col relative overflow-hidden">
			<!-- Subtiler Hintergrund-Glow im Main-Bereich für mehr visuelle Tiefe -->
			<div class="absolute top-0 right-0 w-125 h-125 bg-indigo-500/5 blur-[100px] pointer-events-none rounded-full"></div>
			<main class="flex-1 overflow-y-auto px-3.5 py-4 sm:px-6 md:p-8 lg:p-10 pb-24 md:pb-10 custom-scrollbar scroll-smooth relative z-10 bg-slate-50/60 dark:bg-slate-950">
				{@render children()}
			</main>
			<AppBottomNav onOpenMenu={() => isMobileMenuOpen = true} />
		</div>
	</div>
	<MobileNavDrawer bind:isOpen={isMobileMenuOpen} items={navItems} {isDarkMode} />
{:else}
	<div class="orga-layout-wrapper">
		<div class="orga-layout-content">
			{@render children()}
		</div>
	</div>
{/if}

<ToastLayer />
<ConfirmLayer />
<UpdateLogModal />

<style>
	/* Unterschriften auf weißem Grund werden im Dark Mode als nahtloser Schriftzug eingefügt */
	:global(.dark img.mix-blend-multiply),
	:global(.theme-negative img.mix-blend-multiply) {
		mix-blend-mode: screen;
	}
</style>