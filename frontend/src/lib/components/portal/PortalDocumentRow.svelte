<script lang="ts">
    import { FileText, File as FileIcon, Eye, Download, Loader2 } from "lucide-svelte";
    import { getCategoryBadge, formatDate } from "./portalDocumentHelper";

    let {
        doc,
        showClientName = false,
        isDownloading = false,
        onPreview,
        onDownload
    } = $props<{
        doc: any;
        showClientName?: boolean;
        isDownloading?: boolean;
        onPreview: (doc: any, e: Event) => void;
        onDownload: (doc: any, e: Event) => void;
    }>();

    let badge = $derived(getCategoryBadge(doc.category));
</script>

<div
    role="button"
    tabindex="0"
    onclick={(e) => onPreview(doc, e)}
    onkeydown={(e) => e.key === 'Enter' && onPreview(doc, e)}
    class="p-4 sm:p-5 hover:bg-neutral-50/80 dark:hover:bg-slate-800/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
>
    <div class="flex items-center gap-3.5 min-w-0">
        <div class="w-10 h-10 rounded-xl {doc.isPdf ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50' : 'bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-slate-700'} flex items-center justify-center shrink-0">
            {#if doc.isPdf}
                <FileText class="w-5 h-5" />
            {:else}
                <FileIcon class="w-5 h-5" />
            {/if}
        </div>

        <div class="min-w-0 flex-1">
            <h4 class="font-black text-neutral-900 dark:text-white text-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                {doc.name}
            </h4>
            <div class="flex items-center gap-2 text-xs text-neutral-400 dark:text-slate-400 mt-0.5 flex-wrap">
                {#if showClientName && doc.clientName}
                    <span class="font-bold text-neutral-700 dark:text-slate-300">{doc.clientName} &bull;</span>
                {/if}
                <span>Aktualisiert: {formatDate(doc.updated || doc.created)}</span>
                {#if doc.extension}
                    <span class="uppercase font-bold text-neutral-500 dark:text-slate-400 bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[9px]">{doc.extension}</span>
                {/if}
            </div>
        </div>
    </div>

    <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">
        <span class="px-2.5 py-1 rounded-xl text-[10px] font-bold border {badge.color}">
            {badge.label}
        </span>

        <div class="flex items-center gap-2">
            <button
                type="button"
                onclick={(e) => onPreview(doc, e)}
                class="min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl bg-neutral-50 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 border border-neutral-200 dark:border-slate-700 hover:border-brand-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 touch-manipulation"
                title="Dokument in Vorschau öffnen"
                aria-label="Dokument in Vorschau öffnen"
            >
                <Eye class="w-4 h-4" />
            </button>
            <button
                type="button"
                onclick={(e) => onDownload(doc, e)}
                disabled={isDownloading}
                class="min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl bg-neutral-50 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 border border-neutral-200 dark:border-slate-700 hover:border-brand-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed"
                title="Dokument herunterladen"
                aria-label="Dokument herunterladen"
            >
                {#if isDownloading}
                    <Loader2 class="w-4 h-4 animate-spin text-brand-600" />
                {:else}
                    <Download class="w-4 h-4" />
                {/if}
            </button>
        </div>
    </div>
</div>
