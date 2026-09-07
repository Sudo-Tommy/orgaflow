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
        if (pb.authStore.isValid && pb.authStore.model) {
            try {
                const collectionName = pb.authStore.model.collectionName;
                // Erweitere den Refresh um 'company', damit die Firmen-Daten im State erhalten bleiben
                await pb.collection(collectionName).authRefresh({
                    expand: 'company'
                });
            } catch (error) {
                console.warn('Failed to refresh auth:', error);
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
        url = res.url ?? url;
        options = res.reqOpts ?? res.options ?? options;
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
    
    return { url, reqOpts: options } as any;
};
