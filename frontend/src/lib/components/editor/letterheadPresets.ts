import type { WordBlock } from "./wordTypes";

export function getDin5008LetterheadBlocks(variant: 'formA' | 'formB' = 'formB'): WordBlock[] {
    const isFormA = variant === 'formA';
    const logoHeight = isFormA ? 70 : 85;

    return [
        {
            id: 'b_logo_' + crypto.randomUUID().slice(0, 8),
            type: 'logo',
            content: 'Firmenlogo',
            style: { textAlign: 'right', marginBottom: 8 },
            logoConfig: { height: logoHeight, align: 'right', fit: 'contain', isFree: false, marginTop: 0, marginBottom: 8 },
            canvasMeta: { x: 60, y: 35, w: 674, h: logoHeight, repeatOnAllPages: false }
        },
        {
            id: 'b_head_cols_' + crypto.randomUUID().slice(0, 8),
            type: 'columns',
            content: '',
            style: { marginTop: 6, marginBottom: 110 },
            columnsConfig: {
                count: 2,
                repeatOnAllPages: false,
                borderTop: false,
                columns: [
                    {
                        id: 'c_absender_anschrift',
                        content: '{{company.return_address_line}}\n{{client.salutation}}\n{{client.name_first}} {{client.name_last}}\n{{client.street}} {{client.housenr}}\n{{client.zip}} {{client.city}}',
                        widthPercent: 58,
                        textAlign: 'left',
                        fontSize: 9.5
                    },
                    {
                        id: 'c_firma_datum',
                        content: '{{company.name}}\n{{company.street}} {{company.housenr}}\n{{company.zip}} {{company.city}}\nTel: {{company.phone}}\n\nDatum: {{date.today}}\nIhr Zeichen: {{client.insurance_nr}}\nUnser Zeichen: OF-{{current_year}}',
                        widthPercent: 42,
                        textAlign: 'right',
                        fontSize: 9
                    }
                ]
            }
        },
        {
            id: 'b_betreff_' + crypto.randomUUID().slice(0, 8),
            type: 'heading2',
            content: 'Betreff: Leistungsnachweis und Abrechnung nach SGB XI',
            style: { fontSize: 12, fontWeight: 'bold', color: '#000000', textAlign: 'left', marginTop: 12, marginBottom: 8 },
            canvasMeta: { x: 60, y: 260, w: 674, h: 28, repeatOnAllPages: false }
        },
        {
            id: 'b_text_' + crypto.randomUUID().slice(0, 8),
            type: 'paragraph',
            content: '{{client.salutation_formal}}\n\nwir bedanken uns für das entgegengebrachte Vertrauen. Anbei erhalten Sie die Dokumentation und Abrechnung gemäß § 45b SGB XI / § 39 SGB XI.\n\nFür Rückfragen stehen wir Ihnen jederzeit gern zur Verfügung.\n\nMit freundlichen Grüßen\n\n{{company.name}}',
            style: { fontSize: 11, color: '#1f2937', textAlign: 'left', marginBottom: 12 },
            canvasMeta: { x: 60, y: 310, w: 674, h: 180, repeatOnAllPages: false }
        },
        {
            id: 'b_footer_' + crypto.randomUUID().slice(0, 8),
            type: 'paragraph',
            content: '{{company.name}} • {{company.street}} {{company.housenr}} • {{company.zip}} {{company.city}} • Tel: {{company.phone}}\nBank: {{company.bank_name}} • IBAN: {{company.bank_iban}} • BIC: {{company.bank_bic}} • Steuernr: {{company.vatcode}}',
            style: { fontSize: 8, color: '#9ca3af', textAlign: 'center', marginTop: 30 },
            canvasMeta: { x: 60, y: 1040, w: 674, h: 50, repeatOnAllPages: true }
        }
    ];
}
