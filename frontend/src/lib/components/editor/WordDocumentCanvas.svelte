<script lang="ts">
    import type { WordBlock, WordBlockType } from "./wordTypes";
    import { paginateBlocks, splitBlockAtParagraphs } from "./wordPaginationHelper";
    import WordPageSheet from "./WordPageSheet.svelte";
    import { Plus, FileText } from "lucide-svelte";

    let {
        blocks = $bindable([]),
        selectedBlockId = $bindable(null),
        zoom = 1,
        isPreview = false,
        marginTop = 250,
        marginBottom = 150,
        orientation = 'portrait',
        onAddBlock,
        onDeleteBlock,
        onMoveBlock,
        onDuplicateBlock,
        onMergeWithNextBlock
    } = $props<{
        blocks: WordBlock[];
        selectedBlockId: string | null;
        zoom: number;
        isPreview?: boolean;
        marginTop: number;
        marginBottom: number;
        orientation: string;
        onAddBlock: (type: WordBlockType, index?: number, count?: number) => void;
        onDeleteBlock: (id: string) => void;
        onMoveBlock: (id: string, direction: 'up' | 'down') => void;
        onDuplicateBlock: (id: string) => void;
        onMergeWithNextBlock?: (id: string) => void;
    }>();

    const pageWidth = $derived(orientation === 'landscape' ? 1123 : 794);
    const pageHeight = $derived(orientation === 'landscape' ? 794 : 1123);

    let measuredHeights: Record<string, number> = $state({});
    const observers = new Map<string, { el: HTMLElement; ro: ResizeObserver }>();

    // Misst jeden Block live (auch beim Tippen), damit die Blattaufteilung sofort mitwandert
    function handleRegisterRef(id: string, el: HTMLElement | null) {
        const existing = observers.get(id);
        if (!el) {
            // Erst aufräumen, wenn das Element wirklich aus dem Dokument entfernt wurde
            setTimeout(() => {
                const cur = observers.get(id);
                if (cur && !cur.el.isConnected) {
                    cur.ro.disconnect();
                    observers.delete(id);
                }
            }, 0);
            return;
        }
        if (existing?.el === el) return;
        existing?.ro.disconnect();
        const ro = new ResizeObserver(() => {
            if (!el.isConnected) return;
            window.requestAnimationFrame(() => {
                const h = el.offsetHeight;
                if (h > 0 && measuredHeights[id] !== h) measuredHeights[id] = h;
            });
        });
        ro.observe(el);
        observers.set(id, { el, ro });
    }

    $effect(() => () => {
        observers.forEach(o => o.ro.disconnect());
        observers.clear();
    });

    const hasRepeatingLogo = $derived(blocks.some((b: WordBlock) => b.type === 'logo' && b.logoConfig?.repeatOnAllPages));
    const hasRepeatingFooter = $derived(blocks.some((b: WordBlock) => b.type === 'columns' && b.columnsConfig?.repeatOnAllPages));

    const repeatingLogoBlock = $derived(blocks.find((b: WordBlock) => b.type === 'logo' && b.logoConfig?.repeatOnAllPages));
    const repeatingFooterBlock = $derived(blocks.find((b: WordBlock) => b.type === 'columns' && b.columnsConfig?.repeatOnAllPages));

    const pages = $derived(
        paginateBlocks(blocks, pageHeight, measuredHeights, hasRepeatingLogo, hasRepeatingFooter)
    );

    function handleSplitBlock(id: string) {
        const idx = blocks.findIndex((b: WordBlock) => b.id === id);
        if (idx === -1) return;
        const newBlocks = splitBlockAtParagraphs(blocks[idx]);
        if (newBlocks.length > 1) {
            blocks.splice(idx, 1, ...newBlocks);
            selectedBlockId = newBlocks[0].id;
        }
    }
</script>

<!-- Outer canvas container with centering, dark desk background and zoom scaling -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    class="flex-1 overflow-auto bg-neutral-200/90 dark:bg-neutral-950 flex flex-col items-center py-8 px-2 sm:px-6 relative select-none custom-scrollbar"
    onclick={() => selectedBlockId = null}
>
    <!-- Scaled bounding wrapper -->
    <div 
        class="transition-transform duration-100 flex flex-col items-center"
        style="width: {pageWidth * zoom}px; transform: scale({zoom}); transform-origin: top center;"
    >
        {#if blocks.length === 0}
            <!-- Empty Document State -->
            <div 
                data-word-canvas="true"
                class="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xl rounded-sm border border-neutral-300 dark:border-neutral-800 p-8 sm:p-14 min-h-[1123px] w-full flex flex-col items-center justify-center"
                style="width: {pageWidth}px; min-height: {pageHeight}px;"
                onclick={(e) => e.stopPropagation()}
            >
                <div class="my-auto py-24 text-center text-neutral-400 flex flex-col items-center gap-3">
                    <div class="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-neutral-800 flex items-center justify-center text-violet-500 shadow-inner">
                        <FileText class="w-8 h-8" />
                    </div>
                    <h3 class="font-bold text-base text-neutral-700 dark:text-neutral-300">Dieses Dokument ist noch leer</h3>
                    <p class="text-xs text-neutral-500 max-w-sm">
                        Beginnen Sie mit einem DIN 5008 Briefkopf, einem Textabsatz oder fügen Sie eine Abrechnungstabelle ein.
                    </p>
                    {#if !isPreview}
                        <div class="flex items-center gap-2 mt-2">
                            <button
                                type="button"
                                onclick={() => onAddBlock('paragraph')}
                                class="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
                            >
                                <Plus class="w-4 h-4" />
                                <span>Absatz einfügen</span>
                            </button>
                        </div>
                    {/if}
                </div>
            </div>
        {:else}
            <!-- Multi-Page DIN A4 Sheet Layout (Like Microsoft Word / Google Docs) -->
            {#each pages as page (page.pageNumber)}
                <WordPageSheet
                    bind:blocks
                    {page}
                    totalPages={pages.length}
                    {pageWidth}
                    {pageHeight}
                    {zoom}
                    {isPreview}
                    {marginTop}
                    {marginBottom}
                    bind:selectedBlockId
                    {repeatingLogoBlock}
                    {repeatingFooterBlock}
                    {onAddBlock}
                    {onDeleteBlock}
                    {onMoveBlock}
                    {onDuplicateBlock}
                    {onMergeWithNextBlock}
                    onSplitBlock={handleSplitBlock}
                    onRegisterRef={handleRegisterRef}
                />
            {/each}
        {/if}
    </div>
</div>
