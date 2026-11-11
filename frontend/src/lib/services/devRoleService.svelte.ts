// src/lib/services/devRoleService.svelte.ts
import { pb } from '$lib/services/pocketbase';
import { toastStore } from '$lib/services/toastService.svelte';
import { clearOfflineCache } from '$lib/services/offlineDb';

export interface RoleOption {
    id: string;
    label: string;
    badge: string;
    icon: string;
    desc: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
    {
        id: 'developer',
        label: 'Entwickler',
        badge: 'Dev-Vollzugriff',
        icon: '🛠️',
        desc: 'Vollzugriff, Dev-Tools & System-Override'
    },
    {
        id: 'superadmin',
        label: 'Inhaber / Geschäftsführung',
        badge: 'Inhaber',
        icon: '👑',
        desc: 'Inhaber mit vollen unternehmensweiten Rechten'
    },
    {
        id: 'admin',
        label: 'Betriebsleiter',
        badge: 'Admin',
        icon: '🏢',
        desc: 'Leitung des eigenen Betriebs / Standorts'
    },
    {
        id: 'employee',
        label: 'Mitarbeiter / Betreuer',
        badge: 'Betreuer',
        icon: '🩺',
        desc: 'Betreuerperspektive (eigene Termine & Klienten)'
    },
    {
        id: 'guest',
        label: 'Klient (Portal)',
        badge: 'Portal',
        icon: '👤',
        desc: 'Gast- & Klientenansicht im Portal'
    }
];

const SIM_ROLE_KEY = 'orgaflow_dev_sim_role';
const SIM_UID_KEY = 'orgaflow_dev_sim_uid';
const DEV_EMAILS = ['tommy.jenzsch@ihre-seniorenassistenz.com', 't.jenzsch@ihre-seniorenassistenz.com'];

class DevRoleService {
    isSwitching = $state(false);
    simulatedRoleState = $state<string | null>(null);

    constructor() {
        if (typeof window !== 'undefined') {
            this.cleanupLegacyLocalStorage();
            this.syncFromSession();
            pb.authStore.onChange(() => {
                this.syncFromSession();
            });
        }
    }

    private cleanupLegacyLocalStorage() {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('orgaflow_dev_original_user');
        localStorage.removeItem('orgaflow_dev_original_role');
    }

    syncFromSession() {
        if (typeof window === 'undefined') return;
        this.cleanupLegacyLocalStorage();
        const user = this.currentUser;
        const storedUid = sessionStorage.getItem(SIM_UID_KEY);
        const storedRole = sessionStorage.getItem(SIM_ROLE_KEY);

        if (user && this.isTrueDeveloperRecord(user) && storedUid === user.id && storedRole && storedRole !== 'developer') {
            this.simulatedRoleState = storedRole;
        } else {
            this.simulatedRoleState = null;
            sessionStorage.removeItem(SIM_ROLE_KEY);
            sessionStorage.removeItem(SIM_UID_KEY);
        }
    }

    clearSimulation() {
        this.simulatedRoleState = null;
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(SIM_ROLE_KEY);
            sessionStorage.removeItem(SIM_UID_KEY);
            this.cleanupLegacyLocalStorage();
        }
    }

    get currentUser(): any {
        return pb.authStore.record || pb.authStore.model;
    }

    // A2: Ausschließlich das echte Entwickler-Konto (Tommy Jenzsch) ist für den Rollen-Test berechtigt
    private isTrueDeveloperRecord(user: any): boolean {
        if (!user) return false;
        const email = String(user.email || '').toLowerCase().trim();
        return user.role === 'developer' && (user.id === 'ewva03ar6xzmsh1' || DEV_EMAILS.includes(email));
    }

    get isDevAccount(): boolean {
        if (typeof window === 'undefined') return false;
        return this.isTrueDeveloperRecord(this.currentUser);
    }

    // A1 & A4: Virtuelle Rollen-Simulation (nur aktiv, wenn Tommy explizit im aktuellen Tab eine Rolle testet)
    get isSimulatingRole(): boolean {
        return this.isDevAccount && Boolean(this.simulatedRoleState) && this.simulatedRoleState !== 'developer';
    }

    get currentRole(): string {
        if (this.isSimulatingRole && this.simulatedRoleState) {
            return this.simulatedRoleState;
        }
        return this.currentUser?.role || 'employee';
    }

    get currentRoleLabel(): string {
        const roleId = this.currentRole === 'user' || this.currentRole === 'caregiver' ? 'employee' : this.currentRole;
        const found = ROLE_OPTIONS.find(r => r.id === roleId);
        return found ? found.label : this.currentRole;
    }

    async switchRole(targetRole: string): Promise<boolean> {
        if (this.isSwitching) return false;
        const user = this.currentUser;
        if (!user || !this.isDevAccount) {
            toastStore.error('Nur das Entwickler-Konto kann Rollen simulieren.');
            return false;
        }

        const normalizedTarget = targetRole === 'user' || targetRole === 'caregiver' ? 'employee' : targetRole;
        if (this.currentRole === normalizedTarget) {
            toastStore.info(`Rolle „${this.currentRoleLabel}“ ist bereits aktiv.`);
            return true;
        }

        this.isSwitching = true;
        try {
            if (normalizedTarget === 'developer') {
                this.clearSimulation();
            } else {
                this.simulatedRoleState = normalizedTarget;
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem(SIM_UID_KEY, user.id);
                    sessionStorage.setItem(SIM_ROLE_KEY, normalizedTarget);
                }
            }

            await clearOfflineCache();
            const targetLabel = ROLE_OPTIONS.find(r => r.id === normalizedTarget)?.label || normalizedTarget;
            toastStore.success(
                normalizedTarget === 'developer'
                    ? 'Rollen-Test beendet: Entwickler-Ansicht aktiv.'
                    : `Rollen-Simulation aktiv: ${targetLabel}`
            );

            setTimeout(() => {
                if (typeof window !== 'undefined') {
                    window.location.href = (normalizedTarget === 'guest' || normalizedTarget === 'client')
                        ? '/portal/overview/'
                        : '/dashboard/';
                }
            }, 200);
            return true;
        } finally {
            this.isSwitching = false;
        }
    }

    async resetToDeveloper(): Promise<boolean> {
        return this.switchRole('developer');
    }
}

export const devRoleService = new DevRoleService();
