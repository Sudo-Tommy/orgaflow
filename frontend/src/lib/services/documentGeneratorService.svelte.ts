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
    // Admin: Im Namen eines anderen Nutzers generieren (leer = eigener Account)
    let onBehalfOfUserId = $state<string>("");

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

    // Effektiver Nutzer-Kontext: entweder eigener Account oder der gewählte "Im Namen von"-Nutzer
    let effectiveUser = $derived.by(() => {
        if (onBehalfOfUserId) {
            return (orgaStore.users?.data as any[])?.find((u: any) => u.id === onBehalfOfUserId) || pb.authStore.model || pb.authStore.record || {};
        }
        return pb.authStore.model || pb.authStore.record || {};
    });

    // Klienten gefiltert auf den effektiven Nutzer
    let availableClients = $derived.by(() => {
        const allClients = orgaStore.clients?.data || [];
        if (!onBehalfOfUserId) return allClients;
        return allClients.filter((c: any) => {
            if (c.id === selectedClientId) return true;
            const emp = Array.isArray(c.assigned_employee) ? c.assigned_employee : (c.assigned_employee ? [c.assigned_employee] : []);
            return emp.includes(onBehalfOfUserId);
        });
    });

    let client = $derived(orgaStore.clients?.data.find(c => c.id === selectedClientId));

    // Firma: Wenn im Namen von, Firma des Ziel-Nutzers bevorzugen
    let company = $derived.by(() => {
        if (selectedCompanyId && selectedCompanyId !== "all") {
            return orgaStore.company?.data.find((c: any) => c.id === selectedCompanyId) || orgaStore.company?.data[0];
        }
        const user: any = effectiveUser;
        if (!user || !user.company) return orgaStore.company?.data[0];
        const userCompanyId = Array.isArray(user.company) ? user.company[0] : user.company;
        return orgaStore.company?.data.find((c: any) => c.id === userCompanyId) || orgaStore.company?.data[0];
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

            // Wenn im Namen von: nur Termine des Ziel-Nutzers
            if (onBehalfOfUserId) {
                const apptUser = Array.isArray(a.user) ? a.user : (a.user ? [a.user] : []);
                if (!apptUser.includes(onBehalfOfUserId)) return false;
            }

            // Termine ohne Zeitnachweis ausblenden
            const hasTime = a.expand?.time_record && a.expand.time_record.length > 0;
            if (!hasTime) return false;

            // Bereits abgerechnete Termine ausblenden
            if (!showBilledAppointments && a.settled) {
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

        // Resiliente Regex-Ersetzung: fängt {key}}, {{key}}, {{ key }} etc. ab
        function escapeRegex(s: string) {
            return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        function applyReplacement(src: string, key: string, value: string): string {
            if (src.includes(key)) {
                src = src.split(key).join(value);
            }
            const inner = escapeRegex(key.replace(/^\{\{/, '').replace(/\}\}$/, ''));
            const re = new RegExp('\\{\\{?\\s*' + inner + '\\s*\\}\\}?', 'g');
            return src.replace(re, value);
        }

        let res = text.replace(/\n/g, '<br/>');

        // rec = Empfänger (Adressfeld-Briefkopf), cl = immer echter Klient
        // usr = effektiver Nutzer (eingeloggt ODER gewählter "Im Namen von"-Nutzer)
        const rec: any = getRecipientData() || {};
        const cl: any = client || {};
        const comp: any = company || {};
        const usr: any = (onBehalfOfUserId ? effectiveUser : null) || pb.authStore.record || {};
        const ins: any = cl.expand?.insurance || {};

        // --- URLs ---
        let clSignUrl = cl.sign ? pb.files.getURL(cl, cl.sign) : '';
        let userSignUrl = usr.sign ? pb.files.getURL(usr, usr.sign) : '';
        if (clSignUrl && pb.authStore.token) clSignUrl += (clSignUrl.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
        if (userSignUrl && pb.authStore.token) userSignUrl += (userSignUrl.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;

        const dueDate = new Date(new Date(manualIssueDate).getTime() + 14 * 24 * 60 * 60 * 1000);

        // date.today_+1y
        const issueDateObj = new Date(manualIssueDate + 'T00:00:00Z');
        const plusOneYear = new Date(issueDateObj);
        plusOneYear.setUTCFullYear(plusOneYear.getUTCFullYear() + 1);
        const dateToday1y = plusOneYear.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
        const dateTodayStr = issueDateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

        const dataToUse = overrideData || (isTimesheet ? timesheetData : invoiceData);

        // --- Empfänger-Adressblock (für Briefkopf) ---
        let recNameFirst = rec.name_first || rec.name || '';
        let recNameLast = rec.name_last || '';
        let recRawStreet = rec.street || '';
        let recRawCity = rec.city || '';
        let addressSalutation = '';
        if (rec.salutation === 'Herr') addressSalutation = 'Herr';
        else if (rec.salutation === 'Frau') addressSalutation = 'Frau';
        else if (rec.salutation && rec.salutation !== 'Keine Angabe' && rec.salutation !== 'Divers') addressSalutation = rec.salutation;

        const cStatus = (cl?.status || '').toLowerCase();
        if (cStatus === 'verstorben') addressSalutation = '';

        if (recipientType === 'inheritor' && cl) {
            addressSalutation = '';
            recNameFirst = cl.name_first || '';
            recNameLast = cl.name_last || '';
            recRawStreet = `c/o ${rec.name_first || ''} ${rec.name_last || ''}<br>${rec.street || ''}`.trim();
            const city = rec.city || '';
            const otMatch = city.match(/\b(?:ot|o\.t\.|ortsteil)\b\s*(.*)/i);
            if (otMatch) {
                const mainCity = city.substring(0, otMatch.index).replace(/[\s,\-]+$/, '').replace(/\($/, '').trim();
                const otName = (otMatch[1] || '').replace(/^[,\-\s]+/, '').replace(/\)$/, '').trim();
                recRawCity = `${mainCity}<br>OT ${otName}`.trim();
            } else {
                recRawCity = city;
            }
        }

        // --- Klient (IMMER aus cl, unabhängig vom Empfänger-Typ) ---
        const clSalMap = (sal: string) => sal === 'Herr' ? 'Herr' : (sal === 'Frau' ? 'Frau' : (sal && sal !== 'Keine Angabe' && sal !== 'Divers' ? sal : ''));
        const clSalutation = cStatus === 'verstorben' ? '' : clSalMap(cl.salutation || '');
        const clFormal = cl.salutation === 'Herr'
            ? `Sehr geehrter Herr ${cl.name_last || ''},`
            : (cl.salutation === 'Frau' ? `Sehr geehrte Frau ${cl.name_last || ''},` : `Guten Tag ${cl.name_first || ''} ${cl.name_last || ''},`);

        // --- Pflegeperson/Erbe ---
        const cpInfo: any = cl?.inheritor_info || {};
        const inheritorContact: any = cl?.expand?.inheritor
            ? (Array.isArray(cl.expand.inheritor) ? cl.expand.inheritor[0] : cl.expand.inheritor) : {};
        let inheritorSignUrl = inheritorContact.sign ? pb.files.getURL(inheritorContact, inheritorContact.sign) : '';
        if (inheritorSignUrl && pb.authStore.token) inheritorSignUrl += (inheritorSignUrl.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
        const cpName = cpInfo.name || `${inheritorContact.name_first || ''} ${inheritorContact.name_last || ''}`.trim();
        const cpNameFirst = cpName ? cpName.split(' ')[0] : (inheritorContact.name_first || '');
        const cpNameLast = cpName ? cpName.split(' ').slice(1).join(' ') : (inheritorContact.name_last || '');
        const cpRelation = cpInfo.relation || inheritorContact.company_name || '';
        const cpBirthdate = cpInfo.birthdate ? safeFormatDate(cpInfo.birthdate) : (inheritorContact.birthdate ? safeFormatDate(inheritorContact.birthdate) : '');
        const cpStreet = cpInfo.street || inheritorContact.street || '';
        const cpHousenr = cpInfo.housenr || inheritorContact.housenr || '';
        const cpZip = cpInfo.zip || inheritorContact.zip || '';
        const cpCity = cpInfo.city || inheritorContact.city || '';
        const cpPhone = cpInfo.phone || inheritorContact.phone || '';
        const cpEmail = cpInfo.email || inheritorContact.email || '';
        const cpReason = cpInfo.reason || 'Erholungsurlaub';
        const cpCareType = cpInfo.care_type === 'tageweise' ? 'Tageweise (> 8 Stunden)' : 'Stundenweise (< 8 Stunden)';
        const cpPreCare = cpInfo.pre_care_fulfilled !== false ? 'Ja (mind. 6 Monate häusliche Pflege erbracht)' : 'Nein';
        const cpSigImg = inheritorSignUrl ? `<img src="${inheritorSignUrl}" style="max-height: 60px; object-fit: contain;" crossorigin="anonymous" />` : '';

        // --- Betreuer ---
        const caregiverRaw: any = (Array.isArray(cl.expand?.caregiver) ? cl.expand.caregiver[0] : cl.expand?.caregiver) || {};
        let cgSignUrl = caregiverRaw.sign ? pb.files.getURL(caregiverRaw, caregiverRaw.sign) : '';
        if (cgSignUrl && pb.authStore.token) cgSignUrl += (cgSignUrl.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;

        // --- Kontakt ---
        const contactRaw: any = (Array.isArray(cl.expand?.contacts) ? cl.expand.contacts[0] : cl.expand?.contacts) || {};
        let contactSignUrl = contactRaw.sign ? pb.files.getURL(contactRaw, contactRaw.sign) : '';
        if (contactSignUrl && pb.authStore.token) contactSignUrl += (contactSignUrl.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;

        // =================================================================
        // MAP: Array (Combined Keys VOR Einzelkeys)
        // =================================================================
        const map: Array<[string, string]> = [
            // Careperson / Pflegeperson
            ['{{careperson.street}} {{careperson.housenr}}', `${cpStreet} ${cpHousenr}`.trim()],
            ['{{careperson.zip}} {{careperson.city}}',       `${cpZip} ${cpCity}`.trim()],
            ['{{careperson.name}}',       cpName],
            ['{{careperson.name_first}}', cpNameFirst],
            ['{{careperson.name_last}}',  cpNameLast],
            ['{{careperson.salutation}}', inheritorContact.salutation || 'Herr/Frau'],
            ['{{careperson.relation}}',   cpRelation],
            ['{{careperson.birthdate}}',  cpBirthdate],
            ['{{careperson.street}}',     cpStreet],
            ['{{careperson.housenr}}',    cpHousenr],
            ['{{careperson.zip}}',        cpZip],
            ['{{careperson.city}}',       cpCity],
            ['{{careperson.phone}}',      cpPhone],
            ['{{careperson.email}}',      cpEmail],
            ['{{careperson.reason}}',     cpReason],
            ['{{careperson.care_type}}',  cpCareType],
            ['{{careperson.pre_care}}',   cpPreCare],
            ['{{careperson.notes}}',      cpInfo.notes || ''],
            ['{{careperson.signature}}',  cpSigImg],
            // Inheritor (Alias)
            ['{{inheritor.street}} {{inheritor.housenr}}', `${cpStreet} ${cpHousenr}`.trim()],
            ['{{inheritor.zip}} {{inheritor.city}}',       `${cpZip} ${cpCity}`.trim()],
            ['{{inheritor.salutation}}',   inheritorContact.salutation || ''],
            ['{{inheritor.name_first}}',   cpNameFirst],
            ['{{inheritor.name_last}}',    cpNameLast],
            ['{{inheritor.company_name}}', cpRelation],
            ['{{inheritor.street}}',       cpStreet],
            ['{{inheritor.housenr}}',      cpHousenr],
            ['{{inheritor.zip}}',          cpZip],
            ['{{inheritor.city}}',         cpCity],
            ['{{inheritor.phone}}',        cpPhone],
            ['{{inheritor.email}}',        cpEmail],
            ['{{inheritor.signature}}',    cpSigImg],
            // Client (IMMER echte Klientendaten)
            ['{{client.street}} {{client.housenr}}', `${cl.street || ''} ${cl.housenr || ''}`.trim()],
            ['{{client.zip}} {{client.city}}',       `${cl.zip || ''} ${cl.city || ''}`.trim()],
            ['{{client.salutation}}',        clSalutation],
            ['{{client.salutation_formal}}', clFormal],
            ['{{client.name_first}}',        cl.name_first || ''],
            ['{{client.name_last}}',         cl.name_last || ''],
            ['{{client.street}}',            cl.street || ''],
            ['{{client.housenr}}',           cl.housenr || ''],
            ['{{client.zip}}',               cl.zip || ''],
            ['{{client.city}}',              cl.city || ''],
            ['{{client.company_name}}',      cl.company_name || ''],
            ['{{client.addition}}',          cl.company_name || ''],
            ['{{client.email}}',             cl.email || ''],
            ['{{client.phone}}',             cl.phone || ''],
            ['{{client.handy}}',             cl.handy || ''],
            ['{{client.insurance_nr}}',      cl.insurance_nr || ''],
            ['{{client.birthdate}}',         safeFormatDate(cl.birthdate)],
            ['{{client.level_of_care}}',     cl.level_of_care || ''],
            ['{{client.hourly_wage}}',       formatMoney(cl?.hourly_wage ?? 0)],
            ['{{client.km_rate}}',           formatMoney(cl?.km_rate ?? 0)],
            ['{{client.tax_rate}}',          (cl?.tax_rate ?? 0).toLocaleString('de-DE')],
            ['{{client.signature}}',         clSignUrl ? `<img src="${clSignUrl}" style="max-height: 60px; object-fit: contain;" crossorigin="anonymous" />` : ''],
            // Insurance
            ['{{insurance.zip}} {{insurance.city}}', `${ins.zip || ''} ${ins.city || ''}`.trim()],
            ['{{insurance.name}}',       ins.name || ''],
            ['{{insurance.department}}', ins.department || ''],
            ['{{insurance.addition}}',   ins.addition || ''],
            ['{{insurance.type}}',       ins.type || ''],
            ['{{insurance.street}}',     ins.street || ''],
            ['{{insurance.zip}}',        ins.zip || ''],
            ['{{insurance.city}}',       ins.city || ''],
            ['{{insurance.phone}}',      ins.phone || ''],
            ['{{insurance.email}}',      ins.email || ''],
            // Caregiver / Betreuer
            ['{{caregiver.street}} {{caregiver.housenr}}', `${caregiverRaw.street || ''} ${caregiverRaw.housenr || ''}`.trim()],
            ['{{caregiver.zip}} {{caregiver.city}}',       `${caregiverRaw.zip || ''} ${caregiverRaw.city || ''}`.trim()],
            ['{{caregiver.salutation}}',   caregiverRaw.salutation || ''],
            ['{{caregiver.name_first}}',   caregiverRaw.name_first || ''],
            ['{{caregiver.name_last}}',    caregiverRaw.name_last || ''],
            ['{{caregiver.company_name}}', caregiverRaw.company_name || ''],
            ['{{caregiver.street}}',       caregiverRaw.street || ''],
            ['{{caregiver.housenr}}',      caregiverRaw.housenr || ''],
            ['{{caregiver.zip}}',          caregiverRaw.zip || ''],
            ['{{caregiver.city}}',         caregiverRaw.city || ''],
            ['{{caregiver.phone}}',        caregiverRaw.phone || caregiverRaw.handy || ''],
            ['{{caregiver.email}}',        caregiverRaw.email || ''],
            ['{{caregiver.signature}}',    cgSignUrl ? `<img src="${cgSignUrl}" style="max-height: 60px; object-fit: contain;" crossorigin="anonymous" />` : ''],
            // Contact / Kontakt
            ['{{contact.street}} {{contact.housenr}}', `${contactRaw.street || ''} ${contactRaw.housenr || ''}`.trim()],
            ['{{contact.zip}} {{contact.city}}',       `${contactRaw.zip || ''} ${contactRaw.city || ''}`.trim()],
            ['{{contact.name_first}}',   contactRaw.name_first || ''],
            ['{{contact.name_last}}',    contactRaw.name_last || ''],
            ['{{contact.company_name}}', contactRaw.company_name || ''],
            ['{{contact.street}}',       contactRaw.street || ''],
            ['{{contact.housenr}}',      contactRaw.housenr || ''],
            ['{{contact.zip}}',          contactRaw.zip || ''],
            ['{{contact.city}}',         contactRaw.city || ''],
            ['{{contact.phone}}',        contactRaw.phone || contactRaw.handy || ''],
            ['{{contact.email}}',        contactRaw.email || ''],
            ['{{contact.signature}}',    contactSignUrl ? `<img src="${contactSignUrl}" style="max-height: 60px; object-fit: contain;" crossorigin="anonymous" />` : ''],
            // User / Mitarbeiter
            ['{{user.street}} {{user.housenr}}', `${usr.street || ''} ${usr.housenr || ''}`.trim()],
            ['{{user.zip}} {{user.city}}',       `${usr.zip || ''} ${usr.city || ''}`.trim()],
            ['{{user.name_first}}', usr.name_first || ''],
            ['{{user.name_last}}',  usr.name_last || ''],
            ['{{user.street}}',     usr.street || ''],
            ['{{user.housenr}}',    usr.housenr || ''],
            ['{{user.zip}}',        usr.zip || ''],
            ['{{user.city}}',       usr.city || ''],
            ['{{user.email}}',      usr.email || ''],
            ['{{user.tel}}',        usr.tel || ''],
            ['{{user.phone}}',      usr.tel || usr.phone || ''],
            ['{{user.mobile}}',     usr.handy || ''],
            ['{{user.handy}}',      usr.handy || ''],
            ['{{user.signature}}',  userSignUrl ? `<img src="${userSignUrl}" style="max-height: 60px; object-fit: contain;" crossorigin="anonymous" />` : ''],
            // Company / Firma
            ['{{company.return_address_line}}', `${comp.name || ''} • ${comp.street || ''} ${comp.housenr || ''} • ${comp.zip || ''} ${comp.city || ''}`.trim()],
            ['{{company.street}} {{company.housenr}}', `${comp.street || ''} ${comp.housenr || ''}`.trim()],
            ['{{company.zip}} {{company.city}}',       `${comp.zip || ''} ${comp.city || ''}`.trim()],
            ['{{company.name}}',             comp.name || ''],
            ['{{company.street}}',           comp.street || ''],
            ['{{company.housenr}}',          comp.housenr || ''],
            ['{{company.zip}}',              comp.zip || ''],
            ['{{company.city}}',             comp.city || ''],
            ['{{company.email}}',            comp.email || ''],
            ['{{company.website}}',          comp.website || ''],
            ['{{company.number_telephone}}', comp.number_telephone || ''],
            ['{{company.number_mobile}}',    comp.number_mobile || ''],
            ['{{company.phone}}',            comp.number_telephone || ''],
            ['{{company.mobile}}',           comp.number_mobile || ''],
            ['{{company.vatcode}}',          comp.vatcode || ''],
            ['{{company.ik_number}}',        comp.ik_number || ''],
            ['{{company.bank_name}}',        comp.bank_name || ''],
            ['{{company.bank_iban}}',        comp.bank_iban || ''],
            ['{{company.bank_bic}}',         comp.bank_bic || ''],
            ['{{company.iban}}',             comp.bank_iban || ''],
            ['{{company.bic}}',              comp.bank_bic || ''],
            ['{{company.bank}}',             comp.bank_name || ''],
            // Gesetzes-Paragraphen & Budgets nach SGB XI
            ['{{paragraph.39}}', '§ 39 SGB XI - Häusliche Pflege bei Verhinderung der Pflegeperson (Verhinderungspflege)'],
            ['{{paragraph.45b}}', '§ 45b SGB XI - Entlastungsbetrag zur Unterstützung im Alltag (125,00 € monatlich)'],
            ['{{careperson.budget_39}}', '1.612,00 €'],
            ['{{client.budget_45b}}', '125,00 €'],
            // Datum & Jahr (date.today_+1y VOR date.today)
            ['{{current_year}}', new Date().getFullYear().toString()],
            ['{{current_date}}', dateTodayStr],
            // Datum (date.today_+1y VOR date.today)
            ['{{date.today_+1y}}', dateToday1y],
            ['{{date.today}}',     dateTodayStr],
            ['{{invoice.issue_date}}', dateTodayStr],
            ['{{invoice.due_date}}',   dueDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })],
            // Legacy-Platzhalter (Briefkopf nutzt rec)
            ['{{anrede}}', rec.salutation === 'Herr'
                ? `Sehr geehrter Herr ${recNameLast},`
                : (rec.salutation === 'Frau' ? `Sehr geehrte Frau ${recNameLast},` : `Guten Tag ${recNameFirst} ${recNameLast},`)],
            ['{{company_name}}',    comp.name || ''],
            ['{{company_street}}',  comp.street || ''],
            ['{{company_housenr}}', comp.housenr || ''],
            ['{{company_zip}}',     comp.zip || ''],
            ['{{company_city}}',    comp.city || ''],
            ['{{salutation}}',      addressSalutation],
            ['{{name_first}}',      recNameFirst],
            ['{{name_last}}',       recNameLast],
            ['{{street}}',          recRawStreet],
            ['{{housenr}}',         rec.housenr || ''],
            ['{{zip}}',             rec.zip || ''],
            ['{{city}}',            recRawCity],
            ['{{rechnungsdatum}}',  dateTodayStr],
            ['{{user_name_first}}', usr.name_first || ''],
            ['{{user_name_last}}',  usr.name_last || ''],
            ['{{user_street}}',     usr.street || ''],
            ['{{user_housenr}}',    usr.housenr || ''],
            ['{{user_zip}}',        usr.zip || ''],
            ['{{user_city}}',       usr.city || ''],
            ['{{user_email}}',      usr.email || ''],
            ['{{user_tel}}',        usr.tel || ''],
            ['{{user_handy}}',      usr.handy || ''],
        ];

        if (dataToUse) {
            map.push(['{{invoice.number}}',         dataToUse.invoice_nr || '']);
            map.push(['{{invoice.total}}',          dataToUse.brutto ? `${formatMoney(dataToUse.brutto)} €` : '']);
            map.push(['{{rechnungs_nr}}',           dataToUse.invoice_nr || '']);
            map.push(['{{invoice.service_period}}', dataToUse.service_period || '']);
            map.push(['{{leistungszeitraum}}',      dataToUse.service_period || '']);
        }

        for (const [key, val] of map) {
            res = applyReplacement(res, key, val);
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
        onBehalfOfUserId = "";
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
        get onBehalfOfUserId() { return onBehalfOfUserId; }, set onBehalfOfUserId(v) { onBehalfOfUserId = v; },
        get effectiveUser() { return effectiveUser; },
        get availableClients() { return availableClients; },
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