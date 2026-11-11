<script lang="ts">
    import { Camera, X } from "lucide-svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import ExpenditureCameraScannerModal from "./expenditure/ExpenditureCameraScannerModal.svelte";
    import ExpenditureReceiptCard from "./expenditure/ExpenditureReceiptCard.svelte";
    import { ExpenditureState } from "./expenditure/expenditureState.svelte";
    import { saveExpenditure } from "./expenditure/expenditureSaveAction";
    import { processReceiptCanvas } from "$lib/services/receiptScannerService";

    let { appointment, onSaved } = $props<{ appointment: any; onSaved?: (app: any) => void }>();
    
    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let scannerModal: any;
    let pdfPreviewModal: any;
    let cameraInput: HTMLInputElement;
    let fileInput: HTMLInputElement;

    const expState = new ExpenditureState();

    export function open(record?: any) {
        expState.open(record);
        dialog?.showModal();
    }

    export function close() {
        scannerModal?.stopCamera();
        expState.cleanupPreview();
        dialog?.close();
    }

    export async function attemptClose() {
        const can = await expState.canClose();
        if (can) close();
    }

    async function handleFrameCaptured(sourceCanvas: HTMLCanvasElement) {
        expState.isScanningReceipt = true;
        toastStore.info("Erkenne Dokumentkanten...");
        try {
            const result = await processReceiptCanvas(sourceCanvas, expState.titel, expState.sum);
            if (result) {
                expState.receiptFile = result.croppedFile;
                expState.cleanupPreview();
                expState.localPreviewUrl = result.previewUrl;
                if (result.detectedTitle) expState.titel = result.detectedTitle;
                if (result.detectedAmount) expState.sum = result.detectedAmount;
                expState.removeReceipt = false;
                toastStore.success("Kanten automatisch erkannt & Dokument zugeschnitten!");
            }
        } catch (err) {
            console.error("Fehler bei Beleganalyse:", err);
            toastStore.error("Fehler bei der Kameraerfassung.");
        } finally {
            expState.isScanningReceipt = false;
        }
    }

    async function handleFileSelected(e: Event) {
        const target = e.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) return;
        const file = target.files[0];
        target.value = "";

        if (file.type.startsWith('image/')) {
            expState.isScanningReceipt = true;
            try {
                const img = new Image();
                const url = URL.createObjectURL(file);
                await new Promise((resolve) => {
                    img.onload = resolve;
                    img.src = url;
                });
                const c = document.createElement('canvas');
                c.width = img.width;
                c.height = img.height;
                const ctx = c.getContext('2d');
                if (ctx) ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);
                await handleFrameCaptured(c);
            } catch (err) {
                console.error("Fehler bei Bildauswahl:", err);
                toastStore.error("Fehler beim Verarbeiten des Belegbilds.");
            } finally {
                expState.isScanningReceipt = false;
            }
        } else {
            expState.receiptFile = file;
            expState.removeReceipt = false;
            expState.cleanupPreview();
            toastStore.success("PDF-Beleg angehängt.");
        }
    }

    function previewReceipt() {
        if (expState.localPreviewUrl && expState.receiptFile) {
            pdfPreviewModal?.open(expState.localPreviewUrl, expState.titel || "Belegvorschau", expState.receiptFile.name);
        } else if (expState.existingReceiptUrl && expState.existingReceiptName) {
            pdfPreviewModal?.open(expState.existingReceiptUrl, expState.titel || "Beleg", expState.existingReceiptName);
        }
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        const ok = await saveExpenditure(expState, appointment, onSaved);
        if (ok) close();
    }
</script>

<dialog 
    bind:this={dialog} 
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/75 backdrop:backdrop-blur-md w-full max-w-lg mx-auto my-6 sm:my-10 rounded-3xl shadow-2xl" 
    onclick={(e) => { if (e.target === dialog) attemptClose(); }}
>
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full flex flex-col text-slate-900 dark:text-slate-100 shadow-2xl relative">
        <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <div>
                <h3 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span class="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                        <Camera class="w-4 h-4" />
                    </span>
                    <span>{expState.editId ? 'Sonderausgabe bearbeiten' : 'Neue Sonderausgabe erfassen'}</span>
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Erfassen Sie Auslagen, Quittungen und Kassenbons für diesen Termin.
                </p>
            </div>
            <button 
                type="button" 
                onclick={attemptClose} 
                class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
                title="Schließen"
            >
                <X class="w-4 h-4" />
            </button>
        </div>

        <form onsubmit={onSubmit} class="p-5 space-y-4">
            {#if expState.errorMsg}
                <div class="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                    {expState.errorMsg}
                </div>
            {/if}

            <div>
                <label for="exp-titel" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Zweck / Titel <span class="text-rose-500">*</span>
                </label>
                <input 
                    id="exp-titel" 
                    type="text" 
                    bind:value={expState.titel} 
                    placeholder="z.B. Parkticket, Klienten-Einkauf, Apotheke..." 
                    class="orga-input w-full text-xs font-semibold min-h-[44px]" 
                    required 
                    disabled={expState.isLoading || expState.isScanningReceipt} 
                />
            </div>

            <div>
                <label for="exp-sum" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Betrag (€) <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                    <input 
                        id="exp-sum" 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        bind:value={expState.sum} 
                        placeholder="0,00" 
                        class="orga-input w-full text-xs font-bold pr-8 min-h-[44px]" 
                        required 
                        disabled={expState.isLoading || expState.isScanningReceipt} 
                    />
                    <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">€</span>
                </div>
            </div>

            <input type="file" accept="image/*" capture="environment" class="hidden" bind:this={cameraInput} onchange={handleFileSelected} />
            <input type="file" accept="image/*,application/pdf" class="hidden" bind:this={fileInput} onchange={handleFileSelected} />

            <ExpenditureReceiptCard 
                receiptFile={expState.receiptFile}
                existingReceiptUrl={expState.existingReceiptUrl}
                existingReceiptName={expState.existingReceiptName}
                localPreviewUrl={expState.localPreviewUrl}
                removeReceipt={expState.removeReceipt}
                isLoading={expState.isLoading}
                isScanningReceipt={expState.isScanningReceipt}
                onPreviewReceipt={previewReceipt}
                onOpenCameraScanner={() => { expState.isCameraScannerOpen = true; scannerModal?.startCamera(); }}
                onOpenFilePicker={() => fileInput?.click()}
                onRemoveReceipt={() => expState.removeCurrentReceipt()}
                onScanComplete={(file) => {
                    expState.receiptFile = file;
                    expState.removeReceipt = false;
                    expState.cleanupPreview();
                }}
            />

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button 
                    type="button" 
                    onclick={attemptClose} 
                    class="orga-button-ghost w-full sm:w-auto py-2.5 px-4 text-xs font-semibold min-h-[44px]" 
                    disabled={expState.isLoading || expState.isScanningReceipt}
                >
                    Abbrechen
                </button>
                <button 
                    type="submit" 
                    class="orga-button-primary w-full sm:w-auto py-2.5 px-5 text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px]" 
                    disabled={expState.isLoading || expState.isScanningReceipt}
                >
                    {#if expState.isLoading}
                        <span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Speichert...</span>
                    {:else}
                        <span>{expState.editId ? 'Änderungen speichern' : 'Ausgabe speichern'}</span>
                    {/if}
                </button>
            </div>
        </form>
    </div>
</dialog>

<ExpenditureCameraScannerModal 
    bind:this={scannerModal}
    isOpen={expState.isCameraScannerOpen}
    isCapturingFrame={expState.isCapturingFrame}
    onCapture={handleFrameCaptured}
    onClose={() => expState.isCameraScannerOpen = false}
    onPickFile={() => fileInput?.click()}
/>

<PdfPreviewModal bind:this={pdfPreviewModal} />