import {
    getValidAccessToken,
    getGoogleCredentials,
    scheduleGoogleApiCall,
    APP_DISPLAY_NAME
} from '../../../googleCalendarService.js';

export async function getDriveStatus(userId, pbAdmin) {
    if (!pbAdmin) {
        return { connected: false, googleEmail: '', hasCredentials: false, appName: APP_DISPLAY_NAME };
    }
    const creds = await getGoogleCredentials(userId, pbAdmin);
    const tokenInfo = await getValidAccessToken(userId, pbAdmin);
    const projectId = creds.projectId || '485464187491';

    return {
        connected: Boolean(tokenInfo?.accessToken),
        googleEmail: tokenInfo?.config?.google_email || '',
        hasCredentials: Boolean(creds.clientId && creds.clientSecret),
        appName: APP_DISPLAY_NAME,
        projectId,
        activationUrl: `https://console.cloud.google.com/apis/library/drive.googleapis.com?project=${projectId}`,
        consentScreenUrl: `https://console.cloud.google.com/apis/credentials/consent?project=${projectId}`
    };
}

export async function listDriveFiles(userId, { folderId, search, pageToken }, pbAdmin) {
    let tokenInfo = await getValidAccessToken(userId, pbAdmin);
    if (!tokenInfo?.accessToken) {
        const err = new Error('GOOGLE_NOT_CONNECTED');
        err.code = 'GOOGLE_NOT_CONNECTED';
        throw err;
    }

    let q = 'trashed = false';
    if (folderId && folderId !== 'root') {
        const safeFolder = folderId.replace(/'/g, "\\'");
        q += ` and '${safeFolder}' in parents`;
    } else if (search && search.trim()) {
        const safeSearch = search.trim().replace(/'/g, "\\'");
        q += ` and (name contains '${safeSearch}')`;
    } else {
        q += ` and 'root' in parents`;
    }

    const params = new URLSearchParams({
        q,
        fields: 'nextPageToken,files(id,name,mimeType,size,iconLink,thumbnailLink,modifiedTime,webViewLink)',
        orderBy: 'folder,name_natural',
        pageSize: '60'
    });
    if (pageToken) params.set('pageToken', pageToken);

    const apiUrl = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
    let res = await scheduleGoogleApiCall(() => fetch(apiUrl, {
        headers: { Authorization: `Bearer ${tokenInfo.accessToken}` }
    }));

    if (res.status === 401) {
        const refreshed = await getValidAccessToken(userId, pbAdmin, true);
        if (refreshed?.accessToken) {
            tokenInfo = refreshed;
            res = await scheduleGoogleApiCall(() => fetch(apiUrl, {
                headers: { Authorization: `Bearer ${tokenInfo.accessToken}` }
            }));
        }
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || '';
        const reasons = (err?.error?.errors || []).map(e => e.reason);
        const detailReasons = (err?.error?.details || []).map(d => d.reason);
        const creds = await getGoogleCredentials(userId, pbAdmin);
        const projectId = creds.projectId || '485464187491';

        if (
            res.status === 403 &&
            (msg.includes('has not been used in project') ||
             msg.includes('it is disabled') ||
             reasons.includes('accessNotConfigured') ||
             detailReasons.includes('SERVICE_DISABLED'))
        ) {
            const apiErr = new Error('Die Google Drive API muss einmalig in der Google Cloud Console aktiviert werden.');
            apiErr.code = 'GOOGLE_DRIVE_API_DISABLED';
            apiErr.activationUrl = `https://console.cloud.google.com/apis/library/drive.googleapis.com?project=${projectId}`;
            apiErr.consentScreenUrl = `https://console.cloud.google.com/apis/credentials/consent?project=${projectId}`;
            throw apiErr;
        }

        if (res.status === 403 && (reasons.includes('insufficientPermissions') || msg.toLowerCase().includes('insufficient'))) {
            const scopeErr = new Error('GOOGLE_SCOPE_MISSING');
            scopeErr.code = 'GOOGLE_SCOPE_MISSING';
            throw scopeErr;
        }

        if (res.status === 401) {
            const authErr = new Error('GOOGLE_AUTH_EXPIRED');
            authErr.code = 'GOOGLE_AUTH_EXPIRED';
            throw authErr;
        }

        throw new Error(msg || `Google Drive API Fehler (HTTP ${res.status})`);
    }

    const data = await res.json();
    const files = (data.files || []).map(f => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: Number(f.size) || 0,
        isFolder: f.mimeType === 'application/vnd.google-apps.folder',
        modifiedTime: f.modifiedTime,
        iconLink: f.iconLink,
        thumbnailLink: f.thumbnailLink,
        webViewLink: f.webViewLink
    }));

    return { files, nextPageToken: data.nextPageToken || null };
}

export async function downloadDriveFile(userId, fileId, pbAdmin) {
    let tokenInfo = await getValidAccessToken(userId, pbAdmin);
    if (!tokenInfo?.accessToken) throw new Error('GOOGLE_NOT_CONNECTED');

    let metaRes = await scheduleGoogleApiCall(() => fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`, {
        headers: { Authorization: `Bearer ${tokenInfo.accessToken}` }
    }));
    if (metaRes.status === 401) {
        const refreshed = await getValidAccessToken(userId, pbAdmin, true);
        if (refreshed?.accessToken) {
            tokenInfo = refreshed;
            metaRes = await scheduleGoogleApiCall(() => fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`, {
                headers: { Authorization: `Bearer ${tokenInfo.accessToken}` }
            }));
        }
    }
    if (!metaRes.ok) throw new Error('Metadaten der Google Drive Datei konnten nicht geladen werden.');
    const meta = await metaRes.json();

    let downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    let effectiveMimeType = meta.mimeType;
    let effectiveFileName = meta.name;

    if (meta.mimeType === 'application/vnd.google-apps.document' ||
        meta.mimeType === 'application/vnd.google-apps.spreadsheet' ||
        meta.mimeType === 'application/vnd.google-apps.presentation') {
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;
        effectiveMimeType = 'application/pdf';
        if (!effectiveFileName.toLowerCase().endsWith('.pdf')) {
            effectiveFileName += '.pdf';
        }
    }

    const fileRes = await scheduleGoogleApiCall(() => fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${tokenInfo.accessToken}` }
    }));
    if (!fileRes.ok) throw new Error(`Google Drive Download fehlgeschlagen (HTTP ${fileRes.status})`);

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    return {
        buffer,
        fileName: effectiveFileName,
        mimeType: effectiveMimeType,
        size: buffer.length
    };
}

export async function importDriveFilesToClient(userId, clientId, fileIds, pbAdmin) {
    if (!clientId || !Array.isArray(fileIds) || fileIds.length === 0) return { imported: 0 };
    const client = await pbAdmin.collection('clients').getOne(clientId, { requestKey: null });
    let existingDocs = Array.isArray(client.documents) ? client.documents : [];

    const importedFiles = [];
    for (const fid of fileIds) {
        const fileData = await downloadDriveFile(userId, fid, pbAdmin);
        const formData = new FormData();
        for (const doc of existingDocs) formData.append('documents', doc);
        formData.append('documents', new Blob([fileData.buffer], { type: fileData.mimeType }), fileData.fileName);

        const updated = await pbAdmin.collection('clients').update(clientId, formData, { requestKey: null });
        existingDocs = Array.isArray(updated.documents) ? updated.documents : existingDocs;
        importedFiles.push(fileData.fileName);
    }

    return { success: true, count: importedFiles.length, files: importedFiles };
}

export async function importDriveFilesToAppointment(userId, appointmentId, fileIds, pbAdmin) {
    if (!appointmentId || !Array.isArray(fileIds) || fileIds.length === 0) return { imported: 0 };
    const appointment = await pbAdmin.collection('appointments').getOne(appointmentId, { requestKey: null });
    let existingAppDocs = Array.isArray(appointment.documents) ? appointment.documents : [];

    const importedFiles = [];
    for (const fid of fileIds) {
        const fileData = await downloadDriveFile(userId, fid, pbAdmin);
        const appFormData = new FormData();
        for (const doc of existingAppDocs) appFormData.append('documents', doc);
        appFormData.append('documents', new Blob([fileData.buffer], { type: fileData.mimeType }), fileData.fileName);
        const updatedApp = await pbAdmin.collection('appointments').update(appointmentId, appFormData, { requestKey: null });
        existingAppDocs = Array.isArray(updatedApp.documents) ? updatedApp.documents : existingAppDocs;

        const clientId = Array.isArray(appointment.client) ? appointment.client[0] : appointment.client;
        if (clientId) {
            try {
                const client = await pbAdmin.collection('clients').getOne(clientId, { requestKey: null });
                const clientFormData = new FormData();
                const existingClientDocs = Array.isArray(client.documents) ? client.documents : [];
                for (const cd of existingClientDocs) clientFormData.append('documents', cd);
                clientFormData.append('documents', new Blob([fileData.buffer], { type: fileData.mimeType }), fileData.fileName);
                await pbAdmin.collection('clients').update(clientId, clientFormData, { requestKey: null });
            } catch (cErr) {
                console.warn('[Google Drive] Klienten-Sync Warnung:', cErr);
            }
        }
        importedFiles.push(fileData.fileName);
    }

    return { success: true, count: importedFiles.length, files: importedFiles };
}
