<script lang="ts">
    import { onMount } from "svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { resolveDocumentUrl, downloadFileAsBlob } from "$lib/utils/documentUrl";
    import { shareFileFromUrl, openPdfNatively } from "$lib/services/shareService";
    import ImageZoomViewer from "$lib/components/ui/ImageZoomViewer.svelte";

    let dialog: HTMLDialogElement | undefined = $state();
    let zoomViewer: ReturnType<typeof ImageZoomViewer> | undefined = $state();
    let pdfUrl = $state("");
    let title = $state("");
    let downloadName = $state("");
    let isDownloading = $state(false);
    let isSharing = $state(false);
    let isMobile = $state(false);

    let isImage = $derived(/\.(jpg|jpeg|png|gif|webp)$/i.test(downloadName));
    const pdfParams = "#toolbar=1&navpanes=0&view=Fit";

    onMount(() => {
        isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    });

    export function open(url: string, docTitle: string, fileName: string) {
        pdfUrl = resolveDocumentUrl(url);
        title = docTitle;
        downloadName = fileName;
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
        zoomViewer?.reset();
        setTimeout(() => { pdfUrl = ""; }, 300);
    }

    async function handleDownload() {
        if (!pdfUrl || isDownloading) return;
        isDownloading = true;
        try {
            const fileName = downloadName || "dokument.pdf";
            const result = await downloadFileAsBlob(pdfUrl, fileName);
            if (!result.success) {
                toastStore.error(result.error || "Das Dokument konnte nicht heruntergeladen werden.");
            } else {
                toastStore.success(`"${fileName}" erfolgreich heruntergeladen.`);
            }
        } catch (error: any) {
            toastStore.error(error.message || "Das Dokument konnte nicht heruntergeladen werden.");
        } finally {
            isDownloading = false;
        }
    }

    async function handleShare() {
        if (!pdfUrl || isSharing) return;
        isSharing = true;
        try {
            await shareFileFromUrl(pdfUrl, downloadName || "dokument.pdf", title);
        } finally {
            isSharing = false;
        }
    }

    function handlePrint() {
        if (!pdfUrl) return;
        if (isImage) {
            const printWin = window.open("", "_blank");
            if (printWin) {
                printWin.document.write(`<html><head><title>${title}</title><style>@page{margin:0;}body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;}img{max-width:100%;max-height:100%;object-fit:contain;}</style></head><body><img src="${pdfUrl}" onload="window.print();window.close();"/></body></html>`);
                printWin.document.close();
            }
            return;
        }
        const iframe = dialog?.querySelector("iframe") as HTMLIFrameElement;
        if (iframe?.contentWindow) {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                return;
            } catch {}
        }
        const win = window.open(pdfUrl, "_blank");
        if (win) {
            win.focus();
            setTimeout(() => win.print(), 500);
        }
    }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-3xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl p-4 sm:p-5 w-full h-auto max-h-[85dvh] flex flex-col relative shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
            <div class="min-w-0 pr-4">
                <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                    <span class="text-lg sm:text-xl">📄</span> Vorschau: {title}
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{downloadName}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <button aria-label="Teilen" onclick={handleShare} disabled={isSharing || !pdfUrl} class="min-w-[40px] min-h-[40px] w-10 h-10 bg-violet-100 dark:bg-violet-950/60 hover:bg-violet-200 dark:hover:bg-violet-900 text-violet-700 dark:text-violet-300 rounded-2xl flex items-center justify-center transition-all active:scale-95 touch-manipulation cursor-pointer disabled:opacity-60" title="Teilen (WhatsApp, E-Mail ...)">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>
                <button aria-label="Drucken" onclick={handlePrint} class="min-w-[40px] min-h-[40px] w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center transition-all active:scale-95 touch-manipulation cursor-pointer" title="Drucken">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                </button>
                <button aria-label="Herunterladen" onclick={handleDownload} disabled={isDownloading} class="min-w-[40px] min-h-[40px] w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center transition-all active:scale-95 touch-manipulation cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed" title="Herunterladen">
                    {#if isDownloading}
                        <div class="w-4 h-4 border-2 border-slate-400 border-t-slate-600 dark:border-t-slate-300 rounded-full animate-spin"></div>
                    {:else}
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    {/if}
                </button>
                <button aria-label="Schließen" onclick={close} class="min-w-[40px] min-h-[40px] w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center transition-all active:scale-95 touch-manipulation cursor-pointer" title="Schließen">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        <div class="flex-1 w-full min-h-[55dvh] bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-800">
            {#if pdfUrl}
                {#if isImage}
                    <ImageZoomViewer bind:this={zoomViewer} src={pdfUrl} {title} {isMobile} />
                {:else if isMobile}
                    <div class="flex flex-col items-center justify-center h-full p-6 text-center bg-white dark:bg-slate-900">
                        <span class="text-6xl mb-6 drop-shadow-sm">📄</span>
                        <p class="text-slate-900 dark:text-slate-100 font-bold text-xl mb-2">PDF-Dokument bereit</p>
                        <p class="text-slate-500 dark:text-slate-400 text-sm mb-8 max-w-xs leading-relaxed">Auf Mobilgeräten oder als App installiert, können PDFs oft nicht sicher direkt in der Vorschau angezeigt werden.</p>
                        <div class="flex flex-col gap-3 w-full max-w-xs">
                            <button onclick={() => openPdfNatively(pdfUrl, downloadName || "dokument.pdf")} class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 w-full min-h-[44px] py-3 text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 touch-manipulation"><span class="text-lg">📄</span> PDF anzeigen / öffnen</button>
                            <button onclick={handleShare} disabled={isSharing} class="orga-button-primary bg-violet-600 hover:bg-violet-700 w-full min-h-[44px] py-3 text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 touch-manipulation disabled:opacity-60"><span class="text-lg">📤</span> {isSharing ? 'Wird vorbereitet...' : 'Teilen (WhatsApp, E-Mail ...)'}</button>
                            <button onclick={handleDownload} disabled={isDownloading} class="orga-button-ghost w-full min-h-[44px] py-3 text-sm flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95 touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed">
                                {#if isDownloading}
                                    <div class="w-4 h-4 border-2 border-slate-400 border-t-slate-600 dark:border-t-slate-300 rounded-full animate-spin"></div>
                                    Lädt...
                                {:else}
                                    <span class="text-lg">💾</span> Auf Gerät speichern
                                {/if}
                            </button>
                        </div>
                    </div>
                {:else}
                    <div class="w-full h-full overflow-auto" style="-webkit-overflow-scrolling: touch;">
                        <object data="{pdfUrl}{pdfParams}" type="application/pdf" class="w-full h-full min-h-[50vh]" title="PDF Vorschau">
                            <div class="flex flex-col items-center justify-center h-full p-6 text-center text-white">
                                <span class="text-4xl mb-4">📱</span>
                                <p class="text-slate-100 font-bold mb-2">Ihr Browser unterstützt keine direkte PDF-Vorschau.</p>
                                <p class="text-slate-300 text-sm mb-4">Bitte laden Sie das Dokument herunter, um es anzusehen.</p>
                                <button onclick={handleDownload} class="orga-button-primary">Jetzt herunterladen</button>
                            </div>
                        </object>
                    </div>
                {/if}
            {:else}
                <div class="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">Kein Dokument geladen</div>
            {/if}
        </div>
    </div>
</dialog>