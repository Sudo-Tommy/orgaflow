<!-- src/lib/components/clients/ClientDetailTabBar.svelte -->
<script lang="ts">
    import { triggerHaptic } from "$lib/services/hapticFeedback";
    import { rbacService } from "$lib/services/rbacService.svelte";

    export type ClientDetailTab = 'overview' | 'budget' | 'appointments' | 'documents' | 'network';

    interface Props {
        activeTab: ClientDetailTab;
        onTabChange: (tab: ClientDetailTab) => void;
        hasBudgetWarning?: boolean;
        appointmentsCount?: number;
        documentsCount?: number;
        networkCount?: number;
    }

    let {
        activeTab,
        onTabChange,
        hasBudgetWarning = false,
        appointmentsCount = 0,
        documentsCount = 0,
        networkCount = 0
    }: Props = $props();

    const tabs = $derived([
        { id: 'overview' as ClientDetailTab, label: 'Übersicht', icon: '🗂️', shortcut: '1' },
        ...(rbacService.canAccessFinances ? [{ id: 'budget' as ClientDetailTab, label: 'Budget', icon: '💰', warning: hasBudgetWarning, shortcut: '2' }] : []),
        { id: 'appointments' as ClientDetailTab, label: 'Termine', icon: '📅', count: appointmentsCount, shortcut: '3' },
        { id: 'documents' as ClientDetailTab, label: 'Dokumente', icon: '📂', count: documentsCount, shortcut: '4' },
        { id: 'network' as ClientDetailTab, label: 'Netzwerk', icon: '👥', count: networkCount, shortcut: '5' }
    ]);

    function selectTab(tabId: ClientDetailTab) {
        triggerHaptic('tap');
        onTabChange(tabId);
    }
</script>

<div class="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
    <div class="grid grid-cols-2 {rbacService.canAccessFinances ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-2">
        {#each tabs as t}
            {@const isActive = activeTab === t.id}
            <button
                type="button"
                onclick={() => selectTab(t.id)}
                class="min-h-11 px-2 sm:px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs border
                {isActive
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-500 dark:text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200/90 dark:border-slate-700/80'}"
                title={`Reiter ${t.label} öffnen (Taste: ${t.shortcut})`}
            >
                <span class="text-xs sm:text-sm">{t.icon}</span>
                <span class="truncate">{t.label}</span>

                {#if t.count !== undefined}
                    <span class="ml-0.5 px-1.5 py-0.5 text-[10px] font-black rounded-md {isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}">
                        {t.count}
                    </span>
                {/if}

                {#if t.warning}
                    <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-0.5" title="Budget-Warnung!"></span>
                {/if}
            </button>
        {/each}
    </div>
</div>
