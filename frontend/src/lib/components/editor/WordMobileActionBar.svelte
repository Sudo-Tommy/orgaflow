<script lang="ts">
    import { slide } from "svelte/transition";
    import { Sparkles, Plus, Sliders, Type, Table, Receipt, Mail, X, Columns3, Columns2 } from "lucide-svelte";
    import type { WordBlockType } from "./wordTypes";
    import { VARIABLE_CATEGORIES } from "./wordVariables";

    let {
        onAddBlock,
        onInsertVariable,
        onInsertLetterhead
    } = $props<{
        onAddBlock: (type: WordBlockType, index?: number, count?: number) => void;
        onInsertVariable: (token: string) => void;
        onInsertLetterhead: (variant: 'formA' | 'formB') => void;
    }>();

    let activeSheet = $state<'none' | 'variables' | 'blocks'>('none');
    let selectedCatIndex = $state(0);
</script>

<!-- Mobile Bottom Bar (visible < md) -->
<nav data-no-cursor-track="true" class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 px-3 py-2 flex items-center justify-around shadow-2xl">
    <button
        type="button"
        onclick={() => activeSheet = activeSheet === 'variables' ? 'none' : 'variables'}
        class="flex flex-col items-center gap-0.5 text-violet-400 hover:text-violet-300 font-bold text-[10px]"
    >
        <div class="p-1.5 rounded-xl bg-violet-500/20">
            <Sparkles class="w-4 h-4" />
        </div>
        <span>Variable</span>
    </button>

    <button
        type="button"
        onclick={() => onAddBlock('paragraph')}
        class="flex flex-col items-center gap-0.5 text-neutral-300 hover:text-white font-bold text-[10px]"
    >
        <div class="p-1.5 rounded-xl bg-neutral-800">
            <Type class="w-4 h-4" />
        </div>
        <span>+ Absatz</span>
    </button>

    <button
        type="button"
        onclick={() => activeSheet = activeSheet === 'blocks' ? 'none' : 'blocks'}
        class="flex flex-col items-center gap-0.5 text-neutral-300 hover:text-white font-bold text-[10px]"
    >
        <div class="p-1.5 rounded-xl bg-neutral-800">
            <Plus class="w-4 h-4" />
        </div>
        <span>Einfügen</span>
    </button>
</nav>

<!-- Mobile Drawer Sheet -->
{#if activeSheet !== 'none'}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
        class="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-xs" 
        onclick={() => activeSheet = 'none'}
    ></div>

    <div 
        data-no-cursor-track="true"
        transition:slide={{ duration: 200 }}
        class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-neutral-900 rounded-t-3xl shadow-2xl p-4 max-h-[80vh] flex flex-col pb-8"
    >
        <div class="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <h4 class="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                {activeSheet === 'variables' ? 'Variable einfügen' : 'Inhaltselement einfügen'}
            </h4>
            <button type="button" onclick={() => activeSheet = 'none'} class="p-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                <X class="w-4 h-4" />
            </button>
        </div>

        {#if activeSheet === 'variables'}
            <!-- Category Tabs -->
            <div class="flex gap-1 overflow-x-auto py-2 border-b border-neutral-100 dark:border-neutral-800 custom-scrollbar">
                {#each VARIABLE_CATEGORIES as cat, idx}
                    <button
                        type="button"
                        onclick={() => selectedCatIndex = idx}
                        class="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap {selectedCatIndex === idx ? 'bg-violet-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}"
                    >
                        {cat.icon} {cat.category.split(' ')[0]}
                    </button>
                {/each}
            </div>

            <!-- Variables List -->
            <div class="flex-1 overflow-y-auto space-y-1 py-2 custom-scrollbar">
                {#each VARIABLE_CATEGORIES[selectedCatIndex].items as item}
                    <button
                        type="button"
                        onclick={() => { onInsertVariable(item.token); activeSheet = 'none'; }}
                        class="w-full text-left p-2.5 rounded-xl hover:bg-violet-50 dark:hover:bg-neutral-800 border border-neutral-100 dark:border-neutral-800 flex items-center justify-between"
                    >
                        <div>
                            <p class="text-xs font-bold text-neutral-900 dark:text-neutral-100">{item.label}</p>
                            <p class="text-[10px] text-neutral-400 font-mono mt-0.5">{item.token}</p>
                        </div>
                        <span class="text-xs font-bold text-violet-600">+ Einfügen</span>
                    </button>
                {/each}
            </div>
        {:else if activeSheet === 'blocks'}
            <div class="grid grid-cols-2 gap-2 py-3">
                <button
                    type="button"
                    onclick={() => { onAddBlock('paragraph'); activeSheet = 'none'; }}
                    class="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-violet-500 text-left"
                >
                    <Type class="w-5 h-5 text-neutral-600 mb-1" />
                    <p class="text-xs font-bold">Textabsatz</p>
                </button>
                <button
                    type="button"
                    onclick={() => { onAddBlock('heading1'); activeSheet = 'none'; }}
                    class="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-violet-500 text-left"
                >
                    <Type class="w-5 h-5 text-violet-600 mb-1" />
                    <p class="text-xs font-bold">Überschrift</p>
                </button>
                <button
                    type="button"
                    onclick={() => { onAddBlock('billing_table'); activeSheet = 'none'; }}
                    class="p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 text-left"
                >
                    <Receipt class="w-5 h-5 text-amber-600 mb-1" />
                    <p class="text-xs font-bold text-amber-900 dark:text-amber-200">Abrechnungstabelle</p>
                </button>
                <button
                    type="button"
                    onclick={() => { onAddBlock('columns', undefined, 3); activeSheet = 'none'; }}
                    class="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-violet-500 text-left"
                >
                    <Columns3 class="w-5 h-5 text-violet-600 mb-1" />
                    <p class="text-xs font-bold">3 Spalten (Fußzeile)</p>
                </button>
                <button
                    type="button"
                    onclick={() => { onAddBlock('columns', undefined, 2); activeSheet = 'none'; }}
                    class="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-violet-500 text-left"
                >
                    <Columns2 class="w-5 h-5 text-neutral-500 mb-1" />
                    <p class="text-xs font-bold">2 Spalten</p>
                </button>
                <button
                    type="button"
                    onclick={() => { onInsertLetterhead('formB'); activeSheet = 'none'; }}
                    class="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-violet-500 text-left"
                >
                    <Mail class="w-5 h-5 text-sky-600 mb-1" />
                    <p class="text-xs font-bold">Briefkopf DIN 5008</p>
                </button>
            </div>
        {/if}
    </div>
{/if}
