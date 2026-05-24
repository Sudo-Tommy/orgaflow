<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";

    let dialog: HTMLDialogElement;
    let pdfUrl = $state("");
    let title = $state("");
    let downloadName = $state("");
    let isDownloading = $state(false);

    export function open(url: string, docTitle: string, fileName: string) {
        pdfUrl = url;
        title = docTitle;
        downloadName = fileName;
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
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
                <button onclick={handleDownload} disabled={isDownloading} class="orga-button-ghost py-2 px-3 text-xs md:text-sm font-bold flex items-center gap-2" title="Herunterladen">
                    {#if isDownloading}
                        <div class="w-4 h-4 border-2 border-neutral-400 border-t-neutral-600 rounded-full animate-spin"></div>
                    {:else}
                        <span class="text-lg">💾</span>
                    {/if}
                    <span class="hidden sm:inline">Download</span>
                </button>
                <button aria-label="Schließen" onclick={close} class="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        <div class="flex-1 w-full bg-neutral-100 rounded-xl overflow-hidden relative border border-neutral-200">
            {#if pdfUrl}
                <!-- svelte-ignore a11y_missing_attribute -->
                <object data="{pdfUrl}#toolbar=0" type="application/pdf" class="w-full h-full">
                    <div class="flex flex-col items-center justify-center h-full p-6 text-center">
                        <span class="text-4xl mb-4">📱</span>
                        <p class="text-neutral-700 font-bold mb-2">Ihr Browser unterstützt keine direkte PDF-Vorschau.</p>
                        <p class="text-neutral-500 text-sm mb-4">Bitte laden Sie das Dokument herunter, um es anzusehen.</p>
                        <button onclick={handleDownload} class="orga-button-primary">Jetzt herunterladen</button>
                    </div>
                </object>
            {:else}
                <div class="flex items-center justify-center h-full text-neutral-500">Kein Dokument geladen</div>
            {/if}
        </div>
    </div>
</dialog>