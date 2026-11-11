import { pb } from '$lib/services/pocketbase';

/**
 * Speichert die individuelle Position des „Hier klemmt's"-Buttons lokal im Browser.
 * Die Position wird pro angemeldetem Benutzer als relative Werte (0..1) abgelegt,
 * damit sie sich bei Drehung (Hoch-/Querformat) oder Fenstergrößen automatisch anpasst.
 */

export interface RelativePosition {
    xr: number;
    yr: number;
}

export interface PixelPosition {
    x: number;
    y: number;
}

const EDGE_MARGIN = 8;

function storageKey(): string {
    const userId = pb.authStore.record?.id || (pb.authStore as any).model?.id || 'gast';
    return `orgaflow.feedbackButtonPos.${userId}`;
}

function clampRatio(v: unknown): number | null {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(1, Math.max(0, n));
}

export function loadPosition(): RelativePosition | null {
    try {
        const raw = localStorage.getItem(storageKey());
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const xr = clampRatio(parsed?.xr);
        const yr = clampRatio(parsed?.yr);
        return xr === null || yr === null ? null : { xr, yr };
    } catch {
        return null;
    }
}

export function savePosition(pos: RelativePosition): boolean {
    try {
        localStorage.setItem(storageKey(), JSON.stringify(pos));
        return true;
    } catch {
        return false;
    }
}

/**
 * Ermittelt die Höhe aller sichtbaren, am unteren Rand fixierten Navigationsleisten,
 * damit der Button diese niemals verdeckt.
 */
export function getBottomReserve(exclude?: HTMLElement | null): number {
    const vh = window.innerHeight;
    let top = vh;
    document.querySelectorAll<HTMLElement>('nav, [data-bottom-nav]').forEach((el) => {
        if (el === exclude) return;
        const style = getComputedStyle(el);
        if (style.position !== 'fixed' || style.display === 'none' || style.visibility === 'hidden') return;
        const rect = el.getBoundingClientRect();
        if (rect.height <= 0 || rect.width < window.innerWidth * 0.5) return;
        if (rect.bottom >= vh - 2 && rect.top > vh * 0.5) top = Math.min(top, rect.top);
    });
    return vh - top;
}

/** Hält die Position vollständig im sichtbaren Bereich (oberhalb der Bottom-Navigation). */
export function clampToViewport(pos: PixelPosition, w: number, h: number, bottomReserve: number): PixelPosition {
    const maxX = Math.max(EDGE_MARGIN, window.innerWidth - w - EDGE_MARGIN);
    const maxY = Math.max(EDGE_MARGIN, window.innerHeight - bottomReserve - h - EDGE_MARGIN);
    return {
        x: Math.round(Math.min(maxX, Math.max(EDGE_MARGIN, pos.x))),
        y: Math.round(Math.min(maxY, Math.max(EDGE_MARGIN, pos.y)))
    };
}

/** Rastet den Button am linken oder rechten Bildschirmrand ein (A5). */
export function snapToNearestEdge(pos: PixelPosition, w: number, h: number, bottomReserve: number): PixelPosition {
    const clamped = clampToViewport(pos, w, h, bottomReserve);
    const maxX = Math.max(EDGE_MARGIN, window.innerWidth - w - EDGE_MARGIN);
    const snapZone = window.innerWidth * 0.35;

    let snappedX = clamped.x;
    if (clamped.x < snapZone) {
        snappedX = EDGE_MARGIN;
    } else if (clamped.x > maxX - snapZone) {
        snappedX = maxX;
    }

    return { x: snappedX, y: clamped.y };
}

export function toRelative(pos: PixelPosition, w: number, h: number): RelativePosition {
    const spaceX = window.innerWidth - w;
    const spaceY = window.innerHeight - h;
    return {
        xr: spaceX > 0 ? Math.min(1, Math.max(0, pos.x / spaceX)) : 0,
        yr: spaceY > 0 ? Math.min(1, Math.max(0, pos.y / spaceY)) : 0
    };
}

export function toPixel(rel: RelativePosition, w: number, h: number): PixelPosition {
    return {
        x: rel.xr * Math.max(0, window.innerWidth - w),
        y: rel.yr * Math.max(0, window.innerHeight - h)
    };
}
