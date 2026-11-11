import type { BudgetEntry, BudgetTimeFilter } from '$lib/types/budget';

export function getEffectiveEntryDate(entry: BudgetEntry): string {
    if (entry.payment_status === 'paid' && entry.paid_at) {
        return entry.paid_at;
    }
    return entry.invoice_date || entry.due_date || entry.paid_at || entry.created || '';
}

export function matchesTimeFilter(
    timeFilter: BudgetTimeFilter,
    selectedYear: number,
    selectedMonth: number,
    dateStr?: string | null
): boolean {
    if (timeFilter === 'all') return true;
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;

    const entryYear = date.getFullYear();
    const entryMonth = date.getMonth();

    if (timeFilter === 'month' || timeFilter === 'this_month') {
        return entryYear === selectedYear && entryMonth === (selectedMonth - 1);
    } else if (timeFilter === 'last_month') {
        const lastMonthDate = new Date(selectedYear, selectedMonth - 2, 1);
        return entryYear === lastMonthDate.getFullYear() && entryMonth === lastMonthDate.getMonth();
    } else if (timeFilter === 'quarter') {
        const targetQuarter = Math.ceil(selectedMonth / 3);
        const entryQuarter = Math.floor(entryMonth / 3) + 1;
        return entryYear === selectedYear && entryQuarter === targetQuarter;
    } else if (timeFilter === 'year') {
        return entryYear === selectedYear;
    }
    return true;
}

export function getPeriodStartDate(timeFilter: BudgetTimeFilter, selectedYear: number, selectedMonth: number): Date {
    if (timeFilter === 'year') {
        return new Date(selectedYear, 0, 1);
    } else if (timeFilter === 'quarter') {
        const startMonth = (Math.ceil(selectedMonth / 3) - 1) * 3;
        return new Date(selectedYear, startMonth, 1);
    }
    return new Date(selectedYear, selectedMonth - 1, 1);
}

export function isEntryArrear(entry: BudgetEntry, periodStartDate: Date): boolean {
    if (entry.payment_status !== 'open') return false;
    const dStr = entry.invoice_date || entry.due_date || entry.created;
    if (!dStr) return false;
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return false;
    return d.getTime() < periodStartDate.getTime();
}

export function getInstallmentPlanKey(entry: BudgetEntry): string {
    return entry.invoice_number
        ? `inv_${entry.invoice_number.trim().toLowerCase()}`
        : `${entry.recipient_or_payer}_${entry.title}_${entry.installment_total_count || ''}`.trim().toLowerCase();
}
