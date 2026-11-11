<script lang="ts">
    import { Maximize2, RotateCcw, Trash2, Check, X } from "lucide-svelte";
    import type { ContactModalState } from "./contactModalState.svelte";

    let { state }: { state: ContactModalState } = $props();
</script>

<div class="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
            <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>{state.requireSignature ? 'Unterschrift (Pflichtfeld)' : 'Unterschrift (Optional)'}</span>
                {#if state.requireSignature}
                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Erforderlich</span>
                {/if}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Für Vor-Ort-Freigaben, Vollmachten oder Quittungen.</p>
        </div>
        {#if !state.existingSignatureUrl || state.deleteExistingSignature}
            <div class="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
                <button 
                    type="button" 
                    onclick={() => state.signatureMode = 'draw'} 
                    class="px-3.5 py-1.5 min-h-[36px] text-xs font-bold rounded-lg transition-colors cursor-pointer {state.signatureMode === 'draw' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}"
                >
                    ✍️ Zeichnen
                </button>
                <button 
                    type="button" 
                    onclick={() => state.signatureMode = 'upload'} 
                    class="px-3.5 py-1.5 min-h-[36px] text-xs font-bold rounded-lg transition-colors cursor-pointer {state.signatureMode === 'upload' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}"
                >
                    📁 Hochladen
                </button>
            </div>
        {/if}
    </div>
    
    {#if state.existingSignatureUrl && !state.deleteExistingSignature}
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-center shadow-xs">
            <img src={state.existingSignatureUrl} alt="Hinterlegte Unterschrift" class="max-h-24 object-contain mx-auto bg-white rounded-lg p-2 mb-3 shadow-2xs border border-slate-100" />
            <button 
                type="button" 
                onclick={() => state.deleteExistingSignature = true} 
                class="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 hover:bg-red-500 hover:text-white font-bold py-2 px-4 min-h-[40px] rounded-xl transition-colors text-xs cursor-pointer inline-flex items-center gap-2"
            >
                <Trash2 class="w-3.5 h-3.5" />
                <span>Unterschrift entfernen & neu anlegen</span>
            </button>
        </div>
    {:else if state.signatureMode === 'draw'}
        <div class="space-y-2">
            <div class="relative bg-white dark:bg-slate-900 border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 rounded-2xl overflow-hidden touch-none h-44 sm:h-52 landscape:h-36">
                <canvas 
                    bind:this={state.canvas} 
                    width={800} 
                    height={260} 
                    class="w-full h-full cursor-crosshair safe-signature touch-none"
                    style="touch-action: none;"
                    onpointerdown={state.startDrawing}
                    onpointermove={state.draw}
                    onpointerup={state.stopDrawing}
                    onpointercancel={state.stopDrawing}
                ></canvas>
                {#if !state.hasDrawnSignature}
                    <div class="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs sm:text-sm font-medium">
                        Hier mit Finger, Stift oder Maus unterschreiben
                    </div>
                {/if}
            </div>
            <div class="flex justify-end gap-2">
                <button 
                    type="button" 
                    onclick={state.openSignatureFullscreen} 
                    class="px-3.5 py-1.5 min-h-[38px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                    <Maximize2 class="w-3.5 h-3.5" />
                    <span>Großbild</span>
                </button>
                <button 
                    type="button" 
                    onclick={state.clearSignature} 
                    class="px-3 py-1.5 min-h-[38px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                    <RotateCcw class="w-3.5 h-3.5" />
                    <span>Leeren</span>
                </button>
            </div>
        </div>
    {:else}
        <div class="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center space-y-3">
            <p class="text-xs text-slate-500 dark:text-slate-400">Bilddatei (PNG, JPG, WebP) der Unterschrift hochladen:</p>
            <input 
                type="file" 
                accept="image/png, image/jpeg, image/webp" 
                class="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 transition-colors cursor-pointer min-h-[40px]" 
                onchange={state.handleFileChange} 
            />
            {#if state.uploadedPreviewUrl}
                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2">
                    <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400">Vorschau der Signatur:</p>
                    <div class="p-2 bg-white rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <img src={state.uploadedPreviewUrl} alt="Vorschau Unterschrift" class="max-h-20 object-contain mx-auto" />
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>

<!-- Großbild / Vollbild Dialog für Mobilgeräte & Tablets -->
<dialog
    bind:this={state.fsDialog}
    class="zero-inner-scroll-modal m-auto p-4 sm:p-5 w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm z-50 outline-none"
>
    <div class="space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
                <span class="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm">✍️</span>
                <h3 class="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">Großbild: Bitte unterschreiben</h3>
            </div>
            <div class="flex items-center gap-2">
                <button
                    type="button"
                    onclick={state.clearFsSignature}
                    class="px-3 py-1.5 min-h-[38px] text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                    Leeren
                </button>
                <button
                    type="button"
                    onclick={state.applyFsSignature}
                    class="px-4 py-1.5 min-h-[38px] text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                    <Check class="w-4 h-4" />
                    <span>Übernehmen</span>
                </button>
                <button
                    type="button"
                    onclick={state.closeSignatureFullscreen}
                    class="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
                    aria-label="Schließen"
                >
                    <X class="w-4 h-4" />
                </button>
            </div>
        </div>

        <div class="relative w-full aspect-5/2 sm:aspect-3/1 bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 rounded-2xl overflow-hidden touch-none">
            <canvas
                bind:this={state.fsCanvas}
                class="w-full h-full cursor-crosshair safe-signature touch-none"
                style="touch-action: none;"
                onpointerdown={state.startFsDrawing}
                onpointermove={state.drawFs}
                onpointerup={state.stopFsDrawing}
                onpointercancel={state.stopFsDrawing}
            ></canvas>
        </div>
    </div>
</dialog>
