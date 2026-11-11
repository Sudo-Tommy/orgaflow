import { pb } from "$lib/services/pocketbase";

export interface CompanyEmailProfile {
    compName: string;
    compStreet: string;
    compCity: string;
    compWeb: string;
    compLogo: string;
    companyId: string | null;
    userName: string;
    userEmail: string;
    userPhone: string;
}

export function buildCompanyProfile(user: any, companyList?: any[]): CompanyEmailProfile {
    const userName = user ? `${user.name_first || ''} ${user.name_last || ''}`.trim() : 'Ihre Seniorenassistenz';
    const userEmail = user?.email || 'info@ihre-seniorenassistenz.com';
    const userPhone = user?.handy || user?.tel || '0151 57515432';

    let compName = 'Ihre Seniorenassistenz';
    let compStreet = 'Dreyhauptstraße 2';
    let compCity = '06108 Halle (Saale)';
    let compWeb = 'www.ihre-seniorenassistenz.com';
    let compLogo = '';
    let companyId: string | null = null;

    if (user && user.company) {
        companyId = Array.isArray(user.company) ? user.company[0] : user.company;
        const comp = companyList?.find((c: any) => c.id === companyId);
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

    return {
        compName,
        compStreet,
        compCity,
        compWeb,
        compLogo,
        companyId,
        userName,
        userEmail,
        userPhone
    };
}

export function parseRequestTime(request: any): string {
    if (request?.time) {
        const rawTime = String(request.time).trim();
        if (/^\d{1,2}:\d{2}/.test(rawTime)) {
            const m = rawTime.match(/^(\d{1,2}):(\d{2})/);
            if (m) return `${m[1].padStart(2, '0')}:${m[2]} Uhr`;
        }
        const cleanTime = rawTime.includes(' ') && !rawTime.includes('T') ? rawTime.replace(' ', 'T') : rawTime;
        const d = new Date(cleanTime);
        if (!isNaN(d.getTime())) {
            return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
        }
    } else if (request?.request_text) {
        const textMatch = request.request_text.match(/(?:Wunschtermin|Wunschzeit|Wunsch-Uhrzeit|Uhrzeit|um)\s*:?\s*(\d{1,2}:\d{2})/i) ||
            request.request_text.match(/\b(\d{1,2}:\d{2})\s*Uhr\b/i);
        if (textMatch && textMatch[1]) {
            const [th, tm] = textMatch[1].split(':');
            return `${th.padStart(2, '0')}:${tm} Uhr`;
        }
    }
    return 'Keine Uhrzeit';
}

export interface ReplyEmailOptions {
    request: any;
    status: 'accepted' | 'denied' | 'propose';
    emailText: string;
    propDate?: string;
    propTime?: string;
    user: any;
    companyList?: any[];
}

export function buildReplyEmailPayload(options: ReplyEmailOptions) {
    const { request, status, emailText, propDate, propTime, user, companyList } = options;
    const profile = buildCompanyProfile(user, companyList);

    const textEmail = `${emailText.trim()}\n\n--\n${profile.userName}\n${profile.compName}\n${profile.compStreet}, ${profile.compCity}\nTelefon: ${profile.userPhone}\nE-Mail: ${profile.userEmail}\nWeb: ${profile.compWeb}`;

    let reqDate = request?.date
        ? new Date(request.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'Kein Datum';
    let reqTime = parseRequestTime(request);

    if (status === 'propose' && propDate && propTime) {
        reqDate = new Date(propDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        reqTime = `${propTime} Uhr`;
    }

    const reqAnliegen = request?.request_text ? request.request_text.split('--- Kontaktdaten ---')[0].trim() : '';
    const cardTitle = status === 'propose'
        ? 'Unser Alternativvorschlag:'
        : (status === 'accepted' ? 'Ihr neuer Termin:' : 'Ihre ursprüngliche Anfrage:');

    const htmlEmail = `
        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #fdf8f6; padding: 30px; border-bottom: 3px solid #c66a4d;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td valign="middle">
                            <h1 style="color: #954028; margin: 0; font-size: 24px; letter-spacing: -0.5px; font-weight: 800;">${profile.compName}</h1>
                            <p style="color: #c66a4d; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Alltagshilfe • Betreuung • Organisation</p>
                        </td>
                        ${profile.compLogo ? `<td valign="middle" align="right" style="width: 100px;"><img src="${profile.compLogo}" alt="Logo" width="100" style="max-height: 60px; max-width: 100px; object-fit: contain; border-radius: 6px;" /></td>` : ''}
                    </tr>
                </table>
            </div>
            <div style="padding: 35px 30px; font-size: 15px; line-height: 1.7; color: #1f2937; background-color: #ffffff;">
                ${emailText.trim().replace(/\n/g, '<br>')}
                
                <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="margin-top: 0; color: #111827; font-size: 16px; margin-bottom: 12px;">${cardTitle}</h3>
                    <table cellpadding="0" cellspacing="0" style="font-size: 14px; color: #4b5563; width: 100%;">
                        <tr>
                            <td style="padding: 4px 0; width: 80px;"><strong>Datum:</strong></td>
                            <td style="padding: 4px 0;">${reqDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0;"><strong>Uhrzeit:</strong></td>
                            <td style="padding: 4px 0;">${reqTime}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding-top: 12px;"><strong>Anliegen:</strong><br><div style="margin-top: 4px; padding: 10px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px;">${reqAnliegen.replace(/\n/g, '<br>')}</div></td>
                        </tr>
                    </table>
                </div>
            </div>
            <div style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e5e7eb;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; color: #4b5563;">
                    <tr>
                        <td valign="top" style="padding-bottom: 20px;">
                            <strong style="color: #111827; font-size: 16px;">${profile.userName}</strong><br>
                            <span style="color: #c66a4d; font-weight: 600; font-size: 13px;">Ihre Ansprechperson</span>
                        </td>
                    </tr>
                    <tr>
                        <td valign="top">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #4b5563; line-height: 1.6;">
                                <tr>
                                    <td width="50%" valign="top" style="padding-right: 15px; border-right: 1px solid #e5e7eb;">
                                        <strong style="color: #374151; font-size: 14px;">${profile.compName}</strong><br>
                                        ${profile.compStreet}<br>
                                        ${profile.compCity}
                                    </td>
                                    <td width="50%" valign="top" style="padding-left: 20px;">
                                        <div style="margin-bottom: 4px;">📞 <a href="tel:${profile.userPhone}" style="color: #c66a4d; text-decoration: none; font-weight: 500;">${profile.userPhone}</a></div>
                                        <div style="margin-bottom: 4px;">✉️ <a href="mailto:${profile.userEmail}" style="color: #c66a4d; text-decoration: none; font-weight: 500;">${profile.userEmail}</a></div>
                                        <div>🌐 <a href="${profile.compWeb.startsWith('http') ? profile.compWeb : 'https://' + profile.compWeb}" style="color: #c66a4d; text-decoration: none; font-weight: 500;">${profile.compWeb.replace(/^https?:\/\//, '')}</a></div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </div>
        </div>
    `;

    return {
        textEmail,
        htmlEmail,
        profile
    };
}

export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
    });
}

export function getInitialReplyText(status: 'accepted' | 'denied' | 'propose', senderName: string): string {
    const savedTemplate = localStorage.getItem(`req_reply_template_${status}`);
    if (savedTemplate) {
        return savedTemplate.replace(/\{\{name\}\}/g, senderName);
    }
    return status === 'accepted'
        ? `Guten Tag ${senderName},\n\nwir freuen uns, Ihnen mitteilen zu können, dass wir Ihren Terminwunsch bestätigen können. Wir werden zum vereinbarten Zeitpunkt für Sie da sein.\n\nBei Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.`
        : `Guten Tag ${senderName},\n\nvielen Dank für Ihre Anfrage. Leider können wir Ihren Terminwunsch zu diesem Zeitpunkt so nicht realisieren. Wir melden uns zeitnah noch einmal persönlich bei Ihnen, um eine Alternative zu finden.`;
}
