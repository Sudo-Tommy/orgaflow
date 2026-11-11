/**
 * feedbackEventShield.ts
 *
 * Schützt modale Dialoge, Backdrops und Seiteninhalte vor ungewollten
 * Durchklick-Events (Click-Through / Ghost Clicks) beim Antippen des
 * schwebenden „Hier klemmt's“-Buttons.
 */

let shieldUntil = 0;
let lastButtonRect: { left: number; top: number; right: number; bottom: number } | null = null;

export function recordButtonRect(rect: DOMRect | null): void {
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    lastButtonRect = {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom
    };
}

export function activateShield(durationMs: number = 800): void {
    shieldUntil = Date.now() + durationMs;
}

export function isShieldActive(): boolean {
    return Date.now() < shieldUntil;
}

export function isPointInButtonArea(clientX: number, clientY: number, margin: number = 8): boolean {
    if (!lastButtonRect) return false;
    return (
        clientX >= lastButtonRect.left - margin &&
        clientX <= lastButtonRect.right + margin &&
        clientY >= lastButtonRect.top - margin &&
        clientY <= lastButtonRect.bottom + margin
    );
}

export function shouldShieldEvent(e: MouseEvent | PointerEvent): boolean {
    if (isShieldActive()) return true;
    if (e.clientX !== undefined && e.clientY !== undefined) {
        return isPointInButtonArea(e.clientX, e.clientY);
    }
    return false;
}

export function swallowEvent(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
}
