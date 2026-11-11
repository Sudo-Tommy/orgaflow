/**
 * swipeAction.ts - Svelte Action für Touch-Wischgesten auf Mobilgeräten.
 * Unterstützt z.B. Swipe-to-Action (Erledigen/Löschen/Aktionen) mit Haptik und Schwellenwert.
 */
import { triggerHaptic } from '$lib/services/hapticFeedback';

export interface SwipeOptions {
    threshold?: number;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeProgress?: (progress: number) => void;
    enabled?: boolean;
}

export function swipeAction(node: HTMLElement, options: SwipeOptions = {}) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isSwiping = false;
    let isHorizontalGesture: boolean | null = null;
    let hapticTriggered = false;

    const threshold = options.threshold ?? 70;
    const isEnabled = () => options.enabled !== false;

    function handleTouchStart(e: TouchEvent) {
        if (!isEnabled() || e.touches.length !== 1) return;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        currentX = startX;
        isSwiping = true;
        isHorizontalGesture = null;
        hapticTriggered = false;
    }

    function handleTouchMove(e: TouchEvent) {
        if (!isSwiping || e.touches.length !== 1) return;
        const touch = e.touches[0];
        currentX = touch.clientX;
        const dx = currentX - startX;
        const dy = touch.clientY - startY;

        // Gestenrichtung erkennen
        if (isHorizontalGesture === null) {
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                isHorizontalGesture = Math.abs(dx) > Math.abs(dy);
            }
        }

        // Falls vertikales Scrollen dominiert, keine Wischaktion erzwingen
        if (isHorizontalGesture === false) return;

        if (isHorizontalGesture === true) {
            e.preventDefault();
            const absDx = Math.abs(dx);
            const progress = Math.min(absDx / threshold, 1.5);
            options.onSwipeProgress?.(dx > 0 ? progress : -progress);

            if (absDx >= threshold && !hapticTriggered) {
                triggerHaptic('swipe');
                hapticTriggered = true;
            } else if (absDx < threshold && hapticTriggered) {
                hapticTriggered = false;
            }
        }
    }

    function handleTouchEnd() {
        if (!isSwiping) return;
        isSwiping = false;

        if (isHorizontalGesture === true) {
            const dx = currentX - startX;
            if (dx > threshold && options.onSwipeRight) {
                triggerHaptic('success');
                options.onSwipeRight();
            } else if (dx < -threshold && options.onSwipeLeft) {
                triggerHaptic('success');
                options.onSwipeLeft();
            }
            options.onSwipeProgress?.(0);
        }

        isHorizontalGesture = null;
        hapticTriggered = false;
    }

    node.addEventListener('touchstart', handleTouchStart, { passive: true });
    node.addEventListener('touchmove', handleTouchMove, { passive: false });
    node.addEventListener('touchend', handleTouchEnd, { passive: true });
    node.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return {
        update(newOptions: SwipeOptions) {
            options = newOptions;
        },
        destroy() {
            node.removeEventListener('touchstart', handleTouchStart);
            node.removeEventListener('touchmove', handleTouchMove);
            node.removeEventListener('touchend', handleTouchEnd);
            node.removeEventListener('touchcancel', handleTouchEnd);
        }
    };
}
