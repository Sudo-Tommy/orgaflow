<!-- src/lib/components/support/AttachmentPreviewChips.svelte -->
<script lang="ts">
    import type { ChatAttachment } from '$lib/services/aiLiveSupportService';
    import { X, FileText, Image as ImageIcon, File } from 'lucide-svelte';

    interface Props {
        attachments: ChatAttachment[];
        onRemove: (id: string) => void;
    }

    let { attachments, onRemove }: Props = $props();

    function formatBytes(bytes: number): string {
        if (!bytes || bytes <= 0) return '0 B';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    }
</script>

{#if attachments.length > 0}
    <div class="flex items-center gap-2 flex-wrap py-1.5 px-1 animate-in fade-in">
        {#each attachments as att (att.id)}
            <div class="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-1.5 pr-2.5 shadow-2xs group max-w-full text-xs">
                {#if att.previewUrl || (att.type?.startsWith('image/') && att.base64)}
                    <img
                        src={att.previewUrl || att.base64}
                        alt={att.name}
                        class="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                {:else if att.type?.includes('pdf')}
                    <div class="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold text-[10px]">
                        PDF
                    </div>
                {:else}
                    <div class="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <FileText class="w-4 h-4" />
                    </div>
                {/if}

                <div class="min-w-0 flex-1">
                    <p class="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate max-w-[120px] sm:max-w-[160px]" title={att.name}>
                        {att.name}
                    </p>
                    <p class="text-[10px] text-slate-400 font-medium">
                        {formatBytes(att.size)}
                    </p>
                </div>

                <button
                    type="button"
                    onclick={() => onRemove(att.id)}
                    class="w-5 h-5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
                    title="Anhang entfernen"
                >
                    <X class="w-3.5 h-3.5" />
                </button>
            </div>
        {/each}
    </div>
{/if}

