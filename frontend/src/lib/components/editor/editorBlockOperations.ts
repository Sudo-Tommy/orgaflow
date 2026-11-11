import type { WordBlock, WordBlockType } from "./wordTypes";
import { distributeColumnsEvenly } from "./columnsOperationsHelper";

export function createWordBlock(type: WordBlockType, count = 3): WordBlock {
    const id = 'b_' + crypto.randomUUID().slice(0, 8);
    const isH1 = type === 'heading1', isH2 = type === 'heading2', isH3 = type === 'heading3', isQuote = type === 'quote';
    const newBlock: WordBlock = {
        id, type,
        content: isH1 ? 'Große Überschrift' : isH2 ? 'Mittlere Überschrift' : isH3 ? 'Kleine Überschrift' : isQuote ? 'Wichtiger Hinweis...' : type === 'logo' ? 'Firmenlogo' : '',
        style: {
            fontSize: isH1 ? 18 : isH2 ? 14 : isH3 ? 12 : 11,
            fontWeight: type.startsWith('heading') ? 'bold' : 'normal',
            fontStyle: isQuote ? 'italic' : 'normal',
            textAlign: 'left',
            color: isQuote ? '#4b5563' : '#111827',
            marginBottom: 8
        }
    };

    if (type === 'columns') {
        if (count === 2) {
            newBlock.columnsConfig = {
                count: 2,
                borderTop: false,
                repeatOnAllPages: false,
                selectedColIndex: 0,
                columns: [
                    { id: 'c1', content: '', widthPercent: 50, textAlign: 'left' },
                    { id: 'c2', content: '', widthPercent: 50, textAlign: 'right' }
                ]
            };
        } else if (count === 4) {
            newBlock.columnsConfig = {
                count: 4,
                borderTop: false,
                repeatOnAllPages: false,
                selectedColIndex: 0,
                columns: [
                    { id: 'c1', content: '', widthPercent: 25, textAlign: 'left' },
                    { id: 'c2', content: '', widthPercent: 25, textAlign: 'left' },
                    { id: 'c3', content: '', widthPercent: 25, textAlign: 'left' },
                    { id: 'c4', content: '', widthPercent: 25, textAlign: 'left' }
                ]
            };
        } else {
            newBlock.columnsConfig = {
                count: 3,
                borderTop: true,
                repeatOnAllPages: true,
                selectedColIndex: 0,
                columns: [
                    { id: 'c1', content: '<b>{{company.name}}</b>\n{{company.street}} {{company.housenr}}\n{{company.zip}} {{company.city}}\nTel: {{company.number_telephone}}', widthPercent: 40 },
                    { id: 'c2', content: '<b>Bankverbindung</b>\nBank: {{company.bank_name}}\nIBAN: {{company.bank_iban}}\nBIC: {{company.bank_bic}}', widthPercent: 30 },
                    { id: 'c3', content: '<b>Unternehmensdaten</b>\nSteuernr: {{company.vatcode}}\nIK-Nr: {{company.ik_number}}\nGeschäftsführung', widthPercent: 30 }
                ]
            };
        }
    } else if (type === 'billing_table') {
        newBlock.tableConfig = {
            columns: [
                { id: "1", name: "Pos", type: "pos", width: 8, align: "left" },
                { id: "2", name: "Datum", type: "date", width: 14, align: "left" },
                { id: "3", name: "Dauer/Menge", type: "duration", width: 14, align: "left" },
                { id: "4", name: "Leistungsbeschreibung", type: "title", width: 36, align: "left" },
                { id: "5", name: "Einzelpreis", type: "price", width: 14, align: "right" },
                { id: "6", name: "Gesamtbetrag", type: "total", width: 14, align: "right" }
            ],
            fontSize: 10, showHeaders: true, headerBackgroundColor: "#f4f4f5", headerTextColor: "#000000",
            includeTotalNetto: true, includeTotalTax: true, includeTotalBrutto: true,
            descriptionMode: 'appointment_title'
        };
    } else if (type === 'table') {
        newBlock.tableData = {
            headers: ["Spalte 1", "Spalte 2", "Spalte 3"],
            rows: [["Inhalt A1", "Inhalt B1", "Inhalt C1"], ["Inhalt A2", "Inhalt B2", "Inhalt C2"]]
        };
    } else if (type === 'logo') {
        newBlock.logoConfig = { height: 90, align: 'right', isFree: false, fit: 'contain' };
    } else if (type === 'page_break') {
        newBlock.content = '';
        newBlock.style.marginBottom = 0;
    } else if (type === 'paragraph' && !newBlock.content) {
        newBlock.content = 'Neuer Absatz Text...';
    }

    return newBlock;
}

export function mergeBlockWithNext(blocks: WordBlock[], index: number): WordBlock | null {
    if (index < 0 || index >= blocks.length - 1) return null;
    const b1 = blocks[index];
    const b2 = blocks[index + 1];

    if (b1.type === 'columns' && b1.columnsConfig?.columns) {
        if (b1.columnsConfig.columns.length >= 4) return null;
        const newCol = {
            id: 'c_' + crypto.randomUUID().slice(0, 6),
            content: b2.content || '',
            widthPercent: 0,
            textAlign: (b2.style?.textAlign as any) || 'left'
        };
        b1.columnsConfig.columns.push(newCol);
        b1.columnsConfig.count = b1.columnsConfig.columns.length;
        distributeColumnsEvenly(b1.columnsConfig.columns);
        blocks.splice(index + 1, 1);
        return b1;
    }

    if (b2.type === 'columns' && b2.columnsConfig?.columns) {
        if (b2.columnsConfig.columns.length >= 4) return null;
        const newCol = {
            id: 'c_' + crypto.randomUUID().slice(0, 6),
            content: b1.content || '',
            widthPercent: 0,
            textAlign: (b1.style?.textAlign as any) || 'left'
        };
        b2.columnsConfig.columns.unshift(newCol);
        b2.columnsConfig.count = b2.columnsConfig.columns.length;
        distributeColumnsEvenly(b2.columnsConfig.columns);
        blocks.splice(index, 1);
        return b2;
    }

    const merged: WordBlock = {
        id: 'b_' + crypto.randomUUID().slice(0, 8),
        type: 'columns',
        content: '',
        style: { ...b1.style },
        columnsConfig: {
            count: 2,
            borderTop: false,
            repeatOnAllPages: false,
            selectedColIndex: 0,
            columns: [
                { id: 'c1', content: b1.content || '', widthPercent: 50, textAlign: (b1.style?.textAlign as any) || 'left' },
                { id: 'c2', content: b2.content || '', widthPercent: 50, textAlign: (b2.style?.textAlign as any) || 'right' }
            ]
        }
    };
    blocks.splice(index, 2, merged);
    return merged;
}
