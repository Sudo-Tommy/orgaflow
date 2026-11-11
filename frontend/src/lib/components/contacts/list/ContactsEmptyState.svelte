<script lang="ts">
    interface Props {
        searchQuery: string;
        onClearSearch: () => void;
        onNewContact: () => void;
        onGoogleSearch: () => void;
    }

    let {
        searchQuery,
        onClearSearch,
        onNewContact,
        onGoogleSearch
    }: Props = $props();
</script>

<div class="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-xs max-w-xl mx-auto">
    <div class="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
        👥
    </div>
    <h3 class="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 mb-2">Keine Kontakte gefunden</h3>
    <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
        {#if searchQuery}
            Für den Suchbegriff „{searchQuery}“ wurden keine Kontakte gefunden.
        {:else}
            Es sind noch keine Kontakte in diesem Filter hinterlegt.
        {/if}
    </p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        {#if searchQuery}
            <button onclick={onClearSearch} class="orga-button-ghost py-2.5 px-5 min-h-[44px] text-xs sm:text-sm font-bold w-full sm:w-auto cursor-pointer">
                Suche leeren
            </button>
        {/if}
        <button onclick={onNewContact} class="orga-button-primary py-2.5 px-5 min-h-[44px] text-xs sm:text-sm font-bold w-full sm:w-auto cursor-pointer">
            + Neuer Kontakt anlegen
        </button>
        <button onclick={onGoogleSearch} class="orga-button-ghost border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 py-2.5 px-4 min-h-[44px] text-xs sm:text-sm font-bold w-full sm:w-auto cursor-pointer">
            🔍 Via Google finden
        </button>
    </div>
</div>
