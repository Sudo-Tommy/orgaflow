import { pb } from '$lib/services/pocketbase';
import { dev } from '$app/environment';

// Dynamische URL: Lokal direkt an den Port 3000, Live via relativer URL an den Nginx-Proxy
export const MICROSERVICE_URL = dev ? 'http://127.0.0.1:3000/api/emails' : '/api/emails';

export interface SendEmailPayload {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{ filename: string; content: string; encoding: string }>;
}

export interface EmailMessage {
    attachments?: Array<{ filename: string; content: string; contentType: string }>;
    uid: string;
    subject: string;
    from: string;
    to: string;
    date: string;
    text: string;
    html: string;
    is_read?: boolean;
}

/**
 * Ruft die neuesten E-Mails aus dem Posteingang über den Microservice ab.
 * Ausgestattet mit hartem 5.000 ms Timeout via AbortController gegen UI-Freezes.
 */
export async function fetchInbox(externalSignal?: AbortSignal): Promise<EmailMessage[]> {
    if (!pb.authStore.isValid) {
        throw new Error('Nicht autorisiert: Bitte loggen Sie sich ein.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    if (externalSignal) {
        if (externalSignal.aborted) {
            clearTimeout(timeoutId);
            return [];
        }
        externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
        const response = await fetch(`${MICROSERVICE_URL}/inbox`, {
            method: 'GET',
            headers: {
                'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : '',
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            const snippet = text.substring(0, 150).replace(/\n/g, ' ');
            console.warn(`[emailService] Microservice lieferte HTML statt JSON: ${snippet}`);
            return [];
        }

        const result = await response.json();

        if (!response.ok || !result.success) {
            console.warn(`[emailService] Inbox Abruf: ${result.error || response.statusText}`);
            return [];
        }

        return result.data || [];
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError' || err.message?.includes('aborted')) {
            console.warn('[emailService] Inbox Abruf nach 5.000 ms abgebrochen (UI-Freeze Schutz).');
            return [];
        }
        console.warn('[emailService] Microservice nicht erreichbar oder Netzwerkfehler:', err.message);
        return [];
    }
}

/**
 * Markiert eine E-Mail als gelesen mit 5.000 ms Timeout-Schutz.
 */
export async function markEmailAsRead(uid: string): Promise<boolean> {
    if (!pb.authStore.isValid) return false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(`${MICROSERVICE_URL}/mark-read`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${pb.authStore.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uid }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const result = await response.json();
        return result?.success || false;
    } catch (err: any) {
        clearTimeout(timeoutId);
        console.error("Fehler beim Markieren als gelesen:", err.message);
        return false;
    }
}

/**
 * Sendet eine E-Mail über den Microservice mit 10.000 ms Timeout.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<{ messageId: string }> {
    if (!pb.authStore.isValid) {
        throw new Error('Nicht autorisiert: Bitte loggen Sie sich ein.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(`${MICROSERVICE_URL}/send`, {
            method: 'POST',
            headers: {
                'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            const snippet = text.substring(0, 150).replace(/\n/g, ' ');
            throw new Error(`Server-Fehler beim Senden (HTML statt JSON). Antwort des Servers: '${snippet}...'`);
        }

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Fehler beim Senden der E-Mail.');
        }

        return { messageId: result.messageId };
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError' || err.message?.includes('aborted')) {
            throw new Error('E-Mail-Versand dauerte länger als 10 Sekunden (Timeout abgebrochen).');
        }
        throw err;
    }
}