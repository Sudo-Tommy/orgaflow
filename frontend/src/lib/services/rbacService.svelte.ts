import { pb } from '$lib/services/pocketbase';
import { impersonationService } from '$lib/services/impersonationService.svelte';
import { devRoleService } from '$lib/services/devRoleService.svelte';
import { orgaStore } from '$lib/stores/orgaStore.svelte';

export type UserRole = 'developer' | 'superadmin' | 'owner' | 'admin' | 'user' | 'caregiver' | 'employee' | 'guest' | 'client';

/**
 * rbacService.svelte.ts
 *
 * Zentraler, reaktiver Rollen- und Berechtigungs-Service (HRBAC) für OrgaFlow.
 */
class RbacService {
    get currentUser(): any {
        return pb.authStore.record || pb.authStore.model;
    }

    get rawRole(): string {
        if (devRoleService.isSimulatingRole) {
            return devRoleService.currentRole;
        }
        if (pb.authStore.isSuperuser || this.currentUser?.collectionName === '_superusers') {
            return 'superadmin';
        }
        return this.currentUser?.role || 'employee';
    }

    get isDeveloper(): boolean {
        if (devRoleService.isSimulatingRole) return false;
        const email = (this.currentUser?.email || '').toLowerCase().trim();
        return this.rawRole === 'developer' && (
            this.currentUser?.id === 'ewva03ar6xzmsh1' ||
            email === 'tommy.jenzsch@ihre-seniorenassistenz.com' ||
            email === 't.jenzsch@ihre-seniorenassistenz.com'
        );
    }

    get isOwner(): boolean {
        if (devRoleService.isSimulatingRole) {
            return this.rawRole === 'developer' || this.rawRole === 'superadmin' || this.rawRole === 'owner';
        }
        return pb.authStore.isSuperuser ||
               this.rawRole === 'developer' ||
               this.rawRole === 'superadmin' ||
               this.rawRole === 'owner';
    }

    get canDeleteAnyRecord(): boolean {
        return this.isDeveloper || this.isOwner;
    }

    get isFacilityAdmin(): boolean {
        return !this.isOwner && this.rawRole === 'admin';
    }

    get isClient(): boolean {
        if (this.isOwner && !impersonationService.isImpersonating && !devRoleService.isSimulatingRole) return false;
        return this.rawRole === 'guest' || this.rawRole === 'client';
    }

    get isCaregiver(): boolean {
        return !this.isOwner && !this.isFacilityAdmin && !this.isClient;
    }

    get isEmployee(): boolean {
        return this.isCaregiver;
    }

    get roleDisplayLabel(): string {
        if (this.isDeveloper) return 'Entwickler';
        if (this.isOwner) return 'Inhaber';
        if (this.isFacilityAdmin) return 'Betriebsleiter';
        if (this.isClient) return 'Klient';
        return 'Betreuer / Mitarbeiter';
    }

    get userCompanyId(): string | null {
        const c = this.currentUser?.company;
        if (!c) return null;
        if (Array.isArray(c)) return c[0] || null;
        if (typeof c === 'string' && c.startsWith('[')) {
            try { return JSON.parse(c)[0] || null; } catch { return null; }
        }
        return c;
    }

    get isAdmin(): boolean {
        return this.isOwner || this.isFacilityAdmin;
    }

    get canAccessAdmin(): boolean { return this.isOwner || this.isFacilityAdmin; }
    get canAccessGodMode(): boolean { return this.isOwner; }
    get canAccessSystemPrompts(): boolean { return this.isOwner; }
    get canAccessSystemConfig(): boolean { return this.isOwner; }
    get canAccessProposals(): boolean { return this.isOwner; }
    get canAccessFinances(): boolean { return this.isOwner || this.isFacilityAdmin; }
    get canAccessInvoices(): boolean { return this.isOwner || this.isFacilityAdmin; }
    get canAccessBwa(): boolean { return this.isOwner || this.isFacilityAdmin; }
    get canAccessCompanySettings(): boolean { return this.isOwner || this.isFacilityAdmin; }
    get canSwitchCompanyFilter(): boolean { return this.isOwner; }

    get canCreateAppointment(): boolean { return !this.isClient; }
    get canDocumentAppointment(): boolean { return !this.isClient; }
    get canCreateClient(): boolean { return !this.isClient; }

    private hasAppointmentWithClient(clientId: string, myUserId: string): boolean {
        if (!clientId || !myUserId) return false;
        const appts = orgaStore.appointments?.data || [];
        return appts.some((a: any) => {
            const isMyApp = a.user === myUserId ||
                (Array.isArray(a.user) && a.user.includes(myUserId)) ||
                a.assigned_to === myUserId ||
                (Array.isArray(a.assigned_to) && a.assigned_to.includes(myUserId));
            if (!isMyApp) return false;
            const rawClient = a.client;
            if (Array.isArray(rawClient)) return rawClient.some((c: any) => (typeof c === 'string' ? c : c?.id) === clientId);
            if (typeof rawClient === 'string') return rawClient === clientId;
            return rawClient?.id === clientId;
        });
    }

    private isClientInUserAssignedList(clientId: string, myUserId: string): boolean {
        if (!clientId || !myUserId) return false;
        const authAssigned = this.currentUser?.assigned_clients;
        if (Array.isArray(authAssigned) && authAssigned.includes(clientId)) return true;

        const liveUser = (orgaStore.users?.data || []).find((u: any) => u.id === myUserId);
        if (Array.isArray(liveUser?.assigned_clients) && liveUser.assigned_clients.includes(clientId)) return true;

        const empClients = orgaStore.employee_clients?.data || [];
        if (empClients.some((ec: any) => ec.employee === myUserId && ec.client === clientId)) return true;

        return false;
    }

    isRecordInScope = (record: any, type: 'client' | 'appointment' | 'invoice' | 'company' | 'contact' | 'user' = 'client'): boolean => {
        if (!record) return false;
        if (this.isOwner) return true;

        const myCompanyId = this.userCompanyId;
        const myUserId = this.currentUser?.id;

        if (type === 'contact') return true;

        if (this.isFacilityAdmin) {
            if (!myCompanyId) return true;
            if (type === 'company') return record.id === myCompanyId;

            const recComp = record.company || record.expand?.company?.id;
            if (recComp) {
                if (Array.isArray(recComp)) return recComp.includes(myCompanyId);
                if (typeof recComp === 'string' && recComp.startsWith('[')) {
                    try { return JSON.parse(recComp).includes(myCompanyId); } catch {}
                }
                return recComp === myCompanyId;
            }

            if (type === 'appointment') {
                if (record.user === myUserId || (Array.isArray(record.user) && record.user.includes(myUserId))) return true;
                const expClients = Array.isArray(record.expand?.client) ? record.expand.client : (record.expand?.client ? [record.expand.client] : []);
                if (expClients.some((c: any) => c.company === myCompanyId || (Array.isArray(c.company) && c.company.includes(myCompanyId)))) return true;
            }
            if (!('company' in record)) return true;
            return false;
        }

        if (this.isCaregiver) {
            if (!myUserId) return false;
            if (type === 'client') return true;

            if (type === 'appointment') {
                const userMatch = record.user === myUserId || (Array.isArray(record.user) && record.user.includes(myUserId));
                const assignedMatch = record.assigned_to === myUserId || (Array.isArray(record.assigned_to) && record.assigned_to.includes(myUserId));
                if (userMatch || assignedMatch || record.billing_user === myUserId) return true;

                const rawClientIds = Array.isArray(record.client) ? record.client : (record.client ? [record.client] : []);
                if (rawClientIds.some((cid: any) => this.isClientInUserAssignedList(typeof cid === 'string' ? cid : cid?.id, myUserId))) {
                    return true;
                }

                const expClients = Array.isArray(record.expand?.client) ? record.expand.client : (record.expand?.client ? [record.expand.client] : []);
                return expClients.some((c: any) => this.isDirectlyAssignedClient(c));
            }

            if (!('company' in record)) return true;
            return false;
        }

        return false;
    }

    isDirectlyAssignedClient = (client: any): boolean => {
        if (!client) return false;
        const myUserId = this.currentUser?.id;
        if (!myUserId) return false;

        const clientId = typeof client === 'string' ? client : client.id;
        if (clientId && this.isClientInUserAssignedList(clientId, myUserId)) {
            return true;
        }

        const empField = client.assigned_employee;
        const expEmp = client.expand?.assigned_employee;
        const isAssignedEmp =
            empField === myUserId ||
            (Array.isArray(empField) && empField.includes(myUserId)) ||
            expEmp?.id === myUserId ||
            (Array.isArray(expEmp) && expEmp.some((e: any) => e?.id === myUserId));

        const isCaregiverField =
            client.caregiver === myUserId ||
            (Array.isArray(client.caregiver) && client.caregiver.includes(myUserId)) ||
            client.billing_user === myUserId ||
            (Array.isArray(client.billing_user) && client.billing_user.includes(myUserId));

        if (isAssignedEmp || isCaregiverField) return true;
        return clientId ? this.hasAppointmentWithClient(clientId, myUserId) : false;
    }

    canPlanAppointmentForClient = (client: any): boolean => {
        if (this.isOwner || this.isFacilityAdmin) return true;
        return this.isDirectlyAssignedClient(client);
    }

    canEditClient = (client: any): boolean => {
        if (this.isOwner || this.isFacilityAdmin) return true;
        return this.isDirectlyAssignedClient(client);
    }

    canEditContact = (contact: any): boolean => {
        if (!contact) return false;
        if (this.isAdmin) return true;
        const myUserId = this.currentUser?.id;
        if (!myUserId || !contact.created_by) return false;
        return contact.created_by === myUserId || (Array.isArray(contact.created_by) && contact.created_by.includes(myUserId));
    }
}

export const rbacService = new RbacService();
