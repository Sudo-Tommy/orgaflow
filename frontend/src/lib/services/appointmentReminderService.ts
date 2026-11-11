import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { wrapOrgaFlowEmailHtml, buildTextSignature } from "./emailCompanyService";
import type { AppointmentMessageType } from "$lib/components/appointmentReminder/multiAppointmentReminderHelper";
import { buildAppointmentReminderAiPrompt } from "./appointmentReminderAiPromptHelper";

export function generateReminderEmailHtml(params: {
    message: string;
    selectedApps: any[];
    finalUserName: string;
    finalUserEmail: string;
    finalUserPhone: string;
    companyId?: string | null;
    messageType?: AppointmentMessageType;
}) {
    const { message, selectedApps, finalUserName, finalUserEmail, finalUserPhone, companyId, messageType = 'reminder' } = params;

    let compName = 'Ihre Seniorenassistenz';
    let compStreet = 'Dreyhauptstraße 2';
    let compCity = '06108 Halle (Saale)';
    let compWeb = 'www.ihre-seniorenassistenz.com';
    let compLogo = '';

    if (companyId) {
        const comp = orgaStore.company?.data?.find((c: any) => c.id === companyId);
        if (comp) {
            compName = comp.name || compName;
            compStreet = `${comp.street || ''} ${comp.housenr || ''}`.trim() || compStreet;
            compCity = `${comp.zip || ''} ${comp.city || ''}`.trim() || compCity;
            compWeb = comp.website || compWeb;
            if (comp.logo) {
                const logoFilename = Array.isArray(comp.logo) ? comp.logo[0] : comp.logo;
                const logoUrl = pb.files.getURL(comp, logoFilename);
                compLogo = logoUrl.startsWith('http') 
                    ? logoUrl.replace(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, 'https://www.ihre-seniorenassistenz.com') 
                    : `https://www.ihre-seniorenassistenz.com${logoUrl}`;
            }
        }
    }

    let appsHtml = '';
    selectedApps.forEach(app => {
        const dateStr = new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        appsHtml += `
            <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb; width: 140px;"><strong>${dateStr}</strong><br><span style="color: #6b7280; font-size: 13px;">${timeStr} Uhr</span></td>
                <td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb;">${app.description || 'Termin'}</td>
            </tr>
        `;
    });

    const compData = { compName, compStreet, compCity, compWeb, compLogo, companyId: companyId || null };
    const userData = { userName: finalUserName, userEmail: finalUserEmail, userPhone: finalUserPhone };
    const textEmail = `${message}${buildTextSignature(userData, compData)}`;

    let tableTitle = 'Die gebuchten Termine:';
    if (messageType === 'report') tableTitle = 'Termindetails zum Besuchsbericht:';
    else if (messageType === 'change') tableTitle = 'Aktualisierte Termindetails:';
    else if (messageType === 'info') tableTitle = 'Terminübersicht:';

    const appointmentsBlockHtml = `
        <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #111827; font-size: 16px; margin-bottom: 12px;">${tableTitle}</h3>
            <table cellpadding="0" cellspacing="0" style="font-size: 14px; color: #4b5563; width: 100%; border-collapse: collapse;">
                ${appsHtml}
            </table>
        </div>
    `;

    const cleanMessageText = message.split('\n\n').filter(p => !p.startsWith('•')).join('\n\n');

    const htmlEmail = wrapOrgaFlowEmailHtml({
        bodyContent: cleanMessageText,
        extraBlocksHtml: appointmentsBlockHtml,
        userData,
        compData
    });

    return { textEmail, htmlEmail };
}

export async function requestAiAppointmentReminder(params: {
    selectedApps: any[];
    client: any;
    selectedContactRefs: any[];
    messageType?: AppointmentMessageType;
}) {
    const prompt = buildAppointmentReminderAiPrompt({
        selectedApps: params.selectedApps,
        client: params.client,
        selectedContactRefs: params.selectedContactRefs,
        type: params.messageType
    });

    const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
    const res = await fetch(`${microserviceUrl}/api/emails/ai/transcribe`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pb.authStore.token}`
        },
        body: JSON.stringify({
            prompt,
            inputText: "Generiere die Nachricht basierend auf dem Prompt."
        })
    });

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Server-Fehler bei der KI-Anfrage.");
    return data.text as string;
}
