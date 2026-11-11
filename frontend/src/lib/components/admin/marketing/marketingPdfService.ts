export function getMarketingPdfUrl(): string {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    return isLocal ? 'http://localhost:3000/api/emails/generate-marketing-pdf' : '/api/emails/generate-marketing-pdf';
}

export async function requestMarketingPdf(payload: any): Promise<Response> {
    const primaryUrl = getMarketingPdfUrl();
    try {
        const res = await fetch(primaryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) return res;
        console.warn(`Primary PDF endpoint ${primaryUrl} returned status ${res.status}, trying fallback...`);
    } catch (e) {
        console.warn(`Primary PDF endpoint ${primaryUrl} failed, trying fallback...`, e);
    }
    return fetch('/api/generate-marketing-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
    }, 100);
}
