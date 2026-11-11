export interface TopLayerCoordinatorOptions {
    getButton: () => HTMLButtonElement | null;
    isDragging: () => boolean;
    isCovered: () => boolean;
    promoteToTop: () => void;
    syncTopLayer: () => void;
    updateVisibility: () => void;
    restorePosition: () => void;
    recordRect: () => void;
    onPaste: (e: ClipboardEvent) => void;
    onPointerDown: (e: PointerEvent) => void;
    onPointerMove: (e: PointerEvent) => void;
    onPointerUp: (e: PointerEvent) => void;
    onPointerCancel: () => void;
    onClick: (e: MouseEvent) => void;
}

export function setupFeedbackTopLayer(opts: TopLayerCoordinatorOptions): () => void {
    let origShowModal: any;
    let origClose: any;

    if (typeof HTMLDialogElement !== 'undefined') {
        origShowModal = HTMLDialogElement.prototype.showModal;
        origClose = HTMLDialogElement.prototype.close;

        HTMLDialogElement.prototype.showModal = function (...args: any[]) {
            const res = origShowModal.apply(this, args);
            requestAnimationFrame(() => opts.updateVisibility());
            return res;
        };

        HTMLDialogElement.prototype.close = function (...args: any[]) {
            const res = origClose.apply(this, args);
            requestAnimationFrame(() => opts.updateVisibility());
            return res;
        };
    }

    opts.syncTopLayer();
    opts.updateVisibility();
    opts.restorePosition();
    opts.recordRect();

    const handlePaste = (e: ClipboardEvent) => opts.onPaste(e);
    const handleFocusIn = () => { if (opts.isCovered()) opts.promoteToTop(); };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('pointerdown', opts.onPointerDown, true);
    window.addEventListener('pointermove', opts.onPointerMove, true);
    window.addEventListener('pointerup', opts.onPointerUp, true);
    window.addEventListener('pointercancel', opts.onPointerCancel, true);
    window.addEventListener('blur', opts.onPointerCancel);
    window.addEventListener('click', opts.onClick, true);
    window.addEventListener('resize', opts.restorePosition);
    window.addEventListener('focusin', handleFocusIn);

    const observer = new MutationObserver(() => opts.updateVisibility());
    observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['open', 'style', 'class'] });

    const interval = setInterval(() => {
        if (!opts.isDragging()) {
            opts.syncTopLayer();
            opts.restorePosition();
        }
    }, 400);

    return () => {
        if (origShowModal) HTMLDialogElement.prototype.showModal = origShowModal;
        if (origClose) HTMLDialogElement.prototype.close = origClose;

        window.removeEventListener('paste', handlePaste);
        window.removeEventListener('pointerdown', opts.onPointerDown, true);
        window.removeEventListener('pointermove', opts.onPointerMove, true);
        window.removeEventListener('pointerup', opts.onPointerUp, true);
        window.removeEventListener('pointercancel', opts.onPointerCancel, true);
        window.removeEventListener('blur', opts.onPointerCancel);
        window.removeEventListener('click', opts.onClick, true);
        window.removeEventListener('resize', opts.restorePosition);
        window.removeEventListener('focusin', handleFocusIn);

        observer.disconnect();
        clearInterval(interval);
    };
}
