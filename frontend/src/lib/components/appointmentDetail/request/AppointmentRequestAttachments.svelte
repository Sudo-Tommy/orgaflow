<script lang="ts">
    import { Paperclip, FileText } from "lucide-svelte";

    interface Props {
        attachments: string[];
        onPreview: (filename: string) => void;
    }

    let { attachments, onPreview }: Props = $props();
</script>

{#if attachments && attachments.length > 0}
    <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Paperclip class="w-4 h-4" />
            <span>Angehängte Dokumente ({attachments.length})</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {#each attachments as attachment}
                <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <FileText class="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={attachment}>{attachment}</span>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onclick={() => onPreview(attachment)}
                            class="min-h-[44px] px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 cursor-pointer transition-colors touch-manipulation"
                        >
                            Vorschau
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    </div>
{/if}
