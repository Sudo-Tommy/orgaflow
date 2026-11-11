/**
 * docTableHelper.js
 * Generates dynamic 1:1 WYSIWYG HTML table markup for PDF documents.
 */
import { sanitizePdfDocumentText } from '../../../utils/pdfTextHelper.js';

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderTableHtml(tableConfig, positions, netto, taxSum, brutto, taxRate, formatTextFn, isTimesheet = false) {
    if (!positions || positions.length === 0) return '';

    let effectivePositions = Array.isArray(positions) ? [...positions] : [];
    if (isTimesheet) {
        effectivePositions = effectivePositions.filter(p => {
            const itemType = String(p.itemType || '').toLowerCase();
            if (itemType.includes('drive') || itemType.includes('km') || itemType.includes('expenditure')) return false;
            const title = String(p.title || p.description || '').toLowerCase();
            if (/anfahrt|kilometer|fahrtkosten|fahrtpauschale|\bkm\b/i.test(title)) return false;
            return true;
        }).map((p, idx) => ({ ...p, pos: idx + 1 }));
    }
    if (effectivePositions.length === 0) return '';

    const effectiveNetto = isTimesheet
        ? effectivePositions.reduce((acc, p) => acc + (typeof p.total === 'number' ? p.total : (parseFloat(String(p.total).replace(',', '.')) || 0)), 0)
        : netto;
    const effectiveBrutto = isTimesheet ? effectiveNetto : brutto;
    const effectiveTaxSum = isTimesheet ? 0 : taxSum;

    const cols = tableConfig?.columns && tableConfig.columns.length > 0 ? tableConfig.columns : [
        { name: 'Pos', width: 8, align: 'left', type: 'pos' },
        { name: 'Datum', width: 14, align: 'left', type: 'date' },
        { name: 'Menge', width: 12, align: 'left', type: 'duration' },
        { name: 'Beschreibung', width: 42, align: 'left', type: 'title' },
        { name: 'EP', width: 12, align: 'right', type: 'price' },
        { name: 'GP', width: 12, align: 'right', type: 'total' }
    ];

    const textColor = tableConfig?.textColor || '#111827';
    const headerBg = (tableConfig?.headerBackgroundColor !== undefined && tableConfig.headerBackgroundColor !== null && tableConfig.headerBackgroundColor !== '')
        ? tableConfig.headerBackgroundColor
        : '#f4f4f5';
    const headerColor = tableConfig?.headerTextColor || textColor;
    const borderColor = (tableConfig?.borderColor && tableConfig.borderColor !== 'transparent') ? tableConfig.borderColor : '#cbd5e1';
    const headerBorder = (tableConfig?.borderMode === 'none' || tableConfig?.borderColor === 'transparent')
        ? 'none'
        : `1.5px solid ${borderColor}`;
    const tableFontSize = tableConfig?.fontSize ? `${tableConfig.fontSize}pt` : '9.5pt';
    const headerFontSize = tableConfig?.headerFontSize ? `${tableConfig.headerFontSize}pt` : tableFontSize;
    const bruttoFontSize = tableConfig?.fontSize ? `${Number(tableConfig.fontSize) + 1}pt` : '10.5pt';
    const spanCols = Math.max(1, cols.length - 1);
    const formatText = formatTextFn || ((t) => escapeHtml(t));
    const showPriceUnits = tableConfig?.showPriceUnits !== false;
    const isBorderRow = tableConfig?.showBorderRows === true;
    const rowBorderCss = isBorderRow ? `border-bottom: 1px solid ${tableConfig?.borderColor || '#e2e8f0'};` : '';
    const cellPadY = (tableConfig?.cellPadding !== undefined ? tableConfig.cellPadding : 1.8) + 'mm';

    const sumW = cols.reduce((acc, c) => acc + (Number(c.width) || 0), 0);
    const getColWidth = (w) => sumW > 0 ? ((Number(w) || 10) / sumW * 100).toFixed(1) : (100 / cols.length).toFixed(1);

    let totalDurationMins = 0;
    if (tableConfig?.includeTotalDuration === true) {
        for (const p of effectivePositions) {
            const rawDur = String(p.duration || '').replace(',', '.');
            const m = rawDur.match(/([\d.]+)\s*(h|std|min)?/i);
            if (m) {
                const val = parseFloat(m[1]) || 0;
                if (m[2] && m[2].toLowerCase() === 'min') totalDurationMins += val;
                else totalDurationMins += Math.round(val * 60);
            }
        }
    }
    const totalDurationStr = `${(totalDurationMins / 60).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`;
    const hasTfoot = tableConfig.includeTotalNetto !== false || tableConfig.includeTotalTax !== false || tableConfig.includeTotalBrutto !== false || tableConfig.includeTotalDuration === true;

    return `
        <table class="invoice-table" style="font-size: ${tableFontSize}; color: ${textColor};">
            ${tableConfig?.showHeaders !== false ? `
            <thead>
                <tr style="background-color: ${headerBg}; color: ${headerColor}; font-size: ${headerFontSize};">
                    ${cols.map(c => `<th style="width: ${getColWidth(c.width)}%; text-align: ${c.align || 'left'}; background-color: ${headerBg}; color: ${headerColor}; font-size: ${headerFontSize}; border-bottom: ${headerBorder};">${escapeHtml(c.name)}</th>`).join('')}
                </tr>
            </thead>
            ` : ''}
            <tbody style="color: ${textColor};">
                ${effectivePositions.map((p, idx) => {
                    const isZebra = tableConfig?.isZebra && idx % 2 === 1;
                    const rowBg = isZebra ? (tableConfig?.zebraColor || '#f8fafc') : 'transparent';
                    return `
                    <tr style="background-color: ${rowBg};">
                        ${cols.map((c, cIdx) => {
                            const align = c.align || (c.type === 'price' || c.type === 'total' ? 'right' : 'left');
                            let val = '';
                            if (c.type === 'pos') {
                                val = escapeHtml(String(p.pos ?? (idx + 1)));
                            } else if (c.type === 'date') {
                                val = escapeHtml(p.date || '');
                            } else if (c.type === 'duration') {
                                val = escapeHtml(p.duration || '');
                            } else if (c.type === 'title') {
                                const desc = (!isTimesheet && tableConfig.descriptionMode === 'static' && tableConfig.staticDescription && p.itemType === 'time')
                                    ? tableConfig.staticDescription
                                    : (p.title || p.description || '');
                                val = formatText(desc)
                                    .replace(/\$45b/gi, '§ 45b')
                                    .replace(/\$39/gi, '§ 39')
                                    .replace(/Abtretrungserklärung/gi, 'Abtretungserklärung')
                                    .replace(/\uFFFD/g, 'ä');
                            } else if (c.type === 'price') {
                                if (typeof p.price === 'string' && p.price.trim()) {
                                    val = !showPriceUnits ? escapeHtml(p.price.replace(/\s*\/(std\.?|km|h|stunde)/gi, '').trim()) : escapeHtml(p.price.trim());
                                } else {
                                    const num = Number(p.price) || 0;
                                    const formattedNum = num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    if (showPriceUnits && p.itemType === 'time') val = `${formattedNum} €/Std.`;
                                    else if (showPriceUnits && p.itemType === 'drive_km') val = `${formattedNum} €/km`;
                                    else val = `${formattedNum} €`;
                                }
                            } else if (c.type === 'total') {
                                const num = typeof p.total === 'number' ? p.total : (parseFloat(String(p.total).replace(',', '.')) || 0);
                                val = `${num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
                            } else {
                                val = escapeHtml(String(p[c.type] ?? ''));
                            }
                            const isBold = c.type === 'total' || (tableConfig?.firstColumnHighlight && cIdx === 0);
                            const bold = isBold ? 'font-weight: 600;' : '';
                            return `<td style="text-align: ${align}; ${bold} background-color: ${rowBg}; ${rowBorderCss}">${val}</td>`;
                        }).join('')}
                    </tr>
                    `;
                }).join('')}
            </tbody>
            ${hasTfoot ? `
            <tfoot style="color: ${textColor};">
                ${tableConfig.includeTotalDuration === true ? `
                    <tr class="tfoot-duration" style="background-color: transparent;">
                        <td colspan="${spanCols}" style="text-align: right; font-weight: 600; padding: 1.5mm 2.2mm; background-color: transparent;">${escapeHtml(tableConfig.labelDuration?.trim() || 'Gesamtstunden:')}</td>
                        <td style="text-align: right; font-weight: 600; padding: 1.5mm 2.2mm; background-color: transparent;">${totalDurationStr}</td>
                    </tr>
                ` : ''}
                ${tableConfig.includeTotalNetto !== false ? `
                    <tr class="tfoot-netto" style="background-color: transparent;">
                        <td colspan="${spanCols}" style="text-align: right; padding: ${cellPadY} 2.2mm; background-color: transparent; ${(tableConfig.showTotalDivider !== false && tableConfig.dividerScope !== 'totals') ? `border-top: 1.5px solid ${borderColor} !important;` : ''}">${escapeHtml(tableConfig.labelNetto?.trim() || 'Netto:')}</td>
                        <td style="text-align: right; padding: ${cellPadY} 2.2mm; background-color: transparent; ${tableConfig.showTotalDivider !== false ? `border-top: 1.5px solid ${borderColor} !important;` : ''}">${effectiveNetto.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                    </tr>
                ` : ''}
                ${(!isTimesheet && tableConfig.includeTotalTax !== false) ? `
                    <tr class="tfoot-tax" style="background-color: transparent;">
                        <td colspan="${spanCols}" style="text-align: right; padding: ${cellPadY} 2.2mm; background-color: transparent; ${(tableConfig.includeTotalNetto === false && tableConfig.showTotalDivider !== false && tableConfig.dividerScope !== 'totals') ? `border-top: 1.5px solid ${borderColor} !important;` : ''}">${escapeHtml(tableConfig.labelTax?.trim() ? tableConfig.labelTax.replace(/\{taxRate\}/g, String(taxRate)) : `MwSt (${taxRate}%):`)}</td>
                        <td style="text-align: right; padding: ${cellPadY} 2.2mm; background-color: transparent; ${(tableConfig.includeTotalNetto === false && tableConfig.showTotalDivider !== false) ? `border-top: 1.5px solid ${borderColor} !important;` : ''}">${effectiveTaxSum.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                    </tr>
                ` : ''}
                ${tableConfig.includeTotalBrutto !== false ? `
                    <tr class="tfoot-brutto" style="background-color: transparent;">
                        <td colspan="${spanCols}" style="text-align: right; font-weight: bold; font-size: ${bruttoFontSize}; padding: ${cellPadY} 2.2mm; background-color: transparent; ${(tableConfig.includeTotalNetto === false && tableConfig.includeTotalTax === false && tableConfig.showTotalDivider !== false && tableConfig.dividerScope !== 'totals') ? `border-top: 1.5px solid ${borderColor} !important;` : ''}">${escapeHtml(tableConfig.labelBrutto?.trim() || (isTimesheet ? 'Gesamt:' : 'Gesamt:'))}</td>
                        <td style="text-align: right; font-weight: bold; font-size: ${bruttoFontSize}; padding: ${cellPadY} 2.2mm; background-color: transparent; ${(tableConfig.includeTotalNetto === false && tableConfig.includeTotalTax === false && tableConfig.showTotalDivider !== false) ? `border-top: 1.5px solid ${borderColor} !important;` : ''}">${effectiveBrutto.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                    </tr>
                ` : ''}
            </tfoot>` : ''}
        </table>
    `;
}

export function renderStaticTableHtml(b, formatTextFn) {
    const td = b.tableData || { headers: [], rows: [] };
    const tc = b.tableConfig || {};
    const formatText = formatTextFn || ((t) => escapeHtml(t));
    const headerBg = (tc.headerBackgroundColor !== undefined && tc.headerBackgroundColor !== null && tc.headerBackgroundColor !== '')
        ? tc.headerBackgroundColor
        : '#f8fafc';
    const headerColor = tc.headerTextColor || '#0f172a';
    const headerBorder = (tc.borderMode === 'none' || tc.borderColor === 'transparent')
        ? 'none'
        : `1.5px solid ${tc.borderColor || '#cbd5e1'}`;
    const tableFontSize = tc.fontSize ? `${tc.fontSize}pt` : '9.5pt';
    const headerFontSize = tc.headerFontSize ? `${tc.headerFontSize}pt` : tableFontSize;
    const cellPad = tc.cellPadding ?? 6;

    let headersHtml = '';
    if (tc.showHeaders !== false && td.headers && td.headers.length > 0) {
        headersHtml = `
            <thead>
                <tr style="background-color: ${headerBg}; color: ${headerColor}; font-size: ${headerFontSize};">
                    ${td.headers.map(h => `<th style="padding: ${cellPad}px; border-bottom: ${headerBorder}; background-color: ${headerBg}; color: ${headerColor}; font-weight: bold; font-size: ${headerFontSize};">${formatText(h)}</th>`).join('')}
                </tr>
            </thead>
        `;
    }

    const rowsHtml = (td.rows || []).map((row, rIdx) => {
        const isZebra = tc.isZebra && rIdx % 2 === 1;
        const bg = isZebra ? `background-color: ${tc.zebraColor || '#f8fafc'};` : '';
        return `
            <tr style="${bg}">
                ${row.map((cell, cIdx) => {
                    const content = typeof cell === 'object' ? (cell.content ?? '') : String(cell ?? '');
                    let style = `padding: ${cellPad}px; border-bottom: 1px solid ${tc.borderColor || '#e2e8f0'};`;
                    if (typeof cell === 'object' && cell.style) {
                        if (cell.style.align && cell.style.align.includes('right')) style += ' text-align: right;';
                        else if (cell.style.align && cell.style.align.includes('center')) style += ' text-align: center;';
                        else style += ' text-align: left;';
                        if (cell.style.color) style += ` color: ${cell.style.color};`;
                        if (cell.style.fontWeight) style += ` font-weight: ${cell.style.fontWeight};`;
                    }
                    if (tc.firstColumnHighlight && cIdx === 0) style += ' font-weight: bold;';
                    return `<td style="${style}">${formatText(content)}</td>`;
                }).join('')}
            </tr>
        `;
    }).join('');

    return `
        <table class="invoice-table" style="font-size: ${tableFontSize}; margin: 2mm 0; border-collapse: collapse; width: 100%;">
            ${headersHtml}
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    `;
}
