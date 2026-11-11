import type { BudgetEntry } from './budget';

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
