<script lang="ts">
    interface Props {
        chat: any;
        filterOnlyInquiries: boolean;
        displayedCount: number;
        totalCount: number;
        onToggleFilter: () => void;
        onOpenNotifications: () => void;
    }

    let { chat, filterOnlyInquiries, displayedCount, totalCount, onToggleFilter, onOpenNotifications }: Props = $props();
</script>

<div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center justify-between z-10 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
    <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-xl shadow-xs shrink-0">💬</div>
        <div>
            <h2 class="font-bold text-lg leading-tight text-slate-900 dark:text-white">Team Chat & Support</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> System online
            </p>
        </div>
    </div>
    <div class="flex items-center gap-2">
        {#if chat.isAdmin}
            <a 
                href="/admin/system-prompts?tab=feedbacks" 
                class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors text-xs font-bold flex items-center gap-1.5"
                title="Zur Superadmin Prompt-Verwaltung wechseln"
            >
                <span>🎯</span>
                <span class="hidden sm:inline">Prompts</span>
            </a>
        {/if}
        <button type="button" onclick={onOpenNotifications} class="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors text-base cursor-pointer" title="Benachrichtigungen verwalten">🔔</button>
    </div>
</div>

<div class="bg-slate-50/90 dark:bg-slate-950/60 px-4 py-2 flex items-center justify-between text-[11px] border-b border-slate-200 dark:border-slate-800">
    <span class="text-slate-600 dark:text-slate-300 font-medium">
        {#if filterOnlyInquiries}
            🔍 Nur Anfragen & Bugs ({displayedCount})
        {:else}
            💬 Alle Chat-Nachrichten ({totalCount})
        {/if}
    </span>
    <button 
        type="button" 
        onclick={onToggleFilter}
        class="px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer text-xs {filterOnlyInquiries ? 'bg-amber-400 text-neutral-900 shadow-xs' : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'}"
        title="Chat-Nachrichten nach Anfragen und Bug-Reports filtern"
    >
        {filterOnlyInquiries ? '✓ Nur Anfragen/Bugs' : 'Filter: Alle'}
    </button>
</div>
