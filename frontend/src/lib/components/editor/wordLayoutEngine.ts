import type { WordBlock } from "./wordTypes";
import type { CanvasField } from "$lib/services/editorService.svelte";

export interface LogoWrapInfo {
    active: boolean;
    x: number;
    y: number;
    w: number;
    h: number;
    spacing: number;
    isRight: boolean;
    isLeft: boolean;
    isCenter: boolean;
}

/**
 * Extracts free-floating logo position and geometry for text wrap calculations.
 */
export function getLogoWrapInfo(blocks: WordBlock[], pageWidth = 794): LogoWrapInfo | null {
    const logoBlock = blocks.find(b => b.type === 'logo' && (b.logoConfig?.isFree ?? true));
    if (!logoBlock || !logoBlock.logoConfig) return null;

    const cfg = logoBlock.logoConfig;
    const w = cfg.width || 200;
    const h = cfg.height || 65;
    const x = cfg.x ?? 534;
    const y = cfg.y ?? 35;
    const spacing = cfg.spacing ?? 16;
    const centerX = x + w / 2;
    const pageCenter = pageWidth / 2;

    const isCenter = Math.abs(centerX - pageCenter) < 50 || w > pageWidth * 0.65;
    const isRight = !isCenter && centerX >= pageCenter;
    const isLeft = !isCenter && centerX < pageCenter;

    return {
        active: true,
        x,
        y,
        w,
        h,
        spacing,
        isRight,
        isLeft,
        isCenter
    };
}

/**
 * Calculates CSS wrap style (max-width, margins) for a given block to avoid logo overlap.
 */
export function computeBlockWrapStyle(
    blockTop: number,
    blockHeight: number,
    logoInfo: LogoWrapInfo | null,
    options: {
        pageWidth?: number;
        marginHorizontal?: number;
        marginTop?: number;
    } = {}
): string {
    if (!logoInfo || !logoInfo.active) return "";
    const pageWidth = options.pageWidth ?? 794;
    const marginHorizontal = options.marginHorizontal ?? 60;
    const marginTop = options.marginTop ?? 250;

    // A3: Fester Kopfbereich - Wenn das Logo im DIN 5008 Kopfbereich verbleibt (y < marginTop)
    // und der Fließtext-Block liegt unterhalb des Kopfbereichs (blockTop >= marginTop),
    // weicht der reguläre Text nicht seitlich aus, da der Kopfbereich bereits getrennt ist.
    if (logoInfo.y < marginTop && blockTop >= marginTop) {
        return "";
    }

    const logoTop = logoInfo.y - logoInfo.spacing;
    const logoBottom = logoInfo.y + logoInfo.h + logoInfo.spacing;
    const blockBottom = blockTop + blockHeight;

    // Prüfen, ob sich der Block vertikal mit dem Logo (inklusive Puffer) schneidet
    const overlaps = blockTop < logoBottom && blockBottom > logoTop;
    if (!overlaps) return "";

    if (logoInfo.isRight) {
        // Logo sitzt rechts: Text weicht nach links aus
        const availableWidth = Math.max(140, logoInfo.x - logoInfo.spacing - marginHorizontal);
        return `max-width: ${availableWidth}px; margin-right: auto; transition: max-width 0.2s ease, margin 0.2s ease;`;
    } else if (logoInfo.isLeft) {
        // Logo sitzt links: Text weicht nach rechts aus
        const leftIndent = (logoInfo.x + logoInfo.w + logoInfo.spacing) - marginHorizontal;
        const availableWidth = Math.max(140, (pageWidth - marginHorizontal) - (logoInfo.x + logoInfo.w + logoInfo.spacing));
        return `margin-left: ${Math.max(0, leftIndent)}px; max-width: ${availableWidth}px; transition: max-width 0.2s ease, margin 0.2s ease;`;
    } else {
        // Logo ist zentriert oder sehr breit: Textblock weicht nach unten aus
        const pushDown = Math.max(0, logoBottom - blockTop);
        return `margin-top: ${pushDown}px; transition: margin 0.2s ease;`;
    }
}

/**
 * A5: Passt die Feld-Koordinaten und Breiten für PDFKit 1:1 identisch an.
 */
export function applyLogoWrapToFields(
    fields: CanvasField[],
    blocks: WordBlock[],
    options: { pageWidth?: number; marginHorizontal?: number; marginTop?: number } = {}
): CanvasField[] {
    const pageWidth = options.pageWidth ?? 794;
    const marginHorizontal = options.marginHorizontal ?? 60;
    const marginTop = options.marginTop ?? 250;
    const logoInfo = getLogoWrapInfo(blocks, pageWidth);

    if (!logoInfo || !logoInfo.active) return fields;

    const logoTop = logoInfo.y - logoInfo.spacing;
    const logoBottom = logoInfo.y + logoInfo.h + logoInfo.spacing;

    return fields.map(f => {
        if (f.type === 'logo') return f;

        // Kopfbereich-Schutz: Wenn Logo im Kopfbereich und Feld unterhalb
        if (logoInfo.y < marginTop && f.y >= marginTop) {
            return f;
        }

        const fieldTop = f.y;
        const fieldBottom = f.y + f.h;
        const overlaps = fieldTop < logoBottom && fieldBottom > logoTop;

        if (!overlaps) return f;

        if (logoInfo.isRight) {
            // Text weicht links aus: Breite kürzen
            const newW = Math.max(140, logoInfo.x - logoInfo.spacing - f.x);
            return { ...f, w: newW };
        } else if (logoInfo.isLeft) {
            // Text weicht rechts aus: Start X nach rechts verschieben und Restbreite anpassen
            const newX = logoInfo.x + logoInfo.w + logoInfo.spacing;
            const newW = Math.max(140, (pageWidth - marginHorizontal) - newX);
            return { ...f, x: newX, w: newW };
        } else {
            // Logo zentriert: Textfeld vertikal nach unten schieben
            return { ...f, y: logoBottom + 8 };
        }
    });
}

/**
 * A3 & A5: Berechnet die X/Y-Positionen und Breiten von Blöcken im Zeilen- / Spaltenfluss.
 * Erlaubt, dass zwei schmale Boxen (z. B. 50% + 50%) in derselben Zeile nebeneinander stehen.
 */
export function calculateBlockRowPositions(
    blocks: WordBlock[],
    options: { pageWidth?: number; marginHorizontal?: number; marginTop?: number } = {}
): Map<string, { x: number; y: number; w: number; h: number }> {
    const pageWidth = options.pageWidth ?? 794;
    const marginHorizontal = options.marginHorizontal ?? 60;
    const marginTop = options.marginTop ?? 250;
    const defaultContentWidth = pageWidth - (marginHorizontal * 2);

    const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
    let currentY = marginTop;
    let currentX = marginHorizontal;
    let rowMaxH = 0;

    for (const b of blocks) {
        if (b.type === 'logo') continue;

        if (b.type === 'din5008_header') {
            currentY = marginTop;
            currentX = marginHorizontal;
            rowMaxH = 0;
            continue;
        }

        const isFullWidth = b.type === 'table' || b.type === 'billing_table' || b.type === 'columns';
        const style = b.style || {};
        const pct = isFullWidth ? 100 : (style.widthPercent ? Math.max(20, Math.min(100, style.widthPercent)) : 100);
        const blockW = isFullWidth ? defaultContentWidth : Math.round((defaultContentWidth * pct) / 100);

        const fontSize = style.fontSize || 11;
        const lineCount = Math.max(1, (b.content || '').split('\n').length);
        const estH = isFullWidth 
            ? (b.type === 'columns' ? 40 : 160) 
            : Math.max(24, lineCount * (fontSize * 1.5) + (style.marginBottom || 10));

        // Umbruch, wenn Block nicht mehr in die aktuelle Zeile passt
        if (pct === 100 || (currentX + blockW > marginHorizontal + defaultContentWidth + 5 && currentX > marginHorizontal)) {
            if (currentX > marginHorizontal) {
                currentY += rowMaxH + 10;
                currentX = marginHorizontal;
                rowMaxH = 0;
            }
        }

        let posX = currentX;
        if (pct < 100 && currentX === marginHorizontal) {
            if (style.boxAlign === 'right') {
                posX = marginHorizontal + (defaultContentWidth - blockW);
            } else if (style.boxAlign === 'center') {
                posX = marginHorizontal + Math.round((defaultContentWidth - blockW) / 2);
            }
        }

        positions.set(b.id, { x: posX, y: currentY, w: blockW, h: estH });
        rowMaxH = Math.max(rowMaxH, estH);

        if (pct === 100 || isFullWidth) {
            currentY += estH + 12;
            currentX = marginHorizontal;
            rowMaxH = 0;
        } else {
            currentX += blockW + 8;
        }
    }

    return positions;
}
