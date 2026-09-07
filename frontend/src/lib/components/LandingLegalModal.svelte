<script lang="ts">
    import { getLegalContent } from "$lib/services/landingContentService";
    
    const content = getLegalContent();
    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;

    // Öffentliche Funktionen, damit der Footer das Modal steuern kann
    export function open() {
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }
</script>

<!-- Backdrop-Styling macht den Hintergrund leicht unscharf und dunkel -->
<dialog 
    bind:this={dialog} 
    class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-4xl mx-auto my-auto rounded-3xl"
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-3xl p-8 md:p-12 w-full max-h-[85vh] overflow-y-auto custom-scrollbar relative shadow-2xl dark:shadow-black/60 transition-colors">
        
        <!-- Schließen X-Button oben rechts -->
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-6 right-6 w-11 h-11 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] cursor-pointer">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h2 class="text-3xl font-bold text-neutral-900 dark:text-white mb-8">Impressum & Datenschutz</h2>
        
        <div class="legal-content text-neutral-700 dark:text-slate-300">
            {@html content.impressum}
            <hr class="my-10 border-neutral-200 dark:border-slate-800" />
            {@html content.datenschutz}
        </div>
        
        <div class="mt-10 flex justify-end">
            <button onclick={close} class="orga-button-ghost dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 w-full sm:w-auto min-h-[44px]">Schließen</button>
        </div>
    </div>
</dialog>

<style>
    /* Scoped Styling für die eingefügten HTML-Inhalte aus dem Service */
    .legal-content :global(h3) { font-size: 1.5rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #36150e; }
    .legal-content :global(h4) { font-size: 1.125rem; font-weight: 700; margin-top: 1.25rem; margin-bottom: 0.5rem; color: #7b3623; }
    .legal-content :global(p) { margin-bottom: 1rem; line-height: 1.6; }
    .legal-content :global(strong) { font-weight: 600; color: #171717; }

    :global(.dark) .legal-content :global(h3) { color: #fed7aa; }
    :global(.dark) .legal-content :global(h4) { color: #fde68a; }
    :global(.dark) .legal-content :global(strong) { color: #f8fafc; }
    :global(.dark) .legal-content :global(a) { color: #f59e0b; }
</style>