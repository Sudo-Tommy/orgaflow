<script lang="ts">
    import { UploadCloud, Loader2 } from "lucide-svelte";
    import DocumentScanButton from "$lib/components/common/DocumentScanButton.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { sortAlphabetical } from "$lib/utils/sortHelper";
    import { getAuthToken, getApiBaseUrl } from "./portalDocumentHelper";

    let {
        myClients = [],
        documents = [],
        onRefresh
    } = $props<{
        myClients?: any[];
        documents: any[];
        onRefresh?: () => Promise<void> | void;
    }>();

    let isUploading = $state(false);
    let uploadProgress = $state(0);
    let isDraggingOver = $state(false);
    let uploadClientId = $state<string>("");
    let uploadCategory = $state<string>("Verträge & Vereinbarungen");
    let fileInputElement: HTMLInputElement | undefined = $state();

    let sortedClients = $derived.by(() => {
        return sortAlphabetical(myClients || [], (c: any) => `${c.name_first || ''} ${c.name_last || ''}`);
    });

    $effect(() => {
        if (sortedClients.length > 0 && !uploadClientId) {
            uploadClientId = sortedClients[0].id;
        }
    });

    async function handleFileUpload(files: FileList | File[]) {
        if (!files || files.length === 0 || isUploading) return;
        
        let targetClientId = uploadClientId;
        if (!targetClientId && sortedClients.length > 0) {
            targetClientId = sortedClients[0].id;
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
                if (file.size > 25 * 1024 * 1024) {
                    toastStore.error(`Datei "${file.name}" überschreitet die Höchstgröße von 25 MB.`);
                    continue;
                }

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

                const res = await fetch(`${getApiBaseUrl()}/documents/upload`, {
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
            if (onRefresh) await onRefresh();
        } catch (err: any) {
            console.error("Upload error:", err);
            toastStore.error(err.message || "Fehler beim Hochladen des Dokuments.");
        } finally {
            isUploading = false;
            uploadProgress = 0;
            if (fileInputElement) fileInputElement.value = "";
        }
    }
</script>

<div class="mt-6 pt-6 border-t border-neutral-100 dark:border-slate-800">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        ondragover={(e) => { e.preventDefault(); isDraggingOver = true; }}
        ondragleave={() => isDraggingOver = false}
        ondrop={(e) => { e.preventDefault(); isDraggingOver = false; if (e.dataTransfer?.files) handleFileUpload(e.dataTransfer.files); }}
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
                {#if sortedClients.length > 1}
                    <select
                        bind:value={uploadClientId}
                        class="orga-input-clear py-2 px-3 text-xs bg-white dark:bg-slate-800 dark:text-slate-100 border border-neutral-200 dark:border-slate-700 rounded-xl min-h-[44px]"
                        title="Ziel-Klient für Upload auswählen"
                    >
                        {#each sortedClients as cl}
                            <option value={cl.id}>{cl.name_first} {cl.name_last}</option>
                        {/each}
                    </select>
                {/if}

                <select
                    bind:value={uploadCategory}
                    class="orga-input-clear py-2 px-3 text-xs bg-white dark:bg-slate-800 dark:text-slate-100 border border-neutral-200 dark:border-slate-700 rounded-xl min-h-[44px]"
                    title="Kategorie für Upload"
                >
                    <option value="Pflegekassenbescheide">Pflegekassenbescheide</option>
                    <option value="Scans & Nachweise">Scans & Nachweise</option>
                    <option value="Sonstige Dokumente">Sonstige Dokumente</option>
                    <option value="Verträge & Vereinbarungen">Verträge & Vereinbarungen</option>
                    <option value="Vollmachten & Verfügungen">Vollmachten & Verfügungen</option>
                </select>

                <DocumentScanButton
                    variant="secondary"
                    label="Scannen"
                    documentTitle={uploadCategory || 'Portal_Dokument'}
                    disabled={isUploading}
                    onScanComplete={(file) => handleFileUpload([file])}
                />

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
