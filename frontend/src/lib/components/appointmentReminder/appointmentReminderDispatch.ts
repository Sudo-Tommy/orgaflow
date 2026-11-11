import { pb } from "$lib/services/pocketbase";
import { sendEmail } from "$lib/services/emailService";
import { toastStore } from "$lib/services/toastService.svelte";
import { orgaStore } from "$lib/stores/orgaStore.svelte";

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

export interface SendReminderEmailParams {
    recipient: string;
    cc?: string;
    bcc?: string;
    subject: string;
    message: string;
    appDate: string;
    appTime: string;
    appLocation: string;
    appDesc: string;
    appReport?: string;
    includeReport?: boolean;
    futureAppointments?: any[];
    selectedFutureAppIds?: string[];
    includeFutureApps?: boolean;
    attachments: File[];
    appointment: any;
}

export async function sendAppointmentReminderEmail(params: SendReminderEmailParams): Promise<boolean> {
    const {
        recipient, cc, bcc, subject, message, appDate, appTime, appLocation,
        appDesc, appReport, includeReport, futureAppointments = [],
        selectedFutureAppIds = [], includeFutureApps, attachments, appointment
    } = params;

    let rawUser = appointment?.expand?.user;
    const assignedUser = Array.isArray(rawUser) ? rawUser[0] : rawUser;
    const sendingUser = pb.authStore.model;

    let finalUserName = 'Ihre Seniorenassistenz';
    if (assignedUser && (assignedUser.name_first || assignedUser.name_last)) {
        finalUserName = `${assignedUser.name_first || ''} ${assignedUser.name_last || ''}`.trim();
    } else if (sendingUser && (sendingUser.name_first || sendingUser.name_last)) {
        finalUserName = `${sendingUser.name_first || ''} ${sendingUser.name_last || ''}`.trim();
    }
    const finalUserEmail = assignedUser?.email || sendingUser?.email || 'info@ihre-seniorenassistenz.com';
    const finalUserPhone = assignedUser?.handy || assignedUser?.tel || sendingUser?.handy || sendingUser?.tel || '0151 57515432';

    let compName = 'Ihre Seniorenassistenz';
    let compStreet = 'Dreyhauptstraße 2';
    let compCity = '06108 Halle (Saale)';
    let compWeb = 'www.ihre-seniorenassistenz.com';
    let compLogo = '';
    let companyId: string | null = null;
    const compSource = assignedUser || sendingUser;
    if (compSource && compSource.company) {
        companyId = Array.isArray(compSource.company) ? compSource.company[0] : compSource.company;
        const comp = orgaStore.company?.data?.find((c: any) => c.id === companyId);
        if (comp) {
            compName = comp.name || compName;
            compStreet = `${comp.street || ''} ${comp.housenr || ''}`.trim() || compStreet;
            compCity = `${comp.zip || ''} ${comp.city || ''}`.trim() || compCity;
            compWeb = comp.website || compWeb;
            if (comp.logo) {
                const logoFilename = Array.isArray(comp.logo) ? comp.logo[0] : comp.logo;
                const rawUrl = pb.files.getURL(comp, logoFilename);
                try {
                    const parsedUrl = new URL(rawUrl, 'https://ihre-seniorenassistenz.com');
                    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
                        parsedUrl.protocol = 'https:';
                        parsedUrl.hostname = 'ihre-seniorenassistenz.com';
                        parsedUrl.port = '';
                    }
                    compLogo = parsedUrl.toString();
                } catch {
                    compLogo = rawUrl;
                }
            }
        }
    }

    let reportHtml = '';
    let reportText = '';
    if (includeReport && appReport) {
        reportHtml = `
            <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #111827; font-size: 16px; margin-bottom: 12px;">Besuchsbericht:</h3>
                <div style="font-size: 14px; color: #4b5563; line-height: 1.6;">${appReport.replace(/\n/g, '<br>')}</div>
            </div>`;
        reportText = `\n\n--- BESUCHSBERICHT ---\n${appReport}\n`;
    }

    let futureAppsHtml = '';
    let futureAppsText = '';
    if (includeFutureApps && selectedFutureAppIds.length > 0) {
        const selectedApps = futureAppointments.filter(a => selectedFutureAppIds.includes(a.id));
        if (selectedApps.length > 0) {
            futureAppsHtml += `
                <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="margin-top: 0; color: #111827; font-size: 16px; margin-bottom: 12px;">Ihre nächsten Termine</h3>
                    <table cellpadding="0" cellspacing="0" style="font-size: 14px; color: #4b5563; width: 100%; border-collapse: collapse;">`;
            futureAppsText += `\n\n--- IHRE NÄCHSTEN TERMINE ---\n`;
            for (const app of selectedApps) {
                const dateStr = new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const timeStr = new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                futureAppsHtml += `
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; width: 150px; vertical-align: top;">
                            <strong style="color: #111827;">${dateStr}</strong><br><span style="color: #6b7280; font-size: 13px;">${timeStr} Uhr</span>
                        </td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; vertical-align: top; line-height: 1.5;">${app.description || 'Termin'}</td>
                    </tr>`;
                futureAppsText += `• ${dateStr} um ${timeStr} Uhr: ${app.description || 'Termin'}\n`;
            }
            futureAppsHtml += `</table></div>`;
        }
    }

    let attachmentPayload;
    if (attachments.length > 0) {
        attachmentPayload = await Promise.all(attachments.map(async (file) => ({
            filename: file.name,
            content: await fileToBase64(file),
            encoding: 'base64'
        })));
    }

    const textEmail = `${message.trim()}\n${reportText}\n${futureAppsText}\n--\n${finalUserName}\n${compName}\n${compStreet}, ${compCity}\nTelefon: ${finalUserPhone}\nE-Mail: ${finalUserEmail}\nWeb: ${compWeb}`;

    const htmlEmail = `
        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #fdf8f6; padding: 30px; border-bottom: 3px solid #458893;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td valign="middle">
                            <h1 style="color: #20565d; margin: 0; font-size: 24px; letter-spacing: -0.5px; font-weight: 800;">${compName}</h1>
                            <p style="color: #458893; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Alltagshilfe • Betreuung • Organisation</p>
                        </td>
                    ${compLogo ? `<td valign="middle" align="right" style="width: 100px;"><img src="${compLogo}" alt="Logo" width="100" style="max-height: 60px; max-width: 100px; object-fit: contain; border-radius: 6px;" /></td>` : ''}
                    </tr>
                </table>
            </div>
            <div style="padding: 35px 30px; font-size: 15px; line-height: 1.7; color: #1f2937; background-color: #ffffff;">
                ${message.trim().replace(/\n/g, '<br>').replace(/(?:<br>|\s)*(?:👉\s*)?(?:&lt;|<)?\s*https?:\/\/(?:www\.)?ihre-seniorenassistenz\.com\/portal\/?\s*(?:&gt;|>)?/gi, '<br><table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 15px 0;"><tr><td align="center" bgcolor="#458893" style="border-radius: 8px;"><a href="https://www.ihre-seniorenassistenz.com/portal" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Zum Klienten-Portal</a></td></tr></table><br>')}
                <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="margin-top: 0; color: #111827; font-size: 16px; margin-bottom: 12px;">Ihre Termindaten:</h3>
                    <table cellpadding="0" cellspacing="0" style="font-size: 14px; color: #4b5563; width: 100%;">
                        <tr><td style="padding: 4px 0; width: 80px;"><strong>Datum:</strong></td><td style="padding: 4px 0;">${appDate}</td></tr>
                        <tr><td style="padding: 4px 0;"><strong>Uhrzeit:</strong></td><td style="padding: 4px 0;">${appTime}</td></tr>
                        <tr><td style="padding: 4px 0; vertical-align: top;"><strong>Ort:</strong></td><td style="padding: 4px 0;">${appLocation ? appLocation.replace(/, /g, '<br>') : 'Beim Klienten zu Hause'}</td></tr>
                        <tr><td colspan="2" style="padding-top: 12px;"><strong>Anliegen / Beschreibung:</strong><br><div style="margin-top: 4px; padding: 10px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px;">${appDesc.replace(/\n/g, '<br>')}</div></td></tr>
                    </table>
                </div>
                ${reportHtml}
                ${futureAppsHtml}
            </div>
            <div style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e5e7eb;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; color: #4b5563;">
                    <tr><td valign="top" style="padding-bottom: 20px;"><strong style="color: #111827; font-size: 16px;">${finalUserName}</strong><br><span style="color: #458893; font-weight: 600; font-size: 13px;">Ihre Ansprechperson</span></td></tr>
                    <tr>
                        <td valign="top">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #4b5563; line-height: 1.6;">
                                <tr>
                                    <td width="50%" valign="top" style="padding-right: 15px; border-right: 1px solid #e5e7eb;"><strong style="color: #374151; font-size: 14px;">${compName}</strong><br>${compStreet}<br>${compCity}</td>
                                    <td width="50%" valign="top" style="padding-left: 20px;">
                                        <div style="margin-bottom: 4px;">📞 <a href="tel:${finalUserPhone}" style="color: #458893; text-decoration: none; font-weight: 500;">${finalUserPhone}</a></div>
                                        <div style="margin-bottom: 4px;">✉️ <a href="mailto:${finalUserEmail}" style="color: #458893; text-decoration: none; font-weight: 500;">${finalUserEmail}</a></div>
                                        <div>🌐 <a href="${compWeb.startsWith('http') ? compWeb : 'https://' + compWeb}" style="color: #458893; text-decoration: none; font-weight: 500;">${compWeb.replace(/^https?:\/\//, '')}</a></div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </div>
        </div>`;

    await sendEmail({
        to: recipient,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        text: textEmail,
        html: htmlEmail,
        attachments: attachmentPayload,
        provider: 'ionos'
    });

    return true;
}

export function openWhatsAppReminder(recipient: string, message: string): void {
    let cleanPhone = recipient.replace(/[^0-9+]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '+49' + cleanPhone.substring(1);
    const waText = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${waText}`;
    window.open(waUrl, '_blank');
}
