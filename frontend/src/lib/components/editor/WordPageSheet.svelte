<script lang="ts">
    import type { WordBlock, WordBlockType } from "./wordTypes";
    import type { PageData } from "./wordPaginationHelper";
    import WordBlockWrapper from "./WordBlockWrapper.svelte";
    import WordTextBlock from "./WordTextBlock.svelte";
    import WordTableBlock from "./WordTableBlock.svelte";
    import WordLogoBlock from "./WordLogoBlock.svelte";
    import WordDin5008Block from "./WordDin5008Block.svelte";
    import WordColumnsBlock from "./WordColumnsBlock.svelte";
    import { Scissors, Trash2, Image as ImageIcon } from "lucide-svelte";

    let {
        blocks = $bindable([]),
        page,
        totalPages,
        pageWidth,
        pageHeight,
        zoom = 1,
        isPreview = false,
        marginTop = 250,
        marginBottom = 150,
        selectedBlockId = $bindable(null),
        repeatingLogoBlock,
        repeatingFooterBlock,
        onAddBlock,
        onDeleteBlock,
        onMoveBlock,
        onDuplicateBlock,
        onMergeWithNextBlock,
        onSplitBlock,
        onRegisterRef
    } = $props<{
        blocks: WordBlock[];
        page: PageData;
        totalPages: number;
        pageWidth: number;
        pageHeight: number;
        zoom: number;
        isPreview?: boolean;
        marginTop: number;
        marginBottom: number;
        selectedBlockId: string | null;
        repeatingLogoBlock?: WordBlock;
        repeatingFooterBlock?: WordBlock;
        onAddBlock: (type: WordBlockType, index?: number, count?: number) => void;
        onDeleteBlock: (id: string) => void;
        onMoveBlock: (id: string, direction: 'up' | 'down') => void;
        onDuplicateBlock: (id: string) => void;
        onMergeWithNextBlock?: (id: string) => void;
        onSplitBlock?: (id: string) => void;
        onRegisterRef?: (id: string, el: HTMLElement | null) => void;
    }>();

    const lastIdx = $derived(blocks.length - 1);
</script>

<div class="flex flex-col items-center mb-8 relative group/sheet">
    <!-- Blatt-Beschriftung über dem Papier -->
    <div class="w-full flex items-center justify-between px-3 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 select-none" style="max-width: {pageWidth}px;">
        <span class="font-bold flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full {page.pageNumber === 1 ? 'bg-violet-500' : 'bg-neutral-400'}"></span>
            DIN A4 &bull; Blatt {page.pageNumber} von {totalPages}
        </span>
    </div>

    <!-- Das DIN A4-Blatt -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
        data-word-canvas="true"
        class="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xl rounded-sm border border-neutral-300 dark:border-neutral-800 relative flex flex-col select-text transition-shadow hover:shadow-2xl"
        style="width: {pageWidth}px; min-height: {pageHeight}px; padding: {pageWidth > pageHeight ? '76px' : '76px 76px 76px 95px'};"
        onclick={(e) => e.stopPropagation()}
    >
        <!-- Dezente DIN 5008 Randmarken auf Blatt 1 (nie über dem Text) -->
        {#if !isPreview && page.pageNumber === 1}
            <div class="absolute left-1 top-0 bottom-0 pointer-events-none select-none flex flex-col justify-between py-2" aria-hidden="true">
                <div class="border-l-2 border-violet-400/50 pl-1" style="margin-top: {marginTop - 16}px;">
                    <span class="text-violet-500/80 font-bold uppercase text-[8px]">Kopf</span>
                </div>
                <div class="border-l-2 border-rose-400/50 pl-1" style="margin-bottom: {marginBottom - 16}px;">
                    <span class="text-rose-500/80 font-bold uppercase text-[8px]">Fuß</span>
                </div>
            </div>
        {/if}

        <!-- Falzmarke 1 (105 mm - DIN 5008 / Umschlag-Fensterrand) -->
        {#if page.pageNumber === 1}
            {@const foldMark105Y = Math.round(105 / 297 * pageHeight)}
            <div 
                class="absolute left-0 w-3 h-0.5 bg-neutral-400/80 dark:bg-neutral-600 pointer-events-none select-none z-10" 
                style="top: {foldMark105Y}px;"
                title="105 mm Falzmarke 1 (DIN 5008 / Fensterbriefumschlag)"
            ></div>
            {#if !isPreview}
                <div 
                    class="absolute left-3 right-3 border-t border-dashed border-sky-400/40 pointer-events-none select-none z-10 flex items-center justify-end pr-2"
                    style="top: {foldMark105Y}px;"
                    aria-hidden="true"
                >
                    <span class="text-[8px] font-mono text-sky-600 dark:text-sky-400 bg-white/90 dark:bg-neutral-900/90 px-1 rounded -translate-y-1/2 shadow-xs">
                        105 mm Falzmarke (Fenster-Ende)
                    </span>
                </div>
            {/if}
        {/if}

        <!-- Ghost-Kopfzeile auf Folgeseiten -->
        {#if page.pageNumber > 1 && repeatingLogoBlock}
            <div class="w-full flex items-center justify-between pb-3 mb-4 border-b border-dashed border-neutral-200 dark:border-neutral-800 opacity-40 select-none pointer-events-none">
                <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <ImageIcon class="w-3 h-3 text-emerald-500" />
                    Wiederholter Briefkopf / Firmenlogo
                </span>
                <div class="h-10 flex items-center">
                    {#if repeatingLogoBlock.logoConfig?.url}
                        <img src={repeatingLogoBlock.logoConfig.url} alt="Logo" class="max-h-10 object-contain" />
                    {:else}
                        <span class="text-xs font-bold text-neutral-400 italic">Firmenlogo</span>
                    {/if}
                </div>
            </div>
        {/if}

        <!-- Blöcke dieses Blatts (Bindings zeigen direkt auf das reaktive blocks-Array) -->
        <div class="flex-1 flex flex-row flex-wrap content-start items-start w-full">
            {#each page.indices as gIdx (blocks[gIdx]?.id ?? gIdx)}
                {#if blocks[gIdx]}
                    {@const block = blocks[gIdx]}
                    {@const isCurSelected = selectedBlockId === block.id}
                    <WordBlockWrapper
                        bind:block={blocks[gIdx]}
                        isSelected={isCurSelected}
                        {isPreview}
                        isFirst={gIdx === 0}
                        isLast={gIdx === lastIdx}
                        {zoom}
                        onSelect={() => selectedBlockId = block.id}
                        onMoveUp={() => onMoveBlock(block.id, 'up')}
                        onMoveDown={() => onMoveBlock(block.id, 'down')}
                        onDuplicate={() => onDuplicateBlock(block.id)}
                        onDelete={() => onDeleteBlock(block.id)}
                        onInsertAfter={() => onAddBlock('paragraph', gIdx + 1)}
                        onMergeWithNext={() => onMergeWithNextBlock?.(block.id)}
                        onSplitBlock={() => onSplitBlock?.(block.id)}
                        onRegisterRef={(el) => onRegisterRef?.(block.id, el)}
                    >
                        {#if block.type === 'logo'}
                            <WordLogoBlock 
                                bind:block={blocks[gIdx]} 
                                isSelected={isCurSelected} 
                                {zoom} 
                                onFocus={() => selectedBlockId = block.id}
                                isFirst={gIdx === 0}
                                isLast={gIdx === lastIdx}
                                onMoveUp={() => onMoveBlock(block.id, 'up')}
                                onMoveDown={() => onMoveBlock(block.id, 'down')}
                                onDuplicate={() => onDuplicateBlock(block.id)}
                                onDelete={() => onDeleteBlock(block.id)}
                            />
                        {:else if block.type === 'din5008_header'}
                            <WordDin5008Block bind:block={blocks[gIdx]} isSelected={isCurSelected} {isPreview} onFocus={() => selectedBlockId = block.id} />
                        {:else if block.type === 'table' || block.type === 'billing_table'}
                            <WordTableBlock bind:block={blocks[gIdx]} isSelected={isCurSelected} {zoom} onFocus={() => selectedBlockId = block.id} />
                        {:else if block.type === 'columns'}
                            <WordColumnsBlock bind:block={blocks[gIdx]} isSelected={isCurSelected} {isPreview} onFocus={() => selectedBlockId = block.id} />
                        {:else}
                            <WordTextBlock bind:block={blocks[gIdx]} isSelected={isCurSelected} {isPreview} onFocus={() => selectedBlockId = block.id} />
                        {/if}
                    </WordBlockWrapper>
                {/if}
            {/each}
        </div>

        <!-- Manueller Seitenumbruch am Blattende -->
        {#if page.hasManualBreakAfter && page.manualBreakBlockId}
            <div class="w-full mt-4 pt-2 border-t border-dashed border-rose-300 dark:border-rose-800 flex items-center justify-between text-xs select-none">
                <span class="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5 text-[11px]">
                    <Scissors class="w-3.5 h-3.5" />
                    Manueller Seitenumbruch &bull; Weiter auf Blatt {page.pageNumber + 1}
                </span>
                {#if !isPreview}
                    <button
                        type="button"
                        onclick={() => onDeleteBlock(page.manualBreakBlockId!)}
                        class="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-800 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Seitenumbruch entfernen"
                    >
                        <Trash2 class="w-3 h-3" />
                        <span>Umbruch aufheben</span>
                    </button>
                {/if}
            </div>
        {/if}

        <!-- Ghost-Fußzeile auf Folgeseiten -->
        {#if page.pageNumber > 1 && repeatingFooterBlock?.columnsConfig}
            <div class="w-full mt-auto pt-3 border-t border-dashed border-neutral-300 dark:border-neutral-700 opacity-40 select-none pointer-events-none">
                <div class="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    🔁 Fußzeile (wird auf jeder Seite gedruckt)
                </div>
                <div class="flex justify-between text-[8px] text-neutral-500">
                    {#each repeatingFooterBlock.columnsConfig.columns as col}
                        <div style="width: {col.widthPercent}%; text-align: {col.textAlign || 'left'};" class="truncate pr-2">
                            {(col.content || '').replace(/<[^>]*>/g, '').split('\n')[0] || 'Fußzeile'}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- Seitenzahl -->
        <div class="absolute bottom-2.5 right-6 text-[10px] font-mono text-neutral-400 dark:text-neutral-500 select-none pointer-events-none">
            Seite {page.pageNumber} / {totalPages}
        </div>
    </div>
</div>
