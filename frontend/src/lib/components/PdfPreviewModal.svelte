<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { onMount } from "svelte";
    import { resolveDocumentUrl, downloadFileAsBlob } from "$lib/utils/documentUrl";

    let dialog: HTMLDialogElement;
    let pdfUrl = $state("");
    let title = $state("");
    let downloadName = $state("");
    let isDownloading = $state(false);

    let isImage = $derived(/\.(jpg|jpeg|png|gif|webp)$/i.test(downloadName));
    let pdfParams = '#toolbar=1&navpanes=0&view=Fit';
    let isMobile = $state(false);

    onMount(() => {
        isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    });

    // Bild-Zoom State
    let imgContainer: HTMLDivElement | undefined = $state();
    let zoomX = $state(50);
    let zoomY = $state(50);
    let isZoomActive = $state(false);
    let currentScale = $state(1);
    
    let translateX = $state(0);
    let translateY = $state(0);
    let isDragging = $state(false);
    let isMouseDown = $state(false);
    let dragStartX = $state(0);
    let dragStartY = $state(0);
    let initTranslateX = $state(0);
    let initTranslateY = $state(0);
    let hasDragged = $state(false);

    function handleMouseDown(e: MouseEvent) {
        if (isMobile) return;
        e.preventDefault(); // Verhindert das Standard-Browser-Drag-Verhalten (Geisterbild)
        isMouseDown = true;
        hasDragged = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        if (isZoomActive) {
            isDragging = true;
            initTranslateX = translateX;
            initTranslateY = translateY;
        }
    }

    function handleMouseMove(e: MouseEvent) {
        if (isMobile || !isMouseDown) return;
        e.preventDefault();
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasDragged = true;
        }
        if (isDragging && hasDragged) {
            translateX = initTranslateX + dx;
            translateY = initTranslateY + dy;
        }
    }

    function handleMouseUp(e: MouseEvent) {
        if (isMobile) return;
        isMouseDown = false;
        if (isDragging) {
            isDragging = false;
            if (!hasDragged) {
                // Zoom out auf Klick (wenn nicht gezogen wurde)
                isZoomActive = false;
                currentScale = 1;
                translateX = 0;
                translateY = 0;
            }
        } else if (!isZoomActive) {
            if (!hasDragged) {
                // Zoom in auf Klick (wenn nicht aus Versehen gezogen wurde)
                isZoomActive = true;
                currentScale = 2.5;
                translateX = 0;
                translateY = 0;
                if (imgContainer) {
                    const rect = imgContainer.getBoundingClientRect();
                    zoomX = ((e.clientX - rect.left) / rect.width) * 100;
                    zoomY = ((e.clientY - rect.top) / rect.height) * 100;
                }
            }
        }
    }

    function handleWheel(e: WheelEvent) {
        if (isMobile) return;
        e.preventDefault(); // Verhindert das Scrollen der Seite im Hintergrund
        
        if (!isZoomActive) {
            isZoomActive = true;
            translateX = 0;
            translateY = 0;
            if (imgContainer) {
                const rect = imgContainer.getBoundingClientRect();
                zoomX = ((e.clientX - rect.left) / rect.width) * 100;
                zoomY = ((e.clientY - rect.top) / rect.height) * 100;
            }
        }
        
        // Maßstab anhand des Mausrads stufenlos anpassen (min 1x, max 10x)
        currentScale += e.deltaY * -0.005;
        currentScale = Math.max(1, Math.min(currentScale, 10));
        
        if (currentScale === 1) {
            isZoomActive = false;
            translateX = 0;
            translateY = 0;
        }
    }

    function handleMouseLeave() {
        isMouseDown = false;
        isDragging = false;
    }

    export function open(url: string, docTitle: string, fileName: string) {
        pdfUrl = resolveDocumentUrl(url);
        title = docTitle;
        downloadName = fileName;
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
        isZoomActive = false;
        currentScale = 1;
        translateX = 0;
        translateY = 0;
        // Kurze Verzögerung, damit das iframe beim Schließen nicht sofort verschwindet (bessere Animation)
        setTimeout(() => {
            pdfUrl = "";
        }, 300);
    }

    async function handleDownload() {
        if (!pdfUrl || isDownloading) return;
        isDownloading = true;
        try {
            const result = await downloadFileAsBlob(pdfUrl, downloadName || 'dokument.pdf');
            if (!result.success) {
                toastStore.error(result.error || "Das Dokument konnte nicht heruntergeladen werden.");
            } else {
                toastStore.success(`"${downloadName || 'dokument.pdf'}" erfolgreich heruntergeladen.`);
            }
        } catch (error: any) {
            console.error("Download fehlgeschlagen:", error);
            toastStore.error(error.message || "Das Dokument konnte nicht heruntergeladen werden.");
        } finally {
            isDownloading = false;
        }
    }

    function handlePrint() {
        if (!pdfUrl) return;
        if (isImage) {
            const printWin = window.open('', '_blank');
            if (printWin) {
                printWin.document.write(`<html><head><title>${title}</title><style>@page{margin:0;}body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;}img{max-width:100%;max-height:100%;object-fit:contain;}</style></head><body><img src="${pdfUrl}" onload="window.print();window.close();"/></body></html>`);
                printWin.document.close();
            }
            return;
        }
        const iframe = dialog?.querySelector('iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                return;
            } catch (e) {
                console.warn("Direct iframe print failed, falling back to window.open", e);
            }
        }
        const win = window.open(pdfUrl, '_blank');
        if (win) {
            win.focus();
            setTimeout(() => win.print(), 500);
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-5xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl p-4 md:p-6 w-full h-[90vh] flex flex-col relative shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
            <div class="min-w-0 pr-4">
                <h2 class="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                    <span class="text-xl md:text-2xl">📄</span> Vorschau: {title}
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{downloadName}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <button aria-label="Drucken" onclick={handlePrint} class="min-w-[44px] min-h-[44px] w-11 h-11 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center transition-all active:scale-95 touch-manipulation cursor-pointer" title="Drucken">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                </button>
                <button aria-label="Herunterladen" onclick={handleDownload} disabled={isDownloading} class="min-w-[44px] min-h-[44px] w-11 h-11 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center transition-all active:scale-95 touch-manipulation cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed" title="Herunterladen">
                    {#if isDownloading}
                        <div class="w-4 h-4 border-2 border-slate-400 border-t-slate-600 dark:border-t-slate-300 rounded-full animate-spin"></div>
                    {:else}
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    {/if}
                </button>
                <button aria-label="Schließen" onclick={close} class="min-w-[44px] min-h-[44px] w-11 h-11 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center transition-all active:scale-95 touch-manipulation cursor-pointer" title="Schließen">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        <div class="flex-1 w-full bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-800">
            {#if pdfUrl}
                {#if isImage}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <div 
                        bind:this={imgContainer}
                        class="w-full h-full overflow-hidden flex items-center justify-center bg-slate-950 {isMobile ? '' : (isZoomActive ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in')}"
                        onmousedown={handleMouseDown}
                        onmousemove={handleMouseMove}
                        onmouseup={handleMouseUp}
                        onwheel={handleWheel}
                        onmouseleave={handleMouseLeave}
                    >
                        <!-- svelte-ignore a11y_missing_attribute -->
                        <img 
                            src={pdfUrl} 
                            title={title} 
                            draggable="false" 
                            class="w-full h-full pointer-events-none"
                            style="object-fit: {isZoomActive ? 'cover' : 'contain'}; transition: transform {isDragging ? '0s' : '0.1s ease-out'}; transform: translate({translateX}px, {translateY}px) scale({currentScale}); transform-origin: {zoomX}% {zoomY}%;"
                        />
                    </div>
                {:else if isMobile}
                    <div class="flex flex-col items-center justify-center h-full p-6 text-center bg-white dark:bg-slate-900">
                        <span class="text-6xl mb-6 drop-shadow-sm">📄</span>
                        <p class="text-slate-900 dark:text-slate-100 font-bold text-xl mb-2">PDF-Dokument bereit</p>
                        <p class="text-slate-500 dark:text-slate-400 text-sm mb-8 max-w-xs leading-relaxed">Auf Mobilgeräten oder als App installiert, können PDFs oft nicht sicher direkt in der Vorschau angezeigt werden.</p>
                        <div class="flex flex-col gap-3 w-full max-w-xs">
                            <button onclick={() => window.open(pdfUrl, '_blank')} class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 w-full min-h-[44px] py-3 text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 touch-manipulation"><span class="text-lg">🌐</span> Im Browser öffnen</button>
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
                        <!-- svelte-ignore a11y_missing_attribute -->
                        <object data="{pdfUrl}{pdfParams}" type="application/pdf" class="w-full h-full min-h-[50vh]">
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