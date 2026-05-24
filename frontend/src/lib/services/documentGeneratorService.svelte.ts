import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";

export function useDocumentGenerator() {
    let isLoading = $state(false);
    let errorMsg = $state("");
    let successMsg = $state("");

    let step = $state(1);
    let selectedTemplateId = $state("");
    let selectedClientId = $state("");
    let recipientType = $state("client"); 
    let recipientId = $state("");
    let selectedAppointmentIds = $state<string[]>([]);
    let selectedCompanyId = $state<string>("all");

    let showBilledAppointments = $state(false);
    let hourlyWage = $state(40);
    let kmRate = $state(0.3);
    let taxRate = $state("0");

    let manualInvoiceNr = $state("");
    let generatedInvoiceId = $state<string | null>(null);
    
    function getLocalDate() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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
            const c = orgaStore.clients?.data.find(cl => cl.id === selectedClientId);
            if (c) {
                hourlyWage = c.hourly_wage ?? 40;
                kmRate = c.km_rate ?? 0.3;
                taxRate = c.tax_rate != null ? c.tax_rate.toString() : "0";
            }
        }
    });

    // Vorlagen filtern und den Timesheet-Template heraussuchen
    let availableTemplates = $derived((orgaStore.document_templates?.data || []).filter(t => (t.type || '').toLowerCase() !== 'arbeitszeitnachweis'));
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
                    let titleDesc = app.description || 'Alltagshilfe';
                    if (app.expand?.tasks && app.expand.tasks.length > 0) {
                        titleDesc = app.expand.tasks.map((t:any) => t.title).join(', ');
                    }
                    positions.push({ pos: posCounter++, date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), duration: `${hours.toFixed(2).replace('.', ',')} h`, title: `${titleDesc}`, price: `${hourlyWage.toFixed(2).replace('.', ',')} €`, total });
                }
            }

            // Fahrten berechnen
            if (app.expand?.drive_record) {
                for (const dr of app.expand.drive_record) {
                    if (dr.lump_sum > 0 && includeDriveLumpSum) { 
                        netto += dr.lump_sum;
                        positions.push({ pos: posCounter++, date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), duration: "1", title: `Anfahrt`, price: `${dr.lump_sum.toFixed(2).replace('.', ',')} €`, total: dr.lump_sum });
                    }
                    if (dr.km > 0 && includeDriveKm) { 
                        let total = dr.km * kmRate;
                        netto += total;
                        positions.push({ pos: posCounter++, date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), duration: `${dr.km.toString().replace('.', ',')} km`, title: `Fahrtkosten (${dr.km.toString().replace('.', ',')} km)`, price: `${kmRate.toFixed(2).replace('.', ',')} €`, total: total });
                    }
                }
            }

            // Sonderausgaben berechnen
            if (includeExp && app.expand?.expenditures) {
                for (const exp of app.expand.expenditures) {
                    if (exp.sum > 0) {
                        netto += exp.sum;
                        positions.push({ pos: posCounter++, date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), duration: "1", title: `Auslage: ${exp.titel}`, price: `${exp.sum.toFixed(2).replace('.', ',')} €`, total: exp.sum });
                    }
                }
            }
        }

        const taxRateNum = parseFloat(taxRate) || 0;
        const taxSum = netto * (taxRateNum / 100);
        const brutto = netto + taxSum;
        const invoice_nr = manualInvoiceNr || getNextInvoiceNumber();

        let service_period = "";
        if (apps.length > 0) {
            const periods = apps.map((a: any) => {
                if (!a.appointment) return "";
                const d = new Date(a.appointment);
                return d.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
            }).filter(Boolean);
            // Nutzt ein Set um Duplikate zu filtern. Ergibt z.B. "Mai 2026" oder "April 2026 & Mai 2026"
            service_period = [...new Set(periods)].join(' & ');
        }

        return { invoice_nr, netto, tax_sum: taxSum, brutto, positions, service_period, issue_date: manualIssueDate };
    });

    let isInvoiceNrDuplicate = $derived.by(() => {
        if (!isInvoice || !invoiceData?.invoice_nr) return false;
        const nr = invoiceData.invoice_nr;
        const invoices = orgaStore.invoices?.data || [];
        // Prüfen, ob die Nummer bereits in einer Rechnung vergeben wurde
        return invoices.some((inv: any) => inv.invoice_nr === nr);
    });

    // NEU: Eigene Datenberechnung für den Zeitnachweis, damit dieser unabhängig von der Rechnungskonfiguration IMMER die Zeiten enthält
    let timesheetData = $derived.by(() => {
        if (!requiresAppointments || selectedAppointmentIds.length === 0) return null;
        const apps = availableAppointments.filter((a:any) => selectedAppointmentIds.includes(a.id));
        
        let positions: any[] = [];
        let netto = 0;
        let posCounter = 1;

        for (const app of apps) {
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
                let titleDesc = app.description || 'Alltagshilfe';
                if (app.expand?.tasks && app.expand.tasks.length > 0) {
                    titleDesc = app.expand.tasks.map((t:any) => t.title).join(', ');
                }
                positions.push({ pos: posCounter++, date: new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), duration: `${hours.toFixed(2).replace('.', ',')} h`, title: `${titleDesc}`, price: `${hourlyWage.toFixed(2).replace('.', ',')} €`, total });
            }
        }

        const taxRateNum = parseFloat(taxRate) || 0;
        const taxSum = netto * (taxRateNum / 100);
        const brutto = netto + taxSum;
        const invoice_nr = manualInvoiceNr || getNextInvoiceNumber();
        const service_period = invoiceData ? invoiceData.service_period : "";

        return { invoice_nr, netto, tax_sum: taxSum, brutto, positions, service_period, issue_date: manualIssueDate };
    });

    function getItemsHtml(fieldConf: any, isTimesheet: boolean = false) {
        const dataToUse = isTimesheet ? timesheetData : invoiceData;
        if (!dataToUse) return "";
        
        let tableHtml = `<table style="width: 100%; border-collapse: collapse; font-size: ${fieldConf?.fontSize || 12}px;">`;
        if (fieldConf?.showHeaders) {
            tableHtml += `<thead><tr style="background-color: ${fieldConf.headerBackgroundColor}; color: ${fieldConf.headerTextColor}; border-bottom: 2px solid #cbd5e1;">`;
            for (const col of fieldConf.columns) {
                tableHtml += `<th style="text-align: ${col.align}; padding: 6px 4px; width: ${col.width}%;">${col.name}</th>`;
            }
            tableHtml += `</tr></thead>`;
        }
        tableHtml += `<tbody>`;
        for (const pos of dataToUse.positions) {
            tableHtml += `<tr style="border-bottom: 1px solid #f1f5f9;">`;
            for (const col of fieldConf?.columns || []) {
                let val = "";
                if (col.type === 'pos') val = pos.pos;
                else if (col.type === 'date') val = pos.date;
                else if (col.type === 'duration') val = pos.duration;
                else if (col.type === 'title') {
                    if (fieldConf.staticDescription) {
                        val = replacePlaceholders(fieldConf.staticDescription, isTimesheet);
                    } else {
                        val = pos.title;
                    }
                }
                else if (col.type === 'price') val = pos.price;
                else if (col.type === 'total') val = `${pos.total.toFixed(2).replace('.', ',')} €`;
                tableHtml += `<td style="text-align: ${col.align}; padding: 6px 4px; vertical-align: top;">${val}</td>`;
            }
            tableHtml += `</tr>`;
        }
        tableHtml += `</tbody></table>`;
        
        // Summierung unten anfügen
        if (fieldConf?.includeTotalNetto !== false || fieldConf?.includeTotalTax !== false || fieldConf?.includeTotalBrutto !== false) {
            tableHtml += `<div style="margin-top: 15px; border-top: 2px solid ${fieldConf?.headerBackgroundColor || '#ccc'}; padding-top: 10px; width: 250px; margin-left: auto;">`;
            
            if (fieldConf?.includeTotalNetto !== false) {
                tableHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Netto:</span> <span>${dataToUse.netto.toFixed(2).replace('.',',')} €</span></div>`;
            }
            if (fieldConf?.includeTotalTax !== false) {
                tableHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>MwSt (${taxRate}%):</span> <span>${dataToUse.tax_sum.toFixed(2).replace('.',',')} €</span></div>`;
            }
            if (fieldConf?.includeTotalBrutto !== false) {
                tableHtml += `<div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;"><span>Gesamt:</span> <span>${dataToUse.brutto.toFixed(2).replace('.',',')} €</span></div>`;
            }
            
            tableHtml += `</div>`;
        }
        
        return tableHtml;
    }

    function getRecipientData() {
        if (!client) return {};
        if (recipientType === 'client') return client;
        if (recipientType === 'contact') return client.expand?.contacts?.find((c: any) => c.id === recipientId) || {};
        if (recipientType === 'insurance') return client.expand?.insurance || {};
        if (recipientType === 'home') return client.expand?.retirement_homes?.find((h: any) => h.id === recipientId) || {};
        return client;
    }

    function replacePlaceholders(text: string, isTimesheet: boolean = false) {
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
        const dataToUse = isTimesheet ? timesheetData : invoiceData;
        
        // Wenn der Empfänger der Klient ist, aber ein Betreuer existiert, wird der Betreuer zum Empfänger.
        // Dies gilt nicht, wenn explizit ein anderer Kontakt (z.B. Angehöriger) als Empfänger gewählt wurde.
        if (recipientType === 'client' && client?.expand?.caregiver) {
            rec = client.expand.caregiver;
        }

        const clientSignUrl = rec.sign ? pb.files.getURL(rec, rec.sign) : '';
        const userSignUrl = usr.sign ? pb.files.getURL(usr, usr.sign) : '';

        const dueDate = new Date(new Date(manualIssueDate).getTime() + 14 * 24 * 60 * 60 * 1000);

        const map: Record<string, string> = {
            '{{client.salutation}}': rec.salutation || '',
            '{{client.salutation_formal}}': rec.salutation === 'Herr' ? `Sehr geehrter Herr ${rec.name_last},` : (rec.salutation === 'Frau' ? `Sehr geehrte Frau ${rec.name_last},` : `Guten Tag ${rec.name_first} ${rec.name_last},`),
            '{{client.name_first}}': rec.name_first || rec.name || '',
            '{{client.name_last}}': rec.name_last || '',
            '{{client.street}} {{client.housenr}}': `${rec.street || ''} ${rec.housenr || ''}`.trim(),
            '{{client.zip}} {{client.city}}': `${rec.zip || ''} ${rec.city || ''}`.trim(),
            '{{client.email}}': rec.email || '',
            '{{client.phone}}': rec.phone || '',
            '{{client.handy}}': rec.handy || '',
            '{{client.insurance_nr}}': rec.insurance_nr || '',
            '{{client.birthdate}}': safeFormatDate(rec.birthdate),
            '{{client.level_of_care}}': rec.level_of_care || '',
            '{{client.hourly_wage}}': (client?.hourly_wage ?? '').toString().replace('.', ','),
            '{{client.km_rate}}': (client?.km_rate ?? '').toString().replace('.', ','),
            '{{client.tax_rate}}': (client?.tax_rate ?? '').toString().replace('.', ','),
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
            '{{salutation}}': rec.salutation || '',
            '{{name_first}}': rec.name_first || '',
            '{{name_last}}': rec.name_last || '',
            '{{street}}': rec.street || '',
            '{{housenr}}': rec.housenr || '',
            '{{zip}}': rec.zip || '',
            '{{city}}': rec.city || '',
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
            map['{{invoice.total}}'] = `${dataToUse.brutto.toFixed(2).replace('.', ',')} €`;
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
        get template() { return template; },
        get availableTemplates() { return availableTemplates; },
        get timesheetTemplate() { return timesheetTemplate; },
        get client() { return client; },
        get company() { return company; },
        get availableAppointments() { return availableAppointments; },
        get isInvoice() { return isInvoice; },
        get requiresAppointments() { return requiresAppointments; },
        get invoiceData() { return invoiceData; },
        get isInvoiceNrDuplicate() { return isInvoiceNrDuplicate; },
        get isLoading() { return isLoading; }, set isLoading(v) { isLoading = v; },
        get errorMsg() { return errorMsg; }, set errorMsg(v) { errorMsg = v; },
        get successMsg() { return successMsg; }, set successMsg(v) { successMsg = v; },
        replacePlaceholders, getItemsHtml, reset
    };
}