<script lang="ts">
    import { ChevronUp, ChevronDown, Copy, Trash2, Columns2, AlignLeft, AlignCenter, AlignRight, Sliders, Scissors } from "lucide-svelte";
    import type { WordBlock } from "./wordTypes";

    let {
        block = $bindable(),
        isFirst = false,
        isLast = false,
        onMoveUp,
        onMoveDown,
        onDuplicate,
        onDelete,
        onMergeWithNext,
        onSplitBlock
    } = $props<{
        block: WordBlock;
        isFirst?: boolean;
        isLast?: boolean;
        onMoveUp: () => void;
        onMoveDown: () => void;
        onDuplicate: () => void;
        onDelete: () => void;
        onMergeWithNext?: () => void;
        onSplitBlock?: () => void;
    }>();

    let widthPercent = $derived(block.style?.widthPercent ?? 100);
    let boxAlign = $derived(block.style?.boxAlign ?? 'left');
    let isConfirmingDelete = $state(false);

    const widthPresets = [100, 75, 50, 33];

    function setWidth(val: number) {
        if (!block.style) block.style = {};
        block.style.widthPercent = val;
    }

    function setAlign(val: 'left' | 'center' | 'right') {
        if (!block.style) block.style = {};
        block.style.boxAlign = val;
    }

    function handleDeleteClick(e: MouseEvent) {
        e.stopPropagation();
        if (isConfirmingDelete) {
            isConfirmingDelete = false;
            onDelete();
        } else {
            isConfirmingDelete = true;
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    data-no-drag="true"
    class="absolute -top-11 left-0 flex items-center gap-1.5 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md shadow-2xl border border-neutral-300 dark:border-neutral-700 px-2 py-1 rounded-xl z-40 text-xs whitespace-nowrap select-none ring-1 ring-violet-500/20"
    onclick={(e) => e.stopPropagation()}
    onpointerdown={(e) => e.stopPropagation()}
>
    {#if block.type === 'logo'}
        <span class="text-[10px] font-bold text-violet-600 dark:text-violet-400 px-1 uppercase tracking-wider">
            Bildbox (100% Breite)
        </span>
    {:else if block.type === 'page_break'}
        <span class="text-[10px] font-bold text-rose-600 dark:text-rose-400 px-1 uppercase tracking-wider">
            Seitenumbruch (DIN A4)
        </span>
    {:else}
        <!-- Width Presets -->
        <div class="flex items-center gap-1">
            <span class="text-[10px] text-neutral-400 font-bold flex items-center gap-0.5">
                <Sliders class="w-2.5 h-2.5 text-violet-500" />
                Breite:
            </span>
            {#each widthPresets as wVal}
                <button
                    type="button"
                    onclick={() => setWidth(wVal)}
                    class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer {widthPercent === wVal ? 'bg-violet-600 text-white shadow-sm' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'}"
                    title="Box-Breite auf {wVal}% setzen"
                >
                    {wVal}%
                </button>
            {/each}
        </div>
    {/if}

    <!-- Box Alignment (only active when width < 100%) -->
    {#if widthPercent < 100}
        <div class="h-3.5 w-px bg-neutral-200 dark:bg-neutral-700"></div>
        <div class="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-700 p-0.5 rounded-lg">
            <button
                type="button"
                onclick={() => setAlign('left')}
                class="p-1 rounded text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer {boxAlign === 'left' ? 'bg-white dark:bg-neutral-600 text-violet-600 shadow-xs' : 'hover:text-violet-600'}"
                title="Box linksbündig ausrichten"
            >
                <AlignLeft class="w-3 h-3" />
            </button>
            <button
                type="button"
                onclick={() => setAlign('center')}
                class="p-1 rounded text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer {boxAlign === 'center' ? 'bg-white dark:bg-neutral-600 text-violet-600 shadow-xs' : 'hover:text-violet-600'}"
                title="Box zentrieren"
            >
                <AlignCenter class="w-3 h-3" />
            </button>
            <button
                type="button"
                onclick={() => setAlign('right')}
                class="p-1 rounded text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer {boxAlign === 'right' ? 'bg-white dark:bg-neutral-600 text-violet-600 shadow-xs' : 'hover:text-violet-600'}"
                title="Box rechtsbündig ausrichten"
            >
                <AlignRight class="w-3 h-3" />
            </button>
        </div>
    {/if}

    <div class="h-3.5 w-px bg-neutral-200 dark:bg-neutral-700"></div>

    <!-- Move Up / Down -->
    <button
        type="button"
        onclick={(e) => { e.stopPropagation(); onMoveUp(); }}
        disabled={isFirst}
        class="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-violet-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors disabled:opacity-20 cursor-pointer"
        title="Nach oben"
    >
        <ChevronUp class="w-3.5 h-3.5" />
    </button>
    <button
        type="button"
        onclick={(e) => { e.stopPropagation(); onMoveDown(); }}
        disabled={isLast}
        class="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-violet-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors disabled:opacity-20 cursor-pointer"
        title="Nach unten"
    >
        <ChevronDown class="w-3.5 h-3.5" />
    </button>

    <!-- Duplicate -->
    <button
        type="button"
        onclick={(e) => { e.stopPropagation(); onDuplicate(); }}
        class="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-violet-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors cursor-pointer"
        title="Block duplizieren"
    >
        <Copy class="w-3 h-3" />
    </button>

    {#if !isLast && onMergeWithNext && (block.type !== 'columns' || (block.columnsConfig?.columns?.length || 0) < 4) && block.type !== 'table' && block.type !== 'billing_table' && block.type !== 'page_break'}
        <button
            type="button"
            onclick={(e) => { e.stopPropagation(); onMergeWithNext(); }}
            class="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-violet-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors cursor-pointer"
            title={block.type === 'columns' ? "Nächstes Textfeld als weitere Spalte anfügen" : "Mit nächstem Block zu Spalten verbinden"}
        >
            <Columns2 class="w-3 h-3" />
        </button>
    {/if}

    {#if block.type === 'paragraph' && block.content?.includes('\n\n') && onSplitBlock}
        <button
            type="button"
            onclick={(e) => { e.stopPropagation(); onSplitBlock(); }}
            class="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 transition-colors cursor-pointer"
            title="Diesen langen Text an Absätzen in separate Blöcke aufteilen (für saubere DIN A4-Blattverteilung)"
        >
            <Scissors class="w-3 h-3 text-violet-600" />
            <span>Absätze teilen</span>
        </button>
    {/if}

    <!-- Delete -->
    <button
        type="button"
        onclick={handleDeleteClick}
        class="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer {isConfirmingDelete ? 'bg-rose-600 text-white animate-pulse' : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 bg-rose-50/50'}"
        title="Block löschen"
    >
        <Trash2 class="w-3 h-3 text-rose-600 dark:text-rose-400 {isConfirmingDelete ? 'text-white' : ''}" />
        <span>{isConfirmingDelete ? 'Wirklich löschen?' : 'Löschen'}</span>
    </button>
</div>
