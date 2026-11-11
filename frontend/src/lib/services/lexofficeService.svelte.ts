import { pb } from '$lib/services/pocketbase';
import { dev } from '$app/environment';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { rbacService } from '$lib/services/rbacService.svelte';
import { toastStore } from '$lib/services/toastService.svelte';
import type { LexOfficeFinanceSummary, LexOfficeCompanyConfig } from '$lib/types/lexoffice';

export type { LexOfficeFinanceSummary, LexOfficeCompanyConfig };

const BASE_URL = dev ? 'http://127.0.0.1:3000/api/emails/lexoffice' : '/api/emails/lexoffice';

class LexOfficeService {
    configs = $state<LexOfficeCompanyConfig[]>([]);
    financeSummary = $state<LexOfficeFinanceSummary | null>(null);
    isLoadingStatus = $state(false);
    isSyncing = $state(false);
    isConnecting = $state(false);
    isModalOpen = $state(false);
    modalCompanyId = $state('');
    cooldownSeconds = $state(0);
    initialized = false;
    private cooldownInterval: any = null;
    private heartbeatInterval: any = null;

    get canManageLexOffice(): boolean {
        return rbacService.isOwner || rbacService.isAdmin || rbacService.isDeveloper;
    }
    get hasAnyConnected(): boolean {
        return this.configs.some((c) => c.connected);
    }
    get hasAnyError(): boolean {
        return this.configs.length > 0 && !this.hasAnyConnected && this.configs.some((c) => c.needsReconnect);
    }

    getConfigForCompany(companyId?: string | null): LexOfficeCompanyConfig | null {
        if (!companyId || companyId === 'all') {
            return this.configs.find((c) => c.needsReconnect) || this.configs.find((c) => c.connected) || this.configs[0] || null;
        }
        return this.configs.find((c) => c.companyId === companyId) || null;
    }

    private getAuthHeaders(): HeadersInit {
        return {
            'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : '',
            'Content-Type': 'application/json'
        };
    }

    private startCooldown(seconds = 30) {
        if (this.cooldownInterval) clearInterval(this.cooldownInterval);
        this.cooldownSeconds = seconds;
        this.cooldownInterval = setInterval(() => {
            if (this.cooldownSeconds > 1) {
                this.cooldownSeconds--;
            } else {
                this.cooldownSeconds = 0;
                clearInterval(this.cooldownInterval);
                this.cooldownInterval = null;
            }
        }, 1000);
    }

    async init() {
        if (!pb.authStore.isValid || !this.canManageLexOffice) return;
        if (!this.initialized || this.configs.length === 0) {
            await this.loadStatus();
        }
        if (typeof window !== 'undefined' && !this.heartbeatInterval) {
            this.heartbeatInterval = setInterval(() => {
                if (pb.authStore.isValid && this.canManageLexOffice && !this.isSyncing) {
                    this.loadStatus().catch(() => {});
                }
            }, 5 * 60 * 1000);
        }
    }

    async loadStatus(companyId?: string): Promise<void> {
        if (!pb.authStore.isValid || !this.canManageLexOffice) return;
        this.isLoadingStatus = true;
        try {
            const q = companyId && companyId !== 'all' ? `?companyId=${encodeURIComponent(companyId)}` : '';
            const res = await fetch(`${BASE_URL}/status${q}`, { method: 'GET', headers: this.getAuthHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            if (Array.isArray(data?.configs)) {
                this.configs = data.configs;
                if (data.configs.length > 0) this.initialized = true;
            }
            if (data?.financeSummary) this.financeSummary = data.financeSummary;
        } catch {} finally {
            this.isLoadingStatus = false;
        }
    }

    async autoRefreshOnPageVisit(companyId = 'all'): Promise<void> {
        if (!pb.authStore.isValid || !this.canManageLexOffice) return;
        await this.loadStatus(companyId);
    }

    openConnectModal(preferredCompanyId = '') {
        if (!orgaStore.company?.data?.length) {
            orgaStore.company?.refresh?.().catch(() => {});
        }
        this.modalCompanyId = preferredCompanyId && preferredCompanyId !== 'all' ? preferredCompanyId : (rbacService.userCompanyId || '');
        this.isModalOpen = true;
        this.loadStatus();
    }

    closeConnectModal() {
        this.isModalOpen = false;
    }

    async connectCompany(companyId: string, apiKey: string, syncAfterConnect = true, includeAllYears = false): Promise<boolean> {
        if (!apiKey || apiKey.trim().length < 10) {
            toastStore.warning('Bitte fügen Sie Ihren gültigen LexOffice-Schlüssel ein.');
            return false;
        }
        this.isConnecting = true;
        try {
            const res = await fetch(`${BASE_URL}/connect`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ companyId, apiKey: apiKey.trim() })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toastStore.error(data.error || 'Verbindung fehlgeschlagen.');
                return false;
            }
            const actualCompanyId = data?.config?.companyId || companyId;
            if (actualCompanyId) this.modalCompanyId = actualCompanyId;
            toastStore.success(data.message || 'LexOffice erfolgreich verbunden!');
            await this.loadStatus(actualCompanyId);
            if (syncAfterConnect && actualCompanyId) {
                this.syncNow(actualCompanyId, includeAllYears).catch(() => {});
            }
            return true;
        } catch {
            toastStore.error('Server nicht erreichbar.');
            return false;
        } finally {
            this.isConnecting = false;
        }
    }

    async disconnectCompany(companyId: string): Promise<boolean> {
        if (!companyId) return false;
        this.isConnecting = true;
        try {
            const res = await fetch(`${BASE_URL}/disconnect`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ companyId })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toastStore.error(data.error || 'Verbindung konnte nicht getrennt werden.');
                return false;
            }
            toastStore.info(data.message || 'LexOffice-Verbindung wurde getrennt.');
            await this.loadStatus();
            return true;
        } catch {
            toastStore.error('Trennen der Verbindung fehlgeschlagen.');
            return false;
        } finally {
            this.isConnecting = false;
        }
    }

    async syncNow(companyId = 'all', includeAllYears = false, silent = false): Promise<boolean> {
        if (!this.canManageLexOffice) {
            if (!silent) toastStore.warning('Nur Inhaber, Admins und Entwickler dürfen synchronisieren.');
            return false;
        }
        if (this.cooldownSeconds > 0 && !silent) {
            toastStore.warning(`Bitte warten Sie noch ${this.cooldownSeconds} Sekunden bis zum nächsten Abgleich.`);
            return false;
        }

        this.isSyncing = true;
        try {
            const res = await fetch(`${BASE_URL}/sync`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ companyId, includeAllYears })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (!silent && (data?.needsConnect || data?.needsReconnect)) {
                    toastStore.warning(data.error || 'Bitte verbinden Sie Ihren LexOffice-Zugang neu.');
                    await this.loadStatus(companyId);
                    this.openConnectModal(companyId !== 'all' ? companyId : '');
                    return false;
                }
                if (!silent) toastStore.error(data.error || 'Synchronisation mit LexOffice fehlgeschlagen.');
                return false;
            }

            if (data?.financeSummary) this.financeSummary = data.financeSummary;
            if (!silent) {
                const paidCount = data?.stats?.paidCount || 0;
                if (paidCount > 0) {
                    toastStore.success(`LexOffice-Abgleich abgeschlossen: ${paidCount} ${paidCount === 1 ? 'Rechnung' : 'Rechnungen'} als bezahlt markiert!`);
                } else {
                    toastStore.success(data.message || 'LexOffice-Abgleich erfolgreich abgeschlossen!');
                }
                this.startCooldown(30);
            }

            await Promise.all([
                this.loadStatus(companyId),
                orgaStore.invoices?.refresh?.().catch(() => {}),
                orgaStore.accounting?.refresh?.().catch(() => {}),
                orgaStore.clients?.refresh?.().catch(() => {})
            ]);
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('lexoffice-synced'));
            return true;
        } catch {
            if (!silent) toastStore.error('Netzwerkfehler beim LexOffice-Abgleich.');
            return false;
        } finally {
            this.isSyncing = false;
        }
    }

    async notifyInvoiceAction(action: 'sync' | 'storno' | 'delete', payload: { invoiceId?: string; invoiceData?: any; replacementInvoiceId?: string }): Promise<void> {
        if (!pb.authStore.isValid) return;
        try {
            await fetch(`${BASE_URL}/invoice-action`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ action, ...payload })
            });
            await this.loadStatus();
        } catch {}
    }
}

export const lexofficeService = new LexOfficeService();
