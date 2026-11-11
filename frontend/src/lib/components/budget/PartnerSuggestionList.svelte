<script lang="ts">
    import { UserPlus, Check, Building2, User } from 'lucide-svelte';
    import type { PartnerSuggestion } from './partnerSearchTypes';

    interface Props {
        id: string;
        suggestions: PartnerSuggestion[];
        activeIndex: number;
        inputValue: string;
        onSelect: (s: PartnerSuggestion) => void;
        onOpenCreate: () => void;
    }

    let { id, suggestions, activeIndex, inputValue, onSelect, onOpenCreate }: Props = $props();

    function typeIcon(type: PartnerSuggestion['type']) {
        return type === 'client' || type === 'contact' ? User : Building2;
    }
</script>

<ul
    id="partner-listbox-{id}"
    role="listbox"
    class="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
>
    {#each suggestions as s, i (s.id + s.name)}
        {@const IconComp = typeIcon(s.type)}
        <li role="option" aria-selected={i === activeIndex}>
            <button
                type="button"
                onmousedown={(e) => { e.preventDefault(); onSelect(s); }}
                class="flex items-center gap-3 w-full min-h-[44px] px-4 py-2 text-left transition-colors cursor-pointer touch-manipulation {i === activeIndex
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/70'}"
            >
                <span class="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center {s.type === 'client' ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                    : s.type === 'contract' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                    : s.type === 'contact' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                    : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'}">
                    <IconComp class="w-3.5 h-3.5" />
                </span>
                <span class="flex-1 min-w-0">
                    <span class="block font-semibold text-sm truncate">{s.name}</span>
                    {#if s.subtitle}
                        <span class="block text-[11px] text-slate-400 dark:text-slate-500 leading-none mt-0.5">{s.subtitle}</span>
                    {/if}
                </span>
                {#if i === activeIndex}
                    <Check class="w-3.5 h-3.5 flex-shrink-0 text-indigo-500" />
                {/if}
            </button>
        </li>
    {/each}

    <li role="separator" class="border-t border-slate-100 dark:border-slate-800"></li>
    <li role="option" aria-selected={false}>
        <button
            type="button"
            onmousedown={(e) => { e.preventDefault(); onOpenCreate(); }}
            class="flex items-center gap-2.5 w-full min-h-[44px] px-4 py-2 text-left text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-semibold text-sm transition-colors cursor-pointer touch-manipulation"
        >
            <UserPlus class="w-4 h-4" />
            <span>„{inputValue.trim()}" als neuen Partner anlegen</span>
        </button>
    </li>
</ul>
