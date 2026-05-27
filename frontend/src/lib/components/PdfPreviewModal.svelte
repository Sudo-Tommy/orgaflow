<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { onMount } from "svelte";

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
        pdfUrl = url;
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
        if (!pdfUrl) return;
        isDownloading = true;
        try {
            const response = await fetch(pdfUrl);
            if (!response.ok) throw new Error("Netzwerkantwort war nicht ok");
            
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(blobUrl); }, 100);
        } catch (error) {
            console.error("Download fehlgeschlagen:", error);
            toastStore.error("Das Dokument konnte nicht heruntergeladen werden.");
        } finally {
            isDownloading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-5xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-4 md:p-6 w-full h-[90vh] flex flex-col relative shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-4 shrink-0">
            <div class="min-w-0 pr-4">
                <h2 class="text-lg md:text-xl font-bold text-neutral-900 flex items-center gap-2 truncate">
                    <span class="text-xl md:text-2xl">📄</span> Vorschau: {title}
                </h2>
                <p class="text-xs text-neutral-500 mt-1 truncate">{downloadName}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <button aria-label="Herunterladen" onclick={handleDownload} disabled={isDownloading} class="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors" title="Herunterladen">
                    {#if isDownloading}
                        <div class="w-4 h-4 border-2 border-neutral-400 border-t-neutral-600 rounded-full animate-spin"></div>
                    {:else}
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    {/if}
                </button>
                <button aria-label="Schließen" onclick={close} class="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        <div class="flex-1 w-full bg-neutral-100 rounded-xl overflow-hidden relative border border-neutral-200">
            {#if pdfUrl}
                {#if isImage}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <div 
                        bind:this={imgContainer}
                        class="w-full h-full overflow-hidden flex items-center justify-center bg-neutral-900/5 {isMobile ? '' : (isZoomActive ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in')}"
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
                    <div class="flex flex-col items-center justify-center h-full p-6 text-center bg-white">
                        <span class="text-6xl mb-6 drop-shadow-sm">📄</span>
                        <p class="text-neutral-900 font-bold text-xl mb-2">PDF-Dokument bereit</p>
                        <p class="text-neutral-500 text-sm mb-8 max-w-xs leading-relaxed">Auf Mobilgeräten oder als App installiert, können PDFs oft nicht sicher direkt in der Vorschau angezeigt werden.</p>
                        <div class="flex flex-col gap-3 w-full max-w-xs">
                            <button onclick={() => window.open(pdfUrl, '_blank')} class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 w-full py-3.5 text-sm flex items-center justify-center gap-2"><span class="text-lg">🌐</span> Im Browser öffnen</button>
                            <button onclick={handleDownload} disabled={isDownloading} class="orga-button-ghost w-full py-3.5 text-sm flex items-center justify-center gap-2 bg-neutral-50 border border-neutral-200">
                                {#if isDownloading}
                                    <div class="w-4 h-4 border-2 border-neutral-400 border-t-neutral-600 rounded-full animate-spin"></div>
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
                            <div class="flex flex-col items-center justify-center h-full p-6 text-center">
                                <span class="text-4xl mb-4">📱</span>
                                <p class="text-neutral-700 font-bold mb-2">Ihr Browser unterstützt keine direkte PDF-Vorschau.</p>
                                <p class="text-neutral-500 text-sm mb-4">Bitte laden Sie das Dokument herunter, um es anzusehen.</p>
                                <button onclick={handleDownload} class="orga-button-primary">Jetzt herunterladen</button>
                            </div>
                        </object>
                    </div>
                {/if}
            {:else}
                <div class="flex items-center justify-center h-full text-neutral-500">Kein Dokument geladen</div>
            {/if}
        </div>
    </div>
</dialog>