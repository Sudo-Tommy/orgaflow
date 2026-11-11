<script lang="ts">
    import { FileText, Mail, Upload, Sparkles, FolderOpen, ChevronRight, Edit3, Trash2 } from "lucide-svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";

    let {
        clientData,
        documents = [],
        isUploading,
        onSendEmail,
        onUploadFile,
        onOpenDocGen,
        onPreviewDoc,
        onRenameDoc,
        onDeleteDoc
    } = $props<{
        clientData: any;
        documents: any[];
        isUploading: boolean;
        onSendEmail: () => void;
        onUploadFile: (e: Event) => void;
        onOpenDocGen: () => void;
        onPreviewDoc: (e: Event, docFileName: string) => void;
        onRenameDoc: (docFileName: string) => void;
        onDeleteDoc: (docFileName: string) => void;
    }>();

    let fileInput: HTMLInputElement;
    let isCaregiver = $derived(rbacService.isCaregiver);
</script>

<div class="bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col border-l-4 border-l-amber-500">
    <div class="p-5 sm:p-6 border-b border-neutral-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-50/50 dark:bg-slate-800/40">
        <h3 class="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2.5">
            <span class="w-9 h-9 flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20 shadow-xs">
                <FileText class="w-4 h-4" />
            </span>
            <span>Dokumente &amp; Akte</span>
        </h3>
        <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {#if !isCaregiver}
                <button onclick={onSendEmail} class="orga-button-ghost dark:text-slate-200 dark:border-slate-700 py-1.5 px-3 text-xs font-bold hidden sm:flex items-center gap-1.5 cursor-pointer min-h-[44px]" title="Dokumente per E-Mail versenden">
                    <Mail class="w-3.5 h-3.5" />
                    <span>Senden</span>
                </button>
            {/if}
            <input type="file" multiple bind:this={fileInput} onchange={onUploadFile} class="hidden" disabled={isUploading} accept="*/*" />
            <button onclick={() => fileInput?.click()} disabled={isUploading} class="orga-button-ghost dark:text-slate-200 dark:border-slate-700 py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]" title="Einfache Datei hochladen">
                <Upload class="w-3.5 h-3.5" />
                <span>{isUploading ? 'Lädt...' : 'Hochladen'}</span>
            </button>
            {#if !isCaregiver}
                <button onclick={onOpenDocGen} class="orga-button-primary py-1.5 px-3.5 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[44px]" title="Dokument aus Vorlage generieren">
                    <Sparkles class="w-3.5 h-3.5" />
                    <span>Aus Vorlage</span>
                </button>
            {/if}
        </div>
    </div>
    <div class="p-5 sm:p-6">
        {#if documents.length === 0 && (!clientData?.documents || clientData.documents.length === 0)}
            <div class="text-center py-10 border-2 border-dashed border-neutral-200 dark:border-slate-700 rounded-2xl bg-neutral-50/50 dark:bg-slate-800/30">
                <FolderOpen class="w-10 h-10 text-neutral-300 dark:text-slate-600 mx-auto mb-2" />
                <p class="text-neutral-500 dark:text-slate-400 font-bold text-sm mb-1">Die Akte ist noch leer.</p>
                <p class="text-neutral-400 dark:text-slate-500 text-xs">Laden Sie Scans (PDF/Bilder) hoch.</p>
            </div>
        {:else}
            <div class="space-y-5">
                {#if clientData?.documents && clientData.documents.length > 0}
                    <div>
                        <h4 class="text-[10px] font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider mb-2.5">Hinterlegte Dokumente</h4>
                        <div class="grid grid-cols-1 gap-2">
                            {#each clientData.documents as docFileName}
                                <div class="group flex items-center justify-between p-3 rounded-2xl border border-neutral-200/70 dark:border-slate-700/70 bg-white dark:bg-slate-800/50 hover:border-amber-400/60 dark:hover:border-amber-500/60 hover:bg-amber-50/20 dark:hover:bg-amber-950/20 transition-all shadow-xs hover:shadow-md">
                                    <button type="button" onclick={(e) => onPreviewDoc(e, docFileName)} class="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer min-h-[44px]">
                                        <div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 group-hover:scale-110 transition-transform">
                                            <FileText class="w-4 h-4" />
                                        </div>
                                        <div class="truncate"><p class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate" title={docFileName}>{docFileName}</p></div>
                                    </button>
                                    <div class="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <button onclick={() => onRenameDoc(docFileName)} disabled={isUploading} class="p-2 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center" title="Umbenennen">
                                            <Edit3 class="w-4 h-4" />
                                        </button>
                                        <button onclick={() => onDeleteDoc(docFileName)} disabled={isUploading} class="p-2 text-neutral-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center" title="Löschen">
                                            <Trash2 class="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if !isCaregiver && documents.length > 0}
                    <div>
                        <h4 class="text-[10px] font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider mb-2.5">System-Vorlagen</h4>
                        <div class="grid grid-cols-1 gap-2">
                            {#each documents as doc}
                                <a href="/documents/{doc.id}" class="group flex items-center gap-3 p-3 rounded-2xl border border-neutral-200/70 dark:border-slate-700/70 bg-white dark:bg-slate-800/50 hover:border-indigo-400/60 dark:hover:border-indigo-500/60 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer shadow-xs hover:shadow-md min-h-[44px]">
                                    <div class="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                        <Sparkles class="w-4 h-4" />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">{doc.title || 'Dokument'}</p>
                                        <p class="text-[10px] text-neutral-400 dark:text-slate-500 mt-0.5">{doc.created ? new Date(doc.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Unbekannt'}</p>
                                    </div>
                                    <span class="text-indigo-600 dark:text-indigo-400 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <ChevronRight class="w-4 h-4" />
                                    </span>
                                </a>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>
