<script lang="ts">
    import type { Sheet, FlyerElement } from './flyerTypes';

    interface Props {
        activeSheet: Sheet;
        activeSheetIndex: number;
        selectedElementId: string | null;
        zoom: number;
        onSelectElement: (id: string | null) => void;
        onUpdatePosition: (id: string, x: number, y: number) => void;
    }

    let {
        activeSheet,
        activeSheetIndex,
        selectedElementId,
        zoom = $bindable(0.7),
        onSelectElement,
        onUpdatePosition
    }: Props = $props();

    // Drag & Drop State
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initX = 0;
    let initY = 0;
    let draggingElementId: string | null = null;

    function handlePointerDown(e: PointerEvent, el: FlyerElement) {
        if (e.button !== 0) return;
        e.preventDefault();
        onSelectElement(el.id);
        isDragging = true;
        draggingElementId = el.id;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        initX = el.x;
        initY = el.y;
        (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
        e.stopPropagation();
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isDragging || !draggingElementId) return;
        const container = document.getElementById('flyer-sheet-interactive');
        if (!container) return;
        const mmToPx = container.getBoundingClientRect().width / 297;
        const dx = (e.clientX - dragStartX) / mmToPx;
        const dy = (e.clientY - dragStartY) / mmToPx;

        const newX = Math.round((initX + dx) * 10) / 10;
        const newY = Math.round((initY + dy) * 10) / 10;
        onUpdatePosition(draggingElementId, newX, newY);
    }

    function handlePointerUp(e: PointerEvent) {
        isDragging = false;
        draggingElementId = null;
        (e.currentTarget as HTMLElement)?.releasePointerCapture(e.pointerId);
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    class="flex-1 overflow-auto relative custom-scrollbar flex items-start justify-center p-10 no-print" 
    onclick={(e) => { if(e.target === e.currentTarget) onSelectElement(null); }}
>
    <!-- Skalierungs-Wrapper -->
    <div class="relative shadow-2xl bg-white" style="width: {297 * 3.78 * zoom}px; height: {210 * 3.78 * zoom}px;">
        <!-- Das echte Sheet -->
        <div 
            id="flyer-sheet-interactive"
            class="absolute top-0 left-0 bg-white origin-top-left overflow-hidden"
            style="width: 297mm; height: 210mm; transform: scale({zoom});"
        >
            <!-- Falzmarkierungen -->
            {#if activeSheetIndex === 0}
                <div class="absolute left-[97mm] top-0 bottom-0 w-px border-l border-dashed border-neutral-300 z-0 opacity-50 pointer-events-none"></div>
                <div class="absolute left-[197mm] top-0 bottom-0 w-px border-l border-dashed border-neutral-300 z-0 opacity-50 pointer-events-none"></div>
            {:else}
                <div class="absolute left-[100mm] top-0 bottom-0 w-px border-l border-dashed border-neutral-300 z-0 opacity-50 pointer-events-none"></div>
                <div class="absolute left-[200mm] top-0 bottom-0 w-px border-l border-dashed border-neutral-300 z-0 opacity-50 pointer-events-none"></div>
            {/if}

            <!-- Die Elemente auf dem Bogen -->
            {#each activeSheet.elements as el (el.id)}
                <div 
                    role="button"
                    tabindex="0"
                    aria-label="Flyer Element {el.type}"
                    class="absolute cursor-move touch-manipulation {selectedElementId === el.id ? 'ring-2 ring-indigo-500 shadow-xl' : 'hover:ring-1 hover:ring-indigo-300'}"
                    style="
                        left: {el.x}mm; top: {el.y}mm; width: {el.w}mm; 
                        {el.h > 0 ? `height: ${el.h}mm;` : ''}
                        font-size: {el.fontSize}pt; color: {el.color}; background-color: {el.bgColor};
                        text-align: {el.textAlign}; font-weight: {el.fontWeight};
                        border-radius: {el.borderRadius}mm; z-index: {el.zIndex};
                        padding: {el.padding || 0}mm; box-sizing: border-box;
                        white-space: pre-wrap; word-break: break-word; overflow: hidden;
                        line-height: 1.4; border: {el.borderWidth || 0}mm solid {el.borderColor || '#000000'};
                    "
                    onpointerdown={(e) => handlePointerDown(e, el)}
                    onpointermove={handlePointerMove}
                    onpointerup={handlePointerUp}
                    onpointercancel={handlePointerUp}
                    onkeydown={(e) => { if (e.key === 'Enter') onSelectElement(el.id); }}
                >
                    {#if el.type === 'image'}
                        <img src={el.content} alt="Flyer Element Grafik" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />
                    {:else}
                        {el.content}
                    {/if}
                </div>
            {/each}
        </div>
    </div>
    
    <!-- Zoom Control schwebend unten in der Mitte -->
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-neutral-200 dark:border-slate-700 px-4 py-2 rounded-full shadow-lg flex items-center gap-4 z-30">
        <span class="text-xs font-bold text-neutral-500 dark:text-slate-400">Zoom</span>
        <input 
            type="range" 
            min="0.3" 
            max="1.5" 
            step="0.1" 
            bind:value={zoom} 
            class="w-32 accent-indigo-600 cursor-pointer min-h-[36px]" 
        />
        <span class="text-xs font-bold text-neutral-700 dark:text-slate-200 w-8 text-right">{Math.round(zoom * 100)}%</span>
    </div>
</div>
