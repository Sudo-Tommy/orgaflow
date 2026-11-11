import { pb } from "$lib/services/pocketbase";
import { isAppointmentOwner, sortAppointmentsPrioritizingOwner } from "../calendar/calendarUtils";
import { sortAlphabetical } from "$lib/utils/sortHelper";

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

    const hasEL = lower.includes("entlastungsleistung") || lower.includes("entlastungsbetrag") || lower.includes("45b") || /\b(el)\b/i.test(textSources);
    const hasVP = lower.includes("verhinderungspflege") || lower.includes("vhp") || lower.includes("39") || /\b(vp)\b/i.test(textSources);
    const hasCareAdvice = lower.includes("pflegeberatung") || lower.includes("37.3") || lower.includes("beratungseinsatz");
    const hasPrivat = lower.includes("selbstzahler") || lower.includes("privatzahler") || /\b(privat)\b/i.test(textSources);

    if (hasEL && hasVP) {
        return { label: "Kombi: EL (§45b) & VHP (§39)", short: "EL / VHP", bgClass: "bg-purple-50", textClass: "text-purple-700", borderClass: "border-purple-200" };
    }
    if (hasEL) {
        return { label: "Entlastungsbetrag §45b SGB XI", short: "EL (§45b)", bgClass: "bg-emerald-50", textClass: "text-emerald-700", borderClass: "border-emerald-200" };
    }
    if (hasVP) {
        return { label: "Verhinderungspflege §39 SGB XI", short: "VHP (§39)", bgClass: "bg-blue-50", textClass: "text-blue-700", borderClass: "border-blue-200" };
    }
    if (hasCareAdvice) {
        return { label: "Pflegeberatung §37.3 SGB XI", short: "PB (§37.3)", bgClass: "bg-amber-50", textClass: "text-amber-700", borderClass: "border-amber-200" };
    }
    if (hasPrivat) {
        return { label: "Privatzahler / Selbstzahler", short: "Privat", bgClass: "bg-neutral-100", textClass: "text-neutral-700", borderClass: "border-neutral-200" };
    }
    return null;
}

export function checkMissingTime(app: any): boolean {
    if (!app.expand?.time_record || app.expand.time_record.length === 0) return true;
    return app.expand.time_record.some((tr: any) => !tr.start || !tr.end);
}

export function checkMissingTasks(app: any): boolean {
    return !app.expand?.tasks || app.expand.tasks.length === 0;
}

export function checkMissingReport(app: any): boolean {
    return !app.report || app.report.trim() === "";
}

export function getAppHours(app: any): number {
    if (!app.expand?.time_record || !Array.isArray(app.expand.time_record)) return 0;
    let totalMinutes = 0;
    for (const tr of app.expand.time_record) {
        if (tr.start && tr.end) {
            const s = new Date(tr.start).getTime();
            const e = new Date(tr.end).getTime();
            const diffMin = Math.max(0, (e - s) / 60000) - (tr.break_minutes || 0);
            totalMinutes += Math.max(0, diffMin);
        }
    }
    return totalMinutes / 60;
}

export function getAppKm(app: any): number {
    if (!app.expand?.drive_record || !Array.isArray(app.expand.drive_record)) return 0;
    return app.expand.drive_record.reduce((sum: number, dr: any) => sum + (Number(dr.km || dr.kilometers) || 0), 0);
}

export function groupAppointmentsByClient(appointments: any[]): any[] {
    const groups: { clientName: string; clientId?: string; apps: any[]; client?: any }[] = [];

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
            group = { clientName, clientId, apps: [], client: clientObj };
            groups.push(group);
        }
        group.apps.push(app);
    }

    const myId = pb.authStore.model?.id;
    for (const g of groups) {
        g.apps = sortAppointmentsPrioritizingOwner(g.apps, myId);
    }

    return groups.sort((a, b) => {
        const aHasMine = myId ? a.apps.some(app => isAppointmentOwner(app, myId)) : false;
        const bHasMine = myId ? b.apps.some(app => isAppointmentOwner(app, myId)) : false;
        if (aHasMine && !bHasMine) return -1;
        if (!aHasMine && bHasMine) return 1;
        return a.clientName.localeCompare(b.clientName, 'de', { sensitivity: 'base' });
    });
}
