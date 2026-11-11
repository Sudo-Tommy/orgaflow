import { dev } from '$app/environment';
import { pb } from '$lib/services/pocketbase';
import { isNativeApp, PROD_ORIGIN } from '$lib/services/apiConfig';

/**
 * Ermittelt die Basis-URLs für die PDF-Generierung.
 * Auf nativen Mobilgeräten wird direkt die gesicherte Produktions-URL angesprochen.
 * In lokaler Umgebung wird direkt der Node-Microservice (Port 3000) angesprochen.
 * In Produktion wird über den Nginx-Proxy (/api/emails/generate-pdf) geroutet.
 */
export function getPdfGenerationEndpoints(): string[] {
    const endpoints: string[] = [];

    if (isNativeApp()) {
        endpoints.push(`${PROD_ORIGIN}/api/emails/generate-pdf`);
        endpoints.push(`${PROD_ORIGIN}/api/generate-pdf`);
        return endpoints;
    }

    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname || '127.0.0.1';
        const isLocal = !hostname.includes('ihre-seniorenassistenz.com');
        if (isLocal) {
            // Lokal: Zuerst direkt Port 3000 des Microservice ansprechen
            endpoints.push(`http://${hostname}:3000/api/emails/generate-pdf`);
            endpoints.push(`http://${hostname}:3000/api/generate-pdf`);
            // Dann relative URLs (falls Nginx oder Vite-Proxy aktiv ist)
            endpoints.push('/api/emails/generate-pdf');
            endpoints.push('/api/generate-pdf');
        } else {
            // Live-Produktion: Über Nginx-Proxy (/api/emails/ leitet auf Port 3000)
            endpoints.push('/api/emails/generate-pdf');
            endpoints.push('/api/generate-pdf');
        }
    } else {
        endpoints.push('/api/emails/generate-pdf');
        endpoints.push('/api/generate-pdf');
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

    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    if (pb.authStore.token) {
        headers['Authorization'] = `Bearer ${pb.authStore.token}`;
    }

    for (const url of endpoints) {
        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (resp.ok) {
                return await resp.blob();
            }

            // Falls Authentifizierungsfehler vorliegt, nicht zu ungültigen Fallback-URLs wechseln
            if (resp.status === 401 || resp.status === 403) {
                const errJson = await resp.json().catch(() => ({}));
                throw new Error(errJson.error || `Zugriff verweigert (HTTP ${resp.status}). Bitte erneut anmelden.`);
            }

            // Falls die Route auf diesem Port nicht existiert (404), nächsten Endpunkt versuchen
            if (resp.status === 404) {
                continue;
            }

            const errJson = await resp.json().catch(() => ({}));
            throw new Error(errJson.error || `Server meldet Fehler bei PDF-Erstellung (HTTP ${resp.status})`);
        } catch (err: any) {
            lastError = err;
            if (err.message && (err.message.includes('Zugriff verweigert') || err.message.includes('HTTP 401') || err.message.includes('HTTP 403'))) {
                throw err;
            }
            // Falls Netzwerkfehler / ERR_CONNECTION_REFUSED -> nächsten Endpunkt testen
        }
    }

    throw lastError || new Error("PDF-Dienst ist derzeit nicht erreichbar. Bitte stellen Sie sicher, dass der Microservice läuft.");
}
