/**
 * feedbackCanvasUtils.ts
 *
 * Canvas-Zeichenfunktionen und Bildextraktion für das Feedback-System.
 */

export interface AnnotationItem {
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    text: string;
    color: string;
    type?: 'point' | 'arrow';
}

/**
 * Erkennt, ob der Nutzer auf einem Smartphone oder Tablet arbeitet.
 */
export function isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isSmallTouchScreen = window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    return isMobileUa || isSmallTouchScreen;
}

/**
 * Zeichnet Anmerkungen (nummerierte Punkte & Pfeile) auf das Canvas.
 */
export function drawAnnotations(ctx: CanvasRenderingContext2D, items: AnnotationItem[]): void {
    items.forEach((a, index) => {
        const numStr = String(index + 1);
        ctx.save();
        ctx.strokeStyle = a.color || '#ef4444';
        ctx.fillStyle = a.color || '#ef4444';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (a.type === 'point' || (a.x1 === a.x2 && a.y1 === a.y2)) {
            const radius = 16;
            ctx.beginPath();
            ctx.arc(a.x1, a.y1, radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(numStr, a.x1, a.y1);
        } else {
            ctx.beginPath();
            ctx.moveTo(a.x1, a.y1);
            ctx.lineTo(a.x2, a.y2);
            ctx.stroke();

            const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
            const headLen = 18;
            ctx.beginPath();
            ctx.moveTo(a.x2, a.y2);
            ctx.lineTo(a.x2 - headLen * Math.cos(angle - Math.PI / 6), a.y2 - headLen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(a.x2 - headLen * Math.cos(angle + Math.PI / 6), a.y2 - headLen * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();

            const badgeRadius = 14;
            ctx.beginPath();
            ctx.arc(a.x1, a.y1, badgeRadius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(numStr, a.x1, a.y1);
        }
        ctx.restore();
    });
}

/**
 * Liest ein Bild aus der Zwischenablage (Strg+V).
 */
export function extractImageFromClipboard(e: ClipboardEvent): Promise<string | null> {
    return new Promise((resolve) => {
        const items = e.clipboardData?.items;
        if (!items) return resolve(null);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                if (!blob) continue;
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
                return;
            }
        }
        resolve(null);
    });
}

/**
 * Bereinigt das geklonte DOM für html2canvas (Dark Mode, OKLCH Farben, Dialoge, Blattpapier).
 */
export function normalizeClonedDocument(clonedDoc: Document): void {
    if (typeof document === 'undefined') return;

    // 1. Root & Theme-Klassen synchronisieren
    clonedDoc.documentElement.className = document.documentElement.className;
    clonedDoc.documentElement.style.cssText = document.documentElement.style.cssText;
    if (clonedDoc.body && document.body) {
        clonedDoc.body.className = document.body.className;
    }

    // 2. Modale Dialoge im Klon fixieren
    clonedDoc.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(d => {
        if (d.id === 'feedback-dialog') {
            d.style.display = 'none';
            return;
        }
        d.style.position = 'fixed';
        d.style.inset = '0';
        d.style.margin = 'auto';
        d.style.zIndex = '99999';
        d.style.display = 'flex';
        d.style.alignItems = 'center';
        d.style.justifyContent = 'center';
    });

    // 3. DIN A4 Papier-Simulation explizit weiß halten
    clonedDoc.querySelectorAll<HTMLElement>('[data-sheet-bg="true"]').forEach(sheet => {
        sheet.style.backgroundColor = '#ffffff';
        sheet.style.color = '#171717';
    });

    // 4. Störende Elemente ausblenden
    ['feedback-widget-button', 'feedback-dialog', 'global-toast-container'].forEach(id => {
        const el = clonedDoc.getElementById(id);
        if (el) el.style.display = 'none';
    });
    clonedDoc.querySelectorAll<HTMLElement>('[data-feedback-ignore]').forEach(el => {
        el.style.display = 'none';
    });

    // 5. Moderne CSS-Farben (oklch, color-mix, system colors) via Canvas in RGB wandeln
    const probe = clonedDoc.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    const pCtx = probe.getContext('2d');
    if (!pCtx) return;

    const allEls = clonedDoc.querySelectorAll<HTMLElement>('*');
    for (let i = 0; i < allEls.length; i++) {
        const el = allEls[i];
        const comp = window.getComputedStyle(el);
        const bg = comp.backgroundColor;
        if (bg && (bg.includes('oklch') || bg.includes('color(') || bg.includes('color-mix') || bg.toLowerCase().includes('canvas'))) {
            try {
                pCtx.fillStyle = bg;
                el.style.backgroundColor = pCtx.fillStyle;
            } catch {}
        }
        const fg = comp.color;
        if (fg && (fg.includes('oklch') || fg.includes('color(') || fg.includes('color-mix') || fg.toLowerCase().includes('canvastext'))) {
            try {
                pCtx.fillStyle = fg;
                el.style.color = pCtx.fillStyle;
            } catch {}
        }
    }
}
