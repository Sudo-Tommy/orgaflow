import type { LetterPositions, QuickLetterCompany, QuickLetterData } from './quickLetterTypes';
import { generatePdfBlob } from '$lib/services/pdfGeneratorService';

export async function buildAndGenerateLetterPdf(
    data: QuickLetterData,
    positions: LetterPositions,
    company: QuickLetterCompany | null,
    logoBase64: string | null
): Promise<{ blob: Blob; fileName: string }> {
    const { recipient, date, reference, subject, body, closingSalutation, senderName } = data;

    // 1. Empfänger-Zeilen formatieren
    const recipientLines: string[] = [];
    if (recipient.company) recipientLines.push(recipient.company);
    const nameLine = [recipient.salutation, recipient.firstname, recipient.lastname].filter(Boolean).join(' ');
    if (nameLine) recipientLines.push(nameLine);
    const streetLine = [recipient.street, recipient.housenr].filter(Boolean).join(' ');
    if (streetLine) recipientLines.push(streetLine);
    const cityLine = [recipient.zip, recipient.city].filter(Boolean).join(' ');
    if (cityLine) recipientLines.push(cityLine);
    const recipientText = recipientLines.join('\n');

    // 2. Absender-Rücksendezeile (DIN 5008: 7 pt, Trennzeichen " • ")
    const returnAddressParts = [
        company?.name || 'Seniorenassistenz',
        [company?.street, company?.housenr].filter(Boolean).join(' '),
        [company?.zip, company?.city].filter(Boolean).join(' ')
    ].filter(Boolean);
    const returnAddressLine = returnAddressParts.join(' • ');

    // 3. Datum formatieren (z. B. "Lutherstadt Wittenberg, den 26.10.2026")
    const d = new Date(date || Date.now());
    const dateFormatted = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const locationDate = company?.city ? `${company.city}, den ${dateFormatted}` : dateFormatted;
    const dateText = reference ? `Ihr Zeichen: ${reference}\n${locationDate}` : locationDate;

    // 4. Kompakter Firmenkontaktblock unter dem Logo (8 pt)
    const phone = company?.number_telephone || company?.number_mobile || '';
    const email = company?.email || '';
    const web = company?.website || '';
    const contactBlockLines: string[] = [];
    if (phone) contactBlockLines.push(`Tel: ${phone}`);
    if (email) contactBlockLines.push(`E-Mail: ${email}`);
    if (web) contactBlockLines.push(`Web: ${web}`);
    const contactBlockText = contactBlockLines.join('\n');

    // 5. Vollständiger Fließtext
    const subjectText = subject ? (subject.toLowerCase().startsWith('betreff:') ? subject : `Betreff: ${subject}`) : 'Geschäftsbrief';
    const salutation = recipient.lastname ? `${recipient.salutation === 'Herr' ? 'Sehr geehrter Herr' : recipient.salutation === 'Frau' ? 'Sehr geehrte Frau' : 'Guten Tag'} ${recipient.lastname},` : 'Sehr geehrte Damen und Herren,';
    const fullBody = [
        salutation,
        '',
        body.trim(),
        '',
        closingSalutation || 'Mit freundlichen Grüßen',
        '',
        senderName || (company?.name || '')
    ].join('\n');

    // 6. 3-Spaltige Geschäftsfußzeile (7 pt, dezent)
    const col1 = [
        `<strong>${company?.name || 'Seniorenassistenz'}</strong>`,
        [company?.street, company?.housenr].filter(Boolean).join(' '),
        [company?.zip, company?.city].filter(Boolean).join(' ')
    ].filter(Boolean).join('<br>');

    const col2 = [
        phone ? `Tel: ${phone}` : '',
        email ? `E-Mail: ${email}` : '',
        web ? `Web: ${web}` : ''
    ].filter(Boolean).join('<br>');

    const col3 = [
        company?.bank_name ? `<strong>${company.bank_name}</strong>` : '',
        company?.bank_iban ? `IBAN: ${company.bank_iban}` : '',
        company?.bank_bic ? `BIC: ${company.bank_bic}` : '',
        company?.vatcode ? `St.-Nr.: ${company.vatcode}${company?.ik_number && company.ik_number !== '-' ? ` • IK: ${company.ik_number}` : ''}` : ''
    ].filter(Boolean).join('<br>');

    // 7. Semantische DIN 5008 Blöcke für Headless Chromium Renderer
    const blocks: any[] = [];
    if (logoBase64) {
        blocks.push({
            type: 'logo',
            logoConfig: {
                height: Math.min(positions.logo.h, 85),
                fit: 'contain',
                align: 'right',
                marginBottom: 2
            }
        });
    }

    blocks.push({
        type: 'columns',
        columnsConfig: {
            columns: [
                {
                    widthPercent: 58,
                    textAlign: 'left',
                    content: `<div style="font-size: 7pt; color: #6b7280; border-bottom: 1px solid #d1d5db; padding-bottom: 2px; margin-bottom: 6px;">${returnAddressLine}</div><div style="font-size: 10pt; line-height: 1.45; color: #111827;">${recipientText.replace(/\n/g, '<br>')}</div>`
                },
                {
                    widthPercent: 42,
                    textAlign: 'right',
                    content: `<div style="font-size: 8pt; color: #4b5563; line-height: 1.4; margin-bottom: 14px;">${contactBlockText.replace(/\n/g, '<br>')}</div><div style="font-size: 9.5pt; color: #111827; font-weight: 500;">${dateText.replace(/\n/g, '<br>')}</div>`
                }
            ]
        },
        style: { marginBottom: 30 }
    });

    blocks.push({
        type: 'heading2',
        content: subjectText,
        style: { fontSize: 12, fontWeight: 'bold', color: '#000000', marginBottom: 14 }
    });

    blocks.push({
        type: 'paragraph',
        content: fullBody,
        style: { fontSize: 10.5, lineHeight: 1.45, color: '#1f2937' }
    });

    if (data.includeFooter) {
        blocks.push({
            type: 'columns',
            columnsConfig: {
                isFooter: true,
                repeatOnAllPages: true,
                columns: [
                    { widthPercent: 35, textAlign: 'left', content: col1 },
                    { widthPercent: 33, textAlign: 'left', content: col2 },
                    { widthPercent: 32, textAlign: 'right', content: col3 }
                ]
            }
        });
    }

    // 8. Koordinatenbasierte Fields als stabiler Fallback
    const fields: any[] = [];
    if (logoBase64) {
        fields.push({
            id: 'f_logo', type: 'logo', imageBase64: logoBase64,
            x: positions.logo.x, y: positions.logo.y, w: positions.logo.w, h: positions.logo.h
        });
    }
    fields.push({
        id: 'f_absender', type: 'text', content: returnAddressLine,
        x: positions.absender.x, y: positions.absender.y, w: positions.absender.w, h: positions.absender.h,
        style: { fontSize: 7, color: '#6b7280' }
    });
    fields.push({
        id: 'f_anschrift', type: 'text', content: recipientText,
        x: positions.anschrift.x, y: positions.anschrift.y, w: positions.anschrift.w, h: positions.anschrift.h,
        style: { fontSize: 10, color: '#111827' }
    });
    fields.push({
        id: 'f_datum', type: 'text', content: dateText,
        x: positions.datum.x, y: positions.datum.y, w: positions.datum.w, h: positions.datum.h,
        style: { fontSize: 9.5, color: '#111827', textAlign: 'right' }
    });
    fields.push({
        id: 'f_betreff', type: 'text', content: subjectText,
        x: positions.betreff.x, y: positions.betreff.y, w: positions.betreff.w, h: positions.betreff.h,
        style: { fontSize: 12, fontWeight: 'bold', color: '#000000' }
    });
    fields.push({
        id: 'f_body', type: 'text', content: fullBody,
        x: positions.body.x, y: positions.body.y, w: positions.body.w, h: positions.body.h,
        style: { fontSize: 10.5, lineHeight: 1.45, color: '#1f2937', dynamicHeight: true }
    });

    const pdfBlob = await generatePdfBlob({
        templateJson: {
            title: subjectText,
            orientation: 'portrait',
            marginTop: 40,
            marginBottom: data.includeFooter ? 45 : 30,
            blocks,
            fields
        },
        data: {
            companyLogoBase64: logoBase64
        }
    });

    const safeName = (recipient.lastname || recipient.company || 'Schreiben').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Brief_${safeName}_${date}.pdf`;
    return { blob: pdfBlob, fileName };
}
