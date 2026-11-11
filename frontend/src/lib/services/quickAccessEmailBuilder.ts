import { wrapOrgaFlowEmailHtml, type EmailCompanyData, type EmailUserData } from './emailCompanyService';

export function buildQuickAccessBodyHtml(params: {
    targetName: string;
    greeting?: string;
    portalUrl: string;
    portalPin: string;
}): string {
    const { targetName, greeting, portalUrl, portalPin } = params;
    const headerGreeting = greeting ? `${greeting},` : `Guten Tag ${targetName},`;
    return `
<h2 style="margin: 0 0 16px 0; font-size: 19px; color: #1e293b; font-weight: 700;">${headerGreeting}</h2>
<p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #475569;">
    Über unser gesichertes Klienten-Portal können Sie und Ihre Angehörigen jederzeit Einsätze, geplante Termine, Abrechnungen und Betreuungsberichte transparent und unkompliziert einsehen.
</p>

<!-- Zugangs-Box mit Direktlink -->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; margin: 24px 0;">
    <tr>
        <td style="padding: 24px 20px; text-align: center;">
            <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Ihr persönlicher Direkt-Zugang:</div>
            
            <!-- Call to Action Button -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                    <td align="center" bgcolor="#4f46e5" style="border-radius: 10px; box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);">
                        <a href="${portalUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; border-radius: 10px;">
                            👉 Jetzt Portal direkt öffnen
                        </a>
                    </td>
                </tr>
            </table>
            
            ${portalPin ? `
            <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #cbd5e1; font-size: 13px; color: #334155;">
                Ihre persönliche Sicherheits-PIN: <strong style="font-family: monospace; font-size: 16px; background: #e2e8f0; padding: 3px 8px; border-radius: 6px; letter-spacing: 2px;">${portalPin}</strong>
            </div>` : ''}
        </td>
    </tr>
</table>

<!-- 3-Schritte Anleitung -->
<div style="margin: 28px 0 20px 0;">
    <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 12px;">So funktioniert es in 3 einfachen Schritten:</div>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td width="32" valign="top" style="padding-bottom: 12px;">
                <div style="width: 24px; height: 24px; background-color: #e0e7ff; color: #4338ca; font-weight: 700; border-radius: 12px; text-align: center; line-height: 24px; font-size: 12px;">1</div>
            </td>
            <td style="padding-bottom: 12px; font-size: 13px; line-height: 1.5; color: #475569;">
                <strong>Link anklicken:</strong> Nutzen Sie den Button oben oder speichern Sie sich den Link als Lesezeichen.
            </td>
        </tr>
        <tr>
            <td width="32" valign="top" style="padding-bottom: 12px;">
                <div style="width: 24px; height: 24px; background-color: #e0e7ff; color: #4338ca; font-weight: 700; border-radius: 12px; text-align: center; line-height: 24px; font-size: 12px;">2</div>
            </td>
            <td style="padding-bottom: 12px; font-size: 13px; line-height: 1.5; color: #475569;">
                <strong>Direkt eingeloggt:</strong> Mit Ihrem personalisierten Link sind Sie sofort sicher verbunden.
            </td>
        </tr>
        <tr>
            <td width="32" valign="top;">
                <div style="width: 24px; height: 24px; background-color: #e0e7ff; color: #4338ca; font-weight: 700; border-radius: 12px; text-align: center; line-height: 24px; font-size: 12px;">3</div>
            </td>
            <td style="font-size: 13px; line-height: 1.5; color: #475569;">
                <strong>Überblick behalten:</strong> Alle Termine, Betreuer und Berichte auf einen Blick einsehen.
            </td>
        </tr>
    </table>
</div>

<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; line-height: 1.5;">
    Bei Fragen oder Unterstützung stehen wir Ihnen gerne zur Verfügung.
</div>
`.trim();
}

export function buildQuickAccessEmailHtml(params: {
    targetName: string;
    portalUrl: string;
    portalPin: string;
    compData?: EmailCompanyData;
    userData?: EmailUserData;
}): string {
    const bodyContent = buildQuickAccessBodyHtml(params);
    const compData: EmailCompanyData = params.compData || {
        compName: 'Ihre Seniorenassistenz',
        compStreet: '',
        compCity: '',
        compWeb: 'www.ihre-seniorenassistenz.com',
        compLogo: '',
        companyId: null
    };
    const userData: EmailUserData = params.userData || {
        userName: 'Ihre Seniorenassistenz',
        userEmail: 'info@ihre-seniorenassistenz.com',
        userPhone: ''
    };
    return wrapOrgaFlowEmailHtml({
        bodyContent,
        userData,
        compData
    });
}

export function buildQuickAccessPlainText(params: {
    targetName: string;
    portalUrl: string;
    portalPin: string;
}): string {
    const { targetName, portalUrl, portalPin } = params;
    return `Guten Tag ${targetName},

Über unser gesichertes Klienten-Portal können Sie und Ihre Angehörigen jederzeit Einsätze, geplante Termine, Abrechnungen und Betreuungsberichte transparent und unkompliziert einsehen.

👉 Ihr persönlicher Direkt-Zugang:
${portalUrl}
${portalPin ? `Ihre Sicherheits-PIN: ${portalPin}\n` : ''}
So funktioniert es in 3 einfachen Schritten:
1. Link im Browser aufrufen
2. Direkt gesichert einloggen
3. Termine, Betreuer und Berichte auf einen Blick einsehen

Bei Rückfragen erreichen Sie uns jederzeit gerne:
Telefon: 0345 / 213 895 20
E-Mail: info@ihre-seniorenassistenz.com

Herzliche Grüße,
Ihr Team der Seniorenassistenz Jenzsch`.trim();
}
