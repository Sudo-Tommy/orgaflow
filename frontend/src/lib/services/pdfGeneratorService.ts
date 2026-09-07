import { dev } from '$app/environment';

/**
 * Ermittelt die Basis-URLs für die PDF-Generierung.
 * In lokaler Umgebung (localhost/127.0.0.1) wird direkt der Node-Microservice (Port 3000)
 * sowie der SvelteKit Dev-Server / Proxy als Fallback angesprochen.
 * In Produktion wird über den Nginx-Proxy (/api/emails/generate-pdf bzw. /api/generate-pdf) geroutet.
 */
export function getPdfGenerationEndpoints(): string[] {
    const endpoints: string[] = [];

    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname || '127.0.0.1';
        const isLocal = !hostname.includes('ihre-seniorenassistenz.com');
        if (isLocal) {
            // Lokal: Zuerst direkt Port 3000 des Microservice ansprechen
            endpoints.push(`http://${hostname}:3000/api/emails/generate-pdf`);
            endpoints.push(`http://${hostname}:3000/api/generate-pdf`);
            // Dann relative URLs (falls Nginx oder Vite-Proxy aktiv ist)
            endpoints.push('/api/generate-pdf');
            endpoints.push('/api/emails/generate-pdf');
        } else {
            // Live-Produktion: Über Nginx-Proxy
            endpoints.push('/api/emails/generate-pdf');
            endpoints.push('/api/generate-pdf');
        }
    } else {
        endpoints.push('/api/generate-pdf');
        endpoints.push('/api/emails/generate-pdf');
    }

    return endpoints;
}

export interface GeneratePdfOptions {
    templateJson: any;
    data?: any;
    isTimesheet?: boolean;
}

/**
 * Sendet einen PDF-Generierungsauftrag mit robustem automatischem Multi-Endpoint-Fallback.
 * Verhindert net::ERR_CONNECTION_REFUSED auf Port 5173 oder Port 8090.
 */
export async function generatePdfBlob(payload: GeneratePdfOptions): Promise<Blob> {
    const endpoints = getPdfGenerationEndpoints();
    let lastError: any = null;

    for (const url of endpoints) {
        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (resp.ok) {
                return await resp.blob();
            }

            // Falls die Route auf diesem Port nicht existiert (404), nächsten Endpunkt versuchen
            if (resp.status === 404) {
                continue;
            }

            const errJson = await resp.json().catch(() => ({}));
            throw new Error(errJson.error || `Server meldet Fehler bei PDF-Erstellung (HTTP ${resp.status})`);
        } catch (err: any) {
            lastError = err;
            // Falls Netzwerkfehler / ERR_CONNECTION_REFUSED -> nächsten Endpunkt testen
        }
    }

    throw lastError || new Error("PDF-Dienst ist derzeit nicht erreichbar. Bitte stellen Sie sicher, dass der Microservice läuft.");
}
