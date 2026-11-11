import fs from 'fs';
import path from 'path';

export const MM_TO_PT = 2.83464567;

export function sanitizePdfText(text: string): string {
    if (!text) return '';
    return text
        .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
        .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'")
        .replace(/[\u2013\u2014\u2015]/g, '-')
        .replace(/[\u2022\u25CF\u25AA\u25AB\u2023]/g, '-')
        .replace(/\u2026/g, '...')
        .replace(/\u00A0/g, ' ')
        .replace(/\u2192/g, '->')
        .replace(/[\u2713\u2714]/g, '[x]')
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFF]|\uD83E[\uDD00-\uDDFF]/g, '');
}

export function cleanBase64Image(base64Str: string | null | undefined): Buffer | null {
    if (!base64Str) return null;
    try {
        const clean = base64Str.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '').trim();
        if (!clean) return null;
        return Buffer.from(clean, 'base64');
    } catch {
        return null;
    }
}

export function resolveFaviconBuffer(): Buffer | null {
    try {
        const favPath = path.resolve('static/favicon.png');
        if (fs.existsSync(favPath)) {
            return fs.readFileSync(favPath);
        }
    } catch (e) {
        console.warn('Konnte favicon nicht lesen:', e);
    }
    return null;
}
