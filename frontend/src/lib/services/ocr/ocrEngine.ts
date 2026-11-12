import { Capacitor, registerPlugin } from '@capacitor/core';

export interface OcrBlock {
    text: string;
    lines: string[];
}

export interface OcrResult {
    text: string;
    blocks: OcrBlock[];
}

interface MlKitOcrPlugin {
    recognizeText(options: { cachePath?: string; dataUrl?: string }): Promise<OcrResult>;
}

const MlKitOcr = registerPlugin<MlKitOcrPlugin>('MlKitOcr');

/**
 * Lokale Texterkennung auf dem Gerät via Google ML Kit (funktioniert komplett offline).
 */
export async function recognizeTextOnDevice(input: { cachePath?: string; dataUrl?: string }): Promise<OcrResult | null> {
    if (!Capacitor.isNativePlatform()) return null;
    try {
        const res = await MlKitOcr.recognizeText(input);
        if (!res?.text) return null;
        return res;
    } catch (e) {
        console.warn('Lokale Texterkennung nicht verfügbar:', e);
        return null;
    }
}
