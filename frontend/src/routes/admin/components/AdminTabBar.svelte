<script lang="ts">
    import {
        BarChart3,
        Database,
        Mail,
        Settings,
        Sparkles,
        Globe,
        MessageSquare
    } from "lucide-svelte";
    import { proposalService } from "$lib/services/improvementProposalService.svelte";

    let {
        activeTab = $bindable<"dashboard" | "database" | "system_mails" | "config" | "marketing" | "cms" | "feedback_hub">("dashboard"),
        systemMailsCount = 0,
        supportTicketsCount = 0,
        canAccessGodMode = false,
        canAccessSystemPrompts = false
    }: {
        activeTab: "dashboard" | "database" | "system_mails" | "config" | "marketing" | "cms" | "feedback_hub";
        systemMailsCount: number;
        supportTicketsCount: number;
        canAccessGodMode: boolean;
        canAccessSystemPrompts: boolean;
    } = $props();

    let unreadProposals = $derived(proposalService.unreadCount);
    let totalFeedbackItems = $derived(supportTicketsCount + unreadProposals);
</script>

<!-- HAUPT-NAVIGATION: VOLLBREITE SEGMENT-TABS MIT FLEX-WRAP (KEIN HORIZONTALES SCROLLEN) -->
<nav 
    class="bg-slate-100/90 dark:bg-slate-800/80 p-1.5 sm:p-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center gap-1.5 sm:gap-2 shadow-inner"
    aria-label="Admin Navigation"
>
    <!-- 1. Übersicht & Module -->
    <button
        type="button"
        onclick={() => activeTab = 'dashboard'}
        class="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer min-h-[44px]
        {activeTab === 'dashboard' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-800' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/40'}"
    >
        <BarChart3 class="w-4 h-4" />
        <span>Übersicht & Module</span>
    </button>

    <!-- 2. Datenbank-Explorer -->
    {#if canAccessGodMode}
        <button
            type="button"
            onclick={() => activeTab = 'database'}
            class="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer min-h-[44px]
            {activeTab === 'database' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-800' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/40'}"
        >
            <Database class="w-4 h-4" />
            <span>Datenbank-Explorer</span>
        </button>
    {/if}

    <!-- 3. System-E-Mails -->
    <button
        type="button"
        onclick={() => activeTab = 'system_mails'}
        class="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer min-h-[44px]
        {activeTab === 'system_mails' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-800' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/40'}"
    >
        <Mail class="w-4 h-4" />
        <span>System-E-Mails</span>
        {#if systemMailsCount > 0}
            <span class="ml-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {systemMailsCount}
            </span>
        {/if}
    </button>

    <!-- 4. Konfiguration -->
    {#if canAccessSystemPrompts}
        <button
            type="button"
            onclick={() => activeTab = 'config'}
            class="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer min-h-[44px]
            {activeTab === 'config' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-800' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/40'}"
        >
            <Settings class="w-4 h-4" />
            <span>Konfiguration</span>
        </button>
    {/if}

    <!-- 5. Werbemittel & Flyer -->
    <button
        type="button"
        onclick={() => activeTab = 'marketing'}
        class="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer min-h-[44px]
        {activeTab === 'marketing' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-800' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/40'}"
    >
        <Sparkles class="w-4 h-4" />
        <span>Werbemittel & Flyer</span>
    </button>

    <!-- 6. Landing-Page CMS -->
    <button
        type="button"
        onclick={() => activeTab = 'cms'}
        class="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer min-h-[44px]
        {activeTab === 'cms' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-800' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/40'}"
    >
        <Globe class="w-4 h-4" />
        <span>Landing-Page CMS</span>
    </button>

    <!-- 7. Feedback & Anfragen (Kompakt vereinter Tab für Support & Vorschläge) -->
    <button
        type="button"
        onclick={() => activeTab = 'feedback_hub'}
        class="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer min-h-[44px]
        {activeTab === 'feedback_hub' ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs border border-slate-200/60 dark:border-slate-800' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/40'}"
    >
        <span class="text-sm">💬</span>
        <span>Feedback & Anfragen</span>
        {#if unreadProposals > 0}
            <span class="ml-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
                {totalFeedbackItems}
            </span>
        {:else if supportTicketsCount > 0}
            <span class="ml-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                {supportTicketsCount}
            </span>
        {/if}
    </button>
</nav>
