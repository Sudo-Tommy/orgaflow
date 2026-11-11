<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { Monitor, ZoomIn, Copy, Check, ExternalLink } from "lucide-svelte";
    import { getScreenshotUrl } from "../supportTicketUtils";

    let { ticket }: { ticket: any } = $props();

    let isImageZoomed = $state(false);
    let copiedImage = $state(false);
    let screenshotUrl = $derived(getScreenshotUrl(ticket));

    async function copyImageToClipboard(url: string) {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            copiedImage = true;
            setTimeout(() => (copiedImage = false), 2000);
            toastStore.success('Bild in Zwischenablage kopiert! ✓');
        } catch {
            try {
                await navigator.clipboard.writeText(url);
                copiedImage = true;
                setTimeout(() => (copiedImage = false), 2000);
                toastStore.success('Bildlink kopiert! ✓');
            } catch {
                toastStore.error('Kopieren fehlgeschlagen.');
            }
        }
    }
</script>

<div class="lg:col-span-7 xl:col-span-8 bg-slate-950 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 relative">
    <div class="px-4 py-2.5 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span class="flex items-center gap-1.5 font-mono">
            <Monitor class="w-3.5 h-3.5 text-slate-400" />
            {ticket.resolution || "Auflösung unbekannt"}
        </span>

        <div class="flex items-center gap-2">
            <button
                type="button"
                onclick={() => (isImageZoomed = !isImageZoomed)}
                class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors touch-manipulation cursor-pointer"
            >
                <ZoomIn class="w-3.5 h-3.5" />
                <span>{isImageZoomed ? "Anpassen" : "Originalgröße"}</span>
            </button>

            {#if screenshotUrl}
                <button
                    type="button"
                    onclick={() => copyImageToClipboard(screenshotUrl)}
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors touch-manipulation cursor-pointer
                    {copiedImage ? 'text-emerald-400 hover:bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800'}"
                    title="Bild in Zwischenablage kopieren"
                >
                    {#if copiedImage}
                        <Check class="w-3.5 h-3.5" />
                        <span>Kopiert!</span>
                    {:else}
                        <Copy class="w-3.5 h-3.5" />
                        <span>Bild kopieren</span>
                    {/if}
                </button>
                <a
                    href={screenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors touch-manipulation"
                >
                    <ExternalLink class="w-3.5 h-3.5" />
                    <span>Vollbild</span>
                </a>
            {/if}
        </div>
    </div>

    <div class="flex-1 p-4 flex items-center justify-center min-h-[320px] lg:min-h-0">
        {#if screenshotUrl}
            <img
                src={screenshotUrl}
                alt="Annotierter Screenshot"
                class="rounded-lg shadow-2xl transition-all
                {isImageZoomed ? 'max-w-none' : 'max-w-full max-h-[70vh] object-contain'}"
            />
        {:else}
            <div class="text-slate-500 text-sm">Kein Screenshot angehängt.</div>
        {/if}
    </div>
</div>
