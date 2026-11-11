<script lang="ts">
	import { Inbox, Settings } from "lucide-svelte";
	import { updateStore } from "$lib/services/updateService.svelte";
	import { notificationStore } from "$lib/services/notificationStore.svelte";
	import { systemDialogService } from "$lib/services/systemDialogService.svelte";
	import { rbacService } from "$lib/services/rbacService.svelte";
	import PwaInstallButton from "$lib/components/app/PwaInstallButton.svelte";

	let {
		isAdmin = false,
		appVersion = "v1.0.0",
		unreadMails = 0,
		onOpenMail,
		onOpenEingangszentrale,
		onOpenSettings,
		onOpenSupport,
		onLogout
	}: {
		isAdmin: boolean;
		appVersion: string;
		unreadMails: number;
		onOpenMail: () => void;
		onOpenEingangszentrale: () => void;
		onOpenSettings: () => void;
		onOpenSupport: () => void;
		onLogout: () => void;
	} = $props();

	let isCaregiver = $derived(rbacService.isCaregiver);
	let totalIncomingCount = $derived(notificationStore.totalIncomingCount);
</script>

<!-- Semantische Trennung: Aktionen & Funktionen -->
{#if !isCaregiver || isAdmin}
	<div class="px-3 pt-2 pb-1">
		<div class="border-t border-slate-200/80 dark:border-slate-800/60 mb-2"></div>
		<p class="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest px-2 mb-1">Aktionen & Funktionen</p>
	</div>

	<!-- Aktions-Buttons (aufgeräumt & gebündelt) -->
	<div class="px-3 space-y-1">
		<!-- Eil-Mitteilung (Admin) -->
		{#if isAdmin}
			<button
				type="button"
				onclick={() => systemDialogService.isSendModalOpen = true}
				class="w-full min-h-10 flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 text-xs font-bold transition group cursor-pointer border border-amber-200/70 dark:border-amber-800/50"
				title="Wichtige Eil-Mitteilung an Mitarbeiter senden"
			>
				<span class="w-4 h-4 shrink-0 flex items-center justify-center text-sm leading-none">💬</span>
				<span class="truncate">Eil-Mitteilung</span>
			</button>

			<!-- Klienten-Portal (Admin) -->
			<a href="/portal" target="_blank" class="w-full min-h-10 flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-300 text-xs font-medium transition group" title="Klienten-Portal in neuem Tab öffnen">
				<span class="w-4 h-4 shrink-0 flex items-center justify-center text-sm leading-none">📱</span>
				<span class="truncate">Klienten-Portal</span>
			</a>
		{/if}

		<!-- E-Mail Postfach (Popup) – Für Mitarbeiter verborgen -->
		{#if !isCaregiver}
			<button
				type="button"
				onclick={onOpenMail}
				class="w-full min-h-10 flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/80 dark:hover:text-slate-100 transition group relative cursor-pointer"
				title="E-Mail Postfach (Popup) öffnen"
			>
				<span class="w-4 h-4 shrink-0 flex items-center justify-center text-sm leading-none">✉️</span>
				<span class="truncate">E-Mail Postfach</span>
				{#if unreadMails > 0}
					<span class="ml-auto flex items-center justify-center h-4.5 min-w-4.5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">{unreadMails}</span>
				{/if}
			</button>

			<!-- Eingangszentrale – Für Mitarbeiter verborgen -->
			<button
				type="button"
				onclick={onOpenEingangszentrale}
				class="w-full min-h-10 flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold transition group cursor-pointer border {
					totalIncomingCount > 0 ? 'bg-indigo-50/70 border-indigo-200/80 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 shadow-2xs' : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/80'
				}"
				title="Eingangszentrale: Kundenanfragen, Support & Vorschläge auf einen Blick"
			>
				<span class="w-4 h-4 shrink-0 flex items-center justify-center text-sm leading-none">📥</span>
				<span class="truncate">Eingangszentrale</span>
				{#if totalIncomingCount > 0}
					<span class="ml-auto flex items-center justify-center h-4.5 min-w-4.5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse shadow-2xs">
						{totalIncomingCount}
					</span>
				{/if}
			</button>
		{/if}
	</div>
{/if}

<!-- Semantische Trennung: System & Footer -->
<div class="px-3 pt-3 pb-1 mt-auto">
	<div class="border-t border-slate-200/80 dark:border-slate-800/60 mb-2"></div>
</div>

<!-- Footer-Aktionen -->
<div class="px-3 pb-6 space-y-2">
	<div class="flex items-center justify-between px-2 py-1 text-xs text-slate-500 dark:text-slate-400 font-medium min-h-8">
		<button type="button" onclick={() => updateStore.open()} class="hover:text-amber-500 dark:hover:text-amber-400 font-bold cursor-pointer transition-colors py-1" title="Update-Verlauf anzeigen">{appVersion}</button>
		<div class="flex items-center gap-2">
			<button type="button" onclick={onOpenSettings} class="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors py-1 text-[11px] flex items-center gap-1" title="Benachrichtigungseinstellungen">
				<Settings class="w-3 h-3" />
				<span>Optionen</span>
			</button>
			<span>•</span>
			<button type="button" onclick={onOpenSupport} class="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors py-1">Hilfe</button>
		</div>
	</div>

	<!-- Desktop PWA 1-Klick Installation -->
	<PwaInstallButton variant="full" />

	<!-- Abmelden -->
	<button
		type="button"
		onclick={onLogout}
		class="orga-button-danger w-full min-h-11 flex items-center justify-center gap-2 cursor-pointer text-xs font-bold"
	>
		<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
		Abmelden
	</button>
</div>
