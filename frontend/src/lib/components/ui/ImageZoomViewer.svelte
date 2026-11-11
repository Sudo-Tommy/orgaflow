<script lang="ts">
    interface Props {
        src: string;
        title?: string;
        isMobile?: boolean;
    }

    let { src, title = '', isMobile = false }: Props = $props();

    let imgContainer: HTMLDivElement | undefined = $state();
    let zoomX = $state(50);
    let zoomY = $state(50);
    let isZoomActive = $state(false);
    let currentScale = $state(1);
    let translateX = $state(0);
    let translateY = $state(0);
    let isDragging = $state(false);
    let isMouseDown = $state(false);
    let dragStartX = $state(0);
    let dragStartY = $state(0);
    let initTranslateX = $state(0);
    let initTranslateY = $state(0);
    let hasDragged = $state(false);

    export function reset() {
        isZoomActive = false;
        currentScale = 1;
        translateX = 0;
        translateY = 0;
        isMouseDown = false;
        isDragging = false;
    }

    function handleMouseDown(e: MouseEvent) {
        if (isMobile) return;
        e.preventDefault();
        isMouseDown = true;
        hasDragged = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        if (isZoomActive) {
            isDragging = true;
            initTranslateX = translateX;
            initTranslateY = translateY;
        }
    }

    function handleMouseMove(e: MouseEvent) {
        if (isMobile || !isMouseDown) return;
        e.preventDefault();
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasDragged = true;
        if (isDragging && hasDragged) {
            translateX = initTranslateX + dx;
            translateY = initTranslateY + dy;
        }
    }

    function handleMouseUp(e: MouseEvent) {
        if (isMobile) return;
        isMouseDown = false;
        if (isDragging) {
            isDragging = false;
            if (!hasDragged) reset();
        } else if (!isZoomActive && !hasDragged) {
            isZoomActive = true;
            currentScale = 2.5;
            translateX = 0;
            translateY = 0;
            if (imgContainer) {
                const rect = imgContainer.getBoundingClientRect();
                zoomX = ((e.clientX - rect.left) / rect.width) * 100;
                zoomY = ((e.clientY - rect.top) / rect.height) * 100;
            }
        }
    }

    function handleWheel(e: WheelEvent) {
        if (isMobile) return;
        e.preventDefault();
        if (!isZoomActive) {
            isZoomActive = true;
            translateX = 0;
            translateY = 0;
            if (imgContainer) {
                const rect = imgContainer.getBoundingClientRect();
                zoomX = ((e.clientX - rect.left) / rect.width) * 100;
                zoomY = ((e.clientY - rect.top) / rect.height) * 100;
            }
        }
        currentScale = Math.max(1, Math.min(currentScale + e.deltaY * -0.005, 10));
        if (currentScale === 1) reset();
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    bind:this={imgContainer}
    class="w-full h-full overflow-hidden flex items-center justify-center bg-slate-950 {isMobile ? '' : (isZoomActive ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in')}"
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onwheel={handleWheel}
    onmouseleave={() => { isMouseDown = false; isDragging = false; }}
>
    <!-- svelte-ignore a11y_missing_attribute -->
    <img 
        {src} 
        {title} 
        draggable="false" 
        class="w-full h-full pointer-events-none"
        style="object-fit: {isZoomActive ? 'cover' : 'contain'}; transition: transform {isDragging ? '0s' : '0.1s ease-out'}; transform: translate({translateX}px, {translateY}px) scale({currentScale}); transform-origin: {zoomX}% {zoomY}%;"
    />
</div>
