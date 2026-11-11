<script lang="ts">
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { X, Calendar, Clock, MapPin, ListTodo, User, AlertCircle } from "lucide-svelte";
    import { AppointmentModalState, type AppointmentModalTab } from "./appointmentModal/appointmentModalState.svelte";
    import { saveAppointment, deleteAppointmentAction, deleteSeriesAction } from "./appointmentModal/appointmentModalActions";
    import AppointmentTimeTab from "./appointmentModal/AppointmentTimeTab.svelte";
    import AppointmentLocationTab from "./appointmentModal/AppointmentLocationTab.svelte";
    import AppointmentTasksTab from "./appointmentModal/AppointmentTasksTab.svelte";
    import AppointmentClientTab from "./appointmentModal/AppointmentClientTab.svelte";

    interface Props {
        onSaved?: (record?: any) => void;
        onClose?: () => void;
    }
    let { onSaved, onClose }: Props = $props();

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    const state = new AppointmentModalState();

    interface TabItem {
        id: AppointmentModalTab;
        label: string;
        icon: any;
        badge?: string | number | null;
        badgeType?: 'amber' | 'emerald' | 'indigo' | 'neutral';
    }

    let tabs = $derived<TabItem[]>([
        { id: 'time', label: 'Titel & Terminzeit', icon: Clock, badge: state.durationBadge, badgeType: 'emerald' },
        { id: 'location', label: 'Ort & Zieladresse', icon: MapPin, badge: state.location_address ? '✓' : null, badgeType: 'neutral' },
        { id: 'tasks', label: 'Geplante Tätigkeiten', icon: ListTodo, badge: state.selectedTasks.length > 0 ? state.selectedTasks.length : null, badgeType: 'amber' },
        { id: 'client', label: 'Mitarbeiter & Notizen', icon: User, badge: state.internalNotes ? 'Notiz' : null, badgeType: 'indigo' }
    ]);

    export function open(data?: any) {
        state.open(data);
        dialog?.showModal();
        setTimeout(() => {
            dialog?.querySelectorAll('textarea').forEach(ta => ta.dispatchEvent(new Event('input')));
        }, 50);
    }

    export function close() {
        state.isClientSearchOpen = false;
        state.isContactSearchOpen = false;
        dialog?.close();
        if (!state.isDeleted && !state.isSaved) {
            onClose?.();
        }
        state.isDeleted = false;
        state.isSaved = false;
    }

    export async function attemptClose() {
        if (state.isDirty()) {
            if (!(await confirmStore.ask("Sie haben ungespeicherte Änderungen. Möchten Sie wirklich abbrechen?", "Änderungen verwerfen?", "Verwerfen", "Abbrechen", true))) return;
        }
        close();
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        await saveAppointment(state, onSaved, close);
    }

    async function handleDeleteAppointment() {
        await deleteAppointmentAction(state, close);
    }

    async function handleDeleteSeries() {
        await deleteSeriesAction(state, close);
    }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/80 backdrop:backdrop-blur-md w-full max-w-xl mx-auto my-auto rounded-3xl shadow-2xl" onclick={(e) => { if (e.target === dialog) attemptClose(); }}>
    <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl w-full flex flex-col relative shadow-2xl border border-slate-200/80 dark:border-slate-800">
        <!-- Header -->
        <div class="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-200/80 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex justify-between items-center gap-3 rounded-t-3xl">
            <div class="flex items-center gap-3 sm:gap-4 min-w-0">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Calendar class="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                            {state.editId ? 'Termin bearbeiten' : 'Neuen Termin anlegen'}
                        </h2>
                        {#if state.selectedClientRecord}
                            <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 shrink-0">
                                Klient
                            </span>
                        {/if}
                    </div>
                    <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                        {#if state.selectedClientRecord}
                            <span class="font-bold text-slate-700 dark:text-slate-200">{state.selectedClientRecord.name_first} {state.selectedClientRecord.name_last}</span>
                            {#if state.appDate} • {new Date(state.appDate + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}{/if}
                            {#if state.appStartTime} um {state.appStartTime} Uhr{/if}
                        {:else if state.appDate}
                            {new Date(state.appDate + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                            {#if state.appStartTime} um {state.appStartTime} Uhr{/if}
                        {:else}
                            {rbacService.canAccessFinances ? 'Planen, Zeiten erfassen & Abrechnung vorbereiten' : 'Einsatz planen, Zeiten & Tätigkeiten erfassen'}
                        {/if}
                    </p>
                </div>
            </div>
            <button aria-label="Schließen" title="Schließen" onclick={attemptClose} class="w-10 h-10 min-w-10 min-h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer border border-slate-200 dark:border-slate-700 touch-manipulation">
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- Tabs Navigation -->
        <div class="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                {#each tabs as tab (tab.id)}
                    {@const active = state.activeTab === tab.id}
                    <button
                        type="button"
                        onclick={() => { hapticFeedback.tap(); state.activeTab = tab.id; }}
                        class="min-h-11 px-2.5 sm:px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs border touch-manipulation {active
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-500 dark:text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200/90 dark:border-slate-700/80'}"
                    >
                        <tab.icon class="w-3.5 h-3.5 shrink-0 {active ? 'text-white' : 'text-slate-500 dark:text-slate-400'}" />
                        <span class="truncate">{tab.label}</span>
                        {#if tab.badge}
                            <span class="px-1.5 py-0.5 rounded-full {active ? 'bg-white/20 text-white' : tab.badgeType === 'amber' ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-800'} text-[10px] leading-none shrink-0 font-bold">{tab.badge}</span>
                        {/if}
                    </button>
                {/each}
            </div>
        </div>

        <!-- Form Body -->
        <form id="appForm" onsubmit={handleSubmit} novalidate class="flex flex-col flex-1 relative">
            <div class="flex-1 p-4 sm:p-5 space-y-4">
                {#if state.errorMsg}
                    <div class="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-4 rounded-2xl text-sm font-medium border border-rose-100 dark:border-rose-900/60 flex items-center gap-2.5 shadow-sm">
                        <AlertCircle class="w-5 h-5 text-rose-500 shrink-0" />
                        <span>{state.errorMsg}</span>
                    </div>
                {/if}

                {#if state.activeTab === 'time'}
                    <AppointmentTimeTab {state} />
                {:else if state.activeTab === 'location'}
                    <AppointmentLocationTab {state} />
                {:else if state.activeTab === 'tasks'}
                    <AppointmentTasksTab {state} />
                {:else if state.activeTab === 'client'}
                    <AppointmentClientTab {state} />
                {/if}
            </div>

            <!-- Footer -->
            <div class="p-3.5 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 pb-[max(env(safe-area-inset-bottom,0px),1rem)] rounded-b-3xl">
                <div class="flex flex-col-reverse sm:flex-row justify-between items-center gap-3">
                    {#if state.editId}
                        <div class="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                            <button type="button" onclick={handleDeleteAppointment} class="orga-button-danger min-h-11 w-full sm:w-auto py-2.5 touch-manipulation" disabled={state.isLoading}>Termin löschen</button>
                            {#if state.is_series && state.series_id}
                                <button type="button" onclick={handleDeleteSeries} class="orga-button-danger min-h-11 w-full sm:w-auto py-2.5 touch-manipulation" disabled={state.isLoading}>Serie löschen</button>
                            {/if}
                        </div>
                    {:else}
                        <div class="text-xs text-neutral-500 dark:text-slate-400 hidden sm:block">
                            Tab: <span class="font-bold text-neutral-700 dark:text-slate-200">{tabs.find(t => t.id === state.activeTab)?.label}</span>
                        </div>
                    {/if}
                    <div class="flex flex-col-reverse sm:flex-row gap-2.5 w-full sm:w-auto">
                        <button type="button" onclick={attemptClose} class="orga-button-ghost min-h-11 w-full sm:w-auto py-2.5 touch-manipulation" disabled={state.isLoading}>Abbrechen</button>
                        <button type="submit" class="orga-button-primary min-h-11 shadow-indigo-600/20 w-full sm:w-auto py-2.5 font-semibold touch-manipulation" disabled={state.isLoading}>
                            {#if state.isLoading}
                                <span>Speichert...</span>
                            {:else if state.editId}
                                <span>Änderungen speichern</span>
                            {:else if state.is_series}
                                <span>Serie anlegen ({state.calculatedSeriesCount || 1})</span>
                            {:else}
                                <span>Termin anlegen</span>
                            {/if}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    </div>
</dialog>