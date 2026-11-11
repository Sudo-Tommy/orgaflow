import type { CanvasField } from "$lib/services/editorService.svelte";
import type { WordBlock, WordBlockType } from "./wordTypes";
import { applyLogoWrapToFields, calculateBlockRowPositions } from "./wordLayoutEngine";

export function fieldsToBlocks(fields: CanvasField[]): WordBlock[] {
    if (!fields || fields.length === 0) return [];

    const sorted = [...fields].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
    const blocks: WordBlock[] = [];

    for (const f of sorted) {
        let type: WordBlockType = 'paragraph';
        const fontSize = f.style?.fontSize || 11;
        const isBold = f.style?.fontWeight === 'bold';

        if (f.type === 'logo') {
            type = 'logo';
        } else if (f.type === 'table') {
            type = 'billing_table';
        } else if (fontSize >= 18 || (isBold && fontSize >= 16)) {
            type = 'heading1';
        } else if (fontSize >= 14 || (isBold && fontSize >= 13)) {
            type = 'heading2';
        } else if (fontSize >= 12 && isBold) {
            type = 'heading3';
        }

        blocks.push({
            id: f.id || 'b_' + crypto.randomUUID().slice(0, 8),
            type,
            content: f.content || '',
            style: {
                fontSize: f.style?.fontSize || (type === 'heading1' ? 18 : type === 'heading2' ? 14 : 11),
                fontWeight: f.style?.fontWeight === 'bold' ? 'bold' : 'normal',
                fontStyle: 'normal',
                textAlign: (f.style?.textAlign as any) || 'left',
                color: f.style?.color || '#1f2937',
                backgroundColor: f.style?.backgroundColor === 'transparent' ? '' : f.style?.backgroundColor,
                marginBottom: 8
            },
            tableConfig: f.type === 'table' ? JSON.parse(JSON.stringify(f.tableConfig || {})) : undefined,
            logoConfig: f.type === 'logo' ? {
                width: f.w || 180,
                height: f.h || 65,
                x: f.x,
                y: f.y,
                isFree: false,
                repeatOnAllPages: f.style?.repeatOnAllPages ?? false,
                align: (f.style?.textAlign as any) || 'right'
            } : undefined,
            canvasMeta: {
                x: f.x,
                y: f.y,
                w: f.w,
                h: f.h,
                repeatOnAllPages: f.style?.repeatOnAllPages
            }
        });
    }

    return blocks;
}

export function blocksToFields(
    blocks: WordBlock[], 
    options: { marginTop?: number; marginBottom?: number } = {}
): CanvasField[] {
    const fields: CanvasField[] = [];
    const marginTop = options.marginTop ?? 250;
    const marginBottom = options.marginBottom ?? 150;
    const pageWidth = 794;
    const pageHeight = 1123;
    const marginHorizontal = 60;
    const defaultContentWidth = pageWidth - (marginHorizontal * 2); // 674px

    const rowPositions = calculateBlockRowPositions(blocks, { pageWidth, marginHorizontal, marginTop });
    let currentY = marginTop;

    for (let index = 0; index < blocks.length; index++) {
        const b = blocks[index];
        const blockId = b.id || 'f_' + crypto.randomUUID().slice(0, 8);
        const style = b.style || {};

        if (b.type === 'logo') {
            const logoH = b.logoConfig?.height || 80;
            const align = b.logoConfig?.align || style.textAlign || 'right';
            const y = index === 0 ? 35 : currentY;
            const repeat = b.logoConfig?.repeatOnAllPages ?? b.canvasMeta?.repeatOnAllPages ?? false;

            fields.push({
                id: blockId,
                type: 'logo',
                content: b.content || 'Firmenlogo',
                x: marginHorizontal,
                y,
                w: defaultContentWidth,
                h: logoH,
                createdAt: Date.now() + index,
                style: {
                    backgroundColor: 'transparent',
                    color: '#000000',
                    fontSize: 12,
                    fontWeight: 'normal',
                    padding: 0,
                    textAlign: align,
                    repeatOnAllPages: repeat,
                    fit: b.logoConfig?.fit || 'contain',
                    imgOffsetX: b.logoConfig?.imgOffsetX || 0,
                    imgOffsetY: b.logoConfig?.imgOffsetY || 0
                } as any
            });
            currentY = Math.max(currentY, y + logoH + 16);
            continue;
        }

        if (b.type === 'columns' && b.columnsConfig) {
            const cols = b.columnsConfig.columns || [];
            const colY = b.canvasMeta?.y ?? (b.columnsConfig.repeatOnAllPages ? (pageHeight - marginBottom + 10) : currentY);
            let currentX = marginHorizontal;
            let maxColH = 40;

            for (let cIdx = 0; cIdx < cols.length; cIdx++) {
                const col = cols[cIdx];
                const pct = col.widthPercent || (100 / cols.length);
                const colW = Math.floor((defaultContentWidth * pct) / 100) - 8;
                const lineCount = Math.max(1, (col.content || '').split('\n').length);
                const colH = Math.max(30, lineCount * 14);
                maxColH = Math.max(maxColH, colH);

                fields.push({
                    id: `${blockId}_col_${cIdx}`,
                    type: 'text',
                    content: col.content || '',
                    x: currentX,
                    y: colY,
                    w: colW,
                    h: colH,
                    createdAt: Date.now() + index * 10 + cIdx,
                    style: {
                        backgroundColor: 'transparent',
                        color: '#4b5563',
                        fontSize: col.fontSize || 8,
                        fontWeight: 'normal',
                        padding: 0,
                        textAlign: col.textAlign || 'left',
                        repeatOnAllPages: b.columnsConfig.repeatOnAllPages ?? false,
                        dynamicHeight: true
                    }
                });
                currentX += colW + 8;
            }
            if (!b.columnsConfig.repeatOnAllPages) {
                currentY = colY + maxColH + 12;
            }
            continue;
        }

        if (b.type === 'table' || b.type === 'billing_table') {
            const tableH = 160;
            const y = (b.canvasMeta?.y !== undefined && b.canvasMeta.y >= currentY) ? b.canvasMeta.y : currentY;

            fields.push({
                id: blockId,
                type: 'table',
                content: '',
                x: marginHorizontal,
                y,
                w: defaultContentWidth,
                h: tableH,
                createdAt: Date.now() + index,
                style: {
                    backgroundColor: 'transparent',
                    color: '#000000',
                    fontSize: 10,
                    fontWeight: 'normal',
                    padding: 0,
                    textAlign: 'left',
                    repeatOnAllPages: false
                },
                tableConfig: b.tableConfig || {
                    columns: [
                        { id: "1", name: "Pos", type: "pos", width: 10, align: "left" },
                        { id: "2", name: "Datum", type: "date", width: 15, align: "left" },
                        { id: "3", name: "Menge", type: "duration", width: 15, align: "left" },
                        { id: "4", name: "Beschreibung", type: "title", width: 35, align: "left" },
                        { id: "5", name: "EP", type: "price", width: 12, align: "right" },
                        { id: "6", name: "GP", type: "total", width: 13, align: "right" }
                    ],
                    fontSize: 10,
                    showHeaders: true,
                    headerBackgroundColor: "#f4f4f5",
                    headerTextColor: "#000000",
                    includeTotalNetto: true,
                    includeTotalTax: true,
                    includeTotalBrutto: true
                }
            });

            currentY = y + tableH + 20;
            continue;
        }

        const isHeading = b.type.startsWith('heading');
        const defaultFontSize = b.type === 'heading1' ? 18 : b.type === 'heading2' ? 14 : b.type === 'heading3' ? 12 : 11;
        const fontSize = style.fontSize || defaultFontSize;
        const fontWeight = style.fontWeight || (isHeading ? 'bold' : 'normal');

        const rowPos = rowPositions.get(b.id);
        const x = b.canvasMeta?.x ?? rowPos?.x ?? marginHorizontal;
        const y = b.canvasMeta?.y ?? rowPos?.y ?? currentY;
        const w = b.canvasMeta?.w ?? rowPos?.w ?? defaultContentWidth;
        const lineCount = Math.max(1, (b.content || '').split('\n').length);
        const estimatedHeight = rowPos?.h ?? Math.max(24, lineCount * (fontSize * 1.5) + (style.marginBottom || 10));

        fields.push({
            id: blockId,
            type: 'text',
            content: b.content || '',
            x,
            y,
            w,
            h: estimatedHeight,
            createdAt: Date.now() + index,
            style: {
                backgroundColor: style.backgroundColor || 'transparent',
                color: style.color || '#111827',
                fontSize,
                fontWeight,
                padding: 0,
                textAlign: style.textAlign || 'left',
                repeatOnAllPages: b.canvasMeta?.repeatOnAllPages ?? false,
                dynamicHeight: true
            }
        });

        currentY = Math.max(currentY + estimatedHeight + 12, y + estimatedHeight + 12);
    }

    return applyLogoWrapToFields(fields, blocks, { pageWidth, marginHorizontal, marginTop });
}
