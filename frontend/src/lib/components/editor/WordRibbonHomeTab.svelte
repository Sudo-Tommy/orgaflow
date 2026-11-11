<script lang="ts">
    import type { WordBlock } from "./wordTypes";
    import WordParagraphSpacingMenu from "./WordParagraphSpacingMenu.svelte";
    import { 
        Bold, 
        Italic, 
        Underline, 
        Strikethrough, 
        AlignLeft, 
        AlignCenter, 
        AlignRight, 
        AlignJustify 
    } from "lucide-svelte";

    let { 
        activeBlock = null,
        logoBlock = null,
        lineHeight = $bindable(1.4),
        paragraphSpacingBefore = $bindable(0),
        paragraphSpacingAfter = $bindable(4),
        tableLineSpacing = $bindable(1.8),
        onUpdateSpacings
    } = $props<{
        activeBlock: WordBlock | null;
        logoBlock?: WordBlock | null;
        lineHeight: number;
        paragraphSpacingBefore: number;
        paragraphSpacingAfter: number;
        tableLineSpacing: number;
        onUpdateSpacings: () => void;
    }>();

    const fontSizes = [7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32];
    const blockTypes = [
        { value: 'paragraph', label: 'Standard (Fließtext)' },
        { value: 'heading1', label: 'Überschrift 1 (Groß)' },
        { value: 'heading2', label: 'Überschrift 2 (Mittel)' },
        { value: 'heading3', label: 'Überschrift 3 (Klein)' },
        { value: 'quote', label: 'Hinweis-Kasten (Zitat)' }
    ];

    function toggleStyle(prop: 'fontWeight' | 'fontStyle' | 'textDecoration', onVal: string, offVal: string) {
        if (!activeBlock) return;
        activeBlock.style = activeBlock.style || {};
        const current = (activeBlock.style as any)[prop];
        (activeBlock.style as any)[prop] = current === onVal ? offVal : onVal;
    }

    function setAlign(alignment: 'left' | 'center' | 'right' | 'justify') {
        if (!activeBlock) return;
        activeBlock.style = activeBlock.style || {};
        activeBlock.style.textAlign = alignment;
    }

    function handleTypeChange(newType: any) {
        if (!activeBlock) return;
        activeBlock.type = newType;
        if (newType === 'heading1') activeBlock.style.fontSize = 18;
        else if (newType === 'heading2') activeBlock.style.fontSize = 14;
        else if (newType === 'heading3') activeBlock.style.fontSize = 12;
        else if (newType === 'paragraph') activeBlock.style.fontSize = 11;
    }

    function handleFontSizeChange(newSize: number) {
        if (!activeBlock) return;
        if (activeBlock.type === 'billing_table' || activeBlock.type === 'table') {
            if (!activeBlock.tableConfig) activeBlock.tableConfig = {};
            activeBlock.tableConfig.fontSize = newSize;
        }
        if (!activeBlock.style) activeBlock.style = {};
        activeBlock.style.fontSize = newSize;
    }

    let currentFontSize = $derived.by(() => {
        if (!activeBlock) return 11;
        if (activeBlock.type === 'billing_table' || activeBlock.type === 'table') {
            return activeBlock.tableConfig?.fontSize || 9.5;
        }
        return activeBlock.style?.fontSize || 11;
    });
</script>

<div class="flex flex-wrap items-center gap-1.5 sm:gap-2.5 py-1 text-neutral-800 dark:text-neutral-200">
    <!-- Formatvorlage / Block-Typ -->
    <div class="flex flex-col gap-0.5">
        <label for="ribbon-block-type" class="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">Format</label>
        <select 
            id="ribbon-block-type"
            value={activeBlock?.type || 'paragraph'} 
            onchange={(e) => handleTypeChange(e.currentTarget.value)}
            disabled={!activeBlock || activeBlock.type === 'billing_table' || activeBlock.type === 'logo'}
            class="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-violet-500 focus:outline-none min-w-32 h-8 disabled:opacity-40"
        >
            {#each blockTypes as bt}
                <option value={bt.value}>{bt.label}</option>
            {/each}
        </select>
    </div>

    <!-- Schriftgröße -->
    <div class="flex flex-col gap-0.5">
        <label for="ribbon-font-size" class="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">Größe</label>
        <select 
            id="ribbon-font-size"
            value={currentFontSize}
            onchange={(e) => handleFontSizeChange(Number(e.currentTarget.value))}
            disabled={!activeBlock}
            class="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs font-mono font-medium focus:ring-1 focus:ring-violet-500 focus:outline-none w-16 h-8 disabled:opacity-40"
        >
            {#each fontSizes as size}
                <option value={size}>{size} pt</option>
            {/each}
        </select>
    </div>

    <div class="h-7 w-px bg-neutral-200 dark:bg-neutral-700 mx-0.5 self-end mb-0.5 hidden sm:block"></div>

    <!-- Text-Formatierung -->
    <div class="flex flex-col gap-0.5">
        <span class="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">Schriftschnitt</span>
        <div class="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-800/80 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 h-8">
            <button
                type="button"
                onclick={() => toggleStyle('fontWeight', 'bold', 'normal')}
                disabled={!activeBlock}
                class="w-7 h-7 flex items-center justify-center rounded-md font-bold text-xs transition-colors {activeBlock?.style?.fontWeight === 'bold' ? 'bg-white dark:bg-neutral-700 shadow-xs text-violet-600 dark:text-violet-400' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'} disabled:opacity-40"
                title="Fett (Strg+B)"
            >
                <Bold class="w-3.5 h-3.5" />
            </button>
            <button
                type="button"
                onclick={() => toggleStyle('fontStyle', 'italic', 'normal')}
                disabled={!activeBlock}
                class="w-7 h-7 flex items-center justify-center rounded-md text-xs italic transition-colors {activeBlock?.style?.fontStyle === 'italic' ? 'bg-white dark:bg-neutral-700 shadow-xs text-violet-600 dark:text-violet-400' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'} disabled:opacity-40"
                title="Kursiv (Strg+I)"
            >
                <Italic class="w-3.5 h-3.5" />
            </button>
            <button
                type="button"
                onclick={() => toggleStyle('textDecoration', 'underline', 'none')}
                disabled={!activeBlock}
                class="w-7 h-7 flex items-center justify-center rounded-md text-xs underline transition-colors {activeBlock?.style?.textDecoration === 'underline' ? 'bg-white dark:bg-neutral-700 shadow-xs text-violet-600 dark:text-violet-400' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'} disabled:opacity-40"
                title="Unterstrichen (Strg+U)"
            >
                <Underline class="w-3.5 h-3.5" />
            </button>
            <button
                type="button"
                onclick={() => toggleStyle('textDecoration', 'line-through', 'none')}
                disabled={!activeBlock}
                class="w-7 h-7 flex items-center justify-center rounded-md text-xs transition-colors {activeBlock?.style?.textDecoration === 'line-through' ? 'bg-white dark:bg-neutral-700 shadow-xs text-violet-600 dark:text-violet-400' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'} disabled:opacity-40"
                title="Durchgestrichen"
            >
                <Strikethrough class="w-3.5 h-3.5" />
            </button>
        </div>
    </div>

    <div class="h-7 w-px bg-neutral-200 dark:bg-neutral-700 mx-0.5 self-end mb-0.5 hidden sm:block"></div>

    <!-- Ausrichtung -->
    <div class="flex flex-col gap-0.5">
        <span class="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">Ausrichtung</span>
        <div class="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-800/80 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 h-8">
            <button
                type="button"
                onclick={() => setAlign('left')}
                disabled={!activeBlock}
                class="w-7 h-7 flex items-center justify-center rounded-md text-xs transition-colors {activeBlock?.style?.textAlign === 'left' || !activeBlock?.style?.textAlign ? 'bg-white dark:bg-neutral-700 shadow-xs text-violet-600 dark:text-violet-400' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'} disabled:opacity-40"
                title="Linksbündig"
            >
                <AlignLeft class="w-3.5 h-3.5" />
            </button>
            <button
                type="button"
                onclick={() => setAlign('center')}
                disabled={!activeBlock}
                class="w-7 h-7 flex items-center justify-center rounded-md text-xs transition-colors {activeBlock?.style?.textAlign === 'center' ? 'bg-white dark:bg-neutral-700 shadow-xs text-violet-600 dark:text-violet-400' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'} disabled:opacity-40"
                title="Zentriert"
            >
                <AlignCenter class="w-3.5 h-3.5" />
            </button>
            <button
                type="button"
                onclick={() => setAlign('right')}
                disabled={!activeBlock}
                class="w-7 h-7 flex items-center justify-center rounded-md text-xs transition-colors {activeBlock?.style?.textAlign === 'right' ? 'bg-white dark:bg-neutral-700 shadow-xs text-violet-600 dark:text-violet-400' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'} disabled:opacity-40"
                title="Rechtsbündig"
            >
                <AlignRight class="w-3.5 h-3.5" />
            </button>
            <button
                type="button"
                onclick={() => setAlign('justify')}
                disabled={!activeBlock}
                class="w-7 h-7 flex items-center justify-center rounded-md text-xs transition-colors {activeBlock?.style?.textAlign === 'justify' ? 'bg-white dark:bg-neutral-700 shadow-xs text-violet-600 dark:text-violet-400' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'} disabled:opacity-40"
                title="Blocksatz"
            >
                <AlignJustify class="w-3.5 h-3.5" />
            </button>
        </div>
    </div>

    <!-- Zeilen- & Absatzabstand (MS Word Style) -->
    <WordParagraphSpacingMenu
        bind:lineHeight
        bind:paragraphSpacingBefore
        bind:paragraphSpacingAfter
        bind:tableLineSpacing
        {logoBlock}
        onUpdate={onUpdateSpacings}
    />

    <div class="h-7 w-px bg-neutral-200 dark:bg-neutral-700 mx-0.5 self-end mb-0.5 hidden sm:block"></div>

    <!-- Textfarbe -->
    <div class="flex flex-col gap-0.5">
        <label for="ribbon-text-color" class="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">Farbe</label>
        <div class="flex items-center gap-1 h-8">
            <div class="relative flex items-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 h-full gap-1 cursor-pointer">
                <input 
                    id="ribbon-text-color"
                    type="color" 
                    value={activeBlock?.style?.color || '#111827'}
                    oninput={(e) => { if (activeBlock) activeBlock.style.color = e.currentTarget.value; }}
                    disabled={!activeBlock}
                    class="w-4 h-4 rounded cursor-pointer border-0 p-0 bg-transparent"
                    title="Schriftfarbe"
                />
                <span class="text-[10px] font-mono text-neutral-500 uppercase">{activeBlock?.style?.color?.slice(0, 7) || '#111827'}</span>
            </div>
        </div>
    </div>
</div>
