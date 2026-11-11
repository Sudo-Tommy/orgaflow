<!-- src/lib/components/clients/InlineSignaturePicker.svelte -->
<script lang="ts">
    import { getPointerPos, drawStroke } from "$lib/utils/signatureCanvasHelper";
    import { PenTool, Upload, Trash2, X, Check } from "lucide-svelte";
    import { toastStore } from "$lib/services/toastService.svelte";

    interface Props {
        value?: string;
        label: string;
        helperText?: string;
        disabled?: boolean;
    }

    let {
        value = $bindable(""),
        label,
        helperText = "Wird für Dokumente aus den Vorlagen verwendet",
        disabled = false
    }: Props = $props();

    let dialog = $state<HTMLDialogElement>();
    let canvas = $state<HTMLCanvasElement>();
    let isDrawing = false;
    let hasDrawn = $state(false);
    let lastPos = { x: 0, y: 0 };
    let fileInput = $state<HTMLInputElement>();

    function openPad() {
        if (disabled) return;
        hasDrawn = false;
        dialog?.showModal();
        setTimeout(initCanvas, 60);
    }

    function closePad() {
        dialog?.close();
    }

    function initCanvas() {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        canvas.width = Math.max(500, Math.floor(rect.width * dpr));
        canvas.height = Math.max(180, Math.floor(rect.height * dpr));
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasDrawn = false;
    }

    function onPointerDown(e: PointerEvent) {
        if (!canvas) return;
        e.preventDefault();
        try { (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId); } catch (_) {}
        isDrawing = true;
        hasDrawn = true;
        lastPos = getPointerPos(e, canvas);
    }

    function onPointerMove(e: PointerEvent) {
        if (!isDrawing || !canvas) return;
        e.preventDefault();
        const currentPos = getPointerPos(e, canvas);
        const ctx = canvas.getContext("2d");
        if (ctx) drawStroke(ctx, lastPos, currentPos, "#4f46e5", 4);
        lastPos = currentPos;
    }

    function onPointerUp(e: PointerEvent) {
        if (!isDrawing) return;
        try { (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId); } catch (_) {}
        isDrawing = false;
    }

    function clearCanvas() {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasDrawn = false;
    }

    function applySignature() {
        if (!canvas || !hasDrawn) return;
        value = canvas.toDataURL("image/png");
        closePad();
        toastStore.success(`Unterschrift für ${label} übernommen.`);
    }

    function handleFile(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            value = reader.result as string;
            toastStore.success(`Unterschrift-Datei für ${label} geladen.`);
        };
        reader.readAsDataURL(file);
    }
</script>

<div class="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
            <span class="block text-xs font-bold text-slate-800 dark:text-slate-200">{label}</span>
            <span class="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</span>
        </div>
        {#if value}
            <div class="flex items-center gap-2 self-start sm:self-auto">
                <img src={value} alt="Unterschrift" class="h-10 max-w-[140px] bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 object-contain shadow-2xs" />
                <button
                    type="button"
                    onclick={() => (value = "")}
                    class="px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg cursor-pointer transition-colors"
                    {disabled}
                >
                    Entfernen
                </button>
            </div>
        {:else}
            <div class="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                    type="button"
                    onclick={openPad}
                    class="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 cursor-pointer transition-colors"
                    {disabled}
                >
                    <PenTool class="w-3.5 h-3.5" />
                    <span>Zeichnen</span>
                </button>
                <button
                    type="button"
                    onclick={() => fileInput?.click()}
                    class="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                    {disabled}
                >
                    <Upload class="w-3.5 h-3.5" />
                    <span>Hochladen</span>
                </button>
                <input
                    type="file"
                    bind:this={fileInput}
                    accept="image/png,image/jpeg,image/webp"
                    onchange={handleFile}
                    class="hidden"
                />
            </div>
        {/if}
    </div>
</div>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs w-full max-w-md mx-auto my-auto rounded-3xl shadow-2xl border-none outline-none"
    onclick={(e) => { if (e.target === dialog) closePad(); }}
    oncancel={(e) => { e.preventDefault(); closePad(); }}
>
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3 animate-enter shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div>
                <h3 class="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                    <PenTool class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{label}</span>
                </h3>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Hier mit Touchpad, Stift oder Maus unterschreiben</p>
            </div>
            <button
                type="button"
                aria-label="Schließen"
                onclick={closePad}
                class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
                <X class="w-4 h-4" />
            </button>
        </div>

        <div class="relative w-full aspect-5/2 bg-white dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-inner touch-none">
            <canvas
                bind:this={canvas}
                onpointerdown={onPointerDown}
                onpointermove={onPointerMove}
                onpointerup={onPointerUp}
                class="w-full h-full cursor-crosshair touch-none"
            ></canvas>
            {#if !hasDrawn}
                <div class="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 dark:text-slate-600 text-xs font-semibold select-none">
                    Hier unterschreiben...
                </div>
            {/if}
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
                type="button"
                onclick={clearCanvas}
                class="text-xs font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
            >
                <Trash2 class="w-3.5 h-3.5" /> Leeren
            </button>
            <div class="flex items-center gap-2">
                <button type="button" onclick={closePad} class="orga-button-ghost py-1.5 px-3 text-xs">Abbrechen</button>
                <button
                    type="button"
                    onclick={applySignature}
                    disabled={!hasDrawn}
                    class="orga-button-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                    <Check class="w-3.5 h-3.5" />
                    <span>Übernehmen</span>
                </button>
            </div>
        </div>
    </div>
</dialog>

