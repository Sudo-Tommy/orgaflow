/**
 * scrollIntoViewOnFocus.ts - Svelte Action für mobile Eingabefelder.
 * Verhindert, dass Felder durch die mobile Bildschirmtastatur verdeckt werden.
 */

export function scrollIntoViewOnFocus(node: HTMLElement) {
    function handleFocus() {
        // Leichte Verzögerung, damit die Bildschirmtastatur voll ausgefahren ist
        setTimeout(() => {
            node.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }, 320);
    }

    node.addEventListener('focus', handleFocus);

    return {
        destroy() {
            node.removeEventListener('focus', handleFocus);
        }
    };
}
