<script lang="ts">
	import { page } from '$app/stores';
	import { useRequestAdmin } from '$lib/services/requestAdminService.svelte';
	import { getMailboxService } from '$lib/services/mailboxServiceStore.svelte';
	import { updateStore } from '$lib/services/updateService.svelte';
	import { pb } from '$lib/services/pocketbase';
	import { orgaStore } from '$lib/stores/orgaStore.svelte';
	import { rbacService } from '$lib/services/rbacService.svelte';
	import { triggerHaptic } from '$lib/services/hapticFeedback';

	let { onOpenMenu } = $props<{
		onOpenMenu: () => void;
	}>();

	let currentPath = $derived($page.url.pathname);

	const reqAdmin = useRequestAdmin();
	const mailboxService = getMailboxService();

	let isGodMode = $derived(rbacService.isOwner);
	let isAdmin = $derived(rbacService.isAdmin);
	let isCaregiver = $derived(rbacService.isCaregiver);

	let pendingRequests = $derived(reqAdmin.requests.filter(r => r.status !== 'accepted' && r.status !== 'denied').length);
	let unreadMails = $derived(isCaregiver ? 0 : (mailboxService.totalUnread || 0));

	let hasUnreadUpdates = $derived(updateStore.updates?.some((u: any) => {
		const readByArray = Array.isArray(u.read_by) ? u.read_by : (u.read_by ? [u.read_by] : []);
		return !readByArray.includes(pb.authStore.model?.id);
	}) || false);

	let pendingAdmissions = $derived.by(() => {
		if (!isAdmin) return 0;
		let list = (orgaStore.clients?.data || []).filter((c: any) => {
			if (c.status === 'Aktiv' || c.status === 'Verstorben') return false;
			const n = (c.notes || '').toUpperCase();
			return n.includes('NEUAUFNAHME') || n.includes('AUFNAHME') || (c.status === 'Inaktiv' && n.includes('EINGEREICHT'));
		});
		if (!isGodMode) {
			const userCompanyId = rbacService.userCompanyId;
			if (userCompanyId) {
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

	let hasMenuBadge = $derived(unreadMails > 0 || hasUnreadUpdates);

	let isDashboard = $derived(currentPath.startsWith('/dashboard'));
	let isAppointments = $derived(currentPath.startsWith('/appointments'));
	let isClients = $derived(currentPath.startsWith('/clients'));
	let isFinances = $derived(currentPath.startsWith('/finances'));
	let isDocuments = $derived(currentPath.startsWith('/documents'));
	let isContacts = $derived(currentPath.startsWith('/contacts'));
</script>

<nav 
	class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-8px_25px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] landscape:py-0.5 landscape:pt-0.5 transition-all"
	aria-label="Mobile Hauptnavigation"
>
	<div class="grid grid-cols-5 items-center max-w-lg mx-auto">
		<!-- 1. Dashboard -->
		<a
			href="/dashboard"
			onclick={() => triggerHaptic('tap')}
			class="flex flex-col items-center justify-center py-1 px-1 min-h-[48px] rounded-2xl transition-all active:scale-95 touch-manipulation cursor-pointer {isDashboard ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'}"
		>
			<div class="relative p-1 rounded-xl {isDashboard ? 'bg-indigo-50/80 dark:bg-indigo-950/60' : ''}">
				<svg class="w-5 h-5 transition-transform duration-200 {isDashboard ? 'scale-110' : ''}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
				</svg>
			</div>
			<span class="text-[10px] tracking-tight mt-0.5 truncate landscape:hidden">Dashboard</span>
		</a>

		<!-- 2. Termine -->
		<a
			href="/appointments"
			onclick={() => triggerHaptic('tap')}
			class="flex flex-col items-center justify-center py-1 px-1 min-h-[48px] rounded-2xl transition-all active:scale-95 touch-manipulation cursor-pointer relative {isAppointments ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'}"
		>
			<div class="relative p-1 rounded-xl {isAppointments ? 'bg-indigo-50/80 dark:bg-indigo-950/60' : ''}">
				<svg class="w-5 h-5 transition-transform duration-200 {isAppointments ? 'scale-110' : ''}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				{#if pendingRequests > 0 && !isCaregiver}
					<span class="absolute -top-0.5 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-black shadow-sm ring-2 ring-white dark:ring-slate-900">
						{pendingRequests}
					</span>
				{/if}
			</div>
			<span class="text-[10px] tracking-tight mt-0.5 truncate landscape:hidden">Termine</span>
		</a>

		<!-- 3. Klienten -->
		<a
			href="/clients"
			onclick={() => triggerHaptic('tap')}
			class="flex flex-col items-center justify-center py-1 px-1 min-h-[48px] rounded-2xl transition-all active:scale-95 touch-manipulation cursor-pointer relative {isClients ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'}"
		>
			<div class="relative p-1 rounded-xl {isClients ? 'bg-indigo-50/80 dark:bg-indigo-950/60' : ''}">
				<svg class="w-5 h-5 transition-transform duration-200 {isClients ? 'scale-110' : ''}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
				</svg>
				{#if pendingAdmissions > 0}
					<span class="absolute -top-0.5 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-black shadow-sm ring-2 ring-white dark:ring-slate-900">
						{pendingAdmissions}
					</span>
				{/if}
			</div>
			<span class="text-[10px] tracking-tight mt-0.5 truncate landscape:hidden">Klienten</span>
		</a>

		<!-- 4. Haushaltsbuch / Finanzen oder Kontakte (Rollen-basiert) -->
		{#if rbacService.canAccessFinances}
			<a
				href="/finances"
				onclick={() => triggerHaptic('tap')}
				class="flex flex-col items-center justify-center py-1 px-1 min-h-[48px] rounded-2xl transition-all active:scale-95 touch-manipulation cursor-pointer {isFinances ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'}"
			>
				<div class="relative p-1 rounded-xl {isFinances ? 'bg-indigo-50/80 dark:bg-indigo-950/60' : ''}">
					<svg class="w-5 h-5 transition-transform duration-200 {isFinances ? 'scale-110' : ''}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0-2.25-4.5M3 12l2.25-4.5M12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
					</svg>
				</div>
				<span class="text-[10px] tracking-tight mt-0.5 truncate landscape:hidden">Finanzen</span>
			</a>
		{:else if !isCaregiver}
			<a
				href="/documents"
				onclick={() => triggerHaptic('tap')}
				class="flex flex-col items-center justify-center py-1 px-1 min-h-[48px] rounded-2xl transition-all active:scale-95 touch-manipulation cursor-pointer {isDocuments ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'}"
			>
				<div class="relative p-1 rounded-xl {isDocuments ? 'bg-indigo-50/80 dark:bg-indigo-950/60' : ''}">
					<svg class="w-5 h-5 transition-transform duration-200 {isDocuments ? 'scale-110' : ''}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				</div>
				<span class="text-[10px] tracking-tight mt-0.5 truncate landscape:hidden">Vorlagen</span>
			</a>
		{:else}
			<a
				href="/contacts"
				onclick={() => triggerHaptic('tap')}
				class="flex flex-col items-center justify-center py-1 px-1 min-h-[48px] rounded-2xl transition-all active:scale-95 touch-manipulation cursor-pointer {isContacts ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'}"
			>
				<div class="relative p-1 rounded-xl {isContacts ? 'bg-indigo-50/80 dark:bg-indigo-950/60' : ''}">
					<svg class="w-5 h-5 transition-transform duration-200 {isContacts ? 'scale-110' : ''}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M16 2v2M8 2v2M4 7h16a2 2 0 012 2v11a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" />
						<circle cx="12" cy="13" r="2.5" />
						<path stroke-linecap="round" stroke-linejoin="round" d="M8 19c0-1.8 1.8-3 4-3s4 1.2 4 3" />
					</svg>
				</div>
				<span class="text-[10px] tracking-tight mt-0.5 truncate landscape:hidden">Kontakte</span>
			</a>
		{/if}

		<!-- 5. Menü (Öffnet den Drawer) -->
		<button
			type="button"
			onclick={() => { triggerHaptic('tap'); onOpenMenu(); }}
			class="flex flex-col items-center justify-center py-1 px-1 min-h-[48px] rounded-2xl transition-all active:scale-95 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-medium cursor-pointer touch-manipulation"
			aria-label="Hauptmenü öffnen"
		>
			<div class="relative p-1 rounded-xl">
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
				{#if hasMenuBadge}
					<span class="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
				{/if}
			</div>
			<span class="text-[10px] tracking-tight mt-0.5 truncate landscape:hidden">Menü</span>
		</button>
	</div>
</nav>
