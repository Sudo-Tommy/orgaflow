<script lang="ts">
    import type { Snippet } from "svelte";
    import type { WordBlock } from "./wordTypes";
    import { Plus } from "lucide-svelte";
    import WordBlockToolbar from "./WordBlockToolbar.svelte";

    let { 
        block = $bindable(), 
        isSelected, 
        isPreview = false, 
        isFirst = false, 
        isLast = false, 
        zoom = 1, 
        onSelect, 
        onMoveUp, 
        onMoveDown, 
        onDuplicate, 
        onDelete, 
        onInsertAfter, 
        onMergeWithNext, 
        onSplitBlock,
        wrapStyle = "", 
        onRegisterRef, 
        children 
    } = $props<{
        block: WordBlock;
        isSelected: boolean;
        isPreview?: boolean;
        isFirst?: boolean;
        isLast?: boolean;
        zoom?: number;
        onSelect: () => void;
        onMoveUp: () => void;
        onMoveDown: () => void;
        onDuplicate: () => void;
        onDelete: () => void;
        onInsertAfter: () => void;
        onMergeWithNext?: () => void;
        onSplitBlock?: () => void;
        wrapStyle?: string;
        onRegisterRef?: (el: HTMLElement | null) => void;
        children: Snippet;
    }>();

    let wrapperEl = $state<HTMLElement | null>(null);
    $effect(() => {
        onRegisterRef?.(wrapperEl);
        return () => {
            onRegisterRef?.(null);
        };
    });

    let isFullWidthBlock = $derived(block.type === 'logo' || block.type === 'page_break');
    let isRepeatingFooter = $derived(block.type === 'columns' && block.columnsConfig?.repeatOnAllPages === true);
    let widthPercent = $derived(isFullWidthBlock ? 100 : (block.style?.widthPercent ?? 100));
    let boxAlign = $derived(block.style?.boxAlign ?? 'left');

    let isHeaderAddress = $derived(
        block.type === 'columns' && (
            block.id?.includes('head_cols') || 
            block.columnsConfig?.columns?.some((c: any) => c.id?.includes('recipient') || c.id?.includes('anschrift') || String(c.content).includes('return_address'))
        )
    );

    let widthStyle = $derived.by(() => {
        if (block.type === 'page_break') return 'width: 100%; max-width: 100%;';
        const parts: string[] = [];
        if (isFullWidthBlock) {
            parts.push('width: 100%; max-width: 100%;');
        } else if (widthPercent < 100) {
            parts.push(`width: ${widthPercent}%; max-width: ${widthPercent}%;`);
            if (boxAlign === 'center') parts.push('margin-left: auto; margin-right: auto;');
            else if (boxAlign === 'right') parts.push('margin-left: auto; margin-right: 0;');
            else parts.push('margin-right: auto;');
        } else {
            parts.push('width: 100%;');
        }
        if (isRepeatingFooter) {
            parts.push('margin-top: auto;');
        }
        if (block.type === 'logo') {
            const mt = block.logoConfig?.marginTop ?? block.style?.marginTop ?? 0;
            const mb = block.logoConfig?.marginBottom ?? block.style?.marginBottom ?? 8;
            parts.push(`margin-top: ${mt}mm; margin-bottom: ${mb}mm;`);
        } else {
            if (block.style?.marginTop !== undefined) {
                parts.push(`margin-top: ${block.style.marginTop}pt;`);
            }
            if (block.style?.marginBottom !== undefined && !isHeaderAddress) {
                parts.push(`margin-bottom: ${block.style.marginBottom}pt;`);
            }
        }
        if (wrapStyle) parts.push(wrapStyle);
        return parts.join(' ');
    });

    // Zieh-Griff für Boxbreite (nur für Text- und Tabellenblöcke, Logo ist immer 100% Breite)
    let isResizingWidth = $state(false);
    let resizePreviewPct = $state<number | null>(null);

    function startResizeWidth(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        onSelect();

        isResizingWidth = true;
        const startMouseX = e.clientX;
        const parentEl = wrapperEl?.parentElement;
        const parentW = parentEl?.clientWidth || 674;
        const startPct = block.style?.widthPercent ?? 100;
        const startPx = (parentW * startPct) / 100;
        const currentZoom = zoom || 1;

        function onPointerMove(ev: PointerEvent) {
            const dx = (ev.clientX - startMouseX) / currentZoom;
            const newPx = Math.max(120, Math.min(parentW, startPx + dx));
            const newPct = Math.round((newPx / parentW) * 100);
            resizePreviewPct = newPct;
            if (!block.style) block.style = {};
            block.style.widthPercent = newPct;
        }

        function onPointerUp() {
            isResizingWidth = false;
            resizePreviewPct = null;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        }

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    bind:this={wrapperEl}
    class="group/block transition-all rounded-lg box-border relative {isPreview ? '' : (isSelected ? 'ring-2 ring-violet-500/80 bg-violet-50/20 dark:bg-violet-950/10' : 'hover:bg-neutral-50/60 dark:hover:bg-neutral-800/20')}"
    style={widthStyle}
    onclick={(e) => { if (!isPreview) { e.stopPropagation(); onSelect(); } }}
>
    <!-- Block Toolbar when Selected (Desktop top: Breite, Ausrichtung, Verschieben, Löschen) -->
    {#if isSelected && !isPreview}
        <WordBlockToolbar 
            bind:block
            {isFirst}
            {isLast}
            {onMoveUp}
            {onMoveDown}
            {onDuplicate}
            {onDelete}
            {onMergeWithNext}
            {onSplitBlock}
        />
    {/if}

    <!-- Zieh-Griff am rechten Rand für stufenloses Breiten-Resize (nicht bei Logo/Seitenumbruch) -->
    {#if isSelected && !isPreview && !isFullWidthBlock}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
            data-no-drag="true"
            class="absolute -right-2 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center group/resize z-30 touch-none select-none"
            onpointerdown={startResizeWidth}
            title="Box-Breite anpassen (Ziehen)"
        >
            <div class="w-1.5 h-9 rounded-full bg-violet-600 hover:bg-violet-700 shadow-md border border-white transition-transform group-hover/resize:scale-125 {isResizingWidth ? 'scale-125 ring-2 ring-violet-400' : ''}"></div>
        </div>

        {#if isResizingWidth && resizePreviewPct}
            <div class="absolute -top-7 right-0 bg-violet-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-md z-40 pointer-events-none animate-in fade-in">
                {resizePreviewPct}%
            </div>
        {/if}
    {/if}

    <!-- Inner Content Slot -->
    <div class="px-2 py-1">
        {@render children()}
    </div>

    <!-- Add Block Below Button -->
    {#if !isPreview}
        <div class="absolute -bottom-2.5 left-1/2 -translate-x-1/2 opacity-0 group-hover/block:opacity-100 transition-opacity z-20 pointer-events-none group-hover/block:pointer-events-auto">
            <button
                type="button"
                onclick={(e) => { e.stopPropagation(); onInsertAfter(); }}
                class="flex items-center gap-1 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-violet-600 border border-neutral-300 dark:border-neutral-600 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs hover:border-violet-400 active:scale-90 transition-all cursor-pointer"
                title="Neuen Absatz hier einfügen"
            >
                <Plus class="w-3 h-3 text-violet-600" />
                <span>Absatz</span>
            </button>
        </div>
    {/if}
</div>
