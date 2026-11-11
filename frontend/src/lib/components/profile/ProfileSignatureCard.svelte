<script lang="ts">
    let { signFile = $bindable(), deleteSign = $bindable(), existingSignUrl, isLoading, onSave } = $props<{
        signFile: File | null;
        deleteSign: boolean;
        existingSignUrl: string;
        isLoading: boolean;
        onSave: () => void;
    }>();

    let signatureMode = $state<"draw" | "upload">("draw");
    let canvas = $state<HTMLCanvasElement | null>(null);
    let isDrawing = false;
    let hasDrawnSignature = $state(false);
    let isSignatureFullscreen = $state(false);
    let sigDialog = $state<HTMLDialogElement | null>(null);

    function getPointerPos(e: MouseEvent | TouchEvent) {
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if (window.TouchEvent && e instanceof TouchEvent) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }

    function startDrawing(e: MouseEvent | TouchEvent) {
        if (!canvas) return;
        e.preventDefault();
        isDrawing = true;
        hasDrawnSignature = true;
        const pos = getPointerPos(e);
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.lineWidth = 8;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = "#4f46e5";
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
    }

    function draw(e: MouseEvent | TouchEvent) {
        if (!isDrawing || !canvas) return;
        e.preventDefault();
        const pos = getPointerPos(e);
        const ctx = canvas.getContext("2d");
        if (ctx) { ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
    }

    function stopDrawing() { isDrawing = false; }

    function clearSignature() {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); }
        hasDrawnSignature = false;
        signFile = null;
    }

    function handleFileChange(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) signFile = target.files[0];
        else signFile = null;
    }

    function openSignatureFullscreen() {
        isSignatureFullscreen = true;
        sigDialog?.showModal();
    }

    function closeSignatureFullscreen() {
        isSignatureFullscreen = false;
        sigDialog?.close();
    }

    async function handleSave() {
        if (signatureMode === 'draw' && hasDrawnSignature && canvas) {
            const blob = await new Promise<Blob | null>(resolve => canvas!.toBlob(resolve, "image/png"));
            if (blob) signFile = new File([blob], "signature.png", { type: "image/png" });
        } else if (deleteSign) {
            signFile = null;
        }
        onSave();
    }
</script>

<div class="orga-card-white p-6 md:p-8">
    <h2 class="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2 border-b border-neutral-100 pb-4"><span class="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-lg shadow-inner text-sm">✍️</span> Meine Unterschrift</h2>
    
    <form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
        <div class="flex items-center justify-between mb-4"><span class="block text-sm font-semibold text-neutral-900">Unterschrift hinterlegen</span>{#if !existingSignUrl || deleteSign}<div class="flex bg-neutral-200/60 p-1 rounded-lg"><button type="button" onclick={() => signatureMode = 'draw'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {signatureMode === 'draw' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Zeichnen</button><button type="button" onclick={() => signatureMode = 'upload'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {signatureMode === 'upload' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Hochladen</button></div>{/if}</div>

        {#if existingSignUrl && !deleteSign}
            <div class="bg-white border border-neutral-200 rounded-xl p-6 text-center shadow-sm"><img src={existingSignUrl} alt="Hinterlegte Unterschrift" class="max-h-24 object-contain mx-auto bg-white rounded-lg p-2 mb-4 safe-signature" /><button type="button" onclick={() => { deleteSign = true; signFile = null; }} class="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">Entfernen & Neu anlegen</button></div>
        {:else if signatureMode === 'draw'}
            <dialog 
                bind:this={sigDialog}
                onclose={() => isSignatureFullscreen = false}
                class="{isSignatureFullscreen ? 'zero-inner-scroll-modal m-auto p-3 sm:p-5 w-full max-w-3xl bg-neutral-900/95 rounded-3xl flex flex-col items-center justify-center touch-none backdrop-blur-md border border-slate-800 shadow-2xl z-9999 backdrop:bg-slate-950/80' : 'block relative w-full p-0 m-0 bg-white border-2 border-dashed border-neutral-200 rounded-xl overflow-hidden touch-none'}"
            >
                {#if isSignatureFullscreen}
                    <div class="w-full max-w-3xl bg-white rounded-t-2xl flex items-center justify-between p-3.5 sm:p-4 border-b border-neutral-200 shrink-0">
                        <h3 class="font-bold text-lg sm:text-xl md:text-2xl text-neutral-900 flex items-center gap-2 sm:gap-3">
                            <span class="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner text-sm sm:text-base">✍️</span> 
                            Bitte unterschreiben
                        </h3>
                        <div class="flex items-center gap-2 sm:gap-3">
                            <button type="button" onclick={clearSignature} class="px-3 sm:px-4 py-2 sm:py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-bold rounded-xl transition-colors active:scale-95">Leeren</button>
                            <button type="button" onclick={closeSignatureFullscreen} class="px-4 sm:px-6 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-indigo-600/30 active:scale-95">Fertig</button>
                        </div>
                    </div>
                {/if}
                <div class="{isSignatureFullscreen ? 'w-full max-w-3xl bg-neutral-50 rounded-b-2xl p-3 sm:p-5 flex items-center justify-center relative shadow-2xl' : 'w-full relative'}">
                    <div class="relative w-full aspect-3/1 {isSignatureFullscreen ? 'bg-white border-4 border-dashed border-neutral-300 rounded-2xl shadow-inner' : ''}">
                        <canvas 
                            bind:this={canvas} 
                            width="1200" height="400" 
                            class="w-full h-full cursor-crosshair touch-none {isSignatureFullscreen ? 'rounded-2xl' : ''}"
                            style="touch-action: none;"
                            onmousedown={startDrawing} onmousemove={draw} onmouseup={stopDrawing} onmouseleave={stopDrawing}
                            ontouchstart={startDrawing} ontouchmove={draw} ontouchend={stopDrawing}
                        ></canvas>
                        {#if !hasDrawnSignature}
                            <div class="absolute inset-0 pointer-events-none flex items-center justify-center text-neutral-300 font-bold {isSignatureFullscreen ? 'text-2xl sm:text-3xl opacity-50' : 'text-sm font-medium'}">Hier unterschreiben</div>
                        {/if}
                    </div>
                </div>
                {#if !isSignatureFullscreen}
                    <div class="absolute top-2 right-2 flex gap-2">
                        <button type="button" onclick={openSignatureFullscreen} class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 active:scale-95"><span class="text-base leading-none">🔍</span> Groß machen</button>
                        <button type="button" onclick={clearSignature} class="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-bold rounded-lg transition-colors active:scale-95">Leeren</button>
                    </div>
                {/if}
            </dialog>
        {:else}
            <div class="bg-white border-2 border-dashed border-neutral-200 rounded-xl p-6 text-center"><input type="file" accept="image/png, image/jpeg" class="w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors" onchange={handleFileChange} /></div>
        {/if}

        <div class="pt-4 flex justify-end">
            <button type="submit" disabled={isLoading} class="orga-button-primary w-full sm:w-auto shadow-indigo-600/20 py-3 sm:py-2.5">{isLoading ? 'Speichert...' : 'Unterschrift speichern'}</button>
        </div>
    </form>
</div>

<style>
    :global(.theme-negative) .safe-signature {
        filter: invert(1) hue-rotate(180deg);
    }
</style>