import { pb } from './pocketbase';
import { dev } from '$app/environment';

export interface GoogleCalendarStatus {
    connected: boolean;
    hasCredentials: boolean;
    googleEmail: string;
    calendarId: string;
    syncEnabled: boolean;
    lastSync: string | null;
}

// Dynamische Base-URL: Lokal direkt an den Express-Microservice Port 3000, Live über Nginx Reverse Proxy
const API_BASE = dev ? 'http://localhost:3000/api/google-calendar' : '/api/emails/google-calendar';

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pb.authStore.token}`
    };
}

export const googleCalendarService = {
    /**
     * Ruft den aktuellen Verbindungsstatus des angemeldeten Benutzers ab
     */
    async getStatus(): Promise<GoogleCalendarStatus> {
        try {
            const res = await fetch(`${API_BASE}/status`, {
                method: 'GET',
                headers: getHeaders()
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }

            return await res.json();
        } catch (err: any) {
            console.warn('[Google Calendar Service] Fehler beim Status-Abruf:', err);
            return {
                connected: false,
                hasCredentials: false,
                googleEmail: '',
                calendarId: 'primary',
                syncEnabled: false,
                lastSync: null
            };
        }
    },

    /**
     * Fordert eine Google OAuth2 Auth-URL an
     */
    async getAuthUrl(): Promise<string> {
        const res = await fetch(`${API_BASE}/auth-url`, {
            method: 'GET',
            headers: getHeaders()
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Konnte Google-Login-URL nicht anfordern.');
        }

        return data.url;
    },

    /**
     * Startet den Google OAuth Flow in einem zentrierten Popup-Fenster
     */
    async openOAuthPopup(): Promise<{ success: boolean; email?: string }> {
        const authUrl = await this.getAuthUrl();

        return new Promise((resolve, reject) => {
            const width = 560;
            const height = 680;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            const popup = window.open(
                authUrl,
                'GoogleKalenderVerknuepfung',
                `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
            );

            if (!popup) {
                // Fallback falls Popup-Blocker aktiv ist
                window.location.href = authUrl;
                return;
            }

            const messageHandler = (event: MessageEvent) => {
                if (event.data?.type === 'GOOGLE_CALENDAR_CONNECTED') {
                    window.removeEventListener('message', messageHandler);
                    resolve({ success: true, email: event.data.email });
                } else if (event.data?.type === 'GOOGLE_CALENDAR_ERROR') {
                    window.removeEventListener('message', messageHandler);
                    reject(new Error(event.data.error || 'Google-Verknüpfung fehlgeschlagen.'));
                }
            };

            window.addEventListener('message', messageHandler);

            // Prüfen, ob das Fenster vom Nutzer manuell geschlossen wurde
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
                    // Nochmal Status prüfen für den Fall, dass PostMessage geblockt war
                    this.getStatus().then(status => {
                        if (status.connected) {
                            resolve({ success: true, email: status.googleEmail });
                        } else {
                            resolve({ success: false });
                        }
                    }).catch(() => resolve({ success: false }));
                }
            }, 800);
        });
    },

    /**
     * Synchronisiert alle zukünftigen Termine auf einmal
     */
    async syncAll(): Promise<{ synced: number; total: number }> {
        const res = await fetch(`${API_BASE}/sync-all`, {
            method: 'POST',
            headers: getHeaders()
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Fehler beim Synchronisieren.');
        }

        return { synced: data.synced, total: data.total };
    },

    /**
     * Synchronisiert einen einzelnen Termin (Erstellen, Aktualisieren oder Löschen)
     */
    async syncAppointment(appointmentId: string, action: 'upsert' | 'delete' = 'upsert', googleEventId?: string): Promise<any> {
        try {
            const res = await fetch(`${API_BASE}/sync-appointment`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    appointmentId,
                    action,
                    googleEventId
                })
            });

            const data = await res.json();
            return data;
        } catch (err) {
            console.warn('[Google Calendar Service] Fehler beim Termin-Sync:', err);
            return null;
        }
    },

    /**
     * Trennt die Google-Verknüpfung
     */
    async disconnect(): Promise<boolean> {
        const res = await fetch(`${API_BASE}/disconnect`, {
            method: 'POST',
            headers: getHeaders()
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Fehler beim Trennen der Verbindung.');
        }

        return true;
    },

    /**
     * Ruft externe Termine aus dem Google Kalender ab (Nur-Lese-Ansicht)
     */
    async getExternalEvents(timeMin?: string, timeMax?: string): Promise<any[]> {
        try {
            const params = new URLSearchParams();
            if (timeMin) params.set('timeMin', timeMin);
            if (timeMax) params.set('timeMax', timeMax);
            const queryStr = params.toString() ? `?${params.toString()}` : '';
            const res = await fetch(`${API_BASE}/events${queryStr}`, {
                method: 'GET',
                headers: getHeaders()
            });

            if (!res.ok) return [];
            const data = await res.json();
            return data.events || [];
        } catch (err) {
            console.warn('[Google Calendar Service] Fehler beim Laden externer Google Events:', err);
            return [];
        }
    },

    /**
     * Speichert Google API Credentials oder schaltet Sync ein/aus
     */
    async saveConfig(config: { clientId?: string; clientSecret?: string; syncEnabled?: boolean }): Promise<boolean> {
        const res = await fetch(`${API_BASE}/config`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(config)
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Fehler beim Speichern der Konfiguration.');
        }

        return true;
    }
};
