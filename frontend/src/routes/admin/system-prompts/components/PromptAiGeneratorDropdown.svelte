<script lang="ts">
    import { Zap, RefreshCw, ChevronDown } from 'lucide-svelte';
    import { formatKW } from '../types';

    let {
        currentKWString,
        isGenerating = false,
        onGenerate
    }: {
        currentKWString: string;
        isGenerating: boolean;
        onGenerate: (options: {
            days: number;
            includeChat: boolean;
            includeProposals: boolean;
            includeInquiries: boolean;
            includeAppointmentRequests: boolean;
        }) => void;
    } = $props();

    let showDropdown = $state(false);
    let dropdownRef = $state<HTMLDivElement>();
    let generateDays = $state(7);
    let includeChat = $state(true);
    let includeProposals = $state(true);
    let includeInquiries = $state(true);
    let includeAppointmentRequests = $state(true);

    function handleWindowClick(e: MouseEvent) {
        if (!showDropdown) return;
        if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
            showDropdown = false;
        }
    }

    function handleSubmit() {
        showDropdown = false;
        onGenerate({
            days: generateDays,
            includeChat,
            includeProposals,
            includeInquiries,
            includeAppointmentRequests
        });
    }
</script>

<svelte:window onclick={handleWindowClick} onkeydown={(e) => { if (showDropdown && e.key === 'Escape') showDropdown = false; }} />

<div bind:this={dropdownRef} class="relative z-40">
    <button
        type="button"
        onclick={(e) => { e.stopPropagation(); showDropdown = !showDropdown; }}
        disabled={isGenerating}
        class="h-8 md:h-9 px-3 sm:px-3.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-xs shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
    >
        {#if isGenerating}
            <RefreshCw class="w-3.5 h-3.5 animate-spin text-amber-300" />
            <span class="hidden sm:inline">Generiere...</span>
        {:else}
            <Zap class="w-3.5 h-3.5 text-amber-300" />
            <span class="hidden sm:inline">KI-Prompt</span>
            <span class="sm:hidden">KI</span>
            <ChevronDown class="w-3 h-3 text-indigo-200 transition-transform {showDropdown ? 'rotate-180' : ''}" />
        {/if}
    </button>

    {#if showDropdown}
        <div class="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 space-y-3.5 animate-enter">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                        <Zap class="w-3.5 h-3.5" />
                    </div>
                    <h4 class="text-xs font-black text-slate-900 dark:text-white">Auto-Prompt Generator</h4>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {formatKW(currentKWString)}
                </span>
            </div>

            <div class="space-y-1">
                <span class="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Analysezeitraum:</span>
                <div class="grid grid-cols-3 gap-1.5">
                    {#each [7, 14, 30] as d}
                        <button
                            type="button"
                            onclick={() => generateDays = d}
                            class="py-1 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer {generateDays === d ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}"
                        >
                            {d} Tage
                        </button>
                    {/each}
                </div>
            </div>

            <div class="space-y-1.5 pt-1">
                <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300">Quellen für den Digest:</span>
                <div class="space-y-1 bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <label class="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none py-0.5">
                        <span class="flex items-center gap-1.5"><span>💡</span> Vorschläge</span>
                        <input type="checkbox" bind:checked={includeProposals} class="w-3.5 h-3.5 rounded text-indigo-600" />
                    </label>
                    <label class="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none py-0.5">
                        <span class="flex items-center gap-1.5"><span>💬</span> ChatWidget &amp; Bugs</span>
                        <input type="checkbox" bind:checked={includeChat} class="w-3.5 h-3.5 rounded text-indigo-600" />
                    </label>
                    <label class="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none py-0.5">
                        <span class="flex items-center gap-1.5"><span>📬</span> Kundenanfragen</span>
                        <input type="checkbox" bind:checked={includeInquiries} class="w-3.5 h-3.5 rounded text-indigo-600" />
                    </label>
                    <label class="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none py-0.5">
                        <span class="flex items-center gap-1.5"><span>📅</span> Terminanfragen</span>
                        <input type="checkbox" bind:checked={includeAppointmentRequests} class="w-3.5 h-3.5 rounded text-indigo-600" />
                    </label>
                </div>
            </div>

            <button
                type="button"
                onclick={handleSubmit}
                disabled={isGenerating}
                class="w-full py-2 px-3 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 active:scale-98 transition-transform"
            >
                {#if isGenerating}
                    <RefreshCw class="w-3.5 h-3.5 animate-spin text-amber-300" />
                    <span>Analysiere Quellen...</span>
                {:else}
                    <Zap class="w-3.5 h-3.5 text-amber-300" />
                    <span>Wochen-Prompt jetzt erstellen</span>
                {/if}
            </button>
        </div>
    {/if}
</div>
