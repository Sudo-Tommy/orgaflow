export function cleanGarbledQuoteText(text) {
    if (!text) return '';
    return text
        .replace(/(?:>\s*){2,}/g, '\n')
        .replace(/(?:^|\n)>\s?/g, '\n')
        .replace(/•\s*(Termin am \d{2}\.\d{2}\.\d{4})/gi, '\n\n• $1')
        .replace(/•\s*(Ihre Besuchsberichte|Ihre nächsten Termine|Aktionspunkte|Kommunikation|Medikamentenbeschaffung|Parkplatzsituation)/gi, '\n\n$1:\n')
        .replace(/⇒/g, '\n  ⇒')
        .replace(/\s+•\s+/g, '\n• ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function buildCollapsibleQuoteHtml({ headerTitle = 'Ursprüngliche Nachricht', headerLines = [], quotedHtml = '' }) {
    const headersHtml = headerLines.length > 0
        ? `<div style="font-size: 12px; color: #64748b; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; line-height: 1.6;">${headerLines.map(h => {
            const colonIdx = h.indexOf(':');
            if (colonIdx !== -1) {
                return `<strong>${h.slice(0, colonIdx + 1)}</strong> ${h.slice(colonIdx + 1).trim()}`;
            }
            return h;
        }).join('<br>')}</div>`
        : '';

    return `
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed #e2e8f0;">
            <details style="cursor: pointer;">
                <summary style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 12px; font-weight: 700; list-style: none; user-select: none;">
                    <span>⋯ ${headerTitle} anzeigen</span>
                </summary>
                <div style="margin-top: 14px; padding: 14px 16px; border-left: 3px solid #6366f1; background-color: #f8fafc; border-radius: 0 12px 12px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                    ${headersHtml}
                    <div>${quotedHtml}</div>
                </div>
            </details>
        </div>
    `.trim();
}

export function formatTextWithQuotes(text) {
    if (!text) return '';
    const raw = text.trim();
    const quoteRegex = /(?:^|\n|\s)(?:[-─]{3,}\s*(?:Ursprüngliche Nachricht|Weitergeleitete Nachricht|Original Message)\s*[-─]{3,}|Am\s+.+?\s+schrieb\s+.+?:|On\s+.+?\s+wrote:|[^\n]+?\s+hat am\s+\d{2}\.\d{2}\.\d{4}\s+[\d:]+\s*(?:CET|CEST|Uhr)?\s*geschrieben:)/i;
    const match = raw.match(quoteRegex);

    if (!match || match.index === undefined) {
        return raw
            .split(/\n{2,}/)
            .map(p => `<p style="margin: 0 0 16px 0; line-height: 1.7;">${p.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }

    const mainText = raw.slice(0, match.index).trim();
    const quoteSection = raw.slice(match.index).trim();

    const mainHtml = mainText
        ? mainText.split(/\n{2,}/).map(p => `<p style="margin: 0 0 16px 0; line-height: 1.7;">${p.replace(/\n/g, '<br>')}</p>`).join('')
        : '';

    const normalizedQuote = quoteSection.replace(
        /(Von:\s*.+?)\s+(Datum:\s*.+?)\s+(Betreff:\s*.+?)(?=\s+[A-ZÄÖÜ]|$)/i,
        '$1\n$2\n$3\n\n'
    );

    const lines = normalizedQuote.split('\n');
    const firstLine = lines[0].replace(/^[-─\s]+|[-─\s]+$/g, '');
    const headerTitle = /Ursprüngliche|Weitergeleitete|Original/i.test(firstLine)
        ? firstLine
        : 'Ursprüngliche Nachricht';

    const headerLines = [];
    let bodyStartIndex = 1;

    if (!/Ursprüngliche|Weitergeleitete|Original/i.test(firstLine)) {
        headerLines.push(`Info: ${firstLine}`);
    }

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
            bodyStartIndex = i + 1;
            break;
        }
        if (/^(Von|An|Datum|Betreff|Date|From|To|Subject):/i.test(line)) {
            headerLines.push(line);
            bodyStartIndex = i + 1;
        } else {
            bodyStartIndex = i;
            break;
        }
    }

    const quotedBody = cleanGarbledQuoteText(lines.slice(bodyStartIndex).join('\n').trim());
    const quotedBodyHtml = quotedBody
        .split(/\n{2,}/)
        .map(p => `<p style="margin: 0 0 12px 0; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`)
        .join('');

    return mainHtml + buildCollapsibleQuoteHtml({
        headerTitle,
        headerLines,
        quotedHtml: quotedBodyHtml
    });
}

export function buildFallbackHtml({
    text,
    userName,
    userEmail,
    userPhone,
    compName = 'Ihre Seniorenassistenz',
    compStreet = 'Dreyhauptstraße 2',
    compCity = '06108 Halle (Saale)',
    compWeb = 'www.ihre-seniorenassistenz.com',
    compLogo = ''
}) {
    const formattedText = formatTextWithQuotes(text);
    const webClean = compWeb.replace(/^https?:\/\//, '');

    return `
        <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); background-color: #ffffff;">
            <div style="background-color: #faf5ff; padding: 30px; border-bottom: 3px solid #4f46e5;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td valign="middle">
                            <h1 style="color: #312e81; margin: 0; font-size: 24px; letter-spacing: -0.5px; font-weight: 800;">${compName}</h1>
                            <p style="color: #4f46e5; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Alltagshilfe • Betreuung • Organisation</p>
                        </td>
                        ${compLogo ? `<td valign="middle" align="right" style="width: 100px;"><img src="${compLogo}" alt="Logo" width="100" style="max-height: 60px; max-width: 100px; object-fit: contain; border-radius: 6px;" /></td>` : ''}
                    </tr>
                </table>
            </div>
            <div style="padding: 35px 30px; font-size: 15px; line-height: 1.7; color: #1f2937; background-color: #ffffff;">
                ${formattedText}
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0 10px 0;"><tr><td align="center" bgcolor="#4f46e5" style="border-radius: 8px;"><a href="https://www.ihre-seniorenassistenz.com/portal" target="_blank" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; border-radius: 8px;">Zum Klienten-Portal</a></td></tr></table>
            </div>
            <div style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e2e8f0;">
                <strong style="color: #111827; font-size: 16px;">${userName || 'Ihre Seniorenassistenz'}</strong><br>
                <span style="color: #4f46e5; font-weight: 600; font-size: 13px;">Ihre Ansprechperson</span>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 15px; font-size: 13px; color: #4b5563; line-height: 1.6;">
                    <tr>
                        <td width="50%" valign="top" style="padding-right: 15px; border-right: 1px solid #e5e7eb;">
                            <strong style="color: #374151; font-size: 14px;">${compName}</strong><br>
                            ${compStreet}<br>
                            ${compCity}
                        </td>
                        <td width="50%" valign="top" style="padding-left: 20px;">
                            ${userPhone ? `<div style="margin-bottom: 4px;">📞 <a href="tel:${userPhone}" style="color: #4f46e5; text-decoration: none; font-weight: 500;">${userPhone}</a></div>` : ''}
                            <div style="margin-bottom: 4px;">✉️ <a href="mailto:${userEmail}" style="color: #4f46e5; text-decoration: none; font-weight: 500;">${userEmail}</a></div>
                            <div>🌐 <a href="https://${webClean}" style="color: #4f46e5; text-decoration: none; font-weight: 500;">${webClean}</a></div>
                        </td>
                    </tr>
                </table>
            </div>
        </div>
    `.trim();
}
