import { pb } from '$lib/services/pocketbase';

export type UserRole = 'superadmin' | 'owner' | 'admin' | 'user' | 'caregiver' | 'guest' | 'client';

/**
 * rbacService.svelte.ts
 *
 * Zentraler, reaktiver Rollen- und Berechtigungs-Service (HRBAC) für OrgaFlow.
 * Gewährleistet strikte Trennung zwischen:
 * - Inhaber / Global Owner (Full Control über alle Betriebe)
 * - Betriebsleiter / Facility Admin (ausschließlich eigener Betrieb)
 * - Betreuer / Pflegekraft (ausschließlich eigene Termine & zugewiesene Klienten)
 * - Klient / Gast (ausschließlich Klienten-Portal)
 */
class RbacService {
    // Gibt die rohe Rolle des eingeloggten Benutzers zurück
    get rawRole(): string {
        if (pb.authStore.isSuperuser) return 'superadmin';
        return pb.authStore.model?.role || 'user';
    }

    // Ist Inhaber mit absolutem Vollzugriff (Tommy Jenzsch / Superadmin)
    get isOwner(): boolean {
        return pb.authStore.isSuperuser || 
               this.rawRole === 'superadmin' || 
               this.rawRole === 'owner';
    }

    // Ist Betriebsleiter eines konkreten Betriebs (Admin)
    get isFacilityAdmin(): boolean {
        return !this.isOwner && this.rawRole === 'admin';
    }

    // Ist Mitarbeiter / Pflegekraft / Betreuer
    get isCaregiver(): boolean {
        return !this.isOwner && !this.isFacilityAdmin && (this.rawRole === 'user' || this.rawRole === 'caregiver' || !this.rawRole);
    }

    // Ist Klient (nur Portal)
    get isClient(): boolean {
        return this.rawRole === 'guest' || this.rawRole === 'client';
    }

    // Liefert die ID des zugewiesenen Betriebs (falls vorhanden)
    get userCompanyId(): string | null {
        const c = pb.authStore.model?.company;
        if (!c) return null;
        if (Array.isArray(c)) return c[0] || null;
        if (typeof c === 'string' && c.startsWith('[')) {
            try { return JSON.parse(c)[0] || null; } catch { return null; }
        }
        return c;
    }

    // Ist Admin (Betriebsleiter oder Inhaber)
    get isAdmin(): boolean {
        return this.isOwner || this.isFacilityAdmin;
    }

    // Berechtigungsprüfungen (reaktive Getter)
    get canAccessAdmin(): boolean {
        return this.isOwner || this.isFacilityAdmin;
    }

    get canAccessGodMode(): boolean {
        return this.isOwner;
    }

    get canAccessSystemPrompts(): boolean {
        return this.isOwner;
    }

    get canAccessSystemConfig(): boolean {
        return this.isOwner;
    }

    get canAccessProposals(): boolean {
        return this.isOwner;
    }

    get canAccessFinances(): boolean {
        return this.isOwner || this.isFacilityAdmin;
    }

    get canAccessInvoices(): boolean {
        return this.isOwner || this.isFacilityAdmin;
    }

    get canAccessBwa(): boolean {
        return this.isOwner || this.isFacilityAdmin;
    }

    get canAccessCompanySettings(): boolean {
        return this.isOwner || this.isFacilityAdmin;
    }

    get canSwitchCompanyFilter(): boolean {
        return this.isOwner;
    }

    /**
     * Prüft, ob ein Datensatz im Sichtbereich des aktuellen Benutzers liegt.
     */
    isRecordInScope(record: any, type: 'client' | 'appointment' | 'invoice' | 'company' | 'contact' | 'user' = 'client'): boolean {
        if (!record) return false;
        if (this.isOwner) return true;

        const myCompanyId = this.userCompanyId;
        const myUserId = pb.authStore.model?.id;

        // Kontakte sind zentrale Adressbuchdaten (Ärzte, Betreuer, Angehörige, Pflegedienste) und für alle Mitarbeiter/Admins sichtbar
        if (type === 'contact') return true;

        if (this.isFacilityAdmin) {
            if (!myCompanyId) return true;
            if (type === 'company') return record.id === myCompanyId;

            // 1. Direkte Firmenzuordnung auf dem Datensatz
            const recComp = record.company || record.expand?.company?.id;
            if (recComp) {
                if (Array.isArray(recComp)) return recComp.includes(myCompanyId);
                if (typeof recComp === 'string' && recComp.startsWith('[')) {
                    try { return JSON.parse(recComp).includes(myCompanyId); } catch {}
                }
                return recComp === myCompanyId;
            }

            // 2. Bei Terminen: Prüfung über expandierten Klienten oder Benutzer
            if (type === 'appointment') {
                // Eigene Termine des Betriebsleiters immer sichtbar
                if (record.user === myUserId || (Array.isArray(record.user) && record.user.includes(myUserId))) {
                    return true;
                }
                // Über expandierten Klienten
                const expClients = Array.isArray(record.expand?.client) ? record.expand.client : (record.expand?.client ? [record.expand.client] : []);
                if (expClients.some((c: any) => c.company === myCompanyId || (Array.isArray(c.company) && c.company.includes(myCompanyId)))) {
                    return true;
                }
            }

            // 3. Datensätze ohne jegliche Firmenbindung
            if (!('company' in record)) {
                return true;
            }

            return false;
        }

        if (this.isCaregiver) {
            if (!myUserId) return false;

            if (type === 'appointment') {
                return record.user === myUserId || (Array.isArray(record.user) && record.user.includes(myUserId));
            }
            if (type === 'client') {
                return record.caregiver === myUserId || 
                       record.assigned_employee === myUserId || 
                       (Array.isArray(record.caregiver) && record.caregiver.includes(myUserId));
            }
            if (!('company' in record)) {
                return true;
            }
            return false;
        }

        return false;
    }
}

export const rbacService = new RbacService();
