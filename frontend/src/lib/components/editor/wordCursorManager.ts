/**
 * wordCursorManager.ts
 * Manages tracking and restoring the cursor position across contenteditable divs,
 * input fields, and textareas in the Word template editor.
 */
import { formatTokenToPill } from "./wordVariables";
import type { WordBlock } from "./wordTypes";

interface SavedCursor {
    type: 'contenteditable' | 'input';
    element: HTMLElement;
    range?: Range;
    start?: number;
    end?: number;
}

let savedCursor: SavedCursor | null = null;
let isInitialized = false;

function isValidEditorElement(target: Node | null): boolean {
    if (!target || typeof window === 'undefined') return false;
    const el = target.nodeType === Node.ELEMENT_NODE ? (target as HTMLElement) : target.parentElement;
    if (!el) return false;

    // Ignore ribbon, popups, and anything explicitly marked
    if (el.closest('[data-ribbon]') || el.closest('[data-no-cursor-track]')) {
        return false;
    }

    // Must be inside document canvas or a contenteditable field
    if (el.isContentEditable || el.closest('[contenteditable="true"]')) {
        return true;
    }

    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        return !!el.closest('[data-word-canvas]');
    }

    return false;
}

export function saveCurrentCursor(): void {
    if (typeof window === 'undefined' || !document) return;

    const activeEl = document.activeElement as HTMLElement | null;

    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        if (isValidEditorElement(activeEl)) {
            const input = activeEl as HTMLInputElement | HTMLTextAreaElement;
            savedCursor = {
                type: 'input',
                element: input,
                start: input.selectionStart ?? input.value.length,
                end: input.selectionEnd ?? input.value.length
            };
            return;
        }
    }

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const container = range.commonAncestorContainer;
        if (isValidEditorElement(container)) {
            const ce = (container.nodeType === Node.ELEMENT_NODE ? container as HTMLElement : container.parentElement)?.closest('[contenteditable="true"]') as HTMLElement | null;
            if (ce) {
                savedCursor = {
                    type: 'contenteditable',
                    element: ce,
                    range: range.cloneRange()
                };
            }
        }
    }
}

export function initCursorTracking(): () => void {
    if (typeof window === 'undefined' || isInitialized) return () => {};
    isInitialized = true;

    const onSelectionChange = () => {
        saveCurrentCursor();
    };

    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('keyup', onSelectionChange);
    document.addEventListener('pointerup', onSelectionChange);

    return () => {
        document.removeEventListener('selectionchange', onSelectionChange);
        document.removeEventListener('keyup', onSelectionChange);
        document.removeEventListener('pointerup', onSelectionChange);
        isInitialized = false;
    };
}

export function clearSavedCursor(): void {
    savedCursor = null;
}

export function insertTokenAtCursor(
    token: string,
    fallbackBlock: WordBlock | null,
    onSync?: () => void
): boolean {
    if (typeof window === 'undefined') return false;

    // 1. CONTENTEDITABLE INSERTION
    if (savedCursor && savedCursor.type === 'contenteditable' && savedCursor.element.isConnected) {
        const ceEl = savedCursor.element;
        ceEl.focus();

        let range = savedCursor.range;
        const sel = window.getSelection();

        // If saved range is valid and inside ceEl
        if (!range || !ceEl.contains(range.commonAncestorContainer)) {
            range = document.createRange();
            range.selectNodeContents(ceEl);
            range.collapse(false);
        }

        // A3: Markierten Text durch die Variable ersetzen
        range.deleteContents();

        // Create chip element
        const temp = document.createElement('div');
        temp.innerHTML = formatTokenToPill(token);
        const chipNode = temp.firstElementChild;

        if (chipNode) {
            range.insertNode(chipNode);

            // A2: Direkt hinter dem Chip mit Zero-Width-Space für stabile Cursor-Verankerung
            const afterTextNode = document.createTextNode('\u200B');
            if (chipNode.nextSibling) {
                chipNode.parentNode?.insertBefore(afterTextNode, chipNode.nextSibling);
            } else {
                chipNode.parentNode?.appendChild(afterTextNode);
            }

            const newRange = document.createRange();
            newRange.setStart(afterTextNode, 1);
            newRange.collapse(true);

            if (sel) {
                sel.removeAllRanges();
                sel.addRange(newRange);
            }

            savedCursor.range = newRange.cloneRange();
        }

        ceEl.dispatchEvent(new Event('input', { bubbles: true }));
        onSync?.();
        return true;
    }

    // 2. INPUT / TEXTAREA INSERTION
    if (savedCursor && savedCursor.type === 'input' && savedCursor.element.isConnected) {
        const input = savedCursor.element as HTMLInputElement | HTMLTextAreaElement;
        input.focus();

        const start = savedCursor.start ?? input.selectionStart ?? input.value.length;
        const end = savedCursor.end ?? input.selectionEnd ?? start;
        const val = input.value;
        const before = val.substring(0, start);
        const after = val.substring(end);

        input.value = before + token + after;

        // A2: Direkt hinter dem Token ohne automatisches Leerzeichen
        const newPos = start + token.length;
        input.selectionStart = newPos;
        input.selectionEnd = newPos;

        savedCursor.start = newPos;
        savedCursor.end = newPos;

        input.dispatchEvent(new Event('input', { bubbles: true }));
        onSync?.();
        return true;
    }

    // 3. FALLBACK (A1: Am Ende des aktuell ausgewählten Textblocks einfügen)
    if (fallbackBlock) {
        if (fallbackBlock.type === 'columns' && fallbackBlock.columnsConfig?.columns) {
            const colIdx = fallbackBlock.columnsConfig.selectedColIndex ?? 0;
            const targetCol = fallbackBlock.columnsConfig.columns[colIdx];
            if (targetCol) {
                targetCol.content = (targetCol.content ? targetCol.content + ' ' : '') + token;
                onSync?.();
                return true;
            }
        } else if (fallbackBlock.type === 'din5008_header' && fallbackBlock.din5008Config) {
            const current = fallbackBlock.din5008Config.recipient || '';
            fallbackBlock.din5008Config.recipient = (current ? current + '\n' : '') + token;
            onSync?.();
            return true;
        } else if (fallbackBlock.type !== 'table' && fallbackBlock.type !== 'billing_table' && fallbackBlock.type !== 'logo') {
            fallbackBlock.content = (fallbackBlock.content ? fallbackBlock.content + ' ' : '') + token;
            onSync?.();
            return true;
        }
    }

    return false;
}
