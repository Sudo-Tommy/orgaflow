/**
 * Utility-Funktionen zur Auflösung und Bereinigung von Dokumenten- und Datei-URLs im Klienten-Portal.
 * Behebt zuverlässig das Problem interner IP-Adressen (127.0.0.1:8090 / localhost:8090),
 * sodass Dateien sowohl in Produktion (https://ihre-seniorenassistenz.com), auf mobilen Endgeräten
 * im Außendienst als auch im lokalen Netzwerk sauber heruntergeladen und dargestellt werden können.
 */

/**
 * Wandelt interne PocketBase-URLs (z.B. mit http://127.0.0.1:8090) in für den Client
 * erreichbare relative oder korrekte absolute Pfade um.
 */
export function resolveDocumentUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string') return '';

    // Falls die URL bereits ein Blob- oder Daten-Link ist
    if (url.startsWith('blob:') || url.startsWith('data:')) {
        return url;
    }

    if (typeof window === 'undefined') {
        // Serverseitig: Falls 127.0.0.1 vorkommt, Pfad extrahieren falls möglich
        return url.replace(/^https?:\/\/(127\.0\.0\.1|localhost):8090/, '');
    }

    const currentHost = window.location.hostname;
    const isLiveDomain = currentHost.includes('ihre-seniorenassistenz.com');
    const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';

    // Prüfen, ob die URL auf 127.0.0.1:8090 oder localhost:8090 verweist
    const hasInternalPbPort = /https?:\/\/(127\.0\.0\.1|localhost):8090/i.test(url);

    if (hasInternalPbPort) {
        if (isLiveDomain || !isLocalhost) {
            // Im Produktivbetrieb oder externem Zugriff (z.B. LAN-IP 192.168.x.x):
            // Wenn wir auf der Live-Domain sind, reicht der relative Pfad /api/files/...
            // da PocketBase direkt hinter dem Reverse-Proxy / Nginx die Anfragen beantwortet.
            try {
                const parsed = new URL(url);
                return `${parsed.pathname}${parsed.search}`;
            } catch {
                return url.replace(/^https?:\/\/(127\.0\.0\.1|localhost):8090/, '');
            }
        } else {
            // Im lokalen Entwicklungsmodus: Ersetze 127.0.0.1 durch den aktuellen Hostnamen (z.B. localhost)
            return url.replace(/https?:\/\/(127\.0\.0\.1|localhost):8090/i, `http://${currentHost}:8090`);
        }
    }

    return url;
}

/**
 * Führt einen sicheren Download einer Datei als Blob durch, mit automatischer
 * Fallback-Logik, Timeout-Schutz und sauberen Fehler-Meldungen.
 */
export async function downloadFileAsBlob(
    url: string,
    filename: string = 'dokument.pdf',
    timeoutMs: number = 20000
): Promise<{ success: boolean; error?: string }> {
    const cleanUrl = resolveDocumentUrl(url);
    if (!cleanUrl) {
        return { success: false, error: 'Ungültige Dokumenten-URL.' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(cleanUrl, {
            signal: controller.signal,
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`HTTP-Status ${res.status}: Datei konnte nicht vom Server geladen werden.`);
        }

        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        }, 300);

        return { success: true };
    } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn('[downloadFileAsBlob]: Direkter Blob-Download fehlgeschlagen, versuche Standard-Fallback...', err);

        // Robuster Fallback: Direktes Öffnen über ein temporäres Download-Element
        try {
            const fallbackLink = document.createElement('a');
            fallbackLink.style.display = 'none';
            fallbackLink.href = cleanUrl;
            fallbackLink.target = '_blank';
            fallbackLink.download = filename;
            document.body.appendChild(fallbackLink);
            fallbackLink.click();
            setTimeout(() => document.body.removeChild(fallbackLink), 300);
            return { success: true };
        } catch (fallbackErr: any) {
            return { 
                success: false, 
                error: err.name === 'AbortError' 
                    ? 'Zeitüberschreitung beim Download (Verbindung zu langsam).' 
                    : (err.message || 'Download fehlgeschlagen.') 
            };
        }
    }
}
