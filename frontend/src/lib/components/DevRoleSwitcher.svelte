<!-- src/lib/components/DevRoleSwitcher.svelte -->
<script lang="ts">
	import { devRoleService, ROLE_OPTIONS } from "$lib/services/devRoleService.svelte";

	let { onRoleSwitched }: { onRoleSwitched?: () => void } = $props();

	async function handleSelectRole(roleId: string) {
		const success = await devRoleService.switchRole(roleId);
		if (success && onRoleSwitched) {
			onRoleSwitched();
		}
	}
</script>

<div class="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-indigo-500/10 via-violet-500/10 to-cyan-500/10 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs space-y-3">
	<!-- Header -->
	<div class="flex items-center justify-between gap-2 flex-wrap">
		<div class="flex items-center gap-2">
			<span class="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
				⚡
			</span>
			<div>
				<h4 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">
					Entwickler-Rollenwechsel
				</h4>
				<p class="text-[11px] text-slate-500 dark:text-neutral-400">
					Wechsle deine eigene Rolle, um die App exakt aus dieser Berechtigungsebene zu testen.
				</p>
			</div>
		</div>

		{#if devRoleService.isSimulatingRole}
			<button
				type="button"
				onclick={() => handleSelectRole('developer')}
				disabled={devRoleService.isSwitching}
				class="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
			>
				<span>↩</span>
				<span>Entwickler wiederherstellen</span>
			</button>
		{/if}
	</div>

	<!-- Rollen-Auswahlkapseln (1-Klick) -->
	<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
		{#each ROLE_OPTIONS as r}
			{@const isCurrent = devRoleService.currentRole === r.id}
			<button
				type="button"
				onclick={() => handleSelectRole(r.id)}
				disabled={devRoleService.isSwitching}
				class="p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 active:scale-95 min-h-[70px] {isCurrent 
					? 'bg-white dark:bg-neutral-800 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs' 
					: 'bg-white/70 dark:bg-neutral-900/60 border-slate-200 dark:border-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-white dark:hover:bg-neutral-850'}"
				title="{r.label}: {r.desc}"
			>
				<div class="flex items-center justify-between gap-1 w-full">
					<span class="text-base">{r.icon}</span>
					{#if isCurrent}
						<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Aktuell aktiv"></span>
					{/if}
				</div>
				<div>
					<p class="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
						{r.label}
					</p>
					<p class="text-[10px] text-slate-400 dark:text-neutral-500 truncate mt-0.5">
						{r.badge}
					</p>
				</div>
			</button>
		{/each}
	</div>
</div>
