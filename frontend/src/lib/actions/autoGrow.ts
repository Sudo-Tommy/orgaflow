/**
 * autoGrow.ts - Svelte Action für automatische Höhenanpassung (Zero-Inner-Scroll)
 * 
 * Verhindert interne Scrollbalken in Textfeldern (Besuchsberichte, Notizen etc.),
 * indem das Element dynamisch und verzögerungsfrei mit dem Inhalt mitwächst.
 */

export interface AutoGrowOptions {
    minHeight?: number;
    extraPadding?: number;
}

export function autoGrow(node: HTMLTextAreaElement, options: AutoGrowOptions = {}) {
    let minHeight = options.minHeight || 0;
    let extraPadding = options.extraPadding || 0;

    // Basis-Styling für unterdrückte innere Scrollbars & natives CSS field-sizing
    node.style.overflowY = 'hidden';
    node.style.resize = 'none';
    (node.style as any).fieldSizing = 'content';

    function resize() {
        if (!node) return;
        // Temporär auf auto setzen, um Verkleinerungen beim Löschen von Text zu erkennen
        node.style.height = 'auto';
        const scrollHeight = node.scrollHeight;
        const targetHeight = Math.max(scrollHeight + extraPadding, minHeight);
        node.style.height = `${targetHeight}px`;
    }

    // Sofortige Initialisierung
    resize();

    // Event-Listener für Tippen und Wertänderungen
    node.addEventListener('input', resize);
    node.addEventListener('change', resize);
    node.addEventListener('focus', resize);

    // Auf Font-Laden reagieren
    if (typeof document !== 'undefined' && 'fonts' in document) {
        document.fonts.ready.then(resize).catch(() => {});
    }

    // ResizeObserver für Layoutänderungen der Elternkomponente
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(() => {
                resize();
            });
        });
        resizeObserver.observe(node);
    }

    // MutationObserver für programmgesteuerte Inhaltsänderungen
    const mutationObserver = new MutationObserver(() => {
        resize();
    });
    mutationObserver.observe(node, {
        characterData: true,
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['value', 'placeholder']
    });

    return {
        update(newOptions: AutoGrowOptions = {}) {
            minHeight = newOptions.minHeight || 0;
            extraPadding = newOptions.extraPadding || 0;
            resize();
        },
        destroy() {
            node.removeEventListener('input', resize);
            node.removeEventListener('change', resize);
            node.removeEventListener('focus', resize);
            if (resizeObserver) resizeObserver.disconnect();
            mutationObserver.disconnect();
        }
    };
}
