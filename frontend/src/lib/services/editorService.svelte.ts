import { pb } from "$lib/services/pocketbase";
import { goto } from "$app/navigation";

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
            style: { backgroundColor: "transparent", color: "#000000", fontSize: 12, fontWeight: "normal", padding: 0, textAlign: "left", verticalAlign: "top" }
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
                footerTextAlign: "right"
            };
        }
        
        fields.push(newField);
        selectedFieldId = newField.id;
    }

    function deleteField(id: string) {
        fields = fields.filter(f => f.id !== id);
        if (selectedFieldId === id) selectedFieldId = null;
    }

    async function save() {
        isSaving = true;
        saveMessage = "Speichert...";
        try {
            const documentPayload = {
                fields,
                orientation,
                version: 2
            };
            
            const data = { title, type, content_html: documentPayload };
            if (docId) {
                await pb.collection('document_templates').update(docId, data);
            } else {
                const newDoc = await pb.collection('document_templates').create(data);
                docId = newDoc.id; // Damit beim nächsten Speichern nur geupdatet wird
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
        get fields() { return fields; },
        get selectedFieldId() { return selectedFieldId; },
        set selectedFieldId(v) { selectedFieldId = v; },
        get isSaving() { return isSaving; },
        get saveMessage() { return saveMessage; },
        load,
        save,
        addField,
        deleteField
    };
}