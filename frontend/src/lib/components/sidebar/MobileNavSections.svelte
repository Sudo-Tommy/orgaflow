<script lang="ts">
	let {
		coreItems = [],
		financeDocItems = [],
		systemItems = [],
		currentPath = '',
		pendingRequests = 0,
		pendingAdmissions = 0,
		unreadMails = 0,
		onClose
	}: {
		coreItems: any[];
		financeDocItems: any[];
		systemItems: any[];
		currentPath: string;
		pendingRequests: number;
		pendingAdmissions: number;
		unreadMails: number;
		onClose: () => void;
	} = $props();
</script>

<nav class="px-3 py-2 space-y-4" aria-label="Mobil-Navigation">
	<!-- Gruppe 1: Tagesgeschäft -->
	<div>
		<p class="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest px-3 mb-1.5">Tagesgeschäft</p>
		<div class="space-y-1">
			{#each coreItems as item}
				{@const isActive = currentPath.startsWith(item.href) && (item.href !== '/' || currentPath === '/')}
				{@const badge = item.badgeKey === 'requests' ? pendingRequests : item.badgeKey === 'admissions' ? pendingAdmissions : item.badgeKey === 'mails' ? unreadMails : 0}
				<a
					href={item.href}
					onclick={onClose}
					class="flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-xl transition-all font-medium text-sm {isActive ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/60 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30 font-bold shadow-2xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white'}"
				>
					<span class="w-5 h-5 shrink-0 {isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-neutral-500'}">
						{@render item.icon()}
					</span>
					<span class="flex-1 truncate">{item.label}</span>
					{#if badge > 0}
						<span class="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold text-white {item.badgeKey === 'admissions' ? 'bg-emerald-500' : item.badgeKey === 'mails' ? 'bg-blue-600' : 'bg-indigo-600'}">
							{badge}
						</span>
					{:else if isActive}
						<span class="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
					{/if}
				</a>
			{/each}
		</div>
	</div>

	<!-- Gruppe 2: Finanzen & Vorlagen -->
	{#if financeDocItems.length > 0}
		<div>
			<p class="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest px-3 mb-1.5">Finanzen & Vorlagen</p>
			<div class="space-y-1">
				{#each financeDocItems as item}
					{@const isActive = currentPath.startsWith(item.href)}
					<a
						href={item.href}
						onclick={onClose}
						class="flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-xl transition-all font-medium text-sm {isActive ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/60 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30 font-bold shadow-2xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white'}"
					>
						<span class="w-5 h-5 shrink-0 {isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-neutral-500'}">
							{@render item.icon()}
						</span>
						<span class="flex-1 truncate">{item.label}</span>
						{#if isActive}
							<span class="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
						{/if}
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Gruppe 3: Verwaltung & System -->
	<div>
		<p class="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest px-3 mb-1.5">Verwaltung & System</p>
		<div class="space-y-1">
			{#each systemItems as item}
				{@const isActive = currentPath.startsWith(item.href)}
				<a
					href={item.href}
					onclick={onClose}
					class="flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-xl transition-all font-medium text-sm {isActive ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/60 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30 font-bold shadow-2xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white'}"
				>
					<span class="w-5 h-5 shrink-0 {isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-neutral-500'}">
						{@render item.icon()}
					</span>
					<span class="flex-1 truncate">{item.label}</span>
					{#if isActive}
						<span class="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
					{/if}
				</a>
			{/each}
		</div>
	</div>
</nav>
