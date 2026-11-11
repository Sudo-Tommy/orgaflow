import type { WordBlock } from "./wordTypes";

/**
 * Eine DIN A4-Seite im Editor.
 * `indices` verweist auf Positionen im reaktiven `blocks`-Array des Editors,
 * damit Bindings (bind:block) immer auf die echte, reaktive Quelle zeigen.
 */
export interface PageData {
    pageNumber: number;
    indices: number[];
    hasManualBreakAfter: boolean;
    manualBreakBlockId?: string;
}

export function estimateBlockHeight(block: WordBlock): number {
    if (block.type === 'logo') return (block.logoConfig?.height || 90) + 16;
    if (block.type === 'din5008_header') return 220;
    if (block.type === 'columns') return 110;
    if (block.type === 'table' || block.type === 'billing_table') {
        const rowsCount = block.tableData?.rows?.length || 4;
        return 45 + (rowsCount * 32);
    }
    if (block.type === 'heading1') return 48;
    if (block.type === 'heading2') return 40;
    if (block.type === 'heading3') return 34;

    // Absatz oder Zitat
    const text = block.content || '';
    const lineBreaks = (text.match(/\n/g) || []).length;
    const estWrapLines = Math.ceil(text.length / 68);
    const totalLines = Math.max(1, lineBreaks + estWrapLines);
    const fs = block.style?.fontSize || 10;
    return Math.max(38, Math.round(totalLines * fs * 1.5 + 18));
}

export function paginateBlocks(
    blocks: WordBlock[],
    pageHeight: number,
    measuredHeights: Record<string, number>,
    hasRepeatingLogo: boolean,
    hasRepeatingFooter: boolean
): PageData[] {
    if (!blocks || blocks.length === 0) {
        return [{ pageNumber: 1, indices: [], hasManualBreakAfter: false }];
    }

    const pages: PageData[] = [];
    let curIndices: number[] = [];
    let curHeight = 0;
    let pageNum = 1;

    function getMaxHeight(pNum: number): number {
        const sheetPadding = 112; // 56px oben + 56px unten (p-14)
        let reserved = 24; // Seitenzahl unten
        if (pNum > 1) {
            if (hasRepeatingLogo) reserved += 70;
            if (hasRepeatingFooter) reserved += 70;
        }
        return pageHeight - sheetPadding - reserved;
    }

    let curMaxHeight = getMaxHeight(pageNum);

    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];

        // 1. Manueller Seitenumbruch: aktuelles Blatt sofort abschließen
        if (b.type === 'page_break') {
            pages.push({ pageNumber: pageNum, indices: curIndices, hasManualBreakAfter: true, manualBreakBlockId: b.id });
            pageNum++;
            curIndices = [];
            curHeight = 0;
            curMaxHeight = getMaxHeight(pageNum);
            continue;
        }

        // 2. Gemessene oder geschätzte Höhe
        const h = measuredHeights[b.id] || estimateBlockHeight(b);

        // 3. Passt nicht mehr → nächstes Blatt
        if (curIndices.length > 0 && curHeight + h > curMaxHeight) {
            pages.push({ pageNumber: pageNum, indices: curIndices, hasManualBreakAfter: false });
            pageNum++;
            curIndices = [i];
            curHeight = h;
            curMaxHeight = getMaxHeight(pageNum);
        } else {
            curIndices.push(i);
            curHeight += h;
        }
    }

    pages.push({ pageNumber: pageNum, indices: curIndices, hasManualBreakAfter: false });
    return pages;
}

export function splitBlockAtParagraphs(block: WordBlock): WordBlock[] {
    if (!block.content) return [block];
    const rawParts = block.content.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (rawParts.length <= 1) return [block];

    return rawParts.map((part, idx) => ({
        id: idx === 0 ? block.id : 'b_' + crypto.randomUUID().slice(0, 8),
        type: block.type,
        content: part,
        style: { ...block.style }
    }));
}
