<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import { onMount, onDestroy } from 'svelte';
	import ChatWidget from "$lib/components/ChatWidget.svelte";
	import { updateStore } from "$lib/services/updateService.svelte";
	import { pb } from "$lib/services/pocketbase";
	import { rbacService } from "$lib/services/rbacService.svelte";
	import { orgaStore } from "$lib/stores/orgaStore.svelte";
	import { getMailboxService } from "$lib/services/mailboxServiceStore.svelte";
	import { useRequestAdmin } from "$lib/services/requestAdminService.svelte";
	import { toastStore } from "$lib/services/toastService.svelte";
	import { getEmailService } from "$lib/services/emailServiceStore.svelte";
	import NotificationSettingsModal from "$lib/components/NotificationSettingsModal.svelte";
	import AppointmentRequestsModal from "$lib/components/AppointmentRequestsModal.svelte";
	import ImprovementProposalModal from "$lib/components/admin/ImprovementProposalModal.svelte";
	import { Lightbulb } from "lucide-svelte";

	let { items } = $props<{
		items: Array<{ label: string; href: string; icon: Snippet; roles?: string[] }>;
	}>();

	let currentPath = $derived($page.url.pathname);

	// svelte-ignore non_reactive_update
	let supportModal: HTMLDialogElement;

	// Versionsnummer live aus dem Update-Log
	let appVersion = $derived(updateStore.updates?.length > 0
		? (String(updateStore.updates[0].number).toLowerCase().startsWith('v')
			? updateStore.updates[0].number
			: `v${updateStore.updates[0].number}`)
		: "v1.0.0");

	let isOwner = $derived(rbacService.isOwner);
	let isGodMode = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin');
	let isAdmin = $derived(isGodMode || pb.authStore.model?.role === 'admin');
	let canAccessAdmin = $derived(rbacService.canAccessAdmin);

	// User info
	let user = $derived(pb.authStore.model);
	let userName = $derived(user ? `${user.name_first || ''} ${user.name_last || ''}`.trim() || user.email || 'Benutzer' : 'Benutzer');
	let userRole = $derived(
		rbacService.isOwner ? 'Inhaber' :
		rbacService.isFacilityAdmin ? 'Betriebsleiter' :
		rbacService.isCaregiver ? 'Betreuer' : 'Klient'
	);
	let userInitials = $derived(user
		? `${(user.name_first?.[0] || user.email?.[0] || 'O').toUpperCase()}${(user.name_last?.[0] || '').toUpperCase()}`
		: 'OF');

	// Dark mode
	let isDarkMode = $state(false);
	$effect(() => {
		isDarkMode = document.documentElement.classList.contains('dark') || document.documentElement.classList.contains('theme-negative');
		const observer = new MutationObserver(() => {
			isDarkMode = document.documentElement.classList.contains('dark') || document.documentElement.classList.contains('theme-negative');
		});
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => observer.disconnect();
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

	// Global company selector
	let globalCompanyId = $state('all');
	function updateGlobalCompany(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		globalCompanyId = val;
		localStorage.setItem('global_company_id', val);
		window.dispatchEvent(new CustomEvent('global-company-changed', { detail: val }));
	}

	// Services
	const mailboxService = getMailboxService();
	const reqAdmin = useRequestAdmin();
	const emailService = getEmailService();

	let syncInterval: any;

	const requestsCallback = () => { reqAdmin.init(); };

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

	onMount(() => {
		if (typeof localStorage !== 'undefined') {
			globalCompanyId = localStorage.getItem('global_company_id') || 'all';
		}
		const handleCompanySync = (e: any) => { globalCompanyId = e.detail; };
		window.addEventListener('global-company-changed', handleCompanySync);

		reqAdmin.init();
		if (!isGodMode) {
			mailboxService.loadFolders(pb.authStore.model?.id);
		}

		const isSuperAdmin = pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin';
		if (isSuperAdmin) {
			updateStore.check();
		}

		// Auto-Sync neue E-Mails (alle 2 Minuten)
		syncInterval = setInterval(async () => {
			if (!isGodMode) {
				try {
					const res = await emailService.syncEmails();
					if (res.synced_count > 0) {
						mailboxService.loadFolders(pb.authStore.model?.id);
					}
				} catch (e) {}
			}
		}, 2 * 60 * 1000);

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

	// Notification state
	let notificationModal: any = $state();
	let requestsModal: any = $state();
	let proposalModal: any = $state();
	let isNotificationsOpen = $state(false);

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
			} else { return 0; }
		}
		return list.length;
	});
	let totalNotifications = $derived(unreadMails + pendingRequests + pendingAdmissions + (hasUnreadUpdates ? 1 : 0));

	let prevUnread = $state(-1);
	let prevPending = $state(-1);
	let prevAdmissions = $state(-1);
	let ackData = $state({ mails: 0, reqs: 0, admissions: 0, updates: false });
	let hasNewNotifications = $state(false);

	if (typeof localStorage !== 'undefined') {
		try {
			const stored = localStorage.getItem('orga_ack_data');
			if (stored) ackData = JSON.parse(stored);
		} catch(e) {}
	}

	function getNotifyPrefs() {
		try { return JSON.parse(localStorage.getItem('orga_notify_prefs') || '{"requests":true,"emails":true,"chats":true,"updates":true}'); }
		catch { return {requests:true,emails:true,chats:true,updates:true}; }
	}

	function safeSendNotification(title: string, body: string) {
		try {
			if (typeof window === 'undefined') return;
			if (typeof document !== 'undefined' && document.visibilityState === 'visible') return;
			if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
			if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
				navigator.serviceWorker.ready.then(reg => {
					reg.showNotification(title, { body, icon: '/favicon.png', badge: '/favicon.png', data: { url: '/dashboard' } });
				}).catch(() => {});
				return;
			}
			try { new Notification(title, { body, icon: '/favicon.png' }); } catch (e) {}
		} catch (err) {
			console.warn("[AppSidebar] Notification error:", err);
		}
	}

	function toggleNotifications() {
		isNotificationsOpen = !isNotificationsOpen;
		if (isNotificationsOpen) {
			ackData = { mails: unreadMails, reqs: pendingRequests, admissions: pendingAdmissions, updates: hasUnreadUpdates };
			if (typeof localStorage !== 'undefined') localStorage.setItem('orga_ack_data', JSON.stringify(ackData));
			hasNewNotifications = false;
		}
	}

	$effect(() => {
		if (prevUnread !== -1 && unreadMails > prevUnread) {
			const newCount = unreadMails - prevUnread;
			toastStore.info(`Du hast ${newCount} neue E-Mail(s) erhalten!`);
			const prefs = getNotifyPrefs();
			if (prefs.emails !== false) safeSendNotification('Neue E-Mail ✉️', `Sie haben ${newCount} neue Nachricht(en) im Posteingang.`);
		}
		prevUnread = unreadMails;

		if (prevPending !== -1 && pendingRequests > prevPending) {
			toastStore.success(`Eine neue Terminanfrage ist eingetroffen!`);
			const prefs = getNotifyPrefs();
			if (prefs.requests !== false) safeSendNotification('Neue Terminanfrage 📬', `Sie haben ${pendingRequests - prevPending} neue Terminanfrage(n).`);
		}
		prevPending = pendingRequests;

		if (prevAdmissions !== -1 && pendingAdmissions > prevAdmissions) {
			toastStore.success(`Eine neue Klienten-Aufnahme ist eingetroffen!`);
			const prefs = getNotifyPrefs();
			if (prefs.requests !== false) safeSendNotification('Neue Klienten-Aufnahme 👤', `Sie haben ${pendingAdmissions - prevAdmissions} neue Aufnahme-Anfrage(n).`);
		}
		prevAdmissions = pendingAdmissions;

		if (unreadMails < ackData.mails) ackData.mails = unreadMails;
		if (pendingRequests < ackData.reqs) ackData.reqs = pendingRequests;
		if (pendingAdmissions < (ackData.admissions || 0)) ackData.admissions = pendingAdmissions;
		if (!hasUnreadUpdates) ackData.updates = false;

		hasNewNotifications =
			unreadMails > ackData.mails ||
			pendingRequests > ackData.reqs ||
			pendingAdmissions > (ackData.admissions || 0) ||
			(hasUnreadUpdates && !ackData.updates);

		if (typeof localStorage !== 'undefined') localStorage.setItem('orga_ack_data', JSON.stringify(ackData));
	});

	function handleLogout() {
		pb.realtime.unsubscribe();
		pb.authStore.clear();
	}
</script>

<aside class="w-64 bg-neutral-950 text-neutral-400 flex-col border-r border-neutral-900 hidden md:flex h-full shadow-2xl relative overflow-hidden z-30">
	<!-- Subtiler Hintergrund-Glow für mehr Tiefe -->
	<div class="absolute top-0 left-0 w-full h-32 bg-indigo-500/5 blur-3xl pointer-events-none"></div>

	<!-- Header / Logo -->
	<div class="p-6 pb-4 relative">
		<h2 class="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-linear-to-r from-indigo-400 to-cyan-400 drop-shadow-sm">OrgaFlow</h2>
		<p class="text-[10px] text-neutral-500 mt-1 uppercase tracking-widest font-bold flex items-center gap-2">
			Seniorenassistenz
			<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
		</p>
	</div>

	<!-- Benutzer-Karte -->
	<div class="px-4 pb-3 relative z-10">
		<div class="flex items-center gap-3 p-2.5 rounded-2xl bg-neutral-900/80 border border-neutral-800">
			<div class="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-500 to-brand-600 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
				{userInitials}
			</div>
			<div class="flex-1 min-w-0">
				<p class="text-xs font-bold text-white truncate leading-tight">{userName}</p>
				<div class="flex items-center gap-1.5 mt-0.5">
					<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
					<span class="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">{userRole}</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar pb-4 z-10">
		{#each items as item}
			{#if item.label !== 'System-Admin' || canAccessAdmin}
				{@const isActive = currentPath.startsWith(item.href) && (item.href !== '/' || currentPath === '/')}
				<a
					href={item.href}
					class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium group {isActive ? 'bg-indigo-500/10 text-indigo-300 shadow-[inset_0_1px_0_0_rgba(99,102,241,0.1)] ring-1 ring-indigo-500/20' : 'text-neutral-400 hover:bg-neutral-900/80 hover:text-neutral-100'}"
				>
					<span class="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110 {isActive ? 'text-indigo-400' : 'text-neutral-500 group-hover:text-neutral-300'}">
						{@render item.icon()}
					</span>
					<span class="transition-transform duration-200 {isActive ? '' : 'group-hover:translate-x-0.5'}">
						{item.label}
					</span>
				</a>
				{#if (item.label === 'Finanzen' || item.label === 'Haushaltsbuch') && isOwner}
					{@const isTravelExpensesActive = currentPath.startsWith('/vma')}
					<a
						href="/vma"
						class="flex items-center gap-3 pl-10 pr-3 py-2.5 rounded-lg transition-all duration-200 font-medium group
						{isTravelExpensesActive ? 'bg-indigo-500/10 text-indigo-300 shadow-[inset_0_1px_0_0_rgba(99,102,241,0.1)] ring-1 ring-indigo-500/20' : 'text-neutral-400 hover:bg-neutral-900/80 hover:text-neutral-100'}"
					>
						<span class="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110 {isTravelExpensesActive ? 'text-indigo-400' : 'text-neutral-500 group-hover:text-neutral-300'}">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-car"><path d="M19 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2Z"/><circle cx="7" cy="15" r="2"/><circle cx="17" cy="15" r="2"/></svg>
							</span>
						<span class="transition-transform duration-200 {isTravelExpensesActive ? '' : 'group-hover:translate-x-0.5'}">Reisekosten</span>
					</a>
				{/if}
			{/if}
		{/each}
	</nav>

	<!-- Trennlinie vor dem Footer -->
	<div class="px-4">
		<div class="border-t border-neutral-800/60"></div>
	</div>

	<!-- Aktions-Buttons (TopBar-Funktionen) -->
	<div class="px-3 py-3 z-10 space-y-1">

		<!-- Firmen-Auswahl (GodMode) -->
		{#if isGodMode}
			<div class="px-1 mb-2">
				<select value={globalCompanyId} onchange={updateGlobalCompany} class="w-full bg-indigo-950/40 border border-indigo-800/50 text-xs font-bold text-indigo-300 rounded-xl px-3 py-2 shadow-inner focus:outline-none focus:border-indigo-500 cursor-pointer">
					<option value="all">🏢 Alle Firmen</option>
					{#each orgaStore.company?.data || [] as comp}
						<option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>
					{/each}
				</select>
			</div>
		{/if}

		<!-- Klienten-Portal (Admin) -->
		{#if isAdmin}
			<a href="/portal" target="_blank" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sky-400 hover:bg-sky-500/10 hover:text-sky-300 transition-all duration-200 font-medium group" title="Klienten-Portal in neuem Tab öffnen">
				<span class="w-5 h-5 shrink-0 flex items-center justify-center text-base leading-none">📱</span>
				<span class="text-sm">Klienten-Portal</span>
			</a>
		{/if}

		<!-- Terminanfragen -->
		<button
			type="button"
			onclick={() => requestsModal?.open()}
			class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-neutral-900/80 hover:text-neutral-100 transition-all duration-200 font-medium group relative"
			title="Terminanfragen anzeigen"
		>
			<span class="w-5 h-5 shrink-0 flex items-center justify-center text-base leading-none">📬</span>
			<span class="text-sm">Terminanfragen</span>
			{#if pendingRequests > 0}
				<span class="ml-auto flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-brand-500 text-white text-[10px] font-black">{pendingRequests}</span>
			{/if}
		</button>

		<!-- Benachrichtigungen -->
		<div class="relative">
			<button
				type="button"
				onclick={toggleNotifications}
				class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-neutral-900/80 hover:text-neutral-100 transition-all duration-200 font-medium group"
				title="Benachrichtigungen"
			>
				<span class="w-5 h-5 shrink-0 relative flex items-center justify-center">
					<svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
					</svg>
					{#if hasNewNotifications}
						<span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-1 ring-neutral-950 animate-pulse"></span>
					{/if}
				</span>
				<span class="text-sm">Benachrichtigungen</span>
				{#if totalNotifications > 0}
					<span class="ml-auto flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-black border border-rose-500/30">{totalNotifications}</span>
				{/if}
			</button>

			<!-- Notification Dropdown -->
			{#if isNotificationsOpen}
				<button class="fixed inset-0 w-full h-full cursor-default z-30" onclick={() => isNotificationsOpen = false} tabindex="-1" aria-label="Schließen"></button>
				<div class="absolute bottom-full left-0 mb-2 w-72 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-40">
					<div class="p-3 border-b border-neutral-800 bg-neutral-900/80 flex justify-between items-center">
						<h3 class="font-bold text-neutral-100 text-sm">Benachrichtigungen</h3>
						{#if totalNotifications > 0}
							<span class="text-xs font-bold text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">{totalNotifications}</span>
						{/if}
					</div>
					<div class="max-h-72 overflow-y-auto custom-scrollbar">
						{#if totalNotifications === 0}
							<div class="p-6 text-center flex flex-col items-center justify-center">
								<span class="text-2xl mb-2 opacity-50">✨</span>
								<p class="text-sm font-semibold text-neutral-200">Alles erledigt!</p>
								<p class="text-xs text-neutral-500 mt-1">Keine neuen Benachrichtigungen.</p>
							</div>
						{/if}
						<div class="flex flex-col">
							<button type="button" onclick={() => { isNotificationsOpen = false; updateStore.open(); }} class="w-full text-left p-3 border-b border-neutral-800 hover:bg-neutral-800 transition-colors flex items-start gap-3 cursor-pointer">
								<div class="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 text-base">✨</div>
								<div>
									<p class="text-xs font-bold text-neutral-100">{hasUnreadUpdates ? 'Neues System-Update' : 'System-Updates (Verlauf)'}</p>
									<p class="text-[10px] text-neutral-500 mt-0.5">OrgaFlow Änderungen ansehen.</p>
								</div>
							</button>
							{#if unreadMails > 0}
								<a href="/mail" onclick={() => isNotificationsOpen = false} class="p-3 border-b border-neutral-800 hover:bg-neutral-800 transition-colors flex items-start gap-3 cursor-pointer">
									<div class="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 text-base">✉️</div>
									<div>
										<p class="text-xs font-bold text-neutral-100">{unreadMails} ungelesene E-Mail{unreadMails > 1 ? 's' : ''}</p>
										<p class="text-[10px] text-neutral-500 mt-0.5">Posteingang überprüfen.</p>
									</div>
								</a>
							{/if}
							{#if (Number(pendingRequests) || 0) > 0}
								<button type="button" onclick={() => { isNotificationsOpen = false; requestsModal?.open(); }} class="w-full text-left p-3 border-b border-neutral-800 hover:bg-neutral-800 transition-colors flex items-start gap-3 cursor-pointer">
									<div class="w-8 h-8 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0 text-base">📬</div>
									<div>
										<p class="text-xs font-bold text-neutral-100">{pendingRequests} Terminanfrage{pendingRequests > 1 ? 'n' : ''}</p>
										<p class="text-[10px] text-neutral-500 mt-0.5">Klicken, um Anfragen zu bearbeiten.</p>
									</div>
								</button>
							{/if}
							{#if (Number(pendingAdmissions) || 0) > 0}
								<button type="button" onclick={() => { isNotificationsOpen = false; requestsModal?.open(); }} class="w-full text-left p-3 hover:bg-neutral-800 transition-colors flex items-start gap-3 cursor-pointer">
									<div class="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 text-base">👤</div>
									<div>
										<p class="text-xs font-bold text-neutral-100">{pendingAdmissions} Neuaufnahme-Anfrage{pendingAdmissions > 1 ? 'n' : ''}</p>
										<p class="text-[10px] text-neutral-500 mt-0.5">Klicken, um Anfragen zu bearbeiten.</p>
									</div>
								</button>
							{/if}
						</div>
					</div>
					<div class="p-2 border-t border-neutral-800 bg-neutral-950/50 flex justify-center">
						<button onclick={() => { isNotificationsOpen = false; notificationModal?.open?.(); }} class="text-xs font-bold text-neutral-500 hover:text-indigo-400 transition-colors flex items-center gap-1.5 py-1">
							<span>⚙️</span> Benachrichtigungs-Einstellungen
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Verbesserungsvorschlag -->
		<button
			type="button"
			onclick={() => proposalModal?.open?.()}
			class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-amber-400/80 hover:bg-amber-500/10 hover:text-amber-300 transition-all duration-200 font-medium group"
			title="Verbesserungsvorschlag einreichen"
		>
			<span class="w-5 h-5 shrink-0"><Lightbulb class="w-full h-full" /></span>
			<span class="text-sm">Verbesserungsvorschlag</span>
		</button>

		<!-- Theme Toggle -->
		<button
			type="button"
			onclick={toggleTheme}
			class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-neutral-900/80 hover:text-neutral-100 transition-all duration-200 font-medium group"
			title="Tag/Nacht Modus umschalten"
		>
			<span class="w-5 h-5 shrink-0 flex items-center justify-center text-base leading-none">{isDarkMode ? '☀️' : '🌙'}</span>
			<span class="text-sm">{isDarkMode ? 'Tag-Modus' : 'Nacht-Modus'}</span>
		</button>
	</div>

	<!-- Footer -->
	<div class="px-4 pb-4 pt-2 border-t border-neutral-900/80 bg-neutral-950/50 z-10 space-y-2">
		<div class="flex items-center justify-between px-2 py-1 text-xs text-neutral-500 font-medium">
			<button type="button" onclick={() => updateStore.open()} class="hover:text-amber-400 font-bold cursor-pointer transition-colors" title="Update-Verlauf anzeigen">{appVersion}</button>
			<button type="button" onclick={() => supportModal?.showModal()} class="hover:text-indigo-400 cursor-pointer transition-colors">Hilfe & Support</button>
		</div>

		<!-- Abmelden -->
		<button
			type="button"
			onclick={handleLogout}
			class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all active:scale-95 cursor-pointer"
		>
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
			Abmelden
		</button>
	</div>
</aside>

<!-- Support / Bug-Report Modal -->
<dialog bind:this={supportModal} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === supportModal) supportModal?.close(); }}>
	<div class="bg-white rounded-3xl w-full relative overflow-hidden shadow-2xl">
		<button aria-label="Schließen" onclick={() => supportModal?.close()} class="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors z-20 shadow-sm">
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
		</button>
		<ChatWidget />
	</div>
</dialog>

<NotificationSettingsModal bind:this={notificationModal} />
<AppointmentRequestsModal bind:this={requestsModal} />
<ImprovementProposalModal bind:this={proposalModal} />