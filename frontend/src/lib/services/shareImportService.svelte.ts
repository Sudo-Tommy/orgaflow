import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export interface IncomingSharedItem {
    name: string;
    mimeType: string;
    cachePath: string;
    size: number;
}

interface ShareTargetPluginInterface {
    getPendingShares(): Promise<{ files: IncomingSharedItem[] }>;
    clearPendingShares(): Promise<void>;
    addListener(eventName: 'sharedFilesReceived', cb: (payload: { files: IncomingSharedItem[] }) => void): Promise<{ remove: () => void }>;
}

const ShareTarget = registerPlugin<ShareTargetPluginInterface>('ShareTarget');

function base64ToBlob(base64: string, mimeType: string): Blob {
    const clean = base64.includes(',') ? base64.split(',')[1] : base64;
    const bytes = atob(clean);
    const buf = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
    return new Blob([buf], { type: mimeType });
}

class ShareImportService {
    pendingFiles = $state<File[]>([]);
    private initialized = false;

    async init(): Promise<void> {
        if (!Capacitor.isNativePlatform() || this.initialized) return;
        this.initialized = true;

        try {
            await ShareTarget.addListener('sharedFilesReceived', (payload) => {
                this.loadFromItems(payload?.files || []);
            });
            const initial = await ShareTarget.getPendingShares();
            if (initial?.files?.length) {
                await this.loadFromItems(initial.files);
            }
        } catch (e) {
            console.warn('ShareTarget-Initialisierung übersprungen:', e);
        }
    }

    private async loadFromItems(items: IncomingSharedItem[]): Promise<void> {
        const loaded: File[] = [];
        for (const item of items) {
            try {
                const read = await Filesystem.readFile({
                    path: item.cachePath,
                    directory: Directory.Cache
                });
                if (typeof read.data === 'string') {
                    const blob = base64ToBlob(read.data, item.mimeType || 'application/pdf');
                    loaded.push(new File([blob], item.name, { type: blob.type }));
                }
            } catch (e) {
                console.warn('Geteilte Datei konnte nicht gelesen werden:', e);
            }
        }
        if (loaded.length > 0) {
            this.pendingFiles = [...this.pendingFiles, ...loaded];
        }
    }

    async clearAll(): Promise<void> {
        this.pendingFiles = [];
        if (Capacitor.isNativePlatform()) {
            await ShareTarget.clearPendingShares().catch(() => {});
        }
    }
}

export const shareImportService = new ShareImportService();
