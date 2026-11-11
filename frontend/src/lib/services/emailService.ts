import { pb } from '$lib/services/pocketbase';
import { dev } from '$app/environment';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { resolveCompanyData, resolveUserData, wrapOrgaFlowEmailHtml, buildTextSignature } from '$lib/services/emailCompanyService';
import { upsertSentMailboxRecord, base64ToFile } from '$lib/services/emailSenderHelper';
import { getMicroserviceUrl } from '$lib/services/apiConfig';

export const MICROSERVICE_URL = getMicroserviceUrl();

export interface SendEmailPayload {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{ filename: string; content: string; encoding: string; contentType?: string }>;
    provider?: 'ionos' | 'google' | 'smtp' | 'gmail';
    fromName?: string;
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
            return [];
        }

        const result = await response.json();
        if (!response.ok || !result.success) return [];
        return result.data || [];
    } catch {
        clearTimeout(timeoutId);
        return [];
    }
}

export async function markEmailAsRead(uid: string, isRead: boolean = true): Promise<boolean> {
    if (!pb.authStore.isValid || !uid) return false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(`${MICROSERVICE_URL}/mark-read`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${pb.authStore.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uid, is_read: isRead }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        const result = await response.json();
        return result?.success || false;
    } catch {
        clearTimeout(timeoutId);
        return false;
    }
}

export async function deleteEmailFromImap(uid: string): Promise<boolean> {
    if (!pb.authStore.isValid || !uid) return false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(`${MICROSERVICE_URL}/delete`, {
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
    } catch {
        clearTimeout(timeoutId);
        return false;
    }
}

export async function sendEmail(payload: SendEmailPayload): Promise<{ messageId: string; provider?: string; from?: string }> {
    if (!pb.authStore.isValid) {
        throw new Error('Nicht autorisiert: Bitte loggen Sie sich ein.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
        const compData = resolveCompanyData(orgaStore);
        const userData = resolveUserData();

        let html = payload.html;
        if (!html && payload.text) {
            html = wrapOrgaFlowEmailHtml({
                bodyContent: payload.text,
                userData,
                compData
            });
        } else if (html && !html.includes('Alltagshilfe • Betreuung • Organisation')) {
            html = wrapOrgaFlowEmailHtml({
                bodyContent: html,
                userData,
                compData
            });
        }

        const finalText = payload.text || `${userData.userName}\n${compData.compName}${buildTextSignature(userData, compData)}`;
        const resolvedFromName = payload.fromName || compData?.compName || 'Ihre Seniorenassistenz';

        const fullPayload = {
            ...payload,
            text: finalText,
            html,
            provider: payload.provider || 'ionos',
            fromName: resolvedFromName
        };

        const response = await fetch(`${MICROSERVICE_URL}/send`, {
            method: 'POST',
            headers: {
                'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fullPayload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            const snippet = text.substring(0, 150).replace(/\n/g, ' ');
            throw new Error(`Server-Fehler beim Senden: '${snippet}...'`);
        }

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Fehler beim Senden der E-Mail.');
        }

        const finalMsgId = result.messageId || `sent-${payload.provider || 'ionos'}-${Date.now()}`;
        const fromAddress = result.from || `"${resolvedFromName}" <${userData.userEmail}>`;
        let fullTo = payload.to;
        if (payload.cc) fullTo += `, CC: ${payload.cc}`;
        if (payload.bcc) fullTo += `, BCC: ${payload.bcc}`;

        let fileObjects: File[] | undefined;
        if (payload.attachments && payload.attachments.length > 0) {
            try {
                fileObjects = payload.attachments.map(a =>
                    base64ToFile(a.content, a.filename, a.contentType || 'application/pdf')
                );
            } catch {}
        }

        await upsertSentMailboxRecord({
            messageId: finalMsgId,
            subject: payload.subject,
            fromAddress,
            toAddress: fullTo,
            bodyText: finalText,
            bodyHtml: html || '',
            attachments: fileObjects
        }).catch(() => {});

        return { messageId: finalMsgId, provider: result.provider, from: fromAddress };
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError' || err.message?.includes('aborted')) {
            throw new Error('E-Mail-Versand dauerte zu lange (Zeitüberschreitung).');
        }
        throw err;
    }
}
