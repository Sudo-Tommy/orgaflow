/**
 * notificationClientService.ts
 * 
 * Entkoppelter, fehlertoleranter Client-Service für Benachrichtigungen (E-Mail, Push, Portal).
 * 
 * Grundregeln:
 * 1. Rein asynchrone Entkopplung (Non-blocking für den Frontend-Event-Loop).
 * 2. Harter Timeout via AbortController (max. 3.000 ms).
 * 3. Transaktionale Persistenz: Schlägt der Benachrichtigungsserver fehl oder ist offline,
 *    wird die Exception sauber abgefangen und geloggt. Der Hauptdatenfluss (z. B. Speichern
 *    in PocketBase) bleibt garantiert erfolgreich und die UI friert niemals ein.
 */

export interface NotifyRequestPayload {
    appointmentRequestId?: string;
    appointmentId?: string;
    senderName?: string;
    email?: string;
    phone?: string;
    requestText?: string;
    date?: string;
    time?: string;
    companyName?: string;
}

export interface NotificationResponse {
    success: boolean;
    queued?: boolean;
    error?: string;
    timedOut?: boolean;
}

/**
 * Ermittelt die Basis-URL für den Benachrichtigungs-Microservice.
 * Unterstützt lokale Entwicklung (Port 3000) sowie Produktions-Reverse-Proxies.
 */
export function getNotificationApiBaseUrl(): string {
    if (typeof window === 'undefined') {
        return 'http://127.0.0.1:3000/portal';
    }
    const isLocal = !window.location.hostname.includes('ihre-seniorenassistenz.com');
    return isLocal ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';
}

/**
 * Sendet eine Benachrichtigung über eine neue Terminanfrage an das System.
 * Garantiert nicht-blockierend mit hartem 3.000 ms Timeout via AbortController.
 */
export async function notifyAppointmentRequestAsync(payload: NotifyRequestPayload): Promise<NotificationResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const baseUrl = getNotificationApiBaseUrl();
    const url = `${baseUrl}/notify-request`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json().catch(() => ({}));
            return {
                success: true,
                queued: data.queued ?? true
            };
        } else {
            const errData = await response.json().catch(() => ({}));
            console.warn('[NotificationService] Server meldete Status:', response.status, errData);
            return {
                success: false,
                error: errData.error || `Server meldete Status ${response.status}`
            };
        }
    } catch (err: any) {
        clearTimeout(timeoutId);

        const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('timeout');
        if (isTimeout) {
            console.warn('[NotificationService] Benachrichtigungstrigger nach 3.000 ms im Timeout abgebrochen (Fail-safe aktiv).');
        } else {
            console.warn('[NotificationService] Benachrichtigungstrigger nicht erreichbar oder Netzwerkfehler:', err.message);
        }

        // Rückgabe ohne Exception: Das Frontend und der SvelteKit Event-Loop frieren NIEMALS ein!
        return {
            success: false,
            timedOut: isTimeout,
            error: err.message
        };
    }
}
