<script lang="ts">
	import { orgaStore } from "$lib/stores/orgaStore.svelte";
	import { impersonationService } from "$lib/services/impersonationService.svelte";
	import { devRoleService } from "$lib/services/devRoleService.svelte";
	import DevRoleSwitcher from "$lib/components/DevRoleSwitcher.svelte";
	import { pb } from "$lib/services/pocketbase";

	let dialog: HTMLDialogElement;
	let isOpen = $state(false);
	let searchQuery = $state("");
	let activeFilter = $state<'all' | 'employees' | 'clients'>('all');
	let switchingId = $state<string | null>(null);

	export function open() {
		isOpen = true;
		searchQuery = "";
		activeFilter = 'all';
		dialog?.showModal();
	}

	export function close() {
		isOpen = false;
		dialog?.close();
	}

	// 1. Mitarbeiter & Admins aus PocketBase 'users'
	let employeeList = $derived(
		(orgaStore.users?.data || []).map((u: any) => ({
			id: u.id,
			name: `${u.name_first || ''} ${u.name_last || ''}`.trim() || u.username || u.email || 'Benutzer',
			email: u.email || '',
			role: u.role || 'Mitarbeiter',
			roleLabel: u.role === 'developer' ? 'Entwickler' : u.role === 'superadmin' ? 'Superadmin' : u.role === 'admin' ? 'Betriebsleiter' : 'Betreuer / Mitarbeiter',
			type: 'user' as const,
			avatarBg: u.role === 'developer'
				? 'bg-linear-to-br from-cyan-600 to-indigo-600'
				: (u.role === 'superadmin' || u.role === 'admin' 
					? 'bg-linear-to-br from-violet-600 to-indigo-600' 
					: 'bg-linear-to-br from-emerald-600 to-teal-600')
		}))
	);

	// 2. Klienten aus 'clients'
	let clientList = $derived(
		(orgaStore.clients?.data || []).map((c: any) => ({
			id: c.id,
			name: `${c.name_first || ''} ${c.name_last || ''}`.trim(),
			email: c.email || '',
			role: 'Klient',
			roleLabel: 'Klient (Portal)',
			type: 'client' as const,
			avatarBg: 'bg-linear-to-br from-cyan-600 to-blue-600'
		}))
	);

	// 3. Gefilterte Gesamtliste
	let filteredUsers = $derived.by(() => {
		let combined: any[] = [];
		if (activeFilter === 'all') combined = [...employeeList, ...clientList];
		else if (activeFilter === 'employees') combined = [...employeeList];
		else if (activeFilter === 'clients') combined = [...clientList];

		const q = searchQuery.toLowerCase().trim();
		if (!q) return combined;

		return combined.filter(u => 
			u.name.toLowerCase().includes(q) || 
			u.email.toLowerCase().includes(q) || 
			u.roleLabel.toLowerCase().includes(q)
		);
	});

	async function handleSwitch(user: any) {
		switchingId = user.id;
		const ok = await impersonationService.impersonateUser({
			id: user.id,
			name: user.name,
			role: user.roleLabel,
			type: user.type
		});
		switchingId = null;
		if (ok) close();
	}
</script>

<dialog
	bind:this={dialog}
	class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm w-full max-w-xl mx-auto my-auto rounded-3xl outline-none border-none shadow-2xl"
	onclick={(e) => { if (e.target === dialog) close(); }}
	oncancel={(e) => { e.preventDefault(); close(); }}
>
	{#if isOpen}
		<div class="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl shadow-2xl flex flex-col h-auto animate-in fade-in duration-200">
			<!-- Header -->
			<div class="p-4 sm:p-5 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-neutral-900/50 rounded-t-3xl">
				<div>
					<div class="flex items-center gap-2">
						<span class="text-xl">🎭</span>
						<h3 class="text-lg font-extrabold text-slate-900 dark:text-white">Benutzer wechseln</h3>
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">Inhaber-Modus</span>
					</div>
					<p class="text-xs text-slate-500 dark:text-neutral-400 mt-1">
						Melde dich als Mitarbeiter oder Klient an, um die App exakt aus deren Perspektive zu sehen.
					</p>
				</div>
				<button 
					type="button" 
					onclick={close}
					class="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
					aria-label="Schließen"
				>
					✕
				</button>
			</div>

			{#if devRoleService.isDevAccount}
				<div class="px-5 sm:px-6 pt-4 pb-2 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/30 dark:bg-neutral-950/30">
					<DevRoleSwitcher onRoleSwitched={close} />
				</div>
			{/if}

			<!-- Filter & Suche -->
			<div class="p-4 sm:p-5 border-b border-slate-100 dark:border-neutral-800 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
				<div class="flex bg-slate-100 dark:bg-neutral-800 p-1 rounded-2xl w-full sm:w-auto">
					<button
						type="button"
						onclick={() => activeFilter = 'all'}
						class="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeFilter === 'all' ? 'bg-white dark:bg-neutral-900 text-violet-700 dark:text-violet-300 shadow-xs' : 'text-slate-600 dark:text-neutral-400'}"
					>
						Alle ({employeeList.length + clientList.length})
					</button>
					<button
						type="button"
						onclick={() => activeFilter = 'employees'}
						class="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeFilter === 'employees' ? 'bg-white dark:bg-neutral-900 text-violet-700 dark:text-violet-300 shadow-xs' : 'text-slate-600 dark:text-neutral-400'}"
					>
						Mitarbeiter ({employeeList.length})
					</button>
					<button
						type="button"
						onclick={() => activeFilter = 'clients'}
						class="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeFilter === 'clients' ? 'bg-white dark:bg-neutral-900 text-violet-700 dark:text-violet-300 shadow-xs' : 'text-slate-600 dark:text-neutral-400'}"
					>
						Klienten ({clientList.length})
					</button>
				</div>

				<div class="relative w-full sm:w-64">
					<span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
					<input
						type="search"
						bind:value={searchQuery}
						placeholder="Name, Rolle, E-Mail..."
						class="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
					/>
				</div>
			</div>

			<!-- Benutzerliste -->
			<div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
				{#if filteredUsers.length === 0}
					<div class="py-12 text-center text-slate-400">
						<span class="text-3xl block mb-2">🔍</span>
						<p class="text-xs font-bold">Keine Benutzer gefunden</p>
					</div>
				{:else}
					{#each filteredUsers as user (user.id)}
						{@const isCurrentRealUser = pb.authStore.model?.id === user.id && !impersonationService.isImpersonating}
						{@const isCurrentlyImpersonated = impersonationService.isImpersonating && impersonationService.impersonatedUser?.id === user.id}

						<div class="p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 {isCurrentlyImpersonated ? 'bg-violet-50/70 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700' : 'bg-white dark:bg-neutral-900/60 border-slate-200/80 dark:border-neutral-800 hover:border-violet-300 dark:hover:border-violet-800'}">
							<div class="flex items-center gap-3 min-w-0">
								<div class="w-10 h-10 rounded-2xl {user.avatarBg} text-white font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0">
									{user.name.charAt(0).toUpperCase()}
								</div>
								<div class="min-w-0">
									<div class="flex items-center gap-2">
										<p class="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
										<span class="text-[10px] font-bold px-2 py-0.5 rounded-full {user.type === 'client' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300' : 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300'}">
											{user.roleLabel}
										</span>
									</div>
									<p class="text-xs text-slate-400 truncate mt-0.5">{user.email || 'Keine E-Mail'}</p>
								</div>
							</div>

							<div class="shrink-0 flex items-center gap-2">
								{#if isCurrentlyImpersonated}
									<span class="px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold shadow-xs">
										✓ Aktiv
									</span>
								{:else if isCurrentRealUser}
									<span class="text-xs font-semibold text-slate-400 px-3 py-1.5">
										(Du selbst)
									</span>
								{:else}
									<button
										type="button"
										onclick={() => handleSwitch(user)}
										disabled={switchingId !== null}
										class="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 min-h-11 cursor-pointer flex items-center gap-1.5"
									>
										{#if switchingId === user.id}
											<span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
											<span>Wechsle...</span>
										{:else}
											<span>Anmelden ➔</span>
										{/if}
									</button>
								{/if}
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<!-- Footer -->
			<div class="p-3.5 sm:p-4 border-t border-slate-100 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/70 flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 shrink-0">
				<span>Tipp: Über den Balken ganz oben kannst du jederzeit mit 1 Klick zurückkehren.</span>
				<button 
					type="button" 
					onclick={close}
					class="px-4 py-1.5 rounded-xl text-slate-600 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-800 font-bold transition-colors cursor-pointer min-h-9"
				>
					Abbrechen
				</button>
			</div>
		</div>
	{/if}
</dialog>
