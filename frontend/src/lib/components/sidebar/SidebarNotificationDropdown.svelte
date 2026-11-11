<script lang="ts">
	import { X } from "lucide-svelte";
	import { updateStore } from "$lib/services/updateService.svelte";
	import { notificationStore } from "$lib/services/notificationStore.svelte";

	let {
		unreadMails = 0,
		pendingRequests = 0,
		pendingAdmissions = 0,
		unreadProposals = 0,
		hasUnreadUpdates = false,
		onOpenMail,
		onOpenRequests,
		onOpenSettings,
		onOpenProposals
	}: {
		unreadMails: number;
		pendingRequests: number;
		pendingAdmissions: number;
		unreadProposals: number;
		hasUnreadUpdates: boolean;
		onOpenMail: () => void;
		onOpenRequests: () => void;
		onOpenSettings: () => void;
		onOpenProposals: () => void;
	} = $props();

	let totalNotifications = $derived(notificationStore.totalNotifications);
</script>

<div class="mt-1.5 mb-2 w-full bg-white dark:bg-neutral-900/95 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden z-40 p-1">
	<div class="p-2.5 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60 flex justify-between items-center">
		<h3 class="font-bold text-slate-900 dark:text-neutral-100 text-xs">Benachrichtigungen</h3>
		<div class="flex items-center gap-1.5">
			{#if totalNotifications > 0}
				<span class="text-[10px] font-bold text-slate-600 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">{totalNotifications}</span>
			{/if}
			<button 
				type="button" 
				onclick={() => notificationStore.closeNotifications()}
				class="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
				aria-label="Schließen"
			>
				<X class="w-3.5 h-3.5" />
			</button>
		</div>
	</div>

	<div>
		{#if totalNotifications === 0}
			<div class="p-4 text-center flex flex-col items-center justify-center">
				<span class="text-xl mb-1 opacity-50">✨</span>
				<p class="text-xs font-semibold text-slate-800 dark:text-neutral-200">Alles erledigt!</p>
				<p class="text-[10px] text-slate-400 dark:text-neutral-500 mt-0.5">Keine neuen Benachrichtigungen.</p>
			</div>
		{/if}

		<div class="flex flex-col">
			<!-- 1. System-Updates Popup-Modal -->
			<button 
				type="button" 
				onclick={() => { notificationStore.closeNotifications(); updateStore.open(); }} 
				class="w-full text-left p-2.5 border-b border-slate-100 dark:border-neutral-800/60 hover:bg-slate-50 dark:hover:bg-neutral-800/80 transition-colors flex items-start gap-2.5 cursor-pointer group"
			>
				<div class="w-7 h-7 rounded-full bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 text-sm group-hover:scale-110 transition-transform">✨</div>
				<div class="min-w-0 flex-1">
					<p class="text-xs font-bold text-slate-900 dark:text-neutral-100 truncate">{hasUnreadUpdates ? 'Neues System-Update' : 'System-Updates (Verlauf)'}</p>
					<p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 flex items-center gap-1">
						<span>Update-Log öffnen</span>
						<span>→</span>
					</p>
				</div>
			</button>

			<!-- 2. E-Mail Popup-Modal -->
			{#if unreadMails > 0}
				<button 
					type="button" 
					onclick={() => { notificationStore.closeNotifications(); onOpenMail(); }} 
					class="w-full text-left p-2.5 border-b border-slate-100 dark:border-neutral-800/60 hover:bg-slate-50 dark:hover:bg-neutral-800/80 transition-colors flex items-start gap-2.5 cursor-pointer group"
				>
					<div class="w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0 text-sm group-hover:scale-110 transition-transform">✉️</div>
					<div class="min-w-0 flex-1">
						<p class="text-xs font-bold text-slate-900 dark:text-neutral-100 truncate">{unreadMails} ungelesene E-Mail{unreadMails > 1 ? 's' : ''}</p>
						<p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 flex items-center gap-1">
							<span>Posteingang öffnen</span>
							<span>→</span>
						</p>
					</div>
				</button>
			{/if}

			<!-- 3. Terminanfragen Popup-Modal -->
			{#if (Number(pendingRequests) || 0) > 0}
				<button 
					type="button" 
					onclick={() => { notificationStore.closeNotifications(); onOpenRequests(); }} 
					class="w-full text-left p-2.5 border-b border-slate-100 dark:border-neutral-800/60 hover:bg-slate-50 dark:hover:bg-neutral-800/80 transition-colors flex items-start gap-2.5 cursor-pointer group"
				>
					<div class="w-7 h-7 rounded-full bg-brand-500/10 text-brand-500 dark:text-brand-400 flex items-center justify-center shrink-0 text-sm group-hover:scale-110 transition-transform">📬</div>
					<div class="min-w-0 flex-1">
						<p class="text-xs font-bold text-slate-900 dark:text-neutral-100 truncate">{pendingRequests} Terminanfrage{pendingRequests > 1 ? 'n' : ''}</p>
						<p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 flex items-center gap-1">
							<span>Anfragen prüfen</span>
							<span>→</span>
						</p>
					</div>
				</button>
			{/if}

			<!-- 4. Neuaufnahme-Anfragen Popup-Modal -->
			{#if (Number(pendingAdmissions) || 0) > 0}
				<button 
					type="button" 
					onclick={() => { notificationStore.closeNotifications(); onOpenRequests(); }} 
					class="w-full text-left p-2.5 border-b border-slate-100 dark:border-neutral-800/60 hover:bg-slate-50 dark:hover:bg-neutral-800/80 transition-colors flex items-start gap-2.5 cursor-pointer group"
				>
					<div class="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 text-sm group-hover:scale-110 transition-transform">👤</div>
					<div class="min-w-0 flex-1">
						<p class="text-xs font-bold text-slate-900 dark:text-neutral-100 truncate">{pendingAdmissions} Neuaufnahme-Anfrage{pendingAdmissions > 1 ? 'n' : ''}</p>
						<p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 flex items-center gap-1">
							<span>Aufnahmen ansehen</span>
							<span>→</span>
						</p>
					</div>
				</button>
			{/if}

			<!-- 5. Neue Verbesserungsvorschläge -->
			{#if unreadProposals > 0}
				<button 
					type="button" 
					onclick={() => { notificationStore.closeNotifications(); onOpenProposals(); }} 
					class="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-neutral-800/80 transition-colors flex items-start gap-2.5 cursor-pointer group"
				>
					<div class="w-7 h-7 rounded-full bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 text-sm group-hover:scale-110 transition-transform">💡</div>
					<div class="min-w-0 flex-1">
						<p class="text-xs font-bold text-slate-900 dark:text-neutral-100 truncate">{unreadProposals} neue{unreadProposals > 1 ? 'r' : ''} Vorschlag/Vorschläge</p>
						<p class="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5 flex items-center gap-1">
							<span>Vorschläge anzeigen</span>
							<span>→</span>
						</p>
					</div>
				</button>
			{/if}
		</div>
	</div>

	<div class="p-2 border-t border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/80 flex justify-center">
		<button 
			type="button" 
			onclick={() => { notificationStore.closeNotifications(); onOpenSettings(); }} 
			class="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5 py-1 cursor-pointer"
		>
			<span>⚙️</span> Einstellungen
		</button>
	</div>
</div>
