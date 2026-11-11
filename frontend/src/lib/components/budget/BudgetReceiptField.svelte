<script lang="ts">
    import DocumentScanButton from "$lib/components/common/DocumentScanButton.svelte";
    import { Upload, FileText, X } from "lucide-svelte";

    interface Props {
        receiptFile?: File | null;
        existingReceipt?: string | null;
    }

    let { receiptFile = $bindable(null), existingReceipt = null }: Props = $props();
    let fileInput = $state<HTMLInputElement>();

    function handleFileSelected(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) receiptFile = target.files[0];
    }

    function removeReceipt() {
        receiptFile = null;
        if (fileInput) fileInput.value = '';
    }
</script>

<div>
    <span class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
        Beleg / Quittung
    </span>
    <input bind:this={fileInput} type="file" accept="image/*,.pdf" onchange={handleFileSelected} class="hidden" />
    <div class="flex flex-wrap items-center gap-2">
        <button
            type="button"
            onclick={() => fileInput?.click()}
            class="min-h-[44px] px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Datei oder PDF auswählen"
        >
            <Upload class="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Datei wählen</span>
        </button>

        <DocumentScanButton
            variant="compact"
            label="Beleg scannen"
            documentTitle="Budget_Beleg"
            onScanComplete={(file) => { receiptFile = file; }}
        />

        {#if receiptFile}
            <div class="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
                <FileText class="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span class="max-w-[130px] truncate">{receiptFile.name}</span>
                <button type="button" onclick={removeReceipt} class="text-emerald-600 hover:text-rose-600 p-0.5 rounded cursor-pointer" title="Entfernen">
                    <X class="w-3.5 h-3.5" />
                </button>
            </div>
        {:else if existingReceipt}
            <div class="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 px-2.5 py-1.5 rounded-xl text-xs font-medium shadow-2xs">
                <FileText class="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span class="max-w-[130px] truncate">Gespeichert</span>
            </div>
        {/if}
    </div>
</div>
