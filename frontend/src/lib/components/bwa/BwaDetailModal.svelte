<script lang="ts">
    import BwaTable from "./BwaTable.svelte";
    let { currentBWA, ytdBWA, viewMode, selectedMonth, selectedQuarter, selectedYear, selectedCompanyId } = $props<any>();
    
    let dialog: HTMLDialogElement | undefined = $state();
    export function showModal() { dialog?.showModal(); }
    export function close() { dialog?.close(); }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-3xl mx-auto my-auto rounded-3xl print:hidden" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 w-full h-auto flex flex-col relative shadow-2xl border border-neutral-100 dark:border-slate-800">
        <div class="flex items-center justify-between mb-4 sm:mb-6 shrink-0 pr-10">
            <h2 class="text-base sm:text-xl md:text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
                <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner text-base sm:text-xl shrink-0">⚖️</span> 
                Basis-BWA / EÜR Detailansicht
            </h2>
        </div>
        <button aria-label="Schließen" onclick={close} class="absolute top-4 sm:top-6 right-4 sm:right-6 w-9 h-9 sm:w-10 sm:h-10 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-90">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <div class="flex-1 overflow-x-auto custom-scrollbar border border-neutral-100 dark:border-slate-800 rounded-2xl touch-pan-x">
            <BwaTable {currentBWA} {ytdBWA} {viewMode} {selectedMonth} {selectedQuarter} {selectedYear} {selectedCompanyId} />
        </div>
    </div>
</dialog>