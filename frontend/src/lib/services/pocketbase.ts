import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/public';

// Im Entwicklungsmodus (npm run dev) greift SvelteKit auf Port 8090 zu.
// Im Live-Betrieb (Build in pb_public) läuft SvelteKit über PocketBase selbst, daher reicht ein relativer Pfad ("/").
const pbUrl = import.meta.env.DEV 
    ? (env.PUBLIC_POCKETBASE_URL && env.PUBLIC_POCKETBASE_URL.startsWith('https') ? env.PUBLIC_POCKETBASE_URL : (env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090')) 
    : '/';

export const pb = new PocketBase(pbUrl);
pb.autoCancellation(false);

// Funktion, um die PocketBase-Session am Leben zu halten
export function keepPocketBaseAlive() {
    const interval = setInterval(async () => {
        if (pb.authStore.isValid && (pb.authStore.record || pb.authStore.model)) {
            try {
                const collectionName = pb.authStore.record?.collectionName || (pb.authStore.model as any)?.collectionName || 'users';
                // Erweitere den Refresh um 'company', damit die Firmen-Daten im State erhalten bleiben
                await pb.collection(collectionName).authRefresh({
                    expand: 'company'
                });
            } catch (error: any) {
                console.warn('Failed to refresh auth:', error);
                // Wenn die Session ungültig oder widerrufen wurde (401/403), Store bereinigen
                if (error?.status === 401 || error?.status === 403) {
                    pb.authStore.clear();
                }
            }
        }
    }, 5 * 60 * 1000); // Alle 5 Minuten

    return () => clearInterval(interval);
} 

// WICHTIG: PocketBase niemals in ein $state() packen (Proxy-Konflikt)!

// --- GLOBALER AUDIT-HOOK FÜR POCKETBASE ---
// Fängt alle Schreib-, Änderungs- und Löschvorgänge im Frontend ab und sendet sie an den Microservice Log
const originalBeforeSend = pb.beforeSend;

pb.beforeSend = async function (url, options) {
    // Führe ggf. bestehende Hooks aus, falls du schon einen beforeSend hattest
    if (originalBeforeSend) {
        const res = await originalBeforeSend(url, options) as any;
        url = res?.url ?? url;
        options = res?.options ?? res?.reqOpts ?? options;
    }

    // Sicherstellen, dass das Authorization-Token mitgesendet wird, wenn eingeloggt
    if (pb.authStore.token && !options.headers?.Authorization) {
        options.headers = Object.assign({}, options.headers, {
            'Authorization': pb.authStore.token
        });
    }

    // 8-Sekunden-Timeout-Handling für schreibende Mutationen (Double-Submission- & Hang-Schutz)
    if (options.method && options.method !== 'GET' && !options.signal) {
        if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
            options.signal = AbortSignal.timeout(8000);
        }
    }

    // Wir loggen nur Mutationen (POST, PUT, PATCH, DELETE), keine reinen Leseabfragen (GET) und keine internen Realtime-Pings
    if (options.method && options.method !== 'GET' && !url.includes('/api/realtime')) {
        try {
            let payloadData = options.body;
            
            // Formulardaten (z.B. Signatur-Uploads) in Text umwandeln, da FormData sonst als {} geloggt wird
            if (options.body instanceof FormData) {
                payloadData = "FormData (Dateiupload / Komplexe Daten)";
            } else if (typeof options.body === 'string') {
                try { payloadData = JSON.parse(options.body as string); } catch(e) {}
            }

            // Relative URL für den Microservice generieren (Lokal vs. Live)
            const microserviceUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) 
                ? `http://${window.location.hostname}:3000/portal/frontend-audit` 
                : 'https://ihre-seniorenassistenz.com/api/emails/portal/frontend-audit';

            // Heimlich im Hintergrund ("Fire & Forget") an den Express Server schicken
            fetch(microserviceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : ''
                },
                body: JSON.stringify({
                    method: options.method,
                    url: url.replace(pb.baseUrl, ''), // Entferne Basis-URL für besseren Lesefluss im Log
                    payload: payloadData
                })
            }).catch(() => {}); // Fehler beim Loggen dürfen die eigentliche App-Funktion nicht stören
        } catch(e) {}
    }
    
    return { url, options };
};

/**
 * Absicherung von Mutations-Aufrufen mit 8s Timeout und präzisem Fehlerhandling.
 */
export async function withMutationTimeout<T>(
    promise: Promise<T>, 
    timeoutMs = 8000, 
    errorMsg = "Die Anfrage hat das Zeitlimit von 8 Sekunden überschritten."
): Promise<T> {
    let timer: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
    });
    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        clearTimeout(timer);
    }
}

