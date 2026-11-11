import { bringElementToFront, getTopmostOpenDialog } from '$lib/services/layerStackService';

/**
 * Svelte Action to teleport an element to document.body (or the active/topmost dialog if one is open).
 * Teleporting inside the active dialog ensures the element stays in the browser's Top Layer
 * and is never clipped by parent overflow-hidden containers or covered by lower layers (layer-stacking.md).
 */
export function portal(node: HTMLElement, target?: HTMLElement) {
    const parentDialog = node.closest('dialog') as HTMLElement | null;
    const topDialog = getTopmostOpenDialog();
    const dest = target || parentDialog || topDialog || document.body;

    node.setAttribute('data-portal-popover', 'true');
    dest.appendChild(node);
    bringElementToFront(node);

    return {
        update(newTarget?: HTMLElement) {
            const nextDialog = getTopmostOpenDialog();
            const newDest = newTarget || parentDialog || nextDialog || document.body;
            newDest.appendChild(node);
            bringElementToFront(node);
        },
        destroy() {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        }
    };
}
