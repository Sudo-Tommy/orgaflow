import { pb } from "$lib/services/pocketbase";

export interface SaveClientDocumentInput {
    editId: string | null;
    title: string;
    document_type: string;
    status: string;
    valid_from: string;
    valid_until: string;
    notes: string;
    clientId: string;
    uploadFiles: File[];
    existingFiles: string[];
}

export async function saveClientDocument(input: SaveClientDocumentInput): Promise<any> {
    const formData = new FormData();
    formData.append('title', input.title.trim());
    formData.append('document_type', input.document_type);
    formData.append('status', input.status);
    if (input.valid_from) formData.append('valid_from', `${input.valid_from} 12:00:00.000Z`);
    if (input.valid_until) formData.append('valid_until', `${input.valid_until} 12:00:00.000Z`);
    formData.append('notes', input.notes.trim());
    
    if (input.clientId && !input.editId) {
        formData.append('client', input.clientId);
    }
    if (!input.editId && pb.authStore.model?.id) {
        formData.append('created_by', pb.authStore.model.id);
    }

    for (const file of input.uploadFiles) {
        formData.append('file', file);
    }

    if (input.editId) {
        for (const existing of input.existingFiles) {
            formData.append('file', existing);
        }
        if (input.existingFiles.length === 0 && input.uploadFiles.length === 0) {
            formData.append('file', ''); 
        }
        return await pb.collection('client_documents').update(input.editId, formData);
    }
    return await pb.collection('client_documents').create(formData);
}

export async function deleteClientDocument(id: string): Promise<void> {
    await pb.collection('client_documents').delete(id);
}
