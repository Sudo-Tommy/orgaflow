import { wrapOrgaFlowEmailHtml, buildTextSignature } from './emailCompanyService';
export interface GeneratorEmailContentParams {
    emailText: string;
    includeReports: boolean;
    linkedAppointments: any[];
    includeFutureApps: boolean;
    futureAppointments: any[];
    selectedFutureAppIds: string[];
    userName: string;
    userEmail: string;
    userPhone: string;
    compName: string;
    compStreet: string;
    compCity: string;
    compWeb: string;
    compLogo: string;
}

export function buildGeneratorEmailContent(params: GeneratorEmailContentParams): { htmlEmail: string; textEmail: string } {
    const {
        emailText,
        includeReports,
        linkedAppointments,
        includeFutureApps,
        futureAppointments,
        selectedFutureAppIds,
        userName,
        userEmail,
        userPhone,
        compName,
        compStreet,
        compCity,
        compWeb,
        compLogo
    } = params;

    let reportsHtml = '';
    let reportsText = '';

    if (includeReports && linkedAppointments.some(a => a.report?.trim())) {
        reportsHtml += `
            <div style="margin-top: 30px; border-top: 2px dashed #e5e7eb; padding-top: 20px;">
                <h2 style="color: #954028; font-size: 20px; margin-bottom: 15px;">Ihre Besuchsberichte</h2>
        `;
        reportsText += `\n\n--- IHRE BESUCHSBERICHTE ---\n`;

        for (const app of linkedAppointments) {
            if (!app.report?.trim()) continue;
            
            const dateStr = new Date(app.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = new Date(app.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            
            reportsHtml += `
                <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                    <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 10px;">
                        <strong style="color: #111827; font-size: 16px;">Termin am ${dateStr} um ${timeStr} Uhr</strong><br>
                        <span style="color: #6b7280; font-size: 13px;">${app.description || 'Betreuungstermin'}</span>
                    </div>
                    <div style="color: #374151; font-size: 14px; line-height: 1.6;">
                        ${app.report.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;
            reportsText += `\nTermin am ${dateStr} um ${timeStr} Uhr\n${app.description || 'Betreuungstermin'}\n\n${app.report}\n\n`;
        }
        reportsHtml += `</div>`;
    }
    
    let futureAppsHtml = '';
    let futureAppsText = '';

    if (includeFutureApps && selectedFutureAppIds.length > 0) {
        const selectedApps = futureAppointments.filter(a => selectedFutureAppIds.includes(a.id));
        if (selectedApps.length > 0) {
            futureAppsHtml += `
                <div style="margin-top: 30px; border-top: 2px dashed #e5e7eb; padding-top: 20px;">
                    <h2 style="color: #954028; font-size: 20px; margin-bottom: 15px;">Ihre nächsten Termine</h2>
                    <table cellpadding="0" cellspacing="0" style="font-size: 14px; color: #4b5563; width: 100%; border-collapse: collapse;">
            `;
            futureAppsText += `\n\n--- IHRE NÄCHSTEN TERMINE ---\n`;

            for (const app of selectedApps) {
                const dateStr = new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const timeStr = new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                
                futureAppsHtml += `
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; width: 150px; vertical-align: top;">
                            <strong style="color: #111827;">${dateStr}</strong><br>
                            <span style="color: #6b7280; font-size: 13px;">${timeStr} Uhr</span>
                        </td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; vertical-align: top; line-height: 1.5;">
                            ${app.description || 'Termin'}
                        </td>
                    </tr>
                `;
                futureAppsText += `• ${dateStr} um ${timeStr} Uhr: ${app.description || 'Termin'}\n`;
            }
            futureAppsHtml += `</table></div>`;
        }
    }

    const compData = { compName, compStreet, compCity, compWeb, compLogo, companyId: null };
    const userData = { userName, userEmail, userPhone };
    const textEmail = `${emailText.trim()}${reportsText}${futureAppsText}${buildTextSignature(userData, compData)}`;
    const htmlEmail = wrapOrgaFlowEmailHtml({
        bodyContent: emailText.trim(),
        extraBlocksHtml: `${reportsHtml}${futureAppsHtml}`,
        userData,
        compData
    });

    return { htmlEmail, textEmail };
}
