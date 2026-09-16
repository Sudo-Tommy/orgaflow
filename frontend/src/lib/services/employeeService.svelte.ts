import { pb } from '$lib/services/pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { toastStore } from '$lib/services/toastService.svelte';
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

class EmployeeService {
    isSubmitting = $state(false);

    /**
     * Erstellt einen neuen Mitarbeiter-Account in PocketBase
     */
    async createEmployee(payload: CreateEmployeePayload): Promise<UserRecord | null> {
        this.isSubmitting = true;
        try {
            const username = payload.username || 
                `${payload.name_first.toLowerCase().replace(/\s+/g, '')}.${payload.name_last.toLowerCase().replace(/\s+/g, '')}.${Math.floor(100 + Math.random() * 900)}`;
            
            const password = payload.password || `OF-${Math.random().toString(36).slice(-8)}!A1`;

            const data: any = {
                username: username,
                email: payload.email.trim(),
                emailVisibility: true,
                password: password,
                passwordConfirm: payload.passwordConfirm || password,
                name_first: payload.name_first.trim(),
                name_last: payload.name_last.trim(),
                role: payload.role || 'employee',
                employment_type: payload.employment_type || 'Vollzeit',
                status: payload.status || 'Aktiv',
                qualifications: payload.qualifications || '',
                emergency_contacts: payload.emergency_contacts || '',
                tel: payload.tel || '',
                handy: payload.handy || '',
                street: payload.street || '',
                housenr: payload.housenr || '',
                zip: payload.zip || '',
                city: payload.city || '',
                verified: true
            };

            const record = await pb.collection('users').create(data);
            await orgaStore.users.init();
            toastStore.success(`Mitarbeiter "${payload.name_first} ${payload.name_last}" erfolgreich angelegt.`);
            return record as unknown as UserRecord;
        } catch (err: any) {
            console.error('Fehler beim Anlegen des Mitarbeiters:', err);
            const msg = err?.data?.message || err?.message || 'Fehler beim Anlegen des Mitarbeiters.';
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
            toastStore.error(err?.message || 'Aktualisierung fehlgeschlagen.');
            return false;
        } finally {
            this.isSubmitting = false;
        }
    }

    /**
     * Weist einem Mitarbeiter Klienten zu
     */
    async assignClients(employeeId: string, clientIds: string[]): Promise<boolean> {
        this.isSubmitting = true;
        try {
            // 1. Aktualisiere Feld assigned_clients auf dem User-Record
            await pb.collection('users').update(employeeId, {
                assigned_clients: clientIds
            });

            // 2. Aktualisiere ggf. caregiver auf den jeweiligen Klienten
            for (const cId of clientIds) {
                try {
                    await pb.collection('clients').update(cId, {
                        caregiver: employeeId
                    });
                } catch (cErr) {
                    console.warn(`Konnte Klient ${cId} caregiver nicht setzen:`, cErr);
                }
            }

            await Promise.allSettled([
                orgaStore.users.init(),
                orgaStore.clients.init()
            ]);

            toastStore.success(`${clientIds.length} Klient(en) erfolgreich zugewiesen.`);
            return true;
        } catch (err: any) {
            console.error('Fehler bei Klientenzuweisung:', err);
            toastStore.error(err?.message || 'Klientenzuweisung fehlgeschlagen.');
            return false;
        } finally {
            this.isSubmitting = false;
        }
    }

    /**
     * Weist einem Mitarbeiter Kontakte zu (Read-Only für Mitarbeiter)
     */
    async assignContacts(employeeId: string, contactIds: string[]): Promise<boolean> {
        this.isSubmitting = true;
        try {
            // 1. Aktualisiere assigned_contacts auf dem Mitarbeiter
            await pb.collection('users').update(employeeId, {
                assigned_contacts: contactIds
            });

            // 2. Füge den Mitarbeiter zu assigned_employees auf den jeweiligen Kontakten hinzu
            for (const cId of contactIds) {
                try {
                    const contact = orgaStore.contacts.data.find(c => c.id === cId) || await pb.collection('contacts').getOne(cId).catch(() => null);
                    if (!contact) continue;
                    const currentAssignees = Array.isArray(contact.assigned_employees) ? [...contact.assigned_employees] : [];
                    if (!currentAssignees.includes(employeeId)) {
                        currentAssignees.push(employeeId);
                        await pb.collection('contacts').update(cId, {
                            assigned_employees: currentAssignees
                        });
                    }
                } catch (cErr) {
                    console.warn(`Fehler beim Zuweisen von Kontakt ${cId}:`, cErr);
                }
            }

            await Promise.allSettled([
                orgaStore.users.init(),
                orgaStore.contacts.init()
            ]);

            toastStore.success(`${contactIds.length} Kontakt(e) erfolgreich zugewiesen.`);
            return true;
        } catch (err: any) {
            console.error('Fehler bei Kontaktzuweisung:', err);
            toastStore.error(err?.message || 'Kontaktzuweisung fehlgeschlagen.');
            return false;
        } finally {
            this.isSubmitting = false;
        }
    }

    /**
     * Weist einen bestehenden Termin einem Mitarbeiter zu
     */
    async assignAppointment(appointmentId: string, employeeId: string): Promise<boolean> {
        this.isSubmitting = true;
        try {
            await pb.collection('appointments').update(appointmentId, {
                assigned_to: employeeId,
                user: employeeId // Rückwärtskompatibilität
            });
            await orgaStore.appointments.init();
            toastStore.success('Termin erfolgreich zugewiesen.');
            return true;
        } catch (err: any) {
            console.error('Fehler bei Terminzuweisung:', err);
            toastStore.error(err?.message || 'Terminzuweisung fehlgeschlagen.');
            return false;
        } finally {
            this.isSubmitting = false;
        }
    }

    /**
     * Generiert einen kryptografisch sicheren QR-Code-Zugangslink mit konfigurierbarer Gültigkeit
     */
    async generateQuickAccessToken(employeeId: string, validityHours: number = 168): Promise<{ token: string; expiresAt: string; directUrl: string } | null> {
        this.isSubmitting = true;
        try {
            const res = await fetch('/api/auth/employee-token/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : ''
                },
                body: JSON.stringify({
                    userId: employeeId,
                    validityHours: validityHours
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Token konnte nicht erzeugt werden.');
            }

            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const directUrl = `${origin}/mitarbeiter?token=${encodeURIComponent(data.token)}`;

            await orgaStore.users.init();
            toastStore.success('QR-Code-Zugang erfolgreich generiert.');
            return {
                token: data.token,
                expiresAt: data.expiresAt,
                directUrl: directUrl
            };
        } catch (err: any) {
            console.error('Fehler beim Erzeugen des QR-Tokens:', err);
            toastStore.error(err?.message || 'Token-Generierung fehlgeschlagen.');
            return null;
        } finally {
            this.isSubmitting = false;
        }
    }

    /**
     * Widerruft den Schnellzugang eines Mitarbeiters sofort
     */
    async revokeQuickAccessToken(employeeId: string): Promise<boolean> {
        this.isSubmitting = true;
        try {
            const res = await fetch('/api/auth/employee-token/revoke', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : ''
                },
                body: JSON.stringify({ userId: employeeId })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Widerruf fehlgeschlagen.');
            }

            await orgaStore.users.init();
            toastStore.info('QR-Zugang wurde erfolgreich widerrufen.');
            return true;
        } catch (err: any) {
            console.error('Fehler beim Widerrufen des Tokens:', err);
            toastStore.error(err?.message || 'Widerruf fehlgeschlagen.');
            return false;
        } finally {
            this.isSubmitting = false;
        }
    }

    /**
     * Führt den schnellen QR-Token-Login durch und speichert die Session
     */
    async loginWithQrToken(token: string): Promise<{ success: boolean; message?: string }> {
        this.isSubmitting = true;
        try {
            const res = await fetch('/api/auth/employee-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token.trim() })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                return { success: false, message: data.message || 'Ungültiger oder abgelaufener Token.' };
            }

            // Session in PocketBase AuthStore hinterlegen
            pb.authStore.save(data.token, data.record);
            return { success: true };
        } catch (err: any) {
            console.error('QR Login Error:', err);
            return { success: false, message: err?.message || 'Netzwerkfehler beim Anmelden.' };
        } finally {
            this.isSubmitting = false;
        }
    }
}

export const employeeService = new EmployeeService();
