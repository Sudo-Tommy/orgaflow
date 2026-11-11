<script lang="ts">
    import type { CanvasField } from "$lib/services/editorService.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { formatContent } from "./editorFieldMappings";
    import { 
        calculateShapeOutside, 
        calculateBackgroundSegments, 
        calculateMove, 
        calculateResize 
    } from "./editorFieldGeometry";
    import EditorTableField from "./EditorTableField.svelte";

    let { field = $bindable(), allFields = [], isSelected, onSelect, isHeaderFooter = false, marginTop = 250, marginBottom = 150, zoomScale = 1 } = $props<{
        field: CanvasField;
        allFields: CanvasField[];
        isSelected: boolean;
        onSelect: () => void;
        isHeaderFooter?: boolean;
        marginTop?: number;
        marginBottom?: number;
        zoomScale?: number;
    }>();

    let userCompany = $derived.by(() => {
        const user = pb.authStore.model;
        let cId = user?.company;
        if (Array.isArray(cId)) cId = cId[0];
        if (cId) return orgaStore.company?.data?.find((c: any) => c.id === cId);
        return orgaStore.company?.data?.[0];
    });

    let isDragging = false;
    let isResizing = false;
    let startX = 0; 
    let startY = 0;
    let initialFieldX = 0; 
    let initialFieldY = 0;
    let initialFieldW = 0; 
    let initialFieldH = 0;
    
    let snapLineX = $state<number | null>(null);
    let snapLineY = $state<number | null>(null);
    
    let textSpan: HTMLElement | null = $state(null);
    let contentContainer: HTMLDivElement | null = $state(null);
    let elementHeight = $state(0);

    $effect(() => {
        if (field.type === 'text' && field.style.dynamicHeight && textSpan && contentContainer) {
            const containerRect = contentContainer.getBoundingClientRect();
            const textRect = textSpan.getBoundingClientRect();
            const actualHeight = textRect.bottom - containerRect.top + (field.style.padding || 0);
            if (actualHeight > 0 && Math.abs(field.h - actualHeight) > 2) {
                field.h = actualHeight;
            }
        } else if (elementHeight > 0 && field.type === 'table') {
            if (Math.abs(field.h - elementHeight) > 2) {
                field.h = elementHeight;
            }
        }
    });

    let shapeOutside = $derived(calculateShapeOutside(field, marginBottom, marginTop));
    let backgroundSegments = $derived(calculateBackgroundSegments(field, marginBottom, marginTop));

    function applyMove(dx: number, dy: number) {
        const res = calculateMove(dx, dy, initialFieldX, initialFieldY, field, allFields);
        field.x = res.x;
        field.y = res.y;
        snapLineX = res.snapLineX;
        snapLineY = res.snapLineY;
    }

    function applyResize(dx: number, dy: number) {
        const res = calculateResize(dx, dy, initialFieldW, initialFieldH, field, allFields);
        field.w = res.w;
        field.h = res.h;
        snapLineX = res.snapLineX;
        snapLineY = res.snapLineY;
    }

    function startDrag(e: PointerEvent) {
        if ((e.target as HTMLElement)?.getAttribute('contenteditable') === 'true') return;
        e.stopPropagation();
        onSelect();
        isDragging = true;
        startX = e.clientX; 
        startY = e.clientY;
        initialFieldX = field.x; 
        initialFieldY = field.y;
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    }

    function onDrag(e: PointerEvent) {
        if (!isDragging) return;
        const scale = zoomScale || 1;
        applyMove((e.clientX - startX) / scale, (e.clientY - startY) / scale);
    }

    function stopDrag(e: PointerEvent) {
        if (isDragging) {
            try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
            isDragging = false;
            snapLineX = null; 
            snapLineY = null;
        }
    }

    function startResize(e: PointerEvent) {
        e.stopPropagation();
        onSelect();
        isResizing = true;
        startX = e.clientX; 
        startY = e.clientY;
        initialFieldW = field.w; 
        initialFieldH = field.h;
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    }

    function onResize(e: PointerEvent) {
        if (!isResizing) return;
        const scale = zoomScale || 1;
        applyResize((e.clientX - startX) / scale, (e.clientY - startY) / scale);
    }

    function stopResize(e: PointerEvent) {
        if (isResizing) {
            try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
            isResizing = false;
            snapLineX = null; 
            snapLineY = null;
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    class="absolute group {isSelected ? '' : 'select-none'}"
    style="cursor: {isSelected ? 'default' : 'move'}; left: {field.x}px; top: {field.y}px; width: {field.w}px; height: {field.type === 'table' || field.style.dynamicHeight ? 'auto' : field.h + 'px'}; min-height: {field.type === 'table' || field.style.dynamicHeight ? '50px' : field.h + 'px'}; z-index: {isSelected ? 40 : (isHeaderFooter ? 30 : 10)}; touch-action: manipulation;"
    onpointerdown={startDrag}
    onpointermove={onDrag}
    onpointerup={stopDrag}
    onpointercancel={stopDrag}
>
    <!-- Visual background and selection ring -->
    {#each backgroundSegments as segment}
        <div class="absolute inset-x-0 pointer-events-none transition-shadow {isSelected ? 'ring-2 ring-brand-500 shadow-lg' : 'ring-1 ring-neutral-200/50 group-hover:ring-brand-300'}" style="top: {segment.top}px; height: {segment.height}px; background-color: {field.style.backgroundColor};"></div>
    {/each}

    <!-- Snapping Hilfslinien -->
    {#if snapLineX !== null}
        <div class="absolute bg-brand-500/40 pointer-events-none z-0" style="left: {snapLineX - field.x}px; top: -2000px; bottom: -2000px; width: 1px;"></div>
    {/if}
    {#if snapLineY !== null}
        <div class="absolute bg-brand-500/40 pointer-events-none z-0" style="top: {snapLineY - field.y}px; left: -2000px; right: -2000px; height: 1px;"></div>
    {/if}

    <!-- Rendering des Inhalts -->
    <div bind:this={contentContainer} class="relative w-full {field.type === 'table' || field.style.dynamicHeight ? 'h-auto overflow-visible block' : 'h-full overflow-hidden flex flex-col'}" style="color: {field.style.color}; font-size: {field.style.fontSize}px; font-weight: {field.style.fontWeight}; text-align: {field.style.textAlign}; padding: {field.style.padding}px; justify-content: {field.style.verticalAlign === 'middle' ? 'center' : field.style.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start'};">
        {#if field.type === 'text'}
            {#if field.style.dynamicHeight && shapeOutside}
                <div style="float: left; width: 100%; height: {field.h + 2000}px; shape-outside: {shapeOutside}; pointer-events: none; opacity: 0;"></div>
            {/if}
            {#if isSelected}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                    bind:this={textSpan}
                    contenteditable="true"
                    bind:innerHTML={field.content}
                    class="outline-none whitespace-pre-wrap w-full cursor-text"
                    style="min-height: 1em;"
                    onpointerdown={(e) => e.stopPropagation()}
                ></div>
            {:else}
                <div 
                    bind:this={textSpan}
                    class="whitespace-pre-wrap w-full cursor-move"
                    style="min-height: 1em;"
                >{@html formatContent(field.content)}</div>
            {/if}
        {:else if field.type === 'logo'}
            {#if userCompany?.logo}
                <div class="w-full h-full flex items-center justify-center bg-transparent">
                    <img src={pb.files.getURL(userCompany, userCompany.logo)} class="max-w-full max-h-full object-contain" alt="Logo" crossorigin="anonymous" />
                </div>
            {:else}
                <div class="w-full h-full border-2 border-dashed border-neutral-300 flex items-center justify-center bg-neutral-50/50 text-neutral-400 font-bold tracking-widest uppercase text-sm">
                    Firmenlogo Platzhalter
                </div>
            {/if}
        {:else if field.type === 'table'}
            <EditorTableField bind:field bind:elementHeight />
        {/if}
    </div>

    <!-- Resize Handle -->
    {#if isSelected}
        <div 
            class="absolute w-6 h-6 sm:w-4 sm:h-4 bg-brand-600 border-2 border-white rounded-full cursor-se-resize shadow-lg z-50 flex items-center justify-center -bottom-3 -right-3 sm:-bottom-2 sm:-right-2 touch-none select-none active:scale-110"
            onpointerdown={startResize}
            onpointermove={onResize}
            onpointerup={stopResize}
            onpointercancel={stopResize}
            title="Größe anpassen"
            role="button"
            tabindex="0"
        ></div>
    {/if}

    <!-- Move Handle -->
    {#if isSelected}
        <div 
            class="absolute w-8 h-8 sm:w-6 sm:h-6 bg-white border-2 border-brand-500 rounded-lg text-brand-600 cursor-move shadow-lg z-50 flex items-center justify-center hover:bg-brand-50 transition-colors -top-4 -left-4 sm:-top-3 sm:-left-3 touch-none select-none active:scale-110" 
            onpointerdown={startDrag}
            onpointermove={onDrag}
            onpointerup={stopDrag}
            onpointercancel={stopDrag}
            title="Element verschieben"
            role="button"
            tabindex="0"
        >
            <svg class="w-4 h-4 sm:w-3.5 sm:h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
        </div>
    {/if}
</div>