<script lang="ts">
    import { tick } from "svelte";
    import { X, FileText, Mic, Check, RotateCcw } from "lucide-svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { autoGrow } from "$lib/actions/autoGrow";

    let dialog = $state<HTMLDialogElement | null>(null);
    let textareaEl = $state<HTMLTextAreaElement | null>(null);

    let isOpen = $state(false);
    let isSaving = $state(false);

    let title = $state("Aktenvermerk & Notizen bearbeiten");
    let subtitle = $state("Vollständige Ansicht und bequeme Bearbeitung aller Vermerke.");
    let placeholder = $state("Wichtige Vereinbarungen, Notizen, Diagnosen oder Absprachen...");
    let text = $state("");
    let originalText = $state("");

    let saveCallback = $state<((val: string) => Promise<void> | void) | null>(null);
    let aiDictateCallback = $state<(() => void) | null>(null);

    let charCount = $derived(text.length);
    let wordCount = $derived(text.trim() ? text.trim().split(/\s+/).length : 0);
    let isDirty = $derived(text !== originalText);

    export async function open(
        initialText: string = "",
        onSave: (val: string) => Promise<void> | void,
        options?: {
            title?: string;
            subtitle?: string;
            placeholder?: string;
            onAiDictate?: () => void;
        }
    ) {
        text = initialText || "";
        originalText = text;
        saveCallback = onSave;
        if (options?.title) title = options.title;
        if (options?.subtitle) subtitle = options.subtitle;
        if (options?.placeholder) placeholder = options.placeholder;
        aiDictateCallback = options?.onAiDictate || null;

        isOpen = true;
        dialog?.showModal();
        await tick();
        if (textareaEl) {
            textareaEl.focus();
            textareaEl.setSelectionRange(text.length, text.length);
        }
    }

    export async function close(force: boolean = false) {
        if (!force && isDirty) {
            const discard = await confirmStore.ask(
                "Du hast ungespeicherte Änderungen vorgenommen. Möchtest du diese wirklich verwerfen?",
                "Ungespeicherte Änderungen",
                "Verwerfen",
                "Weiter bearbeiten",
                true
            );
            if (!discard) return;
        }
        isOpen = false;
        dialog?.close();
    }

    async function handleSave() {
        if (!saveCallback) {
            close(true);
            return;
        }

        isSaving = true;
        try {
            await saveCallback(text);
            originalText = text;
            toastStore.success("Notizen erfolgreich gesichert.");
            close(true);
        } catch (e: any) {
            console.error("Fehler beim Speichern der Notizen:", e);
            toastStore.error(e?.message || "Fehler beim Speichern.");
        } finally {
            isSaving = false;
        }
    }

    function handleReset() {
        text = originalText;
        if (textareaEl) {
            textareaEl.focus();
        }
    }

    function handleKeyDown(e: KeyboardEvent) {
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
            e.preventDefault();
            if (isDirty && !isSaving) {
                handleSave();
            }
        }
        if (e.key === "Escape") {
            e.preventDefault();
            close();
        }
    }

    export function appendText(extra: string) {
        if (!extra) return;
        text = text ? text + "\n\n" + extra : extra;
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/75 backdrop:backdrop-blur-md w-full max-w-3xl mx-auto my-auto rounded-3xl border-none shadow-2xl z-[99999]"
    onkeydown={handleKeyDown}
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    {#if isOpen}
        <div class="bg-white dark:bg-slate-900 rounded-3xl w-full relative shadow-2xl border border-slate-200/80 dark:border-slate-800">
            <!-- Header -->
            <div class="px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between gap-3 shrink-0 rounded-t-3xl">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center shrink-0">
                        <FileText class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {title}
                            {#if isDirty}
                                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60">
                                    Geändert
                                </span>
                            {/if}
                        </h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                            {subtitle}
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    {#if aiDictateCallback}
                        <button
                            type="button"
                            onclick={aiDictateCallback}
                            class="text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
                            title="KI-Diktat starten"
                        >
                            <Mic class="w-3.5 h-3.5" />
                            <span class="hidden sm:inline">KI-Diktat</span>
                        </button>
                    {/if}

                    <button
                        type="button"
                        aria-label="Schließen"
                        onclick={() => close()}
                        class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                    >
                        <X class="w-4 h-4" />
                    </button>
                </div>
            </div>

            <!-- Body / Text Editor Canvas (Auto-Grow, kein innerer Scrollbar) -->
            <div class="p-4 sm:p-6 bg-slate-50/40 dark:bg-slate-950/40">
                <textarea
                    use:autoGrow
                    bind:this={textareaEl}
                    bind:value={text}
                    {placeholder}
                    rows="10"
                    class="auto-grow w-full p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner min-h-[300px] overflow-hidden"
                ></textarea>
            </div>

            <!-- Footer Toolbar -->
            <div class="px-5 sm:px-7 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0 rounded-b-3xl">
                <!-- Word & Char Counter -->
                <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium">
                        {charCount} Zeichen
                    </span>
                    <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium">
                        {wordCount} Wörter
                    </span>
                    {#if isDirty}
                        <button
                            type="button"
                            onclick={handleReset}
                            class="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors px-2 py-1 rounded cursor-pointer"
                            title="Auf Originaltext zurücksetzen"
                        >
                            <RotateCcw class="w-3 h-3" />
                            <span class="hidden sm:inline">Rückgängig</span>
                        </button>
                    {/if}
                </div>

                <!-- Primary & Secondary Actions -->
                <div class="flex items-center gap-2.5 ml-auto">
                    <button
                        type="button"
                        onclick={() => close()}
                        disabled={isSaving}
                        class="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        Abbrechen
                    </button>

                    <button
                        type="button"
                        onclick={handleSave}
                        disabled={isSaving || !isDirty}
                        class="px-5 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                               {isDirty ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30' : 'bg-slate-400 dark:bg-slate-700'}"
                    >
                        {#if isSaving}
                            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Speichert...</span>
                        {:else}
                            <Check class="w-4 h-4" />
                            <span>Notizen speichern</span>
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    {/if}
</dialog>
