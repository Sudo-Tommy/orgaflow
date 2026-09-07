<script lang="ts">
	import LoginLogout from "$lib/components/LoginLogout.svelte";
	import { page } from "$app/stores";
	import { slide } from "svelte/transition";
	import type { Snippet } from "svelte";
	import { getMailboxService } from "$lib/services/mailboxServiceStore.svelte";
	import { useRequestAdmin } from "$lib/services/requestAdminService.svelte";
	import { onMount, onDestroy } from "svelte";
	import { toastStore } from "$lib/services/toastService.svelte";
	import { getEmailService } from "$lib/services/emailServiceStore.svelte";
	import { updateStore } from "$lib/services/updateService.svelte";
	import { pb } from "$lib/services/pocketbase";
	import { orgaStore } from "$lib/stores/orgaStore.svelte";
	import NotificationSettingsModal from "$lib/components/NotificationSettingsModal.svelte";
	import AppointmentRequestsModal from "$lib/components/AppointmentRequestsModal.svelte";
	import ImprovementProposalModal from "$lib/components/admin/ImprovementProposalModal.svelte";
	import MobileNavDrawer from "$lib/components/MobileNavDrawer.svelte";
	import { Lightbulb } from "lucide-svelte";

	let { items = [], isMobileMenuOpen = $bindable(false) } = $props<{
		items?: Array<{ label: string; href: string; icon: Snippet; roles?: string[] }>;
		isMobileMenuOpen?: boolean;
	}>();

	let currentPath = $derived($page.url.pathname);
	let isDarkMode = $state(false);

	let isGodMode = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin');
	let isAdmin = $derived(isGodMode || pb.authStore.model?.role === 'admin');
	let globalCompanyId = $state('all');

	function updateGlobalCompany(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		globalCompanyId = val;
		localStorage.setItem('global_company_id', val);
		window.dispatchEvent(new CustomEvent('global-company-changed', { detail: val }));
	}

	function toggleMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	// Reaktive Variablen-Bindung für Svelte 5
	let notificationModal: any = $state();
	let requestsModal: any = $state();
	let proposalModal: any = $state();

	function getNotifyPrefs() {
		try { return JSON.parse(localStorage.getItem('orga_notify_prefs') || '{"requests":true,"emails":true,"chats":true,"updates":true}'); } 
        catch { return {requests:true,emails:true,chats:true,updates:true}; }
	}

	const mailboxService = getMailboxService();
	const reqAdmin = useRequestAdmin();
	const emailService = getEmailService();
	
	let isNotificationsOpen = $state(false);
	let syncInterval: any;

	const requestsCallback = () => {
		reqAdmin.init();
	};

	// PWA Standby-Fix: Läd Benachrichtigungen neu, sobald das Handy aufwacht
	function handleResume() {
		if (document.visibilityState === 'visible' && navigator.onLine) {
			reqAdmin.init();
			
			if (!isGodMode) {
				mailboxService.loadFolders(pb.authStore.model?.id);
				emailService.syncEmails().catch(() => {});
			}

			const isSuperAdmin = pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin';
			if (isSuperAdmin) {
				updateStore.check();
			}
		}
	}

	// Beobachtet den Dark-Mode-Status
	$effect(() => {
		isDarkMode = document.documentElement.classList.contains('dark') || document.documentElement.classList.contains('theme-negative');
		const observer = new MutationObserver(() => {
			isDarkMode = document.documentElement.classList.contains('dark') || document.documentElement.classList.contains('theme-negative');
		});
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => observer.disconnect();
	});

	onMount(() => {
		if (typeof localStorage !== 'undefined') {
			globalCompanyId = localStorage.getItem('global_company_id') || 'all';
		}
		const handleCompanySync = (e: any) => { globalCompanyId = e.detail; };
		window.addEventListener('global-company-changed', handleCompanySync);

		// Initialer Ladevorgang für Badge-Counts im Hintergrund
		reqAdmin.init();
		if (!isGodMode) {
			mailboxService.loadFolders(pb.authStore.model?.id);
		}
		
		// Update-Store prüfen (Admins only)
		const isSuperAdmin = pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin';
		if (isSuperAdmin) {
			updateStore.check();
		}

		// Auto-Sync für neue E-Mails im Hintergrund (alle 2 Minuten)
		syncInterval = setInterval(async () => {
			if (!isGodMode) {
				try {
					const res = await emailService.syncEmails();
					if (res.synced_count > 0) {
						// Aktualisiert den Zähler und löst die Toast-Nachricht aus!
						mailboxService.loadFolders(pb.authStore.model?.id);
					}
				} catch (e) {}
			}
		}, 2 * 60 * 1000);

		// Live-Updates für Terminanfragen im Hintergrund
		pb.collection('appointment_requests').subscribe('*', requestsCallback);

		document.addEventListener('visibilitychange', handleResume);
		window.addEventListener('focus', handleResume);
		window.addEventListener('online', handleResume);

		return () => window.removeEventListener('global-company-changed', handleCompanySync);
	});

	onDestroy(() => {
		reqAdmin.cleanup();
		if (syncInterval) clearInterval(syncInterval);
		
		document.removeEventListener('visibilitychange', handleResume);
		window.removeEventListener('focus', handleResume);
		window.removeEventListener('online', handleResume);
		
		pb.collection('appointment_requests').unsubscribe('*');
	});

	function toggleTheme() {
		const newTheme = isDarkMode ? 'light' : 'dark';
		localStorage.setItem('theme_preference', newTheme);
		if (newTheme === 'dark') {
			document.documentElement.classList.add('dark', 'theme-negative');
		} else {
			document.documentElement.classList.remove('dark', 'theme-negative');
		}
		window.dispatchEvent(new Event('theme-changed'));
	}

	let unreadMails = $derived(mailboxService.totalUnread || 0);
	let pendingRequests = $derived(reqAdmin.requests.filter(r => r.status !== 'accepted' && r.status !== 'denied').length);
	
	let hasUnreadUpdates = $derived(updateStore.updates?.some((u: any) => {
		const readByArray = Array.isArray(u.read_by) ? u.read_by : (u.read_by ? [u.read_by] : []);
		return !readByArray.includes(pb.authStore.model?.id);
	}) || false);

	let pendingAdmissions = $derived.by(() => {
		let list = (orgaStore.clients?.data || []).filter((c: any) => c.status === 'Inaktiv' && c.notes && c.notes.includes('NEUAUFNAHME-ANFRAGE'));
		if (!isGodMode) {
			const userCompanyId = pb.authStore.model?.company;
			if (isAdmin && userCompanyId) {
				list = list.filter((c: any) => {
					const comp = c.company;
					if (Array.isArray(comp)) return comp.includes(userCompanyId);
					if (typeof comp === 'string' && comp.startsWith('[')) {
						try { return JSON.parse(comp).includes(userCompanyId); } catch { return false; }
					}
					return comp === userCompanyId || (comp && comp.includes(userCompanyId));
				});
			} else {
				return 0;
			}
		}
		return list.length;
	});

	let totalNotifications = $derived(unreadMails + pendingRequests + pendingAdmissions + (hasUnreadUpdates ? 1 : 0));

	let prevUnread = $state(-1);
	let prevPending = $state(-1);
	let prevAdmissions = $state(-1);
	let hasNewNotifications = $state(false);

	// Persistenter Speicher für bereits "gesehene" (quittierte) Benachrichtigungen
	let ackData = $state({ mails: 0, reqs: 0, admissions: 0, updates: false });
	if (typeof localStorage !== 'undefined') {
		try {
			const stored = localStorage.getItem('orga_ack_data');
			if (stored) ackData = JSON.parse(stored);
		} catch(e) {}
	}

	function toggleNotifications() {
		isNotificationsOpen = !isNotificationsOpen;
		if (isNotificationsOpen) {
			// Wenn geöffnet wird, quittieren wir den aktuellen Stand als "gesehen"
			ackData = { mails: unreadMails, reqs: pendingRequests, admissions: pendingAdmissions, updates: hasUnreadUpdates };
			if (typeof localStorage !== 'undefined') localStorage.setItem('orga_ack_data', JSON.stringify(ackData));
			hasNewNotifications = false;
		}
	}

	function safeSendNotification(title: string, body: string) {
		try {
			if (typeof window === 'undefined') return;
			// Doppel-Benachrichtigung unterdrücken: Wenn App aktiv im Vordergrund ist, reicht der In-App Toast
			if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
				return;
			}
			if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
			
			// 1. PWA / Mobile Service Worker
			if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
				navigator.serviceWorker.ready.then(reg => {
					reg.showNotification(title, {
						body,
						icon: '/favicon.png',
						badge: '/favicon.png',
						data: { url: '/dashboard' }
					});
				}).catch(() => {});
				return;
			}
			
			// 2. Desktop Fallback (in try/catch, weil iOS Safari new Notification() verbietet)
			try {
				new Notification(title, { body, icon: '/favicon.png' });
			} catch (e) {
				// Ignorieren – Mobilgeräte werfen TypeError bei new Notification()
			}
		} catch (err) {
			console.warn("[AppTopNav] Notification error:", err);
		}
	}

	$effect(() => {
		if (prevUnread !== -1 && unreadMails > prevUnread) {
			const newCount = unreadMails - prevUnread;
			toastStore.info(`Du hast ${newCount} neue E-Mail(s) erhalten!`);
			const prefs = getNotifyPrefs();
			if (prefs.emails !== false) {
				safeSendNotification('Neue E-Mail ✉️', `Sie haben ${newCount} neue Nachricht(en) im Posteingang.`);
			}
		}
		prevUnread = unreadMails;
		
		if (prevPending !== -1 && pendingRequests > prevPending) {
			const newCount = pendingRequests - prevPending;
			toastStore.success(`Eine neue Terminanfrage ist eingetroffen!`);
			const prefs = getNotifyPrefs();
			if (prefs.requests !== false) {
				safeSendNotification('Neue Terminanfrage 📬', `Sie haben ${newCount} neue Terminanfrage(n) erhalten.`);
			}
		}
		prevPending = pendingRequests;

		if (prevAdmissions !== -1 && pendingAdmissions > prevAdmissions) {
			const newCount = pendingAdmissions - prevAdmissions;
			toastStore.success(`Eine neue Klienten-Aufnahme ist eingetroffen!`);
			const prefs = getNotifyPrefs();
			if (prefs.requests !== false) {
				safeSendNotification('Neue Klienten-Aufnahme 👤', `Sie haben ${newCount} neue Aufnahme-Anfrage(n) erhalten.`);
			}
		}
		prevAdmissions = pendingAdmissions;

		// Basislinie nach unten korrigieren (z.B. wenn eine Mail gelesen/gelöscht wurde)
		if (unreadMails < ackData.mails) ackData.mails = unreadMails;
		if (pendingRequests < ackData.reqs) ackData.reqs = pendingRequests;
		if (pendingAdmissions < (ackData.admissions || 0)) ackData.admissions = pendingAdmissions;
		if (!hasUnreadUpdates) ackData.updates = false;

		// Gibt es ECHTE neue Benachrichtigungen, die unsere Basislinie übersteigen?
		hasNewNotifications = 
			unreadMails > ackData.mails || 
			pendingRequests > ackData.reqs || 
			pendingAdmissions > (ackData.admissions || 0) ||
			(hasUnreadUpdates && !ackData.updates);
			
		if (typeof localStorage !== 'undefined') localStorage.setItem('orga_ack_data', JSON.stringify(ackData));
	});
</script>

<!-- Kopfzeile mit dynamischem Einbezug der Safe-Area (iPhone Notch etc.) via CSS env() -->
<header class="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 px-4 md:px-6 flex flex-col z-20 sticky top-0 transition-all pt-[max(env(safe-area-inset-top,0px),0.75rem)] md:pt-[max(env(safe-area-inset-top,0px),1rem)]">
	<div class="flex items-center justify-between pb-3 md:pb-4 w-full">
		<div class="flex items-center gap-3">
			<!-- Hamburger Icon nur auf Mobile -->
			<button 
				aria-label={isMobileMenuOpen ? "Menü schließen" : "Menü öffnen"} 
				class="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
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
			
			<!-- Logo auf Mobile anzeigen, da die Sidebar ja ausgeblendet ist -->
			<div class="md:hidden flex items-center gap-2 font-bold tracking-tight text-slate-900 dark:text-slate-100 text-xl">
				<img src="/favicon.png" alt="Logo" class="w-6 h-6 object-contain" />
				OrgaFlow
			</div>
		</div>
		
		<div class="flex items-center gap-2 sm:gap-4">
			{#if isGodMode}
				<select value={globalCompanyId} onchange={updateGlobalCompany} class="hidden md:block bg-indigo-50 border border-indigo-200 text-sm font-bold text-indigo-700 rounded-lg px-3 py-1.5 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer max-w-48 truncate">
					<option value="all">🏢 Alle Firmen</option>
					{#each orgaStore.company?.data || [] as comp}
						<option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>
					{/each}
				</select>
			{/if}
			{#if isAdmin}
				<a href="/portal" target="_blank" class="hidden md:flex items-center justify-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-sm font-bold rounded-lg px-3 py-1.5 shadow-sm transition-colors focus:ring-2 focus:ring-sky-500/20 outline-none" title="Klienten-Portal testen">
					<span>📱</span> Portal
				</a>
			{/if}
			<!-- Theme Toggle -->
			<button 
				class="hidden md:flex p-2 text-neutral-500 hover:text-indigo-600 transition-colors relative rounded-full hover:bg-neutral-100 outline-none items-center justify-center"
				onclick={toggleTheme}
				aria-label="Tag/Nacht Modus"
				title="Tag/Nacht Modus umschalten"
			>
				<span class="text-xl leading-none">{isDarkMode ? '☀️' : '🌙'}</span>
			</button>

			<!-- Anfragen Modal Button -->
			<button 
				class="hidden md:flex p-2 text-neutral-500 hover:text-brand-600 transition-colors relative rounded-full hover:bg-neutral-100 outline-none items-center justify-center"
				onclick={() => requestsModal?.open()}
				aria-label="Anfragen"
				title="Anfragen & Feedback anzeigen"
			>
				<span class="text-xl leading-none">📬</span>
				{#if pendingRequests > 0}
					<span class="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
					</span>
				{/if}
			</button>

			<!-- Verbesserungsvorschlag einreichen (Glühbirne) -->
			<button 
				type="button"
				class="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-all rounded-full outline-none flex items-center justify-center min-w-[44px] min-h-[44px] active:scale-95 cursor-pointer"
				onclick={() => proposalModal?.open?.()}
				aria-label="Verbesserungsvorschlag einreichen"
				title="Neuen Verbesserungsvorschlag machen"
			>
				<Lightbulb class="w-5 h-5 text-amber-500" />
			</button>

			<!-- Benachrichtigungs-Glocke -->
			<div class="relative flex items-center">
				<button 
					class="p-2 text-neutral-500 hover:text-indigo-600 transition-colors relative rounded-full hover:bg-neutral-100 outline-none"
					onclick={toggleNotifications}
					aria-label="Benachrichtigungen"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
					</svg>
					{#if hasNewNotifications}
						<span class="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
							<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
							<span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
						</span>
					{/if}
				</button>

				{#if isNotificationsOpen}
					<!-- Backdrop zum Schließen beim Klicken ins Leere -->
					<button class="fixed inset-0 w-full h-full cursor-default z-30" onclick={() => isNotificationsOpen = false} tabindex="-1" aria-label="Schließen"></button>
					
					<div class="fixed top-18 left-4 right-4 sm:absolute sm:left-auto sm:right-0 sm:top-full mt-2 sm:w-80 bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden z-40 animate-enter">
						<div class="p-4 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
							<h3 class="font-bold text-neutral-900">Benachrichtigungen</h3>
							{#if totalNotifications > 0}
								<span class="text-xs font-bold text-neutral-500 bg-neutral-200/60 px-2 py-0.5 rounded-full">{totalNotifications}</span>
							{/if}
						</div>
						<div class="max-h-[60vh] overflow-y-auto custom-scrollbar">
							{#if totalNotifications === 0}
								<div class="p-8 text-center flex flex-col items-center justify-center border-b border-neutral-50">
									<span class="text-3xl mb-3 opacity-50">✨</span>
									<p class="text-sm font-semibold text-neutral-900">Alles erledigt!</p>
									<p class="text-xs text-neutral-500 mt-1">Du hast keine neuen Benachrichtigungen.</p>
								</div>
							{/if}
							<div class="flex flex-col">
								<button type="button" onclick={() => { isNotificationsOpen = false; updateStore.open(); }} class="w-full text-left p-4 border-b border-neutral-50 hover:bg-neutral-50 transition-colors flex items-start gap-3 cursor-pointer">
									<div class="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-inner text-xl">✨</div>
									<div>
										<p class="text-sm font-bold text-neutral-900">{hasUnreadUpdates ? 'Neues System-Update' : 'System-Updates (Verlauf)'}</p>
										<p class="text-xs text-neutral-500 mt-0.5">Erfahren Sie, was sich in OrgaFlow verändert hat.</p>
									</div>
								</button>
									{#if unreadMails > 0}
										<a href="/mail" onclick={() => isNotificationsOpen = false} class="p-4 border-b border-neutral-50 hover:bg-neutral-50 transition-colors flex items-start gap-3 cursor-pointer">
											<div class="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">✉️</div>
											<div>
												<p class="text-sm font-bold text-neutral-900">{unreadMails} ungelesene E-Mail{unreadMails > 1 ? 's' : ''}</p>
												<p class="text-xs text-neutral-500 mt-0.5">Posteingang überprüfen.</p>
											</div>
										</a>
									{/if}
									{#if (Number(pendingRequests) || 0) > 0}
										<button type="button" onclick={() => { isNotificationsOpen = false; requestsModal?.open(); }} class="w-full text-left p-4 hover:bg-neutral-50 transition-colors flex items-start gap-3 cursor-pointer">
											<div class="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 shadow-inner">📬</div>
											<div>
												<p class="text-sm font-bold text-neutral-900">{pendingRequests} Terminanfrage{pendingRequests > 1 ? 'n' : ''}</p>
												<p class="text-xs text-neutral-500 mt-0.5">Klicken, um die Anfragen direkt zu bearbeiten.</p>
											</div>
										</button>
									{/if}
									{#if (Number(pendingAdmissions) || 0) > 0}
										<button type="button" onclick={() => { isNotificationsOpen = false; requestsModal?.open(); }} class="w-full text-left p-4 hover:bg-neutral-50 transition-colors flex items-start gap-3 cursor-pointer">
											<div class="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">👤</div>
											<div>
												<p class="text-sm font-bold text-neutral-900">{pendingAdmissions} Neuaufnahme-Anfrage{pendingAdmissions > 1 ? 'n' : ''}</p>
												<p class="text-xs text-neutral-500 mt-0.5">Klicken, um die Anfragen direkt zu bearbeiten.</p>
											</div>
										</button>
									{/if}
								</div>
						</div>
						
						<div class="p-3 border-t border-neutral-100 bg-neutral-50 flex justify-center shrink-0">
							<button onclick={() => { isNotificationsOpen = false; notificationModal?.open?.(); }} class="text-xs font-bold text-neutral-600 hover:text-indigo-600 transition-colors flex items-center gap-1.5">
								<span>⚙️</span> Benachrichtigungs-Einstellungen
							</button>
						</div>
					</div>
				{/if}
			</div>

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