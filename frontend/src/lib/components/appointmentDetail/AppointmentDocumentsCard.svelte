<script lang="ts">
    import { slide } from "svelte/transition";
    import { Upload, Trash2, ExternalLink, Paperclip, CheckCircle2, Loader2, HardDrive } from "lucide-svelte";
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import GoogleDrivePickerModal from "$lib/components/drive/GoogleDrivePickerModal.svelte";
    import DocumentScanButton from "$lib/components/common/DocumentScanButton.svelte";
    import { getCleanFileName, getFileIcon, checkIsDuplicate } from "./appointmentDocumentsHelper";

    interface Props {
        appointment: any;
        client?: any;
        onRefreshAppointment?: () => Promise<void>;
    }

    let { appointment, client, onRefreshAppointment }: Props = $props();

    let isUploading = $state(false);
    let isDragging = $state(false);
    let isGoogleDriveOpen = $state(false);

    let appointmentDocs = $derived<string[]>(appointment?.documents || []);
    let clientDocs = $derived<string[]>(client?.documents || []);

    async function handleFiles(files: FileList | File[] | null) {
        if (!files || files.length === 0 || !appointment?.id) return;
        const fileArr = Array.from(files);

        for (let i = 0; i < fileArr.length; i++) {
            const file = fileArr[i];
            if (file.size > 52428800) {
                toastStore.error(`"${file.name}" überschreitet das Limit von 50 MB.`);
                continue;
            }

            const isDup = checkIsDuplicate(file, clientDocs, appointmentDocs);
            let uploadFile = file;

            if (isDup) {
                const confirmed = await confirmStore.ask(
                    `Die Datei "${file.name}" existiert bereits in der Klientenakte. Möchten Sie die Datei trotzdem als Kopie hinzufügen?`,
                    "Mögliches Dateiduplikat erkannt",
                    "Als Kopie hochladen",
                    "Abbrechen",
                    false
                );
                if (!confirmed) continue;

                const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
                const base = file.name.substring(0, file.name.length - ext.length);
                const copyName = `${base}_${new Date().toISOString().slice(0, 10)}${ext}`;
                uploadFile = new File([file], copyName, { type: file.type });
            }

            await uploadSingleFile(uploadFile);
        }
    }

    async function uploadSingleFile(file: File) {
        isUploading = true;
        try {
            const fileName = file.name || `dokument_${Date.now()}`;
            // 1. Termin-Dokumente anhängen (atomic mit documents+)
            const appFormData = new FormData();
            appFormData.append('documents+', file, fileName);
            await pb.collection('appointments').update(appointment.id, appFormData, { requestKey: null });

            // 2. Automatisch zur verknüpften Klientenakte hinzufügen
            const clientId = client?.id || (Array.isArray(appointment.client) ? appointment.client[0] : appointment.client);
            if (clientId) {
                try {
                    const clientFormData = new FormData();
                    clientFormData.append('documents+', file, fileName);
                    await pb.collection('clients').update(clientId, clientFormData, { requestKey: null });
                } catch (cErr) {
                    console.warn("[AppointmentDocumentsCard] Fehler beim Sync zu Klientenakte:", cErr);
                }
            }

            toastStore.success(`"${fileName}" zum Termin und zur Klientenakte hinzugefügt.`);
            if (onRefreshAppointment) await onRefreshAppointment();
        } catch (err: any) {
            console.error("Fehler beim Datei-Upload:", err);
            let msg = `Upload von "${file.name}" fehlgeschlagen.`;
            if (err?.status === 0) {
                msg = 'Keine Verbindung zum Server. Bitte Netzwerk auf dem Mobilgerät prüfen.';
            } else if (err?.message) {
                msg = err.message;
            }
            toastStore.error(msg);
        } finally {
            isUploading = false;
        }
    }

    async function handleDeleteDoc(fileName: string) {
        if (!(await confirmStore.ask(`Möchten Sie die Datei "${getCleanFileName(fileName)}" von diesem Termin entfernen?`, "Datei entfernen", "Entfernen", "Abbrechen", true))) return;
        try {
            const fd = new FormData();
            fd.append('documents-', fileName);
            await pb.collection('appointments').update(appointment.id, fd, { requestKey: null });
            toastStore.success("Datei vom Termin entfernt.");
            if (onRefreshAppointment) await onRefreshAppointment();
        } catch {
            toastStore.error("Fehler beim Entfernen der Datei.");
        }
    }
</script>

<div class="mt-4 pt-4 border-t border-neutral-100 dark:border-slate-800 space-y-3">
    <div class="flex items-center justify-between gap-2 flex-wrap">
        <h4 class="text-xs font-bold text-neutral-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Paperclip class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Dokumente &amp; Klientenakte ({appointmentDocs.length})</span>
        </h4>
        <div class="flex items-center gap-1.5 flex-wrap">
            <button
                type="button"
                onclick={() => isGoogleDriveOpen = true}
                disabled={isUploading}
                class="px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
                <HardDrive class="w-3.5 h-3.5" />
                <span>Drive</span>
            </button>
            <DocumentScanButton
                variant="compact"
                label="Kamera"
                documentTitle="Termin_Dokument"
                disabled={isUploading}
                onScanComplete={(file) => handleFiles([file])}
            />
            <label
                class="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 {isUploading ? 'opacity-50 pointer-events-none' : ''}"
            >
                <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                    class="sr-only"
                    disabled={isUploading}
                    onchange={(e) => handleFiles((e.target as HTMLInputElement).files)}
                />
                {#if isUploading}
                    <Loader2 class="w-3.5 h-3.5 animate-spin" />
                    <span>Lädt hoch...</span>
                {:else}
                    <Upload class="w-3.5 h-3.5" />
                    <span>+ Datei</span>
                {/if}
            </label>
        </div>
    </div>

    <!-- Drag & Drop / Mobile Touch Area -->
    <label
        class="block p-4 rounded-2xl border-2 border-dashed transition-colors text-center cursor-pointer select-none touch-manipulation {isDragging ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30' : 'border-neutral-200 dark:border-slate-800 hover:border-indigo-400 bg-neutral-50/50 dark:bg-slate-850/40'} {isUploading ? 'opacity-50 pointer-events-none' : ''}"
        ondragover={(e) => { e.preventDefault(); isDragging = true; }}
        ondragleave={() => isDragging = false}
        ondrop={(e) => { e.preventDefault(); isDragging = false; handleFiles(e.dataTransfer?.files || null); }}
    >
        <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
            class="sr-only"
            disabled={isUploading}
            onchange={(e) => handleFiles((e.target as HTMLInputElement).files)}
        />
        <div class="flex flex-col items-center justify-center gap-1.5 text-neutral-500 dark:text-slate-400">
            <Upload class="w-5 h-5 text-indigo-500" />
            <p class="text-xs font-semibold text-neutral-700 dark:text-slate-300">Dateien hierher ziehen oder <span class="text-indigo-600 dark:text-indigo-400 underline">antippen</span></p>
            <p class="text-[10px] text-neutral-400">PDF, Fotos, Dokumente bis 50 MB • Automatische Verknüpfung mit der Klientenakte</p>
        </div>
    </label>

    {#if appointmentDocs.length > 0}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {#each appointmentDocs as doc}
                {@const Icon = getFileIcon(doc)}
                {@const cleanName = getCleanFileName(doc)}
                {@const fileUrl = pb.files.getURL(appointment, doc)}
                <div class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-2.5">
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <Icon class="w-4 h-4" />
                        </div>
                        <div class="min-w-0">
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-neutral-900 dark:text-white hover:text-indigo-600 hover:underline truncate block" title={cleanName}>
                                {cleanName}
                            </a>
                            <span class="text-[9px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <CheckCircle2 class="w-2.5 h-2.5" /> In Klientenakte
                            </span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" class="p-1 text-neutral-400 hover:text-indigo-600 rounded transition-colors" title="Öffnen"><ExternalLink class="w-3.5 h-3.5" /></a>
                        <button type="button" onclick={() => handleDeleteDoc(doc)} class="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors cursor-pointer" title="Löschen"><Trash2 class="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    <GoogleDrivePickerModal
        isOpen={isGoogleDriveOpen}
        onclose={() => isGoogleDriveOpen = false}
        onselect={(files) => handleFiles(files)}
    />
</div>
