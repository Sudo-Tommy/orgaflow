<script lang="ts">
    import { X, Check, RotateCcw, PenTool, Smartphone } from "lucide-svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { trimSignatureCanvas, scaleCanvasContent } from "$lib/utils/signatureUtils";

    interface Props {
        isOpen: boolean;
        initialImageDataUrl?: string;
        onClose: () => void;
        onApply: (blob: Blob | null, dataUrl: string) => void;
    }

    let { isOpen, initialImageDataUrl = "", onClose, onApply }: Props = $props();

    let dialogEl = $state<HTMLDialogElement | null>(null);
    let canvasEl = $state<HTMLCanvasElement | null>(null);
    let isDrawing = false;
    let hasDrawn = $state(false);
    let isSaving = $state(false);
    let isShakeEmpty = $state(false);
    let lastPoint = { x: 0, y: 0 };

    function getCanvasCoords(e: PointerEvent): { x: number; y: number } {
        if (!canvasEl) return { x: 0, y: 0 };
        const rect = canvasEl.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvasEl.width / (rect.width || 1)),
            y: (e.clientY - rect.top) * (canvasEl.height / (rect.height || 1))
        };
    }

    function handlePointerDown(e: PointerEvent) {
        if (!canvasEl || e.button !== 0) return;
        (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
        isDrawing = true;
        hasDrawn = true;
        isShakeEmpty = false;
        lastPoint = getCanvasCoords(e);
        const ctx = canvasEl.getContext("2d");
        if (ctx) {
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = "#0f172a";
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(lastPoint.x, lastPoint.y);
            ctx.stroke();
        }
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isDrawing || !canvasEl) return;
        const ctx = canvasEl.getContext("2d");
        if (!ctx) return;
        const currentPoint = getCanvasCoords(e);
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.stroke();
        lastPoint = currentPoint;
    }

    function handlePointerUp(e: PointerEvent) {
        if (!isDrawing) return;
        isDrawing = false;
        try { (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId); } catch {}
    }

    function clearCanvas() {
        if (!canvasEl) return;
        const ctx = canvasEl.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        hasDrawn = false;
        isShakeEmpty = false;
    }

    function syncCanvasDimensions(preserveDrawing = true) {
        if (!canvasEl) return;
        const rect = canvasEl.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        let tempCanvas: HTMLCanvasElement | null = null;
        if (preserveDrawing && hasDrawn) {
            tempCanvas = document.createElement("canvas");
            tempCanvas.width = canvasEl.width;
            tempCanvas.height = canvasEl.height;
            scaleCanvasContent(canvasEl, tempCanvas);
        }

        const dpr = typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1;
        canvasEl.width = Math.floor(rect.width * dpr);
        canvasEl.height = Math.floor(rect.height * dpr);

        const ctx = canvasEl.getContext("2d");
        if (ctx) {
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#0f172a";
            if (tempCanvas && hasDrawn) {
                scaleCanvasContent(tempCanvas, canvasEl);
            } else if (initialImageDataUrl && !hasDrawn) {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvasEl!.width, canvasEl!.height);
                    hasDrawn = true;
                };
                img.src = initialImageDataUrl;
            }
        }
    }

    $effect(() => {
        if (isOpen) {
            if (dialogEl && !dialogEl.open) dialogEl.showModal();
            setTimeout(() => syncCanvasDimensions(false), 50);
        } else if (dialogEl?.open) {
            dialogEl.close();
        }
    });

    async function handleApply() {
        if (!canvasEl || !hasDrawn) {
            isShakeEmpty = true;
            toastStore.warning("Bitte leisten Sie zuerst eine Unterschrift auf der Linie.");
            setTimeout(() => { isShakeEmpty = false; }, 800);
            return;
        }

        isSaving = true;
        try {
            const trimmed = await trimSignatureCanvas(canvasEl);
            if (!trimmed || !trimmed.blob) {
                toastStore.warning("Keine sichtbare Unterschrift erkannt.");
                return;
            }
            onApply(trimmed.blob, trimmed.dataUrl);
            onClose();
        } catch {
            toastStore.error("Fehler beim Verarbeiten der Unterschrift.");
        } finally {
            isSaving = false;
        }
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            e.preventDefault();
            onClose();
        }
    }
</script>

<svelte:window onresize={() => syncCanvasDimensions(true)} />

<dialog
    bind:this={dialogEl}
    onkeydown={handleKeyDown}
    class="zero-inner-scroll-modal w-full max-w-3xl mx-auto my-auto p-3.5 sm:p-5 bg-slate-950/95 backdrop:bg-slate-950/85 backdrop-blur-md text-white border border-slate-800 rounded-3xl shadow-2xl z-[99999] flex flex-col justify-between select-none"
    data-hide-feedback="true"
    aria-label="Unterschrift erfassen"
>
    <!-- Modal Header -->
    <div class="flex items-center justify-between gap-2 pb-2 sm:pb-3 border-b border-slate-800 shrink-0 text-white">
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <span class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600/25 text-indigo-400 border border-indigo-500/40 flex items-center justify-center text-sm sm:text-base shrink-0">✍️</span>
            <div class="min-w-0 flex-1">
                <h3 class="text-xs sm:text-sm md:text-base font-bold text-slate-100 truncate">Unterschrift erfassen</h3>
                <p class="text-[11px] text-slate-400 hidden sm:block truncate">Bitte mit Stift oder Finger auf der Linie unterschreiben</p>
            </div>
        </div>

        <!-- Desktop & Mobile Querformat Controls -->
        <div class="hidden sm:flex landscape:flex items-center gap-2 shrink-0">
            <button type="button" onclick={clearCanvas} class="min-h-[38px] sm:min-h-[44px] px-3 sm:px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer">
                <RotateCcw class="w-3.5 h-3.5" />
                <span>Leeren</span>
            </button>
            <button type="button" onclick={onClose} class="min-h-[38px] sm:min-h-[44px] px-3 sm:px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer">
                <X class="w-3.5 h-3.5" />
                <span>Abbrechen</span>
            </button>
            <button type="button" onclick={handleApply} disabled={isSaving} class="min-h-[38px] sm:min-h-[44px] px-4 sm:px-5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                <Check class="w-4 h-4" />
                <span>{isSaving ? 'Speichern...' : 'Übernehmen'}</span>
            </button>
        </div>

        <!-- Nur Mobile Portrait: Schließen-Button oben rechts -->
        <div class="sm:hidden landscape:hidden flex items-center shrink-0">
            <button type="button" onclick={onClose} class="min-h-[40px] min-w-[40px] p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 flex items-center justify-center cursor-pointer" aria-label="Abbrechen">
                <X class="w-5 h-5" />
            </button>
        </div>
    </div>

    <!-- Canvas Zeichenfläche -->
    <div class="flex-1 min-h-0 py-2 sm:py-3 flex flex-col items-center justify-center relative w-full">
        <div class="w-full max-w-3xl h-52 sm:h-64 landscape:h-44 bg-white rounded-2xl border-2 {isShakeEmpty ? 'border-amber-500 ring-4 ring-amber-500/20' : 'border-slate-700'} shadow-2xl relative overflow-hidden flex items-center justify-center touch-none select-none">
            <canvas 
                bind:this={canvasEl}
                class="w-full h-full cursor-crosshair touch-none select-none block"
                style="touch-action: none;"
                onpointerdown={handlePointerDown}
                onpointermove={handlePointerMove}
                onpointerup={handlePointerUp}
                onpointercancel={handlePointerUp}
            ></canvas>

            <!-- Hilfslinie zur Orientierung -->
            <div class="absolute bottom-3 sm:bottom-10 landscape:bottom-4 left-4 sm:left-10 landscape:left-6 right-4 sm:right-10 landscape:right-6 border-b-2 border-dashed border-slate-300 pointer-events-none flex justify-between text-[10px] sm:text-xs text-slate-400 font-medium px-1 select-none">
                <span>Unterschrift des Klienten / Vertreters</span>
                <span>X ________________________</span>
            </div>

            {#if !hasDrawn}
                <div class="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 gap-1.5 select-none">
                    <PenTool class="w-8 h-8 sm:w-10 sm:h-10 opacity-30 text-slate-600" />
                    <span class="font-bold text-xs sm:text-sm opacity-60">Hier mit Stift oder Finger unterschreiben</span>
                </div>
            {/if}
        </div>
    </div>

    <!-- Nur Mobile Hochformat (Portrait): Aktionsleiste unten -->
    <div class="sm:hidden landscape:hidden flex flex-col gap-1.5 shrink-0 pt-1">
        <div class="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
            <Smartphone class="w-3.5 h-3.5 text-indigo-400 rotate-90" />
            <span>Tipp: Smartphone für maximale Zeichenfläche ins Querformat drehen</span>
        </div>
        <div class="flex items-center gap-2">
            <button type="button" onclick={clearCanvas} class="min-h-[48px] px-4 py-2 bg-slate-800 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                <RotateCcw class="w-4 h-4" />
                <span>Leeren</span>
            </button>
            <button type="button" onclick={handleApply} disabled={isSaving} class="flex-1 min-h-[48px] px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                <Check class="w-5 h-5" />
                <span>{isSaving ? 'Speichern...' : 'Übernehmen'}</span>
            </button>
        </div>
    </div>
</dialog>
