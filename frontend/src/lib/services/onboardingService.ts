import { getPublicOrigin } from '$lib/services/apiConfig';
import { pb } from './pocketbase';

export interface OnboardingTokenInfo {
    valid: boolean;
    role?: 'employee' | 'developer' | 'superadmin';
    companyName?: string;
    companyId?: string;
    expires_at?: string;
    reason?: 'not_found' | 'used' | 'expired';
    message?: string;
}

export interface OnboardingFormData {
    name_first: string;
    name_last: string;
    email: string;
    password: string;
    date_birth?: string;
    birth_place?: string;
    nationality?: string;
    gender?: 'weiblich' | 'männlich' | 'divers' | 'keine_angabe';
    employment_type?: string;
    street?: string;
    housenr?: string;
    zip?: string;
    city?: string;
    tel?: string;
    handy?: string;
    bank_iban?: string;
    bank_bic?: string;
    bank_name?: string;
    bank_owner?: string;
    tax_id?: string;
    tax_class?: string;
    social_security_nr?: string;
    health_insurance?: string;
    drivers_license?: string;
    has_car?: boolean;
    willing_to_travel?: boolean;
    qualifications?: string;
    sign?: string;
    avatar?: string;
}

function getCandidateEndpoints(path: string): string[] {
    const isBrowser = typeof window !== 'undefined';
    const protocol = isBrowser ? window.location.protocol : 'http:';
    const hostname = isBrowser ? window.location.hostname : '127.0.0.1';
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    const normalized = cleanPath.replace(/^\/?(api\/)?/, '/');

    const endpoints: string[] = [
        `/api/emails${normalized}`,
        `/api${normalized}`,
        `/api/onboarding${normalized.replace(/^\/onboarding/, '')}`
    ];

    if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        endpoints.push(
            `http://127.0.0.1:3000/api/emails${normalized}`,
            `http://localhost:3000/api/emails${normalized}`
        );
    }

    return endpoints;
}

function generateSecureToken(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(24);
        crypto.getRandomValues(bytes);
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const onboardingService = {
    async createToken(options: { role?: string; note?: string; validityDays?: number } = {}) {
        const origin = getPublicOrigin();
        const validityDays = Number(options.validityDays) || 7;
        const safeRole = (['employee', 'developer', 'superadmin'].includes(options.role || '') ? options.role : 'employee') as 'employee' | 'developer' | 'superadmin';
        const secureToken = generateSecureToken();
        const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

        // 1. Primär: Direkt über PocketBase anlegen
        if (pb.authStore.isValid && pb.authStore.token) {
            try {
                const callerRecord = pb.authStore.record || (pb.authStore.model as any);
                const isUserRecord = callerRecord?.collectionName === 'users';
                const payload: any = {
                    token: secureToken,
                    role: safeRole,
                    company: callerRecord?.company || 'h27x2lsji41iez7',
                    expires_at: expiresAt,
                    used: false,
                    note: (options.note || '').trim()
                };
                if (isUserRecord && callerRecord?.id) {
                    payload.created_by = callerRecord.id;
                }

                const record = await pb.collection('employee_onboarding_tokens').create(payload);
                return {
                    success: true,
                    token: secureToken,
                    expires_at: expiresAt,
                    role: safeRole,
                    id: record.id,
                    url: `${origin}/onboarding/${secureToken}`
                };
            } catch (pbErr: any) {
                console.warn('[Onboarding] Direkte PB-Erstellung fehlgeschlagen, versuche Microservice:', pbErr);
            }
        }

        // 2. Sekundär: Fallback über Microservice
        const token = pb.authStore.token;
        const endpoints = getCandidateEndpoints('/onboarding/tokens');
        let lastError = 'Keine Verbindung zum Dienst.';

        for (const url of endpoints) {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify({ role: safeRole, note: options.note || '', validityDays })
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.success) {
                    return { ...data, url: `${origin}/onboarding/${data.token}` };
                }
                if (res.status === 404) continue;
                lastError = data.error || `HTTP ${res.status}`;
            } catch (e: any) {
                lastError = e.message || lastError;
            }
        }

        throw new Error(lastError || 'Fehler beim Erstellen des Einladungslinks.');
    },

    async validateToken(token: string): Promise<OnboardingTokenInfo> {
        const endpoints = getCandidateEndpoints(`/onboarding/validate/${encodeURIComponent(token)}`);
        for (const url of endpoints) {
            try {
                const res = await fetch(url);
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.valid !== undefined) {
                    return data;
                }
                if (res.status === 410) {
                    return data;
                }
            } catch {}
        }

        return {
            valid: false,
            reason: 'not_found',
            message: 'Der Einladungslink konnte nicht überprüft werden. Bitte Netzwerkverbindung prüfen.'
        };
    },

    async submitRegistration(token: string, formData: OnboardingFormData) {
        const endpoints = getCandidateEndpoints(`/onboarding/submit/${encodeURIComponent(token)}`);
        let lastErr = 'Netzwerkfehler beim Absenden.';

        for (const url of endpoints) {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.success) {
                    return data;
                }
                if (data.error) {
                    throw new Error(data.error);
                }
                if (res.status === 404 || res.status === 502) {
                    continue;
                }
                lastErr = `HTTP ${res.status}`;
            } catch (e: any) {
                if (e.message && e.message !== 'Failed to fetch' && !e.message.includes('NetworkError')) {
                    throw e;
                }
                lastErr = e.message || lastErr;
            }
        }

        const friendlyMsg = lastErr === 'Failed to fetch'
            ? 'Der Server ist vorübergehend nicht erreichbar. Bitte kurz warten und erneut versuchen.'
            : lastErr;
        throw new Error(friendlyMsg || 'Fehler beim Absenden des Mitarbeiterformulars.');
    }
};
