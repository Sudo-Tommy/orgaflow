import type { PlaceholderContext } from "./documentPlaceholderTypes";
import { safeFormatDate } from "./documentPlaceholderTypes";

export function getLegacyAndMetaTokens(
    comp: any,
    usr: any,
    dateTodayStr: string,
    dateToday1y: string,
    dueDate: string,
    recD: any,
    ctx: PlaceholderContext
): Array<[string, string]> {
    const isTs = ctx.isTimesheet || false;
    const tokens: Array<[string, string]> = [
        // Legacy Vorlagen mit Unterstrich
        ['{{company_name}}',     comp.name || ''],
        ['{{company_street}}',   comp.street || ''],
        ['{{company_housenr}}',  comp.housenr || ''],
        ['{{company_zip}}',      comp.zip || ''],
        ['{{company_city}}',     comp.city || ''],
        ['{{user_name_first}}',  usr.name_first || ''],
        ['{{user_name_last}}',   usr.name_last || ''],
        ['{{user_street}}',      usr.street || ''],
        ['{{user_housenr}}',     usr.housenr || ''],
        ['{{user_zip}}',         usr.zip || ''],
        ['{{user_city}}',        usr.city || ''],
        ['{{user_email}}',       usr.email || ''],
        ['{{user_tel}}',         usr.tel || usr.phone || ''],
        ['{{user_handy}}',       usr.handy || usr.mobile || ''],
        ['{{rechnungsdatum}}',   dateTodayStr],

        // Legacy Kurzschreibweisen
        ['{{anrede}}',      recD.recFormal],
        ['{{salutation}}',  recD.recSalutation],
        ['{{name_first}}',  recD.recNameFirst],
        ['{{name_last}}',   recD.recNameLast],
        ['{{street}}',      recD.recStreet],
        ['{{housenr}}',     recD.recHousenr],
        ['{{zip}}',         recD.recZip],
        ['{{city}}',        recD.recCity],

        // Datumswerte & Paragraphen
        ['{{current_year}}', new Date().getFullYear().toString()],
        ['{{current_date}}', dateTodayStr],
        ['{{date.today_+1y}}', dateToday1y],
        ['{{date.today}}', dateTodayStr],
        ['{{invoice.issue_date}}', dateTodayStr],
        ['{{invoice.due_date}}', dueDate],
        ['{{paragraph.39}}', '§ 39 SGB XI - Häusliche Pflege bei Verhinderung der Pflegeperson (Verhinderungspflege)'],
        ['{{verhinderung.von}}', ctx.verhinderungVon ? safeFormatDate(ctx.verhinderungVon) : ''],
        ['{{verhinderung.bis}}', ctx.verhinderungBis ? safeFormatDate(ctx.verhinderungBis) : ''],
        ['{{paragraph.45b}}', '§ 45b SGB XI - Entlastungsbetrag zur Unterstützung im Alltag (125,00 € monatlich)']
    ];

    const dataToUse = ctx.overrideData || (isTs ? ctx.timesheetData : ctx.invoiceData);
    if (dataToUse) {
        tokens.push(['{{invoice.number}}',         dataToUse.invoice_nr || '']);
        tokens.push(['{{invoice.total}}',          dataToUse.brutto ? `${dataToUse.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €` : '']);
        tokens.push(['{{rechnungs_nr}}',           dataToUse.invoice_nr || '']);
        tokens.push(['{{invoice.service_period}}', dataToUse.service_period || '']);
        tokens.push(['{{leistungszeitraum}}',      dataToUse.service_period || '']);
    } else {
        tokens.push(['{{rechnungs_nr}}', '']);
        tokens.push(['{{leistungszeitraum}}', '']);
    }

    return tokens;
}
