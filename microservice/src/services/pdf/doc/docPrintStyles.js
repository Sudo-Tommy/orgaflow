/**
 * docPrintStyles.js
 * Dedicated stylesheet generator for DIN A4 PDF documents.
 * Guarantees 100% WYSIWYG matching with the block canvas editor.
 */
export function getDocPrintStyles({ isLandscape, tableConfig = {}, hasFooterTemplate = false, docStyles = {} }) {
    const tableFontSize = tableConfig.fontSize ? tableConfig.fontSize + 'pt' : '9.5pt';
    const headerFontSize = tableConfig.headerFontSize ? tableConfig.headerFontSize + 'pt' : tableFontSize;
    const docLineHeight = docStyles.lineHeight ?? 1.45;
    const docSpacingBefore = docStyles.paragraphSpacingBefore !== undefined ? `${docStyles.paragraphSpacingBefore}pt` : '0pt';
    const docSpacingAfter = docStyles.paragraphSpacingAfter !== undefined ? `${docStyles.paragraphSpacingAfter}pt` : '4pt';
    const cellPadY = (tableConfig.cellPadding !== undefined ? tableConfig.cellPadding : (docStyles.tableLineSpacing ?? 1.8)) + 'mm';

    return `
        @page {
            size: A4 ${isLandscape ? 'landscape' : 'portrait'};
            margin-top: 20mm;
            margin-right: 20mm;
            margin-bottom: ${hasFooterTemplate ? '24mm' : '20mm'};
            margin-left: ${isLandscape ? '20mm' : '25mm'};
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 9.5pt;
            line-height: ${docLineHeight};
            color: #111827;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .document-flow {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            align-items: flex-start;
            align-content: flex-start;
            width: 100%;
        }
        .block-wrapper {
            box-sizing: border-box;
            page-break-inside: auto;
            break-inside: auto;
        }
        .block-wrapper.keep-together,
        .h1-title, .h2-title, .h3-title {
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: avoid;
            break-after: avoid;
        }
        .paragraph {
            page-break-inside: auto;
            break-inside: auto;
            orphans: 2;
            widows: 2;
        }
        .page-break {
            page-break-before: always;
            break-before: page;
            height: 0;
            margin: 0;
            padding: 0;
            width: 100%;
        }
        .closing-group {
            width: 100%;
            page-break-inside: avoid;
            break-inside: avoid;
            margin-top: 2.5mm;
        }
        .block-logo-wrapper {
            width: 100%;
            page-break-inside: avoid;
        }
        .block-logo-container {
            width: 100%;
            display: flex;
            align-items: center;
        }
        .block-columns-wrapper {
            width: 100%;
            page-break-inside: avoid;
        }
        .content-columns {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            width: 100%;
            page-break-inside: avoid;
        }
        .content-col {
            box-sizing: border-box;
            padding: 0 1.5mm;
            font-size: 9.5pt;
            line-height: ${docLineHeight};
            white-space: pre-wrap;
        }
        .content-col:first-child { padding-left: 0; }
        .content-col:last-child { padding-right: 0; }
        .kv-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 6px;
            width: 100%;
            line-height: ${docLineHeight};
            white-space: normal;
        }
        .kv-label {
            white-space: nowrap;
            text-align: left;
            flex-shrink: 0;
            font-weight: inherit;
        }
        .kv-value {
            text-align: right;
            flex-grow: 1;
            font-weight: inherit;
            white-space: normal;
        }
        .block-item {
            margin: 0;
            line-height: ${docLineHeight};
        }
        .h1-title { font-size: 16pt; font-weight: bold; color: #000000; margin: 0; line-height: 1.25; }
        .h2-title { font-size: 13pt; font-weight: bold; color: #111827; margin: 0; line-height: 1.3; }
        .h3-title { font-size: 11.5pt; font-weight: bold; color: #1f2937; margin: 0; line-height: 1.35; }
        .paragraph { font-size: 9.5pt; color: #1f2937; white-space: pre-wrap; margin-top: ${docSpacingBefore}; margin-bottom: ${docSpacingAfter}; line-height: ${docLineHeight}; }
        .quote { font-size: 9.5pt; font-style: italic; color: #4b5563; border-left: 2px solid #8b5cf6; padding-left: 3mm; margin-top: ${docSpacingBefore}; margin-bottom: ${docSpacingAfter}; line-height: ${docLineHeight}; }
        .return-address {
            font-size: 7pt;
            color: #4b5563;
            text-decoration: underline;
            margin: 0 0 1.2mm 0;
            line-height: 1.35;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
        .recipient-address {
            font-size: 9.5pt;
            line-height: 1.45;
            color: #0f172a;
            white-space: pre-line;
        }
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin: 2.5mm 0;
            font-size: ${tableFontSize};
            page-break-inside: auto;
        }
        .invoice-table thead {
            display: table-header-group;
        }
        .invoice-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }
        .invoice-table th {
            background-color: ${(tableConfig.headerBackgroundColor !== undefined && tableConfig.headerBackgroundColor !== null && tableConfig.headerBackgroundColor !== '') ? tableConfig.headerBackgroundColor : '#f8fafc'};
            color: ${tableConfig.headerTextColor || '#0f172a'};
            font-size: ${headerFontSize};
            font-weight: 700;
            padding: ${cellPadY} 2.2mm;
            border-bottom: ${(tableConfig.borderMode === 'none' || tableConfig.borderColor === 'transparent') ? 'none' : `1.5px solid ${tableConfig.borderColor || '#cbd5e1'}`};
            text-align: left;
        }
        .invoice-table td {
            padding: ${cellPadY} 2.2mm;
            border-bottom: ${tableConfig.showBorderRows ? `1px solid ${tableConfig.borderColor || '#e2e8f0'}` : 'none'};
            vertical-align: top;
        }
        ${tableConfig.isZebra ? `
        .invoice-table tbody tr:nth-child(even) td {
            background-color: ${tableConfig.zebraColor || '#f8fafc'};
        }
        ` : ''}
        .invoice-table tfoot {
            display: table-row-group;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .invoice-table tfoot tr {
            background-color: transparent !important;
        }
        .invoice-table tfoot td {
            padding: ${cellPadY} 2.2mm;
            border-bottom: none;
            background-color: transparent !important;
        }
        .invoice-table tfoot .tfoot-brutto td {
            background-color: transparent !important;
            font-weight: bold;
        }
        .page-footer {
            margin-top: 3.5mm;
            padding-top: 2mm;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 7pt;
            color: #4b5563;
            line-height: 1.35;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .page-footer-col {
            flex: 1;
            padding: 0 2mm;
            white-space: pre-line;
        }
        .page-footer-col:first-child { padding-left: 0; }
        .page-footer-col:last-child { padding-right: 0; text-align: right; }
    `;
}
