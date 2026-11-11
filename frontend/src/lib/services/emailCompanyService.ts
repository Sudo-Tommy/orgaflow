/**
 * Zentraler Service für E-Mail-Firmendaten und einheitliches OrgaFlow-HTML-Layout.
 */
import { pb } from '$lib/services/pocketbase';
import { isHtmlMessage, formatMessageToHtml, formatTextWithQuotes, buildCollapsibleQuoteHtml } from './emailQuoteFormatter';

export { isHtmlMessage, formatMessageToHtml, formatTextWithQuotes, buildCollapsibleQuoteHtml };

export const DEFAULT_EMAIL_ACCENT = '#4f46e5';
export const DEFAULT_EMAIL_TITLE = '#312e81';

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

export function resolveCompanyData(orgaStore: any, userOverride?: any): EmailCompanyData {
    const user = userOverride || pb.authStore.model;
    let compName = 'Ihre Seniorenassistenz';
    let compStreet = 'Dreyhauptstraße 2';
    let compCity = '06108 Halle (Saale)';
    let compWeb = 'www.ihre-seniorenassistenz.com';
    let compLogo = '';
    let companyId: string | null = null;

    if (user && user.company) {
        companyId = Array.isArray(user.company) ? user.company[0] : user.company;
        const comp = orgaStore?.company?.data?.find((c: any) => c.id === companyId);
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
    return { compName, compStreet, compCity, compWeb, compLogo, companyId };
}

export function resolveUserData(userOverride?: any, fallbackUser?: any, senderEmail?: string): EmailUserData {
    const user = userOverride || pb.authStore.model;
    let userName = 'Ihre Seniorenassistenz';
    if (user && (user.name_first || user.name_last)) {
        userName = `${user.name_first || ''} ${user.name_last || ''}`.trim();
    } else if (fallbackUser && (fallbackUser.name_first || fallbackUser.name_last)) {
        userName = `${fallbackUser.name_first || ''} ${fallbackUser.name_last || ''}`.trim();
    }
    const userEmail = senderEmail || user?.email || fallbackUser?.email || 'info@ihre-seniorenassistenz.com';
    const userPhone = user?.handy || user?.tel || fallbackUser?.handy || fallbackUser?.tel || '0151 57515432';
    return { userName, userEmail, userPhone };
}

export function buildTextSignature(userData: EmailUserData, compData: EmailCompanyData): string {
    const parts = [userData.userName, compData.compName];
    if (compData.compStreet) parts.push(compData.compStreet);
    if (compData.compCity) parts.push(compData.compCity);
    if (userData.userPhone) parts.push(`Telefon: ${userData.userPhone}`);
    parts.push(`E-Mail: ${userData.userEmail}`);
    parts.push(`Web: ${compData.compWeb}`);
    return `\n\n--\n${parts.join('\n')}`;
}

export function buildEmailHeader(
    compData: EmailCompanyData,
    accentColor: string = DEFAULT_EMAIL_ACCENT,
    titleColor: string = DEFAULT_EMAIL_TITLE
): string {
    return `
        <div style="background-color: #faf5ff; padding: 30px; border-bottom: 3px solid ${accentColor};">
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

export function buildEmailFooter(
    userData: EmailUserData,
    compData: EmailCompanyData,
    accentColor: string = DEFAULT_EMAIL_ACCENT
): string {
    const addressLines = [compData.compStreet, compData.compCity].filter(Boolean).join('<br>');
    const webUrl = compData.compWeb.startsWith('http') ? compData.compWeb : 'https://' + compData.compWeb;
    const webDisplay = compData.compWeb.replace(/^https?:\/\//, '');

    return `
        <div style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e2e8f0;">
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

export function getPortalButtonRegex(): RegExp {
    return /(?:<br>|\s)*(?:👉\s*)?(?:&lt;|<)?\s*(?<!href=["'])https?:\/\/(?:www\.)?ihre-seniorenassistenz\.com\/portal\/?(?:\?[^\s<>"']*)?\s*(?:&gt;|>)?/gi;
}

export function getPortalButtonHtml(accentColor: string = DEFAULT_EMAIL_ACCENT): string {
    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0 10px 0;"><tr><td align="center" bgcolor="${accentColor}" style="border-radius: 8px;"><a href="https://www.ihre-seniorenassistenz.com/portal" target="_blank" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; border-radius: 8px;">Zum Klienten-Portal</a></td></tr></table>`;
}

export function wrapOrgaFlowEmailHtml(params: {
    bodyContent: string;
    userData: EmailUserData;
    compData: EmailCompanyData;
    accentColor?: string;
    titleColor?: string;
    extraBlocksHtml?: string;
    quoteHtml?: string;
}): string {
    const raw = (params.bodyContent || '').trim();
    if (!raw && !params.quoteHtml) return '';

    // Bereits vollständig mit OrgaFlow-Briefbogen umhüllt? Keine Doppelung erzeugen!
    if (raw.includes('Alltagshilfe • Betreuung • Organisation') && raw.includes('Ihre Ansprechperson') && raw.includes('background-color: #faf5ff')) {
        return raw;
    }

    const accent = params.accentColor || DEFAULT_EMAIL_ACCENT;
    const title = params.titleColor || DEFAULT_EMAIL_TITLE;
    const isAlreadyHtml = isHtmlMessage(raw);
    let formatted = formatMessageToHtml(raw, params.quoteHtml);

    if (!isAlreadyHtml && !formatted.includes('<a ')) {
        formatted = formatted.replace(getPortalButtonRegex(), getPortalButtonHtml(accent));
    }

    let portalBtn = '';
    if (!formatted.includes('ihre-seniorenassistenz.com/portal') && !formatted.includes('Zum Klienten-Portal')) {
        portalBtn = getPortalButtonHtml(accent);
    }

    const extra = params.extraBlocksHtml || '';

    return `
        <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); background-color: #ffffff;">
            ${buildEmailHeader(params.compData, accent, title)}
            <div style="padding: 35px 30px; font-size: 15px; line-height: 1.7; color: #1f2937; background-color: #ffffff;">
                ${formatted}
                ${extra}
                ${portalBtn}
            </div>
            ${buildEmailFooter(params.userData, params.compData, accent)}
        </div>
    `.trim();
}
