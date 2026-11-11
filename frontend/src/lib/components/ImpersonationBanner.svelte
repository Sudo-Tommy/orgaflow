<!-- src/lib/components/ImpersonationBanner.svelte -->
<script lang="ts">
	import { impersonationService } from "$lib/services/impersonationService.svelte";
	import { devRoleService } from "$lib/services/devRoleService.svelte";
</script>

{#if impersonationService.isImpersonating}
	<aside 
		class="fixed top-0 left-0 right-0 z-50 bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 dark:from-amber-950 dark:via-neutral-900 dark:to-orange-950 text-white dark:text-amber-100 shadow-xl border-b border-amber-400/50 dark:border-amber-600/40 px-3 py-2 sm:px-6 transition-all duration-300"
		aria-label="Hinweis zum aktiven Imitierungsmodus"
	>
		<div class="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
			<!-- Linke Info-Box -->
			<div class="flex items-center gap-2.5 min-w-0">
				<span class="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 dark:bg-amber-500/20 backdrop-blur-xs text-base shrink-0 animate-pulse">
					🎭
				</span>
				<div class="truncate">
					<span class="font-extrabold tracking-wide uppercase text-[10px] sm:text-xs bg-white/25 dark:bg-amber-400/20 px-2 py-0.5 rounded-full mr-1.5 inline-block">
						Imitierungsmodus
					</span>
					<span class="font-medium">
						Angemeldet als 
						<strong class="font-bold underline decoration-white/40 underline-offset-2">
							{impersonationService.impersonatedUser?.name || 'Benutzer'}
						</strong>
						{#if impersonationService.impersonatedUser?.role}
							<span class="text-white/80 dark:text-amber-300/80 text-xs">
								({impersonationService.impersonatedUser.role})
							</span>
						{/if}
					</span>
				</div>
			</div>

			<!-- Rechter Aktions-Button: Zurück zu Tommy -->
			<button
				type="button"
				onclick={() => impersonationService.stopImpersonation()}
				disabled={impersonationService.isLoading}
				class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white text-amber-900 hover:bg-amber-50 dark:bg-amber-500 dark:text-neutral-950 dark:hover:bg-amber-400 font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 min-h-11 cursor-pointer"
				title="Imitierungsmodus beenden und zum Hauptkonto zurückkehren"
			>
				{#if impersonationService.isLoading}
					<span class="inline-block w-4 h-4 border-2 border-amber-900 dark:border-neutral-950 border-t-transparent rounded-full animate-spin"></span>
					<span>Rückkehr...</span>
				{:else}
					<span>↩</span>
					<span class="hidden sm:inline">Zurück zu Tommy (Inhaber)</span>
					<span class="sm:hidden">Zurück</span>
				{/if}
			</button>
		</div>
	</aside>
{:else if devRoleService.isSimulatingRole}
	<aside 
		class="fixed top-0 left-0 right-0 z-50 bg-linear-to-r from-indigo-600 via-violet-600 to-indigo-700 dark:from-indigo-950 dark:via-neutral-900 dark:to-violet-950 text-white shadow-xl border-b border-indigo-400/50 dark:border-indigo-600/40 px-3 py-2 sm:px-6 transition-all duration-300"
		aria-label="Hinweis zum aktiven Entwickler-Rollenwechsel"
	>
		<div class="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
			<!-- Linke Info-Box -->
			<div class="flex items-center gap-2.5 min-w-0">
				<span class="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 backdrop-blur-xs text-base shrink-0 animate-pulse">
					⚡
				</span>
				<div class="truncate">
					<span class="font-extrabold tracking-wide uppercase text-[10px] sm:text-xs bg-white/25 px-2 py-0.5 rounded-full mr-1.5 inline-block">
						Rollen-Test aktiv
					</span>
					<span class="font-medium">
						Du testest OrgaFlow aktuell als: 
						<strong class="font-bold underline decoration-white/40 underline-offset-2">
							{devRoleService.currentRoleLabel}
						</strong>
					</span>
				</div>
			</div>

			<!-- Rechte Aktions-Buttons -->
			<div class="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onclick={() => window.dispatchEvent(new CustomEvent('open-user-switch-modal'))}
					class="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold transition-all min-h-11 cursor-pointer"
					title="Anderen Benutzer oder Rolle auswählen"
				>
					<span>🎭 Andere Rolle</span>
				</button>
				<button
					type="button"
					onclick={() => devRoleService.resetToDeveloper()}
					disabled={devRoleService.isSwitching}
					class="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white text-indigo-950 hover:bg-indigo-50 font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 min-h-11 cursor-pointer"
					title="Rolle zurücksetzen und Entwickler-Status wiederherstellen"
				>
					<span>↩</span>
					<span class="hidden sm:inline">Zurück zu Entwickler</span>
					<span class="sm:hidden">Entwickler</span>
				</button>
			</div>
		</div>
	</aside>
{/if}
