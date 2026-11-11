<script lang="ts">
    import { FileText, Sparkles, File as FileIcon, Eye, Download, Loader2 } from "lucide-svelte";
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
    class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-neutral-200/80 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-500/50 hover:shadow-lg transition-all group flex flex-col justify-between text-left cursor-pointer active:scale-[0.99]"
>
    <div class="space-y-3">
        <div class="flex items-center justify-between gap-2">
            <div class="w-11 h-11 rounded-2xl {doc.isPdf ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50' : (doc.isImage ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50')} flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                {#if doc.isPdf}
                    <FileText class="w-5 h-5" />
                {:else if doc.isImage}
                    <Sparkles class="w-5 h-5" />
                {:else}
                    <FileIcon class="w-5 h-5" />
                {/if}
            </div>

            <span class="px-2.5 py-1 rounded-xl text-[10px] font-bold border {badge.color}">
                {badge.label}
            </span>
        </div>

        <div>
            <h4 class="font-black text-neutral-900 dark:text-white text-sm leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2" title={doc.originalName}>
                {doc.name}
            </h4>
            
            <div class="flex items-center gap-2 text-[11px] text-neutral-400 dark:text-slate-400 font-medium mt-1.5 flex-wrap">
                {#if showClientName && doc.clientName}
                    <span class="font-bold text-neutral-700 dark:text-slate-300">{doc.clientName} &bull;</span>
                {/if}
                <span>{formatDate(doc.updated || doc.created)}</span>
                {#if doc.extension}
                    <span class="uppercase font-bold text-neutral-500 dark:text-slate-400 bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[9px]">{doc.extension}</span>
                {/if}
            </div>
        </div>
    </div>

    <div class="flex items-center justify-between pt-4 mt-4 border-t border-neutral-100 dark:border-slate-800 shrink-0">
        <span class="text-xs font-bold text-brand-600 dark:text-brand-400 group-hover:underline flex items-center gap-1.5">
            <Eye class="w-4 h-4" /> Vorschau
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
