/**
 * layerStackService.ts
 * Systemweiter Layer- & Window-Stacking-Manager (gemäß layer-stacking.md).
 * Garantiert systemweit, dass jedes zuletzt geöffnete oder angeklickte Fenster,
 * Modal, Dialog-Overlay oder Popover immer im kompletten Vordergrund steht.
 */

let currentTopZIndex = 100000;
const openDialogOrder: HTMLDialogElement[] = [];
let isInitialized = false;

export function getNextZIndex(): number {
    currentTopZIndex += 1;
    return currentTopZIndex;
}

export function bringElementToFront(el: HTMLElement | null | undefined): number {
    const z = getNextZIndex();
    if (el && el.style) {
        el.style.setProperty('z-index', String(z), 'important');
    }
    return z;
}

export function getTopmostOpenDialog(): HTMLDialogElement | null {
    if (typeof document === 'undefined') return null;
    for (let i = openDialogOrder.length - 1; i >= 0; i--) {
        const dlg = openDialogOrder[i];
        if (dlg && dlg.isConnected && dlg.open) {
            return dlg;
        }
    }
    const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[open]');
    return dialogs.length > 0 ? dialogs[dialogs.length - 1] : null;
}

function trackDialogOpen(dlg: HTMLDialogElement) {
    const idx = openDialogOrder.indexOf(dlg);
    if (idx !== -1) openDialogOrder.splice(idx, 1);
    openDialogOrder.push(dlg);
    bringElementToFront(dlg);
}

function trackDialogClose(dlg: HTMLDialogElement) {
    const idx = openDialogOrder.indexOf(dlg);
    if (idx !== -1) openDialogOrder.splice(idx, 1);
}

function isLayerWindowElement(el: Element): el is HTMLElement {
    if (!(el instanceof HTMLElement)) return false;
    if (el.id === 'global-toast-container' || el.id === 'feedback-widget-button') return false;
    return (
        el.hasAttribute('data-layer-window') ||
        el.hasAttribute('data-portal-popover') ||
        el.classList.contains('orga-modal-backdrop') ||
        el.getAttribute('role') === 'dialog' ||
        el.getAttribute('role') === 'menu' ||
        (el.tagName === 'DIALOG' && el.hasAttribute('open'))
    );
}

export function initLayerStackService(): () => void {
    if (typeof window === 'undefined' || typeof document === 'undefined' || isInitialized) {
        return () => {};
    }
    isInitialized = true;

    const origShowModal = HTMLDialogElement.prototype.showModal;
    const origClose = HTMLDialogElement.prototype.close;

    HTMLDialogElement.prototype.showModal = function (...args: any[]) {
        // Falls der Dialog bereits im Hintergrund offen war, kurz schließen und neu in den Top-Layer heben
        if (this.open) {
            try { origClose.call(this); } catch {}
        }
        const res = origShowModal.apply(this, args as any);
        trackDialogOpen(this);
        return res;
    };

    HTMLDialogElement.prototype.close = function (...args: any[]) {
        trackDialogClose(this);
        return origClose.apply(this, args as any);
    };

    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type === 'childList') {
                m.addedNodes.forEach((node) => {
                    if (!(node instanceof HTMLElement)) return;
                    if (isLayerWindowElement(node)) {
                        bringElementToFront(node);
                    }
                    const nested = node.querySelectorAll?.('[data-layer-window], [data-portal-popover], .orga-modal-backdrop, [role="dialog"], [role="menu"], dialog[open]');
                    nested?.forEach((child) => {
                        if (child instanceof HTMLElement) bringElementToFront(child);
                    });
                });
            } else if (m.type === 'attributes' && m.target instanceof HTMLElement) {
                const target = m.target;
                if (target.tagName === 'DIALOG' && target.hasAttribute('open')) {
                    trackDialogOpen(target as HTMLDialogElement);
                } else if (isLayerWindowElement(target)) {
                    bringElementToFront(target);
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['open']
    });

    // Klick/Fokus auf ein schwebendes Fenster holt dieses sofort in den Vordergrund
    const handlePointerDown = (e: PointerEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const winEl = target.closest?.('[data-layer-window], [data-portal-popover], .orga-modal-backdrop') as HTMLElement | null;
        if (winEl) {
            bringElementToFront(winEl);
        }
    };

    window.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
        HTMLDialogElement.prototype.showModal = origShowModal;
        HTMLDialogElement.prototype.close = origClose;
        observer.disconnect();
        window.removeEventListener('pointerdown', handlePointerDown, true);
        isInitialized = false;
    };
}

