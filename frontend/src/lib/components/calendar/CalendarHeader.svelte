<script lang="ts">
	import { ChevronLeft, ChevronRight, Plus } from 'lucide-svelte';
	import CalendarActionsDropdown from './CalendarActionsDropdown.svelte';
	import type { CalendarViewMode } from '$lib/types/calendar';

	interface Props {
		currentDate: Date;
		viewMode: CalendarViewMode;
		isSubmitting?: boolean;
		isWidget?: boolean;
		canEdit?: boolean;
		showFilterBar?: boolean;
		hasActiveFilters?: boolean;
		onPrev: () => void;
		onNext: () => void;
		onToday: () => void;
		onViewModeChange: (mode: CalendarViewMode) => void;
		onNewAppointment?: () => void;
		onSync?: () => Promise<void> | void;
		onExport?: () => void;
		onPrint?: () => void;
		onToggleFilters?: () => void;
		onOpenSettings?: () => void;
		onBulkBlock?: () => void;
		onBulkVisibility?: () => void;
	}

	let {
		currentDate,
		viewMode,
		isSubmitting = false,
		isWidget = false,
		canEdit = true,
		showFilterBar = false,
		hasActiveFilters = false,
		onPrev,
		onNext,
		onToday,
		onViewModeChange,
		onNewAppointment,
		onSync,
		onExport,
		onPrint,
		onToggleFilters,
		onOpenSettings,
		onBulkBlock,
		onBulkVisibility
	}: Props = $props();

	const monthNames = [
		"Januar", "Februar", "März", "April", "Mai", "Juni", 
		"Juli", "August", "September", "Oktober", "November", "Dezember"
	];

	let monthName = $derived(monthNames[currentDate.getMonth()]);
	let year = $derived(currentDate.getFullYear());
</script>

<div class="orga-calendar-toolbar flex flex-col sm:flex-row items-stretch sm:items-center justify-between {isWidget ? 'p-2.5 sm:p-3' : 'p-3 md:p-4'} gap-2 sm:gap-3 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800">
	<!-- Linker Bereich: Datumsnavigation (Vor, Zurück, Monat, Heute) -->
	<div class="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2">
		<div class="flex items-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-0.5 shadow-2xs shrink-0">
			<button
				type="button"
				onclick={onPrev}
				class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer active:scale-95"
				aria-label="Vorheriger Monat"
				title="Vorheriger Zeitraum"
			>
				<ChevronLeft class="w-4.5 h-4.5" />
			</button>

			<span class="w-24 sm:w-30 text-center font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm truncate select-none px-1">
				{monthName} {year}
			</span>

			<button
				type="button"
				onclick={onNext}
				class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer active:scale-95"
				aria-label="Nächster Monat"
				title="Nächster Zeitraum"
			>
				<ChevronRight class="w-4.5 h-4.5" />
			</button>
		</div>

		<button
			type="button"
			onclick={onToday}
			class="inline-flex h-9 px-3 items-center justify-center text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-xl shadow-2xs transition-colors shrink-0 cursor-pointer active:scale-95"
			title="Zum heutigen Datum springen"
		>
			Heute
		</button>
	</div>

	<!-- Rechter Bereich / Menüzeile: Ansichtsumschaltung + Primärer CTA + Overflow-Aktionsmenü -->
	<div class="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
		<!-- Ansicht-Umschalter (Monat / Woche) -->
		<div class="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-inner shrink-0">
			<button
				type="button"
				onclick={() => onViewModeChange('month')}
				class="h-8 px-2.5 sm:px-3 text-xs font-bold rounded-lg transition-all cursor-pointer {viewMode === 'month' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
				aria-pressed={viewMode === 'month'}
			>
				Monat
			</button>
			<button
				type="button"
				onclick={() => onViewModeChange('week')}
				class="h-8 px-2.5 sm:px-3 text-xs font-bold rounded-lg transition-all cursor-pointer {viewMode === 'week' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
				aria-pressed={viewMode === 'week'}
			>
				Woche
			</button>
		</div>

		<!-- Primäre Hauptaktion: Neuer Termin (dauerhaft prominent sichtbar) -->
		{#if canEdit && onNewAppointment}
			<button
				type="button"
				onclick={onNewAppointment}
				class="inline-flex h-9 items-center justify-center gap-1.5 px-3 sm:px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
				title="Neuen Termin anlegen"
			>
				<Plus class="w-4 h-4 shrink-0 stroke-[2.5]" />
				<span class="{isWidget ? 'hidden lg:inline' : 'hidden sm:inline'}">Neuer Termin</span>
				<span class="{isWidget ? 'inline lg:hidden' : 'inline sm:hidden'}">Termin</span>
			</button>
		{/if}

		<!-- Konsolidiertes Aktionsmenü (Overflow-Dropdown) -->
		<CalendarActionsDropdown
			{isSubmitting}
			{onSync}
			{onExport}
			{onPrint}
			onOpenFilters={onToggleFilters}
			{onOpenSettings}
			{onBulkBlock}
			{onBulkVisibility}
			{hasActiveFilters}
		/>
	</div>
</div>
