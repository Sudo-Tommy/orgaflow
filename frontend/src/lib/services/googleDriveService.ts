import { pb } from './pocketbase';
import { dev } from '$app/environment';

export interface DriveItem {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    isFolder: boolean;
    modifiedTime?: string;
    iconLink?: string;
    thumbnailLink?: string;
    webViewLink?: string;
}

export interface GoogleDriveStatus {
    connected: boolean;
    hasCredentials: boolean;
    googleEmail: string;
    appName?: string;
    projectId?: string;
    activationUrl?: string;
    consentScreenUrl?: string;
}

export interface DriveListError extends Error {
    errorCode?: string;
    activationUrl?: string | null;
    consentScreenUrl?: string | null;
}

const API_BASE = dev ? 'http://localhost:3000/api/google-drive' : '/api/emails/google-drive';

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pb.authStore.token}`
    };
}

export const googleDriveService = {
    async getStatus(): Promise<GoogleDriveStatus> {
        if (!pb.authStore.isValid) {
            return { connected: false, hasCredentials: false, googleEmail: '', appName: 'Seniorenassistenz OrgaFlow' };
        }
        try {
            const res = await fetch(`${API_BASE}/status?_t=${Date.now()}`, {
                headers: getHeaders(),
                cache: 'no-store'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return {
                connected: Boolean(data.connected),
                hasCredentials: Boolean(data.hasCredentials),
                googleEmail: data.googleEmail || '',
                appName: data.appName || 'Seniorenassistenz OrgaFlow',
                projectId: data.projectId || '485464187491',
                activationUrl: data.activationUrl || 'https://console.cloud.google.com/apis/library/drive.googleapis.com?project=485464187491',
                consentScreenUrl: data.consentScreenUrl || 'https://console.cloud.google.com/apis/credentials/consent?project=485464187491'
            };
        } catch {
            return { connected: false, hasCredentials: false, googleEmail: '', appName: 'Seniorenassistenz OrgaFlow' };
        }
    },

    async getAuthUrl(): Promise<string> {
        const res = await fetch(`${API_BASE}/auth-url?_t=${Date.now()}`, {
            headers: getHeaders(),
            cache: 'no-store'
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Google-Login-URL nicht verfügbar.');
        return data.url;
    },

    async openOAuthPopup(): Promise<{ success: boolean; email?: string }> {
        const authUrl = await this.getAuthUrl();
        return new Promise((resolve) => {
            const width = 560;
            const height = 680;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            const popup = window.open(
                authUrl,
                'SeniorenassistenzOrgaFlowGoogleAuth',
                `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
            );

            if (!popup) {
                window.location.href = authUrl;
                return;
            }

            let resolved = false;
            const finish = (result: { success: boolean; email?: string }) => {
                if (resolved) return;
                resolved = true;
                clearInterval(checkClosed);
                window.removeEventListener('message', messageHandler);
                resolve(result);
            };

            const messageHandler = (event: MessageEvent) => {
                if (event.data?.type === 'GOOGLE_DRIVE_CONNECTED' || event.data?.type === 'GOOGLE_CALENDAR_CONNECTED') {
                    finish({ success: true, email: event.data.email });
                } else if (event.data?.type === 'GOOGLE_DRIVE_ERROR' || event.data?.type === 'GOOGLE_CALENDAR_ERROR') {
                    finish({ success: false });
                }
            };
            window.addEventListener('message', messageHandler);

            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    this.getStatus().then(status => {
                        finish({ success: status.connected, email: status.googleEmail });
                    }).catch(() => finish({ success: false }));
                }
            }, 700);
        });
    },

    async listFiles(folderId?: string, search?: string, pageToken?: string): Promise<{ files: DriveItem[]; nextPageToken: string | null }> {
        const params = new URLSearchParams();
        if (folderId) params.set('folderId', folderId);
        if (search) params.set('search', search);
        if (pageToken) params.set('pageToken', pageToken);
        params.set('_t', String(Date.now()));

        const url = `${API_BASE}/files?${params.toString()}`;
        const res = await fetch(url, {
            headers: getHeaders(),
            cache: 'no-store'
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            const err: DriveListError = new Error(errBody.error || `HTTP ${res.status}`);
            err.errorCode = errBody.errorCode || errBody.error || `HTTP_${res.status}`;
            err.activationUrl = errBody.activationUrl || null;
            err.consentScreenUrl = errBody.consentScreenUrl || null;
            throw err;
        }
        const data = await res.json();
        return {
            files: data.files || [],
            nextPageToken: data.nextPageToken || null
        };
    },

    async downloadAsFile(item: DriveItem): Promise<File> {
        const res = await fetch(`${API_BASE}/download/${item.id}`, { headers: getHeaders() });
        if (!res.ok) throw new Error(`Download von "${item.name}" fehlgeschlagen.`);
        const blob = await res.blob();
        let fileName = item.name;
        if (item.mimeType.startsWith('application/vnd.google-apps.') && !fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
        }
        return new File([blob], fileName, { type: blob.type || 'application/pdf' });
    },

    async importToClient(clientId: string, fileIds: string[]): Promise<{ success: boolean; count: number; files: string[] }> {
        const res = await fetch(`${API_BASE}/import-to-client`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ clientId, fileIds })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Import in Klientenakte fehlgeschlagen.');
        return data;
    },

    async importToAppointment(appointmentId: string, fileIds: string[]): Promise<{ success: boolean; count: number; files: string[] }> {
        const res = await fetch(`${API_BASE}/import-to-appointment`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ appointmentId, fileIds })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Import in Termin fehlgeschlagen.');
        return data;
    },

    formatFileSize(bytes: number): string {
        if (!bytes || bytes <= 0) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
};
