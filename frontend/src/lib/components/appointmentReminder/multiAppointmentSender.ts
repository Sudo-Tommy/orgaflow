import { pb } from "$lib/services/pocketbase";
import { sendEmail } from "$lib/services/emailService";
import { generateReminderEmailHtml } from "$lib/services/appointmentReminderService";
import type { AppointmentMessageType } from "./multiAppointmentReminderHelper";

export interface SendMultiAppointmentParams {
    method: 'email' | 'whatsapp';
    recipient: string;
    cc?: string;
    bcc?: string;
    subject: string;
    message: string;
    messageType: AppointmentMessageType;
    availableAppointments: any[];
    selectedAppointmentIds: string[];
}

export async function sendMultiAppointmentMessage(params: SendMultiAppointmentParams): Promise<string> {
    const { method, recipient, cc, bcc, subject, message, messageType, availableAppointments, selectedAppointmentIds } = params;

    if (method === 'email') {
        const sendingUser = pb.authStore.model;
        const finalUserName = sendingUser ? `${sendingUser.name_first || ''} ${sendingUser.name_last || ''}`.trim() : 'Ihre Seniorenassistenz';
        const finalUserEmail = sendingUser?.email || 'info@ihre-seniorenassistenz.com';
        const finalUserPhone = sendingUser?.handy || sendingUser?.tel || '0151 57515432';
        const companyId = sendingUser?.company ? (Array.isArray(sendingUser.company) ? sendingUser.company[0] : sendingUser.company) : null;

        const selectedApps = availableAppointments.filter((a) => selectedAppointmentIds.includes(a.id));
        const { textEmail, htmlEmail } = generateReminderEmailHtml({
            message,
            selectedApps,
            finalUserName,
            finalUserEmail,
            finalUserPhone,
            companyId,
            messageType
        });

        await sendEmail({
            to: recipient,
            cc: cc || undefined,
            bcc: bcc || undefined,
            subject,
            text: textEmail,
            html: htmlEmail,
            provider: 'ionos'
        });
    } else {
        let cleanPhone = recipient.replace(/[^0-9+]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '49' + cleanPhone.substring(1);
        cleanPhone = cleanPhone.replace('+', '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    }

    return messageType === 'report'
        ? 'Besuchsbericht erfolgreich versendet!'
        : messageType === 'change'
        ? 'Terminänderung erfolgreich versendet!'
        : messageType === 'info'
        ? 'Termin-Info erfolgreich versendet!'
        : 'Erinnerung erfolgreich versendet!';
}
