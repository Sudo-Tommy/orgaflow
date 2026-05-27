import { pb } from '$lib/services/pocketbase';
import { dev } from '$app/environment';

// Dynamische URL: Lokal direkt an den Port 3000, Live via relativer URL an den Nginx-Proxy
export const MICROSERVICE_URL = dev ? 'http://127.0.0.1:3000/api/emails' : 'https://ihre-seniorenassistenz.com/api/emails';

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
 */
export async function fetchInbox(): Promise<EmailMessage[]> {
    if (!pb.authStore.isValid) {
        throw new Error('Nicht autorisiert: Bitte loggen Sie sich ein.');
    }

    const response = await fetch(`${MICROSERVICE_URL}/inbox`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${pb.authStore.token}`,
            'Content-Type': 'application/json'
        }
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        const snippet = text.substring(0, 150).replace(/\n/g, ' ');
        throw new Error(`Server-Fehler: HTML statt JSON erhalten. Antwort des Servers: '${snippet}...'`);
    }

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.error || 'Fehler beim Abrufen der E-Mails.');
    }

    return result.data;
}

/**
 * Markiert eine E-Mail als gelesen.
 */
export async function markEmailAsRead(uid: string): Promise<boolean> {
    if (!pb.authStore.isValid) return false;

    try {
        const response = await fetch(`${MICROSERVICE_URL}/mark-read`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${pb.authStore.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uid })
        });
        const result = await response.json();
        return result.success;
    } catch (err) {
        console.error("Fehler beim Markieren als gelesen:", err);
        return false;
    }
}

/**
 * Sendet eine E-Mail über den Microservice.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<{ messageId: string }> {
    if (!pb.authStore.isValid) {
        throw new Error('Nicht autorisiert: Bitte loggen Sie sich ein.');
    }

    const response = await fetch(`${MICROSERVICE_URL}/send`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${pb.authStore.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

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
}