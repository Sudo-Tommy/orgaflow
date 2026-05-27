<script lang="ts">
    import BwaTable from "./BwaTable.svelte";
    let { currentBWA, ytdBWA, viewMode, selectedMonth, selectedQuarter, selectedYear, selectedCompanyId } = $props<any>();
    
    let dialog: HTMLDialogElement | undefined = $state();
    export function showModal() { dialog?.showModal(); }
    export function close() { dialog?.close(); }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-6xl mx-auto my-auto rounded-3xl print:hidden" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between mb-6 shrink-0 pr-12">
            <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 flex items-center gap-3"><span class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner text-xl">⚖️</span> Basis-BWA / EÜR Detailansicht</h2>
        </div>
        <button aria-label="Schließen" onclick={close} class="absolute top-6 right-6 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <div class="flex-1 overflow-x-auto custom-scrollbar border border-neutral-100 rounded-2xl">
            <BwaTable {currentBWA} {ytdBWA} {viewMode} {selectedMonth} {selectedQuarter} {selectedYear} {selectedCompanyId} />
        </div>
    </div>
</dialog>