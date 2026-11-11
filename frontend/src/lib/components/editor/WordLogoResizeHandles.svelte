<script lang="ts">
    import { GripHorizontal } from "lucide-svelte";

    let {
        isResizing,
        currentHeight,
        onStartResize
    } = $props<{
        isResizing: boolean;
        currentHeight: number;
        onStartResize: (e: PointerEvent) => void;
    }>();
</script>

<!-- Bottom Centered Height Resize Handle -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    data-no-drag="true"
    class="absolute -bottom-2.5 left-1/2 -translate-x-1/2 h-5 px-6 cursor-ns-resize flex items-center justify-center group/h-resize z-30 touch-none select-none"
    onpointerdown={onStartResize}
    title="Rahmenhöhe durch Ziehen anpassen"
>
    <div class="h-2 w-14 rounded-full bg-violet-600 hover:bg-violet-700 shadow-md border-2 border-white dark:border-neutral-900 transition-transform group-hover/h-resize:scale-110 flex items-center justify-center text-white/80">
        <GripHorizontal class="w-3.5 h-3.5" />
    </div>
</div>

<!-- Live Height Badge during Drag -->
{#if isResizing}
    <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-md z-40 pointer-events-none animate-in fade-in">
        Höhe: {currentHeight}px
    </div>
{/if}
