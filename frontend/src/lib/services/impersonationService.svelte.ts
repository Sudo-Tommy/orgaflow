import { pb } from '$lib/services/pocketbase';
import { toastStore } from '$lib/services/toastService.svelte';
import { clearOfflineCache } from '$lib/services/offlineDb';
import { devRoleService } from '$lib/services/devRoleService.svelte';

export interface ImpersonatedUserInfo {
    id: string;
    name: string;
    role: string;
    type: 'user' | 'client';
}

interface ImpersonationBackup {
    owner: {
        token: string;
        record: any;
    };
    target: ImpersonatedUserInfo;
}

const SESSION_KEY = 'orgaflow_impersonation_session';
const LEGACY_LOCAL_KEY = 'orgaflow_impersonation_backup';

class ImpersonationService {
    isImpersonating = $state(false);
    impersonatedUser = $state<ImpersonatedUserInfo | null>(null);
    originalOwner = $state<{ token: string; record: any } | null>(null);
    isLoading = $state(false);

    constructor() {
        if (typeof window !== 'undefined') {
            pb.authStore.onChange(() => {
                this.validateActiveSession();
            });
        }
    }

    // A3 & A13: Löscht sämtliche Impersonation- und Rollen-Test-Daten bei regulärem Login oder Logout
    clearSessionBackup() {
        this.isImpersonating = false;
        this.impersonatedUser = null;
        this.originalOwner = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem(LEGACY_LOCAL_KEY);
            sessionStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem('impersonation_notify_login');
            sessionStorage.removeItem('impersonation_notify_restore');
        }
        devRoleService.clearSimulation();
    }

    // A13: Prüft, ob das gespeicherte Session-Backup überhaupt zum aktuell angemeldeten Account passt
    validateActiveSession() {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(LEGACY_LOCAL_KEY);

        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) {
            this.isImpersonating = false;
            this.impersonatedUser = null;
            this.originalOwner = null;
            return;
        }

        try {
            const parsed: ImpersonationBackup = JSON.parse(raw);
            const currentModel = pb.authStore.record || pb.authStore.model;
            const ownerEmail = String(parsed?.owner?.record?.email || '').toLowerCase();
            const isDevOwner = parsed?.owner?.record?.role === 'developer' &&
                (parsed?.owner?.record?.id === 'ewva03ar6xzmsh1' || ownerEmail === 'tommy.jenzsch@ihre-seniorenassistenz.com' || ownerEmail === 't.jenzsch@ihre-seniorenassistenz.com');

            if (!isDevOwner || !parsed?.owner?.token || !parsed?.target?.id) {
                this.clearSessionBackup();
                return;
            }

            if (parsed.target.type === 'user') {
                if (!pb.authStore.isValid || !currentModel || currentModel.id !== parsed.target.id) {
                    this.clearSessionBackup();
                    return;
                }
            }

            this.isImpersonating = true;
            this.impersonatedUser = parsed.target;
            this.originalOwner = parsed.owner;
        } catch {
            this.clearSessionBackup();
        }
    }

    init() {
        if (typeof window === 'undefined') return;
        this.validateActiveSession();

        const loginMsg = sessionStorage.getItem('impersonation_notify_login');
        if (loginMsg && this.isImpersonating) {
            sessionStorage.removeItem('impersonation_notify_login');
            toastStore.success(`Imitierungsmodus aktiv: Angemeldet als ${loginMsg}`);
        }

        const restoreMsg = sessionStorage.getItem('impersonation_notify_restore');
        if (restoreMsg) {
            sessionStorage.removeItem('impersonation_notify_restore');
            toastStore.success('Zurückgekehrt zu Tommy Jenzsch (Entwickler).');
        }
    }

    async impersonateUser(target: ImpersonatedUserInfo): Promise<boolean> {
        if (typeof window === 'undefined') return false;
        // A12: Imitierungsmodus ausschließlich für Entwickler (Tommy) erlauben
        if (!devRoleService.isDevAccount && !this.isImpersonating) {
            toastStore.error('Der Imitierungsmodus ist ausschließlich für das Entwickler-Konto freigegeben.');
            return false;
        }

        this.isLoading = true;
        try {
            const ownerToken = this.originalOwner?.token || pb.authStore.token;
            const ownerRecord = this.originalOwner?.record || pb.authStore.record || pb.authStore.model;

            if (!this.isImpersonating) {
                this.originalOwner = { token: ownerToken, record: ownerRecord };
            }

            const hostname = window.location.hostname;
            const isLive = hostname.includes('ihre-seniorenassistenz.com');
            const candidateEndpoints = isLive
                ? ['/api/auth/impersonate', '/api/emails/auth/impersonate']
                : ['/api/auth/impersonate', `http://${hostname}:3000/api/auth/impersonate`, '/api/emails/auth/impersonate'];

            let lastErr = 'Fehler beim Benutzerwechsel.';
            let data: any = null;

            for (const endpoint of candidateEndpoints) {
                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
                        body: JSON.stringify({ targetId: target.id, targetType: target.type })
                    });
                    const resJson = await response.json().catch(() => ({}));
                    if (response.ok && resJson.success) {
                        data = resJson;
                        break;
                    }
                    lastErr = resJson.error || `HTTP ${response.status}: Fehler beim Benutzerwechsel.`;
                } catch (e: any) {
                    lastErr = e.message || lastErr;
                }
            }

            if (!data) throw new Error(lastErr);

            this.impersonatedUser = {
                id: target.id,
                name: data.targetName || target.name,
                role: data.targetRole || target.role,
                type: target.type
            };

            sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                owner: this.originalOwner,
                target: this.impersonatedUser
            }));
            this.isImpersonating = true;

            if (data.portalToken) localStorage.setItem('portal_token', data.portalToken);
            if (data.token && data.record) pb.authStore.save(data.token, data.record);

            await clearOfflineCache();
            sessionStorage.setItem('impersonation_notify_login', this.impersonatedUser.name);
            window.location.href = target.type === 'client' ? '/portal/overview/' : '/dashboard/';
            return true;
        } catch (err: any) {
            console.error('[ImpersonationService] Fehler:', err);
            toastStore.error(err.message || 'Benutzerwechsel fehlgeschlagen.');
            return false;
        } finally {
            this.isLoading = false;
        }
    }

    async stopImpersonation(): Promise<boolean> {
        if (typeof window === 'undefined') return false;
        this.isLoading = true;
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            const parsed: ImpersonationBackup | null = raw ? JSON.parse(raw) : null;

            this.clearSessionBackup();
            localStorage.removeItem('portal_token');
            localStorage.removeItem('portal_admin_mode');
            sessionStorage.removeItem('portal_token');

            if (parsed?.owner?.token && parsed?.owner?.record) {
                pb.authStore.save(parsed.owner.token, parsed.owner.record);
            }

            await clearOfflineCache();
            sessionStorage.setItem('impersonation_notify_restore', 'true');
            window.location.href = '/dashboard/';
            return true;
        } catch (err: any) {
            console.error('[ImpersonationService] Fehler beim Beenden:', err);
            toastStore.error('Fehler bei der Rückkehr zum Entwickler-Konto.');
            return false;
        } finally {
            this.isLoading = false;
        }
    }
}

export const impersonationService = new ImpersonationService();
