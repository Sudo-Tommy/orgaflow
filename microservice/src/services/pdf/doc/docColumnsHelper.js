/**
 * docColumnsHelper.js
 * Helpers for robust text formatting and multi-column rendering in DIN A4 PDFs.
 * Guarantees that newlines and block elements (div, p, br) are preserved 1:1,
 * and pairs adjacent left/right key-value columns into aligned rows.
 */
import { sanitizePdfDocumentText } from '../../../utils/pdfTextHelper.js';

export function escapeHtml(str) {
    if (!str) return '';
    const unescaped = String(str).replace(/&amp;/g, '&');
    return unescaped.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function formatText(text) {
    if (!text) return '';
    let raw = sanitizePdfDocumentText(text);

    // 0. Normalize any pre-escaped signature tags if they arrived escaped
    raw = raw.replace(/&lt;img\s+([\s\S]+?)\s*\/?&gt;/gi, (m, attrs) => {
        const cleanAttrs = attrs.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        const srcMatch = cleanAttrs.match(/src="([^"]+)"/i);
        const src = srcMatch ? srcMatch[1] : '';
        return src ? `<img src="${src}" alt="Unterschrift" />` : '';
    });
    raw = raw.replace(/&lt;div class=&quot;signature-line-placeholder&quot;[\s\S]*?(&lt;\/div&gt;|<br\s*\/?>|<\/div>)/gi, () => {
        return '<div class="signature-line-placeholder"></div>';
    });

    // 0b. Preserve <img> tags and signature line placeholders BEFORE tag stripping
    const preserved = [];
    raw = raw.replace(/<img[^>]+>|<div class="signature-line-placeholder"[^>]*>[\s\S]*?<\/div>|<div class="signature-line-placeholder"[^>]*\/>/gi, (match) => {
        preserved.push(match);
        return `___PRESERVED_TAG_${preserved.length - 1}___`;
    });

    // 1. Remove empty spans
    raw = raw.replace(/<span[^>]*>\s*<\/span>/gi, '');

    // 2. Remove browser contenteditable trailing <br> inside block end (e.g. text<br></div>)
    raw = raw.replace(/<br\s*\/?>\s*<\/(div|p|h[1-6]|li|tr)>/gi, '</$1>');

    // 3. Block boundaries: replace opening and closing div, p, li, tr, h1-6 with newlines
    raw = raw.replace(/(<(div|p|h[1-6]|li|tr)[^>]*>\s*)+/gi, '\n');
    raw = raw.replace(/(<\/(div|p|h[1-6]|li|tr)>\s*)+/gi, '\n');

    // 4. Standalone <br> to newline
    raw = raw.replace(/<br\s*\/?>/gi, '\n');

    // 5. Space between adjacent spans
    raw = raw.replace(/<\/span>\s*<span/gi, ' <span');

    // 6. Decode non-breaking spaces
    raw = raw.replace(/&nbsp;/gi, ' ');

    // 7. Strip unwanted tags preserving allowed tags (b, strong, i, em, u)
    raw = raw.replace(/<(?!b\b|\/b\b|strong\b|\/strong\b|i\b|\/i\b|em\b|\/em\b|u\b|\/u\b)[^>]*>/gi, '');

    // 8. Normalize newlines while preserving single and deliberate double newlines
    const lines = raw.split('\n').map(l => l.trim());
    const cleanedLines = [];
    let consecutiveEmpty = 0;
    for (const line of lines) {
        if (!line) {
            consecutiveEmpty++;
            if (consecutiveEmpty <= 1 && cleanedLines.length > 0) {
                cleanedLines.push('');
            }
        } else {
            consecutiveEmpty = 0;
            cleanedLines.push(line);
        }
    }
    const cleaned = cleanedLines.join('\n').trim();

    let escaped = escapeHtml(cleaned).replace(/\n/g, '<br/>')
        .replace(/&lt;b&gt;/gi, '<b>')
        .replace(/&lt;\/b&gt;/gi, '</b>')
        .replace(/&lt;strong&gt;/gi, '<strong>')
        .replace(/&lt;\/strong&gt;/gi, '</strong>')
        .replace(/&lt;i&gt;/gi, '<i>')
        .replace(/&lt;\/i&gt;/gi, '</i>')
        .replace(/&lt;em&gt;/gi, '<em>')
        .replace(/&lt;\/em&gt;/gi, '</em>')
        .replace(/&lt;u&gt;/gi, '<u>')
        .replace(/&lt;\/u&gt;/gi, '</u>');

    // 9. Restore preserved <img> and signature placeholders
    preserved.forEach((tag, idx) => {
        const marker = `___PRESERVED_TAG_${idx}___`;
        let replacement = '';
        if (tag.toLowerCase().startsWith('<img')) {
            const srcMatch = tag.match(/src="([^"]+)"/i);
            const src = srcMatch ? srcMatch[1] : '';
            if (src) {
                replacement = `<img src="${src}" alt="Unterschrift" style="max-height: 50px; height: 45px; object-fit: contain; display: block; margin-top: 6px; margin-bottom: 4px;" />`;
            }
        } else if (tag.includes('signature-line-placeholder')) {
            replacement = '<div class="signature-line-placeholder" style="display: block; margin-top: 24px; border-bottom: 1px solid #4b5563; width: 180px; max-width: 90%; height: 1px; margin-bottom: 4px;"></div>';
        }
        escaped = escaped.replace(marker, replacement);
    });

    return escaped;
}

export function renderColumnsContent(cols, formatFn, retFontSize = 7) {
    const renderedCols = [];
    let i = 0;
    while (i < cols.length) {
        const c1 = cols[i];
        const c2 = cols[i + 1];

        const c1Formatted = formatFn(c1.content);
        const c2Formatted = c2 ? formatFn(c2.content) : null;

        const isC1Address = c1Formatted.includes('[[RET_ADDR]]') || c1Formatted.includes('{{company.return_address_line}}') || c1.id?.includes('recipient') || c1.id?.includes('anschrift');
        
        let isPairedKv = false;
        if (c2 && !isC1Address && (c1.textAlign === 'left' || !c1.textAlign) && c2.textAlign === 'right') {
            const lines1 = c1Formatted.split('<br/>').map(s => s.trim()).filter(Boolean);
            const lines2 = c2Formatted ? c2Formatted.split('<br/>').map(s => s.trim()).filter(Boolean) : [];
            
            const colonsCount = lines1.filter(l => l.endsWith(':') || l.includes(':')).length;
            if (lines1.length >= 2 && (colonsCount >= lines1.length / 2 || (lines1.length === lines2.length && colonsCount > 0))) {
                isPairedKv = true;
            }
        }

        if (isPairedKv) {
            const combinedWidth = Math.round(((c1.widthPercent || 0) + (c2.widthPercent || 0)) * 10) / 10 || Math.round(200 / cols.length);
            const lines1 = c1Formatted.split('<br/>');
            const lines2 = c2Formatted.split('<br/>');
            const maxL = Math.max(lines1.length, lines2.length);

            let rowsHtml = '';
            for (let r = 0; r < maxL; r++) {
                const lVal = lines1[r] !== undefined ? lines1[r].trim() : '';
                const rVal = lines2[r] !== undefined ? lines2[r].trim() : '';
                rowsHtml += `<div class="kv-row"><span class="kv-label">${lVal}</span><span class="kv-value">${rVal}</span></div>`;
            }

            renderedCols.push(`<div class="content-col" style="width: ${combinedWidth}%; font-size: ${c1.fontSize || c2.fontSize || 9.5}pt;">${rowsHtml}</div>`);
            i += 2;
        } else {
            let formatted = c1Formatted;
            if (formatted.includes('[[RET_ADDR]]')) {
                formatted = formatted.replace(
                    /\[\[RET_ADDR\]\]([\s\S]*?)\[\[\/RET_ADDR\]\](?:\s*<br\s*\/?>)?/g,
                    `<div class="return-address" style="font-size: ${retFontSize}pt;">$1</div>`
                );
            } else if (formatted.includes('{{company.return_address_line}}')) {
                formatted = formatted.replace(
                    /\{\{company\.return_address_line\}\}(?:\s*<br\s*\/?>)?/g,
                    `<div class="return-address" style="font-size: ${retFontSize}pt;">{{company.return_address_line}}</div>`
                );
            }
            renderedCols.push(`<div class="content-col" style="width: ${c1.widthPercent || Math.round(100 / cols.length)}%; text-align: ${c1.textAlign || 'left'}; font-size: ${c1.fontSize || 9.5}pt;">${formatted}</div>`);
            i += 1;
        }
    }
    return renderedCols.join('');
}
