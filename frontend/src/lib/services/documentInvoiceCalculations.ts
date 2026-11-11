import { getAppointmentTasks } from '$lib/components/calendar/calendarUtils';
import { isPartialAppointment, buildPartialAppointmentPosition } from './documentPartialAppointmentHelper';

export function formatMoney(amount: number): string {
    return (amount || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getLocalDate(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function safeString(val: any, maxLength = 45): string {
    let str = String(val ?? '').trim();
    if (!str) return ' ';
    return str.split(' ').map(w => w.length > maxLength ? w.match(new RegExp('.{1,' + maxLength + '}', 'g'))?.join(' ') || w : w).join(' ');
}

export function cleanTaskTitle(title: string): string {
    if (!title) return '';
    return title
        .replace(/Eink[u\uFFFD]fe/g, 'Einkäufe').replace(/Caf[\-\uFFFD\-]+/g, 'Café-')
        .replace(/T[t\uFFFD]tigkeiten/g, 'Tätigkeiten').replace(/Fu[\uFFFD]?pflege/g, 'Fußpflege')
        .replace(/Ausfl[u\uFFFD]ge\/Spazierg[a\uFFFD]nge/g, 'Ausflüge/Spaziergänge')
        .replace(/K[h\uFFFD]lungsborn/g, 'Kühlungsborn').replace(/fr\b/g, 'für')
        .replace(/Station[a\uFFFD]re/g, 'stationäre').replace(/Orthop[a\uFFFD]dieschuhmacher/g, 'Orthopädieschuhmacher')
        .replace(/[A\uFFFD]mter/g, 'Ämter').replace(/Beh[o\uFFFD]rdeng[a\uFFFD]ngen/g, 'Behördengängen')
        .replace(/Kassenk[u\uFFFD]rzung/g, 'Kassenkürzung').replace(/[U\uFFFD]berweisungsmanagement/g, 'Überweisungsmanagement')
        .replace(/\uFFFD/g, 'ä').trim();
}

export function getNextInvoiceNumber(invoices: any[], currentUser?: string, companyId?: string): string {
    const year = new Date().getFullYear();
    const userInvoices = currentUser
        ? (invoices || []).filter((inv: any) => inv.user === currentUser || (Array.isArray(inv.user) && inv.user.includes(currentUser)))
        : [];

    if (userInvoices.length > 0) {
        userInvoices.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
        const lastInvoice = userInvoices[0];
        const lastNrStr = lastInvoice.invoice_nr || '';
        const matchYearSuffix = lastNrStr.match(/^(.*?)(\d+)\/(\d{4})$/);
        if (matchYearSuffix) {
            const prefix = matchYearSuffix[1], nrStr = matchYearSuffix[2], yearStr = matchYearSuffix[3];
            const currentYearStr = year.toString();
            if (yearStr !== currentYearStr) return `${prefix}${'1'.padStart(nrStr.length, '0')}/${currentYearStr}`;
            return `${prefix}${(parseInt(nrStr, 10) + 1).toString().padStart(nrStr.length, '0')}/${yearStr}`;
        }
        const matchLastNum = lastNrStr.match(/^(.*?)(\d+)(\D*)$/);
        if (matchLastNum) {
            const prefix = matchLastNum[1], nrStr = matchLastNum[2], suffix = matchLastNum[3];
            return `${prefix}${(parseInt(nrStr, 10) + 1).toString().padStart(nrStr.length, '0')}${suffix}`;
        }
        return lastNrStr;
    }

    let maxNr = 0;
    for (const inv of (invoices || [])) {
        if (companyId && inv.company !== companyId) continue;
        const match = (inv.invoice_nr || '').match(/^(\d+)\/(\d{4})$/);
        if (match && parseInt(match[2]) === year) {
            const nr = parseInt(match[1]);
            if (nr > maxNr) maxNr = nr;
        }
    }
    return `${(maxNr + 1).toString().padStart(2, '0')}/${year}`;
}

export function computeServicePeriod(apps: any[], manualIssueDate?: string): string {
    if (apps.length > 0) {
        const periods = apps.map((a: any) => {
            if (!a.appointment) return "";
            return new Date(a.appointment).toLocaleString('de-DE', { month: 'long', year: 'numeric' });
        }).filter(Boolean);
        return [...new Set(periods)].join(' & ');
    }
    if (manualIssueDate) {
        return new Date(manualIssueDate).toLocaleString('de-DE', { month: 'long', year: 'numeric' });
    }
    return "";
}

export function filterPositionsForTimesheet(positions: any[]): any[] {
    return (positions || []).filter((p: any) => {
        const itemType = String(p.itemType || '').toLowerCase();
        if (itemType.includes('drive') || itemType.includes('km') || itemType.includes('expenditure')) return false;
        const title = String(p.title || p.description || '').toLowerCase();
        if (/anfahrt|kilometer|fahrtkosten|fahrtpauschale|\bkm\b/i.test(title)) return false;
        return true;
    }).map((p, idx) => ({ ...p, pos: idx + 1 }));
}

export function buildPositionsFromAppointments(
    apps: any[],
    tableConf: any,
    hourlyWage: number,
    kmRate: number,
    onTitleResolve: (desc: string) => string,
    isTimesheet: boolean = false
): { positions: any[]; netto: number } {
    const includeTime = tableConf?.includeTimeRecords !== false;
    const includeDriveKm = tableConf?.includeDriveKm !== false;
    const includeDriveLumpSum = tableConf?.includeDriveLumpSum !== false;
    const includeExp = tableConf?.includeExpenditures !== false;

    let positions: any[] = [];
    let netto = 0;
    let posCounter = 1;
    const showPriceUnits = tableConf?.showPriceUnits !== false;
    const effectiveMode = isTimesheet
        ? (tableConf?.descriptionMode === 'appointment_desc' || tableConf?.descriptionMode === 'appointment_title' ? tableConf.descriptionMode : 'appointment_tasks')
        : (tableConf?.descriptionMode || 'appointment_title');

    for (const app of apps) {
        if (!isTimesheet && isPartialAppointment(app)) {
            const partialPos = buildPartialAppointmentPosition(app, posCounter++);
            positions.push(partialPos);
            netto += partialPos.total;
            continue;
        }
        if (includeTime) {
            let appTimeMins = 0;
            if (app.expand?.time_record) {
                for (const tr of app.expand.time_record) {
                    if (tr.start && tr.end) {
                        const diffMs = new Date(tr.end as string).getTime() - new Date(tr.start as string).getTime();
                        if (diffMs > 0) appTimeMins += Math.round(diffMs / 60000);
                    }
                }
            }
            if (appTimeMins > 0) {
                const hours = appTimeMins / 60;
                const total = hours * hourlyWage;
                netto += total;
                let titleDesc = "";
                if (effectiveMode === 'static') {
                    titleDesc = onTitleResolve(tableConf?.staticDescription || '');
                } else if (effectiveMode === 'appointment_tasks') {
                    const tasks = getAppointmentTasks(app);
                    const taskTitles = (tasks || []).map((t: any) => cleanTaskTitle(t.title || t.name)).filter(Boolean);
                    titleDesc = taskTitles.length > 0 ? taskTitles.join(', ') : (app.description || app.title || 'Alltagshilfe');
                } else if (effectiveMode === 'appointment_title' || effectiveMode === 'appointment') {
                    titleDesc = app.title || app.description || 'Alltagshilfe';
                } else if (effectiveMode === 'appointment_desc') {
                    titleDesc = app.description || app.title || 'Alltagshilfe';
                } else if (tableConf?.staticDescription) {
                    titleDesc = onTitleResolve(tableConf.staticDescription);
                } else {
                    titleDesc = app.description || app.title || 'Alltagshilfe';
                }
                positions.push({
                    pos: posCounter++,
                    date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                    duration: `${hours.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`,
                    title: safeString(titleDesc),
                    price: showPriceUnits ? `${formatMoney(hourlyWage)} €/Std.` : `${formatMoney(hourlyWage)} €`,
                    total,
                    itemType: 'time'
                });
            }
        }

        // Fahrtkosten nur in Rechnungen, strikt ausnahmslos NICHT im Arbeitszeitnachweis
        if (!isTimesheet && app.expand?.drive_record) {
            for (const dr of app.expand.drive_record) {
                if (dr.lump_sum > 0 && includeDriveLumpSum) {
                    netto += dr.lump_sum;
                    positions.push({
                        pos: posCounter++,
                        date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                        duration: "1",
                        title: safeString('Anfahrt'),
                        price: `${formatMoney(dr.lump_sum)} €`,
                        total: dr.lump_sum,
                        itemType: 'drive_lump'
                    });
                }
                if (dr.km > 0 && includeDriveKm) {
                    const total = dr.km * kmRate;
                    netto += total;
                    positions.push({
                        pos: posCounter++,
                        date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                        duration: `${dr.km.toLocaleString('de-DE', { maximumFractionDigits: 2 })} km`,
                        title: safeString(`Fahrtkosten (${dr.km.toLocaleString('de-DE', { maximumFractionDigits: 2 })} km)`),
                        price: showPriceUnits ? `${formatMoney(kmRate)} €/km` : `${formatMoney(kmRate)} €`,
                        total,
                        itemType: 'drive_km'
                    });
                }
            }
        }

        // Auslagen ebenfalls nur auf der Rechnung, nicht im reinen Arbeitszeitnachweis
        if (!isTimesheet && includeExp && app.expand?.expenditures) {
            for (const exp of app.expand.expenditures) {
                if (exp.sum > 0) {
                    netto += exp.sum;
                    positions.push({
                        pos: posCounter++,
                        date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                        duration: "1",
                        title: safeString(`Auslage: ${exp.titel}`),
                        price: `${formatMoney(exp.sum)} €`,
                        total: exp.sum,
                        itemType: 'expenditure'
                    });
                }
            }
        }
    }

    if (isTimesheet) {
        positions = filterPositionsForTimesheet(positions);
        netto = positions.reduce((acc, p) => acc + (p.total || 0), 0);
    }

    return { positions, netto };
}

export function sanitizeExistingPositions(existingPositions: any[], manualIssueDate?: string): any[] {
    return (existingPositions || []).map((p: any, idx: number) => {
        const totalNum = Number(p.total) || (Number(p.price) || 0);
        const priceFormatted = p.price != null
            ? (typeof p.price === 'number' ? formatMoney(p.price) + ' €' : String(p.price))
            : (formatMoney(totalNum) + ' €');
        return {
            pos: safeString(p.pos ?? (idx + 1)),
            date: safeString(p.date || (manualIssueDate ? new Date(manualIssueDate).toLocaleDateString('de-DE') : '')),
            duration: safeString(p.duration || (p.quantity != null ? String(p.quantity) : '1,00')),
            title: safeString(p.title || p.description, 60),
            price: safeString(priceFormatted),
            total: totalNum,
            itemType: String(p.itemType ?? '').trim() || ' '
        };
    });
}
