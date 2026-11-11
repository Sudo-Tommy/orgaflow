<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { Layers, Copy, Check } from "lucide-svelte";
    import { parseAnnotations } from "../supportTicketUtils";

    let { annotationsData }: { annotationsData: any } = $props();

    let arrows = $derived(parseAnnotations(annotationsData));
    let copiedText = $state(false);

    async function copyText(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            copiedText = true;
            setTimeout(() => (copiedText = false), 2000);
            toastStore.success('In Zwischenablage kopiert! ✓');
        } catch {
            toastStore.error('Kopieren fehlgeschlagen.');
        }
    }
</script>

<div class="space-y-3">
    <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Layers class="w-3.5 h-3.5 text-rose-500" />
            <span>Pfeil-Annotationen ({arrows.length})</span>
        </h4>
        {#if arrows.length > 0}
            <button
                type="button"
                onclick={() => copyText(
                    arrows.map((a, i) => `Pfeil ${i + 1}: ${a.text?.trim() || '(Kein Text)'}`).join('\n')
                )}
                class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors touch-manipulation cursor-pointer
                {copiedText ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}"
                title="Alle Annotationen kopieren"
            >
                {#if copiedText}
                    <Check class="w-3 h-3" />
                    <span>Kopiert!</span>
                {:else}
                    <Copy class="w-3 h-3" />
                    <span>Alle kopieren</span>
                {/if}
            </button>
        {/if}
    </div>

    {#if arrows.length === 0}
        <div class="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500">
            Keine visuellen Pfeile auf dem Screenshot gesetzt.
        </div>
    {:else}
        <div class="space-y-2.5">
            {#each arrows as arrow, idx}
                {@const hasText = arrow.text && arrow.text.trim()}
                <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-start gap-3">
                    <span
                        class="w-7 h-7 rounded-full text-xs font-bold text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5"
                        style="background-color: {arrow.color || '#ef4444'};"
                    >
                        {idx + 1}
                    </span>
                    <div class="flex-1 min-w-0">
                        {#if hasText}
                            <p class="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed break-words">
                                {arrow.text}
                            </p>
                        {:else}
                            <p class="text-xs italic text-slate-400 dark:text-slate-500">
                                Kein Beschreibungstext hinterlegt
                            </p>
                        {/if}
                    </div>
                    <button
                        type="button"
                        onclick={() => copyText(`Pfeil ${idx + 1}: ${arrow.text?.trim() || '(Kein Text)'}`)}
                        class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0 touch-manipulation cursor-pointer"
                        title="Diesen Pfeil kopieren"
                    >
                        <Copy class="w-3.5 h-3.5" />
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</div>
