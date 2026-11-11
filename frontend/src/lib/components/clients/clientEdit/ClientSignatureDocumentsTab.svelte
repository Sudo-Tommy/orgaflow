<script lang="ts">
    import { Maximize2, RotateCcw, ExternalLink } from "lucide-svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { sortTemplatesAlphabetically } from "$lib/services/documentGeneratorRateHelper";
    import { getPointerPos } from "$lib/utils/signatureCanvasHelper";
    import ClientSignatureFullscreenModal from "./ClientSignatureFullscreenModal.svelte";

    let { editState, client } = $props<{ editState: any; client: any }>();

    let fsModal = $state<ReturnType<typeof ClientSignatureFullscreenModal>>();
    let isDrawing = false;
    let isFsDrawing = false;

    function startDrawing(e: PointerEvent) {
        if (!editState.canvas) return;
        e.preventDefault();
        try { (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId); } catch (_) {}
        isDrawing = true;
        editState.hasDrawnSignature = true;
        const pos = getPointerPos(e, editState.canvas);
        const ctx = editState.canvas.getContext("2d");
        if (ctx) {
            ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#4f46e5";
            ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
        }
    }

    function draw(e: PointerEvent) {
        if (!isDrawing || !editState.canvas) return;
        e.preventDefault();
        const pos = getPointerPos(e, editState.canvas);
        const ctx = editState.canvas.getContext("2d");
        if (ctx) { ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
    }

    function stopDrawing(e?: PointerEvent) {
        if (e) { try { (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId); } catch (_) {} }
        isDrawing = false;
    }

    export function clearSignature() {
        if (!editState.canvas) return;
        const ctx = editState.canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, editState.canvas.width, editState.canvas.height);
        editState.hasDrawnSignature = false;
        editState.uploadedFile = null;
    }

    function handleFileChange(e: Event) {
        const target = e.target as HTMLInputElement;
        editState.uploadedFile = (target.files && target.files.length > 0) ? target.files[0] : null;
    }

    function openFullscreen() {
        editState.isSignatureFullscreen = true;
        fsModal?.showModal();
        setTimeout(() => {
            if (editState.fsCanvas) {
                const rect = editState.fsCanvas.getBoundingClientRect();
                const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
                editState.fsCanvas.width = Math.max(800, Math.floor(rect.width * dpr));
                editState.fsCanvas.height = Math.max(300, Math.floor(rect.height * dpr));
                const ctx = editState.fsCanvas.getContext("2d");
                if (ctx) {
                    ctx.clearRect(0, 0, editState.fsCanvas.width, editState.fsCanvas.height);
                    if (editState.canvas && editState.hasDrawnSignature) {
                        ctx.drawImage(editState.canvas, 0, 0, editState.fsCanvas.width, editState.fsCanvas.height);
                        editState.hasDrawnFsSignature = true;
                    } else editState.hasDrawnFsSignature = false;
                }
                setupFsListeners();
            }
        }, 60);
    }

    function setupFsListeners() {
        const fc = editState.fsCanvas;
        if (!fc) return;
        fc.onpointerdown = (e: PointerEvent) => {
            e.preventDefault();
            try { (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId); } catch (_) {}
            isFsDrawing = true; editState.hasDrawnFsSignature = true;
            const pos = getPointerPos(e, fc);
            const ctx = fc.getContext("2d");
            if (ctx) {
                ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#4f46e5";
                ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
            }
        };
        fc.onpointermove = (e: PointerEvent) => {
            if (!isFsDrawing) return;
            e.preventDefault();
            const pos = getPointerPos(e, fc);
            const ctx = fc.getContext("2d");
            if (ctx) { ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
        };
        fc.onpointerup = fc.onpointercancel = (e: PointerEvent) => {
            try { (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId); } catch (_) {}
            isFsDrawing = false;
        };
    }

    function applyFsSignature() {
        if (editState.fsCanvas && editState.canvas) {
            const ctx = editState.canvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, editState.canvas.width, editState.canvas.height);
                if (editState.hasDrawnFsSignature) {
                    ctx.drawImage(editState.fsCanvas, 0, 0, editState.canvas.width, editState.canvas.height);
                    editState.hasDrawnSignature = true;
                } else editState.hasDrawnSignature = false;
            }
        }
        closeFullscreen();
    }

    function closeFullscreen() {
        editState.isSignatureFullscreen = false;
        fsModal?.closeModal();
    }

    function clearFsSignature() {
        if (!editState.fsCanvas) return;
        const ctx = editState.fsCanvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, editState.fsCanvas.width, editState.fsCanvas.height);
        editState.hasDrawnFsSignature = false;
    }
</script>

<div class="space-y-6 animate-enter">
    <div>
        <h3 class="text-xs font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider mb-3">1. Standard-Vorlagen</h3>
        <div>
            <label for="edit-template" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Standard-Rechnungsart</label>
            <select id="edit-template" bind:value={editState.formData.default_template} class="orga-input-clear text-base cursor-pointer min-h-[44px]" disabled={editState.isLoading}>
                <option value="">Keine Standard-Rechnungsart hinterlegt</option>
                {#each sortTemplatesAlphabetically((orgaStore.document_templates?.data || []).filter(t => (t.type || '').toLowerCase() === 'rechnung')) as t}
                    <option value={t.id}>{t.title}</option>
                {/each}
            </select>
        </div>
    </div>

    <!-- Signatur -->
    <div class="pt-5 border-t border-neutral-200 dark:border-slate-800">
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-xs font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider">2. Klienten-Unterschrift</h3>
            {#if !editState.existingSignatureUrl || editState.deleteExistingSignature}
                <div class="flex bg-neutral-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button type="button" onclick={() => editState.signatureMode = 'draw'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors min-h-[36px] cursor-pointer {editState.signatureMode === 'draw' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 dark:text-slate-400'}">Zeichnen</button>
                    <button type="button" onclick={() => editState.signatureMode = 'upload'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors min-h-[36px] cursor-pointer {editState.signatureMode === 'upload' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 dark:text-slate-400'}">Hochladen</button>
                </div>
            {/if}
        </div>

        {#if editState.existingSignatureUrl && !editState.deleteExistingSignature}
            <div class="bg-neutral-50 dark:bg-slate-800/60 border border-neutral-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-16 h-10 bg-white rounded-lg border border-neutral-200 dark:border-slate-700 p-1 flex items-center justify-center">
                        <img src={editState.existingSignatureUrl} alt="Signatur" class="max-h-full max-w-full object-contain safe-signature" />
                    </div>
                    <div>
                        <p class="text-sm font-bold text-neutral-900 dark:text-slate-100">Aktuelle Unterschrift hinterlegt</p>
                        <p class="text-xs text-neutral-500 dark:text-slate-400">Wird für generierte Dokumente verwendet</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <a href={editState.existingSignatureUrl} target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 text-neutral-700 dark:text-slate-200 text-xs font-bold rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-1.5 min-h-[44px]">
                        <ExternalLink class="w-3.5 h-3.5" /> <span>Öffnen</span>
                    </a>
                    <button type="button" onclick={() => editState.deleteExistingSignature = true} class="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors min-h-[44px]">
                        Löschen
                    </button>
                </div>
            </div>
        {:else if editState.signatureMode === 'draw'}
            <div class="space-y-2">
                <div class="relative bg-white dark:bg-slate-900 border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 rounded-2xl overflow-hidden touch-none h-44 sm:h-52">
                    <canvas bind:this={editState.canvas} width={800} height={260} class="w-full h-full cursor-crosshair safe-signature touch-none" style="touch-action: none;"
                        onpointerdown={startDrawing} onpointermove={draw} onpointerup={stopDrawing} onpointercancel={stopDrawing}></canvas>
                    {#if !editState.hasDrawnSignature}
                        <div class="absolute inset-0 pointer-events-none flex items-center justify-center text-neutral-400 dark:text-slate-500 text-sm font-medium">
                            Hier mit Finger oder Stift unterschreiben
                        </div>
                    {/if}
                </div>
                <div class="flex justify-end gap-2 mt-2">
                    <button type="button" onclick={openFullscreen} class="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer flex items-center gap-1.5 min-h-[44px]">
                        <Maximize2 class="w-3.5 h-3.5" /> <span>Vollbild</span>
                    </button>
                    <button type="button" onclick={clearSignature} class="px-3 py-1.5 bg-neutral-200 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-neutral-300 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 min-h-[44px]">
                        <RotateCcw class="w-3.5 h-3.5" /> <span>Leeren</span>
                    </button>
                </div>
            </div>
        {:else}
            <div class="bg-neutral-50 dark:bg-slate-900/60 border-2 border-dashed border-neutral-300 dark:border-slate-700 rounded-2xl p-6 text-center space-y-3">
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.pdf" class="w-full text-sm text-neutral-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer min-h-[44px]" onchange={handleFileChange} />
                {#if editState.uploadedFile}
                    <div class="pt-3 border-t border-neutral-200 dark:border-slate-800 flex flex-col items-center gap-2">
                        {#if editState.uploadedPreviewUrl}
                            <p class="text-xs font-bold text-slate-500 dark:text-slate-400">Vorschau der Datei:</p>
                            <div class="inline-block bg-white rounded-xl p-3 shadow-xs border border-neutral-200 dark:border-slate-700">
                                <img src={editState.uploadedPreviewUrl} alt="Vorschau" class="max-h-24 object-contain mx-auto safe-signature" />
                            </div>
                        {:else}
                            <div class="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                                <span>📄</span> <span>{editState.uploadedFile.name} ({(editState.uploadedFile.size / 1024).toFixed(1)} KB)</span>
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Zugeordnete Dokumente -->
    <div class="pt-5 border-t border-neutral-200 dark:border-slate-800">
        <h3 class="text-xs font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider mb-3">3. Zugeordnete Klienten-Dokumente</h3>
        <div class="bg-neutral-50 dark:bg-slate-800/60 border border-neutral-200 dark:border-slate-700 rounded-2xl p-6 text-center">
            <span class="text-3xl block mb-2">📄</span>
            <p class="text-sm font-bold text-neutral-800 dark:text-slate-200">Dokumentenarchiv im Klienten-Profil</p>
            <p class="text-xs text-neutral-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Verträge, Leistungsnachweise, Bescheide und Anträge auf Verhinderungspflege können direkt in der Klienten-Detailansicht eingesehen und per PDF generiert werden.
            </p>
        </div>
    </div>
</div>

<ClientSignatureFullscreenModal 
    bind:this={fsModal} 
    {editState} 
    {client} 
    onApply={applyFsSignature} 
    onClose={closeFullscreen} 
    onClear={clearFsSignature} 
/>
