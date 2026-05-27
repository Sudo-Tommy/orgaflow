import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";

export function useDocumentGenerator() {
    let isLoading = $state(false);
    let errorMsg = $state("");
    let successMsg = $state("");
    let isRegenerating = $state(false);

    let step = $state(1);
    let selectedTemplateId = $state("");
    let selectedClientId = $state("");
    let recipientType = $state("client"); 
    let recipientId = $state("");
    let selectedAppointmentIds = $state<string[]>([]);
    let selectedCompanyId = $state<string>("all");
    let templateTypeFilter = $state<string>("all");

    let showBilledAppointments = $state(false);
    let hourlyWage = $state(40);
    let kmRate = $state(0.3);
    let taxRate = $state("0");

    let manualInvoiceNr = $state("");
    let generatedInvoiceId = $state<string | null>(null);
    let existingInvoiceId = $state<string | null>(null);
    let existingStatus = $state<string | null>(null);
    let existingPositions = $state<any[] | null>(null);
    let existingNetto = $state<number | null>(null);
    let existingTaxSum = $state<number | null>(null);
    let existingBrutto = $state<number | null>(null);
    
    function formatMoney(amount: number): string {
        return (amount || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    function getLocalDate() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function safeString(val: any, maxLength = 45) {
        let str = String(val ?? '').trim();
        if (!str) return ' ';
        return str.split(' ').map(w => w.length > maxLength ? w.match(new RegExp('.{1,' + maxLength + '}', 'g'))?.join(' ') || w : w).join(' ');
    }
    
    let manualIssueDate = $state(getLocalDate()); // YYYY-MM-DD

    function getNextInvoiceNumber() {
        const year = new Date().getFullYear();
        const invoices = orgaStore.invoices?.data || [];
        const currentUser = pb.authStore.record?.id || pb.authStore.model?.id;
        
        // Finde alle Rechnungen des aktuell eingeloggten Nutzers
        const userInvoices = invoices.filter((inv: any) => inv.user === currentUser || (Array.isArray(inv.user) && inv.user.includes(currentUser)));
        
        if (userInvoices.length > 0) {
            // Nach Erstellungsdatum absteigend sortieren
            userInvoices.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
            const lastInvoice = userInvoices[0];
            const lastNrStr = lastInvoice.invoice_nr || '';
            
            // Format 1: 01/2026 -> 02/2026
            const matchYearSuffix = lastNrStr.match(/^(.*?)(\d+)\/(\d{4})$/);
            if (matchYearSuffix) {
                const prefix = matchYearSuffix[1];
                const nrStr = matchYearSuffix[2];
                const yearStr = matchYearSuffix[3];
                
                const currentYearStr = year.toString();
                // Wenn das Jahr gewechselt hat, fangen wir wieder bei 1 an
                if (yearStr !== currentYearStr) {
                    return `${prefix}${'1'.padStart(nrStr.length, '0')}/${currentYearStr}`;
                }
                
                const nextNr = parseInt(nrStr, 10) + 1;
                const paddedNr = nextNr.toString().padStart(nrStr.length, '0');
                return `${prefix}${paddedNr}/${yearStr}`;
            } 
            
            // Format 2: RE-2026-001 -> RE-2026-002 (findet die LETZTE Zahl im String und erhöht sie)
            const matchLastNum = lastNrStr.match(/^(.*?)(\d+)(\D*)$/);
            if (matchLastNum) {
                const prefix = matchLastNum[1];
                const nrStr = matchLastNum[2];
                const suffix = matchLastNum[3];
                const nextNr = parseInt(nrStr, 10) + 1;
                const paddedNr = nextNr.toString().padStart(nrStr.length, '0');
                return `${prefix}${paddedNr}${suffix}`;
            }
            
            return lastNrStr;
        }

        // Fallback: Wenn der Nutzer noch keine Rechnung erstellt hat, wie bisher fortfahren
        let maxNr = 0;
        const currentCompanyId = company?.id;
        
        for (const inv of invoices) {
            if (currentCompanyId && inv.company !== currentCompanyId) continue;
            const match = (inv.invoice_nr || '').match(/^(\d+)\/(\d{4})$/);
            if (match && parseInt(match[2]) === year) {
                const nr = parseInt(match[1]);
                if (nr > maxNr) maxNr = nr;
            }
        }
        return `${(maxNr + 1).toString().padStart(2, '0')}/${year}`;
    }

    let template = $derived(orgaStore.document_templates?.data.find(t => t.id === selectedTemplateId));
    let client = $derived(orgaStore.clients?.data.find(c => c.id === selectedClientId));
    
    // Holt gezielt die Firma des aktuell eingeloggten Nutzers (Rechnungserstellers)
    let company = $derived.by(() => {
        if (selectedCompanyId && selectedCompanyId !== "all") {
            return orgaStore.company?.data.find((c: any) => c.id === selectedCompanyId) || orgaStore.company?.data[0];
        }
        const user = pb.authStore.record;
        if (!user || !user.company) return orgaStore.company?.data[0];
        const userCompanyId = Array.isArray(user.company) ? user.company[0] : user.company;
        return orgaStore.company?.data.find(c => c.id === userCompanyId) || orgaStore.company?.data[0];
    });

    // --- AUTO-FILL LOGIK FÜR KLIENTEN-KONDITIONEN ---
    let lastClient = "";
    $effect(() => {
        if (selectedClientId !== lastClient) {
            lastClient = selectedClientId;
            if (!isRegenerating) {
                const c = orgaStore.clients?.data.find(cl => cl.id === selectedClientId);
                if (c) {
                    hourlyWage = c.hourly_wage ?? 40;
                    kmRate = c.km_rate ?? 0.3;
                    taxRate = c.tax_rate != null ? c.tax_rate.toString() : "0";
                }
            }
        }
    });

    // Vorlagen filtern und den Timesheet-Template heraussuchen
    let availableTemplates = $derived((orgaStore.document_templates?.data || []).filter(t => {
        const tType = (t.type || '').toLowerCase();
        if (tType === 'arbeitszeitnachweis') return false;
        if (templateTypeFilter !== "all" && tType !== templateTypeFilter) return false;
        return true;
    }));
    let timesheetTemplate = $derived(orgaStore.document_templates?.data.find(t => (t.type || '').toLowerCase() === 'arbeitszeitnachweis'));

    let availableAppointments = $derived.by(() => {
        if (!selectedClientId || !orgaStore.appointments) return [];
        return orgaStore.appointments.data.filter((a: any) => {
            const isClient = Array.isArray(a.client) ? a.client.includes(selectedClientId) : a.client === selectedClientId;
            if (!isClient) return false;
            
            // "Termine Ohne Zeitnachweis in den tabellen ausblenden"
            const hasTime = a.expand?.time_record && a.expand.time_record.length > 0;
            if (!hasTime) return false;
            
            // Bereits abgerechnete Termine ausblenden, außer der Nutzer will sie sehen
            if (!showBilledAppointments && a.settled) {
                // Wenn der Termin bereits (z.B. aus Versehen) markiert ist, bleibt er trotzdem sichtbar
                if (!selectedAppointmentIds.includes(a.id)) return false;
            }

            return true;
        }).sort((a: any, b: any) => new Date(b.appointment).getTime() - new Date(a.appointment).getTime());
    });

    let isInvoice = $derived((template?.type || '').toLowerCase() === 'rechnung');
    let requiresAppointments = $derived((template?.type || '').toLowerCase() === 'rechnung' || (template?.type || '').toLowerCase() === 'arbeitszeitnachweis');

    let invoiceData = $derived.by(() => {
        if (!requiresAppointments || selectedAppointmentIds.length === 0) return null;
        const apps = availableAppointments.filter((a:any) => selectedAppointmentIds.includes(a.id));
        
        let service_period = "";
        if (apps.length > 0) {
            const periods = apps.map((a: any) => {
                if (!a.appointment) return "";
                const d = new Date(a.appointment);
                return d.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
            }).filter(Boolean);
            service_period = [...new Set(periods)].join(' & ');
        }

            const currentInvoiceNr = manualInvoiceNr || getNextInvoiceNumber();

        // 1 zu 1 Übernahme der exakten alten Rechnungspositionen und Summen
            if (isRegenerating && existingPositions && Array.isArray(existingPositions) && existingPositions.length > 0) {
                // Strikte Datentyp-Prüfung, um NaN Fehler im Backend (pdfkit-table) zu blockieren
                const sanitizedPositions = existingPositions.map((p: any) => ({
                pos: safeString(p.pos),
                date: safeString(p.date),
                duration: safeString(p.duration),
                title: safeString(p.title, 45),
                price: safeString(p.price),
                    total: Number(p.total) || 0,
                    itemType: String(p.itemType ?? '').trim() || ' '
                }));
                return { invoice_nr: currentInvoiceNr, netto: existingNetto || 0, tax_sum: existingTaxSum || 0, brutto: existingBrutto || 0, positions: sanitizedPositions, service_period, issue_date: manualIssueDate };
        }

        // Die Konfiguration aus dem Tabellen-Element der gewählten Vorlage holen
        let tableConf = template?.content_html?.fields?.find((f: any) => f.type === 'table')?.tableConfig || {};
        const includeTime = tableConf.includeTimeRecords !== false;
        const includeDriveKm = tableConf.includeDriveKm !== false;
        const includeDriveLumpSum = tableConf.includeDriveLumpSum !== false;
        const includeExp = tableConf.includeExpenditures !== false;

        let positions: any[] = [];
        let netto = 0;
        let posCounter = 1;

        for (const app of apps) {
            // Zeiterfassung berechnen
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
                    if (tableConf.staticDescription) {
                        titleDesc = replacePlaceholders(tableConf.staticDescription, false, {
                            invoice_nr: currentInvoiceNr,
                            service_period: service_period,
                            brutto: 0
                        });
                    } else if (app.expand?.tasks && app.expand.tasks.length > 0) {
                        titleDesc = app.expand.tasks.map((t:any) => t.title).join(', ');
                    } else {
                        titleDesc = app.description || 'Alltagshilfe';
                    }
                    positions.push({ pos: posCounter++, date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), duration: `${hours.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`, title: safeString(titleDesc), price: `${formatMoney(hourlyWage)} €`, total, itemType: 'time' });
                }
            }

            // Fahrten berechnen
            if (app.expand?.drive_record) {
                for (const dr of app.expand.drive_record) {
                    if (dr.lump_sum > 0 && includeDriveLumpSum) { 
                        netto += dr.lump_sum;
                        positions.push({ pos: posCounter++, date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), duration: "1", title: safeString(`Anfahrt`), price: `${formatMoney(dr.lump_sum)} €`, total: dr.lump_sum, itemType: 'drive_lump' });
                    }
                    if (dr.km > 0 && includeDriveKm) { 
                        let total = dr.km * kmRate;
                        netto += total;
                        positions.push({ pos: posCounter++, date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), duration: `${dr.km.toLocaleString('de-DE', { maximumFractionDigits: 2 })} km`, title: safeString(`Fahrtkosten (${dr.km.toLocaleString('de-DE', { maximumFractionDigits: 2 })} km)`), price: `${formatMoney(kmRate)} €`, total: total, itemType: 'drive_km' });
                    }
                }
            }

            // Sonderausgaben berechnen
            if (includeExp && app.expand?.expenditures) {
                for (const exp of app.expand.expenditures) {
                    if (exp.sum > 0) {
                        netto += exp.sum;
                        positions.push({ pos: posCounter++, date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), duration: "1", title: safeString(`Auslage: ${exp.titel}`), price: `${formatMoney(exp.sum)} €`, total: exp.sum, itemType: 'expenditure' });
                    }
                }
            }
        }

        const taxRateNum = parseFloat(taxRate) || 0;
        const taxSum = netto * (taxRateNum / 100);
        const brutto = netto + taxSum;

        return { invoice_nr: currentInvoiceNr, netto, tax_sum: taxSum, brutto, positions, service_period, issue_date: manualIssueDate };
    });

    let isInvoiceNrDuplicate = $derived.by(() => {
        if (!isInvoice || !invoiceData?.invoice_nr) return false;
        const nr = invoiceData.invoice_nr;
        const invoices = orgaStore.invoices?.data || [];
        // Prüfen, ob die Nummer bereits in einer Rechnung vergeben wurde
        return invoices.some((inv: any) => inv.invoice_nr === nr);
    });

    // Eigene Datenberechnung für den Zeitnachweis: Berücksichtigt jetzt korrekt die Schalter der Arbeitszeitnachweis-Vorlage
    let timesheetData = $derived.by(() => {
        if (!requiresAppointments || selectedAppointmentIds.length === 0) return null;
        const apps = availableAppointments.filter((a:any) => selectedAppointmentIds.includes(a.id));
        
        let tableConf = timesheetTemplate?.content_html?.fields?.find((f: any) => f.type === 'table')?.tableConfig || {};
        const includeTime = tableConf.includeTimeRecords !== false;
        const includeDriveKm = tableConf.includeDriveKm !== false;
        const includeDriveLumpSum = tableConf.includeDriveLumpSum !== false;
        const includeExp = tableConf.includeExpenditures !== false;

        let positions: any[] = [];
        let netto = 0;
        let posCounter = 1;

        const currentInvoiceNr = manualInvoiceNr || getNextInvoiceNumber();
        const currentServicePeriod = invoiceData ? invoiceData.service_period : "";

        for (const app of apps) {
            // Zeiterfassung berechnen
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
                    if (tableConf.staticDescription) {
                        titleDesc = replacePlaceholders(tableConf.staticDescription, true, {
                            invoice_nr: currentInvoiceNr,
                            service_period: currentServicePeriod,
                            brutto: 0
                        });
                    } else if (app.expand?.tasks && app.expand.tasks.length > 0) {
                        titleDesc = app.expand.tasks.map((t:any) => t.title).join(', ');
                    } else {
                        titleDesc = app.description || 'Alltagshilfe';
                    }
                    positions.push({ pos: posCounter++, date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), duration: `${hours.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`, title: safeString(titleDesc), price: `${formatMoney(hourlyWage)} €`, total, itemType: 'time' });
                }
            }

            // Fahrten berechnen
            if (app.expand?.drive_record) {
                for (const dr of app.expand.drive_record) {
                    if (dr.lump_sum > 0 && includeDriveLumpSum) { 
                        netto += dr.lump_sum;
                        positions.push({ pos: posCounter++, date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), duration: "1", title: safeString(`Anfahrt`), price: `${formatMoney(dr.lump_sum)} €`, total: dr.lump_sum, itemType: 'drive_lump' });
                    }
                    if (dr.km > 0 && includeDriveKm) { 
                        let total = dr.km * kmRate;
                        netto += total;
                        positions.push({ pos: posCounter++, date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), duration: `${dr.km.toLocaleString('de-DE', { maximumFractionDigits: 2 })} km`, title: safeString(`Fahrtkosten (${dr.km.toLocaleString('de-DE', { maximumFractionDigits: 2 })} km)`), price: `${formatMoney(kmRate)} €`, total: total, itemType: 'drive_km' });
                    }
                }
            }

            // Sonderausgaben berechnen
            if (includeExp && app.expand?.expenditures) {
                for (const exp of app.expand.expenditures) {
                    if (exp.sum > 0) {
                        netto += exp.sum;
                        positions.push({ pos: posCounter++, date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), duration: "1", title: safeString(`Auslage: ${exp.titel}`), price: `${formatMoney(exp.sum)} €`, total: exp.sum, itemType: 'expenditure' });
                    }
                }
            }
        }

        const taxRateNum = parseFloat(taxRate) || 0;
        const taxSum = netto * (taxRateNum / 100);
        const brutto = netto + taxSum;

        return { invoice_nr: currentInvoiceNr, netto, tax_sum: taxSum, brutto, positions, service_period: currentServicePeriod, issue_date: manualIssueDate };
    });

    function getRecipientData() {
        if (!client) return {};
        if (recipientType === 'client') return client;
        if (recipientType === 'caregiver') return client.expand?.caregiver || {};
        if (recipientType === 'contact') return client.expand?.contacts?.find((c: any) => c.id === recipientId) || {};
        if (recipientType === 'insurance') return client.expand?.insurance || {};
        if (recipientType === 'home') return client.expand?.retirement_homes?.find((h: any) => h.id === recipientId) || {};
        if (recipientType === 'inheritor') {
            const inheritors = Array.isArray(client.expand?.inheritor) ? client.expand.inheritor : (client.expand?.inheritor ? [client.expand.inheritor] : []);
            return inheritors.find((i: any) => i.id === recipientId) || inheritors[0] || {};
        }
        return client;
    }

    function replacePlaceholders(text: string, isTimesheet: boolean = false, overrideData?: any) {
        if (!text) return "";
        
        function safeFormatDate(val: string) {
            if (!val) return '';
            const clean = val.trim().replace(' ', 'T');
            const d = new Date(clean);
            if (!isNaN(d.getTime())) return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
            const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) return `${match[3]}.${match[2]}.${match[1]}`;
            return val.split(' ')[0];
        }

        let res = text.replace(/\n/g, '<br/>');
        let rec: any = getRecipientData() || {};
        const comp: any = company || {};
        const usr: any = pb.authStore.record || {};
        const ins: any = client?.expand?.insurance || {};

        let clientSignUrl = rec.sign ? pb.files.getURL(rec, rec.sign) : '';
        let userSignUrl = usr.sign ? pb.files.getURL(usr, usr.sign) : '';

        // Authentifizierungs-Token anhängen, damit fetch() nicht von PocketBase blockiert wird!
        if (clientSignUrl && pb.authStore.token) clientSignUrl += (clientSignUrl.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
        if (userSignUrl && pb.authStore.token) userSignUrl += (userSignUrl.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;

        const dueDate = new Date(new Date(manualIssueDate).getTime() + 14 * 24 * 60 * 60 * 1000);

        const dataToUse = overrideData || (isTimesheet ? timesheetData : invoiceData);

        let clientNameFirst = rec.name_first || rec.name || '';
        let clientNameLast = rec.name_last || '';
        let clientStreetHousenr = `${rec.street || ''} ${rec.housenr || ''}`.trim();
        let clientZipCity = `${rec.zip || ''} ${rec.city || ''}`.trim();
        
        let rawStreet = rec.street || '';
        let rawCity = rec.city || '';
        
        let addressSalutation = '';
        if (rec.salutation === 'Herr') {
            addressSalutation = 'Herr';
        } else if (rec.salutation === 'Frau') {
            addressSalutation = 'Frau';
        } else if (rec.salutation && rec.salutation !== 'Keine Angabe' && rec.salutation !== 'Divers') {
            addressSalutation = rec.salutation;
        }

        const cStatus = (client?.status || '').toLowerCase();
        if (cStatus === 'verstorben') {
            addressSalutation = '';
        }

        if (recipientType === 'inheritor' && client) {
            addressSalutation = '';
            clientNameFirst = client.name_first || '';
            clientNameLast = client.name_last || '';
            clientStreetHousenr = `c/o ${rec.name_first || ''} ${rec.name_last || ''}<br>${rec.street || ''} ${rec.housenr || ''}`.trim();
            rawStreet = `c/o ${rec.name_first || ''} ${rec.name_last || ''}<br>${rec.street || ''}`.trim();
            
            let city = rec.city || '';
            const otMatch = city.match(/\b(?:ot|o\.t\.|ortsteil)\b\s*(.*)/i);
            if (otMatch) {
                const mainCity = city.substring(0, otMatch.index).replace(/[\s,\-]+$/, '').replace(/\($/, '').trim();
                const otName = otMatch[1].replace(/^[,\-\s]+/, '').replace(/\)$/, '').trim();
                clientZipCity = `${rec.zip || ''} ${mainCity}<br>OT ${otName}`.trim();
                rawCity = `${mainCity}<br>OT ${otName}`.trim();
            } else {
                clientZipCity = `${rec.zip || ''} ${city}`.trim();
            }
        }

        const map: Record<string, string> = {
            '{{client.salutation}}': addressSalutation,
            '{{client.salutation_formal}}': rec.salutation === 'Herr' ? `Sehr geehrter Herr ${rec.name_last},` : (rec.salutation === 'Frau' ? `Sehr geehrte Frau ${rec.name_last},` : `Guten Tag ${rec.name_first} ${rec.name_last},`),
            '{{client.name_first}}': clientNameFirst,
            '{{client.name_last}}': clientNameLast,
            '{{client.street}} {{client.housenr}}': clientStreetHousenr,
            '{{client.zip}} {{client.city}}': clientZipCity,
            '{{client.company_name}}': rec.company_name || '',
            '{{client.addition}}': rec.company_name || '',
            '{{client.email}}': rec.email || '',
            '{{client.phone}}': rec.phone || '',
            '{{client.handy}}': rec.handy || '',
            '{{client.insurance_nr}}': rec.insurance_nr || '',
            '{{client.birthdate}}': safeFormatDate(rec.birthdate),
            '{{client.level_of_care}}': rec.level_of_care || '',
            '{{client.hourly_wage}}': formatMoney(client?.hourly_wage ?? 0),
            '{{client.km_rate}}': formatMoney(client?.km_rate ?? 0),
            '{{client.tax_rate}}': (client?.tax_rate ?? 0).toLocaleString('de-DE'),
            '{{client.signature}}': clientSignUrl ? `<img src="${clientSignUrl}" style="max-height: 60px; object-fit: contain;" crossorigin="anonymous" />` : '',
            
            '{{insurance.name}}': ins.name || '',
            '{{insurance.department}}': ins.department || '',
            '{{insurance.addition}}': ins.addition || '',
            '{{insurance.type}}': ins.type || '',
            '{{insurance.street}}': ins.street || '',
            '{{insurance.zip}} {{insurance.city}}': `${ins.zip || ''} ${ins.city || ''}`.trim(),
            '{{insurance.phone}}': ins.phone || '',
            '{{insurance.email}}': ins.email || '',
            
            '{{user.name_first}}': usr.name_first || '',
            '{{user.name_last}}': usr.name_last || '',
            '{{user.street}} {{user.housenr}}': `${usr.street || ''} ${usr.housenr || ''}`.trim(),
            '{{user.zip}} {{user.city}}': `${usr.zip || ''} ${usr.city || ''}`.trim(),
            '{{user.email}}': usr.email || '',
            '{{user.tel}}': usr.tel || '',
            '{{user.handy}}': usr.handy || '',
            '{{user.signature}}': userSignUrl ? `<img src="${userSignUrl}" style="max-height: 60px; object-fit: contain;" crossorigin="anonymous" />` : '',
            
            '{{company.name}}': comp.name || '',
            '{{company.street}} {{company.housenr}}': `${comp.street || ''} ${comp.housenr || ''}`.trim(),
            '{{company.zip}} {{company.city}}': `${comp.zip || ''} ${comp.city || ''}`.trim(),
            '{{company.email}}': comp.email || '',
            '{{company.website}}': comp.website || '',
            '{{company.number_telephone}}': comp.number_telephone || '',
            '{{company.number_mobile}}': comp.number_mobile || '',
            '{{company.vatcode}}': comp.vatcode || '',
            '{{company.ik_number}}': comp.ik_number || '',
            '{{company.bank_name}}': comp.bank_name || '',
            '{{company.bank_iban}}': comp.bank_iban || '',
            '{{company.bank_bic}}': comp.bank_bic || '',
            '{{date.today}}': new Date(manualIssueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }),
            '{{invoice.issue_date}}': new Date(manualIssueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }),
            '{{invoice.due_date}}': dueDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }),
            
            // Rückwärtskompatibilität für alte HTML-Vorlagen
            '{{anrede}}': rec.salutation === 'Herr' ? `Sehr geehrter Herr ${rec.name_last},` : (rec.salutation === 'Frau' ? `Sehr geehrte Frau ${rec.name_last},` : `Guten Tag ${rec.name_first} ${rec.name_last},`),
            '{{company_name}}': comp.name || '',
            '{{company_street}}': comp.street || '',
            '{{company_housenr}}': comp.housenr || '',
            '{{company_zip}}': comp.zip || '',
            '{{company_city}}': comp.city || '',
            '{{salutation}}': addressSalutation,
            '{{name_first}}': clientNameFirst,
            '{{name_last}}': clientNameLast,
            '{{street}}': rawStreet,
            '{{housenr}}': rec.housenr || '',
            '{{zip}}': rec.zip || '',
            '{{city}}': rawCity,
            '{{rechnungsdatum}}': new Date(manualIssueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }),
            
            // Rückwärtskompatibilität für alte User-Platzhalter
            '{{user_name_first}}': usr.name_first || '',
            '{{user_name_last}}': usr.name_last || '',
            '{{user_street}}': usr.street || '',
            '{{user_housenr}}': usr.housenr || '',
            '{{user_zip}}': usr.zip || '',
            '{{user_city}}': usr.city || '',
            '{{user_email}}': usr.email || '',
            '{{user_tel}}': usr.tel || '',
            '{{user_handy}}': usr.handy || ''
        };

        if (dataToUse) {
            map['{{invoice.number}}'] = dataToUse.invoice_nr || '';
            map['{{invoice.total}}'] = dataToUse.brutto ? `${formatMoney(dataToUse.brutto)} €` : '';
            map['{{rechnungs_nr}}'] = dataToUse.invoice_nr || '';
            map['{{invoice.service_period}}'] = dataToUse.service_period || '';
            map['{{leistungszeitraum}}'] = dataToUse.service_period || '';
        }

        for (const [key, val] of Object.entries(map)) {
            res = res.split(key).join(val);
        }
        return res;
    }

    function reset() {
        step = 1;
        selectedTemplateId = "";
        selectedClientId = "";
        recipientType = "client";
        recipientId = "";
        selectedAppointmentIds = [];
        showBilledAppointments = false;
        hourlyWage = 40;
        kmRate = 0.3;
        taxRate = "0";
        manualInvoiceNr = getNextInvoiceNumber();
        manualIssueDate = getLocalDate();
        generatedInvoiceId = null;
        existingInvoiceId = null;
        existingStatus = null;
        isRegenerating = false;
        existingPositions = null;
        existingNetto = null;
        existingTaxSum = null;
        existingBrutto = null;
        templateTypeFilter = "all";
    }

    return {
        get step() { return step; }, set step(v) { step = v; },
        get selectedCompanyId() { return selectedCompanyId; }, set selectedCompanyId(v) { selectedCompanyId = v; },
        get selectedTemplateId() { return selectedTemplateId; }, set selectedTemplateId(v) { selectedTemplateId = v; },
        get selectedClientId() { return selectedClientId; }, set selectedClientId(v) { selectedClientId = v; },
        get recipientType() { return recipientType; }, set recipientType(v) { recipientType = v; },
        get recipientId() { return recipientId; }, set recipientId(v) { recipientId = v; },
        get selectedAppointmentIds() { return selectedAppointmentIds; }, set selectedAppointmentIds(v) { selectedAppointmentIds = v; },
        get showBilledAppointments() { return showBilledAppointments; }, set showBilledAppointments(v) { showBilledAppointments = v; },
        get hourlyWage() { return hourlyWage; }, set hourlyWage(v) { hourlyWage = v; },
        get kmRate() { return kmRate; }, set kmRate(v) { kmRate = v; },
        get taxRate() { return taxRate; }, set taxRate(v) { taxRate = v; },
        get manualInvoiceNr() { return manualInvoiceNr; }, set manualInvoiceNr(v) { manualInvoiceNr = v; },
        get manualIssueDate() { return manualIssueDate; }, set manualIssueDate(v) { manualIssueDate = v; },
        get generatedInvoiceId() { return generatedInvoiceId; }, set generatedInvoiceId(v) { generatedInvoiceId = v; },
        get existingInvoiceId() { return existingInvoiceId; }, set existingInvoiceId(v) { existingInvoiceId = v; },
        get existingStatus() { return existingStatus; }, set existingStatus(v) { existingStatus = v; },
        get templateTypeFilter() { return templateTypeFilter; }, set templateTypeFilter(v) { templateTypeFilter = v; },
        get template() { return template; },
        get availableTemplates() { return availableTemplates; },
        get timesheetTemplate() { return timesheetTemplate; },
        get client() { return client; },
        get company() { return company; },
        get availableAppointments() { return availableAppointments; },
        get isInvoice() { return isInvoice; },
        get requiresAppointments() { return requiresAppointments; },
        get invoiceData() { return invoiceData; },
        get timesheetData() { return timesheetData; },
        get isInvoiceNrDuplicate() { return isInvoiceNrDuplicate; },
        get isLoading() { return isLoading; }, set isLoading(v) { isLoading = v; },
        get isRegenerating() { return isRegenerating; }, set isRegenerating(v) { isRegenerating = v; },
        get errorMsg() { return errorMsg; }, set errorMsg(v) { errorMsg = v; },
        get successMsg() { return successMsg; }, set successMsg(v) { successMsg = v; },
        get existingPositions() { return existingPositions; }, set existingPositions(v) { existingPositions = v; },
        get existingNetto() { return existingNetto; }, set existingNetto(v) { existingNetto = v; },
        get existingTaxSum() { return existingTaxSum; }, set existingTaxSum(v) { existingTaxSum = v; },
        get existingBrutto() { return existingBrutto; }, set existingBrutto(v) { existingBrutto = v; },
        replacePlaceholders, 
        safeString,
        reset
    };
}