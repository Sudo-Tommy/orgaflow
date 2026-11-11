import type { CanvasField } from "$lib/services/editorService.svelte";

export interface SnapResult {
    x: number;
    y: number;
    snapLineX: number | null;
    snapLineY: number | null;
}

export interface ResizeSnapResult {
    w: number;
    h: number;
    snapLineX: number | null;
    snapLineY: number | null;
}

export function calculateShapeOutside(field: CanvasField, marginBottom = 150, marginTop = 250): string {
    if (field.type !== 'text' || !field.style.dynamicHeight) return '';
    const points: string[] = [];
    const pad = field.style.padding || 0;
    
    for (let p = 0; p < 20; p++) {
        const gapStart = (p + 1) * 1123 - marginBottom - field.y - pad;
        const gapEnd = (p + 1) * 1123 + marginTop - field.y - pad;
        if (gapEnd > 0) {
            const s = Math.max(0, gapStart);
            const e = gapEnd;
            if (s < e) {
                points.push(`0px ${s}px`, `100% ${s}px`, `100% ${e}px`, `0px ${e}px`);
            }
        }
    }
    return points.length > 0 ? `polygon(${points.join(', ')})` : '';
}

export function calculateBackgroundSegments(field: CanvasField, marginBottom = 150, marginTop = 250): { top: number; height: number }[] {
    if (field.type !== 'text' || !field.style.dynamicHeight) {
        return [{ top: 0, height: field.h }];
    }
    
    const segments: { top: number; height: number }[] = [];
    let currentRelY = 0;
    
    for (let p = 0; p < 20; p++) {
        const gapStart = (p + 1) * 1123 - marginBottom - field.y;
        const gapEnd = (p + 1) * 1123 + marginTop - field.y;
        
        if (gapEnd <= currentRelY) continue;
        if (gapStart > field.h) break;
        
        if (gapStart > currentRelY) {
            segments.push({ top: currentRelY, height: gapStart - currentRelY });
        }
        
        currentRelY = Math.max(currentRelY, gapEnd);
        if (currentRelY >= field.h) break;
    }
    
    if (currentRelY < field.h) {
        segments.push({ top: currentRelY, height: field.h - currentRelY });
    }
    
    const validSegments = segments.filter(s => s.height > 0);
    return validSegments.length > 0 ? validSegments : [{ top: 0, height: field.h }];
}

export function calculateMove(
    dx: number,
    dy: number,
    initialX: number,
    initialY: number,
    field: CanvasField,
    allFields: CanvasField[],
    snapThreshold = 6
): SnapResult {
    let targetX = Math.max(0, initialX + dx);
    let targetY = Math.max(0, initialY + dy);
    const targetW = field.w;
    const targetH = field.h;

    let snapLineX: number | null = null;
    let snapLineY: number | null = null;

    const myEdgesX = [targetX, targetX + targetW / 2, targetX + targetW];
    const myEdgesY = [targetY, targetY + targetH / 2, targetY + targetH];

    let minDiffX = snapThreshold;
    let minDiffY = snapThreshold;

    for (const other of allFields) {
        if (other.id === field.id) continue;
        const otherEdgesX = [other.x, other.x + other.w / 2, other.x + other.w];
        const otherEdgesY = [other.y, other.y + other.h / 2, other.y + other.h];

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (Math.abs(myEdgesX[i] - otherEdgesX[j]) < minDiffX) {
                    minDiffX = Math.abs(myEdgesX[i] - otherEdgesX[j]);
                    targetX = otherEdgesX[j] - (i === 0 ? 0 : (i === 1 ? targetW / 2 : targetW));
                    snapLineX = otherEdgesX[j];
                }
                if (Math.abs(myEdgesY[i] - otherEdgesY[j]) < minDiffY) {
                    minDiffY = Math.abs(myEdgesY[i] - otherEdgesY[j]);
                    targetY = otherEdgesY[j] - (i === 0 ? 0 : (i === 1 ? targetH / 2 : targetH));
                    snapLineY = otherEdgesY[j];
                }
            }
        }
    }

    return {
        x: Math.max(0, targetX),
        y: Math.max(0, targetY),
        snapLineX,
        snapLineY
    };
}

export function calculateResize(
    dx: number,
    dy: number,
    initialW: number,
    initialH: number,
    field: CanvasField,
    allFields: CanvasField[],
    snapThreshold = 6
): ResizeSnapResult {
    let targetW = Math.max(20, initialW + dx);
    let targetH = Math.max(20, initialH + dy);

    const currentRightEdge = field.x + targetW;
    const currentBottomEdge = field.y + targetH;

    let snapLineX: number | null = null;
    let snapLineY: number | null = null;

    let minDiffX = snapThreshold;
    let minDiffY = snapThreshold;

    for (const other of allFields) {
        if (other.id === field.id) continue;
        const otherEdgesX = [other.x, other.x + other.w / 2, other.x + other.w];
        const otherEdgesY = [other.y, other.y + other.h / 2, other.y + other.h];

        for (let j = 0; j < 3; j++) {
            if (Math.abs(currentRightEdge - otherEdgesX[j]) < minDiffX) {
                minDiffX = Math.abs(currentRightEdge - otherEdgesX[j]);
                targetW = Math.max(20, otherEdgesX[j] - field.x);
                snapLineX = otherEdgesX[j];
            }
        }

        for (let j = 0; j < 3; j++) {
            if (Math.abs(currentBottomEdge - otherEdgesY[j]) < minDiffY) {
                minDiffY = Math.abs(currentBottomEdge - otherEdgesY[j]);
                targetH = Math.max(20, otherEdgesY[j] - field.y);
                snapLineY = otherEdgesY[j];
            }
        }
    }

    return {
        w: targetW,
        h: targetH,
        snapLineX,
        snapLineY
    };
}
