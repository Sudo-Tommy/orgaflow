<!-- src/lib/components/clients/ClientDocumentList.svelte -->
<script lang="ts">
    import { Edit3, Trash2, Share2, Upload, FileText } from 'lucide-svelte';

    let {
        documents = [],
        isUploading = false,
        onpreview,
        onsend,
        onrename,
        ondelete,
        onpickfile
    } = $props<{
        documents?: string[];
        isUploading?: boolean;
        onpreview: (e: Event, filename: string) => void;
        onsend: (filename: string) => void;
        onrename: (filename: string) => void;
        ondelete: (filename: string) => void;
        onpickfile?: () => void;
    }>();

    function getFileIcon(name: string) {
        const lower = name.toLowerCase();
        if (lower.endsWith('.pdf')) return '📕';
        if (/\.(jpg|jpeg|png|webp|gif|heic|heif|svg)$/i.test(lower)) return '🖼️';
        if (/\.(xls|xlsx|csv|ods)$/i.test(lower)) return '📊';
        if (/\.(doc|docx|odt|rtf|txt)$/i.test(lower)) return '📝';
        if (/\.(zip|7z|rar|tar|gz)$/i.test(lower)) return '📦';
        if (/\.(mp3|wav|m4a|ogg)$/i.test(lower)) return '🎵';
        return '📄';
    }

    function formatDisplayName(name: string): string {
        const ext = name.includes('.') ? name.substring(name.lastIndexOf('.')) : '';
        const base = name.replace(ext, '').replace(/_[a-zA-Z0-9]{10}$/, '');
        return `${base}${ext}`;
    }
</script>

<div class="orga-card-white p-5 sm:p-6 space-y-4">
    <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-400">
            Hinterlegte Dateien ({documents.length})
        </h4>
        {#if documents.length > 0}
            <span class="text-[11px] text-neutral-400 dark:text-slate-500 font-medium">Klicken zum Öffnen</span>
        {/if}
    </div>

    {#if documents.length === 0}
        <div class="text-center py-8 px-4 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-slate-800 space-y-3">
            <div class="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                <FileText class="w-6 h-6" />
            </div>
            <div>
                <p class="text-xs sm:text-sm font-bold text-neutral-800 dark:text-slate-200">Noch keine Dokumente hinterlegt</p>
                <p class="text-[11px] text-neutral-400 dark:text-slate-400 mt-0.5">Scannen Sie einen Beleg oder laden Sie Dokumente hoch</p>
            </div>
            {#if onpickfile}
                <button
                    type="button"
                    onclick={onpickfile}
                    disabled={isUploading}
                    class="orga-button-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                    <Upload class="w-3.5 h-3.5" />
                    <span>Jetzt erste Datei ablegen</span>
                </button>
            {/if}
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            {#each documents as doc}
                <div class="flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-slate-800/80 rounded-2xl border border-neutral-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/30 transition-all group">
                    <button
                        type="button"
                        onclick={(e) => onpreview(e, doc)}
                        class="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                        title={`Originaldatei: ${doc}`}
                    >
                        <span class="text-2xl shrink-0">{getFileIcon(doc)}</span>
                        <div class="min-w-0 flex-1">
                            <p class="text-xs font-bold text-neutral-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {formatDisplayName(doc)}
                            </p>
                            <span class="text-[10px] text-neutral-400 dark:text-slate-400">Vorschau & Herunterladen</span>
                        </div>
                    </button>

                    <div class="flex items-center gap-1 shrink-0 ml-2">
                        <button
                            type="button"
                            onclick={() => onsend(doc)}
                            disabled={isUploading}
                            class="p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                            title="Per E-Mail versenden"
                            aria-label="Dokument per E-Mail versenden"
                        >
                            <Share2 class="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onclick={() => onrename(doc)}
                            disabled={isUploading}
                            class="p-2 text-neutral-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Umbenennen"
                            aria-label="Dokument umbenennen"
                        >
                            <Edit3 class="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onclick={() => ondelete(doc)}
                            disabled={isUploading}
                            class="p-2 text-neutral-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Löschen"
                            aria-label="Dokument löschen"
                        >
                            <Trash2 class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
