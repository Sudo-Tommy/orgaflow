<script lang="ts">
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { slide } from 'svelte/transition';
    import { ChevronDown, ChevronUp, Cake, Sparkles } from 'lucide-svelte';

    interface Props {
        onOpenClient: (clientId: string) => void;
    }

    let { onOpenClient }: Props = $props();
    let isExpanded = $state(false);

    let upcomingBirthdays = $derived.by(() => {
        const clients = orgaStore.clients?.data || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const bdays = clients
            .filter((c: any) => c.birthdate && (c.status || '').toLowerCase() === 'aktiv')
            .map((c: any) => {
                let bYear: number, bMonth: number, bDay: number;
                const dateStr = (c.birthdate || '').trim().split(' ')[0].split('T')[0];
                if (!dateStr) return null;

                if (dateStr.includes('.')) {
                    const parts = dateStr.split('.');
                    if (parts.length < 3) return null;
                    bDay = parseInt(parts[0], 10);
                    bMonth = parseInt(parts[1], 10) - 1;
                    bYear = parseInt(parts[2], 10);
                    if (bYear < 100) bYear += bYear > 30 ? 1900 : 2000;
                } else if (dateStr.includes('-')) {
                    const parts = dateStr.split('-');
                    if (parts.length < 3) return null;
                    bYear = parseInt(parts[0], 10);
                    bMonth = parseInt(parts[1], 10) - 1;
                    bDay = parseInt(parts[2], 10);
                } else {
                    return null;
                }

                if (isNaN(bYear) || isNaN(bMonth) || isNaN(bDay)) return null;

                let nextBday = new Date(today.getFullYear(), bMonth, bDay);
                if (nextBday.getTime() < today.getTime()) {
                    nextBday.setFullYear(today.getFullYear() + 1);
                }

                const age = nextBday.getFullYear() - bYear;
                const daysUntil = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                return {
                    client: c,
                    nextBday,
                    age,
                    daysUntil,
                    isToday: daysUntil === 0,
                    isTomorrow: daysUntil === 1
                };
            })
            .filter((b: any) => b !== null)
            .sort((a: any, b: any) => a.daysUntil - b.daysUntil)
            .slice(0, 20) as any[];

        return bdays;
    });

    let todayBirthdays = $derived(upcomingBirthdays.filter(b => b.isToday));
    let previewBirthdays = $derived(upcomingBirthdays.slice(0, 2));
</script>

<div class="lg:w-[410px] xl:w-[430px] shrink-0 bg-white/80 dark:bg-slate-950/70 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/90 shadow-sm">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
        <div class="flex items-center gap-2 min-w-0">
            <span class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 flex items-center justify-center text-sm shadow-2xs">
                <Cake class="w-4 h-4" />
            </span>
            <h3 class="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">Geburtstage demnächst</h3>
            {#if todayBirthdays.length > 0}
                <span class="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 animate-pulse">
                    🎉 {todayBirthdays.length} heute!
                </span>
            {:else if upcomingBirthdays.length > 0}
                <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    {upcomingBirthdays.length} anstehend
                </span>
            {/if}
        </div>

        {#if upcomingBirthdays.length > 0}
            <button
                type="button"
                onclick={() => (isExpanded = !isExpanded)}
                class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                aria-expanded={isExpanded}
            >
                <span>{isExpanded ? 'Einklappen' : 'Alle anzeigen'}</span>
                {#if isExpanded}
                    <ChevronUp class="w-3.5 h-3.5" />
                {:else}
                    <ChevronDown class="w-3.5 h-3.5" />
                {/if}
            </button>
        {/if}
    </div>

    <!-- Vorschau der nächsten 2 Geburtstage -->
    {#if upcomingBirthdays.length === 0}
        <div class="py-3 text-center text-xs text-slate-400 dark:text-slate-500 font-medium italic flex items-center justify-center gap-2">
            <Sparkles class="w-4 h-4 opacity-50" />
            <span>Keine anstehenden Geburtstage aktiver Klienten.</span>
        </div>
    {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {#each previewBirthdays as bday (bday.client.id)}
                <button
                    type="button"
                    onclick={() => onOpenClient(bday.client.id)}
                    class="text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 group active:scale-95 {bday.isToday ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300/80 dark:border-rose-800/80 hover:shadow-md hover:border-rose-400' : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs'}"
                >
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs transition-transform group-hover:scale-105 {bday.isToday ? 'bg-rose-500 text-white shadow-rose-500/30 ring-2 ring-rose-300 dark:ring-rose-800 animate-pulse' : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/20'}">
                        {(bday.client.name_first?.charAt(0) || '')}{(bday.client.name_last?.charAt(0) || '')}
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {bday.client.name_first} {bday.client.name_last}
                        </p>
                        <div class="flex items-center gap-1.5 mt-0.5">
                            <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                wird {bday.age} J.
                            </span>
                            <span class="text-slate-300 dark:text-slate-600">•</span>
                            {#if bday.isToday}
                                <span class="text-[10px] font-black text-rose-600 dark:text-rose-400">Heute! 🥳</span>
                            {:else if bday.isTomorrow}
                                <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400">Morgen</span>
                            {:else}
                                <span class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                    in {bday.daysUntil} Tg.
                                </span>
                            {/if}
                        </div>
                    </div>
                </button>
            {/each}
        </div>
    {/if}

    <!-- Aufklappbarer Zeitstrahl -->
    {#if isExpanded}
        <div transition:slide={{ duration: 250 }} class="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <div class="relative w-full overflow-x-auto custom-scrollbar pb-2">
                <div class="flex items-center min-w-max relative z-10 px-4 h-32">
                    <div class="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-amber-200 via-indigo-200 to-amber-200 dark:from-amber-900/40 dark:via-indigo-900/40 dark:to-amber-900/40 -translate-y-1/2 z-0"></div>
                    {#each upcomingBirthdays as bday (bday.client.id)}
                        <button
                            type="button"
                            onclick={() => onOpenClient(bday.client.id)}
                            class="relative flex flex-col items-center justify-center w-20 shrink-0 group focus:outline-none cursor-pointer"
                        >
                            <div class="absolute bottom-full mb-1 text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-2xs whitespace-nowrap {bday.isToday ? 'bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-950 dark:text-rose-300' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}">
                                {bday.isToday ? 'Heute!' : bday.isTomorrow ? 'Morgen!' : bday.nextBday.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                            </div>
                            <div class="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center font-black text-[11px] shrink-0 z-10 {bday.isToday ? 'bg-rose-500 text-white' : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'}">
                                {(bday.client.name_first?.charAt(0) || '')}{(bday.client.name_last?.charAt(0) || '')}
                            </div>
                            <div class="absolute top-full mt-1 text-center w-20 px-1">
                                <p class="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{bday.client.name_first}</p>
                                <p class="text-[9px] text-slate-400 font-semibold">{bday.age} J.</p>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
</div>
