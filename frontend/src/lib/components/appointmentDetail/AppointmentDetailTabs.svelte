<script lang="ts">
    import { LayoutDashboard, Clock, FileText, Car, Banknote, User } from "lucide-svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import type { TabType } from "./appointmentDetailTypes";
    import { formatMinutes } from "./appointmentRouteService";

    interface Props {
        currentTab: TabType;
        runningTimeRecord: any;
        totalRecordedMinutes: number;
        taskCount: number;
        voiceRecordCount: number;
        totalKm: number;
        billingType?: string;
        expenditureCount?: number;
        totalExpenditure?: number;
        hasDestinationAddress: boolean;
        onSelectTab: (tab: TabType) => void;
    }

    let {
        currentTab, runningTimeRecord, totalRecordedMinutes, taskCount,
        voiceRecordCount, totalKm, billingType, expenditureCount, totalExpenditure,
        hasDestinationAddress, onSelectTab
    }: Props = $props();

    interface TabItem {
        id: TabType;
        label: string;
        icon: any;
        badge?: string | number | null;
        badgeType?: 'live' | 'neutral' | 'amber' | 'indigo' | 'emerald' | 'rose';
        show?: boolean;
    }

    let tabs = $derived<TabItem[]>(([
        {
            id: 'overview' as TabType,
            label: 'Übersicht',
            icon: LayoutDashboard
        },
        {
            id: 'time_tasks' as TabType,
            label: 'Zeiten & Aufgaben',
            icon: Clock,
            badge: runningTimeRecord ? 'Live' : (totalRecordedMinutes > 0 ? formatMinutes(totalRecordedMinutes) : (taskCount > 0 ? `${taskCount}` : null)),
            badgeType: runningTimeRecord ? 'live' : (totalRecordedMinutes > 0 ? 'neutral' : 'amber')
        },
        {
            id: 'report' as TabType,
            label: 'Bericht',
            icon: FileText,
            badge: voiceRecordCount > 0 ? voiceRecordCount : null,
            badgeType: 'indigo'
        },
        {
            id: 'travel' as TabType,
            label: 'Fahrt & Route',
            icon: Car,
            badge: totalKm > 0 ? `${totalKm} km` : null,
            badgeType: 'emerald'
        },
        {
            id: 'billing' as TabType,
            label: 'Abrechnung',
            icon: Banknote,
            badge: billingType || (totalExpenditure && totalExpenditure > 0 ? `${totalExpenditure.toFixed(2).replace('.', ',')} €` : (expenditureCount && expenditureCount > 0 ? `${expenditureCount}` : null)),
            badgeType: 'rose',
            show: rbacService.canAccessFinances
        },
        {
            id: 'client' as TabType,
            label: 'Klient',
            icon: User
        }
    ] as TabItem[]).filter(t => t.show !== false));
</script>

<div class="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800">
    <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {#each tabs as tab (tab.id)}
            {@const active = currentTab === tab.id}
            <button
                type="button"
                onclick={() => onSelectTab(tab.id)}
                class="flex-1 basis-[calc(33.333%-6px)] sm:basis-auto sm:flex-initial min-h-[42px] sm:min-h-[38px] px-2.5 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs border {active 
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-500 dark:text-white shadow-xs' 
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200/90 dark:border-slate-700/80'}"
            >
                <tab.icon class="w-3.5 h-3.5 shrink-0 {active ? 'text-white' : 'text-slate-500 dark:text-slate-400'}" />
                <span class="truncate">{tab.label}</span>
                {#if tab.badge}
                    {#if tab.badgeType === 'live'}
                        <span class="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] sm:text-[10px] leading-none animate-pulse font-mono shrink-0">Live</span>
                    {:else if tab.badgeType === 'amber'}
                        <span class="px-1.5 py-0.5 rounded-full {active ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200'} text-[9px] sm:text-[10px] leading-none shrink-0 font-bold">{tab.badge}</span>
                    {:else if tab.badgeType === 'indigo'}
                        <span class="px-1.5 py-0.5 rounded-full {active ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200'} text-[9px] sm:text-[10px] leading-none shrink-0 font-bold">{tab.badge}</span>
                    {:else if tab.badgeType === 'emerald'}
                        <span class="px-1.5 py-0.5 rounded-full {active ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200'} text-[9px] sm:text-[10px] leading-none shrink-0 font-bold">{tab.badge}</span>
                    {:else if tab.badgeType === 'rose'}
                        <span class="px-1.5 py-0.5 rounded-full {active ? 'bg-white/20 text-white' : 'bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200'} text-[9px] sm:text-[10px] leading-none shrink-0 font-bold">{tab.badge}</span>
                    {:else}
                        <span class="px-1.5 py-0.5 rounded-full {active ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'} text-[9px] sm:text-[10px] leading-none shrink-0">{tab.badge}</span>
                    {/if}
                {/if}
            </button>
        {/each}
    </div>
</div>
