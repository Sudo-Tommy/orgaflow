<script lang="ts">
    import { onMount } from 'svelte';
    import { FileText, X, Check, Copy } from 'lucide-svelte';

    let {
        synthesisResult,
        selectionCount,
        copySuccess,
        onCopy,
        onClose
    }: {
        synthesisResult: string;
        selectionCount: number;
        copySuccess: boolean;
        onCopy: () => void;
        onClose: () => void;
    } = $props();

    let dialog: HTMLDialogElement;

    onMount(() => {
        dialog?.showModal();
    });
</script>

<dialog 
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm w-full max-w-3xl mx-auto my-4 sm:my-8 landscape:my-2 rounded-2xl sm:rounded-3xl outline-none border-none shadow-2xl"
    onclick={(e) => { if (e.target === dialog) onClose(); }}
    oncancel={(e) => { e.preventDefault(); onClose(); }}
>
    <div class="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full flex flex-col my-auto animate-enter">
        <!-- Modal Header -->
        <div class="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/60 shrink-0">
            <div class="flex items-center gap-2.5">
                <span class="p-2 rounded-xl bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300">
                    <FileText class="w-5 h-5" />
                </span>
                <div>
                    <h3 class="text-base font-bold text-slate-900 dark:text-white">Synthetisiertes System-Briefing</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Releasespezifikation ({selectionCount} Vorgänge gebündelt)</p>
                </div>
            </div>

            <button
                type="button"
                onclick={onClose}
                class="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
                aria-label="Vorschau schließen"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- Dokumenten-Textbereich -->
        <div class="flex-1 p-4 sm:p-6 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed selection:bg-primary-500 selection:text-white">
            <pre class="whitespace-pre-wrap">{synthesisResult}</pre>
        </div>

        <!-- Modal Footer -->
        <div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <span class="text-xs text-slate-400 font-mono">
                {synthesisResult.length} Zeichen
            </span>

            <div class="flex items-center gap-2">
                <button
                    type="button"
                    onclick={onCopy}
                    class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-xs transition-colors min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
                >
                    {#if copySuccess}
                        <Check class="w-4 h-4 text-white" />
                        <span>✓ Kopiert</span>
                    {:else}
                        <Copy class="w-4 h-4" />
                        <span>In Zwischenablage kopieren</span>
                    {/if}
                </button>

                <button
                    type="button"
                    onclick={onClose}
                    class="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold py-2 px-4 rounded-xl transition-colors min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation"
                >
                    Schließen
                </button>
            </div>
        </div>
    </div>
</dialog>
