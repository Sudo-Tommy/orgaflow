<script lang="ts">
    import { onMount } from "svelte";
    import { Folder, ShieldCheck } from "lucide-svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { resolveDocumentUrl, downloadFileAsBlob } from "$lib/utils/documentUrl";
    import PortalDocumentUploadCard from "./PortalDocumentUploadCard.svelte";
    import PortalDocumentFilterBar from "./PortalDocumentFilterBar.svelte";
    import PortalDocumentGridCard from "./PortalDocumentGridCard.svelte";
    import PortalDocumentRow from "./PortalDocumentRow.svelte";

    let { documents = [], myClients = [], userType = 'client', onPreview, onRefresh } = $props<{
        documents: any[];
        myClients?: any[];
        userType?: string;
        onPreview: (url: string, title: string, filename: string) => void;
        onRefresh?: () => Promise<void> | void;
    }>();

    let searchQuery = $state("");
    let selectedCategory = $state<string>("all");
    let selectedClientFilter = $state<string>("all");
    let viewMode = $state<'grid' | 'list'>('grid');
    let downloadingDocId = $state<string | null>(null);

    onMount(() => {
        searchQuery = "";
    });

    let filteredDocuments = $derived.by(() => {
        let list = documents;
        if (selectedCategory !== 'all') {
            list = list.filter((doc: any) => (doc.category || 'Sonstige Dokumente') === selectedCategory);
        }
        if (selectedClientFilter !== 'all') {
            list = list.filter((doc: any) => doc.clientId === selectedClientFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((doc: any) => {
                const name = (doc.name || '').toLowerCase();
                const orig = (doc.originalName || '').toLowerCase();
                const cat = (doc.category || '').toLowerCase();
                const cl = (doc.clientName || '').toLowerCase();
                return name.includes(q) || orig.includes(q) || cat.includes(q) || cl.includes(q);
            });
        }
        return list;
    });

    let categoryCounts = $derived.by(() => {
        const counts: Record<string, number> = { all: documents.length };
        for (const doc of documents) {
            const cat = doc.category || 'Sonstige Dokumente';
            counts[cat] = (counts[cat] || 0) + 1;
        }
        return counts;
    });

    async function handleDownload(doc: any, e: Event) {
        e.stopPropagation();
        if (!doc.url || downloadingDocId) return;

        downloadingDocId = doc.id;
        const rawFilename = doc.name || doc.filename || 'dokument.pdf';
        const ext = doc.extension || (rawFilename.includes('.') ? rawFilename.split('.').pop() : 'pdf');
        const filename = rawFilename.toLowerCase().endsWith(`.${ext.toLowerCase()}`) ? rawFilename : `${rawFilename}.${ext}`;

        toastStore.info(`Download für "${filename}" wird vorbereitet...`);
        try {
            const result = await downloadFileAsBlob(doc.url, filename);
            if (!result.success) {
                toastStore.error(result.error || "Download fehlgeschlagen.");
            } else {
                toastStore.success(`"${filename}" erfolgreich heruntergeladen.`);
            }
        } catch (err: any) {
            console.error("Download error:", err);
            toastStore.error(err.message || "Fehler beim Herunterladen des Dokuments.");
        } finally {
            downloadingDocId = null;
        }
    }

    function handlePreviewClick(doc: any, e: Event) {
        e.stopPropagation();
        const cleanUrl = resolveDocumentUrl(doc.url);
        onPreview(cleanUrl, doc.name, doc.filename);
    }
</script>

<div class="space-y-6 animate-enter">
    <!-- HEADER & STATUS BAR -->
    <div class="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xl overflow-hidden relative">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                <div class="flex items-center gap-2 mb-2">
                    <span class="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        <Folder class="w-3 h-3" /> Dokumenten-Ablage
                    </span>
                    <span class="text-xs font-bold text-neutral-400 dark:text-slate-500">&bull;</span>
                    <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck class="w-3.5 h-3.5" /> DSGVO-gesichert
                    </span>
                </div>
                <h2 class="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                    {userType === 'client' ? 'Ihre Dokumente & Akten' : 'Dokumente & Akten der Klienten'}
                </h2>
                <p class="text-neutral-500 dark:text-slate-400 font-medium text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                    Alle Pflegeverträge, Bescheide der Pflegekasse, Vollmachten und Unterlagen sicher an einem zentralen Ort digital einsehen, herunterladen oder neue Scans einreichen.
                </p>
            </div>

            <!-- Schnell-Statistiken -->
            <div class="flex items-center gap-3 shrink-0">
                <div class="px-4 py-3 bg-neutral-50 dark:bg-slate-800/80 rounded-2xl border border-neutral-200 dark:border-slate-700 text-center min-w-[100px]">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-400">Gesamt</span>
                    <p class="text-xl font-black text-neutral-900 dark:text-white">{documents.length}</p>
                </div>
                <div class="px-4 py-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 text-center min-w-[100px]">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Verträge</span>
                    <p class="text-xl font-black text-indigo-900 dark:text-indigo-200">{categoryCounts['Verträge & Vereinbarungen'] || 0}</p>
                </div>
                <div class="px-4 py-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 text-center min-w-[100px]">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Bescheide</span>
                    <p class="text-xl font-black text-emerald-900 dark:text-emerald-200">{categoryCounts['Pflegekassenbescheide'] || 0}</p>
                </div>
            </div>
        </div>

        <!-- UPLOAD CARD -->
        <PortalDocumentUploadCard {myClients} {documents} {onRefresh} />
    </div>

    <!-- FILTER & SUCHLEISTE -->
    <PortalDocumentFilterBar 
        bind:searchQuery 
        bind:selectedCategory 
        bind:selectedClientFilter 
        bind:viewMode 
        {myClients} 
        {categoryCounts} 
    />

    <!-- DOKUMENTEN-LISTE -->
    {#if filteredDocuments.length === 0}
        <div class="bg-white dark:bg-slate-900 p-12 sm:p-16 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xl text-center space-y-4">
            <div class="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-slate-800 text-neutral-400 dark:text-slate-400 flex items-center justify-center mx-auto text-2xl shadow-inner">
                📁
            </div>
            <div>
                <h3 class="text-base font-black text-neutral-900 dark:text-white">Keine Dokumente gefunden</h3>
                <p class="text-xs text-neutral-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                    {#if searchQuery || selectedCategory !== 'all' || selectedClientFilter !== 'all'}
                        Es wurden keine Dokumente gefunden, die den gewählten Filtern entsprechen.
                    {:else}
                        Für diese Akte sind aktuell noch keine Dokumente hinterlegt. Nutzen Sie den Upload-Bereich oben, um neue Dateien hochzuladen.
                    {/if}
                </p>
            </div>
            {#if searchQuery || selectedCategory !== 'all' || selectedClientFilter !== 'all'}
                <button
                    type="button"
                    onclick={() => { searchQuery = ""; selectedCategory = "all"; selectedClientFilter = "all"; }}
                    class="orga-button-ghost text-xs font-bold px-4 py-2 dark:text-slate-300 dark:hover:bg-slate-800 min-h-[44px]"
                >
                    Filter zurücksetzen
                </button>
            {/if}
        </div>
    {:else if viewMode === 'grid'}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {#each filteredDocuments as doc (doc.id)}
                <PortalDocumentGridCard 
                    {doc}
                    showClientName={myClients.length > 1}
                    isDownloading={downloadingDocId === doc.id}
                    onPreview={handlePreviewClick}
                    onDownload={handleDownload}
                />
            {/each}
        </div>
    {:else}
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xl overflow-hidden">
            <div class="divide-y divide-neutral-100 dark:divide-slate-800">
                {#each filteredDocuments as doc (doc.id)}
                    <PortalDocumentRow 
                        {doc}
                        showClientName={myClients.length > 1}
                        isDownloading={downloadingDocId === doc.id}
                        onPreview={handlePreviewClick}
                        onDownload={handleDownload}
                    />
                {/each}
            </div>
        </div>
    {/if}

    <!-- SICHERHEITSHINWEIS & DSGVO -->
    <div class="p-5 bg-neutral-50 dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 rounded-2xl flex items-start gap-3.5 text-neutral-600 dark:text-slate-300">
        <ShieldCheck class="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div class="text-xs leading-relaxed">
            <p class="font-bold text-neutral-800 dark:text-slate-200">Höchster Datenschutz &amp; Integrität Ihrer Dokumente</p>
            <p class="text-neutral-500 dark:text-slate-400 mt-0.5">
                Alle Unterlagen und Anhänge werden verschlüsselt gespeichert und sind strikt nach den gesetzlichen Bestimmungen der DSGVO geschützt. Zugriff haben ausschließlich autorisierte Klienten, bevollmächtigte Angehörige und das betreuende Assistenzteam.
            </p>
        </div>
    </div>
</div>
