<script lang="ts">
    import { Paperclip, Eye, X } from "lucide-svelte";

    let { modalState, previewAttachment } = $props<{
        modalState: any;
        previewAttachment: (file: File) => void;
    }>();

    // svelte-ignore non_reactive_update
    let fileInput: HTMLInputElement;

    function handleFileSelect(e: Event) {
        const input = e.target as HTMLInputElement;
        if (input.files) {
            modalState.attachments = [...modalState.attachments, ...Array.from(input.files)];
        }
        input.value = "";
    }

    function removeAttachment(index: number) {
        modalState.attachments = modalState.attachments.filter((_: any, i: number) => i !== index);
    }
</script>

<div class="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
    <div class="flex items-center justify-between mb-2.5">
        <h3 class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Paperclip class="w-3.5 h-3.5 text-slate-400" />
            <span>Dokumente oder Fotos anhängen</span>
        </h3>
        <input type="file" bind:this={fileInput} multiple class="hidden" onchange={handleFileSelect} disabled={modalState.isLoading} />
        <button
            type="button"
            onclick={() => fileInput?.click()}
            class="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 transition-colors flex items-center gap-1 bg-brand-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-brand-200/60 dark:border-slate-700 cursor-pointer min-h-[44px]"
            disabled={modalState.isLoading}
        >
            + Datei wählen
        </button>
    </div>

    {#if modalState.attachments.length > 0}
        <div class="flex flex-wrap gap-2 mb-4">
            {#each modalState.attachments as file, i}
                <div class="flex items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 shadow-2xs max-w-full">
                    <span class="truncate flex-1 font-bold">{file.name}</span>
                    {#if file.type === "application/pdf" || file.type.startsWith("image/")}
                        <button
                            type="button"
                            onclick={() => previewAttachment(file)}
                            class="shrink-0 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer p-1"
                            title="Vorschau"
                            disabled={modalState.isLoading}
                        >
                            <Eye class="w-3.5 h-3.5" />
                        </button>
                    {/if}
                    <button
                        type="button"
                        onclick={() => removeAttachment(i)}
                        class="shrink-0 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer p-1"
                        title="Entfernen"
                        disabled={modalState.isLoading}
                    >
                        <X class="w-3.5 h-3.5" />
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</div>
