import { FileText, CheckCircle2, Clock, AlertCircle } from "lucide-svelte";

export function isInsuranceInvoice(inv: any): boolean {
    let meta = inv.table_sum_positions;
    if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch(e){}
    }
    if (meta?.recipientType === 'insurance') return true;
    const insuranceTemplateIds = ['299p3n08p25vmeu', 'dkdyu0mrlcqkcoc', 'unm9kzapp3zailt'];
    if (meta?.templateId && insuranceTemplateIds.includes(meta.templateId)) return true;

    let positions = inv.table_positions;
    if (typeof positions === 'string') {
        try { positions = JSON.parse(positions); } catch(e){}
    }
    if (Array.isArray(positions)) {
        return positions.some((p: any) => 
            /entlastungsleistung|verhinderungspflege|umwandlungsleistung|sgb\s*xi|pflegekasse|krankenkasse/i.test(p.title || '')
        );
    }
    return false;
}

export function getInvoiceStatusStyle(status: string) {
    switch (status) {
        case 'Abgeschlossen':
            return { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', icon: CheckCircle2, label: 'Bezahlt' };
        case 'Eingereicht':
        case 'Offen':
            return { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800', icon: FileText, label: 'Offen' };
        case 'In Bearbeitung':
            return { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', icon: Clock, label: 'In Prüfung' };
        case 'Storniert':
            return { color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800', icon: AlertCircle, label: 'Storniert' };
        default:
            return { color: 'text-neutral-600 dark:text-slate-400', bg: 'bg-neutral-100 dark:bg-slate-800', border: 'border-neutral-200 dark:border-slate-700', icon: FileText, label: status || 'Offen' };
    }
}

export function formatCurrency(amount: number): string {
    return amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}
