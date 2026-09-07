<script lang="ts">
    import { getServices } from "$lib/services/landingContentService";
    
    const services = getServices();
    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;

    export function open() {
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-4xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-3xl p-8 md:p-12 w-full max-h-[85vh] overflow-y-auto custom-scrollbar relative shadow-2xl dark:shadow-black/60 transition-colors">
        <button aria-label="Schließen" onclick={close} class="absolute top-6 right-6 w-11 h-11 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] cursor-pointer">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-3xl font-bold text-brand-950 dark:text-white mb-8">Unsere Leistungen im Detail</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            {#each services as svc}
                <div class="bg-amber-50/50 dark:bg-slate-800/60 p-6 rounded-2xl border border-amber-100/50 dark:border-slate-700/60 transition-colors">
                    <div class="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 text-brand-800 dark:text-amber-400 rounded-xl flex items-center justify-center mb-4 shadow-inner">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d={svc.iconPath} /></svg>
                    </div>
                    <h3 class="text-xl font-bold mb-2 text-neutral-900 dark:text-slate-100">{svc.title}</h3>
                    <p class="text-neutral-600 dark:text-slate-300 leading-relaxed text-base">{svc.description}</p>
                </div>
            {/each}
        </div>
    </div>
</dialog>