export function getCareLevel(level: any): number {
    return parseInt(String(level), 10) || 0;
}

export function getAnnualMaxVHP(careLevel: number): number {
    if (careLevel >= 2 && careLevel <= 5) return 3539;
    return 0;
}

export function getAnnualMaxEntlastung(careLevel: number): number {
    if (careLevel >= 1 && careLevel <= 5) return 1572;
    return 0;
}

export function calculateAppointmentCost(appointment: any, clientData: any): number {
    let appCost = 0;
    if (appointment.expand?.time_record) {
        for (const tr of appointment.expand.time_record) {
            if (tr.start && tr.end) {
                const diffMs = new Date(tr.end).getTime() - new Date(tr.start).getTime();
                if (diffMs > 0) appCost += (diffMs / 3600000) * (clientData.hourly_rate ?? 0);
            }
        }
    }
    if (appointment.expand?.drive_record) {
        for (const dr of appointment.expand.drive_record) {
            appCost += (dr.km ?? 0) * (clientData.km_rate ?? 0);
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

export function calculateUsedBudgets(
    client: any,
    invoices: any[],
    appointments: any[],
    currentYear: number
): { usedGemeinsamerJahresbetrag: number; usedEntlastungsleistungen: number } {
    let vhp = 0;
    let elb = 0;
    if (!client || !invoices || !appointments) {
        return { usedGemeinsamerJahresbetrag: 0, usedEntlastungsleistungen: 0 };
    }

    const clientInvoices = invoices.filter((inv) =>
        (Array.isArray(inv.client) ? inv.client.includes(client.id) : inv.client === client.id) &&
        inv.status === 'Abgeschlossen' &&
        (inv.issue_date ? new Date(inv.issue_date).getFullYear() === currentYear : false)
    );

    for (const inv of clientInvoices) {
        let invoiceAssigned = false;
        const invoiceTaxRate = parseFloat(inv.tax_rate || '0');

        for (const pos of (inv.table_positions || [])) {
            if (invoiceAssigned) break;
            const title = (pos.title || '').toLowerCase();

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

    const clientAppointments = appointments.filter((app) =>
        (Array.isArray(app.client) ? app.client.includes(client.id) : app.client === client.id) &&
        !app.settled &&
        app.status !== 'abgesagt' &&
        app.appointment &&
        new Date(app.appointment).getFullYear() === currentYear
    );

    for (const app of clientAppointments) {
        const cost = calculateAppointmentCost(app, client);
        const tasks: string[] = app.expand?.tasks?.map((t: any) => t.title.toLowerCase()) || [];

        let appointmentAssigned = false;
        if (tasks.some((t) => t.includes('verhinderungspflege') || t.includes('kurzzeitpflege'))) {
            vhp += cost;
            appointmentAssigned = true;
        } else if (!appointmentAssigned && tasks.some((t) => t.includes('entlastungsleistung') || t.includes('betreuungsleistung'))) {
            elb += cost;
        }
    }

    return { usedGemeinsamerJahresbetrag: vhp, usedEntlastungsleistungen: elb };
}

export function calculateAge(birthdate?: string): number | null {
    if (!birthdate) return null;
    try {
        const d = new Date(birthdate);
        if (isNaN(d.getTime())) return null;
        const today = new Date();
        let calculatedAge = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) calculatedAge--;
        return calculatedAge;
    } catch {
        return null;
    }
}

export function safeFormatDate(val?: string): string {
    if (!val) return '';
    const clean = val.trim().replace(' ', 'T');
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    }
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}.${match[2]}.${match[1]}`;
    return val.split(' ')[0];
}
