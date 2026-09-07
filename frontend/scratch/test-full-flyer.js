import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

function sanitizePdfText(text) {
    if (!text) return '';
    return text
        .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
        .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'")
        .replace(/[\u2013\u2014\u2015]/g, '-')
        .replace(/[\u2022\u25CF\u25AA\u25AB\u2023]/g, '-')
        .replace(/\u2026/g, '...')
        .replace(/\u00A0/g, ' ')
        .replace(/\u2192/g, '->')
        .replace(/[\u2713\u2714]/g, '[x]')
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFF]|\uD83E[\uDD00-\uDDFF]/g, '');
}

const MM_TO_PT = 2.83464567;

const sheets = [
    {
        id: 'sheet1', name: 'Außenseite (Bogen 1)', elements: [
            { id: 'bg1', type: 'box', content: '', x: 0, y: 0, w: 97, h: 210, fontSize: 12, color: '#000000', bgColor: '#fef3c7', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 1, padding: 0 },
            { id: 't1', type: 'text', content: 'Auf uns können\nSie bauen', x: 10, y: 20, w: 77, h: 0, fontSize: 24, color: '#134e4a', bgColor: 'transparent', textAlign: 'left', fontWeight: 'bold', borderRadius: 0, zIndex: 2, padding: 0 },
            { id: 't2', type: 'text', content: '🔒 Verschwiegen wie ein Tresor\nIhre Daten und Anliegen sind absolut sicher.\n\n🛡️ Sicherheitsnetz für alle Fälle\nWir sind da, wenn das Leben mal unvorhersehbar wird.\n\n📝 Klipp & Klar dokumentiert\nTransparente Berichte für Sie und Ihre Angehörigen.', x: 10, y: 55, w: 77, h: 0, fontSize: 11, color: '#134e4a', bgColor: 'transparent', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 2, padding: 0 },
            { id: 't3', type: 'text', content: 'Was ist Seniorenassistenz?\nSie sind der Kapitän, wir der Navigator.\n\nWas, wenn was schiefgeht?\nWir verfügen über eine umfassende Betriebshaftpflichtversicherung.', x: 10, y: 150, w: 77, h: 0, fontSize: 9, color: '#4b5563', bgColor: '#ffffff', textAlign: 'left', fontWeight: 'normal', borderRadius: 4, zIndex: 2, padding: 4 },
            { id: 'bg2', type: 'box', content: '', x: 97, y: 0, w: 100, h: 210, fontSize: 12, color: '#000000', bgColor: '#134e4a', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 1, padding: 0 },
            { id: 't4', type: 'text', content: 'Die Gesichter hinter der Hilfe', x: 107, y: 20, w: 80, h: 0, fontSize: 20, color: '#ffffff', bgColor: 'transparent', textAlign: 'left', fontWeight: 'bold', borderRadius: 0, zIndex: 2, padding: 0 },
            { id: 't5', type: 'text', content: 'Kein unpersönliches Callcenter. Bei uns landen Sie direkt bei Menschen, die Ihnen zuhören.', x: 107, y: 35, w: 80, h: 0, fontSize: 10, color: '#ccfbf1', bgColor: 'transparent', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 2, padding: 0 },
            { id: 't6', type: 'text', content: 'Tommy Jenzsch\nHalle (Saale)\n📞 0151 57515432\n\nDoreen Jenzsch\nLutherstadt Wittenberg\n📞 0160 7303830', x: 107, y: 65, w: 80, h: 0, fontSize: 10, color: '#f97316', bgColor: '#0f3d3a', textAlign: 'left', fontWeight: 'bold', borderRadius: 4, zIndex: 3, padding: 5 },
            { id: 't7', type: 'text', content: 'Pflegegrad (1-5) vorhanden?\nSichern Sie sich mtl. 131 € Entlastungsbetrag.', x: 107, y: 130, w: 80, h: 0, fontSize: 10, color: '#78350f', bgColor: '#ffedd5', textAlign: 'center', fontWeight: 'bold', borderRadius: 4, zIndex: 2, padding: 4 },
            { id: 't8', type: 'text', content: '☕ Kaffee steht bereit!\nWann dürfen wir kommen?', x: 107, y: 165, w: 80, h: 0, fontSize: 12, color: '#ffffff', bgColor: 'transparent', textAlign: 'center', fontWeight: 'bold', borderRadius: 0, zIndex: 2, padding: 0 },
            { id: 'bg3', type: 'box', content: '', x: 197, y: 0, w: 100, h: 210, fontSize: 12, color: '#000000', bgColor: '#ffffff', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 1, padding: 0 },
            { id: 't9', type: 'image', content: '/favicon.png', x: 232, y: 25, w: 30, h: 30, fontSize: 12, color: '#134e4a', bgColor: 'transparent', textAlign: 'center', fontWeight: 'normal', borderRadius: 0, zIndex: 2, padding: 0 },
            { id: 't10', type: 'text', content: 'Zuhause wohlfühlen.\nSelbstbestimmt bleiben.', x: 207, y: 65, w: 80, h: 0, fontSize: 24, color: '#134e4a', bgColor: 'transparent', textAlign: 'center', fontWeight: '900', borderRadius: 0, zIndex: 2, padding: 0 },
            { id: 't11', type: 'text', content: 'Wir jonglieren Ihren Papierkram, begleiten Sie zum Arzt und zaubern Ordnung in den Alltag. Persönlich, verlässlich und liebevoll.', x: 207, y: 105, w: 80, h: 0, fontSize: 10, color: '#4b5563', bgColor: 'transparent', textAlign: 'center', fontWeight: 'normal', borderRadius: 0, zIndex: 2, padding: 0 },
            { id: 't12', type: 'text', content: '✓ Kostenloses Kennenlernen\n✓ Keine Vertragsbindung\n✓ Arbeit nach Auftrag\n✓ Einzelabrechnung möglich', x: 212, y: 140, w: 70, h: 0, fontSize: 10, color: '#134e4a', bgColor: '#f0fdf4', textAlign: 'left', fontWeight: 'bold', borderRadius: 4, zIndex: 2, padding: 4 },
            { id: 't13', type: 'text', content: '🔐 Zum Portal', x: 222, y: 185, w: 50, h: 0, fontSize: 12, color: '#ffffff', bgColor: '#134e4a', textAlign: 'center', fontWeight: 'bold', borderRadius: 4, zIndex: 2, padding: 4 },
        ]
    },
    {
        id: 'sheet2', name: 'Innenseite (Bogen 2)', elements: [
            { id: 'bg4', type: 'box', content: '', x: 0, y: 0, w: 100, h: 210, fontSize: 12, color: '#000000', bgColor: '#ffffff', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 1, padding: 0 },
            { id: 't14', type: 'text', content: 'Ihre persönliche\nTask-Force für den Alltag', x: 10, y: 20, w: 80, h: 0, fontSize: 22, color: '#134e4a', bgColor: 'transparent', textAlign: 'left', fontWeight: '900', borderRadius: 0, zIndex: 2, padding: 0 },
            { id: 't15', type: 'text', content: 'Egal ob Papierkrieg, Großeinkauf oder einfach nur jemand, der zuhört. Wir passen uns voll und ganz Ihren Wünschen an.', x: 10, y: 55, w: 80, h: 0, fontSize: 10, color: '#6b7280', bgColor: 'transparent', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 2, padding: 0 },
            { id: 't16', type: 'text', content: '🤝 Alltagsbegleitung mit Herz\nOb Arztbesuch, Bankgeschäft oder der Gang zur Behörde: Wir sind Ihr sicherer Anker.\n\n🏡 Zuhause wohlfühlen\nWir schnappen uns den Einkaufszettel, gießen Blumen und sorgen für Ordnung.\n\n📱 Organisationstalent inklusive\nKrankenkasse, Pflegedienst, störrische Handwerker... Wir übernehmen das Telefon-Ping-Pong für Sie.', x: 10, y: 85, w: 80, h: 0, fontSize: 11, color: '#1f2937', bgColor: 'transparent', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 2, padding: 0 },
            { id: 'bg5', type: 'box', content: '', x: 100, y: 0, w: 100, h: 210, fontSize: 12, color: '#000000', bgColor: '#f0fdfa', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 1, padding: 0 },
            { id: 't17', type: 'text', content: 'Unser gemeinsamer Weg', x: 110, y: 20, w: 80, h: 0, fontSize: 22, color: '#134e4a', bgColor: 'transparent', textAlign: 'center', fontWeight: '900', borderRadius: 0, zIndex: 2, padding: 0 },
            { id: 't18', type: 'text', content: '☕ Tasse Kaffee\nUnverbindliches Beschnuppern bei Ihnen zu Hause.\n\n📄 Vorbereitung\nWir sortieren das Zettelchaos und notieren Fragen für den Arzt.\n\n🚗 Begleitung\nWir navigieren Sie sicher von A nach B.\n\n✨ Durchatmen\nWieder daheim heften wir alles ordentlich ab.', x: 115, y: 60, w: 70, h: 0, fontSize: 11, color: '#134e4a', bgColor: '#ffffff', textAlign: 'left', fontWeight: 'normal', borderRadius: 4, zIndex: 2, padding: 5 },
            { id: 'bg6', type: 'box', content: '', x: 200, y: 0, w: 97, h: 210, fontSize: 12, color: '#000000', bgColor: '#ffffff', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 1, padding: 0 },
            { id: 't19', type: 'text', content: '💡 Gute Neuigkeiten:\nDie Kasse zahlt!', x: 215, y: 25, w: 67, h: 0, fontSize: 14, color: '#9a3412', bgColor: '#fff7ed', textAlign: 'left', fontWeight: 'bold', borderRadius: 4, zIndex: 3, padding: 5 },
            { id: 't20', type: 'text', content: 'Da wir als anerkannter Betreuungsdienst oft direkt abrechnen können, kostet Sie unsere Hilfe meist keinen Cent aus eigener Tasche.', x: 215, y: 48, w: 67, h: 0, fontSize: 10, color: '#c2410c', bgColor: 'transparent', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 3, padding: 0 },
            { id: 't21', type: 'text', content: 'Das Dreamteam für\nAngehörige & Betreuer', x: 210, y: 95, w: 77, h: 0, fontSize: 18, color: '#134e4a', bgColor: 'transparent', textAlign: 'left', fontWeight: '900', borderRadius: 0, zIndex: 2, padding: 0 },
            { id: 't22', type: 'text', content: 'Wir drängen uns nicht auf, sondern springen da ein, wo der Schuh drückt. So wird aus Familie wieder echte Familienzeit.', x: 210, y: 125, w: 77, h: 0, fontSize: 10, color: '#4b5563', bgColor: 'transparent', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 2, padding: 0 },
            { id: 't23', type: 'text', content: '🎯 Clever vorsorgen\n\n🤝 Teamwork\n\n⚡ Sondersituationen', x: 210, y: 155, w: 77, h: 0, fontSize: 11, color: '#134e4a', bgColor: 'transparent', textAlign: 'left', fontWeight: 'bold', borderRadius: 0, zIndex: 2, padding: 0 },
        ]
    }
];

const doc = new PDFDocument({
    size: [841.89, 595.28],
    margins: { top: 0, left: 0, right: 0, bottom: 0 },
    autoFirstPage: false
});

const buffers = [];
doc.on('data', b => buffers.push(b));
doc.on('end', () => {
    const data = Buffer.concat(buffers);
    console.log("SUCCESS: Full flyer generated, length:", data.length);
    fs.writeFileSync('s:/OrgaFlow_Alpha/frontend/scratch/flyer-test-out.pdf', data);
});
doc.on('error', err => console.error("PDF DOC ERROR:", err));

for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    doc.addPage({ size: [841.89, 595.28], margins: { top: 0, left: 0, right: 0, bottom: 0 } });
    const elements = [...sheet.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const el of elements) {
        const x = (el.x || 0) * MM_TO_PT;
        const y = (el.y || 0) * MM_TO_PT;
        const w = Math.max(1, (el.w || 10) * MM_TO_PT);
        const pad = Math.max(0, (el.padding || 0) * MM_TO_PT);
        const r = Math.max(0, (el.borderRadius || 0) * MM_TO_PT);

        let h = el.h > 0 ? el.h * MM_TO_PT : 20 * MM_TO_PT;
        if (el.type === 'text' && el.content) {
            const isBold = el.fontWeight === 'bold' || el.fontWeight === '900';
            doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
            doc.fontSize(el.fontSize || 10);
            const textW = Math.max(10, w - 2 * pad);
            const textHeight = doc.heightOfString(sanitizePdfText(el.content), { width: textW, lineGap: 1.5 });
            if (el.h === 0) {
                h = textHeight + 2 * pad;
            }
        }

        if (el.bgColor && el.bgColor !== 'transparent') {
            doc.save();
            doc.fillColor(el.bgColor);
            if (r > 0) doc.roundedRect(x, y, w, h, r).fill();
            else doc.rect(x, y, w, h).fill();
            doc.restore();
        }

        if (el.type === 'text' && el.content) {
            doc.save();
            const isBold = el.fontWeight === 'bold' || el.fontWeight === '900';
            doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
            doc.fontSize(el.fontSize || 10);
            doc.fillColor(el.color || '#000000');
            const textX = x + pad;
            const textY = y + pad;
            const textW = Math.max(10, w - 2 * pad);
            doc.text(sanitizePdfText(el.content), textX, textY, { width: textW, align: el.textAlign || 'left', lineGap: 1.5 });
            doc.restore();
        }
    }
}

doc.end();
