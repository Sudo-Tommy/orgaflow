<script lang="ts">
	let {
		coreItems = [],
		financeItems = [],
		systemItems = [],
		currentPath = '',
		pendingRequests = 0,
		pendingAdmissions = 0,
		unreadMails = 0
	}: {
		coreItems: any[];
		financeItems: any[];
		systemItems: any[];
		currentPath: string;
		pendingRequests: number;
		pendingAdmissions: number;
		unreadMails: number;
	} = $props();
</script>

<!-- 3. Hauptnavigation (Semantisch gegliedert in 3 Gruppen) -->
<nav class="px-3 py-1 space-y-4" aria-label="Hauptnavigation">
	<!-- Gruppe 1: Tagesgeschäft -->
	<div>
		<p class="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest px-2.5 mb-1">Tagesgeschäft</p>
		<div class="space-y-0.5">
			{#each coreItems as item}
				{@const isActive = currentPath.startsWith(item.href) && (item.href !== '/' || currentPath === '/')}
				{@const badge = item.badgeKey === 'requests' ? pendingRequests : item.badgeKey === 'admissions' ? pendingAdmissions : item.badgeKey === 'mails' ? unreadMails : 0}
				<a
					href={item.href}
					class="w-full min-h-10 flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition duration-150 group {isActive ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/60 font-semibold dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800 shadow-2xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/80 dark:hover:text-slate-100'}"
				>
					<span class="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 {isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}">
						{@render item.icon()}
					</span>
					<span class="truncate flex-1">{item.label}</span>
					{#if badge > 0}
						<span class="flex items-center justify-center h-4.5 min-w-4.5 px-1.5 rounded-full text-[10px] font-bold text-white {item.badgeKey === 'admissions' ? 'bg-emerald-500' : item.badgeKey === 'mails' ? 'bg-blue-600' : 'bg-indigo-600'}">
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
	{#if financeItems.length > 0}
		<div>
			<p class="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest px-2.5 mb-1">Finanzen & Vorlagen</p>
			<div class="space-y-0.5">
				{#each financeItems as item}
					{@const isActive = currentPath.startsWith(item.href)}
					<a
						href={item.href}
						class="w-full min-h-10 flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition duration-150 group {isActive ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/60 font-semibold dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800 shadow-2xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/80 dark:hover:text-slate-100'}"
					>
						<span class="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 {isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}">
							{@render item.icon()}
						</span>
						<span class="truncate flex-1">{item.label}</span>
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
		<p class="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest px-2.5 mb-1">Verwaltung & System</p>
		<div class="space-y-0.5">
			{#each systemItems as item}
				{@const isActive = currentPath.startsWith(item.href)}
				<a
					href={item.href}
					class="w-full min-h-10 flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition duration-150 group {isActive ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/60 font-semibold dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800 shadow-2xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/80 dark:hover:text-slate-100'}"
				>
					<span class="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 {isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}">
						{@render item.icon()}
					</span>
					<span class="truncate flex-1">{item.label}</span>
					{#if isActive}
						<span class="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
					{/if}
				</a>
			{/each}
		</div>
	</div>
</nav>
