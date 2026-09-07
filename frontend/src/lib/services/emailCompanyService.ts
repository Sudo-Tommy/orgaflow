/**
 * Zentraler Service für E-Mail-Firmendaten und HTML-Header/Footer.
 * Ersetzt die duplizierten ~30-Zeilen-Blöcke in allen E-Mail-Modals.
 */
import { pb } from '$lib/pocketbase';

export interface EmailCompanyData {
    compName: string;
    compStreet: string;
    compCity: string;
    compWeb: string;
    compLogo: string;
    companyId: string | null;
}

export interface EmailUserData {
    userName: string;
    userEmail: string;
    userPhone: string;
}

/**
 * Löst die Firmendaten des aktuellen Users dynamisch auf.
 * Fallback-Defaults nur wenn kein Company-Eintrag gefunden wird.
 */
export function resolveCompanyData(orgaStore: any, userOverride?: any): EmailCompanyData {
    const user = userOverride || pb.authStore.model;

    let compName = 'Ihre Seniorenassistenz';
    let compStreet = '';
    let compCity = '';
    let compWeb = 'www.ihre-seniorenassistenz.com';
    let compLogo = '';
    let companyId: string | null = null;

    if (user && user.company) {
        companyId = Array.isArray(user.company) ? user.company[0] : user.company;
        const comp = orgaStore.company?.data?.find((c: any) => c.id === companyId);
        if (comp) {
            compName = comp.name || compName;
            compStreet = `${comp.street || ''} ${comp.housenr || ''}`.trim();
            compCity = `${comp.zip || ''} ${comp.city || ''}`.trim();
            compWeb = comp.website || compWeb;
            if (comp.logo) {
                const logoFilename = Array.isArray(comp.logo) ? comp.logo[0] : comp.logo;
                const rawUrl = (pb.files as any).getUrl
                    ? (pb.files as any).getUrl(comp, logoFilename)
                    : (pb.files as any).getURL(comp, logoFilename);
                try {
                    const parsedUrl = new URL(rawUrl, 'https://ihre-seniorenassistenz.com');
                    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
                        parsedUrl.protocol = 'https:';
                        parsedUrl.hostname = 'ihre-seniorenassistenz.com';
                        parsedUrl.port = '';
                    }
                    compLogo = parsedUrl.toString();
                } catch (e) {
                    compLogo = rawUrl;
                }
            }
        }
    }

    return { compName, compStreet, compCity, compWeb, compLogo, companyId };
}

/**
 * Löst die User-Kontaktdaten für die E-Mail-Signatur auf.
 * senderEmail: Optional – wenn eine Gmail-Adresse als Absender aktiv ist,
 * wird diese statt der PB-Account-E-Mail im Footer angezeigt.
 */
export function resolveUserData(userOverride?: any, fallbackUser?: any, senderEmail?: string): EmailUserData {
    const user = userOverride || pb.authStore.model;
    let userName = 'Ihre Seniorenassistenz';
    if (user && (user.name_first || user.name_last)) {
        userName = `${user.name_first || ''} ${user.name_last || ''}`.trim();
    } else if (fallbackUser && (fallbackUser.name_first || fallbackUser.name_last)) {
        userName = `${fallbackUser.name_first || ''} ${fallbackUser.name_last || ''}`.trim();
    }
    // Wenn eine Gmail-Absenderadresse bekannt ist, diese im Footer verwenden
    const userEmail = senderEmail || user?.email || fallbackUser?.email || 'info@ihre-seniorenassistenz.com';
    const userPhone = user?.handy || user?.tel || fallbackUser?.handy || fallbackUser?.tel || '';
    return { userName, userEmail, userPhone };
}

/**
 * Baut den Text-Signaturblock.
 */
export function buildTextSignature(userData: EmailUserData, compData: EmailCompanyData): string {
    const parts = [userData.userName, compData.compName];
    if (compData.compStreet) parts.push(compData.compStreet);
    if (compData.compCity) parts.push(compData.compCity);
    if (userData.userPhone) parts.push(`Telefon: ${userData.userPhone}`);
    parts.push(`E-Mail: ${userData.userEmail}`);
    parts.push(`Web: ${compData.compWeb}`);
    return `\n\n--\n${parts.join('\n')}`;
}

/**
 * Baut den HTML-Header (oberer Banner-Bereich).
 * accentColor erlaubt verschiedene Farbschemata pro Modal.
 */
export function buildEmailHeader(
    compData: EmailCompanyData,
    accentColor: string = '#c66a4d',
    titleColor: string = '#954028'
): string {
    return `
        <div style="background-color: #fdf8f6; padding: 30px; border-bottom: 3px solid ${accentColor};">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td valign="middle">
                        <h1 style="color: ${titleColor}; margin: 0; font-size: 24px; letter-spacing: -0.5px; font-weight: 800;">${compData.compName}</h1>
                        <p style="color: ${accentColor}; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Alltagshilfe • Betreuung • Organisation</p>
                    </td>
                    ${compData.compLogo ? `<td valign="middle" align="right" style="width: 100px;"><img src="${compData.compLogo}" alt="Logo" width="100" style="max-height: 60px; max-width: 100px; object-fit: contain; border-radius: 6px;" /></td>` : ''}
                </tr>
            </table>
        </div>`;
}

/**
 * Baut den HTML-Footer (Signatur-Bereich).
 */
export function buildEmailFooter(
    userData: EmailUserData,
    compData: EmailCompanyData,
    accentColor: string = '#c66a4d'
): string {
    const addressLines = [compData.compStreet, compData.compCity].filter(Boolean).join('<br>');
    const webUrl = compData.compWeb.startsWith('http') ? compData.compWeb : 'https://' + compData.compWeb;
    const webDisplay = compData.compWeb.replace(/^https?:\/\//, '');

    return `
        <div style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; color: #4b5563;">
                <tr>
                    <td valign="top" style="padding-bottom: 20px;">
                        <strong style="color: #111827; font-size: 16px;">${userData.userName}</strong><br>
                        <span style="color: ${accentColor}; font-weight: 600; font-size: 13px;">Ihre Ansprechperson</span>
                    </td>
                </tr>
                <tr>
                    <td valign="top">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #4b5563; line-height: 1.6;">
                            <tr>
                                <td width="50%" valign="top" style="padding-right: 15px; border-right: 1px solid #e5e7eb;">
                                    <strong style="color: #374151; font-size: 14px;">${compData.compName}</strong><br>
                                    ${addressLines}
                                </td>
                                <td width="50%" valign="top" style="padding-left: 20px;">
                                    ${userData.userPhone ? `<div style="margin-bottom: 4px;">📞 <a href="tel:${userData.userPhone}" style="color: ${accentColor}; text-decoration: none; font-weight: 500;">${userData.userPhone}</a></div>` : ''}
                                    <div style="margin-bottom: 4px;">✉️ <a href="mailto:${userData.userEmail}" style="color: ${accentColor}; text-decoration: none; font-weight: 500;">${userData.userEmail}</a></div>
                                    <div>🌐 <a href="${webUrl}" style="color: ${accentColor}; text-decoration: none; font-weight: 500;">${webDisplay}</a></div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>`;
}

/**
 * Portal-Link CTA-Button (ersetzt Plaintext-Links in der E-Mail).
 */
export function getPortalButtonRegex(): RegExp {
    return /(?:<br>|\s)*(?:👉\s*)?(?:&lt;|<)?\s*https?:\/\/(?:www\.)?ihre-seniorenassistenz\.com\/portal\/?\s*(?:&gt;|>)?/gi;
}

export function getPortalButtonHtml(accentColor: string = '#c66a4d'): string {
    return `<br><table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 15px 0;"><tr><td align="center" bgcolor="${accentColor}" style="border-radius: 8px;"><a href="https://www.ihre-seniorenassistenz.com/portal" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Zum Klienten-Portal</a></td></tr></table><br>`;
}
