<script lang="ts">
    let {
        columnIndex,
        tableElement,
        zoom = 1,
        onResize
    } = $props<{
        columnIndex: number;
        tableElement: HTMLElement | null;
        zoom?: number;
        onResize: (index: number, deltaPct: number) => void;
    }>();

    let isDragging = $state(false);
    let startX = $state(0);
    let tableWidth = $state(600);

    function startDrag(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();

        const target = e.currentTarget as HTMLElement;
        try { target.setPointerCapture(e.pointerId); } catch {}

        isDragging = true;
        startX = e.clientX;
        const currentZoom = zoom || 1;
        const rect = tableElement?.getBoundingClientRect();
        tableWidth = rect ? (rect.width / currentZoom) : (tableElement?.clientWidth || 600);

        function onPointerMove(ev: PointerEvent) {
            if (!isDragging) return;
            const screenDx = ev.clientX - startX;
            const internalDx = screenDx / currentZoom;
            const deltaPct = (internalDx / tableWidth) * 100;
            if (Math.abs(deltaPct) >= 0.2) {
                onResize(columnIndex, deltaPct);
                startX = ev.clientX;
            }
        }

        function onPointerUp(ev: PointerEvent) {
            isDragging = false;
            try { target.releasePointerCapture(ev.pointerId); } catch {}
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        }

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    class="absolute right-0 top-0 bottom-0 w-2.5 -mr-1.5 cursor-col-resize z-20 flex items-center justify-center group/colresize select-none touch-none"
    onpointerdown={startDrag}
    title="Spaltenbreite anpassen (Ziehen)"
>
    <div class="w-0.5 h-full bg-transparent group-hover/colresize:bg-violet-500 transition-colors {isDragging ? 'bg-violet-600 ring-2 ring-violet-400 w-1' : ''}"></div>
</div>
