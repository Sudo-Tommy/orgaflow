import { pb } from '$lib/services/pocketbase';
import { sendEmail } from '$lib/services/emailService';
import { googleCalendarService, type GoogleCalendarStatus } from '$lib/services/googleCalendarService';
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { resolveCompanyData, resolveUserData, wrapOrgaFlowEmailHtml, buildTextSignature } from '$lib/services/emailCompanyService';

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

export async function sendComposedEmail(params: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    message: string;
    attachments: File[];
    currentUser: any;
    provider?: 'ionos' | 'google';
}) {
    const { to, cc, bcc, subject, message, attachments, currentUser, provider = 'ionos' } = params;

    const compData = resolveCompanyData(orgaStore);
    let senderEmail: string | undefined = undefined;
    if (provider === 'google') {
        let googleStatus: GoogleCalendarStatus | null = null;
        try { googleStatus = await googleCalendarService.getStatus(); } catch {}
        senderEmail = googleStatus?.connected ? googleStatus.googleEmail : undefined;
    }
    const userData = resolveUserData(undefined, undefined, senderEmail);
    const { userName, userEmail } = userData;

    const htmlEmail = wrapOrgaFlowEmailHtml({
        bodyContent: message,
        userData,
        compData
    });

    const textEmail = `${message}${buildTextSignature(userData, compData)}`;

    const attachmentPayload = await Promise.all(attachments.map(async (file) => ({
        filename: file.name,
        content: await fileToBase64(file),
        encoding: 'base64'
    })));

    await sendEmail({
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        text: textEmail,
        html: htmlEmail,
        attachments: attachmentPayload.length > 0 ? attachmentPayload : undefined,
        provider
    });
}
