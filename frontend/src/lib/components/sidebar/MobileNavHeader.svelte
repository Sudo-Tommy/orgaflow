<script lang="ts">
	import { themeService } from "$lib/services/themeService.svelte";
	import { orgaStore } from "$lib/stores/orgaStore.svelte";
	import { impersonationService } from "$lib/services/impersonationService.svelte";
	import { devRoleService } from "$lib/services/devRoleService.svelte";

	let {
		userInitials = 'OF',
		userName = 'Benutzer',
		userRole = 'Mitarbeiter',
		isGodMode = false,
		globalCompanyId = 'all',
		onClose,
		onUpdateGlobalCompany,
		onOpenUserSwitch
	}: {
		userInitials: string;
		userName: string;
		userRole: string;
		isGodMode: boolean;
		globalCompanyId: string;
		onClose: () => void;
		onUpdateGlobalCompany: (e: Event) => void;
		onOpenUserSwitch?: () => void;
	} = $props();

	function handleProfileClick() {
		onClose?.();
		if (onOpenUserSwitch) {
			onOpenUserSwitch();
		} else {
			window.dispatchEvent(new CustomEvent('open-user-switch-modal'));
		}
	}
</script>

<div class="p-5 pb-3 shrink-0">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2.5">
			<img src="/favicon.png" alt="OrgaFlow Logo" class="w-7 h-7 object-contain drop-shadow" />
			<span class="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-linear-to-r from-indigo-600 to-cyan-500 dark:from-indigo-400 dark:to-cyan-400">OrgaFlow</span>
		</div>
		<button 
			type="button" 
			onclick={onClose}
			class="w-11 h-11 min-h-11 min-w-11 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-slate-200/80 dark:border-neutral-800 flex items-center justify-center text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-95 cursor-pointer"
			aria-label="Menü schließen"
		>
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
		</button>
	</div>

	<!-- User Card: Klickbar ausschließlich für Entwickler (Tommy) oder aktiven Imitierungsmodus (A2, A6, A12) -->
	{#if devRoleService.isDevAccount || impersonationService.isImpersonating}
		<button
			type="button"
			onclick={handleProfileClick}
			class="w-full text-left flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900/80 hover:bg-slate-100/80 dark:hover:bg-neutral-850 active:scale-98 border border-slate-200/80 dark:border-neutral-800 min-h-11 transition-all group cursor-pointer relative"
			title="Tippen, um Benutzer / Identität zu wechseln"
		>
			<div class="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-brand-600 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
				{userInitials}
			</div>
			<div class="flex-1 min-w-0">
				<div class="flex items-center justify-between gap-1">
					<p class="text-xs font-bold text-slate-800 dark:text-white truncate leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
						{userName}
					</p>
					<span class="text-xs opacity-75 group-hover:opacity-100 transition-opacity" title="Benutzer wechseln">🎭</span>
				</div>
				<div class="flex items-center gap-1.5 mt-0.5">
					<span class="inline-block w-1.5 h-1.5 rounded-full {impersonationService.isImpersonating ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse"></span>
					<span class="text-[10px] text-slate-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">{userRole}</span>
				</div>
			</div>
		</button>
	{:else}
		<div class="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900/80 border border-slate-200/80 dark:border-neutral-800 min-h-11 transition-colors">
			<div class="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-brand-600 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
				{userInitials}
			</div>
			<div class="flex-1 min-w-0">
				<p class="text-xs font-bold text-slate-800 dark:text-white truncate leading-tight">{userName}</p>
				<div class="flex items-center gap-1.5 mt-0.5">
					<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
					<span class="text-[10px] text-slate-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">{userRole}</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- Schnelle Umschalter (Firma & Theme) -->
	{#if isGodMode}
		<div class="mt-3">
			<select 
				value={globalCompanyId} 
				onchange={onUpdateGlobalCompany} 
				class="w-full min-h-11 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs font-bold text-slate-800 dark:text-indigo-300 rounded-xl px-3 py-2.5 shadow-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
			>
				<option value="all">🏢 Alle Firmen</option>
				{#each orgaStore.company?.data || [] as comp}
					<option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>
				{/each}
			</select>
		</div>
	{/if}

	<!-- Moderner 3-Wege Tag / Nacht / Auto Schalter für Mobilgeräte -->
	<div class="mt-3 p-1 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 grid grid-cols-3 gap-1 text-[11px] font-semibold">
		<button 
			type="button" 
			onclick={() => themeService.setMode('light')}
			class="flex items-center justify-center gap-1 min-h-11 py-2 px-1.5 rounded-xl transition-all cursor-pointer {themeService.mode === 'light' ? 'bg-white dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shadow-xs font-bold' : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-neutral-800/50'}"
			title="Dauerhafter Tag-Modus"
		>
			<span>☀️</span>
			<span>Tag</span>
		</button>
		<button 
			type="button" 
			onclick={() => themeService.setMode('dark')}
			class="flex items-center justify-center gap-1 min-h-11 py-2 px-1.5 rounded-xl transition-all cursor-pointer {themeService.mode === 'dark' ? 'bg-white dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40 shadow-xs font-bold' : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-neutral-800/50'}"
			title="Dauerhafter Nacht-Modus"
		>
			<span>🌙</span>
			<span>Nacht</span>
		</button>
		<button 
			type="button" 
			onclick={() => themeService.setMode('auto')}
			class="flex items-center justify-center gap-1 min-h-11 py-2 px-1.5 rounded-xl transition-all cursor-pointer {themeService.mode === 'auto' ? 'bg-white dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 shadow-xs font-bold' : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-neutral-800/50'}"
			title="Tageszeit-Automatik (07:00–19:00 Uhr Tag, sonst Nacht)"
		>
			<span>🕒</span>
			<span>Auto</span>
		</button>
	</div>
	{#if themeService.mode === 'auto'}
		<p class="text-[10px] text-slate-500 dark:text-neutral-400 text-center mt-1 font-medium">
			🕒 Automatik aktiv: Aktuell {themeService.timeOfDay === 'day' ? 'Tag-Modus' : 'Nacht-Modus'}
		</p>
	{/if}
</div>
