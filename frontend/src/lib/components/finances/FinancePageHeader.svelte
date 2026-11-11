<script lang="ts">
    import LexOfficeSyncButton from "$lib/components/lexoffice/LexOfficeSyncButton.svelte";

    let {
        isSuperadmin = false,
        users = [],
        selectedUserId = $bindable(''),
        isSyncing = false,
        onSync = () => {},
        onUserChange = () => {}
    }: {
        isSuperadmin?: boolean;
        users?: any[];
        selectedUserId?: string;
        isSyncing?: boolean;
        onSync?: () => void;
        onUserChange?: (id: string) => void;
    } = $props();

    // Alphabetisch sortierte Benutzer gemäß Regel alphabetical-select
    let sortedUsers = $derived.by(() => {
        return [...users].sort((a, b) => {
            const labelA = `${a.name_last || ''} ${a.name_first || ''} ${a.username || ''}`.trim();
            const labelB = `${b.name_last || ''} ${b.name_first || ''} ${b.username || ''}`.trim();
            return labelA.localeCompare(labelB, 'de', { sensitivity: 'base' });
        });
    });
</script>

<div class="orga-page-header animate-enter">
    <div class="flex flex-col md:flex-row justify-between items-center w-full gap-4">
        <div class="w-full md:w-auto text-center md:text-left flex flex-col items-center md:items-start">
            <h1 class="orga-page-title">Mein Haushaltsbuch</h1>
            <p class="orga-page-subtitle">Ihre persönliche Übersicht über Einnahmen, Ausgaben und Verträge.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <LexOfficeSyncButton onSynced={onSync} />

            <button
                type="button"
                disabled={isSyncing}
                onclick={onSync}
                class="orga-button-ghost bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-800 dark:text-slate-200 border border-neutral-200 dark:border-slate-700 py-2 px-3.5 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 touch-manipulation active:scale-95 disabled:opacity-60 cursor-pointer"
                title="Gleicht bezahlte Rechnungen mit dem Haushaltsbuch ab"
            >
                {#if isSyncing}
                    <span class="inline-block animate-spin">🔄</span>
                    <span>Synchronisiere...</span>
                {:else}
                    <span>🔄</span>
                    <span>Rechnungen synchronisieren</span>
                {/if}
            </button>

            {#if isSuperadmin && sortedUsers.length > 0}
                <div class="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 w-full sm:w-auto">
                    <label for="user-select" class="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 shrink-0">Nutzer:</label>
                    <select
                        id="user-select"
                        bind:value={selectedUserId}
                        onchange={(e) => onUserChange(e.currentTarget.value)}
                        class="orga-input py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border-none w-full sm:w-48 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                        {#each sortedUsers as u}
                            <option value={u.id}>{u.name_last ? `${u.name_last}, ${u.name_first}` : u.name_first} ({u.username})</option>
                        {/each}
                    </select>
                </div>
            {/if}
        </div>
    </div>
</div>
