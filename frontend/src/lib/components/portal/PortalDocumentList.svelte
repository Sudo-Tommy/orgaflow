<script lang="ts">
    import { onMount } from "svelte";
    import { fade, slide } from "svelte/transition";
    import {
        FileText,
        Download,
        Eye,
        UploadCloud,
        Search,
        Folder,
        File as FileIcon,
        FileCheck,
        ShieldCheck,
        CheckCircle2,
        Clock,
        Filter,
        X,
        Sparkles,
        User,
        LayoutGrid,
        List,
        ArrowUpDown,
        AlertCircle,
        Loader2
    } from "lucide-svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { resolveDocumentUrl, downloadFileAsBlob } from "$lib/utils/documentUrl";

    let { documents = [], myClients = [], userType = 'client', onPreview, onRefresh } = $props<{
        documents: any[];
        myClients?: any[];
        userType?: string;
        onPreview: (url: string, title: string, filename: string) => void;
        onRefresh?: () => Promise<void> | void;
    }>();

    // State
    let searchQuery = $state("");
    let selectedCategory = $state<string>("all");
    let selectedClientFilter = $state<string>("all");
    let viewMode = $state<'grid' | 'list'>('grid');
    let isUploading = $state(false);
    let uploadProgress = $state(0);
    let isDraggingOver = $state(false);
    let downloadingDocId = $state<string | null>(null);
    let fileInputElement: HTMLInputElement | undefined = $state();

    // Upload dialog / form state
    let uploadClientId = $state<string>("");
    let uploadCategory = $state<string>("Verträge & Vereinbarungen");

    const categories = [
        { id: "all", label: "Alle Dokumente", icon: Folder },
        { id: "Verträge & Vereinbarungen", label: "Verträge & Vereinbarungen", icon: FileCheck, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
        { id: "Pflegekassenbescheide", label: "Pflegekassenbescheide", icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
        { id: "Vollmachten & Verfügungen", label: "Vollmachten & Verfügungen", icon: FileText, color: "text-amber-600 bg-amber-50 border-amber-200" },
        { id: "Scans & Nachweise", label: "Scans & Nachweise", icon: Sparkles, color: "text-blue-600 bg-blue-50 border-blue-200" },
        { id: "Sonstige Dokumente", label: "Sonstige Dokumente", icon: FileIcon, color: "text-neutral-600 bg-neutral-100 border-neutral-200" }
    ];

    onMount(() => {
        searchQuery = "";
        if (myClients.length > 0 && !uploadClientId) {
            uploadClientId = myClients[0].id;
        }
    });

    $effect(() => {
        if (myClients.length > 0 && !uploadClientId) {
            uploadClientId = myClients[0].id;
        }
    });

    // Filtering
    let filteredDocuments = $derived.by(() => {
        let list = documents;

        // Category Filter
        if (selectedCategory !== 'all') {
            list = list.filter((doc: any) => (doc.category || 'Sonstige Dokumente') === selectedCategory);
        }

        // Client Filter (for contacts managing multiple clients)
        if (selectedClientFilter !== 'all') {
            list = list.filter((doc: any) => doc.clientId === selectedClientFilter);
        }

        // Search Query
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

    // Counts by category
    let categoryCounts = $derived.by(() => {
        const counts: Record<string, number> = { all: documents.length };
        for (const doc of documents) {
            const cat = doc.category || 'Sonstige Dokumente';
            counts[cat] = (counts[cat] || 0) + 1;
        }
        return counts;
    });

    function getAuthToken(): string {
        if (typeof window !== 'undefined') {
            const portalToken = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            if (portalToken) return portalToken;
        }
        return "";
    }

    const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com'))
        ? `http://${window.location.hostname}:3000/portal`
        : '/api/emails/portal';

    // File Upload Handler
    async function handleFileUpload(files: FileList | File[]) {
        if (!files || files.length === 0 || isUploading) return;
        
        let targetClientId = uploadClientId;
        if (!targetClientId && myClients.length > 0) {
            targetClientId = myClients[0].id;
        }
        if (!targetClientId && documents.length > 0) {
            targetClientId = documents[0].clientId;
        }

        if (!targetClientId) {
            toastStore.error("Bitte wählen Sie zuerst einen Klienten für den Upload aus.");
            return;
        }

        isUploading = true;
        uploadProgress = 10;
        const token = getAuthToken();

        try {
            let uploadedCount = 0;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Max size check: 25 MB
                if (file.size > 25 * 1024 * 1024) {
                    toastStore.error(`Datei "${file.name}" überschreitet die Höchstgröße von 25 MB.`);
                    continue;
                }

                // File to Base64
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const res = reader.result as string;
                        const commaIndex = res.indexOf(',');
                        resolve(commaIndex !== -1 ? res.slice(commaIndex + 1) : res);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                uploadProgress = 30 + Math.round(((i + 1) / files.length) * 60);

                // Send to backend
                const res = await fetch(`${apiBaseUrl}/documents/upload`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        clientId: targetClientId,
                        fileName: file.name,
                        fileBase64: base64,
                        mimeType: file.type || 'application/pdf',
                        category: uploadCategory
                    })
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || `Fehler beim Hochladen von ${file.name}`);
                }

                uploadedCount++;
            }

            uploadProgress = 100;
            toastStore.success(`${uploadedCount} Dokument(e) erfolgreich hochgeladen.`);

            if (onRefresh) {
                await onRefresh();
            }
        } catch (err: any) {
            console.error("Upload error:", err);
            toastStore.error(err.message || "Fehler beim Hochladen des Dokuments.");
        } finally {
            isUploading = false;
            uploadProgress = 0;
            if (fileInputElement) fileInputElement.value = "";
        }
    }

    function handleDragOver(e: DragEvent) {
        e.preventDefault();
        isDraggingOver = true;
    }

    function handleDragLeave() {
        isDraggingOver = false;
    }

    function handleDrop(e: DragEvent) {
        e.preventDefault();
        isDraggingOver = false;
        if (e.dataTransfer?.files) {
            handleFileUpload(e.dataTransfer.files);
        }
    }

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

    function formatDate(val?: string) {
        if (!val) return '—';
        try {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }
        } catch {}
        return val.split(' ')[0] || '—';
    }

    function getCategoryBadge(category?: string) {
        switch (category) {
            case 'Verträge & Vereinbarungen':
                return { label: 'Vertrag', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
            case 'Pflegekassenbescheide':
                return { label: 'Pflegekasse', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
            case 'Vollmachten & Verfügungen':
                return { label: 'Vollmacht', color: 'bg-amber-50 text-amber-700 border-amber-200' };
            case 'Scans & Nachweise':
                return { label: 'Nachweis', color: 'bg-blue-50 text-blue-700 border-blue-200' };
            default:
                return { label: 'Dokument', color: 'bg-neutral-100 text-neutral-700 border-neutral-200' };
        }
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

        <!-- DRAG & DROP UPLOAD BEREICH -->
        <div class="mt-6 pt-6 border-t border-neutral-100 dark:border-slate-800">
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                ondragover={handleDragOver}
                ondragleave={handleDragLeave}
                ondrop={handleDrop}
                class="border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center transition-all {isDraggingOver ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 scale-[1.005]' : 'border-neutral-200 dark:border-slate-700 bg-neutral-50/60 dark:bg-slate-800/40 hover:bg-neutral-50 dark:hover:bg-slate-800/70 hover:border-neutral-300 dark:hover:border-slate-600'}"
            >
                <input
                    type="file"
                    multiple
                    bind:this={fileInputElement}
                    onchange={(e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.files) handleFileUpload(target.files);
                    }}
                    class="hidden"
                    disabled={isUploading}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />

                <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div class="flex items-center gap-3.5 text-left">
                        <div class="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-neutral-200 dark:border-slate-600 shadow-2xs shrink-0">
                            {#if isUploading}
                                <div class="w-5 h-5 border-2 border-brand-200 dark:border-brand-800 border-t-brand-600 rounded-full animate-spin"></div>
                            {:else}
                                <UploadCloud class="w-6 h-6" />
                            {/if}
                        </div>
                        <div>
                            <h4 class="font-bold text-neutral-900 dark:text-white text-sm">Dokument oder Scan hochladen</h4>
                            <p class="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">
                                Ziehen Sie Dateien hierher oder klicken Sie auf Durchsuchen (PDF, PNG, JPG bis 25 MB)
                            </p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap justify-end">
                        {#if myClients.length > 1}
                            <select
                                bind:value={uploadClientId}
                                class="orga-input-clear py-2 px-3 text-xs bg-white dark:bg-slate-800 dark:text-slate-100 border border-neutral-200 dark:border-slate-700 rounded-xl"
                                title="Ziel-Klient für Upload auswählen"
                            >
                                {#each myClients as cl}
                                    <option value={cl.id}>{cl.name_first} {cl.name_last}</option>
                                {/each}
                            </select>
                        {/if}

                        <select
                            bind:value={uploadCategory}
                            class="orga-input-clear py-2 px-3 text-xs bg-white dark:bg-slate-800 dark:text-slate-100 border border-neutral-200 dark:border-slate-700 rounded-xl"
                            title="Kategorie für Upload"
                        >
                            <option value="Verträge & Vereinbarungen">Verträge & Vereinbarungen</option>
                            <option value="Pflegekassenbescheide">Pflegekassenbescheide</option>
                            <option value="Vollmachten & Verfügungen">Vollmachten & Verfügungen</option>
                            <option value="Scans & Nachweise">Scans & Nachweise</option>
                            <option value="Sonstige Dokumente">Sonstige Dokumente</option>
                        </select>

                        <button
                            type="button"
                            onclick={() => fileInputElement?.click()}
                            disabled={isUploading}
                            class="orga-button-primary min-h-[44px] py-2.5 px-4 text-xs font-bold whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 shadow-xs shrink-0 active:scale-95 transition-all touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {#if isUploading}
                                <Loader2 class="w-4 h-4 animate-spin" />
                                <span>Übertrage... {uploadProgress}%</span>
                            {:else}
                                <UploadCloud class="w-4 h-4" />
                                <span>Datei auswählen</span>
                            {/if}
                        </button>
                    </div>
                </div>

                {#if isUploading}
                    <div class="w-full bg-neutral-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-4">
                        <div class="bg-brand-600 h-full transition-all duration-300 rounded-full" style={`width: ${uploadProgress}%`}></div>
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <!-- FILTER & SUCHLEISTE -->
    <div class="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xl space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            <!-- Suchfeld -->
            <div class="relative flex-1">
                <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-slate-400 pointer-events-none" />
                <input
                    type="search"
                    bind:value={searchQuery}
                    placeholder="Dokumente nach Name, Kategorie oder Klient durchsuchen..."
                    class="orga-input-clear py-2.5 pl-10 pr-9 text-xs sm:text-sm bg-neutral-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-neutral-900 dark:text-slate-100 transition-colors w-full rounded-2xl border border-neutral-200 dark:border-slate-700"
                />
                {#if searchQuery}
                    <button
                        type="button"
                        onclick={() => searchQuery = ""}
                        class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-neutral-200 dark:bg-slate-700 hover:bg-neutral-300 dark:hover:bg-slate-600 text-neutral-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                        title="Suche leeren"
                    >
                        ✕
                    </button>
                {/if}
            </div>

            <!-- Klienten-Filter (falls Betreuer mit mehreren Klienten) -->
            {#if myClients.length > 1}
                <div class="flex items-center gap-2 shrink-0">
                    <User class="w-4 h-4 text-neutral-400 dark:text-slate-400" />
                    <select
                        bind:value={selectedClientFilter}
                        class="orga-input-clear py-2.5 px-3 text-xs bg-neutral-50 dark:bg-slate-800 dark:text-slate-100 border border-neutral-200 dark:border-slate-700 rounded-2xl"
                    >
                        <option value="all">Alle Klienten ({myClients.length})</option>
                        {#each myClients as cl}
                            <option value={cl.id}>{cl.name_first} {cl.name_last}</option>
                        {/each}
                    </select>
                </div>
            {/if}

            <!-- View-Switcher (Grid vs List) -->
            <div class="flex items-center gap-1 bg-neutral-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 self-end md:self-center">
                <button
                    type="button"
                    onclick={() => viewMode = 'grid'}
                    class="p-1.5 rounded-lg transition-colors cursor-pointer {viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 shadow-2xs font-bold' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'}"
                    title="Karten-Ansicht"
                >
                    <LayoutGrid class="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onclick={() => viewMode = 'list'}
                    class="p-1.5 rounded-lg transition-colors cursor-pointer {viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 shadow-2xs font-bold' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'}"
                    title="Listen-Ansicht"
                >
                    <List class="w-4 h-4" />
                </button>
            </div>
        </div>

        <!-- Kategorie Filter-Pills -->
        <div class="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1">
            {#each categories as cat}
                {@const count = categoryCounts[cat.id] || 0}
                <button
                    type="button"
                    onclick={() => selectedCategory = cat.id}
                    class="min-h-[44px] px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer flex items-center gap-2 shrink-0 touch-manipulation {selectedCategory === cat.id ? 'bg-brand-600 text-white shadow-xs' : 'bg-neutral-50 dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-750 text-neutral-600 dark:text-slate-300 border border-neutral-200/60 dark:border-slate-700'}"
                >
                    <span>{cat.label}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] {selectedCategory === cat.id ? 'bg-white/25 text-white' : 'bg-neutral-200 dark:bg-slate-700 text-neutral-600 dark:text-slate-300'}">
                        {count}
                    </span>
                </button>
            {/each}
        </div>
    </div>

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
                    class="orga-button-ghost text-xs font-bold px-4 py-2 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    Filter zurücksetzen
                </button>
            {/if}
        </div>
    {:else}

        <!-- KARTEN-ANSICHT (GRID) -->
        {#if viewMode === 'grid'}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {#each filteredDocuments as doc (doc.id)}
                    {@const badge = getCategoryBadge(doc.category)}
                    <div
                        role="button"
                        tabindex="0"
                        onclick={(e) => handlePreviewClick(doc, e)}
                        onkeydown={(e) => e.key === 'Enter' && handlePreviewClick(doc, e)}
                        class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-neutral-200/80 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-500/50 hover:shadow-lg transition-all group flex flex-col justify-between text-left cursor-pointer active:scale-[0.99]"
                    >
                        <div class="space-y-3">
                            <!-- Top Row: Icon + Category Badge -->
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

                            <!-- Document Title & Meta -->
                            <div>
                                <h4 class="font-black text-neutral-900 dark:text-white text-sm leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2" title={doc.originalName}>
                                    {doc.name}
                                </h4>
                                
                                <div class="flex items-center gap-2 text-[11px] text-neutral-400 dark:text-slate-400 font-medium mt-1.5 flex-wrap">
                                    {#if myClients.length > 1 && doc.clientName}
                                        <span class="font-bold text-neutral-700 dark:text-slate-300">{doc.clientName} &bull;</span>
                                    {/if}
                                    <span>{formatDate(doc.updated || doc.created)}</span>
                                    {#if doc.extension}
                                        <span class="uppercase font-bold text-neutral-500 dark:text-slate-400 bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[9px]">{doc.extension}</span>
                                    {/if}
                                </div>
                            </div>
                        </div>

                        <!-- Card Action Buttons -->
                        <div class="flex items-center justify-between pt-4 mt-4 border-t border-neutral-100 dark:border-slate-800 shrink-0">
                            <span class="text-xs font-bold text-brand-600 dark:text-brand-400 group-hover:underline flex items-center gap-1.5">
                                <Eye class="w-4 h-4" /> Vorschau
                            </span>

                            <div class="flex items-center gap-2">
                                <button
                                    type="button"
                                    onclick={(e) => handlePreviewClick(doc, e)}
                                    class="min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl bg-neutral-50 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 border border-neutral-200 dark:border-slate-700 hover:border-brand-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 touch-manipulation"
                                    title="Dokument in Vorschau öffnen"
                                    aria-label="Dokument in Vorschau öffnen"
                                >
                                    <Eye class="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onclick={(e) => handleDownload(doc, e)}
                                    disabled={downloadingDocId === doc.id}
                                    class="min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl bg-neutral-50 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 border border-neutral-200 dark:border-slate-700 hover:border-brand-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed"
                                    title="Dokument herunterladen"
                                    aria-label="Dokument herunterladen"
                                >
                                    {#if downloadingDocId === doc.id}
                                        <Loader2 class="w-4 h-4 animate-spin text-brand-600" />
                                    {:else}
                                        <Download class="w-4 h-4" />
                                    {/if}
                                </button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

        <!-- LISTEN-ANSICHT (TABLE / LIST) -->
        {:else}
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xl overflow-hidden">
                <div class="divide-y divide-neutral-100 dark:divide-slate-800">
                    {#each filteredDocuments as doc (doc.id)}
                        {@const badge = getCategoryBadge(doc.category)}
                        <div
                            role="button"
                            tabindex="0"
                            onclick={(e) => handlePreviewClick(doc, e)}
                            onkeydown={(e) => e.key === 'Enter' && handlePreviewClick(doc, e)}
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
                                        {#if myClients.length > 1 && doc.clientName}
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
                                        onclick={(e) => handlePreviewClick(doc, e)}
                                        class="min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl bg-neutral-50 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 border border-neutral-200 dark:border-slate-700 hover:border-brand-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 touch-manipulation"
                                        title="Dokument in Vorschau öffnen"
                                        aria-label="Dokument in Vorschau öffnen"
                                    >
                                        <Eye class="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onclick={(e) => handleDownload(doc, e)}
                                        disabled={downloadingDocId === doc.id}
                                        class="min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl bg-neutral-50 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 border border-neutral-200 dark:border-slate-700 hover:border-brand-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed"
                                        title="Dokument herunterladen"
                                        aria-label="Dokument herunterladen"
                                    >
                                        {#if downloadingDocId === doc.id}
                                            <Loader2 class="w-4 h-4 animate-spin text-brand-600" />
                                        {:else}
                                            <Download class="w-4 h-4" />
                                        {/if}
                                    </button>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

    {/if}

    <!-- SICHERHEITSHINWEIS & DSGVO -->
    <div class="p-5 bg-neutral-50 dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 rounded-2xl flex items-start gap-3.5 text-neutral-600 dark:text-slate-300">
        <ShieldCheck class="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div class="text-xs leading-relaxed">
            <p class="font-bold text-neutral-800 dark:text-slate-200">Höchster Datenschutz & Integrität Ihrer Dokumente</p>
            <p class="text-neutral-500 dark:text-slate-400 mt-0.5">
                Alle Unterlagen und Anhänge werden verschlüsselt gespeichert und sind strikt nach den gesetzlichen Bestimmungen der DSGVO geschützt. Zugriff haben ausschließlich autorisierte Klienten, bevollmächtigte Angehörige und das betreuende Assistenzteam.
            </p>
        </div>
    </div>

</div>
