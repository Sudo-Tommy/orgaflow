/**
 * src/lib/types/budget.ts
 * Umfassende Typdefinitionen, Enums, Filter & Hilfsfunktionen für das Haushaltsbuch (Finanzen, Verträge, Ratenzahlungen & automatische Rechnungen) in OrgaFlow.
 */

export type BudgetEntryType = 'income' | 'expense';

export type PaymentStatus = 'paid' | 'open' | 'scheduled';

export type PaymentMethod = 'bank_transfer' | 'sepa_direct_debit' | 'cash' | 'card' | 'paypal';

export type ContractInterval = 'monthly' | 'quarterly' | 'yearly';

export type ContractPaymentStatus = 'paid' | 'open';

export type BudgetEntrySource = 'manual' | 'accounting' | 'contract';

/**
 * Buchung im Haushaltsbuch (PocketBase-Collection: `budget_entries`, `accounting` bzw. `personal_transactions`)
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
    
    // Herkunft der Buchung
    source?: BudgetEntrySource;
    is_invoice?: boolean; // Kennzeichnung: Automatische Rechnungseinnahme
    
    // Rechnungs- & Belegdetails
    invoice_number?: string;
    invoice_date?: string; // ISO-String (YYYY-MM-DD oder vollständiger ISO-Zeitstempel)
    due_date?: string;     // ISO-String
    paid_at?: string;      // ISO-String
    recipient_or_payer: string; // Wer hat bezahlt / an wen ging das Geld?
    payment_method: PaymentMethod;
    contract_id?: string;  // Relation zu contracts
    receipt_file?: string; // Dateiname im PocketBase-Speicher

    // Ratenzahlung
    is_installment?: boolean;
    installment_current?: number;       // z. B. 3
    installment_total_count?: number;   // z. B. 12
    installment_total_amount?: number;  // z. B. 1200.00
    
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
 * Laufender Vertrag / Fixkosten (PocketBase-Collection: `contracts` bzw. `personal_contracts`)
 */
export interface Contract {
    id: string;
    user?: string;
    partner_name: string;      // Vertragspartner / Anbieter / Empfänger
    contract_number: string;   // Vertrags- oder Kundennummer
    amount: number;            // Regelmäßiger Betrag
    interval: ContractInterval; // 'monthly' | 'quarterly' | 'yearly'
    next_due_date: string;     // Nächster Ausführungstag (ISO-String)
    payment_status: ContractPaymentStatus; // Status der anstehenden Periode ('paid' | 'open')
    category: string;
    auto_book: boolean;        // Soll automatisch zum Stichtag eine Buchung in budget_entries erzeugt werden?
    is_active: boolean;
    
    description?: string;
    document_file?: string;
    created?: string;
    updated?: string;
}

/**
 * Filter-Definitionen für das Dashboard
 * 'arrears': Spezieller Filter für überfällige Zahlungsrückstände / unbezahlte Raten aus Vormonaten
 */
export type BudgetStatusFilter = 'all' | 'open' | 'paid' | 'invoices' | 'installments' | 'contracts' | 'arrears';

export type BudgetTimeFilter = 'month' | 'this_month' | 'last_month' | 'quarter' | 'year' | 'all';

export interface BudgetTotals {
    totalIncome: number;
    invoiceIncome: number;       // Davon aus automatischen Kundenrechnungen
    personalIncome: number;      // Sonstige Einnahmen
    totalExpense: number;
    totalOpen: number;           // Primäre offene Verbindlichkeit (aktueller Monat)
    openPayables: number;        // Offene Ausgaben / Verbindlichkeiten im gewählten Monat
    openReceivables: number;     // Offene Einnahmen / Kundenforderungen im gewählten Monat
    balance: number;
    fixedCostsMonthly: number;
    openFixedCostsMonthly: number;
    openInstallmentsTotal: number;
    installmentsCount: number;
    invoicesCount: number;
    entriesCount: number;
    contractsCount: number;

    // Zahlungsrückstände aus Vormonaten (Arrears & Missed Installments)
    arrearsPayables: number;          // Unbezahlte Ausgaben / offene Raten aus vorherigen Monaten
    arrearsReceivables: number;       // Unbezahlte Kundenrechnungen aus vorherigen Monaten
    arrearsInstallmentsCount: number; // Anzahl unbezahlter Raten aus Vormonaten
    arrearsCount: number;             // Gesamtzahl unbezahlter Posten aus Vormonaten
}

/**
 * Metadaten zu Zahlungsarten
 */
export const PAYMENT_METHOD_METADATA: Record<PaymentMethod, { label: string; icon: string }> = {
    bank_transfer: { label: 'Überweisung', icon: 'Building2' },
    sepa_direct_debit: { label: 'SEPA-Lastschrift', icon: 'CreditCard' },
    cash: { label: 'Barzahlung', icon: 'Banknote' },
    card: { label: 'Kartenzahlung', icon: 'CreditCard' },
    paypal: { label: 'PayPal', icon: 'Wallet' }
};

/**
 * Metadaten zu Zahlungsstatus
 */
export const PAYMENT_STATUS_METADATA: Record<PaymentStatus, {
    label: string;
    shortLabel: string;
    badgeClass: string;
    dotClass: string;
    icon: string;
}> = {
    paid: {
        label: 'Bezahlt',
        shortLabel: 'Bezahlt',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        dotClass: 'bg-emerald-500',
        icon: 'CheckCircle2'
    },
    open: {
        label: 'Offen / Fällig',
        shortLabel: 'Offen',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        dotClass: 'bg-amber-500',
        icon: 'Clock'
    },
    scheduled: {
        label: 'Geplant / Dauerauftrag',
        shortLabel: 'Geplant',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
        dotClass: 'bg-sky-500',
        icon: 'CalendarClock'
    }
};

/**
 * Metadaten zu Vertragsintervallen
 */
export const CONTRACT_INTERVAL_METADATA: Record<ContractInterval, { label: string; factorMonthly: number }> = {
    monthly: { label: 'Monatlich', factorMonthly: 1 },
    quarterly: { label: 'Vierteljährlich', factorMonthly: 1 / 3 },
    yearly: { label: 'Jährlich', factorMonthly: 1 / 12 }
};

/**
 * Standard-Kategorien für Haushaltsbuch & Verträge mit Farbgebung und Lucide-Icon-Referenzen
 */
export const BUDGET_CATEGORIES: { name: string; icon: string; color: string }[] = [
    { name: 'Kundenrechnung', icon: 'FileCheck', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' },
    { name: 'Honorar & Klienten', icon: 'Briefcase', color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800' },
    { name: 'Miete & Wohnen', icon: 'Home', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
    { name: 'Software & IT', icon: 'Laptop', color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' },
    { name: 'Pflegehilfsmittel', icon: 'HeartHandshake', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' },
    { name: 'Versicherung', icon: 'ShieldCheck', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
    { name: 'Fahrtkosten & Mobilität', icon: 'Car', color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800' },
    { name: 'Telekommunikation', icon: 'Phone', color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' },
    { name: 'Büromaterial', icon: 'Paperclip', color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800' },
    { name: 'Fortbildung', icon: 'GraduationCap', color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800' },
    { name: 'Steuern & Abgaben', icon: 'Receipt', color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800' },
    { name: 'Sonstiges', icon: 'Tags', color: 'text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800' }
];

/**
 * Formatierung von Geldbeträgen nach deutscher Konvention
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
}

/**
 * Formatierung eines ISO-Datumsstrings nach deutschem Format (DD.MM.YYYY)
 */
export function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

/**
 * Ermittelt Fälligkeitsstatus, Tage und Textlabel
 */
export function getDueDateInfo(dueDateStr?: string | null): {
    label: string;
    isOverdue: boolean;
    daysDiff: number;
} {
    if (!dueDateStr) {
        return { label: 'Kein Fälligkeitsdatum', isOverdue: false, daysDiff: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDateStr);
    if (isNaN(due.getTime())) {
        return { label: 'Ungültiges Datum', isOverdue: false, daysDiff: 0 };
    }
    due.setHours(0, 0, 0, 0);

    const diffMs = due.getTime() - today.getTime();
    const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
        return { label: 'Heute fällig', isOverdue: false, daysDiff: 0 };
    } else if (daysDiff === 1) {
        return { label: 'Morgen fällig', isOverdue: false, daysDiff: 1 };
    } else if (daysDiff > 1) {
        return { label: `Fällig in ${daysDiff} Tagen (${formatDate(dueDateStr)})`, isOverdue: false, daysDiff };
    } else if (daysDiff === -1) {
        return { label: 'Gestern fällig gewesen', isOverdue: true, daysDiff: -1 };
    } else {
        return { label: `Überfällig seit ${Math.abs(daysDiff)} Tagen (${formatDate(dueDateStr)})`, isOverdue: true, daysDiff };
    }
}

/**
 * Berechnet Fortschritt, Restraten und Restbetrag für Ratenzahlungen unter Berücksichtigung des Bezahlstatus
 */
export function getInstallmentProgress(entry: BudgetEntry): {
    percentage: number;
    current: number;
    totalCount: number;
    remainingCount: number;
    remainingAmount: number;
    totalAmount: number;
    label: string;
    isFinished: boolean;
} {
    const current = Number(entry.installment_current) || 1;
    const totalCount = Number(entry.installment_total_count) || current;
    const rateAmount = Number(entry.amount) || 0;
    const totalAmount = Number(entry.installment_total_amount) || (rateAmount * totalCount);

    // Wenn der aktuelle Status 'paid' ist, wurde die Rate 'current' bereits bezahlt.
    // Wenn 'open', wurden bisher nur (current - 1) Raten bezahlt.
    const isCurrentPaid = entry.payment_status === 'paid';
    const paidCount = isCurrentPaid ? Math.min(totalCount, current) : Math.max(0, current - 1);
    const paidAmount = paidCount * rateAmount;

    const percentage = totalCount > 0 ? Math.min(100, Math.round((paidCount / totalCount) * 100)) : 0;
    const remainingCount = Math.max(0, totalCount - paidCount);
    const remainingAmount = Math.max(0, totalAmount - paidAmount);
    const isFinished = paidCount >= totalCount;

    return {
        percentage,
        current,
        totalCount,
        remainingCount,
        remainingAmount,
        totalAmount,
        label: `Rate ${current} von ${totalCount}`,
        isFinished
    };
}
