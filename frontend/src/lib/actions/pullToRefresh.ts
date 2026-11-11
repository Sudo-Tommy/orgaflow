/**
 * pullToRefresh.ts - Svelte Action für mobile Pull-to-Refresh Gesten.
 * Ermöglicht schnelles Neuladen der Datenbestände beim Herunterziehen am oberen Seitenrand.
 */
import { triggerHaptic } from '$lib/services/hapticFeedback';

export interface PullToRefreshOptions {
    onRefresh: () => Promise<void> | void;
    threshold?: number;
    enabled?: boolean;
}

export function pullToRefresh(node: HTMLElement, options: PullToRefreshOptions) {
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let hapticFired = false;

    const threshold = options.threshold ?? 75;
    const isEnabled = () => options.enabled !== false;

    function isAtTop(): boolean {
        // 1. Prüfe den Container selbst (z.B. <main> mit overflow-y-auto)
        if (node.scrollTop > 1) return false;

        // 2. Prüfe alle Eltern-Container bis zum body
        let el: HTMLElement | null = node.parentElement;
        while (el && el !== document.body) {
            if (el.scrollTop > 1) return false;
            el = el.parentElement;
        }

        // 3. Prüfe window / documentElement
        const winScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        if (winScroll > 1) return false;

        return true;
    }

    function handleTouchStart(e: TouchEvent) {
        if (!isEnabled() || e.touches.length !== 1) return;
        // Nur aktivieren, wenn wirklich ganz oben am Seitenanfang gescrollt ist
        if (!isAtTop()) return;

        startY = e.touches[0].clientY;
        currentY = startY;
        isPulling = true;
        hapticFired = false;
    }

    function handleTouchMove(e: TouchEvent) {
        if (!isPulling || e.touches.length !== 1) return;

        // Sobald während der Geste gescrollt wurde und wir nicht mehr oben sind: abbrechen
        if (!isAtTop()) {
            if (node.style.transform) node.style.transform = '';
            isPulling = false;
            return;
        }

        currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        if (diff > 0) {
            // Reibungswiderstand (Resistance Effect)
            const dampened = Math.pow(diff, 0.85);
            node.style.transform = `translateY(${Math.min(dampened, 90)}px)`;
            node.style.transition = 'none';

            if (dampened >= threshold && !hapticFired) {
                triggerHaptic('info');
                hapticFired = true;
            }
        } else {
            if (node.style.transform) node.style.transform = '';
        }
    }

    async function handleTouchEnd() {
        if (!isPulling) return;
        isPulling = false;

        const diff = currentY - startY;
        const dampened = Math.pow(Math.max(0, diff), 0.85);

        node.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';

        if (dampened >= threshold && isAtTop()) {
            triggerHaptic('success');
            node.style.transform = `translateY(40px)`;
            try {
                await options.onRefresh();
            } finally {
                node.style.transform = '';
            }
        } else {
            node.style.transform = '';
        }
    }

    node.addEventListener('touchstart', handleTouchStart, { passive: true });
    node.addEventListener('touchmove', handleTouchMove, { passive: true });
    node.addEventListener('touchend', handleTouchEnd, { passive: true });
    node.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return {
        update(newOptions: PullToRefreshOptions) {
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
