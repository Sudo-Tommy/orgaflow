<script lang="ts">
    import { onMount } from 'svelte';
    import { RotateCcw, PenTool } from 'lucide-svelte';

    let {
        signature = $bindable(''),
        hasSignature = $bindable(false)
    } = $props<{
        signature: string;
        hasSignature: boolean;
    }>();

    let canvas = $state<HTMLCanvasElement | null>(null);
    let ctx: CanvasRenderingContext2D | null = null;
    let isDrawing = false;

    onMount(() => {
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        const setup = () => {
            if (!canvas || !ctx) return;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            ctx.strokeStyle = '#1e1b4b';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
        };
        setup();
        window.addEventListener('resize', setup);
        return () => window.removeEventListener('resize', setup);
    });

    function getCoords(e: MouseEvent | TouchEvent) {
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e && e.touches.length > 0) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
    }

    function startDrawing(e: MouseEvent | TouchEvent) {
        if (e.cancelable && 'touches' in e) e.preventDefault();
        isDrawing = true;
        const { x, y } = getCoords(e);
        ctx?.beginPath();
        ctx?.moveTo(x, y);
    }

    function draw(e: MouseEvent | TouchEvent) {
        if (!isDrawing) return;
        if (e.cancelable && 'touches' in e) e.preventDefault();
        const { x, y } = getCoords(e);
        ctx?.lineTo(x, y);
        ctx?.stroke();
        hasSignature = true;
    }

    function stopDrawing() {
        if (isDrawing && canvas) {
            isDrawing = false;
            ctx?.closePath();
            signature = canvas.toDataURL('image/png');
        }
    }

    export function clear() {
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasSignature = false;
        signature = '';
    }
</script>

<div class="space-y-2">
    <div class="flex items-center justify-between">
        <label for="signature-canvas" class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <PenTool class="w-4 h-4 text-indigo-500" />
            <span>Digitale Unterschrift <span class="text-red-500">*</span></span>
        </label>
        <button 
            type="button" 
            onclick={clear}
            class="min-h-8 px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
        >
            <RotateCcw class="w-3 h-3" />
            <span>Löschen</span>
        </button>
    </div>

    <div class="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 overflow-hidden shadow-inner touch-none">
        <canvas 
            id="signature-canvas"
            bind:this={canvas}
            onmousedown={startDrawing}
            onmousemove={draw}
            onmouseup={stopDrawing}
            onmouseleave={stopDrawing}
            ontouchstart={startDrawing}
            ontouchmove={draw}
            ontouchend={stopDrawing}
            class="w-full h-36 rounded-xl cursor-crosshair bg-white"
        ></canvas>
    </div>
    <p class="text-[11px] text-slate-400 text-center">
        Unterschreibe hier bitte mit dem Finger (Smartphone/Tablet) oder der Maus.
    </p>
</div>

