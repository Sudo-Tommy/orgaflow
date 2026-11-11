/**
 * omniPocketbaseTools.js
 * Echtzeit-Lesezugriff (Read-Only Live-Tools) auf PocketBase für Omni.
 * Unterstützt HRBAC-Rollentrennung (A3), Termine & Nachbereitung (A4, A6, A15),
 * Klienten & Restbudget (A7, A13), Kontakte/Heime (A2) sowie Rechnungen/Finanzen (A8).
 */

import { getBerlinNowInfo, formatBerlinDateTime, resolveRequestedDateRange, fuzzyMatchRecordName } from './omniDateParser.js';

export function isPrivilegedUserRole(role = '') {
    const r = String(role || '').toLowerCase().trim();
    return ['developer', 'superadmin', 'owner', 'admin', 'entwickler', 'inhaber', 'geschäftsführung'].includes(r);
}

function getClientDisplayName(clientRec) {
    const c = Array.isArray(clientRec) ? clientRec[0] : clientRec;
    if (!c) return 'Kein Klient zugeordnet';
    return `${c.name_first || ''} ${c.name_last || ''}`.trim() || c.name || 'Unbekannter Klient';
}

function isUserAssignedToAppointment(app, userId) {
    if (!userId) return true;
    const users = Array.isArray(app.user) ? app.user : (app.user ? [app.user] : []);
    return users.includes(userId) || app.assigned_to === userId;
}

function isRealWorkAppointment(app) {
    if (!app || app.is_private || app.status === 'abgesagt') return false;
    return !String(app.description || '').toUpperCase().includes('[BLOCK]');
}

function getMissingPostProcessingFields(app) {
    const missing = [];
    const hasTasks = (Array.isArray(app.tasks) && app.tasks.length > 0) || Boolean(app.billing_type && String(app.billing_type).trim());
    const hasTime = Array.isArray(app.time_record) && app.time_record.length > 0;
    const hasReport = Boolean((app.report && String(app.report).trim()) || (app.notes && String(app.notes).trim()));
    const hasDrive = Array.isArray(app.drive_record) && app.drive_record.length > 0;
    if (!hasTasks) missing.push('Leistungen');
    if (!hasTime) missing.push('Zeiterfassung');
    if (!hasReport) missing.push('Besuchsbericht');
    if (!hasDrive) missing.push('Fahrten/KM');
    return missing;
}

async function queryPostProcessingAppointments(pbAdmin, userId, isPrivileged) {
    const nowIso = new Date().toISOString().replace('T', ' ');
    const records = await pbAdmin.collection('appointments').getFullList({
        filter: `appointment <= "${nowIso}" && settled = false && status != "abgesagt"`,
        sort: '-appointment', expand: 'client,user', requestKey: null
    });

    const openItems = [];
    for (const app of records) {
        if (!isRealWorkAppointment(app) || (!isPrivileged && !isUserAssignedToAppointment(app, userId))) continue;
        const missing = getMissingPostProcessingFields(app);
        if (missing.length > 0) {
            const dt = formatBerlinDateTime(app.appointment);
            openItems.push(`• ${dt.weekdayShort} ${dt.dateStr}, ${dt.timeStr} – ${getClientDisplayName(app.expand?.client)}: "${String(app.description || 'Termin').trim()}" (Fehlt: ${missing.join(', ')})`);
        }
    }
    if (openItems.length === 0) return `Aktuell sind alle vergangenen Termine vollständig nachbereitet (0 offene Nachbereitungen).`;
    return `Offene Nachbereitungen (${openItems.length} Termine):\n${openItems.slice(0, 15).join('\n')}`;
}

async function queryCalendarAppointments(pbAdmin, userText, userId, isPrivileged) {
    const range = resolveRequestedDateRange(userText);
    const records = await pbAdmin.collection('appointments').getFullList({
        filter: `appointment >= "${range.startIso} 00:00:00" && status != "abgesagt"`,
        sort: 'appointment', expand: 'client,user', requestKey: null
    });

    const lines = [];
    for (const app of records) {
        if (!isRealWorkAppointment(app) || (!isPrivileged && !isUserAssignedToAppointment(app, userId))) continue;
        const dt = formatBerlinDateTime(app.appointment);
        if (dt.isoDate < range.startIso || dt.isoDate > range.endIso) continue;
        const status = app.settled ? 'Abgerechnet' : (app.status === 'beendet' ? 'Beendet' : 'Geplant');
        lines.push(`• ${dt.weekdayShort} ${dt.dateStr}, ${dt.timeStr} – ${getClientDisplayName(app.expand?.client)}: ${String(app.description || 'Einsatz').trim()} (${status})`);
    }
    if (lines.length === 0) {
        return `Für ${range.label} sind im Kalender aktuell keine Termine eingetragen.`;
    }
    return `Termine für ${range.label} (${lines.length} Einträge):\n${lines.slice(0, 25).join('\n')}`;
}

async function queryClientAndBudgetDetails(pbAdmin, matchedClients) {
    const nowYear = getBerlinNowInfo().year;
    const invoices = await pbAdmin.collection('invoices').getFullList({ filter: `status = "Abgeschlossen"`, requestKey: null }).catch(() => []);
    const blocks = [];

    for (const c of matchedClients.slice(0, 5)) {
        const fullName = `${c.name_first || ''} ${c.name_last || ''}`.trim();
        const pg = parseInt(String(c.level_of_care || '0'), 10) || 0;
        const phones = [c.phone, c.handy].filter(Boolean).join(' / ') || 'Keine Telefonnummer hinterlegt';
        const addr = [`${c.street || ''} ${c.housenr || ''}`.trim(), `${c.zip || ''} ${c.city || ''}`.trim()].filter(Boolean).join(', ') || 'Keine Adresse hinterlegt';
        const netContacts = Array.isArray(c.expand?.contacts)
            ? c.expand.contacts.map(ct => `${ct.name_first || ''} ${ct.name_last || ''}`.trim() + (ct.phone ? ` (Tel: ${ct.phone})` : '')).filter(Boolean)
            : [];
        const maxElb = pg >= 1 ? 1572 : 0, maxVhp = pg >= 2 ? 3539 : 0;
        let usedElb = 0, usedVhp = 0;

        for (const inv of invoices) {
            const invClient = Array.isArray(inv.client) ? inv.client : [inv.client];
            if (!invClient.includes(c.id) || !String(inv.issue_date || '').startsWith(String(nowYear))) continue;
            let assigned = false;
            for (const pos of (inv.table_positions || [])) {
                const t = String(pos.title || '').toLowerCase();
                if (t.includes('verhinderungspflege') || t.includes('kurzzeitpflege')) { usedVhp += Number(inv.brutto || 0); assigned = true; break; }
                if (t.includes('entlastung') || t.includes('betreuung')) { usedElb += Number(inv.brutto || 0); assigned = true; break; }
            }
            if (!assigned && parseFloat(inv.tax_rate || '0') === 0) usedVhp += Number(inv.brutto || 0);
        }

        const restElb = Math.max(0, maxElb - usedElb).toFixed(2).replace('.', ',');
        const restVhp = Math.max(0, maxVhp - usedVhp).toFixed(2).replace('.', ',');
        blocks.push(
            `KLIENT: ${fullName}\n` +
            `  • Pflegegrad: ${pg > 0 ? `Pflegegrad ${pg}` : 'Kein Pflegegrad hinterlegt'}\n` +
            `  • Telefon / Mobil: ${phones}\n` +
            `  • Adresse: ${addr}\n` +
            `  • Hauptbezugsperson / Netzwerk: ${netContacts.length > 0 ? netContacts.join('; ') : 'Keine Bezugsperson hinterlegt'}\n` +
            `  • Abrechnung: ${c.billing_type || 'Standard'} (${c.hourly_rate || 39} €/Std.)\n` +
            `  • Restbudget ${nowYear}: Entlastungsbetrag (§ 45b) noch ${restElb} € von ${maxElb} € frei${maxVhp > 0 ? ` | Gemeinsamer Jahresbetrag (§ 39 VHP) noch ${restVhp} € von ${maxVhp} € frei` : ''}`
        );
    }
    return `KLIENTEN-STAMMDATEN & BUDGET:\n${blocks.join('\n\n')}`;
}

async function queryOpenInvoicesAndFinances(pbAdmin, isPrivileged) {
    if (!isPrivileged) return `HINWEIS ZU RECHNUNGEN & FINANZEN: Finanz- und Rechnungsdaten sind nur für Inhaber und Administratoren einsehbar.`;
    const invoices = await pbAdmin.collection('invoices').getFullList({
        filter: `status != "Abgeschlossen" && status != "Storniert" && status != "Abgelehnt"`,
        sort: '-issue_date', expand: 'client', requestKey: null
    });

    const todayIso = getBerlinNowInfo().isoDate;
    let totalOpen = 0, overdueCount = 0;
    const lines = [];
    for (const inv of invoices) {
        const rem = Number(inv.remaining_amount || 0);
        const openAmt = rem > 0 ? rem : Math.max(0, Number(inv.brutto || 0) - Number(inv.paid_amount || 0));
        totalOpen += openAmt;
        const isOverdue = inv.due_date && String(inv.due_date).slice(0, 10) < todayIso;
        if (isOverdue) overdueCount++;
        const dt = formatBerlinDateTime(inv.issue_date || inv.created);
        lines.push(`• RE ${inv.invoice_nr || inv.id.slice(0, 6)} – ${getClientDisplayName(inv.expand?.client)}: ${openAmt.toFixed(2).replace('.', ',')} € (${dt.dateStr}, ${inv.status}${isOverdue ? ', ÜBERFÄLLIG' : ''})`);
    }

    return `Offene Rechnungen: ${invoices.length} Stück | Gesamtbetrag: ${totalOpen.toFixed(2).replace('.', ',')} € | Überfällig: ${overdueCount} Stück\n` +
        (lines.length > 0 ? lines.slice(0, 15).join('\n') : 'Aktuell sind alle Rechnungen bezahlt.');
}

export async function resolvePocketBaseLiveContext({ userText = '', context = {}, pbAdmin = null, onStatus = null }) {
    if (!pbAdmin || !userText) return { isDataQuery: false, dataContextBlock: '', suggestedActionLink: null };
    const lower = String(userText).toLowerCase();
    const userId = context?.userId || '';
    const isPrivileged = isPrivilegedUserRole(context?.userRole);

    const isPostProc = /nachbereit|fehlen noch|fehlende angaben|nicht abgerechnet|unvollständig|offene berichte/.test(lower);
    const isCalendar = /termin|kalender|einsatz|einsätze|nächste woche|nächster woche|diese woche|heute|morgen|übermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|wann habe ich|welche termine/.test(lower);
    const isInvoice = /rechnung|rechnungen|außenstände|offener betrag|unbezahlt|überfällig|mahnung|haushaltsbuch|umsatz|reisekosten|vma/.test(lower);
    const isClientKeyword = /klient|pflegegrad|budget|restbudget|entlastungsbetrag|verhinderungspflege|nummer von|telefonnummer|adresse von|wo wohnt|bezugsperson|pflegeperson/.test(lower);
    const isContactKeyword = /kontakt|hausarzt|arzt|ärztin|praxis|pflegeheim|seniorenheim|einrichtung|krankenkasse|pflegekasse/.test(lower);

    const sections = [];
    let actionLink = null;

    if (isPostProc) {
        onStatus?.('Omni prüft offene Nachbereitungen...');
        sections.push(await queryPostProcessingAppointments(pbAdmin, userId, isPrivileged));
        actionLink = { label: '👉 Zu den Terminen', href: '/appointments' };
    } else if (isCalendar) {
        onStatus?.('Omni prüft deinen Kalender...');
        sections.push(await queryCalendarAppointments(pbAdmin, userText, userId, isPrivileged));
        actionLink = { label: '👉 Zum Kalender', href: '/appointments' };
    }
    if (isInvoice) {
        onStatus?.('Omni prüft Rechnungen & Finanzen...');
        sections.push(await queryOpenInvoicesAndFinances(pbAdmin, isPrivileged));
        actionLink = actionLink || { label: '👉 Zu den Rechnungen', href: '/invoices' };
    }

    if (isClientKeyword || isContactKeyword || /nummer|telefon|mobil|handy|adresse|email|mail|budget|grad|kontakt|frau |herr |herrn /.test(lower)) {
        onStatus?.('Omni durchsucht Klienten & Kontakte...');
        const allClients = await pbAdmin.collection('clients').getFullList({ expand: 'contacts', requestKey: null }).catch(() => []);
        const scoredClients = allClients
            .map(c => ({ c, score: fuzzyMatchRecordName(`${c.name_first || ''} ${c.name_last || ''}`, userText) }))
            .filter(x => x.score >= 3).sort((a, b) => b.score - a.score).map(x => x.c);

        if (scoredClients.length > 0) {
            sections.push(await queryClientAndBudgetDetails(pbAdmin, scoredClients));
            actionLink = actionLink || { label: '👉 Zu den Klienten', href: '/clients' };
        } else if (isClientKeyword) {
            const active = allClients.filter(c => !c.archive);
            sections.push(`KLIENTEN-ÜBERSICHT: Insgesamt ${active.length} aktive Klienten (${allClients.length} gesamt). Auswahl: ${active.slice(0, 10).map(c => `${c.name_first} ${c.name_last} (PG ${c.level_of_care || '-'})`).join(', ')}.`);
            actionLink = actionLink || { label: '👉 Zu den Klienten', href: '/clients' };
        }

        const allContacts = await pbAdmin.collection('contacts').getFullList({ requestKey: null }).catch(() => []);
        const scoredContacts = allContacts
            .map(ct => ({ ct, score: fuzzyMatchRecordName(`${ct.name_first || ''} ${ct.name_last || ''} ${ct.category || ''}`, userText) }))
            .filter(x => x.score >= 3).sort((a, b) => b.score - a.score).map(x => x.ct);
        if (scoredContacts.length > 0) {
            const cLines = scoredContacts.slice(0, 5).map(ct => `- ${ct.name_first || ''} ${ct.name_last || ''} (${ct.category || 'Kontakt'}) | Tel: ${ct.phone || '-'} | E-Mail: ${ct.email || '-'} | Ort: ${ct.street || ''}, ${ct.zip || ''} ${ct.city || ''}`);
            sections.push(`GEFUNDENE KONTAKTE:\n${cLines.join('\n')}`);
            actionLink = actionLink || { label: '👉 Zu den Kontakten', href: '/contacts' };
        }
    }

    if (sections.length === 0) return { isDataQuery: false, dataContextBlock: '', suggestedActionLink: null };
    return { isDataQuery: true, dataContextBlock: sections.join('\n\n'), suggestedActionLink: actionLink };
}
