import type { UserRole } from "$lib/services/rbacService.svelte";

export interface SimulationResult {
    decision: "ALLOW" | "DENY";
    summary: string;
    reasons: string[];
    matchedPolicy: string;
    timestamp: string;
    userContext: {
        name: string;
        role: string;
        companyId: string | null;
        companyName: string | null;
    };
}

export interface SimulationParams {
    targetUser: any;
    resourceType: "client" | "appointment" | "invoice" | "company" | "bwa" | "admin" | "godmode";
    actionType: "view" | "create" | "update" | "delete";
    targetId: string;
    companies: any[];
    clients: any[];
    appointments: any[];
    invoices: any[];
}

export function evaluateAccess(params: SimulationParams): SimulationResult {
    const { targetUser, resourceType, actionType, targetId, companies, clients, appointments, invoices } = params;

    const role = (targetUser.role || 'user') as UserRole;
    const reasons: string[] = [];
    let decision: "ALLOW" | "DENY" = "DENY";
    let matchedPolicy = "DefaultDenyPolicy";

    const userCompany = Array.isArray(targetUser.company) ? targetUser.company[0] : targetUser.company;
    const compObj = companies.find((c: any) => c.id === userCompany);
    const compName = compObj ? `${compObj.city} ${compObj.name || ''}` : 'Keine';

    // 1. Superadmin / Inhaber / Developer Check
    if (role === 'developer' || role === 'superadmin' || targetUser.email?.includes('admin@ihre-seniorenassistenz.com')) {
        decision = "ALLOW";
        matchedPolicy = "GlobalOwnerFullAccess";
        reasons.push("Benutzer besitzt Rolle 'developer' oder 'superadmin' (Global Inhaber / Entwickler).");
        reasons.push("Unbeschränkte Berechtigung auf alle Mandanten, Ressourcen und Aktionen.");
    } 
    // 2. Godmode / System-Admin Ressource
    else if (resourceType === 'godmode' || resourceType === 'admin') {
        if (role === 'admin' && resourceType === 'admin') {
            if (actionType === 'delete') {
                decision = "DENY";
                matchedPolicy = "AdminPrivilegeBound";
                reasons.push("Betriebsleiter dürfen keine System-Administrationsknoten löschen.");
            } else {
                decision = "ALLOW";
                matchedPolicy = "FacilityAdminControl";
                reasons.push("Betriebsleiter (Admin) hat Lese- und Konfigurationszugriff auf den Admin-Bereich.");
            }
        } else {
            decision = "DENY";
            matchedPolicy = "GodModeRestriction";
            reasons.push(`Ressource '${resourceType}' erfordert die Rolle 'superadmin'. Gefundene Rolle: '${role}'.`);
        }
    }
    // 3. Finanzen / BWA
    else if (resourceType === 'bwa' || resourceType === 'invoice') {
        if (role === 'admin') {
            decision = "ALLOW";
            matchedPolicy = "FacilityFinancialScope";
            reasons.push("Betriebsleiter hat Zugriff auf Finanzen & Rechnungen des eigenen Betriebs.");
            if (targetId !== 'any' && resourceType === 'invoice') {
                const inv = invoices.find((i: any) => i.id === targetId);
                if (inv && inv.company && inv.company !== userCompany) {
                    decision = "DENY";
                    matchedPolicy = "TenantIsolationEnforcement";
                    reasons.push(`Mandanten-Konflikt: Rechnung gehört zu Firma '${inv.company}', Benutzer ist Firma '${userCompany}' zugeordnet.`);
                }
            }
        } else {
            decision = "DENY";
            matchedPolicy = "FinanceAccessRestricted";
            reasons.push(`Rolle '${role}' hat keine Berechtigung für Rechnungs- und BWA-Finanzdaten.`);
        }
    }
    // 4. Klienten
    else if (resourceType === 'client') {
        if (role === 'admin') {
            decision = "ALLOW";
            matchedPolicy = "FacilityAdminClientScope";
            reasons.push("Betriebsleiter darf Klienten innerhalb seines Betriebs verwalten.");
            if (targetId !== 'any') {
                const cli = clients.find((c: any) => c.id === targetId);
                if (cli && cli.company && cli.company !== userCompany) {
                    decision = "DENY";
                    matchedPolicy = "TenantIsolationEnforcement";
                    reasons.push(`Mandanten-Grenze verletzt: Klient gehört zu Firma '${cli.company}', Benutzer ist Firma '${userCompany}' zugeordnet.`);
                }
            }
        } else if (role === 'user' || role === 'caregiver') {
            if (actionType === 'delete') {
                decision = "DENY";
                matchedPolicy = "CaregiverReadOnlyDelete";
                reasons.push("Pflegekräfte/Betreuer dürfen keine Klientenstammdaten löschen.");
            } else if (targetId === 'any') {
                decision = "ALLOW";
                matchedPolicy = "CaregiverAssignedClientsOnly";
                reasons.push("Betreuer darf zugewiesene Klienten einsehen und bearbeiten.");
            } else {
                const cli = clients.find((c: any) => c.id === targetId);
                const isAssigned = cli && (cli.caregiver === targetUser.id || cli.assigned_employee === targetUser.id);
                if (isAssigned) {
                    decision = "ALLOW";
                    matchedPolicy = "AssignedCaregiverPermit";
                    reasons.push("Zugriff gestattet: Benutzer ist als Betreuer für diesen Klienten eingetragen.");
                } else {
                    decision = "DENY";
                    matchedPolicy = "UnassignedCaregiverDeny";
                    reasons.push("Zugriff verweigert: Klient ist einer anderen Pflegekraft zugewiesen.");
                }
            }
        } else {
            decision = "DENY";
            matchedPolicy = "GuestPortalOnly";
            reasons.push("Gäste/Klienten können Klientenstammdaten nicht im ERP-Bereich abrufen.");
        }
    }
    // 5. Termine
    else if (resourceType === 'appointment') {
        if (role === 'admin') {
            decision = "ALLOW";
            matchedPolicy = "FacilityAdminAppointmentScope";
            reasons.push("Betriebsleiter darf alle Termine seines Standorts einsehen und bearbeiten.");
        } else if (role === 'user' || role === 'caregiver') {
            if (targetId !== 'any') {
                const app = appointments.find((a: any) => a.id === targetId);
                if (app && app.user && app.user !== targetUser.id) {
                    decision = "DENY";
                    matchedPolicy = "AppointmentUserOwnership";
                    reasons.push("Pflegekraft darf nur persönliche Termine oder Termine zugewiesener Klienten bearbeiten.");
                } else {
                    decision = "ALLOW";
                    matchedPolicy = "PersonalAppointmentPermit";
                    reasons.push("Termin gehört dem Benutzer oder ist zugewiesen.");
                }
            } else {
                decision = "ALLOW";
                matchedPolicy = "CaregiverAppointmentScope";
                reasons.push("Termin-Aktionen im persönlichen Scope gestattet.");
            }
        } else {
            decision = "DENY";
            matchedPolicy = "GuestAccessForbidden";
            reasons.push("Keine Berechtigung.");
        }
    } else {
        decision = "DENY";
        matchedPolicy = "FallbackDeny";
        reasons.push("Keine passende Regel erlaubt diesen Zugriff.");
    }

    return {
        decision,
        summary: decision === "ALLOW" ? "Zugriff gestattet (ALLOW)" : "Zugriff verweigert (DENY)",
        reasons,
        matchedPolicy,
        timestamp: new Date().toLocaleTimeString('de-DE'),
        userContext: {
            name: `${targetUser.name_first || ''} ${targetUser.name_last || ''}`.trim() || targetUser.email,
            role,
            companyId: userCompany || null,
            companyName: compName
        }
    };
}
