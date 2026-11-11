import { computeServicePeriod, buildPositionsFromAppointments, sanitizeExistingPositions, filterPositionsForTimesheet } from "./documentInvoiceCalculations";

export interface InvoiceBuildParams {
    currentInvoiceNr: string;
    manualIssueDate: string;
    isRegenerating: boolean;
    existingPositions: any[] | null;
    existingNetto: number | null;
    existingTaxSum: number | null;
    existingBrutto: number | null;
    requiresAppointments: boolean;
    selectedAppointmentIds: string[];
    availableAppointments: any[];
    template: any;
    hourlyWage: number;
    kmRate: number;
    taxRate: string;
    replacePlaceholders: (desc: string, isTs: boolean, overrideData?: any) => string;
}

export function computeGeneratedInvoiceData(p: InvoiceBuildParams) {
    const isTs = (p.template?.type || '').toLowerCase() === 'arbeitszeitnachweis';
    if (p.isRegenerating && p.existingPositions && Array.isArray(p.existingPositions) && p.existingPositions.length > 0) {
        const apps = p.availableAppointments.filter((a: any) => p.selectedAppointmentIds.includes(a.id));
        const service_period = computeServicePeriod(apps, p.manualIssueDate);
        let sanitizedPositions = sanitizeExistingPositions(p.existingPositions, p.manualIssueDate);
        if (isTs) {
            sanitizedPositions = filterPositionsForTimesheet(sanitizedPositions);
        }
        const netto = (isTs || p.existingNetto == null) ? sanitizedPositions.reduce((acc, x) => acc + x.total, 0) : Number(p.existingNetto);
        const brutto = isTs ? netto : (p.existingBrutto != null ? Number(p.existingBrutto) : netto);
        const tax_sum = isTs ? 0 : (p.existingTaxSum != null ? Number(p.existingTaxSum) : (brutto - netto));
        return { invoice_nr: p.currentInvoiceNr, netto, tax_sum, brutto, positions: sanitizedPositions, service_period, issue_date: p.manualIssueDate };
    }
    if (!p.requiresAppointments || p.selectedAppointmentIds.length === 0) return null;
    const apps = p.availableAppointments.filter((a: any) => p.selectedAppointmentIds.includes(a.id));
    const service_period = computeServicePeriod(apps, p.manualIssueDate);
    const tableConf = p.template?.content_html?.blocks?.find((b: any) => b.type === 'billing_table' || b.type === 'table')?.tableConfig
        || p.template?.content_html?.fields?.find((f: any) => f.type === 'table')?.tableConfig || {};
    const { positions, netto } = buildPositionsFromAppointments(apps, tableConf, p.hourlyWage, p.kmRate, (desc) => p.replacePlaceholders(desc, false, { invoice_nr: p.currentInvoiceNr, service_period, brutto: 0 }), isTs);
    const taxRateNum = parseFloat(p.taxRate) || 0;
    const taxSum = netto * (taxRateNum / 100);
    return { invoice_nr: p.currentInvoiceNr, netto, tax_sum: taxSum, brutto: netto + taxSum, positions, service_period, issue_date: p.manualIssueDate };
}

export function computeGeneratedTimesheetData(
    p: {
        currentInvoiceNr: string;
        manualIssueDate: string;
        requiresAppointments: boolean;
        selectedAppointmentIds: string[];
        availableAppointments: any[];
        timesheetTemplate: any;
        hourlyWage: number;
        kmRate: number;
        taxRate: string;
        replacePlaceholders: (desc: string, isTs: boolean, overrideData?: any) => string;
    }
) {
    if (!p.requiresAppointments || p.selectedAppointmentIds.length === 0) return null;
    const apps = p.availableAppointments.filter((a: any) => p.selectedAppointmentIds.includes(a.id));
    const service_period = computeServicePeriod(apps, p.manualIssueDate);
    const tableConf = p.timesheetTemplate?.content_html?.blocks?.find((b: any) => b.type === 'billing_table' || b.type === 'table')?.tableConfig
        || p.timesheetTemplate?.content_html?.fields?.find((f: any) => f.type === 'table')?.tableConfig || {};
    let { positions, netto } = buildPositionsFromAppointments(apps, tableConf, p.hourlyWage, p.kmRate, (desc) => p.replacePlaceholders(desc, true, { invoice_nr: p.currentInvoiceNr, service_period, brutto: 0 }), true);
    positions = filterPositionsForTimesheet(positions);
    netto = positions.reduce((acc, x) => acc + x.total, 0);
    return { invoice_nr: p.currentInvoiceNr, netto, tax_sum: 0, brutto: netto, positions, service_period, issue_date: p.manualIssueDate };
}
