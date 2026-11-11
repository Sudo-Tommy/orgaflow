/**
 * docHtmlBuilder.js
 * Generates semantic, styled DIN A4 HTML/CSS for invoice and document templates.
 * 1:1 WYSIWYG matching with the block canvas editor.
 */
import { getDocPrintStyles } from './docPrintStyles.js';
import { renderTableHtml, renderStaticTableHtml } from './docTableHelper.js';
import { getRepeatingFooterBlock, buildFooterTemplateHtml } from './docFooterHelper.js';
import { escapeHtml, formatText, renderColumnsContent } from './docColumnsHelper.js';

function normalizeLegacyHeaderBlocks(rawBlocks) {
    if (!Array.isArray(rawBlocks)) return [];
    const blocks = [...rawBlocks];
    const hasColumnsHeader = blocks.some(b => b.type === 'columns' && !b.columnsConfig?.repeatOnAllPages);
    const din5008Block = blocks.find(b => b.type === 'din5008_header');
    if (hasColumnsHeader || din5008Block) return blocks;

    const retIdx = blocks.findIndex(b => b.type === 'paragraph' && (b.content?.includes('return_address') || b.id?.includes('return_address')));
    const recIdx = blocks.findIndex((b, i) => i !== retIdx && b.type === 'paragraph' && (b.content?.includes('client.name') || b.content?.includes('client.salutation') || b.content?.includes('Mustermann')) && !b.content?.includes('salutation_formal'));
    const compIdx = blocks.findIndex((b, i) => i !== retIdx && i !== recIdx && b.type === 'paragraph' && (b.content?.includes('company.name') || b.content?.includes('Pflegedienst')));

    if (recIdx !== -1 && compIdx !== -1) {
        const retContent = retIdx !== -1 ? (blocks[retIdx].content || '').trim() : '';
        const recContent = (blocks[recIdx].content || '').trim();
        const compContent = (blocks[compIdx].content || '').trim();

        const combinedLeft = retContent ? `${retContent}\n\n${recContent}` : recContent;
        const newColBlock = {
            id: 'b_migrated_head_' + Date.now(),
            type: 'columns',
            style: { marginTop: 4, marginBottom: 16 },
            columnsConfig: {
                count: 2,
                repeatOnAllPages: false,
                borderTop: false,
                columns: [
                    { id: 'c_recipient', content: combinedLeft, widthPercent: 58, textAlign: 'left', fontSize: 9.5 },
                    { id: 'c_company', content: compContent, widthPercent: 42, textAlign: 'right', fontSize: 9 }
                ]
            }
        };

        const indicesToRemove = [retIdx, recIdx, compIdx].filter(i => i !== -1).sort((a, b) => b - a);
        const insertPosition = Math.min(...[retIdx, recIdx, compIdx].filter(i => i !== -1));
        indicesToRemove.forEach(i => blocks.splice(i, 1));
        blocks.splice(insertPosition, 0, newColBlock);
    }
    return blocks;
}

function renderSingleBlock(b, { logoSrc, formatText, positions, netto, taxSum, brutto, taxRate, isTimesheet, onTableConfig, docStyles }) {
    if (b.type === 'logo') {
        const cfg = b.logoConfig || {};
        const logoH = cfg.height || 80;
        const logoFit = cfg.fit || 'contain';
        const logoAlign = cfg.align || 'right';
        const justify = logoAlign === 'left' ? 'flex-start' : (logoAlign === 'center' ? 'center' : 'flex-end');
        const offX = cfg.imgOffsetX || 0, offY = cfg.imgOffsetY || 0;
        const transform = (offX || offY) ? `transform: translate(${offX}px, ${offY}px);` : '';
        const mt = cfg.marginTop !== undefined ? `${cfg.marginTop}mm` : (b.style?.marginTop !== undefined ? `${b.style.marginTop}px` : '0mm');
        const mb = cfg.marginBottom !== undefined ? `${cfg.marginBottom}mm` : (b.style?.marginBottom !== undefined ? `${b.style.marginBottom}px` : '8mm');
        return `<div class="block-logo-wrapper" style="width: 100%; margin-top: ${mt}; margin-bottom: ${mb};"><div class="block-logo-container" style="width: 100%; height: ${logoH}px; display: flex; align-items: center; justify-content: ${justify}; overflow: hidden;">${logoSrc ? `<img src="${logoSrc}" alt="Logo" style="height: 100%; max-height: ${logoH}px; object-fit: ${logoFit}; ${transform}" />` : ''}</div></div>`;
    }

    if (b.type === 'columns' && b.columnsConfig) {
        const cols = b.columnsConfig.columns || [];
        const isHeaderAddress = b.id?.includes('head_cols') || cols.some(c => c.id?.includes('recipient') || c.id?.includes('anschrift') || String(c.content).includes('return_address'));
        let mb = b.style?.marginBottom !== undefined ? `${b.style.marginBottom}px` : '4px';
        if (isHeaderAddress && (b.style?.marginBottom === undefined || b.style?.marginBottom < 60)) {
            mb = '110px';
        }
        const mt = b.style?.marginTop !== undefined ? `${b.style.marginTop}px` : '0';
        const retFontSize = b.columnsConfig.returnAddressFontSize || 7;
        const columnsHtml = renderColumnsContent(cols, formatText, retFontSize);
        return `<div class="block-columns-wrapper" style="width: 100%; margin-top: ${mt}; margin-bottom: ${mb};"><div class="content-columns">${columnsHtml}</div></div>`;
    }

    if (b.type === 'page_break' || b.type === 'pagebreak') {
        return '<div class="page-break"></div>';
    }

    if (b.type === 'table' && b.tableData) {
        return renderStaticTableHtml(b, formatText);
    }

    if (b.type === 'billing_table' || b.type === 'table') {
        const tc = b.tableConfig || {};
        if (onTableConfig) onTableConfig(tc);
        return renderTableHtml(tc, positions, netto, taxSum, brutto, taxRate, formatText, isTimesheet);
    }

    if (b.type === 'din5008_header') {
        const cfg = b.din5008Config || {};
        const retFontSize = cfg.returnAddressFontSize || 7;
        const bottomSpacing = cfg.bottomSpacing !== undefined ? cfg.bottomSpacing : 32;
        return `<div class="block-columns-wrapper" style="width: 100%; margin-bottom: ${bottomSpacing}mm;"><div class="content-columns"><div class="content-col" style="width: 58%; text-align: left;">${cfg.returnAddress ? `<div class="return-address" style="font-size: ${retFontSize}pt;">${formatText(cfg.returnAddress)}</div>` : ''}<div class="recipient-address">${formatText(cfg.recipient || '')}</div></div><div class="content-col" style="width: 42%; text-align: right; font-size: 9pt;">${formatText(cfg.infoDateBlock || '')}</div></div></div>`;
    }

    const isH1 = b.type === 'heading1' || b.style?.fontSize >= 16;
    const isH2 = b.type === 'heading2' || (!isH1 && b.style?.fontSize >= 13);
    const isH3 = b.type === 'heading3' || (!isH1 && !isH2 && b.style?.fontSize >= 11.5 && b.style?.fontWeight === 'bold');
    const cls = isH1 ? 'h1-title' : isH2 ? 'h2-title' : isH3 ? 'h3-title' : b.type === 'quote' ? 'quote' : 'paragraph';
    const wrapCls = (isH1 || isH2 || isH3) ? 'block-wrapper keep-together' : 'block-wrapper';

    const pct = b.style?.widthPercent ?? 100;
    const boxAlign = b.style?.boxAlign ?? 'left';
    let widthCss = 'width: 100%;';
    if (pct < 100) {
        widthCss = `width: ${pct}%; max-width: ${pct}%;`;
        if (boxAlign === 'center') widthCss += ' margin-left: auto; margin-right: auto;';
        else if (boxAlign === 'right') widthCss += ' margin-left: auto; margin-right: 0;';
    }
    const textAlign = b.style?.textAlign ? `text-align: ${b.style.textAlign};` : '';
    const color = b.style?.color ? `color: ${b.style.color};` : '';
    const fontSize = b.style?.fontSize ? `font-size: ${b.style.fontSize}pt;` : '';
    const fontWeight = b.style?.fontWeight ? `font-weight: ${b.style.fontWeight};` : '';
    const mt = b.style?.marginTop !== undefined ? `margin-top: ${b.style.marginTop}pt;` : '';
    const mb = b.style?.marginBottom !== undefined ? `margin-bottom: ${b.style.marginBottom}pt;` : '';
    const lh = b.style?.lineHeight ? `line-height: ${b.style.lineHeight};` : '';

    return `<div class="${wrapCls}" style="${widthCss} ${mt} ${mb}"><div class="block-item ${cls}" style="${textAlign} ${color} ${fontSize} ${fontWeight} ${lh}">${formatText(b.content || '')}</div></div>`;
}

export function buildDocumentHtml({ templateJson, data, isTimesheet }) {
    const isLandscape = templateJson?.orientation === 'landscape';
    const rawBlocks = Array.isArray(templateJson?.blocks) && templateJson.blocks.length > 0 ? templateJson.blocks : null;
    const fields = templateJson?.fields || [];

    const positions = isTimesheet
        ? ((Array.isArray(data?.timesheetPositions) && data.timesheetPositions.length > 0)
            ? data.timesheetPositions
            : (data?.positions || data?.invoicePositions || []))
        : ((Array.isArray(data?.invoicePositions) && data.invoicePositions.length > 0)
            ? data.invoicePositions
            : (data?.positions || data?.timesheetPositions || []));
    const netto = Number(data?.netto) || 0;
    const taxSum = Number(data?.tax_sum) || 0;
    const brutto = Number(data?.brutto) || (netto + taxSum);
    const taxRate = data?.taxRate ?? 0;
    const logoSrc = data?.companyLogoBase64 ? `data:image/png;base64,${data.companyLogoBase64}` : null;

    let bodyItemsHtml = '', tableConfig = {}, footerTemplate = null;

    if (rawBlocks) {
        const blocks = normalizeLegacyHeaderBlocks(rawBlocks);
        const footerBlock = getRepeatingFooterBlock(blocks);
        if (footerBlock) {
            footerTemplate = buildFooterTemplateHtml(footerBlock, formatText);
        }

        const flowBlocks = blocks.filter(b => b !== footerBlock);
        const lastTableIdx = flowBlocks.findLastIndex(b => b.type === 'billing_table' || b.type === 'table');
        
        const mainBlocks = (lastTableIdx !== -1 && lastTableIdx < flowBlocks.length - 1)
            ? flowBlocks.slice(0, lastTableIdx + 1)
            : flowBlocks;
        const closingBlocks = (lastTableIdx !== -1 && lastTableIdx < flowBlocks.length - 1)
            ? flowBlocks.slice(lastTableIdx + 1)
            : [];

        const opts = { logoSrc, formatText, positions, netto, taxSum, brutto, taxRate, isTimesheet, onTableConfig: (tc) => { tableConfig = tc; }, docStyles: templateJson };
        const mainHtml = mainBlocks.map(b => renderSingleBlock(b, opts)).join('');
        const closingHtml = closingBlocks.map(b => renderSingleBlock(b, opts)).join('');

        const closingSectionHtml = closingBlocks.length > 0 ? `<div class="closing-group">${closingHtml}</div>` : '';
        bodyItemsHtml = `${mainHtml}${closingSectionHtml}`;
    } else {
        // Fallback for fields
        const sortedFields = [...fields].sort((a, b) => (Number(a.y) || 0) - (Number(b.y) || 0));
        bodyItemsHtml = sortedFields.map(f => {
            if (f.type === 'logo') {
                return `<div class="block-logo-wrapper" style="width: 100%; margin-bottom: 4mm;"><div class="block-logo-container" style="width: 100%; height: ${f.h || 80}px; display: flex; align-items: center; justify-content: flex-end;">${logoSrc ? `<img src="${logoSrc}" alt="Logo" style="height: 100%; max-height: ${f.h || 80}px; object-fit: contain;" />` : ''}</div></div>`;
            }
            if (f.type === 'table') return renderTableHtml(f.tableConfig || {}, positions, netto, taxSum, brutto, taxRate, formatText, isTimesheet);
            const isH1 = f.style?.fontSize >= 16;
            const cls = isH1 ? 'h1-title' : (f.style?.fontSize >= 13 ? 'h2-title' : 'paragraph');
            return `<div class="block-wrapper" style="width: 100%; margin-bottom: 2.5mm;"><div class="block-item ${cls}" style="text-align: ${f.style?.textAlign || 'left'};">${formatText(f.content)}</div></div>`;
        }).join('');
    }

    const hasFooterTemplate = Boolean(footerTemplate);
    const styles = getDocPrintStyles({ isLandscape, tableConfig, hasFooterTemplate, docStyles: templateJson });
    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${escapeHtml(templateJson?.title || 'Dokument')}</title><style>${styles}</style></head><body><div class="document-flow">${bodyItemsHtml}</div></body></html>`;

    return {
        html,
        footerTemplate,
        toString() { return this.html; }
    };
}
