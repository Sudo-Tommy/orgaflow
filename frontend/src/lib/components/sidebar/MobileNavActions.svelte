<script lang="ts">
	import { updateStore } from "$lib/services/updateService.svelte";
	import { notificationStore } from "$lib/services/notificationStore.svelte";
	import { themeService } from "$lib/services/themeService.svelte";
	import { Settings } from "lucide-svelte";

	let {
		isAdmin = false,
		appVersion = "v1.0.0",
		unreadMails = 0,
		onClose,
		onOpenMail,
		onOpenEingangszentrale,
		onOpenSettings,
		onOpenSupport,
		onLogout
	}: {
		isAdmin: boolean;
		appVersion: string;
		unreadMails: number;
		onClose: () => void;
		onOpenMail: () => void;
		onOpenEingangszentrale: () => void;
		onOpenSettings: () => void;
		onOpenSupport: () => void;
		onLogout: () => void;
	} = $props();

	let totalIncomingCount = $derived(notificationStore.totalIncomingCount);
</script>

<!-- Semantische Trennung: Aktionen & Funktionen -->
<div class="px-3 pt-2 pb-1">
	<div class="border-t border-slate-200/80 dark:border-slate-800/60 mb-2"></div>
	<p class="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest px-3 mb-1.5">Aktionen & Funktionen</p>
</div>

<!-- Aktions-Buttons (sequenziell im Scrollfluss) -->
<div class="px-3 space-y-1">
	<!-- Klienten-Portal (Admin) -->
	{#if isAdmin}
		<a 
			href="/portal" 
			target="_blank" 
			onclick={onClose}
			class="w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-300 text-xs font-medium transition group" 
			title="Klienten-Portal in neuem Tab öffnen"
		>
			<span class="w-5 h-5 shrink-0 flex items-center justify-center text-sm leading-none">📱</span>
			<span class="truncate font-medium">Klienten-Portal</span>
		</a>
	{/if}

	<!-- E-Mail Postfach (Popup) -->
	<button
		type="button"
		onclick={onOpenMail}
		class="w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/80 dark:hover:text-slate-100 transition group relative cursor-pointer"
		title="E-Mail Postfach (Popup) öffnen"
	>
		<span class="w-5 h-5 shrink-0 flex items-center justify-center text-sm leading-none">✉️</span>
		<span class="truncate font-medium">E-Mail Postfach</span>
		{#if unreadMails > 0}
			<span class="ml-auto flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">{unreadMails}</span>
		{/if}
	</button>

	<!-- Eingangszentrale (Gebündelt für Kundenanfragen, Support & Vorschläge) -->
	<button
		type="button"
		onclick={onOpenEingangszentrale}
		class="w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition group cursor-pointer border {
			totalIncomingCount > 0 ? 'bg-indigo-50/70 border-indigo-200/80 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 shadow-2xs' : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/80'
		}"
		title="Eingangszentrale: Kundenanfragen, Support & Vorschläge auf einen Blick"
	>
		<span class="w-5 h-5 shrink-0 flex items-center justify-center text-sm leading-none">📥</span>
		<span class="truncate font-medium">Eingangszentrale</span>
		{#if totalIncomingCount > 0}
			<span class="ml-auto flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse shadow-2xs">
				{totalIncomingCount}
			</span>
		{/if}
	</button>

	<!-- Theme Toggle & Sonnenstand-Vorschau -->
	<div class="flex items-center gap-1 w-full pt-1">
		<button
			type="button"
			onclick={() => themeService.toggle()}
			class="flex-1 min-h-11 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/80 dark:hover:text-slate-100 transition group cursor-pointer"
			title={themeService.tooltipText}
		>
			<span class="w-5 h-5 shrink-0 flex items-center justify-center text-sm">{themeService.icon}</span>
			<span class="truncate font-medium">{themeService.statusBadge}</span>
		</button>

		<button
			type="button"
			onclick={() => { onClose(); window.dispatchEvent(new CustomEvent('open-sun-cycle-modal')); }}
			class="w-10 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 transition cursor-pointer shrink-0"
			title="Sonnenstands-Simulation öffnen"
			aria-label="Tageszeit-Vorschau"
		>
			<span class="text-sm">🌅</span>
		</button>
	</div>
</div>

<!-- Semantische Trennung vor Footer -->
<div class="px-3 pt-3 pb-1 mt-auto">
	<div class="border-t border-slate-200/80 dark:border-neutral-800/80 mb-2"></div>
</div>

<!-- Drawer Footer -->
<div class="p-4 space-y-2 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
	<div class="flex items-center justify-between px-2 text-xs text-slate-500 dark:text-neutral-500 min-h-8">
		<button 
			type="button" 
			onclick={() => { onClose(); updateStore.open(); }} 
			class="hover:text-amber-500 dark:hover:text-amber-400 font-bold transition-colors cursor-pointer py-1"
		>
			{appVersion}
		</button>
		<div class="flex items-center gap-2">
			<button 
				type="button" 
				onclick={onOpenSettings} 
				class="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer py-1 text-[11px] flex items-center gap-1"
			>
				<Settings class="w-3 h-3" />
				<span>Optionen</span>
			</button>
			<span>•</span>
			<button 
				type="button" 
				onclick={onOpenSupport} 
				class="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer py-1"
			>
				Hilfe
			</button>
		</div>
	</div>

	<button 
		type="button" 
		onclick={onLogout} 
		class="w-full min-h-11 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/20 text-xs font-bold transition-all active:scale-95 cursor-pointer"
	>
		<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
		Abmelden
	</button>
</div>
