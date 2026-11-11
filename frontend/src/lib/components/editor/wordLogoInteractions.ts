/**
 * wordLogoInteractions.ts
 * Pointer interaction helpers for WordLogoBlock:
 * Vertical height resizing with drag handle and magnetic horizontal snapping (Links, Mitte, Rechts).
 */
import type { WordBlock } from "./wordTypes";

export interface SnapInfo {
    activeSnap: 'left' | 'center' | 'right' | null;
    offsetX: number;
    guideX: number;
    snapLabel: string;
}

export function handleHeightResize(
    e: PointerEvent,
    block: WordBlock,
    zoom: number,
    onFocus: () => void,
    onUpdateHeight: (h: number) => void,
    onFinish: () => void
) {
    e.preventDefault();
    e.stopPropagation();
    onFocus();

    const startMouseY = e.clientY;
    const startH = block.logoConfig?.height || 90;
    const currentZoom = zoom || 1;

    function onPointerMove(ev: PointerEvent) {
        if (!block.logoConfig) return;
        const dh = (ev.clientY - startMouseY) / currentZoom;
        const newH = Math.round(Math.max(40, Math.min(350, startH + dh)));
        block.logoConfig.height = newH;
        onUpdateHeight(newH);
    }

    function onPointerUp() {
        onFinish();
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
}

export function handleImageSnapDrag(
    e: PointerEvent,
    containerEl: HTMLElement,
    imageEl: HTMLElement,
    block: WordBlock,
    zoom: number,
    onFocus: () => void,
    onUpdateSnap: (info: SnapInfo | null) => void,
    onFinish: (finalAlign: 'left' | 'center' | 'right') => void
) {
    onFocus();

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const currentZoom = zoom || 1;
    const containerW = containerEl.clientWidth || 674;
    const imgW = imageEl.clientWidth || 180;
    const curAlign = block.logoConfig?.align || 'right';

    const leftX = 0;
    const centerX = Math.max(0, (containerW - imgW) / 2);
    const rightX = Math.max(0, containerW - imgW);

    const startX = curAlign === 'left' ? leftX : curAlign === 'center' ? centerX : rightX;
    let lastSnap: 'left' | 'center' | 'right' = curAlign;
    let hasMoved = false;

    function onPointerMove(ev: PointerEvent) {
        const dx = (ev.clientX - startMouseX) / currentZoom;
        const dy = (ev.clientY - startMouseY) / currentZoom;

        if (!hasMoved) {
            if (Math.hypot(dx, dy) < 4) return;
            hasMoved = true;
        }
        ev.preventDefault();

        const targetX = startX + dx;
        const dLeft = Math.abs(targetX - leftX);
        const dCenter = Math.abs(targetX - centerX);
        const dRight = Math.abs(targetX - rightX);
        const threshold = 35;

        let activeSnap: 'left' | 'center' | 'right' | null = null;
        let effectiveX = targetX;
        let guideX = 0;
        let snapLabel = '';

        if (dLeft < threshold) {
            activeSnap = 'left';
            effectiveX = leftX;
            guideX = 0;
            snapLabel = 'Links eingerastet';
            lastSnap = 'left';
        } else if (dCenter < threshold) {
            activeSnap = 'center';
            effectiveX = centerX;
            guideX = containerW / 2;
            snapLabel = 'Zentriert eingerastet';
            lastSnap = 'center';
        } else if (dRight < threshold) {
            activeSnap = 'right';
            effectiveX = rightX;
            guideX = containerW;
            snapLabel = 'Rechts eingerastet';
            lastSnap = 'right';
        } else {
            effectiveX = Math.max(0, Math.min(rightX, targetX));
            lastSnap = dLeft < dCenter && dLeft < dRight ? 'left' : dRight < dCenter ? 'right' : 'center';
        }

        onUpdateSnap({
            activeSnap,
            offsetX: effectiveX - startX,
            guideX,
            snapLabel
        });
    }

    function onPointerUp(ev: PointerEvent) {
        if (hasMoved) {
            ev.preventDefault();
            ev.stopPropagation();
            onUpdateSnap(null);
            if (block.logoConfig) {
                block.logoConfig.align = lastSnap;
                block.logoConfig.imgOffsetX = 0;
                block.logoConfig.imgOffsetY = 0;
            }
            onFinish(lastSnap);
        } else {
            onUpdateSnap(null);
        }
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
}
