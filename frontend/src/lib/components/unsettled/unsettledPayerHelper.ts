import { getClientBillingForm } from './unsettledHelper';
import { calculateBudgets } from '$lib/services/clientDetailHelper';

export type PayerCategory = 'kasse' | 'privat';
export type PayerFilter = 'all' | 'kasse' | 'privat';

/**
 * Determines whether an appointment belongs to 'kasse' (Pflegekasse/Krankenkasse) or 'privat' (Selbstzahler)
 */
export function getAppointmentPayerCategory(app: any, clientObj?: any): PayerCategory {
    const appType = app?.billing_type;
    if (appType) {
        if (appType === 'Privat') return 'privat';
        if (['EL', 'VHP', '45a', 'Kombi'].includes(appType)) return 'kasse';
    }

    const client = clientObj || app?.expand?.client?.[0];
    if (client) {
        const form = getClientBillingForm(client);
        if (form) {
            if (form.short === 'Privat') return 'privat';
            return 'kasse';
        }
    }

    return 'kasse';
}

/**
 * Checks if an appointment is marked as 'Privat', even though the client is primarily billed via insurance (EL/VHP/Kombi)
 */
export function isPrivateMismatch(app: any, clientObj?: any): boolean {
    if (app?.billing_type !== 'Privat') return false;
    const client = clientObj || app?.expand?.client?.[0];
    if (!client) return false;

    const form = getClientBillingForm(client);
    if (!form) return false;

    return ['EL (§45b)', 'VHP (§39)', 'EL / VHP', 'PB (§37.3)'].includes(form.short);
}

const MONTH_NAMES = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export interface MonthOption {
    key: string; // "YYYY-MM"
    label: string; // "Oktober 2026"
}

/**
 * Extracts distinct service months from appointments and sorts them alphabetically per rule alphabetical-select.md
 */
export function getDistinctServiceMonths(appointments: any[]): MonthOption[] {
    const monthMap = new Map<string, string>();

    for (const app of appointments) {
        if (!app.appointment) continue;
        const d = new Date(app.appointment);
        if (isNaN(d.getTime())) continue;

        const y = d.getFullYear();
        const m = d.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        if (!monthMap.has(key)) {
            monthMap.set(key, `${MONTH_NAMES[m]} ${y}`);
        }
    }

    const options: MonthOption[] = Array.from(monthMap.entries()).map(([key, label]) => ({ key, label }));

    // Rule: alphabetical-select.md - must be sorted alphabetically by displayed text
    return options.sort((a, b) => a.label.localeCompare(b.label, 'de', { sensitivity: 'base' }));
}

/**
 * Checks if an invoice already exists for the client in a specific month or with these appointments
 */
export function findExistingClientInvoiceForMonth(clientId: string, monthKey: string, invoices: any[]): any | null {
    if (!clientId || !invoices || invoices.length === 0) return null;

    for (const inv of invoices) {
        if (inv.status === 'Storniert') continue;

        const clientMatch = Array.isArray(inv.client) ? inv.client.includes(clientId) : inv.client === clientId;
        if (!clientMatch) continue;

        // Check if invoice issue_date or created date matches monthKey (YYYY-MM)
        const dateToCheck = inv.issue_date || inv.created;
        if (dateToCheck && typeof dateToCheck === 'string' && dateToCheck.startsWith(monthKey)) {
            return inv;
        }
    }

    return null;
}

export interface ClientBudgetSummary {
    careLevel: number;
    remainingEntlastung: number;
    remainingVHP: number;
    totalAvailableBudget: number;
    isExhausted: boolean;
    isLow: boolean;
    annualMaxEntlastung: number;
}

/**
 * Summarizes the remaining care budget for a client using existing system calculations
 */
export function getClientBudgetSummary(client: any, appointments: any[], invoices: any[]): ClientBudgetSummary | null {
    if (!client) return null;
    const currentYear = new Date().getFullYear();
    const budgets = calculateBudgets(client, invoices || [], appointments || [], currentYear);

    const isExhausted = budgets.remainingEntlastung <= 0 && budgets.remainingVHP <= 0;
    const isLow = budgets.remainingEntlastung > 0 && budgets.remainingEntlastung < 100;

    return {
        careLevel: budgets.careLevel,
        remainingEntlastung: budgets.remainingEntlastung,
        remainingVHP: budgets.remainingVHP,
        totalAvailableBudget: budgets.totalAvailableBudget,
        isExhausted,
        isLow,
        annualMaxEntlastung: budgets.annualMaxEntlastung
    };
}
