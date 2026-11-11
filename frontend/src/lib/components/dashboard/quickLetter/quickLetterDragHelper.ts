import type { LetterPositions, PositionKey } from './quickLetterTypes';
import { calculateSnapping } from './quickLetterPositions';

export interface DragHandlerOptions {
    getPaperSheetEl: () => HTMLDivElement | undefined;
    positions: LetterPositions;
    onDragStart: (key: PositionKey) => void;
    onUpdateGuides: (guides: { x: number | null; y: number | null }) => void;
    onDragEnd: () => void;
}

export function createQuickLetterDragHandler(options: DragHandlerOptions) {
    return function handleStartDrag(e: MouseEvent | TouchEvent, key: PositionKey) {
        if ('touches' in e && e.touches.length > 1) return;
        e.preventDefault();
        e.stopPropagation();

        options.onDragStart(key);
        const startMouseX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const startMouseY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const startElemX = options.positions[key].x;
        const startElemY = options.positions[key].y;

        const onMove = (mEvt: MouseEvent | TouchEvent) => {
            const paperSheetEl = options.getPaperSheetEl();
            if (!paperSheetEl) return;
            const curX = 'touches' in mEvt ? mEvt.touches[0].clientX : mEvt.clientX;
            const curY = 'touches' in mEvt ? mEvt.touches[0].clientY : mEvt.clientY;
            const scale = paperSheetEl.clientWidth / 794;
            const snapped = calculateSnapping(
                key,
                startElemX + (curX - startMouseX) / scale,
                startElemY + (curY - startMouseY) / scale,
                options.positions[key].w,
                options.positions[key].h,
                options.positions
            );
            options.positions[key].x = snapped.x;
            options.positions[key].y = snapped.y;
            options.onUpdateGuides({ x: snapped.guideX, y: snapped.guideY });
        };

        const onEnd = () => {
            options.onUpdateGuides({ x: null, y: null });
            options.onDragEnd();
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
        };

        window.addEventListener('mousemove', onMove, { passive: false });
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
    };
}
