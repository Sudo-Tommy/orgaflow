<script lang="ts">
    interface Props {
        existingSignUrl: string;
        onSignDeleted?: () => void;
    }

    let { existingSignUrl, onSignDeleted }: Props = $props();

    let deleteSign = $state(false);
    let signatureMode = $state<"draw" | "upload">("draw");
    let canvas = $state<HTMLCanvasElement | null>(null);
    let isDrawing = false;
    let hasDrawnSignature = $state(false);
    let isSignatureFullscreen = $state(false);
    let uploadedFile = $state<File | null>(null);
    let uploadedPreviewUrl = $state("");

    export function getSignatureData(): { signature_base64?: string; delete_signature?: boolean } {
        if (signatureMode === 'draw' && hasDrawnSignature && canvas) {
            return { signature_base64: canvas.toDataURL("image/png") };
        } else if (signatureMode === 'upload' && uploadedPreviewUrl) {
            return { signature_base64: uploadedPreviewUrl };
        } else if (deleteSign) {
            return { delete_signature: true };
        }
        return {};
    }

    export function reset() {
        deleteSign = false;
        hasDrawnSignature = false;
        uploadedFile = null;
        uploadedPreviewUrl = "";
        isSignatureFullscreen = false;
        signatureMode = "draw";
        clearSignature();
    }

    function getPointerPos(e: MouseEvent | TouchEvent) {
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        let clientX = 0, clientY = 0;
        if (typeof window !== 'undefined' && window.TouchEvent && e instanceof TouchEvent) {
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
            ctx.lineWidth = 6;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = "#0f172a";
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
    }

    function draw(e: MouseEvent | TouchEvent) {
        if (!isDrawing || !canvas) return;
        e.preventDefault();
        const pos = getPointerPos(e);
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function clearSignature() {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        hasDrawnSignature = false;
    }

    function handleFileChange(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            uploadedFile = target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                uploadedPreviewUrl = reader.result as string;
            };
            reader.readAsDataURL(uploadedFile);
        } else {
            uploadedFile = null;
            uploadedPreviewUrl = "";
        }
    }
</script>

<div class="pt-6 border-t border-neutral-200 dark:border-slate-800">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
            <h3 class="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xs shadow-inner">✍️</span>
                Ihre Unterschrift
            </h3>
            <p class="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">Ihre hinterlegte Unterschrift für Leistungsnachweise und Bestätigungen.</p>
        </div>
        {#if (!existingSignUrl || deleteSign)}
            <div class="flex bg-neutral-100 dark:bg-slate-800 p-1 rounded-lg border border-neutral-200/80 dark:border-slate-700 shrink-0">
                <button 
                    type="button" 
                    onclick={() => signatureMode = 'draw'} 
                    class="px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer min-h-[36px] touch-manipulation {signatureMode === 'draw' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-white'}">
                    Zeichnen
                </button>
                <button 
                    type="button" 
                    onclick={() => signatureMode = 'upload'} 
                    class="px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer min-h-[36px] touch-manipulation {signatureMode === 'upload' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-white'}">
                    Hochladen
                </button>
            </div>
        {/if}
    </div>

    {#if existingSignUrl && !deleteSign}
        <!-- Bestehende Unterschrift anzeigen -->
        <div class="bg-neutral-50 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-enter">
            <div class="bg-white rounded-xl p-3 border border-neutral-200 shadow-sm max-w-full flex items-center justify-center">
                <img src={existingSignUrl} alt="Hinterlegte Unterschrift" class="max-h-24 max-w-full object-contain mx-auto" />
            </div>
            <div class="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <button 
                    type="button" 
                    onclick={() => { deleteSign = true; hasDrawnSignature = false; uploadedFile = null; uploadedPreviewUrl = ""; onSignDeleted?.(); }} 
                    class="orga-button-ghost text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-indigo-200 dark:border-slate-700 py-2.5 px-4 w-full sm:w-auto flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer min-h-[44px] touch-manipulation">
                    <span>✍️</span> Unterschrift neu aufnehmen
                </button>
            </div>
        </div>
    {:else if signatureMode === 'draw'}
        <!-- Unterschrift zeichnen -->
        <div class="{isSignatureFullscreen ? 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 touch-none landscape:p-3' : 'block relative w-full p-0 m-0 bg-white border-2 border-dashed border-neutral-300 dark:border-slate-700 rounded-2xl overflow-hidden touch-none'}">
            {#if isSignatureFullscreen}
                <div class="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-t-3xl flex items-center justify-between p-3.5 sm:p-4 border-b border-neutral-200 dark:border-slate-800 shrink-0 shadow-lg">
                    <h3 class="font-bold text-sm sm:text-lg text-neutral-900 dark:text-white flex items-center gap-2">
                        <span class="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xs shadow-inner">✍️</span>
                        Bitte hier mit Finger oder Stift unterschreiben
                    </h3>
                    <div class="flex items-center gap-2">
                        <button type="button" onclick={clearSignature} class="px-3 py-1.5 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-300 text-xs sm:text-sm font-bold rounded-xl transition-colors active:scale-95 cursor-pointer min-h-[40px] touch-manipulation">Leeren</button>
                        <button type="button" onclick={() => isSignatureFullscreen = false} class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer min-h-[40px] touch-manipulation">Fertig</button>
                    </div>
                </div>
            {/if}

            <div class="{isSignatureFullscreen ? 'w-full max-w-3xl bg-neutral-50 dark:bg-slate-900 rounded-b-3xl p-3 sm:p-5 flex items-center justify-center relative shadow-2xl' : 'w-full relative'}">
                <div class="relative w-full aspect-3/1 min-h-[140px] bg-white {isSignatureFullscreen ? 'border-4 border-dashed border-neutral-300 dark:border-slate-700 rounded-2xl shadow-inner' : ''}">
                    <canvas 
                        bind:this={canvas} 
                        width="1200" height="400" 
                        class="w-full h-full cursor-crosshair touch-none bg-white {isSignatureFullscreen ? 'rounded-2xl' : ''}"
                        onmousedown={startDrawing} onmousemove={draw} onmouseup={stopDrawing} onmouseleave={stopDrawing}
                        ontouchstart={startDrawing} ontouchmove={draw} ontouchend={stopDrawing}
                    ></canvas>
                    {#if !hasDrawnSignature}
                        <div class="absolute inset-0 pointer-events-none flex items-center justify-center text-neutral-400 font-bold {isSignatureFullscreen ? 'text-2xl sm:text-3xl opacity-50' : 'text-sm font-medium'}">
                            Hier mit Finger oder Maus unterschreiben
                        </div>
                    {/if}
                </div>
            </div>

            {#if !isSignatureFullscreen}
                <div class="absolute top-2 right-2 flex items-center gap-2 z-10">
                    <button 
                        type="button" 
                        onclick={() => isSignatureFullscreen = true} 
                        class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer min-h-[44px] touch-manipulation"
                        title="Für mehr Platz auf dem ganzen Bildschirm unterschreiben">
                        <span>🔍</span> Groß machen
                    </button>
                    {#if hasDrawnSignature}
                        <button 
                            type="button" 
                            onclick={clearSignature} 
                            class="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-lg transition-colors active:scale-95 cursor-pointer min-h-[44px] touch-manipulation">
                            Leeren
                        </button>
                    {/if}
                    {#if deleteSign && existingSignUrl}
                        <button 
                            type="button" 
                            onclick={() => { deleteSign = false; clearSignature(); }} 
                            class="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-bold rounded-lg transition-colors cursor-pointer min-h-[44px] touch-manipulation">
                            Abbrechen
                        </button>
                    {/if}
                </div>
            {/if}
        </div>
    {:else}
        <!-- Bilddatei hochladen -->
        <div class="bg-neutral-50 dark:bg-slate-800/80 border-2 border-dashed border-neutral-200 dark:border-slate-700 rounded-2xl p-6 text-center">
            {#if uploadedPreviewUrl}
                <div class="mb-3">
                    <img src={uploadedPreviewUrl} alt="Vorschau der Unterschrift" class="max-h-24 mx-auto bg-white border border-neutral-200 rounded-xl p-2 shadow-sm object-contain" />
                </div>
                <button type="button" onclick={() => { uploadedFile = null; uploadedPreviewUrl = ""; }} class="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer min-h-[44px] touch-manipulation">
                    ✕ Anderes Bild wählen
                </button>
            {:else}
                <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp" 
                    class="w-full text-xs text-neutral-500 dark:text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-700 dark:file:text-indigo-400 hover:file:bg-indigo-100 transition-colors cursor-pointer min-h-[44px] touch-manipulation" 
                    onchange={handleFileChange} 
                />
                <p class="text-[11px] text-neutral-400 dark:text-slate-400 mt-2">Unterstützt PNG, JPG oder WEBP (max. 5 MB)</p>
            {/if}
            {#if deleteSign && existingSignUrl}
                <div class="mt-3">
                    <button 
                        type="button" 
                        onclick={() => { deleteSign = false; uploadedFile = null; uploadedPreviewUrl = ""; }} 
                        class="text-xs font-bold text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer min-h-[44px] touch-manipulation">
                        Abbrechen & bisherige Unterschrift behalten
                    </button>
                </div>
            {/if}
        </div>
    {/if}
</div>
