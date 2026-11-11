<script lang="ts">
    import { slide } from 'svelte/transition';
    import { SlidersHorizontal } from 'lucide-svelte';
    import type { GoogleCalendarStatus } from "$lib/services/googleCalendarService";

    interface Props {
        show: boolean;
        clients: any[];
        users: any[];
        isSuperAdmin: boolean;
        canEdit: boolean;
        currentUser: any;
        googleStatus: GoogleCalendarStatus | null;
        googleEventsCount: number;
        hasActiveFilters: boolean;
        selectedClientId: string;
        selectedUserId: string;
        showGoogleEvents: boolean;
        onReset: () => void;
    }

    let {
        show,
        clients = [],
        users = [],
        isSuperAdmin = false,
        canEdit = false,
        currentUser = null,
        googleStatus = null,
        googleEventsCount = 0,
        hasActiveFilters = false,
        selectedClientId = $bindable('all'),
        selectedUserId = $bindable('all'),
        showGoogleEvents = $bindable(true),
        onReset
    }: Props = $props();
</script>

{#if show}
    <div transition:slide class="bg-slate-50 dark:bg-slate-850 border-b border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3.5 flex flex-wrap items-center gap-2 sm:gap-3 text-xs shadow-2xs">
        <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] shrink-0">
            <SlidersHorizontal class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Filter:</span>
        </div>

        <select bind:value={selectedClientId} class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 rounded-xl px-2.5 py-2 shadow-2xs outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer min-h-[44px] flex-1 sm:flex-none max-w-full sm:max-w-52" aria-label="Klientenfilter">
            <option value="all">Alle Klienten</option>
            {#each clients as c (c.id)}
                <option value={c.id}>{c.name_first} {c.name_last}</option>
            {/each}
        </select>

        {#if isSuperAdmin}
            <select bind:value={selectedUserId} class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 rounded-xl px-2.5 py-2 shadow-2xs outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer min-h-[44px] flex-1 sm:flex-none max-w-full sm:max-w-52" aria-label="Mitarbeiterfilter">
                <option value={currentUser?.id}>👤 Meine Termine (Standard)</option>
                <option value="all">👥 Alle Mitarbeiter</option>
                {#each users as u (u.id)}
                    {#if u.id !== currentUser?.id}
                        <option value={u.id}>{u.name_first} {u.name_last}</option>
                    {/if}
                {/each}
            </select>
        {/if}

        {#if canEdit && (googleStatus?.connected || isSuperAdmin)}
            <button
                type="button"
                onclick={() => showGoogleEvents = !showGoogleEvents}
                class="min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer {showGoogleEvents ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'}"
                title={showGoogleEvents ? "Google-Termine ausblenden" : "Google-Termine einblenden"}
            >
                <span>🗓️</span>
                <span>Google-Termine</span>
                {#if googleEventsCount > 0}
                    <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full {showGoogleEvents ? 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}">
                        {googleEventsCount}
                    </span>
                {/if}
            </button>
        {/if}

        {#if hasActiveFilters}
            <button
                type="button"
                onclick={onReset}
                class="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-auto cursor-pointer"
            >
                Filter zurücksetzen
            </button>
        {/if}
    </div>
{/if}
