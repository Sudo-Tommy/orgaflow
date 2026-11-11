<script lang="ts">
    import { Search, Loader2, UserPlus } from 'lucide-svelte';
    import type { PartnerSuggestion } from './partnerSearchTypes';
    import { searchPartnerSuggestions } from './partnerSearchService';
    import PartnerSuggestionList from './PartnerSuggestionList.svelte';
    import PartnerQuickCreateDialog from './PartnerQuickCreateDialog.svelte';

    interface Props {
        value: string;
        onchange?: (val: string) => void;
        label?: string;
        placeholder?: string;
        required?: boolean;
        id?: string;
        entryType?: 'income' | 'expense';
    }

    let {
        value = $bindable(''),
        onchange,
        label,
        placeholder,
        required = false,
        id = 'partner-autocomplete',
        entryType = 'expense'
    }: Props = $props();

    let inputValue = $state(value);
    let suggestions = $state<PartnerSuggestion[]>([]);
    let isLoading = $state(false);
    let isOpen = $state(false);
    let activeIndex = $state(-1);

    let showCreateDialog = $state(false);
    let inputEl: HTMLInputElement;
    let debounceTimer: ReturnType<typeof setTimeout>;

    $effect(() => {
        if (value !== inputValue) {
            inputValue = value;
        }
    });

    async function handleSearch(query: string) {
        if (query.trim().length < 1) {
            suggestions = [];
            isOpen = false;
            return;
        }

        isLoading = true;
        try {
            suggestions = await searchPartnerSuggestions(query);
            isOpen = suggestions.length > 0;
            activeIndex = -1;
        } finally {
            isLoading = false;
        }
    }

    function handleInput(e: Event) {
        const val = (e.target as HTMLInputElement).value;
        inputValue = val;
        value = val;
        onchange?.(val);

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => handleSearch(val), 220);
    }

    function selectSuggestion(s: PartnerSuggestion) {
        inputValue = s.name;
        value = s.name;
        onchange?.(s.name);
        isOpen = false;
        suggestions = [];
        activeIndex = -1;
    }

    function handleKeydown(e: KeyboardEvent) {
        if (!isOpen) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, suggestions.length - 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, -1);
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            selectSuggestion(suggestions[activeIndex]);
        } else if (e.key === 'Escape') {
            isOpen = false;
        }
    }

    function handleBlur() {
        if (inputValue.trim()) {
            value = inputValue.trim();
            onchange?.(value);
        }
        setTimeout(() => { isOpen = false; }, 200);
    }

    function openCreateDialog() {
        showCreateDialog = true;
        isOpen = false;
    }

    function handleCreated(name: string) {
        inputValue = name;
        value = name;
        onchange?.(name);
        showCreateDialog = false;
    }
</script>

<div class="relative w-full">
    {#if label}
        <label for={id} class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {label}{required ? ' *' : ''}
        </label>
    {/if}

    <div class="relative">
        <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500">
            {#if isLoading}
                <Loader2 class="w-4 h-4 animate-spin" />
            {:else}
                <Search class="w-4 h-4" />
            {/if}
        </span>

        <input
            bind:this={inputEl}
            {id}
            type="text"
            autocomplete="off"
            {required}
            value={inputValue}
            placeholder={placeholder ?? (entryType === 'income' ? 'z. B. Frau Müller, Pflegekasse AOK' : 'z. B. Vodafone, Vermieter GmbH')}
            oninput={handleInput}
            onkeydown={handleKeydown}
            onblur={handleBlur}
            onfocus={() => { if (inputValue.trim().length >= 1) handleSearch(inputValue); }}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls="partner-listbox-{id}"
            class="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-10 text-base sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
        />

        <button
            type="button"
            onclick={openCreateDialog}
            title="Neuen Partner anlegen"
            class="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 transition-colors cursor-pointer min-h-[44px] min-w-[44px] touch-manipulation"
        >
            <UserPlus class="w-4 h-4" />
        </button>
    </div>

    {#if isOpen && suggestions.length > 0}
        <PartnerSuggestionList
            {id}
            {suggestions}
            {activeIndex}
            {inputValue}
            onSelect={selectSuggestion}
            onOpenCreate={openCreateDialog}
        />
    {/if}
</div>

{#if showCreateDialog}
    <PartnerQuickCreateDialog
        initialName={inputValue.trim()}
        onClose={() => (showCreateDialog = false)}
        onCreated={handleCreated}
    />
{/if}
