import { createLongPressDrag } from '$lib/services/longPressDrag';
import { toastStore } from '$lib/services/toastService.svelte';
import {
    loadPosition, savePosition, getBottomReserve, clampToViewport, snapToNearestEdge,
    toRelative, toPixel, type PixelPosition
} from '$lib/services/feedbackWidgetPosition';

/**
 * Verbindet Long-Press-Drag mit der gespeicherten Position des „Hier klemmt's"-Buttons.
 * - Kurzes Tippen → onTap (Feedback öffnen)
 * - Gedrückt halten + ziehen → Button frei verschieben mit Einrasten am Rand (A5)
 */
export function createFeedbackButtonMover(
    getBtn: () => HTMLElement | null,
    onTap: () => void,
    onDraggingChange: (dragging: boolean) => void
) {
    let dragOffset = { x: 0, y: 0 };
    let dragReserve = 0;
    let currentPos: PixelPosition | null = null;

    /** Setzt die individuelle Position (oder entfernt sie → Standardposition). */
    function applyPosition(pos: PixelPosition | null) {
        const btn = getBtn();
        if (!btn) return;
        if (!pos) {
            currentPos = null;
            if (btn.hasAttribute('data-custom-pos')) btn.removeAttribute('data-custom-pos');
            return;
        }
        if (currentPos?.x === pos.x && currentPos?.y === pos.y && btn.hasAttribute('data-custom-pos')) return;
        currentPos = pos;
        btn.style.setProperty('--fb-x', `${pos.x}px`);
        btn.style.setProperty('--fb-y', `${pos.y}px`);
        btn.setAttribute('data-custom-pos', 'true');
    }

    /** Lädt die gespeicherte Position und schiebt sie bei Bedarf in den sichtbaren Bereich (z. B. Querformat). */
    function restore() {
        const btn = getBtn();
        if (!btn || drag.isActive) return;
        const rel = loadPosition();
        if (!rel) return applyPosition(null);
        const w = btn.offsetWidth || 56;
        const h = btn.offsetHeight || 56;
        applyPosition(snapToNearestEdge(toPixel(rel, w, h), w, h, getBottomReserve(btn)));
    }

    const drag = createLongPressDrag(getBtn, {
        onTap,
        onDragStart: (offX, offY) => {
            const btn = getBtn();
            if (!btn) return;
            dragOffset = { x: offX, y: offY };
            dragReserve = getBottomReserve(btn);
            const rect = btn.getBoundingClientRect();
            applyPosition({ x: Math.round(rect.left), y: Math.round(rect.top) });
            onDraggingChange(true);
        },
        onDragMove: (cx, cy) => {
            const btn = getBtn();
            if (!btn) return;
            const w = btn.offsetWidth || 56;
            const h = btn.offsetHeight || 56;
            applyPosition(clampToViewport({ x: cx - dragOffset.x, y: cy - dragOffset.y }, w, h, dragReserve));
        },
        onDragEnd: (moved) => {
            onDraggingChange(false);
            const btn = getBtn();
            if (!btn || !currentPos) return;
            if (!moved) return restore();
            const w = btn.offsetWidth || 56;
            const h = btn.offsetHeight || 56;
            const snapped = snapToNearestEdge(currentPos, w, h, dragReserve);
            applyPosition(snapped);
            const ok = savePosition(toRelative(snapped, w, h));
            if (ok) toastStore.success('Position gespeichert', 1500);
            else toastStore.error('Die Position konnte nicht gespeichert werden.');
        }
    });

    return { drag, restore };
}
