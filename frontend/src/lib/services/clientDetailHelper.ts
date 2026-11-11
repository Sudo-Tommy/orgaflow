/**
 * Helper and calculation functions for ClientDetailModal and its subcomponents
 */

export function calculateAppointmentCost(appointment: any, clientData: any): number {
    let appCost = 0;
    if (appointment.expand?.time_record) {
        for (const tr of appointment.expand.time_record) {
            if (tr.start && tr.end) {
                const diffMs = new Date(tr.end).getTime() - new Date(tr.start).getTime();
                if (diffMs > 0) appCost += (diffMs / 3600000) * (clientData?.hourly_rate ?? 40);
            }
        }
    }
    if (appointment.expand?.drive_record) {
        for (const dr of appointment.expand.drive_record) {
            appCost += (dr.km ?? 0) * (clientData?.km_rate ?? 0.3);
            appCost += (dr.lump_sum ?? 0);
        }
    }
    if (appointment.expand?.expenditures) {
        for (const exp of appointment.expand.expenditures) {
            appCost += (exp.sum ?? 0);
        }
    }
    return appCost;
}

export function calculateBudgets(client: any, invoices: any[], appointments: any[], currentYear: number) {
    const careLevel = parseInt(client?.level_of_care || '0', 10) || 0;
    const annualMaxVHP = careLevel >= 2 && careLevel <= 5 ? 3539 : 0;
    const hasManualEntlastung = client?.annual_budget_entlastung != null && Number(client.annual_budget_entlastung) > 0;
    const annualMaxEntlastung = hasManualEntlastung
        ? Number(client.annual_budget_entlastung)
        : (careLevel >= 1 && careLevel <= 5 ? 1572 : 0);

    let vhp = 0;
    let elb = 0;

    if (client && invoices && appointments) {
        // 1. Abgeschlossene Rechnungen im aktuellen Jahr
        const currentYearInvoices = invoices.filter((inv: any) =>
            (Array.isArray(inv.client) ? inv.client.includes(client.id) : inv.client === client.id) &&
            inv.status === 'Abgeschlossen' &&
            (inv.issue_date ? new Date(inv.issue_date).getFullYear() === currentYear : false)
        );

        for (const inv of currentYearInvoices) {
            let invoiceAssigned = false;
            const invoiceTaxRate = parseFloat(inv.tax_rate || '0');

            for (const pos of (inv.table_positions || [])) {
                if (invoiceAssigned) break;
                const title = pos.title?.toLowerCase() || '';

                if (title.includes('verhinderungspflege') || title.includes('kurzzeitpflege')) {
                    vhp += inv.brutto || 0;
                    invoiceAssigned = true;
                } else if (title.includes('entlastungsleistung') || title.includes('betreuungsleistung')) {
                    elb += inv.brutto || 0;
                    invoiceAssigned = true;
                }
            }

            if (!invoiceAssigned && invoiceTaxRate === 0) {
                vhp += inv.brutto || 0;
            }
        }

        // 2. Nicht abgerechnete Termine im aktuellen Jahr
        const currentYearAppointments = appointments.filter((app: any) =>
            (Array.isArray(app.client) ? app.client.includes(client.id) : app.client === client.id) &&
            !app.settled &&
            app.status !== 'abgesagt' &&
            app.appointment &&
            new Date(app.appointment).getFullYear() === currentYear
        );

        for (const app of currentYearAppointments) {
            const cost = calculateAppointmentCost(app, client);
            const tasks: string[] = app.expand?.tasks?.map((t: any) => t.title.toLowerCase()) || [];

            let appointmentAssigned = false;
            if (tasks.some(t => t.includes('verhinderungspflege') || t.includes('kurzzeitpflege'))) {
                vhp += cost;
                appointmentAssigned = true;
            } else if (!appointmentAssigned && tasks.some(t => t.includes('entlastungsleistung') || t.includes('betreuungsleistung'))) {
                elb += cost;
            }
        }
    }

    const remainingVHP = Math.max(0, annualMaxVHP - vhp);
    const remainingEntlastung = Math.max(0, annualMaxEntlastung - elb);

    const today = new Date();
    const isAfterJune30 = today.getMonth() > 5 || (today.getMonth() === 5 && today.getDate() > 30);
    const previousYearRemainingBudget = isAfterJune30 ? 0 : (client?.restbudget_vorjahr ?? 0);

    const totalAvailableBudget = remainingVHP + remainingEntlastung + previousYearRemainingBudget;
    const vhpPercent = annualMaxVHP > 0 ? Math.min(100, Math.round((vhp / annualMaxVHP) * 100)) : 0;
    const entlastungPercent = annualMaxEntlastung > 0 ? Math.min(100, Math.round((elb / annualMaxEntlastung) * 100)) : 0;
    const hasBudgetWarning = vhp > 0 && annualMaxVHP === 0;

    return {
        careLevel,
        annualMaxVHP,
        annualMaxEntlastung,
        hasManualEntlastung,
        usedVHP: vhp,
        usedEntlastung: elb,
        remainingVHP,
        remainingEntlastung,
        previousYearRemainingBudget,
        totalAvailableBudget,
        vhpPercent,
        entlastungPercent,
        hasBudgetWarning
    };
}

export function calculateClientAge(birthdate?: string): number | null {
    if (!birthdate) return null;
    try {
        const birthDate = new Date(birthdate);
        if (isNaN(birthDate.getTime())) return null;
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
        return calculatedAge;
    } catch {
        return null;
    }
}

export function safeFormatDate(val?: string): string {
    if (!val) return '—';
    const clean = val.trim().replace(' ', 'T');
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    }
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}.${match[2]}.${match[1]}`;
    return val.split(' ')[0];
}

export function formatCurrency(val: number): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val || 0);
}
