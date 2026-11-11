import { pb } from "$lib/services/pocketbase";
import { isAppointmentOwner, sortAppointmentsPrioritizingOwner } from "../calendar/calendarUtils";
import { isAppointmentSettlementReady } from "$lib/services/appointmentStatusHelper";

export interface BillingFormInfo {
    label: string;
    short: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
}

export function getClientBillingForm(client: any): BillingFormInfo | null {
    if (!client) return null;
    
    const textSources = [
        client.billing_type,
        client.notes,
        client.internal_notes,
        client.payment_type,
        client.contract_type
    ].filter(Boolean).join(" ");

    if (!textSources.trim()) return null;
    const lower = textSources.toLowerCase();

    const hasEL = lower.includes("entlastungsleistung") || 
                  lower.includes("entlastungsbetrag") || 
                  lower.includes("45b") || 
                  /\b(el)\b/i.test(textSources);

    const hasVP = lower.includes("verhinderungspflege") || 
                  lower.includes("vhp") || 
                  lower.includes("39") || 
                  /\b(vp)\b/i.test(textSources);

    const hasCareAdvice = lower.includes("pflegeberatung") || 
                          lower.includes("37.3") || 
                          lower.includes("beratungseinsatz");

    const hasPrivat = lower.includes("selbstzahler") || 
                      lower.includes("privatzahler") || 
                      /\b(privat)\b/i.test(textSources);

    if (hasEL && hasVP) {
        return {
            label: "Kombi: EL (§45b) & VHP (§39)",
            short: "EL / VHP",
            bgClass: "bg-purple-50",
            textClass: "text-purple-700",
            borderClass: "border-purple-200"
        };
    }
    if (hasEL) {
        return {
            label: "Entlastungsbetrag §45b SGB XI",
            short: "EL (§45b)",
            bgClass: "bg-emerald-50",
            textClass: "text-emerald-700",
            borderClass: "border-emerald-200"
        };
    }
    if (hasVP) {
        return {
            label: "Verhinderungspflege §39 SGB XI",
            short: "VHP (§39)",
            bgClass: "bg-blue-50",
            textClass: "text-blue-700",
            borderClass: "border-blue-200"
        };
    }
    if (hasCareAdvice) {
        return {
            label: "Pflegeberatung §37.3 SGB XI",
            short: "PB (§37.3)",
            bgClass: "bg-amber-50",
            textClass: "text-amber-700",
            borderClass: "border-amber-200"
        };
    }
    if (hasPrivat) {
        return {
            label: "Privatzahler / Selbstzahler",
            short: "Privat",
            bgClass: "bg-neutral-100",
            textClass: "text-neutral-700",
            borderClass: "border-neutral-200"
        };
    }
    return null;
}

export function getAppHours(app: any): number {
    const totalMs = (app.expand?.time_record || []).reduce((sum: number, tr: any) => {
        return sum + (tr.start && tr.end ? new Date(tr.end).getTime() - new Date(tr.start).getTime() : 0);
    }, 0);
    return totalMs > 0 ? totalMs / 3600000 : 0;
}

export function getAppKm(app: any): number {
    return (app.expand?.drive_record || []).reduce((sum: number, dr: any) => sum + (dr.km || dr.kilometers || 0), 0);
}

export function isAppReady(app: any): boolean {
    return isAppointmentSettlementReady(app);
}

export interface ClientAppointmentGroup {
    clientName: string;
    clientId?: string;
    totalHours: number;
    totalKm: number;
    apps: any[];
    client?: any;
}

export function groupAppointmentsByClient(appointments: any[]): ClientAppointmentGroup[] {
    const groups: ClientAppointmentGroup[] = [];

    for (const app of appointments) {
        let clientName = "Ohne Klient";
        let clientId: string | undefined = undefined;
        let clientObj: any = undefined;
        if (app.expand?.client?.[0]) {
            const c = app.expand.client[0];
            clientName = `${c.name_first || ''} ${c.name_last || ''}`.trim() || 'Klient ohne Namen';
            clientId = c.id;
            clientObj = c;
        }

        let group = groups.find(g => g.clientName === clientName);
        if (!group) {
            group = { clientName, clientId, totalHours: 0, totalKm: 0, apps: [], client: clientObj };
            groups.push(group);
        }
        group.apps.push(app);
        group.totalHours += getAppHours(app);
        group.totalKm += getAppKm(app);
    }

    const myId = pb.authStore.model?.id;
    for (const g of groups) {
        g.apps = sortAppointmentsPrioritizingOwner(g.apps, myId);
    }

    return groups.sort((a, b) => a.clientName.localeCompare(b.clientName, 'de', { sensitivity: 'base' }));
}

export function calculateUnsettledMetrics(
    unsettledAppointments: any[], 
    selectedIds: string[], 
    clientCount: number
) {
    let totalHours = 0;
    let totalKm = 0;
    let readyCount = 0;
    let incompleteCount = 0;

    for (const app of unsettledAppointments) {
        totalHours += getAppHours(app);
        totalKm += getAppKm(app);
        if (isAppReady(app)) readyCount++;
        else incompleteCount++;
    }

    let selectedHours = 0;
    let selectedKm = 0;
    const selectedApps = unsettledAppointments.filter(a => selectedIds.includes(a.id));
    for (const app of selectedApps) {
        selectedHours += getAppHours(app);
        selectedKm += getAppKm(app);
    }

    return {
        totalCount: unsettledAppointments.length,
        readyCount,
        incompleteCount,
        totalHours,
        totalKm,
        selectedHours,
        selectedKm,
        clientCount
    };
}
