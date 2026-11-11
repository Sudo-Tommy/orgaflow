<script lang="ts">
    import { onMount } from 'svelte';
    import PdfPreviewModal from '$lib/components/PdfPreviewModal.svelte';
    import {
        type Sheet,
        type ElementType,
        STORAGE_KEY,
        getDefaultSheets,
        createNewElement
    } from './flyer/flyerTypes';
    import {
        downloadFlyerPdf,
        openFlyerPreview,
        printFlyer
    } from './flyer/flyerPdfService';
    import FlyerToolbar from './flyer/FlyerToolbar.svelte';
    import FlyerCanvas from './flyer/FlyerCanvas.svelte';
    import FlyerPropertiesSidebar from './flyer/FlyerPropertiesSidebar.svelte';

    let { sheets = $bindable(getDefaultSheets()) }: { sheets?: Sheet[] } = $props();
    if (!sheets || sheets.length === 0) {
        sheets = getDefaultSheets();
    }
    let isLoaded = $state(false);

    let activeSheetIndex = $state(0);
    let selectedElementId = $state<string | null>(null);
    let isFullscreen = $state(false);
    let zoom = $state(0.7);
    let isDownloadingPdf = $state(false);
    let isLoadingPreview = $state(false);
    let flyerPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();

    let activeSheet = $derived(sheets?.[activeSheetIndex] || getDefaultSheets()[0]);
    let selectedElement = $derived(
        activeSheet?.elements?.find(e => e.id === selectedElementId) || null
    );

    onMount(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    sheets = parsed;
                }
            } catch (e) {
                console.error("Gespeicherter Flyer konnte nicht geladen werden.", e);
            }
        }
        if (!sheets || sheets.length === 0) {
            sheets = getDefaultSheets();
        }
        isLoaded = true;
    });

    $effect(() => {
        if (isLoaded && typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
        }
    });

    function addElement(type: ElementType) {
        const newEl = createNewElement(type);
        sheets[activeSheetIndex].elements.push(newEl);
        selectedElementId = newEl.id;
    }

    function handleUpdatePosition(id: string, x: number, y: number) {
        const el = sheets[activeSheetIndex].elements.find(e => e.id === id);
        if (el) {
            el.x = x;
            el.y = y;
        }
    }

    function handleDeleteElement() {
        if (!selectedElementId) return;
        const idx = sheets[activeSheetIndex].elements.findIndex(e => e.id === selectedElementId);
        if (idx !== -1) {
            sheets[activeSheetIndex].elements.splice(idx, 1);
            selectedElementId = null;
        }
    }

    function handleZIndexChange(delta: number) {
        if (selectedElement) {
            selectedElement.zIndex += delta;
        }
    }

    function resetToDefault() {
        if (confirm("Wirklich alles auf das Standard-Design zurücksetzen? Deine ungespeicherten Änderungen gehen dabei verloren!")) {
            sheets = getDefaultSheets();
            selectedElementId = null;
        }
    }

    async function handleDownload() {
        isDownloadingPdf = true;
        try {
            await downloadFlyerPdf(sheets);
        } finally {
            isDownloadingPdf = false;
        }
    }

    async function handlePreview() {
        isLoadingPreview = true;
        try {
            await openFlyerPreview(sheets, flyerPreviewModal);
        } finally {
            isLoadingPreview = false;
        }
    }
</script>

<style>
    @media print {
        :global(.flyer-print-sheet) {
            width: 297mm !important;
            height: 210mm !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
    }
</style>

<div id="print-root-layer" class="print:hidden flex overflow-hidden bg-neutral-200 dark:bg-slate-950 {isFullscreen ? 'fixed inset-0 z-9999' : 'relative w-full h-[850px] rounded-2xl shadow-inner'}">
    <!-- Linke Toolbar -->
    <FlyerToolbar
        {activeSheetIndex}
        {isFullscreen}
        {isLoadingPreview}
        {isDownloadingPdf}
        onAddElement={addElement}
        onSelectSheet={(idx) => { activeSheetIndex = idx; selectedElementId = null; }}
        onToggleFullscreen={() => isFullscreen = !isFullscreen}
        onOpenPreview={handlePreview}
        onDownloadPdf={handleDownload}
        onPrint={() => { selectedElementId = null; printFlyer(); }}
        onReset={resetToDefault}
    />

    <!-- Arbeitsfläche (Canvas) -->
    <FlyerCanvas
        {activeSheet}
        {activeSheetIndex}
        {selectedElementId}
        bind:zoom
        onSelectElement={(id) => selectedElementId = id}
        onUpdatePosition={handleUpdatePosition}
    />

    <!-- Rechte Sidebar für Eigenschaften -->
    {#if selectedElement}
        <FlyerPropertiesSidebar
            bind:element={selectedElement}
            onDelete={handleDeleteElement}
            onZIndexChange={handleZIndexChange}
        />
    {/if}
</div>

<!-- Spezielle Render-Ebene NUR für den Drucker -->
<div id="flyer-print-content" class="hidden print:block w-[297mm] mx-auto bg-white">
    {#each sheets as sheet}
        <div class="flyer-print-sheet" style="width: 297mm; height: 210mm; position: relative; overflow: hidden; page-break-after: always; break-after: page; background: white; margin: 0; padding: 0;">
            {#each sheet.elements as el}
                <div style="position: absolute; left: {el.x}mm; top: {el.y}mm; width: {el.w}mm; {el.h > 0 ? `height: ${el.h}mm;` : ''} font-size: {el.fontSize}pt; color: {el.color}; background-color: {el.bgColor}; text-align: {el.textAlign}; font-weight: {el.fontWeight}; border-radius: {el.borderRadius}mm; z-index: {el.zIndex}; padding: {el.padding || 0}mm; box-sizing: border-box; white-space: pre-wrap; word-break: break-word; line-height: 1.4; border: {el.borderWidth || 0}mm solid {el.borderColor || '#000000'};">
                    {#if el.type === 'image'}
                        <img src={el.content} alt="Flyer Druckgrafik" style="width: 100%; height: 100%; object-fit: contain;" />
                    {:else}
                        {el.content}
                    {/if}
                </div>
            {/each}
        </div>
    {/each}
</div>

<PdfPreviewModal bind:this={flyerPreviewModal} />