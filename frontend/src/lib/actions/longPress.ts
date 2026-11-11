/**
 * longPress.ts - Svelte Action für langes Drücken (Long-Press) auf Touchscreens.
 * Öffnet z.B. mobile Schnellmenüs oder Detailansichten ohne versehentliches Auslösen beim Scrollen.
 */
import { triggerHaptic } from '$lib/services/hapticFeedback';

export interface LongPressOptions {
    duration?: number;
    onLongPress: (e: MouseEvent | TouchEvent) => void;
    enabled?: boolean;
}

export function longPress(node: HTMLElement, options: LongPressOptions) {
    let timer: any = null;
    let startX = 0;
    let startY = 0;
    let triggered = false;

    const duration = options.duration ?? 500;
    const isEnabled = () => options.enabled !== false;

    function start(e: MouseEvent | TouchEvent) {
        if (!isEnabled()) return;
        triggered = false;

        if ('touches' in e && e.touches.length === 1) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        } else if ('clientX' in e) {
            startX = e.clientX;
            startY = e.clientY;
        }

        clearTimeout(timer);
        timer = setTimeout(() => {
            triggered = true;
            triggerHaptic('heavy');
            options.onLongPress(e);
        }, duration);
    }

    function move(e: MouseEvent | TouchEvent) {
        if (!timer || triggered) return;
        let curX = 0;
        let curY = 0;

        if ('touches' in e && e.touches.length === 1) {
            curX = e.touches[0].clientX;
            curY = e.touches[0].clientY;
        } else if ('clientX' in e) {
            curX = e.clientX;
            curY = e.clientY;
        }

        // Bei mehr als 10px Bewegung abbrechen (Nutzer will wahrscheinlich scrollen)
        if (Math.hypot(curX - startX, curY - startY) > 10) {
            clearTimeout(timer);
            timer = null;
        }
    }

    function cancel() {
        clearTimeout(timer);
        timer = null;
    }

    node.addEventListener('touchstart', start, { passive: true });
    node.addEventListener('touchmove', move, { passive: true });
    node.addEventListener('touchend', cancel, { passive: true });
    node.addEventListener('touchcancel', cancel, { passive: true });
    node.addEventListener('mousedown', start);
    node.addEventListener('mousemove', move);
    node.addEventListener('mouseup', cancel);
    node.addEventListener('mouseleave', cancel);

    return {
        update(newOptions: LongPressOptions) {
            options = newOptions;
        },
        destroy() {
            clearTimeout(timer);
            node.removeEventListener('touchstart', start);
            node.removeEventListener('touchmove', move);
            node.removeEventListener('touchend', cancel);
            node.removeEventListener('touchcancel', cancel);
            node.removeEventListener('mousedown', start);
            node.removeEventListener('mousemove', move);
            node.removeEventListener('mouseup', cancel);
            node.removeEventListener('mouseleave', cancel);
        }
    };
}
