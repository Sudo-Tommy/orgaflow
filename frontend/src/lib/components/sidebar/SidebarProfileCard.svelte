<script lang="ts">
	import { themeService } from "$lib/services/themeService.svelte";
	import { orgaStore } from "$lib/stores/orgaStore.svelte";
	import { impersonationService } from "$lib/services/impersonationService.svelte";
	import { devRoleService } from "$lib/services/devRoleService.svelte";

	let {
		userInitials = 'U',
		userName = 'Benutzer',
		userRole = 'Mitarbeiter',
		isGodMode = false,
		globalCompanyId = 'all',
		onUpdateGlobalCompany,
		onOpenUserSwitch
	}: {
		userInitials: string;
		userName: string;
		userRole: string;
		isGodMode: boolean;
		globalCompanyId: string;
		onUpdateGlobalCompany: (e: Event) => void;
		onOpenUserSwitch?: () => void;
	} = $props();

	function handleProfileClick() {
		if (onOpenUserSwitch) {
			onOpenUserSwitch();
		} else {
			window.dispatchEvent(new CustomEvent('open-user-switch-modal'));
		}
	}
</script>

<!-- 1. Header & Branding -->
<div class="p-4 pb-2 shrink-0">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-linear-to-r from-indigo-600 to-cyan-500 dark:from-indigo-400 dark:to-cyan-400 drop-shadow-xs">OrgaFlow</h2>
			<p class="text-[10px] text-slate-400 dark:text-neutral-500 mt-0.5 uppercase tracking-widest font-bold flex items-center gap-1.5">
				Seniorenassistenz
				<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
			</p>
		</div>
		<!-- Sonnenstands-Vorschau Button -->
		<button
			type="button"
			onclick={() => window.dispatchEvent(new CustomEvent('open-sun-cycle-modal'))}
			class="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 transition-colors cursor-pointer shrink-0"
			title="Tageszeit- & Sonnenstands-Simulation öffnen"
			aria-label="Tageszeit-Vorschau"
		>
			<span class="text-sm">🌅</span>
		</button>
	</div>
</div>

<!-- 2. Benutzer-Profilkarte & Schnellauswahl -->
<div class="px-3 pb-3 shrink-0 space-y-2">
	{#if devRoleService.isDevAccount || impersonationService.isImpersonating}
		<button
			type="button"
			onclick={handleProfileClick}
			class="w-full text-left flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900/80 hover:bg-slate-100/80 dark:hover:bg-neutral-850 border border-slate-200/80 dark:border-neutral-800 min-h-11 transition-all group cursor-pointer relative"
			title="Klicken, um Benutzer / Identität zu wechseln"
		>
			<div class="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-500 to-brand-600 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
				{userInitials}
			</div>
			<div class="flex-1 min-w-0">
				<div class="flex items-center justify-between gap-1">
					<p class="text-xs font-bold text-slate-800 dark:text-white truncate leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
						{userName}
					</p>
					<span class="text-xs opacity-60 group-hover:opacity-100 transition-opacity" title="Benutzer wechseln">🎭</span>
				</div>
				<div class="flex items-center gap-1.5 mt-0.5">
					<span class="inline-block w-1.5 h-1.5 rounded-full {impersonationService.isImpersonating ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse"></span>
					<span class="text-[10px] text-slate-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">{userRole}</span>
				</div>
			</div>
		</button>
	{:else}
		<div class="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900/80 border border-slate-200/80 dark:border-neutral-800 min-h-11 transition-colors">
			<div class="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-500 to-brand-600 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
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

	<!-- Firmen-Auswahl (GodMode / Superadmin) -->
	{#if isGodMode}
		<div>
			<select 
				value={globalCompanyId} 
				onchange={onUpdateGlobalCompany} 
				class="w-full min-h-10 bg-slate-50 dark:bg-neutral-900 border border-slate-200/90 dark:border-neutral-800 text-xs font-semibold text-slate-800 dark:text-indigo-300 rounded-xl px-3 py-2 shadow-2xs focus:outline-none focus:border-indigo-500 cursor-pointer"
			>
				<option value="all">🏢 Alle Firmen</option>
				{#each orgaStore.company?.data || [] as comp}
					<option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>
				{/each}
			</select>
		</div>
	{/if}

	<!-- Moderner 3-Wege Tag / Nacht / Auto Schalter -->
	<div class="p-1 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 grid grid-cols-3 gap-1 text-[11px] font-semibold">
		<button 
			type="button" 
			onclick={() => themeService.setMode('light')}
			class="flex items-center justify-center gap-1 min-h-9 py-1.5 px-1 rounded-xl transition-all cursor-pointer {themeService.mode === 'light' ? 'bg-white dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shadow-xs font-bold' : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-neutral-800/50'}"
			title="Dauerhafter Tag-Modus"
		>
			<span>☀️</span>
			<span>Tag</span>
		</button>
		<button 
			type="button" 
			onclick={() => themeService.setMode('dark')}
			class="flex items-center justify-center gap-1 min-h-9 py-1.5 px-1 rounded-xl transition-all cursor-pointer {themeService.mode === 'dark' ? 'bg-white dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40 shadow-xs font-bold' : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-neutral-800/50'}"
			title="Dauerhafter Nacht-Modus"
		>
			<span>🌙</span>
			<span>Nacht</span>
		</button>
		<button 
			type="button" 
			onclick={() => themeService.setMode('auto')}
			class="flex items-center justify-center gap-1 min-h-9 py-1.5 px-1 rounded-xl transition-all cursor-pointer {themeService.mode === 'auto' ? 'bg-white dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 shadow-xs font-bold' : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-neutral-800/50'}"
			title="Tageszeit-Automatik (07:00–19:00 Uhr Tag, sonst Nacht)"
		>
			<span>🕒</span>
			<span>Auto</span>
		</button>
	</div>
	{#if themeService.mode === 'auto'}
		<p class="text-[10px] text-slate-500 dark:text-neutral-400 text-center font-medium">
			🕒 Automatik: Aktuell {themeService.timeOfDay === 'day' ? 'Tag-Modus' : 'Nacht-Modus'}
		</p>
	{/if}
</div>
