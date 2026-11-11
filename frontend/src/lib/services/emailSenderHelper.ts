import { pb } from './pocketbase';
import { MICROSERVICE_URL } from './emailService';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { resolveCompanyData, resolveUserData, wrapOrgaFlowEmailHtml, buildTextSignature } from './emailCompanyService';

export interface SendEmailInput {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  body_html?: string;
  quote_html?: string;
  attachments?: File[];
  provider?: 'ionos' | 'google' | 'smtp' | 'gmail';
  fromName?: string;
  fromAddress?: string;
}

export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
}

export function base64ToFile(base64: string, filename: string, mimeType: string): File {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], filename, { type: mimeType });
}

export async function upsertSentMailboxRecord(params: {
    messageId: string;
    subject: string;
    fromAddress: string;
    toAddress: string;
    bodyText: string;
    bodyHtml: string;
    attachments?: File[];
}): Promise<void> {
    const authData = pb.authStore.model;
    const companyId = authData?.company ? (Array.isArray(authData.company) ? authData.company[0] : authData.company) : null;

    const existing = await pb.collection('mailbox_messages').getList(1, 5, {
        filter: `(message_id = "${params.messageId}" || (subject = "${params.subject.replace(/"/g, '\\"')}" && to_address ~ "${params.toAddress.split(',')[0].trim()}")) && folder = "Sent"`,
        sort: '-created',
        requestKey: null
    }).catch(() => null);

    const recentMatch = existing?.items?.find((item: any) => {
        if (item.message_id === params.messageId) return true;
        const createdDiff = Math.abs(Date.now() - new Date(item.created || item.date || 0).getTime());
        return createdDiff < 30000;
    });

    const formData = new FormData();
    formData.append('folder', 'Sent');
    formData.append('message_id', params.messageId);
    formData.append('subject', params.subject);
    formData.append('from_address', params.fromAddress);
    formData.append('to_address', params.toAddress);
    formData.append('date', new Date().toISOString());
    formData.append('body_text', params.bodyText);
    formData.append('body_html', params.bodyHtml);
    formData.append('is_read', 'true');
    if (authData?.id) formData.append('send_by', authData.id);
    if (companyId) formData.append('company', companyId);
    if (authData?.id) formData.append('user', authData.id);

    if (params.attachments && params.attachments.length > 0) {
        for (const file of params.attachments) {
            formData.append('attachments', file);
        }
    }

    if (recentMatch) {
        await pb.collection('mailbox_messages').update(recentMatch.id, formData);
    } else {
        await pb.collection('mailbox_messages').create(formData);
    }
}

export async function sendMailboxEmail(input: SendEmailInput): Promise<{ success: boolean; messageId?: string }> {
    const authData = pb.authStore.model;
    let attachmentPayload;
    if (input.attachments && input.attachments.length > 0) {
        attachmentPayload = await Promise.all(input.attachments.map(async (file) => ({
            filename: file.name,
            content: await fileToBase64(file),
            encoding: 'base64'
        })));
    }

    const compData = resolveCompanyData(orgaStore);
    const userData = resolveUserData(undefined, undefined, input.fromAddress);
    const formattedHtml = wrapOrgaFlowEmailHtml({
        bodyContent: input.body_html || input.body,
        quoteHtml: input.quote_html,
        userData,
        compData
    });

    const fullText = input.body.includes('--\n')
        ? input.body
        : `${input.body.trim()}${buildTextSignature(userData, compData)}`;

    const response = await fetch(`${MICROSERVICE_URL}/send`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pb.authStore.token}`
        },
        body: JSON.stringify({
            to: input.to,
            cc: input.cc,
            bcc: input.bcc,
            subject: input.subject,
            text: fullText,
            html: formattedHtml,
            attachments: attachmentPayload,
            provider: input.provider || 'ionos',
            fromName: input.fromName || compData.compName || 'Ihre Seniorenassistenz'
        })
    });

    if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
    }

    const result = await response.json();
    const defaultMsgId = (input.provider === 'google' ? "sent-gmail-" : "sent-ionos-") + Date.now();
    const finalMsgId = result.messageId || defaultMsgId;
    const fromResolved = result.from || (input.fromName ? `"${input.fromName}" <${input.fromAddress || authData?.email}>` : null) || authData?.email || "Ich";

    let fullTo = input.to;
    if (input.cc) fullTo += `, CC: ${input.cc}`;
    if (input.bcc) fullTo += `, BCC: ${input.bcc}`;

    await upsertSentMailboxRecord({
        messageId: finalMsgId,
        subject: input.subject,
        fromAddress: fromResolved,
        toAddress: fullTo,
        bodyText: fullText,
        bodyHtml: formattedHtml,
        attachments: input.attachments
    });

    return { success: true, messageId: finalMsgId };
}
