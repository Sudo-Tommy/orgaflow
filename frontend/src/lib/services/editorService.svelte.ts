import { pb } from "$lib/services/pocketbase";
import { goto } from "$app/navigation";
import { logAuditEvent } from "$lib/services/auditService";

export interface CanvasField {
    id: string;
    type: 'text' | 'logo' | 'table';
    content: string;
    x: number;
    y: number;
    w: number;
    h: number;
    createdAt: number;
    style: {
        backgroundColor: string;
        color: string;
        fontSize: number;
        fontWeight: string;
        padding: number;
        textAlign: string;
        verticalAlign?: string;
        dynamicHeight?: boolean;
        repeatOnAllPages?: boolean;
    };
    tableConfig?: any;
}

export function useEditor(initialDocId: string | null) {
    let docId = $state(initialDocId);
    let title = $state("Unbenannte Vorlage");
    let type = $state("rechnung");
    
    // Das gesamte Canvas-Dokument-Objekt
    let fields = $state<CanvasField[]>([]);
    let orientation = $state("portrait");
    let marginTop = $state(250);
    let marginBottom = $state(150);
    
    let isSaving = $state(false);
    let saveMessage = $state("");
    
    let selectedFieldId = $state<string | null>(null);

    async function load() {
        if (docId) {
            try {
                const record = await pb.collection('document_templates').getOne(docId);
                title = record.title || "Unbenannte Vorlage";
                type = record.type || "rechnung";
                
                const data = record.content_html;
                if (data && typeof data === 'object' && Array.isArray(data.fields)) {
                    fields = data.fields;
                    orientation = data.orientation || "portrait";
                    marginTop = data.marginTop ?? 250;
                    marginBottom = data.marginBottom ?? 150;
                }
            } catch (err) {
                console.error("Vorlage konnte nicht geladen werden", err);
            }
        }
    }

    function addField(type: 'text' | 'logo' | 'table') {
        const newField: CanvasField = {
            id: crypto.randomUUID(),
            type,
            content: type === 'text' ? "Neuer Text" : (type === 'logo' ? "Firmenlogo" : ""),
            x: 100, y: 100, w: type === 'table' ? 600 : 200, h: type === 'table' ? 200 : 60,
            createdAt: Date.now(),
            style: { backgroundColor: "transparent", color: "#000000", fontSize: 12, fontWeight: "normal", padding: 0, textAlign: "left", verticalAlign: "top", dynamicHeight: false, repeatOnAllPages: true }
        };
        
        if (type === 'table') {
            newField.tableConfig = {
                columns: [
                    { id: "1", name: "Pos", type: "pos", width: 10, align: "left" },
                    { id: "2", name: "Datum", type: "date", width: 15, align: "left" },
                    { id: "3", name: "Menge", type: "duration", width: 15, align: "left" },
                    { id: "4", name: "Beschreibung", type: "title", width: 35, align: "left" },
                    { id: "5", name: "EP", type: "price", width: 12, align: "right" },
                    { id: "6", name: "GP", type: "total", width: 13, align: "right" }
                ],
                fontSize: 10, showHeaders: true, headerBackgroundColor: "#f0d4c9", headerTextColor: "#000000",
                staticDescription: "",
                includeTimeRecords: true,
                includeDriveKm: true,
                includeDriveLumpSum: true,
                includeExpenditures: true,
                includeTotalNetto: true,
                includeTotalTax: true,
                includeTotalBrutto: true,
                headerTextAlign: "",
                rowVerticalAlign: "top",
                footerTextAlign: "right",
                firstPageLimit: 6,
                nextPageLimit: 12
            };
        }
        
        fields.push(newField);
        selectedFieldId = newField.id;
    }

    /**
     * Fügt einen DIN 5008-konformen Geschäftsbriefkopf ein (inkl. Firmenlogo, Anschriftfeld, Bezugszeile & Fußzeile)
     */
    function insertLetterhead(variant: 'formA' | 'formB' = 'formB', replaceExisting = false) {
        if (replaceExisting) {
            fields = [];
        }

        const isFormA = variant === 'formA';
        // DIN 5008 Form A (Kompakt: Anschriftfeld bei 27mm / ca. 102px) vs Form B (Standard: 45mm / ca. 165px)
        const anschriftY = isFormA ? 102 : 165;
        const absenderY = anschriftY - 22;
        const dateY = isFormA ? 125 : 175;
        const subjectY = isFormA ? 230 : 280;
        const bodyY = subjectY + 45;

        marginTop = isFormA ? 240 : 290;
        marginBottom = 140;

        const letterheadFields: CanvasField[] = [
            // 1. Firmenlogo (oben rechts)
            {
                id: 'f_logo_' + crypto.randomUUID().slice(0, 8),
                type: 'logo',
                content: 'Firmenlogo',
                x: 494,
                y: 35,
                w: 240,
                h: 70,
                createdAt: Date.now(),
                style: {
                    backgroundColor: 'transparent',
                    color: '#000000',
                    fontSize: 12,
                    fontWeight: 'normal',
                    padding: 0,
                    textAlign: 'right',
                    verticalAlign: 'top',
                    dynamicHeight: false,
                    repeatOnAllPages: false
                }
            },
            // 2. DIN 5008 Absenderzeile (Rücksendeangabe)
            {
                id: 'f_absender_' + crypto.randomUUID().slice(0, 8),
                type: 'text',
                content: '{{company.return_address_line}}',
                x: 60,
                y: absenderY,
                w: 360,
                h: 18,
                createdAt: Date.now() + 1,
                style: {
                    backgroundColor: 'transparent',
                    color: '#6b7280',
                    fontSize: 8,
                    fontWeight: 'normal',
                    padding: 0,
                    textAlign: 'left',
                    verticalAlign: 'top',
                    dynamicHeight: false,
                    repeatOnAllPages: false
                }
            },
            // 3. DIN 5008 Anschriftfeld (85mm x 45mm)
            {
                id: 'f_anschrift_' + crypto.randomUUID().slice(0, 8),
                type: 'text',
                content: '{{client.salutation}}\n{{client.name_first}} {{client.name_last}}\n{{client.street}} {{client.housenr}}\n{{client.zip}} {{client.city}}',
                x: 60,
                y: anschriftY,
                w: 340,
                h: 90,
                createdAt: Date.now() + 2,
                style: {
                    backgroundColor: 'transparent',
                    color: '#111827',
                    fontSize: 10,
                    fontWeight: 'normal',
                    padding: 4,
                    textAlign: 'left',
                    verticalAlign: 'top',
                    dynamicHeight: false,
                    repeatOnAllPages: false
                }
            },
            // 4. Datum & Bezugszeichenblock (rechts)
            {
                id: 'f_datum_' + crypto.randomUUID().slice(0, 8),
                type: 'text',
                content: 'Datum: {{date.today}}\nIhr Zeichen: {{client.insurance_nr}}\nUnser Zeichen: OF-{{current_year}}',
                x: 520,
                y: dateY,
                w: 214,
                h: 75,
                createdAt: Date.now() + 3,
                style: {
                    backgroundColor: 'transparent',
                    color: '#374151',
                    fontSize: 9,
                    fontWeight: 'normal',
                    padding: 0,
                    textAlign: 'left',
                    verticalAlign: 'top',
                    dynamicHeight: false,
                    repeatOnAllPages: false
                }
            },
            // 5. Betreffzeile
            {
                id: 'f_betreff_' + crypto.randomUUID().slice(0, 8),
                type: 'text',
                content: 'Betreff: Leistungsnachweis und Abrechnung nach SGB XI',
                x: 60,
                y: subjectY,
                w: 674,
                h: 28,
                createdAt: Date.now() + 4,
                style: {
                    backgroundColor: 'transparent',
                    color: '#000000',
                    fontSize: 12,
                    fontWeight: 'bold',
                    padding: 0,
                    textAlign: 'left',
                    verticalAlign: 'top',
                    dynamicHeight: false,
                    repeatOnAllPages: false
                }
            },
            // 6. Brieftext / Hauptfeld
            {
                id: 'f_text_' + crypto.randomUUID().slice(0, 8),
                type: 'text',
                content: '{{client.salutation_formal}}\n\nwir bedanken uns für das entgegengebrachte Vertrauen. Anbei erhalten Sie die Dokumentation und Abrechnung gemäß § 45b SGB XI / § 39 SGB XI.\n\nFür Rückfragen stehen wir Ihnen jederzeit gern zur Verfügung.\n\nMit freundlichen Grüßen\n\n{{company.name}}',
                x: 60,
                y: bodyY,
                w: 674,
                h: 180,
                createdAt: Date.now() + 5,
                style: {
                    backgroundColor: 'transparent',
                    color: '#1f2937',
                    fontSize: 11,
                    fontWeight: 'normal',
                    padding: 0,
                    textAlign: 'left',
                    verticalAlign: 'top',
                    dynamicHeight: true,
                    repeatOnAllPages: false
                }
            },
            // 7. Geschäfts-Fußzeile (Wiederholt auf allen Seiten)
            {
                id: 'f_footer_' + crypto.randomUUID().slice(0, 8),
                type: 'text',
                content: '{{company.name}} • {{company.street}} {{company.housenr}} • {{company.zip}} {{company.city}} • Tel: {{company.phone}}\nBank: {{company.bank_name}} • IBAN: {{company.bank_iban}} • BIC: {{company.bank_bic}} • Steuernr: {{company.vatcode}}',
                x: 60,
                y: 1040,
                w: 674,
                h: 50,
                createdAt: Date.now() + 6,
                style: {
                    backgroundColor: 'transparent',
                    color: '#9ca3af',
                    fontSize: 8,
                    fontWeight: 'normal',
                    padding: 0,
                    textAlign: 'center',
                    verticalAlign: 'top',
                    dynamicHeight: false,
                    repeatOnAllPages: true
                }
            }
        ];

        fields.push(...letterheadFields);
        selectedFieldId = letterheadFields[4].id;
    }

    function deleteField(id: string) {
        fields = fields.filter(f => f.id !== id);
        if (selectedFieldId === id) selectedFieldId = null;
    }

    async function save() {
        // Double-Submission Lock
        if (isSaving) return;

        isSaving = true;
        saveMessage = "Speichert...";
        try {
            const documentPayload = {
                fields,
                orientation,
                marginTop,
                marginBottom,
                version: 2
            };
            
            const data = { title, type, content_html: documentPayload };
            if (docId) {
                await pb.collection('document_templates').update(docId, data);
                await logAuditEvent({
                    action: 'UPDATE_DOCUMENT_TEMPLATE',
                    route: `/documents/${docId}`,
                    details: { templateId: docId, title, type, fieldsCount: fields.length }
                });
            } else {
                const newDoc = await pb.collection('document_templates').create(data);
                docId = newDoc.id; // Damit beim nächsten Speichern nur geupdatet wird
                await logAuditEvent({
                    action: 'CREATE_DOCUMENT_TEMPLATE',
                    route: `/documents/${newDoc.id}`,
                    details: { templateId: newDoc.id, title, type, fieldsCount: fields.length }
                });
                goto(`/documents/${newDoc.id}`, { replaceState: true, keepFocus: true });
            }
            saveMessage = "Gespeichert!";
            setTimeout(() => saveMessage = "", 2000);
        } catch (err: any) {
            console.error(err);
            saveMessage = "Fehler!";
            if (err.response?.data) {
                const details = Object.entries(err.response.data).map(([k, v]: any) => `${k}: ${v.message}`).join(", ");
                if (details) saveMessage = `Fehler: ${details}`;
            }
            setTimeout(() => saveMessage = "", 6000);
        } finally {
            isSaving = false;
        }
    }

    return {
        get title() { return title; },
        set title(v) { title = v; },
        get type() { return type; },
        set type(v) { type = v; },
        get marginTop() { return marginTop; },
        set marginTop(v) { marginTop = v; },
        get marginBottom() { return marginBottom; },
        set marginBottom(v) { marginBottom = v; },
        get fields() { return fields; },
        get selectedFieldId() { return selectedFieldId; },
        set selectedFieldId(v) { selectedFieldId = v; },
        get isSaving() { return isSaving; },
        get saveMessage() { return saveMessage; },
        load,
        save,
        addField,
        deleteField,
        insertLetterhead
    };
}