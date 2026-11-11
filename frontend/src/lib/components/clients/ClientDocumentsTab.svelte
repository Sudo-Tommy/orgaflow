<!-- src/lib/components/clients/ClientDocumentsTab.svelte -->
<script lang="ts">
    import { Sparkles, Share2, ExternalLink } from 'lucide-svelte';
    import { pb } from '$lib/services/pocketbase';
    import { rbacService } from '$lib/services/rbacService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { confirmStore } from '$lib/services/confirmService.svelte';
    import ClientDocumentUploadZone from './ClientDocumentUploadZone.svelte';
    import ClientDocumentList from './ClientDocumentList.svelte';
    import ClientDocumentSendModal from './ClientDocumentSendModal.svelte';
    import { uploadClientDocuments, deleteClientDocument, renameClientDocument } from './clientDocumentService';

    let { client, clientId, systemDocuments = [], pdfPreviewModal, docGenModal } = $props<{
        client: any;
        clientId: string;
        systemDocuments?: any[];
        pdfPreviewModal?: any;
        docGenModal?: any;
    }>();

    let isUploading = $state(false);
    let uploadProgress = $state(0);
    let statusText = $state('');
    let showSuccess = $state(false);
    let sendModal: ReturnType<typeof ClientDocumentSendModal>;
    let uploadZone: ReturnType<typeof ClientDocumentUploadZone>;
    let uploadedDocs = $derived(Array.isArray(client?.documents) ? client.documents : []);

    async function handleUpload(files: FileList | File[]) {
        if (!clientId) return;
        isUploading = true;
        uploadProgress = 10;
        statusText = 'Dokumente werden vorbereitet...';
        showSuccess = false;
        try {
            await uploadClientDocuments(clientId, files, uploadedDocs, (info) => {
                uploadProgress = info.percent;
                statusText = info.statusText;
            });
            showSuccess = true;
            toastStore.success('Dokument(e) erfolgreich gespeichert.');
            setTimeout(() => { showSuccess = false; }, 4000);
        } catch (err: any) {
            console.error('Upload-Fehler:', err);
            let msg = 'Fehler beim Hochladen der Dokumente.';
            if (err?.status === 413 || err?.message?.includes('413') || err?.message?.includes('zu groß')) {
                msg = err?.message?.includes('zu groß') ? err.message : 'Die Datei ist zu groß (maximal 25 MB pro Datei erlaubt).';
            } else if (err?.status === 0) {
                msg = 'Keine Verbindung zum Server. Bitte Internetverbindung auf dem Smartphone überprüfen.';
            } else if (err?.message) {
                msg = err.message;
            }
            toastStore.error(msg);
        } finally {
            isUploading = false;
        }
    }

    function handlePreview(e: Event, filename: string) {
        e.preventDefault();
        let url = pb.files.getURL(client, filename);
        if (pb.authStore.token) url += (url.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
        if (/\.(pdf|jpg|jpeg|png|gif|webp)$/i.test(filename)) {
            pdfPreviewModal?.open(url, 'Klienten-Akte', filename);
        } else {
            window.open(url, '_blank');
        }
    }

    async function handleDelete(filename: string) {
        if (!(await confirmStore.ask(`Möchten Sie '${filename}' wirklich löschen?`, 'Dokument löschen?', 'Löschen', 'Abbrechen', true))) return;
        try {
            await deleteClientDocument(clientId, filename, uploadedDocs);
            toastStore.info('Dokument wurde gelöscht.');
        } catch {
            toastStore.error('Fehler beim Löschen des Dokuments.');
        }
    }

    async function handleRename(oldName: string) {
        const ext = oldName.includes('.') ? oldName.substring(oldName.lastIndexOf('.')) : '';
        const base = oldName.replace(ext, '').replace(/_[a-zA-Z0-9]{10}$/, '');
        const newName = prompt('Neuer Dateiname:', base)?.trim();
        if (!newName) return;
        const fullNewName = newName.toLowerCase().endsWith(ext.toLowerCase()) ? newName : newName + ext;
        isUploading = true;
        try {
            await renameClientDocument(clientId, client, oldName, fullNewName);
            toastStore.success(`Dokument in '${fullNewName}' umbenannt.`);
        } catch {
            toastStore.error('Fehler beim Umbenennen.');
        } finally {
            isUploading = false;
        }
    }
</script>

<div class="space-y-6 animate-enter">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
            <h3 class="text-base font-bold text-neutral-900 dark:text-white">Dokumenten-Ablage & Vorlagen</h3>
            <p class="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">Scans, Pflegeverträge, Anträge und direkter Kontakt-Versand</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
            {#if uploadedDocs.length > 0}
                <button
                    type="button"
                    onclick={() => sendModal?.open(uploadedDocs[0])}
                    class="orga-button-ghost py-1.5 px-3 text-xs font-bold border border-neutral-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
                >
                    <Share2 class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Dokument versenden</span>
                </button>
            {/if}
            {#if !rbacService.isCaregiver}
                <button
                    type="button"
                    onclick={() => {
                        const empId = Array.isArray(client?.assigned_employee) ? client.assigned_employee[0] : client?.assigned_employee;
                        docGenModal?.open('', 2, clientId || '', 'all', empId);
                    }}
                    class="orga-button-primary py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                    <Sparkles class="w-3.5 h-3.5" />
                    <span>Aus Vorlage erstellen</span>
                </button>
            {/if}
        </div>
    </div>

    <ClientDocumentUploadZone
        bind:this={uploadZone}
        {isUploading}
        {uploadProgress}
        {statusText}
        {showSuccess}
        onupload={handleUpload}
    />

    <ClientDocumentList
        documents={uploadedDocs}
        {isUploading}
        onpreview={handlePreview}
        onsend={(f) => sendModal?.open(f)}
        onrename={handleRename}
        ondelete={handleDelete}
        onpickfile={() => uploadZone?.openPicker()}
    />

    {#if !rbacService.isCaregiver && systemDocuments.length > 0}
        <div class="orga-card-white p-5 sm:p-6 space-y-4">
            <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-400">Generierte System-Vorlagen ({systemDocuments.length})</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                {#each systemDocuments as doc}
                    <a href={`/documents/${doc.id}`} class="flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-slate-800/80 rounded-2xl border border-neutral-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/30 transition-all group">
                        <div class="flex items-center gap-3 min-w-0 flex-1">
                            <span class="text-2xl shrink-0">📑</span>
                            <p class="text-xs font-bold text-neutral-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{doc.title || 'Dokument'}</p>
                        </div>
                        <ExternalLink class="w-4 h-4 text-neutral-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0" />
                    </a>
                {/each}
            </div>
        </div>
    {/if}

    <ClientDocumentSendModal bind:this={sendModal} {client} />
</div>
