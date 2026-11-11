<script lang="ts">
    import { FileText, Download, Eye, Layers, Save, Copy, Check } from 'lucide-svelte';

    let {
        selectionCount,
        isProcessing,
        synthesisResult,
        copySuccess,
        downloadSuccess,
        isSavingToPrompts,
        saveSuccess,
        onClearSelection,
        onGenerate,
        onOpenPreview,
        onCopy,
        onSavePrompt,
        onDownload
    }: {
        selectionCount: number;
        isProcessing: boolean;
        synthesisResult: string;
        copySuccess: boolean;
        downloadSuccess: boolean;
        isSavingToPrompts: boolean;
        saveSuccess: boolean;
        onClearSelection: () => void;
        onGenerate: () => void;
        onOpenPreview: () => void;
        onCopy: () => void;
        onSavePrompt: () => void;
        onDownload: () => void;
    } = $props();
</script>

<div 
    role="region" 
    aria-label="Sammel-Arbeitsauftrag Steuerung"
    class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 sm:max-w-md w-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 transition-all duration-300 animate-enter backdrop-blur-md"
>
    <!-- Kopfzeile: Zähler & Auswahl aufheben -->
    <div class="flex items-center justify-between gap-3 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div class="flex items-center gap-2 min-w-0">
            <span class="flex h-7 w-7 rounded-xl bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-bold text-xs items-center justify-center shrink-0">
                <Layers class="w-4 h-4" />
            </span>
            <div class="min-w-0">
                <span class="text-sm font-bold text-slate-800 dark:text-slate-100 block truncate">
                    {selectionCount} {selectionCount === 1 ? 'Vorgang' : 'Vorgänge'} ausgewählt
                </span>
                <span class="text-[11px] text-slate-400 font-medium block">Bereit zur Bündelung</span>
            </div>
        </div>
        
        <button 
            type="button"
            onclick={onClearSelection} 
            class="text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 min-w-[44px] min-h-[44px] px-2 py-1 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer touch-manipulation"
            title="Auswahl aufheben"
        >
            Auswahl aufheben
        </button>
    </div>

    <!-- Haupt-Aktionsbutton mit Double-Submission-Schutz -->
    <button
        type="button"
        onclick={onGenerate}
        disabled={isProcessing}
        class="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all duration-200 min-h-[44px] flex items-center justify-center gap-2 text-sm cursor-pointer disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.99] touch-manipulation"
    >
        {#if isProcessing}
            <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full shrink-0"></span>
            <span>Erstelle Synthese...</span>
        {:else}
            <FileText class="w-4 h-4 shrink-0" />
            <span>Synthetisiertes System-Briefing generieren</span>
        {/if}
    </button>

    <!-- Ergebnis-Bereich nach erfolgreicher Generierung -->
    {#if synthesisResult}
        <div class="mt-3.5 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-3 animate-enter">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                    <span class="text-emerald-600 dark:text-emerald-400 font-bold text-xs">✓</span>
                    <p class="text-xs font-semibold text-slate-700 dark:text-slate-200">System-Briefing erfolgreich zusammengestellt</p>
                </div>
                <button
                    type="button"
                    onclick={onOpenPreview}
                    class="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:text-primary-800 flex items-center gap-1 min-h-[44px] px-2 py-1 cursor-pointer rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 touch-manipulation"
                    title="Volltext-Vorschau ansehen"
                >
                    <Eye class="w-3.5 h-3.5" />
                    <span>Vorschau</span>
                </button>
            </div>

            <!-- Aktionsleiste -->
            <div class="flex flex-col sm:flex-row gap-2">
                <button
                    type="button"
                    onclick={onCopy}
                    class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold py-2.5 px-3 rounded-xl shadow-xs transition-colors min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 touch-manipulation"
                >
                    {#if copySuccess}
                        <Check class="w-4 h-4 text-white" />
                        <span>✓ Kopiert</span>
                    {:else}
                        <Copy class="w-4 h-4" />
                        <span>Kopieren</span>
                    {/if}
                </button>

                <button
                    type="button"
                    onclick={onSavePrompt}
                    disabled={isSavingToPrompts}
                    class="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900 text-white text-xs sm:text-sm font-bold py-2.5 px-3 rounded-xl shadow-xs transition-colors min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 touch-manipulation"
                    title="Als Prompt in system_prompts speichern"
                >
                    {#if isSavingToPrompts}
                        <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full shrink-0"></span>
                        <span>Speichert...</span>
                    {:else if saveSuccess}
                        <Check class="w-4 h-4 text-white" />
                        <span>Gespeichert</span>
                    {:else}
                        <Save class="w-4 h-4" />
                        <span>Als Prompt</span>
                    {/if}
                </button>

                <button
                    type="button"
                    onclick={onDownload}
                    class="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold py-2.5 px-3 rounded-xl transition-colors min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer shrink-0 touch-manipulation"
                    title="Als Markdown-Datei (.md) exportieren"
                >
                    {#if downloadSuccess}
                        <Check class="w-4 h-4 text-emerald-600" />
                        <span>Gespeichert</span>
                    {:else}
                        <Download class="w-4 h-4 text-slate-500" />
                        <span class="hidden sm:inline">Export</span>
                    {/if}
                </button>
            </div>
        </div>
    {/if}
</div>
