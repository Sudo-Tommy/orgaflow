// src/lib/components/clients/clientDocumentService.ts
import { pb } from '$lib/services/pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { sendEmail } from '$lib/services/emailService';
import { resolveCompanyData, resolveUserData, wrapOrgaFlowEmailHtml, buildTextSignature } from '$lib/services/emailCompanyService';

export interface UploadProgressInfo {
    statusText: string;
    percent: number;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function uploadClientDocuments(
    clientId: string,
    fileList: FileList | File[],
    currentDocs: string[],
    onProgress?: (info: UploadProgressInfo) => void
): Promise<string[]> {
    const files = Array.from(fileList);
    if (!clientId || files.length === 0) return currentDocs;

    // 1. Validierung der maximalen Dateigröße (25 MB pro Datei)
    for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            throw new Error(`Die Datei "${file.name || 'Dokument'}" ist mit ${sizeMB} MB zu groß (maximal 25 MB erlaubt).`);
        }
    }

    // Aktuellen Dokumentenstand frisch vom Server holen, um Überschreiben bei parallelen Aktionen zu verhindern
    let workingDocs = [...currentDocs];
    try {
        const fresh = await pb.collection('clients').getOne(clientId, { fields: 'id,documents', requestKey: null });
        if (Array.isArray(fresh.documents)) {
            workingDocs = fresh.documents;
        }
    } catch {
        // Fallback auf übergebene Liste
    }

    const total = files.length;
    // Dateien einzeln nacheinander hochladen, um mobile Timeouts und Server-Payload-Grenzen (413) zuverlässig zu vermeiden
    for (let i = 0; i < total; i++) {
        const file = files[i];
        const fileName = file.name || `dokument_${Date.now()}_${i + 1}`;
        const percentBase = Math.round((i / total) * 100);
        const percentStep = Math.round(100 / total);

        onProgress?.({
            statusText: total > 1
                ? `Datei ${i + 1} von ${total} ("${fileName}") wird hochgeladen...`
                : `"${fileName}" wird hochgeladen...`,
            percent: Math.min(90, percentBase + Math.round(percentStep * 0.3))
        });

        const formData = new FormData();
        formData.append('documents+', file, fileName);

        const res = await pb.collection('clients').update(clientId, formData, { requestKey: null });
        workingDocs = Array.isArray(res.documents) ? res.documents : workingDocs;

        onProgress?.({
            statusText: total > 1
                ? `Datei ${i + 1} von ${total} übertragen`
                : `"${fileName}" übertragen`,
            percent: Math.min(95, percentBase + percentStep)
        });
    }

    onProgress?.({ statusText: 'Klienten-Akte wird aktualisiert...', percent: 98 });
    await refreshClientInStore(clientId, workingDocs);
    onProgress?.({ statusText: 'Erfolgreich gespeichert!', percent: 100 });
    return workingDocs;
}

export async function deleteClientDocument(clientId: string, filename: string, currentDocs: string[]): Promise<string[]> {
    const formData = new FormData();
    formData.append('documents-', filename);
    const res = await pb.collection('clients').update(clientId, formData, { requestKey: null });
    const updatedDocs = Array.isArray(res.documents) ? res.documents : [];
    await refreshClientInStore(clientId, updatedDocs);
    return updatedDocs;
}

export async function renameClientDocument(clientId: string, client: any, oldFileName: string, newFileName: string): Promise<void> {
    let url = pb.files.getURL(client, oldFileName);
    if (pb.authStore.token) url += (url.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Datei konnte für das Umbenennen nicht geladen werden.');
    const blob = await res.blob();
    const newFile = new File([blob], newFileName, { type: blob.type });

    const existingFiles = Array.isArray(client?.documents) ? client.documents : [];
    const formData = new FormData();
    for (const existing of existingFiles) {
        if (existing !== oldFileName) formData.append('documents', existing);
    }
    formData.append('documents', newFile);
    const updatedRes = await pb.collection('clients').update(clientId, formData, { requestKey: null });
    await refreshClientInStore(clientId, updatedRes.documents);
}

export async function fetchDocumentAsAttachment(client: any, fileName: string) {
    let url = pb.files.getURL(client, fileName);
    if (pb.authStore.token) url += (url.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Dokument konnte für den Versand nicht geladen werden.');
    const blob = await res.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => typeof reader.result === 'string' ? resolve(reader.result.split(',')[1]) : reject(new Error());
        reader.readAsDataURL(blob);
    });
    return { filename: fileName, content: base64, encoding: 'base64' };
}

export async function sendClientDocumentEmail(client: any, docFileName: string, to: string, subject: string, message: string, cc?: string) {
    const attachment = await fetchDocumentAsAttachment(client, docFileName);
    const compData = resolveCompanyData(orgaStore);
    const userData = resolveUserData();
    const html = wrapOrgaFlowEmailHtml({ bodyContent: message, userData, compData });
    return await sendEmail({
        to,
        cc: cc || undefined,
        subject,
        text: `${message}${buildTextSignature(userData, compData)}`,
        html,
        attachments: [attachment],
        provider: 'ionos'
    });
}

async function refreshClientInStore(clientId: string, fallbackDocs?: string[]) {
    try {
        const updated = await pb.collection('clients').getOne(clientId, {
            expand: 'insurance,retirement_homes,nursing_homes,contacts,templates,caregiver,inheritor',
            requestKey: null
        }) as any;
        orgaStore.clients?.replaceItem(clientId, updated);
    } catch {
        try {
            const basic = await pb.collection('clients').getOne(clientId, { requestKey: null }) as any;
            orgaStore.clients?.replaceItem(clientId, basic);
        } catch {
            if (fallbackDocs) {
                orgaStore.clients?.optimisticUpdate(clientId, { documents: fallbackDocs });
            }
        }
    }
}
