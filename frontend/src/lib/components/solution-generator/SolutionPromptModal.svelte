<script lang="ts">
    import { toastStore } from '$lib/services/toastService.svelte';
    import { autoGrow } from '$lib/actions/autoGrow';
    import { requestSolutionConcept } from '$lib/services/solutionGeneratorApi';
    import { X, Sparkles, Check, Loader2, Copy, RefreshCw } from 'lucide-svelte';

    interface Props {
        onApply?: (concept: string) => void;
    }

    let { onApply }: Props = $props();

    let dialog: HTMLDialogElement;
    let isOpen = $state(false);
    let isLoading = $state(false);
    let errorMsg = $state('');

    let title = $state('');
    let description = $state('');
    let category = $state('Core Engine & API');
    let context = $state('');
    let generatedConcept = $state('');

    let currentCallback: ((concept: string) => void) | null = null;
    let canGenerate = $derived((!!title.trim() || !!description.trim()) && !isLoading);

    export function open(options: {
        title?: string;
        description?: string;
        category?: string;
        context?: string;
        currentConcept?: string;
    } = {}, callback?: (concept: string) => void) {
        currentCallback = callback || null;
        title = options.title || '';
        description = options.description || '';
        category = options.category || 'Core Engine & API';
        context = options.context || '';
        generatedConcept = options.currentConcept || '';
        errorMsg = '';
        isOpen = true;
        dialog?.showModal();

        if (!generatedConcept && (title.trim() || description.trim())) {
            generate();
        }
    }

    export function close() {
        isOpen = false;
        dialog?.close();
    }

    async function generate() {
        if (isLoading) return;
        if (!title.trim() && !description.trim()) {
            toastStore.warning('Bitte geben Sie mindestens einen Titel oder eine Problembeschreibung an.');
            return;
        }

        isLoading = true;
        errorMsg = '';

        try {
            generatedConcept = await requestSolutionConcept({
                title: title.trim(),
                description: description.trim(),
                category,
                context
            });
            toastStore.success('Lösungs- und Maßnahmenkonzept erfolgreich generiert! ✨');
        } catch (err: any) {
            console.error('[Solution Generator Error]:', err);
            errorMsg = err.message || 'Die Generierung konnte nicht abgeschlossen werden.';
            toastStore.error(errorMsg);
        } finally {
            isLoading = false;
        }
    }

    function applyConcept() {
        if (!generatedConcept.trim()) {
            toastStore.warning('Es liegt kein generiertes Konzept zur Übernahme vor.');
            return;
        }

        if (currentCallback) {
            currentCallback(generatedConcept);
        } else if (onApply) {
            onApply(generatedConcept);
        }

        toastStore.success('Konzept in Formular übernommen! ✅');
        close();
    }

    async function copyToClipboard() {
        if (!generatedConcept.trim()) return;
        try {
            await navigator.clipboard.writeText(generatedConcept);
            toastStore.info('In die Zwischenablage kopiert! 📋');
        } catch {
            toastStore.error('Kopieren fehlgeschlagen.');
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal backdrop:bg-neutral-950/60 backdrop:backdrop-blur-sm bg-transparent p-0 w-full max-w-3xl mx-auto my-6 sm:my-10 rounded-3xl shadow-2xl transition-all border-0 open:flex open:flex-col"
>
    <div class="bg-white flex flex-col w-full rounded-3xl border border-neutral-200">
        <!-- Header -->
        <div class="px-6 py-4 bg-gradient-to-r from-brand-500/10 via-indigo-50 to-white border-b border-neutral-100 flex items-center justify-between shrink-0 rounded-t-3xl">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-lg shadow-sm shadow-brand-600/30 shrink-0">
                    <Sparkles class="w-5 h-5" />
                </div>
                <div>
                    <h2 class="text-base font-bold text-neutral-900 leading-tight flex items-center gap-2">
                        <span>Automatisierter Lösungs- & Maßnahmen-Assistent</span>
                        <span class="text-[10px] font-black text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Core Engine</span>
                    </h2>
                    <p class="text-xs text-neutral-500">
                        Generiert strukturierte Handlungsoptionen und technische Konzepte per 1-Klick
                    </p>
                </div>
            </div>
            <button
                type="button"
                onclick={close}
                class="min-h-[44px] min-w-[44px] p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                title="Schließen"
                aria-label="Schließen"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-5 flex-1">
            <div class="bg-neutral-50 rounded-2xl p-4 border border-neutral-100 space-y-2">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Ausgangslage</span>
                    <span class="text-[11px] font-bold text-neutral-700 bg-neutral-200/70 px-2.5 py-0.5 rounded-full">
                        {category}
                    </span>
                </div>
                <h3 class="text-sm font-black text-neutral-900 leading-snug">
                    {title || 'Ohne Titel'}
                </h3>
                {#if description}
                    <p class="text-xs text-neutral-600 line-clamp-3 leading-relaxed">
                        {description}
                    </p>
                {/if}
            </div>

            {#if errorMsg}
                <div class="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                    ⚠️ {errorMsg}
                </div>
            {/if}

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <label for="generated-solution-text" class="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                        <span>Generiertes Konzept & Maßnahmenplan</span>
                        {#if isLoading}
                            <span class="inline-flex items-center gap-1 text-[11px] text-brand-600 font-semibold animate-pulse">
                                <Loader2 class="w-3.5 h-3.5 animate-spin" /> Analysiert und formuliert...
                            </span>
                        {/if}
                    </label>
                    {#if generatedConcept}
                        <button
                            type="button"
                            onclick={copyToClipboard}
                            class="text-[11px] font-bold text-neutral-500 hover:text-brand-600 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                            <Copy class="w-3 h-3" /> Text kopieren
                        </button>
                    {/if}
                </div>

                <div class="relative">
                    <textarea
                        use:autoGrow
                        id="generated-solution-text"
                        bind:value={generatedConcept}
                        rows="8"
                        placeholder={isLoading ? "Lösungs- und Maßnahmenkonzept wird strukturiert erstellt..." : "Klicken Sie auf 'Lösungskonzept generieren', um den automatisierten Vorschlags-Assistenten zu starten."}
                        disabled={isLoading}
                        class="auto-grow orga-input-clear text-xs py-3 px-3.5 w-full bg-neutral-50 focus:bg-white leading-relaxed resize-none font-sans {isLoading ? 'opacity-60 animate-pulse' : ''}"
                    ></textarea>

                    {#if isLoading}
                        <div class="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center gap-3">
                            <div class="w-10 h-10 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                            <p class="text-xs font-bold text-brand-800">Erstelle strukturiertes Lösungs- und Maßnahmenkonzept...</p>
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 rounded-b-3xl">
            <div class="flex items-center gap-2 w-full sm:w-auto">
                <button
                    type="button"
                    onclick={generate}
                    disabled={!canGenerate}
                    class="orga-button-secondary min-h-[44px] min-w-[44px] px-5 text-xs font-bold w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {#if isLoading}
                        <Loader2 class="w-4 h-4 animate-spin" />
                        <span>Wird generiert...</span>
                    {:else}
                        <RefreshCw class="w-4 h-4" />
                        <span>{generatedConcept ? 'Neu generieren' : 'Lösungskonzept generieren'}</span>
                    {/if}
                </button>
            </div>

            <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                    type="button"
                    onclick={close}
                    disabled={isLoading}
                    class="orga-button-ghost min-h-[44px] min-w-[44px] px-4 text-xs text-neutral-600 font-semibold cursor-pointer"
                >
                    Abbrechen
                </button>

                <button
                    type="button"
                    onclick={applyConcept}
                    disabled={isLoading || !generatedConcept.trim()}
                    class="orga-button-primary min-h-[44px] min-w-[44px] px-6 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-brand-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    <Check class="w-4 h-4" />
                    <span>In Formular übernehmen</span>
                </button>
            </div>
        </div>
    </div>
</dialog>
