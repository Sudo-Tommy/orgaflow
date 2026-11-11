/**
 * Hilfsmodul für strukturierte Formatierung von E-Mail-Texten, Zitaten und Antworten.
 * Unterstützt ausklappbare Zitate (Gmail-Stil) und bereinigt verunstaltete Textblöcke.
 */

export function isHtmlMessage(content: string): boolean {
    if (!content) return false;
    return /<(?:p|div|table|ul|ol|h[1-6]|blockquote|details|a)\b/i.test(content);
}

export function cleanGarbledQuoteText(text: string): string {
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

export function buildCollapsibleQuoteHtml(params: {
    headerTitle?: string;
    headerLines?: string[];
    quotedHtml: string;
}): string {
    const title = params.headerTitle || 'Ursprüngliche Nachricht';
    const headersHtml = params.headerLines && params.headerLines.length > 0
        ? `<div style="font-size: 12px; color: #64748b; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; line-height: 1.6;">${params.headerLines.map(h => {
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
                    <span>⋯ ${title} anzeigen</span>
                </summary>
                <div style="margin-top: 14px; padding: 14px 16px; border-left: 3px solid #6366f1; background-color: #f8fafc; border-radius: 0 12px 12px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                    ${headersHtml}
                    <div>${params.quotedHtml}</div>
                </div>
            </details>
        </div>
    `.trim();
}

export function formatTextWithQuotes(text: string, customQuoteHtml?: string): string {
    if (!text) return '';
    const raw = text.trim();
    const quoteRegex = /(?:^|\n|\s)(?:[-─]{3,}\s*(?:Ursprüngliche Nachricht|Weitergeleitete Nachricht|Original Message)\s*[-─]{3,}|Am\s+.+?\s+schrieb\s+.+?:|On\s+.+?\s+wrote:|[^\n]+?\s+hat am\s+\d{2}\.\d{2}\.\d{4}\s+[\d:]+\s*(?:CET|CEST|Uhr)?\s*geschrieben:)/i;
    const match = raw.match(quoteRegex);

    if (!match || match.index === undefined) {
        const mainHtml = raw
            .split(/\n{2,}/)
            .map(p => `<p style="margin: 0 0 16px 0; line-height: 1.7;">${p.replace(/\n/g, '<br>')}</p>`)
            .join('');
        if (customQuoteHtml) {
            return mainHtml + buildCollapsibleQuoteHtml({ quotedHtml: customQuoteHtml });
        }
        return mainHtml;
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

    const headerLines: string[] = [];
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

    if (customQuoteHtml) {
        return mainHtml + buildCollapsibleQuoteHtml({
            headerTitle,
            headerLines,
            quotedHtml: customQuoteHtml
        });
    }

    const rawQuotedBody = lines.slice(bodyStartIndex).join('\n').trim();
    const cleanedQuoted = cleanGarbledQuoteText(rawQuotedBody);
    const quotedBodyHtml = cleanedQuoted
        .split(/\n{2,}/)
        .map(p => `<p style="margin: 0 0 12px 0; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`)
        .join('');

    return mainHtml + buildCollapsibleQuoteHtml({
        headerTitle,
        headerLines,
        quotedHtml: quotedBodyHtml
    });
}

export function formatMessageToHtml(rawTextOrHtml: string, customQuoteHtml?: string): string {
    if (!rawTextOrHtml) return '';
    const trimmed = rawTextOrHtml.trim();
    if (isHtmlMessage(trimmed)) {
        return trimmed;
    }
    return formatTextWithQuotes(trimmed, customQuoteHtml);
}
