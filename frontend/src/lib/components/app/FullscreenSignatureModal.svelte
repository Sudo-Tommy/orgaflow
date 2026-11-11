<script lang="ts">
    import { activateSignatureSession } from '$lib/services/signatureLifecycle';
    import { Check, Trash2, X, PenTool } from 'lucide-svelte';

    let {
        title = "Unterschrift erfassen",
        signerName = "",
        isOpen = $bindable(false),
        onSave,
        onCancel
    }: {
        title?: string;
        signerName?: string;
        isOpen: boolean;
        onSave: (dataUrl: string) => void;
        onCancel?: () => void;
    } = $props();

    let canvas: HTMLCanvasElement | null = $state(null);
    let ctx: CanvasRenderingContext2D | null = null;
    let isDrawing = false;
    let hasSignature = $state(false);

    $effect(() => {
        if (!isOpen) return;

        return activateSignatureSession({
            onClose: () => closeModal()
        });
    });

    $effect(() => {
        if (isOpen && canvas) {
            initCanvas();
        }
    });

    function initCanvas() {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#0f172a';
        }
        hasSignature = false;
    }

    function getCoords(e: MouseEvent | TouchEvent) {
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDrawing(e: MouseEvent | TouchEvent) {
        e.preventDefault();
        isDrawing = true;
        const { x, y } = getCoords(e);
        ctx?.beginPath();
        ctx?.moveTo(x, y);
    }

    function draw(e: MouseEvent | TouchEvent) {
        if (!isDrawing || !ctx) return;
        e.preventDefault();
        const { x, y } = getCoords(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        hasSignature = true;
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function clear() {
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasSignature = false;
    }

    function handleSave() {
        if (!canvas || !hasSignature) return;
        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
        closeModal();
    }

    function closeModal() {
        isOpen = false;
        onCancel?.();
    }
</script>

{#if isOpen}
    <div 
        class="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex flex-col p-3 sm:p-6 select-none"
        data-modal-open="true"
        role="dialog"
    >
        <!-- Kopfzeile -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-700/50 text-white shrink-0">
            <div class="flex items-center gap-2">
                <PenTool class="w-5 h-5 text-indigo-400" />
                <h2 class="text-base sm:text-lg font-bold">{title}</h2>
                {#if signerName}
                    <span class="text-xs sm:text-sm text-slate-300 font-medium px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                        {signerName}
                    </span>
                {/if}
            </div>
            <button 
                type="button" 
                onclick={closeModal} 
                class="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition-all"
                aria-label="Schließen"
                data-action="close"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- Zeichenbereich mit seitlichen Aktionen -->
        <div class="flex-1 flex flex-col lg:flex-row gap-3 pt-3 min-h-0">
            <!-- Canvas Zeichenfläche -->
            <div class="flex-1 relative bg-white rounded-2xl shadow-inner border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center">
                <canvas
                    bind:this={canvas}
                    class="w-full h-full touch-none cursor-crosshair"
                    onmousedown={startDrawing}
                    onmousemove={draw}
                    onmouseup={stopDrawing}
                    onmouseleave={stopDrawing}
                    ontouchstart={startDrawing}
                    ontouchmove={draw}
                    ontouchend={stopDrawing}
                ></canvas>
                {#if !hasSignature}
                    <div class="absolute pointer-events-none text-slate-400 text-sm font-medium flex items-center gap-2">
                        <span>Hier mit dem Finger oder Stift unterschreiben</span>
                    </div>
                {/if}
            </div>

            <!-- Tastenleiste (im Querformat rechts, im Hochformat unten) -->
            <div class="flex lg:flex-col justify-end gap-2.5 shrink-0">
                <button
                    type="button"
                    onclick={clear}
                    disabled={!hasSignature}
                    class="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-sm active:scale-95 transition-all"
                >
                    <Trash2 class="w-4 h-4 text-rose-400" />
                    <span>Löschen</span>
                </button>

                <button
                    type="button"
                    onclick={handleSave}
                    disabled={!hasSignature}
                    class="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
                >
                    <Check class="w-4 h-4" />
                    <span>Bestätigen</span>
                </button>
            </div>
        </div>
    </div>
{/if}
