<script lang="ts">
    import { Lock, CheckCircle, Ban, Eye, EyeOff, Banknote, User, Search, X, Calendar, Clock, Repeat } from "lucide-svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";
    import type { AppointmentModalState } from "./appointmentModalState.svelte";

    interface Props {
        state: AppointmentModalState;
    }
    let { state }: Props = $props();

    const titleSuggestions = [
        "Einkauf & Besorgungen",
        "Begleitung zum Arzt",
        "Haushaltshilfe",
        "Beratungsgespräch",
        "Spaziergang & Aktivierung"
    ];
</script>

<div class="space-y-5 animate-enter">
    <!-- Status & Toggles Bar -->
    <div class="bg-slate-100/70 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button type="button" onclick={() => { hapticFeedback.tap(); state.is_private = !state.is_private; }} class="min-h-11 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-2 touch-manipulation {state.is_private ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs font-bold' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}" disabled={state.isLoading}>
                <Lock class="w-3.5 h-3.5 {state.is_private ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}" />
                <span>{state.is_private ? 'Privat' : 'Beruflich'}</span>
            </button>
            <button type="button" onclick={() => { hapticFeedback.tap(); state.settled = !state.settled; }} class="min-h-11 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-2 touch-manipulation {state.settled ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs font-bold' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}" disabled={state.isLoading}>
                <CheckCircle class="w-3.5 h-3.5 {state.settled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}" />
                <span>{state.settled ? 'Abgerechnet' : 'Nicht abgerechnet'}</span>
            </button>
            <button type="button" onclick={() => { hapticFeedback.tap(); state.is_blocked = !state.is_blocked; }} class="min-h-11 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-2 touch-manipulation {state.is_blocked ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 shadow-xs font-bold' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}" disabled={state.isLoading}>
                <Ban class="w-3.5 h-3.5 {state.is_blocked ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}" />
                <span>{state.is_blocked ? 'Tag gesperrt' : 'Tag sperren'}</span>
            </button>
            {#if state.isSuperAdmin}
                <button type="button" onclick={() => { hapticFeedback.tap(); state.is_visible = !state.is_visible; }} class="min-h-11 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-2 touch-manipulation {state.is_visible ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 shadow-xs font-bold' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}" disabled={state.isLoading}>
                    {#if state.is_visible}<Eye class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /><span>Portal Sichtbar</span>{:else}<EyeOff class="w-3.5 h-3.5 text-slate-400" /><span>Versteckt</span>{/if}
                </button>
            {/if}
        </div>
    </div>

    <!-- Abrechnungsart -->
    {#if !state.is_blocked}
        <div class="bg-white dark:bg-slate-800/80 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-2xs space-y-2">
            <div class="flex items-center justify-between">
                <label class="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Banknote class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Abrechnungsart</span>
                </label>
                {#if state.billing_type}
                    <button type="button" onclick={() => { hapticFeedback.tap(); state.billing_type = ''; }} class="text-[11px] text-slate-500 hover:text-rose-600 dark:text-slate-400 font-medium cursor-pointer">Zurücksetzen</button>
                {/if}
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {#each [{ id: 'EL', label: 'EL', sub: 'Entlastung (§45b)' }, { id: 'Kombi', label: 'Kombi', sub: 'Kombi (§36/38)' }, { id: 'Privat', label: 'Privat', sub: 'Selbstzahler' }, { id: '45a', label: '40% §45a', sub: 'Umwandlung' }, { id: 'VHP', label: 'VHP', sub: 'Verhinderungspflege' }] as bt}
                    <button type="button" onclick={() => { hapticFeedback.tap(); state.billing_type = state.billing_type === bt.id ? '' : bt.id as any; }} class="min-h-11 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 touch-manipulation {state.billing_type === bt.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-100 shadow-xs ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 text-slate-700 dark:text-slate-300'}">
                        <span class="font-bold">{bt.label}</span>
                        <span class="text-[10px] text-slate-500 dark:text-slate-400">{bt.sub}</span>
                    </button>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Klient Auswahl -->
    {#if !state.is_blocked}
        <div class="space-y-1.5">
            <label for="client-search-input" class="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
                <User class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Klient</span>
            </label>
            {#if state.selectedClientRecord}
                <div class="p-3 bg-neutral-50 dark:bg-slate-800/80 rounded-2xl border border-neutral-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-2xs">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
                            {state.selectedClientRecord.name_first?.[0] || ''}{state.selectedClientRecord.name_last?.[0] || ''}
                        </div>
                        <div class="min-w-0">
                            <p class="text-sm font-bold text-neutral-900 dark:text-slate-100 truncate">{state.selectedClientRecord.name_first} {state.selectedClientRecord.name_last}</p>
                            <p class="text-xs text-neutral-500 dark:text-slate-400 truncate">{[state.selectedClientRecord.street, state.selectedClientRecord.city].filter(Boolean).join(', ') || 'Keine Adresse'}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button type="button" onclick={() => { hapticFeedback.tap(); state.isClientSearchOpen = !state.isClientSearchOpen; }} class="min-h-11 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors cursor-pointer">Ändern</button>
                        <button type="button" onclick={() => { hapticFeedback.tap(); state.selectedClientId = ""; state.useClientAddress = false; }} class="min-h-11 min-w-11 p-2 text-neutral-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer flex items-center justify-center" title="Klient entfernen"><X class="w-4 h-4" /></button>
                    </div>
                </div>
            {:else}
                <div class="relative">
                    <input id="client-search-input" type="text" bind:value={state.clientSearchQuery} onfocus={() => state.isClientSearchOpen = true} placeholder="Klient suchen (Name, Ort, PG)..." class="orga-input-clear min-h-12 pl-10 pr-4 text-sm" disabled={state.isLoading} />
                    <Search class="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
            {/if}
            {#if state.isClientSearchOpen}
                <div class="mt-1 bg-white dark:bg-slate-800 rounded-2xl border border-neutral-200 dark:border-slate-700 shadow-xl max-h-60 overflow-y-auto p-1.5 z-30">
                    <button type="button" onclick={() => { hapticFeedback.tap(); state.selectedClientId = ""; state.isClientSearchOpen = false; state.useClientAddress = false; }} class="w-full text-left px-3 py-2.5 text-xs font-medium text-neutral-500 dark:text-slate-400 hover:bg-neutral-50 dark:hover:bg-slate-700 rounded-xl cursor-pointer">🚫 Kein Klient (z.B. Bürotätigkeit, Teambesprechung)</button>
                    {#each state.filteredClients as c (c.id)}
                        <button type="button" onclick={() => { hapticFeedback.tap(); state.selectClient(c); }} class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center justify-between gap-2 border-b border-neutral-100 dark:border-slate-700/50 last:border-0 cursor-pointer">
                            <span class="text-xs font-bold text-neutral-800 dark:text-slate-200">{c.name_first} {c.name_last}</span>
                            <span class="text-[11px] text-neutral-400 truncate">{c.city || ''}</span>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}

    <!-- Titel & Beschreibung -->
    <div class="space-y-1.5">
        <label for="app-title" class="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400">Titel / Terminbezeichnung</label>
        <input id="app-title" type="text" bind:value={state.description} placeholder="z.B. Einkauf & Betreuung" class="orga-input-clear min-h-12 text-sm" disabled={state.isLoading} />
        <div class="flex flex-wrap gap-1.5 pt-1">
            {#each titleSuggestions as suggestion}
                <button type="button" onclick={() => { hapticFeedback.tap(); state.description = suggestion; }} class="min-h-8 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200/60 dark:border-slate-700/60 cursor-pointer touch-manipulation">
                    + {suggestion}
                </button>
            {/each}
        </div>
    </div>

    <!-- Datum & Terminzeit -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="space-y-1.5">
            <label for="app-date" class="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Datum *</span>
            </label>
            <input id="app-date" type="date" bind:value={state.appDate} class="orga-input-clear min-h-12 text-sm" required disabled={state.isLoading} />
        </div>
        {#if !state.is_blocked}
            <div class="space-y-1.5">
                <label for="app-start" class="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Clock class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Startzeit *</span>
                </label>
                <input id="app-start" type="time" bind:value={state.appStartTime} class="orga-input-clear min-h-12 text-sm" required disabled={state.isLoading} />
            </div>
            <div class="space-y-1.5">
                <label for="app-end" class="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Clock class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Endzeit (optional)</span>
                </label>
                <input id="app-end" type="time" bind:value={state.appEndTime} class="orga-input-clear min-h-12 text-sm" disabled={state.isLoading} />
            </div>
        {/if}
    </div>

    <!-- Quick Duration Buttons für Terminzeit -->
    {#if !state.is_blocked}
        <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[11px] font-semibold text-neutral-400 mr-1">Dauer:</span>
            {#each [15, 30, 45, 60, 90, 120] as mins}
                <button type="button" onclick={() => { hapticFeedback.tap(); state.applyDuration(mins); }} class="min-h-8 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer touch-manipulation">
                    +{mins}m
                </button>
            {/each}
            {#if state.durationBadge}
                <span class="ml-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    ⏱️ {state.durationBadge}
                </span>
            {/if}
        </div>
    {/if}

    <!-- Serientermin -->
    {#if !state.editId && !state.is_blocked}
        <div class="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-3">
            <div class="flex items-center justify-between">
                <label for="series-switch" class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer">
                    <Repeat class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Serientermin anlegen</span>
                </label>
                <input id="series-switch" type="checkbox" bind:checked={state.is_series} onchange={() => hapticFeedback.tap()} class="w-5 h-5 rounded accent-indigo-600 cursor-pointer" />
            </div>
            {#if state.is_series}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div>
                        <label for="series-interval" class="block text-xs font-semibold text-neutral-500 dark:text-slate-400 mb-1">Intervall</label>
                        <select id="series-interval" bind:value={state.seriesInterval} class="orga-input-clear min-h-11 text-xs">
                            <option value="weekly">Wöchentlich</option>
                            <option value="biweekly">Alle 2 Wochen</option>
                            <option value="monthly">Monatlich</option>
                        </select>
                    </div>
                    <div>
                        <label for="series-end" class="block text-xs font-semibold text-neutral-500 dark:text-slate-400 mb-1">Enddatum ({state.calculatedSeriesCount} Termine)</label>
                        <input id="series-end" type="date" bind:value={state.seriesEndDate} class="orga-input-clear min-h-11 text-xs" />
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>
