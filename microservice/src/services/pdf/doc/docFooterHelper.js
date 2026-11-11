/**
 * docFooterHelper.js
 * Builds standardized DIN A4 footer template markup for Chromium PDF printing.
 * Ensures the footer is pinned to the page bottom and strictly isolated from content.
 */

export function getRepeatingFooterBlock(blocks) {
    if (!Array.isArray(blocks)) return null;
    return blocks.find(b => b.type === 'columns' && (b.columnsConfig?.repeatOnAllPages === true || b.columnsConfig?.isFooter === true));
}

export function buildFooterTemplateHtml(footerBlock, formatText) {
    if (!footerBlock?.columnsConfig?.columns) return null;
    const cols = footerBlock.columnsConfig.columns;
    const colsCount = cols.length || 1;

    const colsHtml = cols.map(c => {
        const align = c.textAlign || 'left';
        const width = c.widthPercent ? `${c.widthPercent}%` : `${(100 / colsCount).toFixed(1)}%`;
        const content = formatText ? formatText(c.content || '') : (c.content || '');
        return `<div style="flex: 1; width: ${width}; text-align: ${align}; padding: 0 1.5mm; box-sizing: border-box;">${content}</div>`;
    }).join('');

    return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 7pt; color: #4b5563; line-height: 1.35; width: 100%; padding: 0 20mm 0 25mm; margin: 0; box-sizing: border-box; -webkit-print-color-adjust: exact;">
        <div style="border-top: 1px solid #e2e8f0; padding-top: 2mm; display: flex; justify-content: space-between; width: 100%;">
            ${colsHtml}
        </div>
    </div>`;
}
