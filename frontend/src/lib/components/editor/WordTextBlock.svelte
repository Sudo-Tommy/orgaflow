<script lang="ts">
    import { onMount } from "svelte";
    import type { WordBlock } from "./wordTypes";
    import { htmlToWysiwyg, wysiwygToHtml, renderWithSampleData } from "./wordVariables";

    let { 
        block = $bindable(), 
        isSelected,
        isPreview = false,
        onFocus 
    } = $props<{
        block: WordBlock;
        isSelected: boolean;
        isPreview?: boolean;
        onFocus: () => void;
    }>();

    let editorDiv: HTMLDivElement | null = $state(null);
    let isInternalUpdating = false;

    onMount(() => {
        syncToDom();
    });

    function syncToDom() {
        if (!editorDiv || isInternalUpdating) return;
        if (typeof document !== 'undefined' && document.activeElement === editorDiv) return;
        const currentHtml = wysiwygToHtml(editorDiv.innerHTML);
        if (currentHtml !== (block.content || '')) {
            editorDiv.innerHTML = htmlToWysiwyg(block.content || '');
        }
    }

    $effect(() => {
        if (block.content !== undefined && editorDiv && !isInternalUpdating) {
            syncToDom();
        }
    });

    function handleInput() {
        if (!editorDiv) return;
        isInternalUpdating = true;
        block.content = wysiwygToHtml(editorDiv.innerHTML);
        isInternalUpdating = false;
    }

    function handleBlur() {
        if (!editorDiv) return;
        block.content = wysiwygToHtml(editorDiv.innerHTML);
    }

    let fontSize = $derived(
        block.style?.fontSize || (block.type === 'heading1' ? 18 : block.type === 'heading2' ? 14 : block.type === 'heading3' ? 12 : 11)
    );

    let fontWeight = $derived(
        block.style?.fontWeight || (block.type.startsWith('heading') ? 'bold' : 'normal')
    );

    let textAlign = $derived(block.style?.textAlign || 'left');
    let color = $derived(block.style?.color || (block.type === 'quote' ? '#4b5563' : '#111827'));
    let textDecoration = $derived(block.style?.textDecoration || 'none');
    let fontStyle = $derived(block.style?.fontStyle || (block.type === 'quote' ? 'italic' : 'normal'));
</script>

<div class="relative w-full {block.type === 'quote' ? 'border-l-4 border-violet-400 pl-3 py-1 bg-violet-50/30 dark:bg-violet-950/10 rounded-r-md' : ''}">
    {#if isPreview}
        <!-- Reine Live-Vorschau mit echten Musterdaten -->
        <div
            style="
                font-size: {fontSize}pt; 
                font-weight: {fontWeight}; 
                font-style: {fontStyle}; 
                text-align: {textAlign}; 
                text-decoration: {textDecoration}; 
                color: {color};
                line-height: {block.style?.lineHeight ?? (block.type.startsWith('heading') ? 1.3 : 1.4)};
            "
            class="w-full min-h-[1.5em] whitespace-pre-wrap select-text leading-relaxed font-sans"
        >
            {@html renderWithSampleData(block.content || '')}
        </div>
    {:else}
        <!-- Interaktiver Word-WYSIWYG-Textfluss -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            bind:this={editorDiv}
            contenteditable="true"
            oninput={handleInput}
            onblur={handleBlur}
            onfocus={onFocus}
            style="
                font-size: {fontSize}pt; 
                font-weight: {fontWeight}; 
                font-style: {fontStyle}; 
                text-align: {textAlign}; 
                text-decoration: {textDecoration}; 
                color: {color};
                line-height: {block.style?.lineHeight ?? (block.type.startsWith('heading') ? 1.3 : 1.4)};
            "
            class="w-full min-h-[1.5em] bg-transparent border-0 outline-none p-0 m-0 focus:ring-0 whitespace-pre-wrap leading-relaxed font-sans empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-300 dark:empty:before:text-neutral-600"
            data-placeholder={block.type === 'heading1' ? 'Große Überschrift...' : block.type === 'heading2' ? 'Mittlere Überschrift...' : 'Absatztext hier eingeben...'}
        ></div>
    {/if}
</div>

<style>
    :global(.orga-token-chip) {
        display: inline-flex;
        align-items: center;
        padding: 0.5px 6px;
        margin: 0 2px;
        border-radius: 6px;
        font-size: 0.9em;
        font-weight: 600;
        background-color: rgba(139, 92, 246, 0.12);
        color: #6d28d9;
        border: 1px solid rgba(139, 92, 246, 0.3);
        user-select: all;
        cursor: default;
        vertical-align: baseline;
    }
    :global(.dark .orga-token-chip) {
        background-color: rgba(139, 92, 246, 0.25);
        color: #c4b5fd;
        border-color: rgba(139, 92, 246, 0.45);
    }
    :global(.orga-sig-chip),
    :global(.orga-signature-chip) {
        background-color: rgba(99, 102, 241, 0.12) !important;
        color: #4f46e5 !important;
        border: 1px dashed rgba(99, 102, 241, 0.45) !important;
    }
    :global(.dark .orga-sig-chip),
    :global(.dark .orga-signature-chip) {
        background-color: rgba(99, 102, 241, 0.25) !important;
        color: #a5b4fc !important;
        border: 1px dashed rgba(99, 102, 241, 0.55) !important;
    }
</style>
