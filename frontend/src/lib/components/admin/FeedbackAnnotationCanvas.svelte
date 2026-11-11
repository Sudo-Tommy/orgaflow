<script lang="ts">
    import { tick } from 'svelte';
    import { Camera, RefreshCw, Trash2, ArrowUpRight, Crosshair, ArrowRight } from 'lucide-svelte';
    import { drawAnnotations, isMobileDevice, type AnnotationItem } from '$lib/services/feedbackCaptureService';

    export type Arrow = AnnotationItem;

    interface Props {
        screenshotImg: HTMLImageElement | null;
        isCapturing: boolean;
        arrows: Arrow[];
        annotationMode?: 'point' | 'arrow';
        activeColor?: string;
        isMobileView?: boolean;
        onTakeRealScreenshot: () => void;
        onImageChanged?: (img: HTMLImageElement) => void;
        onArrowsChanged: (arrows: Arrow[]) => void;
        onNextStep?: () => void;
    }

    let {
        screenshotImg,
        isCapturing,
        arrows = $bindable([]),
        activeColor = $bindable('#ef4444'),
        isMobileView = false,
        onTakeRealScreenshot,
        onArrowsChanged,
        onNextStep
    }: Props = $props();

    let canvasEl = $state<HTMLCanvasElement | null>(null);
    let isDrawing = $state(false);
    let currentArrow = $state<Partial<Arrow> | null>(null);
    let arrowInputs = $state<Record<string, HTMLInputElement | null>>({});

    const effectiveMode = $derived<'point' | 'arrow'>(
        isMobileView || isMobileDevice() ? 'point' : 'arrow'
    );
    const ARROW_COLORS = ['#ef4444', '#f97316', '#eab308', '#10b981', '#3b82f6', '#8b5cf6'];

    export function renderCanvas() {
        if (!canvasEl || !screenshotImg) return;
        const ctx = canvasEl.getContext('2d');
        if (!ctx) return;
        canvasEl.width = screenshotImg.width;
        canvasEl.height = screenshotImg.height;
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        ctx.drawImage(screenshotImg, 0, 0);

        const all = [...arrows];
        if (currentArrow && currentArrow.x1 !== undefined && currentArrow.x2 !== undefined) {
            all.push(currentArrow as Arrow);
        }
        drawAnnotations(ctx, all);
    }

    export function getBlob(): Promise<Blob | null> {
        if (!canvasEl) return Promise.resolve(null);
        renderCanvas();
        return new Promise(resolve => canvasEl!.toBlob(resolve, 'image/png'));
    }

    $effect(() => {
        if (screenshotImg || arrows.length || currentArrow) renderCanvas();
    });

    function getCoords(e: MouseEvent | TouchEvent) {
        if (!canvasEl) return { x: 0, y: 0 };
        const rect = canvasEl.getBoundingClientRect();
        const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return {
            x: (cx - rect.left) * (canvasEl.width / rect.width),
            y: (cy - rect.top) * (canvasEl.height / rect.height)
        };
    }

    function handleStart(e: MouseEvent | TouchEvent) {
        if (!screenshotImg) return;
        isDrawing = true;
        const pt = getCoords(e);
        currentArrow = {
            id: 'arr_' + Date.now(),
            x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y,
            text: '', color: activeColor, type: effectiveMode
        };
    }

    function handleMove(e: MouseEvent | TouchEvent) {
        if (!isDrawing || !currentArrow) return;
        const pt = getCoords(e);
        if (effectiveMode === 'arrow') {
            currentArrow.x2 = pt.x;
            currentArrow.y2 = pt.y;
        }
        renderCanvas();
    }

    function handleEnd(e: MouseEvent | TouchEvent) {
        if (!isDrawing || !currentArrow) return;
        isDrawing = false;
        const pt = getCoords(e);
        let [x1, y1, x2, y2] = [currentArrow.x1 ?? 0, currentArrow.y1 ?? 0, currentArrow.x2 ?? 0, currentArrow.y2 ?? 0];

        if (effectiveMode === 'point') {
            x2 = x1; y2 = y1;
        } else if (Math.hypot(pt.x - x1, pt.y - y1) < 8) {
            x1 = pt.x - 36; y1 = pt.y - 36; x2 = pt.x; y2 = pt.y;
        } else {
            x2 = pt.x; y2 = pt.y;
        }

        const newArr: Arrow = {
            id: currentArrow.id || 'arr_' + Date.now(),
            x1, y1, x2, y2, text: '', color: activeColor, type: effectiveMode
        };
        arrows = [...arrows, newArr];
        onArrowsChanged(arrows);
        currentArrow = null;
        renderCanvas();
        tick().then(() => arrowInputs[newArr.id]?.focus());
    }

    function removeArrow(id: string) {
        arrows = arrows.filter(a => a.id !== id);
        onArrowsChanged(arrows);
        renderCanvas();
    }
</script>

<div class="flex flex-col h-full space-y-2.5">
    <!-- Toolbar: Auto-Modus (PC: Pfeil, Mobil: Punkt), Farbpalette & Neuer Screenshot -->
    <div class="flex items-center justify-between gap-1.5 p-1.5 sm:p-2 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto">
        <div class="flex items-center gap-2 shrink-0">
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs">
                {#if effectiveMode === 'arrow'}
                    <ArrowUpRight class="w-3.5 h-3.5 text-indigo-500" />
                    <span>Pfeil</span>
                {:else}
                    <Crosshair class="w-3.5 h-3.5 text-indigo-500" />
                    <span>Punkt</span>
                {/if}
            </div>
            <div class="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800">
                {#each ARROW_COLORS as c}
                    <button
                        type="button"
                        onclick={() => (activeColor = c)}
                        aria-label={`Farbe auswählen: ${c}`}
                        class="w-6 h-6 rounded-full transition-transform cursor-pointer shrink-0 {activeColor === c ? 'scale-115 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : 'hover:scale-110'}"
                        style="background-color: {c};"
                    ></button>
                {/each}
            </div>
        </div>
        <button
            type="button"
            onclick={onTakeRealScreenshot}
            class="min-h-[36px] px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            title="Aktuellen Bildschirm erneut aufnehmen"
        >
            <Camera class="w-3.5 h-3.5 text-amber-300" />
            <span class="hidden sm:inline">Neuer Screenshot</span>
        </button>
    </div>

    <!-- Canvas Preview Area -->
    <div class="flex-1 relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center min-h-[220px] sm:min-h-[320px] landscape:min-h-[160px] landscape:max-h-[50vh]">
        {#if isCapturing}
            <div class="flex flex-col items-center gap-3 text-slate-400 animate-pulse">
                <RefreshCw class="w-8 h-8 animate-spin text-indigo-500" />
                <span class="text-xs font-bold">Screenshot wird erfasst...</span>
            </div>
        {:else if screenshotImg}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <canvas
                bind:this={canvasEl}
                onmousedown={handleStart}
                onmousemove={handleMove}
                onmouseup={handleEnd}
                ontouchstart={handleStart}
                ontouchmove={handleMove}
                ontouchend={handleEnd}
                class="w-full h-full object-contain cursor-crosshair select-none touch-none"
            ></canvas>
        {:else}
            <div class="text-center p-4 text-slate-500 space-y-2">
                <Camera class="w-8 h-8 mx-auto opacity-40" />
                <p class="text-xs font-medium text-slate-400">Kein Screenshot geladen.</p>
                <p class="text-[11px] text-slate-500">Drücke <kbd class="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Strg + V</kbd> zum Einfügen aus der Zwischenablage.</p>
            </div>
        {/if}
    </div>

    <!-- Arrow Note Badges (Nummeriert synchron zu den Ziffern auf dem Screenshot) -->
    {#if arrows.length > 0}
        <div class="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar p-0.5">
            {#each arrows as arr, idx}
                <div class="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs">
                    <span class="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black text-white shadow-xs" style="background-color: {arr.color}">
                        {idx + 1}
                    </span>
                    <input
                        type="text"
                        bind:this={arrowInputs[arr.id]}
                        bind:value={arr.text}
                        placeholder="Hinweis zu Fehler #{idx + 1} (optional)..."
                        class="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none placeholder-slate-400"
                    />
                    <button
                        type="button"
                        onclick={() => removeArrow(arr.id)}
                        class="p-1 text-slate-400 hover:text-rose-500 cursor-pointer rounded"
                        title="Markierung entfernen"
                    >
                        <Trash2 class="w-3.5 h-3.5" />
                    </button>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Mobile Weiter Button -->
    {#if isMobileView && onNextStep}
        <div class="pt-1">
            <button
                type="button"
                onclick={onNextStep}
                class="w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-98"
            >
                <span>Weiter zur Beschreibung</span>
                <ArrowRight class="w-4 h-4" />
            </button>
        </div>
    {/if}
</div>
