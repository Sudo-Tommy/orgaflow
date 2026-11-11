import type { VariableCategory } from "./wordTypes";
import { isSignatureToken, getSignaturePillHtml, getSignatureSamplePreview } from "./wordSignatureHelper";

export const VARIABLE_CATEGORIES: VariableCategory[] = [
    {
        category: "Empfänger (Briefkopf & Adressfeld)",
        icon: "📬",
        items: [
            { token: "{{recipient.address_full}}", label: "Komplette Anschrift", sample: "Techniker Krankenkasse\nBramfelder Str. 140\n22305 Hamburg" },
            { token: "{{recipient.salutation}}", label: "Anrede", sample: "Herr / Frau" },
            { token: "{{recipient.salutation_formal}}", label: "Sehr geehrte(r)...", sample: "Sehr geehrte Damen und Herren," },
            { token: "{{recipient.name}}", label: "Vollständiger Name / Kasse", sample: "Techniker Krankenkasse" },
            { token: "{{recipient.name_first}}", label: "Vorname / Kassenname", sample: "Thomas" },
            { token: "{{recipient.name_last}}", label: "Nachname", sample: "Schmidt" },
            { token: "{{recipient.company_name}}", label: "Firma / Betreuungsbüro", sample: "Schmidt Betreuungen" },
            { token: "{{recipient.addition}}", label: "Zusatz / Abteilung", sample: "Pflegekasse" },
            { token: "{{recipient.street}}", label: "Straße", sample: "Hauptstr." },
            { token: "{{recipient.housenr}}", label: "Hausnr.", sample: "12" },
            { token: "{{recipient.zip}}", label: "PLZ", sample: "10115" },
            { token: "{{recipient.city}}", label: "Stadt", sample: "Berlin" },
            { token: "{{recipient.phone}}", label: "Telefon", sample: "030 1234567" },
            { token: "{{recipient.email}}", label: "E-Mail", sample: "empfaenger@beispiel.de" },
            { token: "{{recipient.signature}}", label: "Unterschrift Empfänger", sample: "[Unterschrift]" }
        ]
    },
    {
        category: "Klient (Stammdaten)",
        icon: "👤",
        items: [
            { token: "{{client.name}}", label: "Vollständiger Name", sample: "Erika Mustermann" },
            { token: "{{client.salutation}}", label: "Anrede", sample: "Frau" },
            { token: "{{client.salutation_formal}}", label: "Sehr geehrte(r)...", sample: "Sehr geehrte Frau Müller" },
            { token: "{{client.name_first}}", label: "Vorname", sample: "Erika" },
            { token: "{{client.name_last}}", label: "Nachname", sample: "Mustermann" },
            { token: "{{client.street}}", label: "Straße", sample: "Hauptstr." },
            { token: "{{client.housenr}}", label: "Hausnr.", sample: "12" },
            { token: "{{client.zip}}", label: "PLZ", sample: "10115" },
            { token: "{{client.city}}", label: "Stadt", sample: "Berlin" },
            { token: "{{client.phone}}", label: "Telefon", sample: "030 1234567" },
            { token: "{{client.handy}}", label: "Mobil", sample: "0170 1234567" },
            { token: "{{client.insurance_nr}}", label: "Versicherungsnummer", sample: "A123456789" },
            { token: "{{client.birthdate}}", label: "Geburtsdatum", sample: "15.04.1950" },
            { token: "{{client.level_of_care}}", label: "Pflegegrad", sample: "3" },
            { token: "{{client.budget_45b}}", label: "Budget § 45b", sample: "125,00 €" },
            { token: "{{client.signature}}", label: "Unterschrift Klient", sample: "[Unterschrift]" }
        ]
    },
    {
        category: "Zuständiger Assistent",
        icon: "🩺",
        items: [
            { token: "{{assistant.name}}", label: "Vollständiger Name", sample: "Tommy Jenzsch" },
            { token: "{{assistant.name_first}}", label: "Vorname", sample: "Tommy" },
            { token: "{{assistant.name_last}}", label: "Nachname", sample: "Jenzsch" },
            { token: "{{assistant.role}}", label: "Rolle / Funktion", sample: "Assistent" },
            { token: "{{assistant.email}}", label: "E-Mail", sample: "t.jenzsch@beispiel.de" },
            { token: "{{assistant.tel}}", label: "Telefon", sample: "030 1234567" },
            { token: "{{assistant.handy}}", label: "Mobil (Handy)", sample: "0171 1234567" },
            { token: "{{assistant.street}}", label: "Straße", sample: "Musterstr." },
            { token: "{{assistant.housenr}}", label: "Hausnr.", sample: "42" },
            { token: "{{assistant.zip}}", label: "PLZ", sample: "10115" },
            { token: "{{assistant.city}}", label: "Stadt", sample: "Berlin" },
            { token: "{{assistant.date_birth}}", label: "Geburtsdatum", sample: "01.01.1985" },
            { token: "{{assistant.qualifications}}", label: "Qualifikationen", sample: "Zertifizierter Seniorenassistent" },
            { token: "{{assistant.signature}}", label: "Unterschrift Assistent", sample: "[Unterschrift]" }
        ]
    },
    {
        category: "Krankenkasse",
        icon: "🏥",
        items: [
            { token: "{{insurance.name}}", label: "Kassenname", sample: "Techniker Krankenkasse" },
            { token: "{{insurance.type}}", label: "Kassenart", sample: "Gesetzlich" },
            { token: "{{insurance.street}}", label: "Kassen-Straße", sample: "Bramfelder Str. 140" },
            { token: "{{insurance.zip}}", label: "Kassen-PLZ", sample: "22305" },
            { token: "{{insurance.city}}", label: "Kassen-Stadt", sample: "Hamburg" },
            { token: "{{insurance.phone}}", label: "Kassen-Telefon", sample: "0800 2858585" }
        ]
    },
    {
        category: "Betreuer / Bevollmächtigter",
        icon: "🛡️",
        items: [
            { token: "{{caregiver.salutation}}", label: "Betreuer Anrede", sample: "Herr" },
            { token: "{{caregiver.name_first}}", label: "Betreuer Vorname", sample: "Thomas" },
            { token: "{{caregiver.name_last}}", label: "Betreuer Nachname", sample: "Schmidt" },
            { token: "{{caregiver.company_name}}", label: "Betreuungsbüro", sample: "Schmidt Betreuungen" },
            { token: "{{caregiver.street}}", label: "Betreuer Straße", sample: "Kaiserstr." },
            { token: "{{caregiver.housenr}}", label: "Betreuer Hausnr.", sample: "5" },
            { token: "{{caregiver.zip}}", label: "Betreuer PLZ", sample: "10115" },
            { token: "{{caregiver.city}}", label: "Betreuer Stadt", sample: "Berlin" },
            { token: "{{caregiver.signature}}", label: "Unterschrift Betreuer", sample: "[Unterschrift]" },
            { token: "{{inheritor.name}}", label: "Bevollmächtigter Name", sample: "Sandra Meier" },
            { token: "{{inheritor.signature}}", label: "Unterschrift Bevollmächtigter", sample: "[Unterschrift]" }
        ]
    },
    {
        category: "Verhinderungspflege (§ 39)",
        icon: "🤝",
        items: [
            { token: "{{careperson.name}}", label: "Pflegeperson Name", sample: "Sabine Müller" },
            { token: "{{careperson.relation}}", label: "Verwandtschaft", sample: "Tochter" },
            { token: "{{careperson.reason}}", label: "Verhinderungsgrund", sample: "Erholungsurlaub" },
            { token: "{{careperson.street}}", label: "Pflegeperson Straße", sample: "Musterstr." },
            { token: "{{careperson.housenr}}", label: "Pflegeperson Hausnr.", sample: "12" },
            { token: "{{careperson.zip}}", label: "Pflegeperson PLZ", sample: "10115" },
            { token: "{{careperson.city}}", label: "Pflegeperson Stadt", sample: "Berlin" },
            { token: "{{careperson.birthdate}}", label: "Pflegeperson Geburtsdatum", sample: "01.01.1960" },
            { token: "{{careperson.phone}}", label: "Pflegeperson Telefon", sample: "030 1234567" },
            { token: "{{careperson.email}}", label: "Pflegeperson E-Mail", sample: "pflegeperson@beispiel.de" },
            { token: "{{verhinderung.von}}", label: "Zeitraum Von", sample: "01.10.2026" },
            { token: "{{verhinderung.bis}}", label: "Zeitraum Bis", sample: "14.10.2026" },
            { token: "{{careperson.budget_39}}", label: "Budget § 39", sample: "1.612,00 €" },
            { token: "{{careperson.signature}}", label: "Unterschrift Pflegeperson", sample: "[Unterschrift]" }
        ]
    },
    {
        category: "Eigene Firma (Absender)",
        icon: "🏢",
        items: [
            { token: "{{company.name}}", label: "Firmenname", sample: "Muster Pflegedienst GmbH" },
            { token: "{{company.return_address_line}}", label: "Rücksendezeile", sample: "Muster Pflege • Musterstr. 1 • 12345 Berlin" },
            { token: "{{company.street}}", label: "Firma Straße", sample: "Musterstraße" },
            { token: "{{company.housenr}}", label: "Firma Hausnr.", sample: "1" },
            { token: "{{company.zip}}", label: "Firma PLZ", sample: "12345" },
            { token: "{{company.city}}", label: "Firma Stadt", sample: "Berlin" },
            { token: "{{company.number_telephone}}", label: "Firma Telefon", sample: "030 9876543" },
            { token: "{{company.number_mobile}}", label: "Firma Mobil", sample: "0172 9876543" },
            { token: "{{company.email}}", label: "Firma E-Mail", sample: "kontakt@musterpflege.de" },
            { token: "{{company.website}}", label: "Firma Website", sample: "www.musterpflege.de" },
            { token: "{{company.vatcode}}", label: "Steuernummer", sample: "12/345/67890" },
            { token: "{{company.ik_number}}", label: "IK-Nummer", sample: "123456789" },
            { token: "{{company.bank_name}}", label: "Bankname", sample: "Berliner Sparkasse" },
            { token: "{{company.bank_iban}}", label: "IBAN", sample: "DE12 3456 7890 1234 5678 90" },
            { token: "{{company.bank_bic}}", label: "BIC", sample: "BELADEBEXXX" }
        ]
    },
    {
        category: "Rechnung & Datum",
        icon: "📄",
        items: [
            { token: "{{invoice.number}}", label: "Rechnungsnummer", sample: "RE-2026-0042" },
            { token: "{{date.today}}", label: "Datum Heute", sample: "02.10.2026" },
            { token: "{{current_year}}", label: "Jahr", sample: "2026" },
            { token: "{{invoice.issue_date}}", label: "Rechnungsdatum", sample: "02.10.2026" },
            { token: "{{invoice.due_date}}", label: "Fälligkeitsdatum", sample: "16.10.2026" },
            { token: "{{invoice.service_period}}", label: "Leistungszeitraum", sample: "September 2026" }
        ]
    }
];

const TOKEN_LOOKUP = new Map<string, { label: string; sample: string }>();
for (const cat of VARIABLE_CATEGORIES) {
    for (const item of cat.items) {
        TOKEN_LOOKUP.set(item.token, item);
        const bareKey = item.token.replace(/[{}]/g, '');
        TOKEN_LOOKUP.set(`{{${bareKey}}}`, item);
        if (!bareKey.includes('.')) TOKEN_LOOKUP.set(`{{${bareKey}}}`, item);
    }
}
const ALIASES: [string, string, string][] = [
    ["{{assistant.sign}}", "Unterschrift Assistent", "[Unterschrift Assistent]"], ["{{pflegeperson.signature}}", "Unterschrift Pflegeperson", "[Unterschrift]"],
    ["{{inheritor.sign}}", "Unterschrift Bevollmächtigter", "[Unterschrift]"], ["{{representative.signature}}", "Unterschrift Vertretung", "[Unterschrift]"],
    ["{{assistant.phone}}", "Telefon", "030 1234567"], ["{{assistant.mobile}}", "Mobil (Handy)", "0171 1234567"],
    ["{{assistant.birthdate}}", "Geburtsdatum", "01.01.1985"], ["{{company.phone}}", "Firma Telefon", "030 9876543"],
    ["{{company_name}}", "Firmenname", "Muster Pflegedienst GmbH"], ["{{company_street}}", "Firma Straße", "Musterstraße"],
    ["{{company_housenr}}", "Firma Hausnr.", "1"], ["{{company_zip}}", "Firma PLZ", "12345"],
    ["{{company_city}}", "Firma Stadt", "Berlin"], ["{{rechnungsdatum}}", "Rechnungsdatum", "02.10.2026"],
    ["{{rechnungs_nr}}", "Rechnungsnummer", "RE-2026-0042"], ["{{leistungszeitraum}}", "Leistungszeitraum", "September 2026"]
];
for (const [t, label, sample] of ALIASES) TOKEN_LOOKUP.set(t, { label, sample });

export function getTokenMeta(token: string): { label: string; sample: string } {
    const found = TOKEN_LOOKUP.get(token);
    if (found) return found;
    const clean = token.replace(/[{}]/g, '').replace(/^(client|company|insurance|caregiver|careperson|assistant|inheritor)\./, '');
    const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
    return { label: capitalized, sample: `[${capitalized}]` };
}

export function formatTokenToPill(token: string): string {
    const meta = getTokenMeta(token);
    if (isSignatureToken(token)) {
        return getSignaturePillHtml(token, meta.label);
    }
    if (token.includes('return_address')) {
        const text = meta.sample || "Muster Pflege • Musterstr. 1 • 12345 Berlin";
        return `<span class="orga-token-chip orga-return-chip" contenteditable="false" data-token="${token}" title="${token}">${text}</span>`;
    }
    return `<span class="orga-token-chip" contenteditable="false" data-token="${token}" title="${token}">«${meta.label}»</span>`;
}

export function htmlToWysiwyg(rawHtml: string): string {
    if (!rawHtml) return "";
    return rawHtml.replace(/\{\{[^}]+\}\}/g, (match) => {
        return formatTokenToPill(match);
    });
}

export function wysiwygToHtml(wysiwygHtml: string): string {
    if (!wysiwygHtml) return "";
    let html = wysiwygHtml;
    if (typeof DOMParser !== 'undefined') {
        try {
            const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
            doc.querySelectorAll('[data-token]').forEach(el => {
                const token = el.getAttribute('data-token');
                if (token) el.parentNode?.replaceChild(doc.createTextNode(token), el);
            });
            doc.querySelectorAll('svg').forEach(svg => {
                if (svg.innerHTML.includes('M6 22') || svg.getAttribute('viewBox') === '0 0 130 32') svg.remove();
            });
            html = doc.body.innerHTML;
        } catch { /* fallback to regex */ }
    }
    return html
        .replace(/&laquo;/g, '«')
        .replace(/&raquo;/g, '»')
        .replace(/<span[^>]*\bdata-token=["']([^"']+)["'][^>]*>[\s\S]*?<\/span>/gi, '$1')
        .replace(/«✍️\s*([^»]+)»/g, (_, l) => {
            for (const [t, m] of TOKEN_LOOKUP.entries()) if (m.label.toLowerCase() === l.trim().toLowerCase()) return t;
            return `{{assistant.signature}}`;
        })
        .replace(/«([^»]+)»/g, (match, label) => {
            for (const [token, meta] of TOKEN_LOOKUP.entries()) {
                if (meta.label.toLowerCase() === label.trim().toLowerCase()) return token;
            }
            return match;
        })
        .replace(/\u200B/g, '');
}

export function renderWithSampleData(rawHtml: string): string {
    if (!rawHtml) return "";
    return rawHtml.replace(/\{\{[^}]+\}\}/g, (match) => {
        const meta = getTokenMeta(match);
        if (isSignatureToken(match)) {
            return getSignatureSamplePreview(meta.label);
        }
        return meta.sample || match;
    });
}


