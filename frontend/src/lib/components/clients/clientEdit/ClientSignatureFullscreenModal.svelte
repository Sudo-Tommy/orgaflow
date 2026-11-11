<script lang="ts">
    import { X, Check, RotateCcw } from "lucide-svelte";

    let { 
        editState, 
        client, 
        onApply, 
        onClose, 
        onClear 
    } = $props<{
        editState: any;
        client: any;
        onApply: () => void;
        onClose: () => void;
        onClear: () => void;
    }>();

    let fsDialog = $state<HTMLDialogElement>();

    export function showModal() {
        try { fsDialog?.showModal(); } catch (e) { console.error("Fehler beim Öffnen des Vollbild-Dialogs:", e); }
    }

    export function closeModal() {
        try { if (fsDialog?.open) fsDialog.close(); } catch (_) {}
    }
</script>

<dialog 
    bind:this={fsDialog}
    onclose={onClose}
    data-hide-feedback="true"
    class="sig-fs-dialog zero-inner-scroll-modal w-full max-w-3xl mx-auto my-auto p-4 sm:p-5 bg-slate-950/95 backdrop:bg-black/70 backdrop-blur-md text-white border border-slate-800 rounded-3xl shadow-2xl z-[99999] flex flex-col justify-between animate-in fade-in duration-150"
    aria-label="Unterschrift erfassen"
>
    {#if editState.isSignatureFullscreen}
        <!-- Header -->
        <div class="sig-fs-header flex items-center justify-between gap-3 pb-2.5 sm:pb-3.5 border-b border-slate-800 shrink-0 text-white">
            <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <span class="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center text-sm sm:text-lg shadow-lg shrink-0">✍️</span>
                <div class="min-w-0 flex-1">
                    <h3 class="text-xs sm:text-base font-bold text-slate-100 truncate">
                        Unterschrift erfassen · {editState.formData.name_first || client?.name_first || ''} {editState.formData.name_last || client?.name_last || ''}
                    </h3>
                    <p class="text-[11px] text-slate-400 hidden sm:block truncate">Bitte mit Finger oder Eingabestift (Apple Pencil / Stylus) unterschreiben</p>
                </div>
            </div>

            <!-- Desktop & Tablet / Landscape Controls -->
            <div class="sig-fs-header-controls hidden sm:flex items-center gap-2 shrink-0">
                <button type="button" onclick={onClear} class="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs sm:text-sm font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer">
                    <RotateCcw class="w-4 h-4" /> <span>Leeren</span>
                </button>
                <button type="button" onclick={onClose} class="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer">
                    <X class="w-4 h-4" /> <span>Abbrechen</span>
                </button>
                <button type="button" onclick={onApply} class="min-h-[44px] px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer">
                    <Check class="w-4 h-4" /> <span>Übernehmen</span>
                </button>
            </div>

            <!-- Portrait Mobile Only -->
            <div class="sig-fs-mobile-only-control sm:hidden flex items-center gap-2 shrink-0">
                <button type="button" onclick={onClose} class="min-h-[44px] min-w-[44px] px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer">
                    <X class="w-4 h-4" /> <span>Abbrechen</span>
                </button>
            </div>
        </div>

        <!-- Canvas Card -->
        <div class="sig-fs-canvas-container flex-1 min-h-0 py-2 sm:py-3 flex flex-col items-center justify-center relative w-full">
            <div class="sig-fs-canvas-card w-full max-w-3xl h-56 sm:h-64 landscape:h-44 bg-white rounded-2xl border-2 border-slate-700 shadow-2xl relative overflow-hidden touch-none flex items-center justify-center">
                <canvas 
                    bind:this={editState.fsCanvas}
                    class="w-full h-full cursor-crosshair touch-none select-none"
                    style="touch-action: none;"
                ></canvas>
                <div class="sig-fs-baseline absolute bottom-4 sm:bottom-14 left-6 sm:left-12 right-6 sm:right-12 border-b-2 border-dashed border-neutral-300 pointer-events-none flex justify-between text-[11px] text-neutral-400 font-medium px-2 select-none">
                    <span>Unterschrift des Klienten / Bevollmächtigten</span>
                    <span>X ________________________</span>
                </div>
                {#if !editState.hasDrawnFsSignature}
                    <div class="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-neutral-400 gap-2 select-none">
                        <span class="text-3xl sm:text-5xl opacity-40">✍️</span>
                        <span class="font-bold text-xs sm:text-base opacity-60">Hier mit Stift oder Finger unterschreiben</span>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Mobile Bottom Controls -->
        <div class="sig-fs-bottom-controls sm:hidden flex flex-col gap-2 shrink-0 pt-1 pb-1">
            <div class="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                <span>🔄</span> <span>Tipp: Für maximale Zeichenfläche Smartphone ins Querformat drehen</span>
            </div>
            <div class="flex items-center gap-2">
                <button type="button" onclick={onClear} class="min-h-[48px] px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                    <RotateCcw class="w-4 h-4" /> <span>Leeren</span>
                </button>
                <button type="button" onclick={onApply} class="flex-1 min-h-[48px] px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-98 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <Check class="w-5 h-5" /> <span>Unterschrift übernehmen</span>
                </button>
            </div>
        </div>
    {/if}
</dialog>

<style>
    @media (orientation: landscape) and (max-height: 550px) {
        .sig-fs-dialog { padding: 0 !important; }
        .sig-fs-header { padding: 0.35rem 0.75rem !important; background: rgba(15, 23, 42, 0.95) !important; }
        .sig-fs-header-controls { display: flex !important; }
        .sig-fs-mobile-only-control { display: none !important; }
        .sig-fs-canvas-container { padding: 0 !important; margin: 0 !important; width: 100% !important; height: 100% !important; flex: 1 1 0% !important; }
        .sig-fs-canvas-card { max-width: 100% !important; max-height: 100% !important; border-radius: 0 !important; border: none !important; width: 100% !important; height: 100% !important; }
        .sig-fs-baseline { bottom: 0.75rem !important; left: 1rem !important; right: 1rem !important; }
        .sig-fs-bottom-controls { display: none !important; }
    }
</style>
