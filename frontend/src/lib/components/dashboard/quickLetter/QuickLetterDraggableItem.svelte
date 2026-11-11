<script lang="ts">
    import type { Snippet } from 'svelte';
    import { GripVertical, RotateCcw } from 'lucide-svelte';
    import type { ElementPosition, PositionKey } from './quickLetterTypes';

    interface Props {
        itemKey: PositionKey;
        position: ElementPosition;
        scale: number;
        isSelected: boolean;
        isDragging: boolean;
        title: string;
        children: Snippet;
        onSelect: (key: PositionKey, e: MouseEvent | TouchEvent) => void;
        onStartDrag: (e: MouseEvent | TouchEvent, key: PositionKey) => void;
        onResetPosition: (key: PositionKey, e: MouseEvent) => void;
    }

    let {
        itemKey,
        position,
        scale,
        isSelected,
        isDragging,
        title,
        children,
        onSelect,
        onStartDrag,
        onResetPosition
    }: Props = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
    class="absolute transition-all rounded p-0.5 select-none {isDragging ? 'ring-2 ring-sky-500 bg-sky-50/40 opacity-90 shadow-2xl z-50 !transition-none' : isSelected ? 'ring-2 ring-sky-500 bg-sky-50/20 shadow-md z-30' : 'hover:ring-1 hover:ring-sky-400 hover:bg-sky-50/10 cursor-pointer z-10'}"
    style="left: {position.x * scale}px; top: {position.y * scale}px; width: {position.w * scale}px; min-height: {position.h * scale}px;"
    onclick={(e) => onSelect(itemKey, e)}
    onmousedown={(e) => onStartDrag(e, itemKey)}
    ontouchstart={(e) => onStartDrag(e, itemKey)}
    {title}
>
    {@render children()}

    {#if isSelected || isDragging}
        <div class="absolute -top-7 left-0 z-50 flex items-center gap-1 bg-neutral-900/95 backdrop-blur-xs text-white rounded-lg p-0.5 shadow-xl border border-sky-500/40 pointer-events-auto">
            <div
                class="cursor-grab active:cursor-grabbing flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-[9px] font-bold select-none shadow-xs"
                onmousedown={(e) => onStartDrag(e, itemKey)}
                ontouchstart={(e) => onStartDrag(e, itemKey)}
                title="Klicken & gedrückt halten zum Verschieben"
            >
                <GripVertical class="w-2.5 h-2.5 shrink-0" />
                <span>Verschieben</span>
            </div>
            <span class="text-[8px] font-mono text-neutral-300 px-1 whitespace-nowrap hidden sm:inline">
                {position.x}, {position.y}
            </span>
            <button
                type="button"
                onclick={(e) => onResetPosition(itemKey, e)}
                class="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Auf Standard zurücksetzen"
            >
                <RotateCcw class="w-2.5 h-2.5" />
            </button>
        </div>
    {/if}
</div>
