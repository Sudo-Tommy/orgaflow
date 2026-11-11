import { pb } from '$lib/services/pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { toastStore } from '$lib/services/toastService.svelte';
import { rbacService } from '$lib/services/rbacService.svelte';
import { employeeAssignmentService } from '$lib/services/employeeAssignmentService';
import { employeeTokenService } from '$lib/services/employeeTokenService';
import type { UserRecord, EmploymentType, EmployeeStatus } from '$lib/types/orgaTypes';

export interface CreateEmployeePayload {
    name_first: string;
    name_last: string;
    email: string;
    username?: string;
    password?: string;
    passwordConfirm?: string;
    role?: string;
    employment_type?: EmploymentType;
    status?: EmployeeStatus;
    qualifications?: string;
    emergency_contacts?: string;
    tel?: string;
    handy?: string;
    street?: string;
    housenr?: string;
    zip?: string;
    city?: string;
}

function sanitizeUsername(input: string): string {
    return input
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9\.\-_]/g, '')
        .replace(/^\.+|\.+$/g, '');
}

class EmployeeService {
    isSubmitting = $state(false);

    /**
     * Erstellt einen neuen Mitarbeiter-Account in PocketBase
     */
    async createEmployee(payload: CreateEmployeePayload): Promise<UserRecord | null> {
        this.isSubmitting = true;
        try {
            if (!payload.name_first?.trim() || !payload.name_last?.trim() || !payload.email?.trim()) {
                toastStore.warning('Bitte füllen Sie Vorname, Nachname und eine gültige E-Mail-Adresse aus.');
                return null;
            }

            if (!pb.authStore.isValid || !pb.authStore.token) {
                toastStore.error('Ihre Sitzung ist abgelaufen oder Sie sind nicht eingeloggt. Bitte melden Sie sich an.');
                return null;
            }

            if (!rbacService.canAccessAdmin) {
                toastStore.error('Keine Berechtigung: Nur Administratoren oder Inhaber können Mitarbeiter anlegen.');
                return null;
            }

            try {
                const authCol = pb.authStore.record?.collectionName || (pb.authStore.model as any)?.collectionName || 'users';
                await pb.collection(authCol).authRefresh({ expand: 'company' });
            } catch (refreshErr: any) {
                if (refreshErr?.status === 401 || refreshErr?.status === 403) {
                    pb.authStore.clear();
                    toastStore.error('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut als Administrator an.');
                    return null;
                }
            }

            let username = sanitizeUsername(payload.username || '');
            if (!username || username.length < 3) {
                const safeFirst = sanitizeUsername(payload.name_first) || 'user';
                const safeLast = sanitizeUsername(payload.name_last) || 'employee';
                username = `${safeFirst}.${safeLast}.${Math.floor(100 + Math.random() * 900)}`;
            }
            
            const password = payload.password?.trim() || `OF-${Math.random().toString(36).slice(-8)}!A1`;
            let requestedRole = payload.role || 'employee';
            if (!rbacService.isOwner && (requestedRole === 'superadmin' || requestedRole === 'owner')) {
                requestedRole = 'employee';
            }

            const data: Record<string, any> = {
                username,
                email: payload.email.trim(),
                emailVisibility: true,
                password,
                passwordConfirm: payload.passwordConfirm?.trim() || password,
                name_first: payload.name_first.trim(),
                name_last: payload.name_last.trim(),
                role: requestedRole,
                employment_type: payload.employment_type || 'Vollzeit',
                status: payload.status || 'Aktiv',
                qualifications: payload.qualifications || '',
                emergency_contacts: payload.emergency_contacts || '',
                tel: payload.tel || '',
                handy: payload.handy || '',
                street: payload.street || '',
                housenr: payload.housenr || '',
                zip: payload.zip || '',
                city: payload.city || ''
            };

            const currentAuth = (pb.authStore.record || pb.authStore.model) as any;
            if (currentAuth?.company) {
                data.company = Array.isArray(currentAuth.company) ? currentAuth.company : [currentAuth.company];
            }
            if (currentAuth?.facility) {
                data.facility = Array.isArray(currentAuth.facility) ? currentAuth.facility[0] : currentAuth.facility;
            }

            const record = await pb.collection('users').create(data);
            await orgaStore.users.init();
            
            const passMsg = !payload.password ? ` (Start-Passwort: ${password})` : '';
            toastStore.success(`Mitarbeiter "${payload.name_first} ${payload.name_last}" erfolgreich angelegt.${passMsg}`);
            return record as unknown as UserRecord;
        } catch (err: any) {
            console.error('Fehler beim Anlegen des Mitarbeiters:', err);
            let msg = err?.data?.message || err?.message || 'Fehler beim Anlegen des Mitarbeiters.';
            if (err?.status === 400 && err?.data?.data) {
                const fieldErrors = Object.entries(err.data.data)
                    .map(([field, details]: [string, any]) => {
                        const code = details?.code || '';
                        if (field === 'username' && (code === 'validation_not_unique' || details?.message?.includes('unique'))) {
                            return 'Benutzername ist bereits vergeben';
                        }
                        if (field === 'email' && (code === 'validation_not_unique' || details?.message?.includes('unique'))) {
                            return 'E-Mail-Adresse existiert bereits';
                        }
                        return `${field}: ${details?.message || code}`;
                    })
                    .join(', ');
                msg = `Validierungsfehler: ${fieldErrors}`;
            }
            toastStore.error(msg);
            return null;
        } finally {
            this.isSubmitting = false;
        }
    }

    /**
     * Aktualisiert Mitarbeiter-Stammdaten
     */
    async updateEmployee(id: string, data: Partial<UserRecord>): Promise<boolean> {
        this.isSubmitting = true;
        try {
            await pb.collection('users').update(id, data);
            await orgaStore.users.init();
            toastStore.success('Mitarbeiterprofil erfolgreich aktualisiert.');
            return true;
        } catch (err: any) {
            console.error('Fehler beim Aktualisieren des Mitarbeiters:', err);
            toastStore.error(err?.data?.message || err?.message || 'Aktualisierung fehlgeschlagen.');
            return false;
        } finally {
            this.isSubmitting = false;
        }
    }

    /**
     * Löscht einen Mitarbeiter-Account
     */
    async deleteEmployee(id: string): Promise<boolean> {
        this.isSubmitting = true;
        try {
            const currentId = pb.authStore.record?.id || (pb.authStore.model as any)?.id;
            if (currentId === id) {
                toastStore.error('Sie können Ihren eigenen angemeldeten Account nicht selbst löschen.');
                return false;
            }

            if (!pb.authStore.isValid || !pb.authStore.token || !rbacService.canAccessAdmin) {
                toastStore.error('Keine Berechtigung zum Löschen von Mitarbeitern.');
                return false;
            }

            await pb.collection('users').delete(id);
            await orgaStore.users.init();
            toastStore.success('Mitarbeiter wurde erfolgreich gelöscht.');
            return true;
        } catch (err: any) {
            console.error('Fehler beim Löschen des Mitarbeiters:', err);
            toastStore.error(err?.data?.message || err?.message || 'Mitarbeiter konnte nicht gelöscht werden.');
            return false;
        } finally {
            this.isSubmitting = false;
        }
    }

    /**
     * Schließt einen Einsatz ab oder aktualisiert Status, Bericht, Checkliste und Notizen
     */
    async completeAppointment(appointmentId: string, payload: {
        status?: string;
        report?: string;
        notes?: string;
        checklist?: any[];
    }): Promise<boolean> {
        this.isSubmitting = true;
        try {
            const data: Record<string, any> = {};
            if (payload.status !== undefined) data.status = payload.status;
            if (payload.report !== undefined) data.report = payload.report;
            if (payload.notes !== undefined) data.notes = payload.notes;
            if (payload.checklist !== undefined) data.checklist = payload.checklist;

            await pb.collection('appointments').update(appointmentId, data);
            await orgaStore.appointments.init();
            toastStore.success('Einsatz erfolgreich dokumentiert.');
            return true;
        } catch (err: any) {
            console.error('Fehler beim Dokumentieren des Termins:', err);
            toastStore.error(err?.message || 'Einsatz konnte nicht gespeichert werden.');
            return false;
        } finally {
            this.isSubmitting = false;
        }
    }

    // Delegations for backward compatibility
    assignClients = employeeAssignmentService.assignClients.bind(employeeAssignmentService);
    assignEmployeeToClient = employeeAssignmentService.assignEmployeeToClient.bind(employeeAssignmentService);
    getAssignedEmployeeForClient = employeeAssignmentService.getAssignedEmployeeForClient.bind(employeeAssignmentService);
    assignContacts = employeeAssignmentService.assignContacts.bind(employeeAssignmentService);
    assignAppointment = employeeAssignmentService.assignAppointment.bind(employeeAssignmentService);

    generateQuickAccessToken = employeeTokenService.generateQuickAccessToken.bind(employeeTokenService);
    revokeQuickAccessToken = employeeTokenService.revokeQuickAccessToken.bind(employeeTokenService);
    loginWithQrToken = employeeTokenService.loginWithQrToken.bind(employeeTokenService);
}

export const employeeService = new EmployeeService();
