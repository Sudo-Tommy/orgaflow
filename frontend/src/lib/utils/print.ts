/**
 * OrgaFlow Print Helper
 * Ermöglicht sauberen, isolierten Druck einzelner DOM-Elemente (z. B. Zugangskarten,
 * QR-Codes, Flyer oder Dokumente), ohne dass Hintergrundseiten, Modals, Backdrops
 * oder globale Layout-Elemente das Druckbild verfälschen oder Mehrseiten-Abstände erzeugen.
 */

export interface PrintOptions {
    title?: string;
    pageOrientation?: 'portrait' | 'landscape' | 'auto';
    pageMargin?: string;
    extraCss?: string;
}

export function printElement(
    target: HTMLElement | string,
    options: PrintOptions = {}
): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            resolve(false);
            return;
        }

        const el = typeof target === 'string' ? document.getElementById(target) : target;
        if (!el) {
            console.warn('[printElement] Ziel-Element nicht gefunden:', target);
            window.print();
            resolve(false);
            return;
        }

        const title = options.title || document.title || 'OrgaFlow Druck';
        const orientation = options.pageOrientation || 'auto';
        const margin = options.pageMargin || '8mm';

        // 1. Erstelle ein unsichtbares, isoliertes Iframe im Body mit A4-Standardbreite
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '0';
        iframe.style.width = '800px'; // ~210mm @ 96 DPI für Desktop-Responsive Media Queries (sm/md/lg)
        iframe.style.height = '1130px'; // ~297mm A4 Höhe
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        iframe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(iframe);

        const iframeWin = iframe.contentWindow;
        const iframeDoc = iframeWin?.document;

        if (!iframeWin || !iframeDoc) {
            console.error('[printElement] Iframe konnte nicht initialisiert werden.');
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
            window.print();
            resolve(false);
            return;
        }

        // 2. Extrahiere alle aktiven <link rel="stylesheet"> und <style> aus dem Haupt-Dokument
        let headStyles = '';
        document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
            headStyles += node.outerHTML;
        });

        // 3. Iframe Dokument aufbauen
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html lang="de">
            <head>
                <meta charset="utf-8">
                <title>${title}</title>
                ${headStyles}
                <style>
                    @page {
                        size: ${orientation === 'auto' ? 'auto' : `A4 ${orientation}`};
                        margin: ${margin};
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        color: #0f172a !important;
                        width: 100% !important;
                        height: auto !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .print-avoid-break, [data-print-avoid-break] {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .print-page-break-before {
                        page-break-before: always !important;
                        break-before: page !important;
                    }
                    ${options.extraCss || ''}
                </style>
            </head>
            <body class="bg-white text-slate-900 p-0 m-0">
                <div id="print-root" style="width: 100%; max-width: 100%; margin: 0 auto;">
                    ${el.outerHTML}
                </div>
            </body>
            </html>
        `);
        iframeDoc.close();

        // 4. Bereinigung nach Abschluss
        const cleanup = () => {
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
                resolve(true);
            }, 800);
        };

        // 5. Auf vollständiges Laden aller Bilder & Fonts im Iframe warten
        const images = Array.from(iframeDoc.images || []);
        const imagePromises = images.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((res) => {
                img.onload = res;
                img.onerror = res;
            });
        });

        Promise.all(imagePromises).then(() => {
            setTimeout(() => {
                try {
                    iframeWin.focus();
                    iframeWin.onafterprint = cleanup;
                    iframeWin.print();
                    // Fallback cleanup falls onafterprint nicht feuert
                    setTimeout(cleanup, 4000);
                } catch (e) {
                    console.error('[printElement] Fehler beim Aufruf von print():', e);
                    cleanup();
                }
            }, 250);
        });
    });
}
