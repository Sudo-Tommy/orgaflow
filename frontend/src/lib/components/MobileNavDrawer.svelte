<script lang="ts">
	import { page } from '$app/stores';
	import { fly, fade } from 'svelte/transition';
	import type { Snippet } from 'svelte';
	import { pb } from '$lib/services/pocketbase';
	import { orgaStore } from '$lib/stores/orgaStore.svelte';
	import { updateStore } from '$lib/services/updateService.svelte';
	import ChatWidget from '$lib/components/ChatWidget.svelte';
	import { rbacService } from '$lib/services/rbacService.svelte';

	let { 
		isOpen = $bindable(false), 
		items = [],
		isDarkMode = false,
		onToggleTheme
	} = $props<{
		isOpen: boolean;
		items: Array<{ label: string; href: string; icon: Snippet; roles?: string[] }>;
		isDarkMode?: boolean;
		onToggleTheme?: () => void;
	}>();

	let currentPath = $derived($page.url.pathname);
	// svelte-ignore non_reactive_update
	let supportModal: HTMLDialogElement;

	let isGodMode = $derived(rbacService.isOwner);
	let isAdmin = $derived(rbacService.isAdmin);

	let user = $derived(pb.authStore.model);
	let userName = $derived(user ? `${user.name_first || ''} ${user.name_last || ''}`.trim() || user.email || 'Benutzer' : 'Benutzer');
	let userRole = $derived(
		rbacService.isOwner ? 'Inhaber' :
		rbacService.isFacilityAdmin ? 'Betriebsleiter' :
		rbacService.isCaregiver ? 'Betreuer' : 'Klient'
	);
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
		pb.realtime.unsubscribe();
		pb.authStore.clear();
	}

	// Kategorisierung der Navigation für perfekte Übersicht auf Handys (Rollen-basiert)
	const coreItems = $derived(items.filter((i: { label: string }) => ['Dashboard', 'Termine', 'Klienten', 'Kontakte'].includes(i.label)));
	const financeDocItems = $derived.by(() => {
		if (!rbacService.canAccessFinances) {
			return items.filter((i: { label: string }) => ['Vorlagen'].includes(i.label));
		}
		return items.filter((i: { label: string }) => ['Haushaltsbuch', 'Rechnungen', 'Vorlagen', 'BWA & Statistik'].includes(i.label));
	});
	const systemItems = $derived.by(() => {
		if (rbacService.isCaregiver) {
			return items.filter((i: { label: string }) => ['Krankenkassen', 'Mein Profil'].includes(i.label));
		}
		return items.filter((i: { label: string }) => {
			if (itemMatchesAdmin(i.label)) return rbacService.canAccessAdmin;
			return ['Krankenkassen', 'Firmendaten', 'Mein Profil', 'System-Admin'].includes(i.label);
		});
	});

	function itemMatchesAdmin(label: string) {
		return label === 'System-Admin';
	}
</script>

{#if isOpen}
	<!-- Backdrop -->
	<div 
		transition:fade={{ duration: 200 }} 
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
		onclick={close}
		aria-hidden="true"
	></div>

	<!-- Drawer Panel -->
	<aside 
		transition:fly={{ x: -320, duration: 280, opacity: 1 }}
		class="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-neutral-950 text-neutral-300 z-50 flex flex-col shadow-2xl border-r border-neutral-800/80 md:hidden overflow-hidden"
	>
		<!-- Subtle Top Glow -->
		<div class="absolute top-0 left-0 w-full h-40 bg-indigo-500/10 blur-3xl pointer-events-none"></div>

		<!-- Drawer Header mit Benutzer-Profil -->
		<div class="p-5 border-b border-neutral-800/80 relative z-10 bg-neutral-950/40">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2.5">
					<img src="/favicon.png" alt="OrgaFlow Logo" class="w-7 h-7 object-contain drop-shadow" />
					<span class="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-linear-to-r from-indigo-400 to-cyan-400">OrgaFlow</span>
				</div>
				<button 
					type="button"
					onclick={close}
					class="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors active:scale-95"
					aria-label="Menü schließen"
				>
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>

			<!-- User Card -->
			<div class="flex items-center gap-3 p-2.5 rounded-2xl bg-neutral-900/80 border border-neutral-800">
				<div class="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-brand-600 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
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

			<!-- Schnelle Umschalter (Firma & Theme) -->
			{#if isGodMode}
				<div class="mt-3">
					<select 
						value={globalCompanyId} 
						onchange={updateGlobalCompany} 
						class="w-full bg-neutral-900 border border-neutral-800 text-xs font-bold text-indigo-300 rounded-xl px-3 py-2 shadow-inner focus:outline-none focus:border-indigo-500 cursor-pointer"
					>
						<option value="all">🏢 Alle Firmen</option>
						{#each orgaStore.company?.data || [] as comp}
							<option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>
						{/each}
					</select>
				</div>
			{/if}

			<div class="grid grid-cols-2 gap-2 mt-3">
				<button 
					type="button" 
					onclick={onToggleTheme}
					class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-medium text-neutral-300 transition-colors active:scale-95"
				>
					<span class="text-sm">{isDarkMode ? '☀️' : '🌙'}</span>
					<span>{isDarkMode ? 'Tag-Modus' : 'Nacht-Modus'}</span>
				</button>

				{#if isAdmin}
					<a 
						href="/portal" 
						target="_blank" 
						onclick={close}
						class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-950/40 hover:bg-sky-900/50 border border-sky-800/60 text-xs font-medium text-sky-300 transition-colors active:scale-95"
					>
						<span>📱</span>
						<span>Klienten-Portal</span>
					</a>
				{:else}
					<button 
						type="button"
						onclick={() => { close(); updateStore.open(); }}
						class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-medium text-neutral-300 transition-colors active:scale-95"
					>
						<span>✨</span>
						<span>{appVersion}</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Navigations-Bereich mit weichem Scrollen -->
		<nav class="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar z-10">
			<!-- Gruppe 1: Kernbereich -->
			<div>
				<p class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-3 mb-1.5">Tagesgeschäft</p>
				<div class="space-y-1">
					{#each coreItems as item}
						{@const isActive = currentPath.startsWith(item.href) && (item.href !== '/' || currentPath === '/')}
						<a
							href={item.href}
							onclick={close}
							class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm {isActive ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30 font-bold' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'}"
						>
							<span class="w-5 h-5 shrink-0 {isActive ? 'text-indigo-400' : 'text-neutral-500'}">
								{@render item.icon()}
							</span>
							<span class="flex-1 truncate">{item.label}</span>
							{#if isActive}
								<span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
							{/if}
						</a>
					{/each}
				</div>
			</div>

			<!-- Gruppe 2: Finanzen & Dokumente -->
			<div>
				<p class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-3 mb-1.5">Finanzen & Vorlagen</p>
				<div class="space-y-1">
					{#each financeDocItems as item}
						{@const isActive = currentPath.startsWith(item.href)}
						<a
							href={item.href}
							onclick={close}
							class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm {isActive ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30 font-bold' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'}"
						>
							<span class="w-5 h-5 shrink-0 {isActive ? 'text-indigo-400' : 'text-neutral-500'}">
								{@render item.icon()}
							</span>
							<span class="flex-1 truncate">{item.label}</span>
							{#if isActive}
								<span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
							{/if}
						</a>
					{/each}

					{#if isGodMode}
						{@const isVmaActive = currentPath.startsWith('/vma')}
						<a
							href="/vma"
							onclick={close}
							class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm {isVmaActive ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30 font-bold' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'}"
						>
							<span class="w-5 h-5 shrink-0 {isVmaActive ? 'text-indigo-400' : 'text-neutral-500'}">
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2Z"/><circle cx="7" cy="15" r="2"/><circle cx="17" cy="15" r="2"/></svg>
							</span>
							<span class="flex-1 truncate">Reisekosten (VMA)</span>
							{#if isVmaActive}
								<span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
							{/if}
						</a>
					{/if}
				</div>
			</div>

			<!-- Gruppe 3: Stammdaten & System -->
			<div>
				<p class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-3 mb-1.5">Verwaltung & System</p>
				<div class="space-y-1">
					{#each systemItems as item}
						{#if item.label !== 'System-Admin' || rbacService.canAccessAdmin}
							{@const isActive = currentPath.startsWith(item.href)}
							<a
								href={item.href}
								onclick={close}
								class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm {isActive ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30 font-bold' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'}"
							>
								<span class="w-5 h-5 shrink-0 {isActive ? 'text-indigo-400' : 'text-neutral-500'}">
									{@render item.icon()}
								</span>
								<span class="flex-1 truncate">{item.label}</span>
								{#if isActive}
									<span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
								{/if}
							</a>
						{/if}
					{/each}
				</div>
			</div>
		</nav>

		<!-- Drawer Footer -->
		<div class="p-4 border-t border-neutral-800/80 bg-neutral-950/80 z-10 space-y-2 pb-[max(env(safe-area-inset-bottom),1rem)]">
			<div class="flex items-center justify-between px-2 text-xs text-neutral-500">
				<button 
					type="button" 
					onclick={() => { close(); updateStore.open(); }} 
					class="hover:text-amber-400 font-bold transition-colors cursor-pointer"
				>
					{appVersion}
				</button>
				<button 
					type="button" 
					onclick={() => { close(); supportModal?.showModal(); }} 
					class="hover:text-indigo-400 font-medium transition-colors cursor-pointer"
				>
					Hilfe & Support
				</button>
			</div>

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
{/if}

<!-- Support / Bug-Report Modal -->
<dialog bind:this={supportModal} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === supportModal) supportModal?.close(); }}>
	<div class="bg-white rounded-3xl w-full relative overflow-hidden shadow-2xl">
		<button aria-label="Schließen" onclick={() => supportModal?.close()} class="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors z-20 shadow-sm">
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
		</button>
		<ChatWidget />
	</div>
</dialog>
