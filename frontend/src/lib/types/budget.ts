/**
 * src/lib/types/budget.ts
 * Umfassende Typdefinitionen, Enums, Filter & Hilfsfunktionen für das Haushaltsbuch in OrgaFlow.
 */

export type BudgetEntryType = 'income' | 'expense';
export type PaymentStatus = 'paid' | 'open' | 'scheduled';
export type PaymentMethod = 'bank_transfer' | 'sepa_direct_debit' | 'cash' | 'card' | 'paypal';
export type ContractInterval = 'monthly' | 'quarterly' | 'yearly';
export type ContractPaymentStatus = 'paid' | 'open';
export type BudgetEntrySource = 'manual' | 'accounting' | 'contract';

/**
 * Buchung im Haushaltsbuch
 */
export interface BudgetEntry {
    id: string;
    user?: string;
    type: BudgetEntryType;
    title: string;
    description?: string;
    amount: number;
    amount_net?: number;
    tax_rate?: string;
    category: string;
    payment_status: PaymentStatus;
    source?: BudgetEntrySource;
    is_invoice?: boolean;
    invoice_number?: string;
    invoice_date?: string;
    due_date?: string;
    paid_at?: string;
    recipient_or_payer: string;
    payment_method: PaymentMethod;
    contract_id?: string;
    receipt_file?: string;
    is_installment?: boolean;
    installment_current?: number;
    installment_total_count?: number;
    installment_total_amount?: number;
    created?: string;
    updated?: string;
    expand?: {
        contract_id?: Contract;
        contract?: Contract;
        client?: any;
        user?: {
            id: string;
            name_first?: string;
            name_last?: string;
            email?: string;
            [key: string]: any;
        };
        [key: string]: any;
    };
}

/**
 * Laufender Vertrag / Fixkosten
 */
export interface Contract {
    id: string;
    user?: string;
    partner_name: string;
    contract_number: string;
    amount: number;
    interval: ContractInterval;
    next_due_date: string;
    payment_status: ContractPaymentStatus;
    category: string;
    auto_book: boolean;
    is_active: boolean;
    description?: string;
    document_file?: string;
    created?: string;
    updated?: string;
}

export type BudgetStatusFilter = 'all' | 'open' | 'paid' | 'invoices' | 'installments' | 'contracts' | 'arrears';
export type BudgetTimeFilter = 'month' | 'this_month' | 'last_month' | 'quarter' | 'year' | 'all';

export interface BudgetTotals {
    totalIncome: number;
    invoiceIncome: number;
    personalIncome: number;
    totalExpense: number;
    totalOpen: number;
    openPayables: number;
    openReceivables: number;
    balance: number;
    fixedCostsMonthly: number;
    openFixedCostsMonthly: number;
    openInstallmentsTotal: number;
    installmentsCount: number;
    invoicesCount: number;
    entriesCount: number;
    contractsCount: number;
    arrearsPayables: number;
    arrearsReceivables: number;
    arrearsInstallmentsCount: number;
    arrearsCount: number;
}

export const PAYMENT_METHOD_METADATA: Record<PaymentMethod, { label: string; icon: string }> = {
    bank_transfer: { label: 'Überweisung', icon: 'Building2' },
    card: { label: 'Kartenzahlung', icon: 'CreditCard' },
    cash: { label: 'Barzahlung', icon: 'Banknote' },
    paypal: { label: 'PayPal', icon: 'Wallet' },
    sepa_direct_debit: { label: 'SEPA-Lastschrift', icon: 'CreditCard' }
};

export const PAYMENT_STATUS_METADATA: Record<PaymentStatus, {
    label: string;
    shortLabel: string;
    badgeClass: string;
    dotClass: string;
    icon: string;
}> = {
    open: {
        label: 'Offen / Fällig',
        shortLabel: 'Offen',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        dotClass: 'bg-amber-500',
        icon: 'Clock'
    },
    paid: {
        label: 'Bezahlt',
        shortLabel: 'Bezahlt',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        dotClass: 'bg-emerald-500',
        icon: 'CheckCircle2'
    },
    scheduled: {
        label: 'Geplant / Dauerauftrag',
        shortLabel: 'Geplant',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
        dotClass: 'bg-sky-500',
        icon: 'CalendarClock'
    }
};

export const CONTRACT_INTERVAL_METADATA: Record<ContractInterval, { label: string; factorMonthly: number }> = {
    monthly: { label: 'Monatlich', factorMonthly: 1 },
    quarterly: { label: 'Vierteljährlich', factorMonthly: 1 / 3 },
    yearly: { label: 'Jährlich', factorMonthly: 1 / 12 }
};

/**
 * Standard-Kategorien für Haushaltsbuch & Verträge (Alphabetisch sortiert gem. alphabetical-select)
 */
export const BUDGET_CATEGORIES: { name: string; icon: string; color: string }[] = [
    { name: 'Büromaterial', icon: 'Paperclip', color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800' },
    { name: 'Fahrtkosten & Mobilität', icon: 'Car', color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800' },
    { name: 'Fortbildung', icon: 'GraduationCap', color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800' },
    { name: 'Honorar & Klienten', icon: 'Briefcase', color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800' },
    { name: 'Kundenrechnung', icon: 'FileCheck', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' },
    { name: 'Miete & Wohnen', icon: 'Home', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
    { name: 'Pflegehilfsmittel', icon: 'HeartHandshake', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' },
    { name: 'Software & IT', icon: 'Laptop', color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' },
    { name: 'Sonstiges', icon: 'Tags', color: 'text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800' },
    { name: 'Steuern & Abgaben', icon: 'Receipt', color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800' },
    { name: 'Telekommunikation', icon: 'Phone', color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' },
    { name: 'Versicherung', icon: 'ShieldCheck', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' }
].sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));

export * from './budgetHelpers';
