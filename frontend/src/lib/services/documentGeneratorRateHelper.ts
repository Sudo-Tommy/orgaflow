import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { findMatchingTemplateForBillingType } from "$lib/services/clientBillingService";

export type RateSource = 'client' | 'template' | 'default';

export interface PreselectedRates {
    hourlyWage: number;
    kmRate: number;
    taxRate: string;
    recipientType: string;
    recipientId: string;
    sources: { hourlyWage: RateSource; kmRate: RateSource; taxRate: RateSource };
}

export const DEFAULT_HOURLY_WAGE = 40;
export const DEFAULT_KM_RATE = 0.3;

export function isInvoiceTemplate(t: any): boolean {
    return (t?.type || '').toLowerCase() === 'rechnung';
}

export function getClientTemplateId(client: any, templates?: any[]): string {
    if (!client) return "";
    const raw = client.templates;
    const ids: string[] = (Array.isArray(raw) ? raw : (raw ? [raw] : []))
        .map((t: any) => typeof t === 'object' && t ? (t.id || "") : String(t || "").trim())
        .filter(Boolean);
    if (ids.length === 0 && typeof client.default_template === 'string') ids.push(client.default_template.trim());
    if (ids.length === 0) return "";
    if (templates?.length) {
        const invoiceId = ids.find(id => isInvoiceTemplate(templates.find(t => t.id === id)));
        if (invoiceId) return invoiceId;
    }
    return ids[0] || "";
}

export function getLastUsedTemplateId(clientId: string, invoices: any[], templates: any[]): string {
    if (!clientId) return "";
    const ofClient = (invoices || []).filter((inv: any) => {
        const c = Array.isArray(inv.client) ? inv.client : [inv.client];
        return c.includes(clientId) && (inv.status || '') !== 'Storniert';
    }).sort((a: any, b: any) => new Date(b.issue_date || b.created).getTime() - new Date(a.issue_date || a.created).getTime());
    for (const inv of ofClient) {
        let meta: any = inv.table_sum_positions;
        try { if (typeof meta === 'string') meta = JSON.parse(meta); } catch { meta = null; }
        const tplId = meta && !Array.isArray(meta) ? meta.templateId : "";
        if (tplId && isInvoiceTemplate(templates.find(t => t.id === tplId))) return tplId;
    }
    return "";
}

export function resolvePreferredTemplateId(client: any, invoices: any[], templates: any[]): string {
    if (!client) return "";
    const fromFile = getClientTemplateId(client, templates);
    if (fromFile && templates.some(t => t.id === fromFile)) return fromFile;
    if (client.billing_type) {
        const matched = findMatchingTemplateForBillingType(client.billing_type, templates);
        if (matched) return matched.id;
    }
    return getLastUsedTemplateId(client.id, invoices, templates);
}

export function isCareInvoiceTemplate(template: any): boolean {
    if (!template) return false;
    const title = (template.title || '').toLowerCase();
    const careKeywords = ['entlastung', 'verhinderung', 'umwandlung', '45a', '45b', '39', 'pflegekasse'];
    if (careKeywords.some(kw => title.includes(kw))) return true;

    const conf = template.content_html?.blocks?.find((b: any) => b.type === 'billing_table' || b.type === 'table')?.tableConfig
        || template.content_html?.fields?.find((f: any) => f.type === 'table')?.tableConfig;
    return conf?.includeTotalTax === false;
}

export function resolvePreselectedRates(client: any, template: any): PreselectedRates {
    const numWage = Number(client?.hourly_rate ?? client?.hourly_wage);
    const wageFromClient = !isNaN(numWage) && numWage > 0;
    const hourlyWage = wageFromClient ? numWage : DEFAULT_HOURLY_WAGE;

    const numKm = Number(client?.km_rate);
    const kmFromClient = client != null && client.km_rate != null && client.km_rate !== "" && !isNaN(numKm) && numKm >= 0;
    const kmRate = kmFromClient ? numKm : DEFAULT_KM_RATE;

    const isCare = isCareInvoiceTemplate(template);
    let taxRate = "0";
    let taxSource: RateSource = 'default';
    if (isCare) {
        taxRate = "0"; taxSource = 'template';
    } else if (client) {
        const numTax = Number(client.tax_rate ?? 0);
        taxRate = isNaN(numTax) ? "0" : String(numTax); taxSource = 'client';
    } else if (isInvoiceTemplate(template)) {
        taxRate = "19";
    }

    let recipientType = 'client';
    let recipientId = client?.id || '';
    const isDeceased = (client?.status || '').toLowerCase() === 'verstorben';
    const inheritors = Array.isArray(client?.expand?.inheritor) ? client.expand.inheritor : (client?.expand?.inheritor ? [client.expand.inheritor] : []);
    const insurances = Array.isArray(client?.expand?.insurance) ? client.expand.insurance : (client?.expand?.insurance ? [client.expand.insurance] : []);
    if (isDeceased && inheritors.length > 0) {
        recipientType = 'inheritor'; recipientId = inheritors[0]?.id || '';
    } else if (isCare && insurances.length > 0) {
        recipientType = 'insurance'; recipientId = insurances[0]?.id || '';
    }

    return {
        hourlyWage, kmRate, taxRate, recipientType, recipientId,
        sources: { hourlyWage: wageFromClient ? 'client' : 'default', kmRate: kmFromClient ? 'client' : 'default', taxRate: taxSource }
    };
}

export function checkRatesDiffer(client: any, wage: number, km: number, tax: string): boolean {
    if (!client) return false;
    const cWage = Number(client.hourly_rate ?? client.hourly_wage);
    const expWage = (!isNaN(cWage) && cWage > 0) ? cWage : DEFAULT_HOURLY_WAGE;
    const cKm = Number(client.km_rate);
    const expKm = (client.km_rate != null && client.km_rate !== "" && !isNaN(cKm) && cKm >= 0) ? cKm : DEFAULT_KM_RATE;
    const expTax = client.tax_rate != null && client.tax_rate !== "" ? String(Number(client.tax_rate)) : "0";
    return Number(wage) !== expWage || Number(km) !== expKm || String(tax) !== expTax;
}

export async function saveRatesToClientFile(clientId: string, wage: number, km: number, tax: string): Promise<boolean> {
    if (!clientId) return false;
    try {
        const patch = { hourly_rate: Number(wage) || 0, km_rate: Number(km) >= 0 ? Number(km) : 0, tax_rate: Number(tax) || 0 };
        await pb.collection('clients').update(clientId, patch);
        const local = orgaStore.clients?.data.find((c: any) => c.id === clientId);
        if (local) { local.hourly_rate = local.hourly_wage = patch.hourly_rate; local.km_rate = patch.km_rate; local.tax_rate = patch.tax_rate; }
        toastStore.success("Konditionen in Klientenakte gespeichert!");
        return true;
    } catch {
        toastStore.error("Fehler beim Speichern in der Klientenakte.");
        return false;
    }
}

export function getRateBadge(type: 'wage' | 'km' | 'tax', val: number | string, client: any, tpl: any) {
    if (type === 'wage') {
        const cW = Number(client?.hourly_rate ?? client?.hourly_wage);
        if (!isNaN(cW) && cW > 0 && Number(val) === cW) return { text: 'Klientenakte', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' };
        if (Number(val) === DEFAULT_HOURLY_WAGE) return { text: 'Standard', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700' };
        return { text: 'Geändert', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700' };
    }
    if (type === 'km') {
        const cK = Number(client?.km_rate);
        if (client?.km_rate != null && client.km_rate !== "" && !isNaN(cK) && Number(val) === cK) return { text: 'Klientenakte', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' };
        if (Number(val) === DEFAULT_KM_RATE) return { text: 'Standard', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700' };
        return { text: 'Geändert', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700' };
    }
    if (isCareInvoiceTemplate(tpl) && String(val) === "0") return { text: 'Rechnungsart (0%)', cls: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700' };
    if (client?.tax_rate != null && client.tax_rate !== "" && String(Number(val)) === String(Number(client.tax_rate))) return { text: 'Klientenakte', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' };
    if (String(val) === (isInvoiceTemplate(tpl) ? "19" : "0")) return { text: 'Standard', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700' };
    return { text: 'Geändert', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700' };
}

export function sortTemplatesAlphabetically<T extends { title?: string }>(templates: T[]): T[] {
    return [...templates].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'de', { sensitivity: 'base' }));
}

export function sortClientsAlphabetically<T extends { name_last?: string; name_first?: string }>(clients: T[]): T[] {
    return [...clients].sort((a, b) => {
        const lastA = (a.name_last || '').trim();
        const lastB = (b.name_last || '').trim();
        const cmp = lastA.localeCompare(lastB, 'de', { sensitivity: 'base' });
        if (cmp !== 0) return cmp;
        return (a.name_first || '').trim().localeCompare((b.name_first || '').trim(), 'de', { sensitivity: 'base' });
    });
}
