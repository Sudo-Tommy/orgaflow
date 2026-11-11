<script lang="ts">
	import { 
		MoreVertical, 
		Calendar, 
		Download, 
		RefreshCw, 
		SlidersHorizontal, 
		Printer,
		Ban,
		Eye
	} from 'lucide-svelte';
	import { triggerHaptic } from '$lib/services/hapticFeedback';

	interface Props {
		isSubmitting?: boolean;
		onSync?: () => Promise<void> | void;
		onExport?: () => void;
		onPrint?: () => void;
		onOpenFilters?: () => void;
		onOpenSettings?: () => void;
		onBulkBlock?: () => void;
		onBulkVisibility?: () => void;
		hasActiveFilters?: boolean;
	}

	let {
		isSubmitting = false,
		onSync,
		onExport,
		onPrint,
		onOpenFilters,
		onOpenSettings,
		onBulkBlock,
		onBulkVisibility,
		hasActiveFilters = false
	}: Props = $props();

	let isOpen = $state(false);
	let menuRef = $state<HTMLDivElement | null>(null);

	function toggleMenu() {
		if (isSubmitting) return;
		triggerHaptic('tap');
		isOpen = !isOpen;
	}

	function closeMenu() {
		isOpen = false;
	}

	// Klick außerhalb und Escape-Taste abfangen
	$effect(() => {
		if (!isOpen) return;

		function handleClickOutside(event: MouseEvent) {
			if (menuRef && !menuRef.contains(event.target as Node)) {
				closeMenu();
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				closeMenu();
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	});

	async function handleAction(action?: () => Promise<void> | void) {
		if (!action || isSubmitting) return;
		triggerHaptic('selection');
		closeMenu();
		await action();
	}
</script>

<div class="relative inline-block text-left" bind:this={menuRef}>
	<button
		type="button"
		class="relative inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer active:scale-95 touch-manipulation"
		onclick={toggleMenu}
		aria-expanded={isOpen}
		aria-haspopup="true"
		aria-label="Weitere Kalenderoptionen anzeigen"
		disabled={isSubmitting}
	>
		{#if isSubmitting}
			<span class="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></span>
		{:else}
			<MoreVertical class="h-4.5 w-4.5" />
		{/if}

		{#if hasActiveFilters && !isSubmitting}
			<span class="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-800" title="Aktive Filter"></span>
		{/if}
	</button>

	{#if isOpen}
		<div
			class="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 shadow-xl ring-1 ring-black/5 focus:outline-none backdrop-blur-md"
			role="menu"
			aria-orientation="vertical"
			tabindex="-1"
		>
			{#if onOpenFilters}
				<button
					type="button"
					class="flex min-h-[44px] w-full items-center px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/70 hover:text-slate-900 dark:hover:text-white cursor-pointer"
					role="menuitem"
					onclick={() => handleAction(onOpenFilters)}
				>
					<SlidersHorizontal class="mr-3 h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
					<span class="flex-1 truncate">Filter anpassen</span>
					{#if hasActiveFilters}
						<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">Aktiv</span>
					{/if}
				</button>
			{/if}

			{#if onSync}
				<button
					type="button"
					class="flex min-h-[44px] w-full items-center px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/70 hover:text-slate-900 dark:hover:text-white cursor-pointer"
					role="menuitem"
					onclick={() => handleAction(onSync)}
					disabled={isSubmitting}
				>
					<RefreshCw class="mr-3 h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0 {isSubmitting ? 'animate-spin text-indigo-600' : ''}" />
					<span class="truncate">Kalender synchronisieren</span>
				</button>
			{/if}

			{#if onPrint}
				<button
					type="button"
					class="flex min-h-[44px] w-full items-center px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/70 hover:text-slate-900 dark:hover:text-white cursor-pointer"
					role="menuitem"
					onclick={() => handleAction(onPrint)}
				>
					<Printer class="mr-3 h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
					<span class="truncate">Druckansicht öffnen</span>
				</button>
			{/if}

			{#if onExport}
				<button
					type="button"
					class="flex min-h-[44px] w-full items-center px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/70 hover:text-slate-900 dark:hover:text-white cursor-pointer"
					role="menuitem"
					onclick={() => handleAction(onExport)}
				>
					<Download class="mr-3 h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
					<span class="truncate">Termine exportieren (iCal)</span>
				</button>
			{/if}

			{#if onBulkBlock || onBulkVisibility}
				<div class="my-1 border-t border-slate-100 dark:border-slate-700/80"></div>
				
				{#if onBulkBlock}
					<button
						type="button"
						class="flex min-h-[44px] w-full items-center px-4 py-2.5 text-left text-sm font-medium text-rose-700 dark:text-rose-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
						role="menuitem"
						onclick={() => handleAction(onBulkBlock)}
					>
						<Ban class="mr-3 h-4 w-4 text-rose-500 shrink-0" />
						<span class="truncate">Sperrzeiten verwalten</span>
					</button>
				{/if}

				{#if onBulkVisibility}
					<button
						type="button"
						class="flex min-h-[44px] w-full items-center px-4 py-2.5 text-left text-sm font-medium text-sky-700 dark:text-sky-400 transition-colors hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer"
						role="menuitem"
						onclick={() => handleAction(onBulkVisibility)}
					>
						<Eye class="mr-3 h-4 w-4 text-sky-500 shrink-0" />
						<span class="truncate">Sichtbarkeit anpassen</span>
					</button>
				{/if}
			{/if}

			{#if onOpenSettings}
				<div class="my-1 border-t border-slate-100 dark:border-slate-700/80"></div>
				<button
					type="button"
					class="flex min-h-[44px] w-full items-center px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/70 hover:text-slate-900 dark:hover:text-white cursor-pointer"
					role="menuitem"
					onclick={() => handleAction(onOpenSettings)}
				>
					<Calendar class="mr-3 h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
					<span class="truncate">Kalender-Einstellungen</span>
				</button>
			{/if}
		</div>
	{/if}
</div>
