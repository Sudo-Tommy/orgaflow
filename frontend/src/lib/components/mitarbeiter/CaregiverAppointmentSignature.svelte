<script lang="ts">
    import { onMount } from 'svelte';
    import { FileSignature, RotateCcw, Check } from 'lucide-svelte';
    import { trimSignatureCanvas } from '$lib/utils/signatureUtils';

    interface Props {
        signatureDataUrl: string;
        signerName: string;
        defaultSignerName?: string;
    }

    let { 
        signatureDataUrl = $bindable(''), 
        signerName = $bindable(''), 
        defaultSignerName = '' 
    }: Props = $props();

    let canvasEl: HTMLCanvasElement;
    let isDrawing = false;
    let hasDrawn = $state(false);

    onMount(() => {
        if (!signerName && defaultSignerName) {
            signerName = defaultSignerName;
        }
        setupCanvas();
    });

    function setupCanvas() {
        if (!canvasEl) return;
        const rect = canvasEl.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvasEl.width = rect.width * dpr;
        canvasEl.height = rect.height * dpr;
        const ctx = canvasEl.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    }

    function getCoords(e: MouseEvent | TouchEvent) {
        const rect = canvasEl.getBoundingClientRect();
        if ('touches' in e && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } else if ('clientX' in e) {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
        return { x: 0, y: 0 };
    }

    function startDrawing(e: MouseEvent | TouchEvent) {
        e.preventDefault();
        isDrawing = true;
        const ctx = canvasEl.getContext('2d');
        if (!ctx) return;
        const { x, y } = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function draw(e: MouseEvent | TouchEvent) {
        if (!isDrawing) return;
        e.preventDefault();
        const ctx = canvasEl.getContext('2d');
        if (!ctx) return;
        const { x, y } = getCoords(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        hasDrawn = true;
    }

    async function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;
        if (hasDrawn && canvasEl) {
            const trimmed = await trimSignatureCanvas(canvasEl);
            if (trimmed?.dataUrl) {
                signatureDataUrl = trimmed.dataUrl;
            }
        }
    }

    function clearSignature() {
        if (!canvasEl) return;
        const ctx = canvasEl.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        }
        hasDrawn = false;
        signatureDataUrl = '';
    }
</script>

<div class="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
    <div class="flex items-center justify-between">
        <label for="signer-name-input" class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileSignature class="w-4 h-4 text-indigo-500" />
            <span>Klienten-Unterschrift (Leistungsnachweis)</span>
        </label>
        {#if signatureDataUrl || hasDrawn}
            <button
                type="button"
                onclick={clearSignature}
                class="min-h-8 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
                <RotateCcw class="w-3.5 h-3.5" />
                <span>Löschen</span>
            </button>
        {/if}
    </div>

    <!-- Name des Unterzeichners -->
    <div class="space-y-1">
        <input 
            id="signer-name-input"
            type="text"
            bind:value={signerName}
            placeholder="Name der unterschreibenden Person (Klient / Angehöriger)..."
            class="w-full min-h-10 px-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
        />
    </div>

    <!-- Touch / Pen Canvas Pad (Landscape-Optimiert) -->
    <div class="relative bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden touch-none h-32 sm:h-36 landscape:h-28 sm:landscape:h-32">
        <canvas
            bind:this={canvasEl}
            onmousedown={startDrawing}
            onmousemove={draw}
            onmouseup={stopDrawing}
            onmouseleave={stopDrawing}
            ontouchstart={startDrawing}
            ontouchmove={draw}
            ontouchend={stopDrawing}
            class="w-full h-full cursor-crosshair block touch-none"
            style="touch-action: none;"
        ></canvas>

        {#if !hasDrawn && !signatureDataUrl}
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
                <span>Hier mit Finger oder Stift unterschreiben</span>
            </div>
        {/if}
    </div>
</div>
