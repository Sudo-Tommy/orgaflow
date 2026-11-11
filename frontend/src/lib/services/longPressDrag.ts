/**
 * Long-Press-Drag-Steuerung für schwebende Buttons.
 * - Kurzes Tippen  → onTap()
 * - Gedrückt halten (Standard 400 ms) → Verschiebe-Modus, danach Ziehen
 * - Bewegung vor Ablauf der Haltezeit → Abbruch (kein Öffnen, kein Ziehen)
 */

export interface LongPressDragOptions {
    delay?: number;
    tolerance?: number;
    onTap: () => void;
    onDragStart: (offsetX: number, offsetY: number) => void;
    onDragMove: (clientX: number, clientY: number) => void;
    onDragEnd: (moved: boolean) => void;
}

type Phase = 'idle' | 'pressing' | 'dragging' | 'cancelled';

export function createLongPressDrag(getEl: () => HTMLElement | null, opts: LongPressDragOptions) {
    const delay = opts.delay ?? 400;

    let phase: Phase = 'idle';
    let pointerId: number | null = null;
    let pointerType = 'mouse';
    let startX = 0;
    let startY = 0;
    let moved = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let frame = 0;

    function clearTimer() {
        if (timer) clearTimeout(timer);
        timer = null;
    }

    function reset() {
        clearTimer();
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        phase = 'idle';
        pointerId = null;
        moved = false;
    }

    function getTolerance(): number {
        if (opts.tolerance !== undefined) return opts.tolerance;
        return pointerType === 'touch' ? 24 : 10;
    }

    function start(e: PointerEvent) {
        if (phase !== 'idle' || e.button > 0) return;
        const el = getEl();
        if (!el) return;
        phase = 'pressing';
        pointerId = e.pointerId;
        pointerType = e.pointerType || 'mouse';
        startX = e.clientX;
        startY = e.clientY;
        const rect = el.getBoundingClientRect();
        const offX = e.clientX - rect.left;
        const offY = e.clientY - rect.top;
        timer = setTimeout(() => {
            if (phase !== 'pressing') return;
            phase = 'dragging';
            try { navigator.vibrate?.(20); } catch {}
            opts.onDragStart(offX, offY);
        }, delay);
    }

    /** Gibt true zurück, wenn das Event zur laufenden Geste gehört (und geschluckt werden soll). */
    function move(e: PointerEvent): boolean {
        if (phase === 'idle' || e.pointerId !== pointerId) return false;
        const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
        if (phase === 'pressing' && dist > getTolerance()) {
            clearTimer();
            phase = 'cancelled';
            return true;
        }
        if (phase === 'dragging') {
            if (dist > 2) moved = true;
            const { clientX, clientY } = e;
            if (frame) cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => opts.onDragMove(clientX, clientY));
            return true;
        }
        return phase === 'cancelled';
    }

    function end(e: PointerEvent): boolean {
        if (phase === 'idle' || e.pointerId !== pointerId) return false;
        const last = phase;
        const wasMoved = moved;
        reset();
        if (last === 'pressing') opts.onTap();
        else if (last === 'dragging') opts.onDragEnd(wasMoved);
        return true;
    }

    function cancel() {
        const last = phase;
        const wasMoved = moved;
        reset();
        if (last === 'dragging') opts.onDragEnd(wasMoved);
    }

    return {
        start,
        move,
        end,
        cancel,
        get isActive() {
            return phase !== 'idle';
        },
        get isDragging() {
            return phase === 'dragging';
        }
    };
}
