import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { getAbsoluteFileUrl, openPdfDocument } from '$lib/utils/pdfViewerHelper';
import { toastStore } from '$lib/services/toastService.svelte';

function sanitizeFileName(name: string): string {
    const safe = (name || 'Dokument.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    return safe || `Dokument_${Date.now()}.pdf`;
}

async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const raw = String(reader.result || '');
            const idx = raw.indexOf(',');
            resolve(idx >= 0 ? raw.slice(idx + 1) : raw);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function fetchBlob(url: string): Promise<Blob> {
    const absUrl = getAbsoluteFileUrl(url);
    const res = await fetch(absUrl);
    if (!res.ok) throw new Error('Dokument konnte nicht geladen werden.');
    return res.blob();
}

async function writeToNativeCache(blob: Blob, filename: string): Promise<string> {
    const path = `share_tmp/${Date.now()}_${sanitizeFileName(filename)}`;
    const base64 = await blobToBase64(blob);
    const result = await Filesystem.writeFile({
        path,
        data: base64,
        directory: Directory.Cache,
        recursive: true
    });
    return result.uri;
}

/**
 * Teilt ein PDF/Dokument nativ über das Android Share-Menü (WhatsApp, E-Mail, Signal ...)
 * oder im Browser über Web Share API / Download-Fallback.
 */
export async function shareBlobFile(blob: Blob, filename: string, title?: string): Promise<boolean> {
    const cleanName = sanitizeFileName(filename);
    try {
        if (Capacitor.isNativePlatform()) {
            const uri = await writeToNativeCache(blob, cleanName);
            await Share.share({
                title: title || cleanName,
                dialogTitle: 'Dokument teilen',
                files: [uri]
            });
            return true;
        }

        const file = new File([blob], cleanName, { type: blob.type || 'application/pdf' });
        if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
            await navigator.share({ title: title || cleanName, files: [file] });
            return true;
        }

        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = cleanName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(objUrl);
        }, 200);
        toastStore.info('Teilen wird in diesem Browser nicht direkt unterstützt – Datei wurde heruntergeladen.');
        return true;
    } catch (e: any) {
        if (String(e?.message || '').toLowerCase().includes('cancel')) return false;
        toastStore.error('Dokument konnte nicht geteilt werden.');
        return false;
    }
}

export async function shareFileFromUrl(url: string | null | undefined, filename: string, title?: string): Promise<boolean> {
    if (!url) {
        toastStore.error('Kein Dokument zum Teilen vorhanden.');
        return false;
    }
    try {
        const blob = await fetchBlob(url);
        return await shareBlobFile(blob, filename, title);
    } catch {
        toastStore.error('Dokument konnte nicht zum Teilen geladen werden.');
        return false;
    }
}

/**
 * Öffnet ein PDF zuverlässig lokal auf Android über die installierte PDF-App (z. B. Samsung Notes / Adobe).
 */
export async function openPdfNatively(urlOrBlob: string | Blob, filename: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        if (typeof urlOrBlob === 'string') {
            openPdfDocument(urlOrBlob, filename);
        } else {
            openPdfDocument(URL.createObjectURL(urlOrBlob), filename);
        }
        return;
    }

    try {
        const blob = typeof urlOrBlob === 'string' ? await fetchBlob(urlOrBlob) : urlOrBlob;
        const uri = await writeToNativeCache(blob, filename);
        const contentType = blob.type || (filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/*');
        await FileOpener.open({ filePath: uri, contentType, openWithDefault: true });
    } catch {
        if (typeof urlOrBlob === 'string') {
            openPdfDocument(urlOrBlob, filename);
        } else {
            await shareBlobFile(urlOrBlob, filename);
        }
    }
}
