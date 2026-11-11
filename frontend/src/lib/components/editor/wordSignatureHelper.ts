/**
 * wordSignatureHelper.ts
 * Helper für reale Signatur-Vorschau und Pill-Darstellung im Word-Editor.
 */

export function isSignatureToken(token: string): boolean {
    const t = token.toLowerCase();
    return t.includes('signature') || t.includes('.sign}') || t.includes('_sign}');
}

export function getSignaturePillHtml(token: string, label: string): string {
    return `<span class="orga-token-chip orga-signature-chip" contenteditable="false" data-token="${token}" title="${token}">«✍️ ${label}»</span>`;
}

export function getSignatureSamplePreview(label: string): string {
    return `<div style="display: inline-block; vertical-align: top; margin: 2px 0;">` +
        `<svg width="130" height="32" viewBox="0 0 130 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; opacity: 0.88;">` +
            `<path d="M6 22 C16 12, 26 6, 34 18 C40 26, 46 10, 56 14 C66 18, 70 28, 82 20 C94 12, 102 22, 114 16 C120 13, 126 17, 128 14" stroke="#1e40af" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
            `<path d="M14 28 C38 27, 80 29, 124 26" stroke="#1e40af" stroke-width="1.3" stroke-linecap="round"/>` +
        `</svg>` +
        `<div style="border-bottom: 1px solid #4b5563; width: 140px; height: 1px; margin-top: 2px;"></div>` +
    `</div>`;
}

