<script lang="ts">
    interface Props {
        availablePdfs: { record: any; filename: string }[];
        selectedPdfFiles: { record: any; filename: string }[];
        disabled: boolean;
    }

    let { availablePdfs, selectedPdfFiles = $bindable(), disabled }: Props = $props();

    function toggleFile(pdf: { record: any; filename: string }) {
        if (selectedPdfFiles.some(f => f.filename === pdf.filename && f.record.id === pdf.record.id)) {
            selectedPdfFiles = selectedPdfFiles.filter(f => !(f.filename === pdf.filename && f.record.id === pdf.record.id));
        } else {
            selectedPdfFiles = [...selectedPdfFiles, pdf];
        }
    }
</script>

<div class="pt-4 mt-4 border-t border-neutral-100 dark:border-slate-800">
    <h3 class="text-sm font-bold text-neutral-900 dark:text-slate-100 flex items-center gap-2 mb-3">
        <span>📎</span> Dokumente zum Senden auswählen
    </h3>
    <div class="space-y-2">
        {#each availablePdfs as pdf}
            <label class="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors shadow-sm">
                <input 
                    type="checkbox" 
                    checked={selectedPdfFiles.some(f => f.filename === pdf.filename && f.record.id === pdf.record.id)} 
                    onchange={() => toggleFile(pdf)} 
                    class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer" 
                    {disabled} 
                />
                <span class="text-sm font-medium text-neutral-800 dark:text-slate-200">{pdf.filename}</span>
            </label>
        {/each}
    </div>
</div>
