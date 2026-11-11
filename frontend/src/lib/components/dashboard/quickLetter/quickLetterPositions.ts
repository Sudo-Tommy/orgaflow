import type { PositionKey, LetterPositions } from './quickLetterTypes';

export const DEFAULT_POSITIONS: LetterPositions = {
    logo: { x: 480, y: 35, w: 254, h: 75 },
    absender: { x: 60, y: 143, w: 360, h: 18 },
    anschrift: { x: 60, y: 165, w: 340, h: 90 },
    betreff: { x: 60, y: 280, w: 480, h: 32 },
    datum: { x: 554, y: 280, w: 180, h: 28 }, // Exakt auf vertikaler Höhe der Betreffzeile (DIN 5008)
    body: { x: 60, y: 330, w: 674, h: 560 }
};

export const ELEMENT_LABELS: Record<PositionKey, string> = {
    logo: 'Firmenlogo / Bild',
    absender: 'Rücksendezeile (7 pt)',
    anschrift: 'Empfängeradresse',
    datum: 'Datum & Referenz (auf Betreffhöhe)',
    betreff: 'Betreffzeile',
    body: 'Brieftext & Grußformel'
};

const STORAGE_KEY = 'orgaflow_din5008_letter_positions';
const SNAP_THRESHOLD = 8;

export function calculateSnapping(
    currentKey: PositionKey,
    rawX: number,
    rawY: number,
    w: number,
    h: number,
    positions: LetterPositions
): { x: number; y: number; guideX: number | null; guideY: number | null } {
    let bestX = rawX;
    let bestY = rawY;
    let guideX: number | null = null;
    let guideY: number | null = null;
    let minDiffX = SNAP_THRESHOLD + 1;
    let minDiffY = SNAP_THRESHOLD + 1;

    // Horizontale Führungsachsen (Links 60, Mitte 397, Rechts 734)
    const targetXList: number[] = [60, 397, 734];
    for (const [key, pos] of Object.entries(positions) as Array<[PositionKey, { x: number; y: number; w: number; h: number }]>) {
        if (key === currentKey) continue;
        targetXList.push(pos.x, pos.x + pos.w, Math.round(pos.x + pos.w / 2));
    }

    for (const targetX of targetXList) {
        const diffLeft = Math.abs(rawX - targetX);
        if (diffLeft < minDiffX) { minDiffX = diffLeft; bestX = targetX; guideX = targetX; }
        const diffRight = Math.abs((rawX + w) - targetX);
        if (diffRight < minDiffX) { minDiffX = diffRight; bestX = targetX - w; guideX = targetX; }
        const diffCenter = Math.abs((rawX + w / 2) - targetX);
        if (diffCenter < minDiffX) { minDiffX = diffCenter; bestX = targetX - Math.round(w / 2); guideX = targetX; }
    }

    // Vertikale Führungsachsen (insb. Betreffhöhe Y=280)
    const targetYList: number[] = [35, 143, 165, 280, 330];
    for (const [key, pos] of Object.entries(positions) as Array<[PositionKey, { x: number; y: number; w: number; h: number }]>) {
        if (key === currentKey) continue;
        targetYList.push(pos.y, pos.y + pos.h, Math.round(pos.y + pos.h / 2));
    }

    for (const targetY of targetYList) {
        const diffTop = Math.abs(rawY - targetY);
        if (diffTop < minDiffY) { minDiffY = diffTop; bestY = targetY; guideY = targetY; }
        const diffBottom = Math.abs((rawY + h) - targetY);
        if (diffBottom < minDiffY) { minDiffY = diffBottom; bestY = targetY - h; guideY = targetY; }
        const diffMiddle = Math.abs((rawY + h / 2) - targetY);
        if (diffMiddle < minDiffY) { minDiffY = diffMiddle; bestY = targetY - Math.round(h / 2); guideY = targetY; }
    }

    return { x: bestX, y: bestY, guideX, guideY };
}

export function loadSavedPositions(companyId?: string): LetterPositions {
    const res: LetterPositions = {
        logo: { ...DEFAULT_POSITIONS.logo },
        absender: { ...DEFAULT_POSITIONS.absender },
        anschrift: { ...DEFAULT_POSITIONS.anschrift },
        betreff: { ...DEFAULT_POSITIONS.betreff },
        datum: { ...DEFAULT_POSITIONS.datum },
        body: { ...DEFAULT_POSITIONS.body }
    };
    if (typeof localStorage === 'undefined') return res;

    try {
        const key = companyId ? `${STORAGE_KEY}_${companyId}` : STORAGE_KEY;
        const stored = localStorage.getItem(key) || localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            for (const k of Object.keys(DEFAULT_POSITIONS) as PositionKey[]) {
                if (parsed[k]) {
                    res[k] = { ...DEFAULT_POSITIONS[k], ...parsed[k] };
                }
            }
        }
    } catch {}
    return res;
}

export function savePositionsToStorage(positions: LetterPositions, companyId?: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
        const key = companyId ? `${STORAGE_KEY}_${companyId}` : STORAGE_KEY;
        localStorage.setItem(key, JSON.stringify(positions));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    } catch {}
}

export function adaptLogoDimensions(
    naturalWidth: number,
    naturalHeight: number,
    scalePercent: number = 100
): { w: number; h: number } {
    if (naturalWidth <= 0 || naturalHeight <= 0) return { w: 254, h: 75 };
    const ratio = naturalWidth / naturalHeight;
    let w = 250;
    let h = Math.round(w / ratio);
    if (h > 85) {
        h = 85;
        w = Math.round(h * ratio);
    }
    const factor = Math.max(0.4, Math.min(2.0, scalePercent / 100));
    w = Math.round(w * factor);
    h = Math.round(h * factor);
    return {
        w: Math.max(35, Math.min(360, w)),
        h: Math.max(20, Math.min(160, h))
    };
}
