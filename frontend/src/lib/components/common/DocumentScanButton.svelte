<script lang="ts">
    import { documentScannerService, type ScannedPage } from "$lib/services/documentScannerService";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { Scan, Loader2 } from "lucide-svelte";

    interface Props {
        onScanComplete: (file: File) => void;
        label?: string;
        subLabel?: string;
        variant?: 'primary' | 'secondary' | 'compact' | 'icon' | 'card';
        disabled?: boolean;
        documentTitle?: string;
        class?: string;
    }

    let {
        onScanComplete,
        label = "Dokument scannen",
        subLabel = "",
        variant = 'secondary',
        disabled = false,
        documentTitle = "Dokument",
        class: extraClass = ""
    }: Props = $props();

    let isScanning = $state(false);
    let isBundling = $state(false);

    async function handleScan() {
        if (isScanning || disabled) return;
        isScanning = true;
        isBundling = false;
        const capturedPages: ScannedPage[] = [];

        try {
            while (true) {
                const page = await documentScannerService.capturePage();
                if (!page) {
                    if (capturedPages.length === 0) {
                        return;
                    }
                    const keepCaptured = await confirmStore.ask(
                        `Es wurden bereits ${capturedPages.length} Seite(n) gescannt. Möchten Sie diese Seiten als PDF speichern?`,
                        "Scan abschließen?",
                        "Als PDF speichern",
                        "Scan verwerfen"
                    );
                    if (!keepCaptured) {
                        return;
                    }
                    break;
                }

                capturedPages.push(page);
                toastStore.info(`${capturedPages.length}. Seite erfasst.`);

                const addMore = await confirmStore.ask(
                    `Seite ${capturedPages.length} erfolgreich gescannt. Möchten Sie eine weitere Seite zu diesem Dokument hinzufügen?`,
                    "Mehrseitiges Dokument",
                    "Weitere Seite",
                    "Fertigstellen"
                );

                if (!addMore) {
                    break;
                }
            }

            if (capturedPages.length > 0) {
                isBundling = true;
                const result = await documentScannerService.bundleToPdf(capturedPages, documentTitle);
                const file = new File([result.pdfBlob], result.fileName, { type: 'application/pdf' });
                toastStore.success(`${capturedPages.length === 1 ? '1 Seite' : capturedPages.length + ' Seiten'} als PDF gespeichert.`);
                onScanComplete(file);
            }
        } catch (err: any) {
            console.error("Fehler beim Dokumentenscan:", err);
            toastStore.error(err?.message || "Fehler beim Scannen des Dokuments.");
        } finally {
            isScanning = false;
            isBundling = false;
        }
    }
</script>

{#if variant === 'card'}
    <button
        type="button"
        onclick={handleScan}
        disabled={disabled || isScanning}
        class="flex items-center justify-center gap-2.5 p-3.5 sm:p-4 landscape:p-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:bg-emerald-200 dark:active:bg-emerald-900 text-emerald-900 dark:text-emerald-100 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700/80 font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-[0.98] cursor-pointer select-none touch-manipulation focus-within:ring-2 focus-within:ring-emerald-500 disabled:opacity-50 disabled:pointer-events-none {extraClass}"
        title={label}
    >
        {#if isScanning || isBundling}
            <Loader2 class="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 animate-spin" />
            <div class="text-left">
                <span class="block leading-tight font-black">{isBundling ? 'Erstelle PDF...' : 'Kamera aktiv...'}</span>
                <span class="text-[11px] font-normal text-emerald-700/80 dark:text-emerald-300/80">Bitte warten</span>
            </div>
        {:else}
            <Scan class="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div class="text-left">
                <span class="block leading-tight font-black">{label}</span>
                {#if subLabel}
                    <span class="text-[11px] font-normal text-emerald-700/80 dark:text-emerald-300/80">{subLabel}</span>
                {/if}
            </div>
        {/if}
    </button>
{:else if variant === 'icon'}
    <button
        type="button"
        onclick={handleScan}
        disabled={disabled || isScanning}
        class="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full border border-slate-200/80 dark:border-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer disabled:opacity-50 {extraClass}"
        title={label}
        aria-label={label}
    >
        {#if isScanning || isBundling}
            <Loader2 class="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
        {:else}
            <Scan class="w-5 h-5" />
        {/if}
    </button>
{:else if variant === 'compact'}
    <button
        type="button"
        onclick={handleScan}
        disabled={disabled || isScanning}
        class="min-h-[44px] px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50 {extraClass}"
        title={label}
    >
        {#if isScanning || isBundling}
            <Loader2 class="w-3.5 h-3.5 animate-spin text-slate-500 shrink-0" />
            <span>{isBundling ? 'Bündelt...' : 'Scannt...'}</span>
        {:else}
            <Scan class="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{label}</span>
        {/if}
    </button>
{:else if variant === 'primary'}
    <button
        type="button"
        onclick={handleScan}
        disabled={disabled || isScanning}
        class="orga-button-primary min-h-[44px] px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 transition-all disabled:opacity-50 {extraClass}"
        title={label}
    >
        {#if isScanning || isBundling}
            <Loader2 class="w-4 h-4 animate-spin shrink-0 text-white" />
            <span>{isBundling ? 'Erstelle PDF...' : 'Kamera aktiv...'}</span>
        {:else}
            <Scan class="w-4 h-4 shrink-0 text-white" />
            <span>{label}</span>
        {/if}
    </button>
{:else}
    <button
        type="button"
        onclick={handleScan}
        disabled={disabled || isScanning}
        class="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 px-4 min-h-[44px] rounded-xl flex items-center justify-center gap-2 transition-all shadow-2xs active:scale-95 cursor-pointer touch-manipulation disabled:opacity-50 {extraClass}"
        title={label}
    >
        {#if isScanning || isBundling}
            <Loader2 class="w-4 h-4 animate-spin shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span>{isBundling ? 'Bündelt...' : 'Scannt...'}</span>
        {:else}
            <Scan class="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span>{label}</span>
        {/if}
    </button>
{/if}
