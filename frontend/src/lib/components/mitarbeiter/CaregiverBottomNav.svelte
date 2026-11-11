<script lang="ts">
    import { caregiverPortal, type PortalTabType } from '$lib/services/caregiverPortalService.svelte';
    import { Calendar, Users, Clock, BookOpen, User } from 'lucide-svelte';

    interface Props {
        activeTab: PortalTabType;
    }

    let { activeTab = $bindable('appointments') }: Props = $props();

    const tabs: Array<{ id: PortalTabType; label: string; icon: any }> = [
        { id: 'appointments', label: 'Einsätze', icon: Calendar },
        { id: 'clients', label: 'Klienten', icon: Users },
        { id: 'timesheet', label: 'Stundenzettel', icon: Clock },
        { id: 'contacts', label: 'Kontakte', icon: BookOpen },
        { id: 'profile', label: 'Profil', icon: User }
    ];
</script>

<nav class="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0px)] shadow-lg">
    <div class="max-w-4xl mx-auto flex items-center justify-around px-1 sm:px-2">
        {#each tabs as tab}
            {@const Icon = tab.icon}
            {@const isActive = activeTab === tab.id}
            <button
                type="button"
                onclick={() => {
                    activeTab = tab.id;
                    caregiverPortal.activeTab = tab.id;
                }}
                class="flex-1 min-h-13 sm:min-h-14 py-1.5 flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-colors relative cursor-pointer {
                    isActive 
                        ? 'text-indigo-600 dark:text-indigo-400 font-black' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
                }"
            >
                <Icon class="w-4 h-4 sm:w-5 sm:h-5 transition-transform {isActive ? 'scale-110' : ''}" />
                <span class="text-[10px] sm:text-[11px] truncate max-w-[68px] sm:max-w-none">{tab.label}</span>
                {#if isActive}
                    <div class="absolute bottom-0.5 w-6 sm:w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
                {/if}
            </button>
        {/each}
    </div>
</nav>
