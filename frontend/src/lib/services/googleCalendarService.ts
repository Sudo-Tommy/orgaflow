import { pb } from './pocketbase';
import { dev } from '$app/environment';

export interface GoogleCalendarStatus {
    connected: boolean;
    hasCredentials: boolean;
    googleEmail: string;
    calendarId: string;
    syncEnabled: boolean;
    lastSync: string | null;
    appName?: string;
}

const API_BASE = dev ? 'http://localhost:3000/api/google-calendar' : '/api/emails/google-calendar';

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pb.authStore.token}`
    };
}

export const googleCalendarService = {
    async getStatus(): Promise<GoogleCalendarStatus> {
        if (!pb.authStore.isValid) {
            return { connected: false, hasCredentials: false, googleEmail: '', calendarId: 'primary', syncEnabled: false, lastSync: null, appName: 'Seniorenassistenz OrgaFlow' };
        }
        try {
            const res = await fetch(`${API_BASE}/status?_t=${Date.now()}`, {
                method: 'GET',
                headers: getHeaders(),
                cache: 'no-store'
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
                lastSync: null,
                appName: 'Seniorenassistenz OrgaFlow'
            };
        }
    },

    async getAuthUrl(): Promise<string> {
        const res = await fetch(`${API_BASE}/auth-url?_t=${Date.now()}`, {
            method: 'GET',
            headers: getHeaders(),
            cache: 'no-store'
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Konnte Google-Login-URL nicht anfordern.');
        }

        return data.url;
    },

    async openOAuthPopup(): Promise<{ success: boolean; email?: string }> {
        const authUrl = await this.getAuthUrl();

        return new Promise((resolve, reject) => {
            const width = 560;
            const height = 680;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            const popup = window.open(
                authUrl,
                'SeniorenassistenzOrgaFlowKalenderAuth',
                `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
            );

            if (!popup) {
                window.location.href = authUrl;
                return;
            }

            let resolved = false;
            const finish = (fn: () => void) => {
                if (resolved) return;
                resolved = true;
                clearInterval(checkClosed);
                window.removeEventListener('message', messageHandler);
                fn();
            };

            const messageHandler = (event: MessageEvent) => {
                if (event.data?.type === 'GOOGLE_CALENDAR_CONNECTED' || event.data?.type === 'GOOGLE_DRIVE_CONNECTED') {
                    finish(() => resolve({ success: true, email: event.data.email }));
                } else if (event.data?.type === 'GOOGLE_CALENDAR_ERROR' || event.data?.type === 'GOOGLE_DRIVE_ERROR') {
                    finish(() => reject(new Error(event.data.error || 'Google-Verknüpfung fehlgeschlagen.')));
                }
            };

            window.addEventListener('message', messageHandler);

            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    this.getStatus().then(status => {
                        finish(() => resolve({ success: status.connected, email: status.googleEmail }));
                    }).catch(() => finish(() => resolve({ success: false })));
                }
            }, 700);
        });
    },

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

    async syncAppointment(appointmentId: string, action: 'upsert' | 'delete' = 'upsert', googleEventId?: string): Promise<any> {
        if (!pb.authStore.isValid) return null;
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

            return await res.json();
        } catch (err) {
            console.warn('[Google Calendar Service] Fehler beim Termin-Sync:', err);
            return null;
        }
    },

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

    async getExternalEvents(timeMin?: string, timeMax?: string, userId?: string): Promise<any[]> {
        if (!pb.authStore.isValid) return [];
        try {
            const params = new URLSearchParams();
            if (timeMin) params.set('timeMin', timeMin);
            if (timeMax) params.set('timeMax', timeMax);
            if (userId) params.set('userId', userId);
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
