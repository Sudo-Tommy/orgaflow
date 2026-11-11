import { normalizeDocumentBlocks } from "$lib/components/editor/blockMigrationHelper";

export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') resolve(reader.result.split(',')[1]);
            else reject(new Error("Failed to convert blob to base64"));
        };
        reader.readAsDataURL(blob);
    });
}

function cleanBlockContent(content: string): string {
    if (!content) return '';
    const preserved: string[] = [];
    let text = content.replace(/<img[^>]+>|<div class="signature-line-placeholder"[^>]*>[\s\S]*?<\/div>|<div class="signature-line-placeholder"[^>]*\/>/gi, (tag) => {
        preserved.push(tag);
        return `___PRESERVED_TAG_${preserved.length - 1}___`;
    });

    // 1. Remove empty spans
    text = text.replace(/<span[^>]*>\s*<\/span>/gi, '');

    // 2. Remove browser contenteditable trailing <br> inside block end (e.g. text<br></div>)
    text = text.replace(/<br\s*\/?>\s*<\/(div|p|h[1-6]|li|tr)>/gi, '</$1>');

    // 3. Block boundaries: replace opening and closing div, p, li, tr, h1-6 with newlines
    text = text.replace(/(<(div|p|h[1-6]|li|tr)[^>]*>\s*)+/gi, '\n');
    text = text.replace(/(<\/(div|p|h[1-6]|li|tr)>\s*)+/gi, '\n');

    // 4. Standalone <br> to newline
    text = text.replace(/<br\s*\/?>/gi, '\n');

    // 5. Space between adjacent spans
    text = text.replace(/<\/span>\s*<span/gi, ' <span');

    // 6. Decode non-breaking spaces and HTML entities
    text = text.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&');

    // 7. Strip unwanted tags preserving allowed tags (b, strong, i, em, u)
    text = text.replace(/<(?!b\b|\/b\b|strong\b|\/strong\b|i\b|\/i\b|em\b|\/em\b|u\b|\/u\b)[^>]*>/gi, '');

    // 8. Normalize newlines
    const lines = text.split('\n').map(l => l.trim());
    const cleanedLines: string[] = [];
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
    text = cleanedLines.join('\n').trim();

    preserved.forEach((tag, idx) => {
        text = text.replace(`___PRESERVED_TAG_${idx}___`, tag);
    });
    return text;
}

function cleanHtmlToText(content: string): string {
    return cleanBlockContent(content);
}

export async function prepareBlocksForPdf(
    blocks: any[],
    isTimesheet: boolean,
    replacePlaceholders: (content: string, isTs: boolean, overrideData?: any, isAddressContext?: boolean) => string
): Promise<any[]> {
    if (!Array.isArray(blocks)) return [];
    const normalized = normalizeDocumentBlocks(blocks);

    async function processBlockText(raw: string, isAddressContext: boolean = false): Promise<string> {
        let content = replacePlaceholders(raw || '', isTimesheet, undefined, isAddressContext);
        const imgMatches = [...content.matchAll(/<img[^>]+src="([^">]+)"[^>]*>/gi)];
        for (const m of imgMatches) {
            const fullTag = m[0];
            const src = m[1].replace(/&amp;/g, '&');
            if (src.startsWith('http') || src.startsWith('/')) {
                try {
                    const fetchUrl = src.startsWith('/') && typeof window !== 'undefined'
                        ? window.location.origin + src
                        : src;
                    const resp = await fetch(fetchUrl);
                    if (resp.ok) {
                        const blob = await resp.blob();
                        const b64 = await blobToBase64(blob);
                        const mime = blob.type || 'image/png';
                        const newTag = fullTag.replace(m[1], `data:${mime};base64,${b64}`);
                        content = content.replace(fullTag, newTag);
                    }
                } catch (e) {
                    console.warn("Konnte Signatur-Bild nicht laden:", e);
                }
            }
        }
        return cleanBlockContent(content);
    }

    const result = [];
    for (let bIdx = 0; bIdx < normalized.length; bIdx++) {
        const b = normalized[bIdx];
        const copy = JSON.parse(JSON.stringify(b));
        if (typeof copy.content === 'string') {
            const hasPrecedingHeader = normalized.slice(0, bIdx).some(prev => 
                prev.type === 'columns' || prev.type === 'din5008_header' || prev.id?.includes('head_cols')
            );
            const isAddressBlock = !hasPrecedingHeader && (bIdx <= 3) && (
                copy.id?.toLowerCase().includes('recipient') ||
                copy.id?.toLowerCase().includes('anschrift') ||
                ((copy.content?.includes('client.name') || copy.content?.includes('recipient.')) &&
                 (copy.content?.includes('client.street') || copy.content?.includes('recipient.street') || copy.content?.includes('client.salutation')))
            ) && !copy.content?.toLowerCase().includes('versichert');
            copy.content = await processBlockText(copy.content, isAddressBlock);
        }
        if (copy.type === 'columns' && copy.columnsConfig?.columns) {
            for (let i = 0; i < copy.columnsConfig.columns.length; i++) {
                const col = copy.columnsConfig.columns[i];
                const isAddressCol = (col.id === 'c_recipient' ||
                    col.id === 'c_absender_anschrift' ||
                    col.id?.toLowerCase().includes('recipient') ||
                    col.id?.toLowerCase().includes('anschrift') ||
                    (bIdx <= 2 && i === 0 && (col.content?.includes('client.name') || col.content?.includes('client.salutation') || col.content?.includes('recipient.')))) &&
                    !col.content?.toLowerCase().includes('versichert');
                copy.columnsConfig.columns[i].content = await processBlockText(col.content || '', isAddressCol);
            }
        }
        if (copy.type === 'din5008_header' && copy.din5008Config) {
            copy.din5008Config.returnAddress = await processBlockText(copy.din5008Config.returnAddress || '', false);
            copy.din5008Config.recipient = await processBlockText(copy.din5008Config.recipient || '', true);
            copy.din5008Config.infoDateBlock = await processBlockText(copy.din5008Config.infoDateBlock || '', false);
        }
        result.push(copy);
    }
    return result;
}

export async function prepareFieldsForPdfKit(
    fields: any[], 
    isTimesheet: boolean, 
    replacePlaceholders: (content: string, isTs: boolean, overrideData?: any, isAddressContext?: boolean) => string
) {
    const result = [];
    for (const f of fields) {
        const safeX = Number(f.x) || 0;
        const safeY = Number(f.y) || 0;
        const safeW = Math.max(Number(f.w) || 500, 50);
        const safeH = Math.max(Number(f.h) || 50, 15);
        const sanitizedField = { ...f, x: safeX, y: safeY, w: safeW, h: safeH };
        
        if (sanitizedField.style) {
            sanitizedField.style.color = sanitizedField.style.color || '#000000';
            sanitizedField.style.fontSize = Math.min(Math.max(Number(sanitizedField.style.fontSize) || 12, 4), 30);
            let pad = Number(sanitizedField.style.padding) || 0;
            if (pad * 2 + 10 >= safeW || pad * 2 + 10 >= safeH) pad = 0;
            sanitizedField.style.padding = pad;
        }
        
        if (sanitizedField.type === 'table' && sanitizedField.tableConfig) {
            let safeColumns = sanitizedField.tableConfig.columns || [];
            if (Array.isArray(safeColumns)) {
                safeColumns = safeColumns.map((c: any) => ({
                    ...c,
                    name: (c.name || "").substring(0, 35),
                    width: Math.max(Number(c.width) || 10, 8)
                }));
            }
            if (safeColumns.length === 0) {
                safeColumns = [{ id: "1", name: " ", type: "title", width: 100, align: "left" }];
            }

            sanitizedField.tableConfig = {
                ...sanitizedField.tableConfig,
                columns: safeColumns,
                borderWidth: Number(sanitizedField.tableConfig.borderWidth) || 1,
                fontSize: Math.min(Math.max(Number(sanitizedField.tableConfig.fontSize) || 10, 4), 30),
                cellPadding: Math.min(Math.max(Number(sanitizedField.tableConfig.cellPadding) || 6, 0), 5),
                footerWidth: Math.max(Number(sanitizedField.tableConfig.footerWidth) || 200, 50),
                firstPageLimit: Math.max(Number(sanitizedField.tableConfig.firstPageLimit) || 6, 1),
                nextPageLimit: Math.max(Number(sanitizedField.tableConfig.nextPageLimit) || 12, 1),
                headerBackgroundColor: (sanitizedField.tableConfig.headerBackgroundColor !== undefined && sanitizedField.tableConfig.headerBackgroundColor !== null && sanitizedField.tableConfig.headerBackgroundColor !== '') ? sanitizedField.tableConfig.headerBackgroundColor : '#f4f4f5',
                headerTextColor: sanitizedField.tableConfig.headerTextColor || '#000000',
                borderColor: sanitizedField.tableConfig.borderColor || '#cbd5e1',
                showPriceUnits: sanitizedField.tableConfig.showPriceUnits !== false
            };
        }

        if (sanitizedField.type === 'text') {
            const isAddressField = (sanitizedField.id?.toLowerCase().includes('recipient') ||
                sanitizedField.id?.toLowerCase().includes('anschrift') ||
                sanitizedField.name?.toLowerCase().includes('recipient') ||
                sanitizedField.name?.toLowerCase().includes('anschrift') ||
                (sanitizedField.id?.includes('head_cols') && sanitizedField.id?.includes('col_0')) ||
                sanitizedField.content?.includes('return_address_line')) &&
                !sanitizedField.content?.toLowerCase().includes('versichert');
            let content = replacePlaceholders(sanitizedField.content, isTimesheet, undefined, isAddressField);
            const imgMatch = content.match(/<img[^>]+src="([^">]+)"[^>]*>/);
            if (imgMatch) {
                const src = imgMatch[1].replace(/&amp;/g, '&'); 
                try {
                    const fetchUrl = src.startsWith('/') && typeof window !== 'undefined'
                        ? window.location.origin + src
                        : src;
                    const response = await fetch(fetchUrl);
                    if (!response.ok) throw new Error("Bild konnte nicht geladen werden");
                    const blob = await response.blob();
                    const base64 = await blobToBase64(blob);
                    
                    const textOnly = content.replace(/<img[^>]*>/g, '').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]*>?/gm, '').trim();
                    if (textOnly) {
                        result.push({ ...sanitizedField, content: textOnly });
                        result.push({ ...sanitizedField, type: 'logo', imageBase64: base64, y: (Number(sanitizedField.y) || 0) + 20, h: 60 });
                    } else {
                        result.push({ ...sanitizedField, type: 'logo', imageBase64: base64 });
                    }
                } catch (e) {
                    console.warn("Unterschrift/Bild übersprungen:", e);
                    const textOnly = content.replace(/<img[^>]*>/g, '').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]*>?/gm, '').trim();
                    if (textOnly) {
                        result.push({ ...sanitizedField, content: textOnly });
                    }
                }
            } else {
                content = cleanHtmlToText(content);
                if (content) {
                    result.push({ ...sanitizedField, content });
                }
            }
        } else { 
            result.push(sanitizedField); 
        }
    }
    return result;
}
