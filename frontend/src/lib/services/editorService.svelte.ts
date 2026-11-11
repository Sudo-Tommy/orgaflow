import { pb } from "$lib/services/pocketbase";
import { goto } from "$app/navigation";
import { logAuditEvent } from "$lib/services/auditService";
import type { CanvasField, WordBlock, WordBlockType } from "$lib/components/editor/wordTypes";
import { fieldsToBlocks, blocksToFields } from "$lib/components/editor/wordConverter";
import { getDin5008LetterheadBlocks } from "$lib/components/editor/letterheadPresets";
import { normalizeDocumentBlocks } from "$lib/components/editor/blockMigrationHelper";
import { createWordBlock, mergeBlockWithNext } from "$lib/components/editor/editorBlockOperations";

export type { CanvasField };

export function useEditor(initialDocId: string | null) {
    let docId = $state(initialDocId);
    let title = $state("Unbenannte Vorlage");
    let type = $state("rechnung");
    
    let blocks = $state<WordBlock[]>([]);
    let fields = $state<CanvasField[]>([]);
    let orientation = $state("portrait");
    let marginTop = $state(250);
    let marginBottom = $state(150);
    let lineHeight = $state(1.4);
    let paragraphSpacingBefore = $state(0);
    let paragraphSpacingAfter = $state(4);
    let tableLineSpacing = $state(1.8);
    
    let isSaving = $state(false);
    let saveMessage = $state("");
    let selectedBlockId = $state<string | null>(null);

    async function load() {
        if (!docId) return;
        try {
            const record = await pb.collection('document_templates').getOne(docId);
            title = record.title || "Unbenannte Vorlage";
            type = record.type || "rechnung";
            
            const data = record.content_html;
            if (data && typeof data === 'object') {
                orientation = data.orientation || "portrait";
                marginTop = data.marginTop ?? 250;
                marginBottom = data.marginBottom ?? 150;
                lineHeight = data.lineHeight ?? 1.4;
                paragraphSpacingBefore = data.paragraphSpacingBefore ?? 0;
                paragraphSpacingAfter = data.paragraphSpacingAfter ?? 4;
                tableLineSpacing = data.tableLineSpacing ?? 1.8;

                if (Array.isArray(data.blocks) && data.blocks.length > 0) {
                    blocks = normalizeDocumentBlocks(data.blocks);
                    fields = blocksToFields(blocks, { marginTop, marginBottom });
                } else if (Array.isArray(data.fields) && data.fields.length > 0) {
                    fields = data.fields;
                    blocks = normalizeDocumentBlocks(fieldsToBlocks(data.fields));
                }
            }
            if (blocks.length > 0 && !selectedBlockId) {
                selectedBlockId = blocks[0].id;
            }
        } catch (err) {
            console.error("Vorlage konnte nicht geladen werden", err);
        }
    }

    function addBlock(type: WordBlockType, atIndex?: number, count = 3): WordBlock {
        const newBlock = createWordBlock(type, count);
        if (atIndex !== undefined && atIndex >= 0 && atIndex <= blocks.length) {
            blocks.splice(atIndex, 0, newBlock);
        } else {
            blocks.push(newBlock);
        }

        selectedBlockId = newBlock.id;
        syncFields();
        return newBlock;
    }

    function deleteBlock(id: string) {
        blocks = blocks.filter(b => b.id !== id);
        if (selectedBlockId === id) selectedBlockId = blocks[0]?.id || null;
        syncFields();
    }

    function moveBlock(id: string, direction: 'up' | 'down') {
        const idx = blocks.findIndex(b => b.id === id);
        if (idx === -1) return;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= blocks.length) return;
        const item = blocks.splice(idx, 1)[0];
        blocks.splice(targetIdx, 0, item);
        syncFields();
    }

    function duplicateBlock(id: string) {
        const idx = blocks.findIndex(b => b.id === id);
        if (idx === -1) return;
        const copy = JSON.parse(JSON.stringify(blocks[idx]));
        copy.id = 'b_' + crypto.randomUUID().slice(0, 8);
        blocks.splice(idx + 1, 0, copy);
        selectedBlockId = copy.id;
        syncFields();
    }

    function mergeWithNextBlock(id: string) {
        const idx = blocks.findIndex(b => b.id === id);
        if (idx === -1 || idx >= blocks.length - 1) return;
        const merged = mergeBlockWithNext(blocks, idx);
        if (merged) {
            selectedBlockId = merged.id;
            syncFields();
        }
    }

    function insertLetterhead(variant: 'formA' | 'formB' = 'formB', replaceExisting = false) {
        const newBlocks = getDin5008LetterheadBlocks(variant);
        marginTop = variant === 'formA' ? 240 : 290;
        marginBottom = 140;

        if (replaceExisting) blocks = newBlocks;
        else blocks.unshift(...newBlocks);
        selectedBlockId = newBlocks[4]?.id || newBlocks[0]?.id;
        syncFields();
    }

    function syncFields() {
        fields = blocksToFields(blocks, { marginTop, marginBottom });
    }

    function applyGlobalSpacings() {
        for (const b of blocks) {
            if (!b.style) b.style = {};
            if (b.type === 'paragraph' || b.type === 'quote') {
                b.style.lineHeight = lineHeight;
                b.style.marginTop = paragraphSpacingBefore;
                b.style.marginBottom = paragraphSpacingAfter;
            } else if (b.type.startsWith('heading')) {
                b.style.lineHeight = Math.min(lineHeight, 1.3);
                b.style.marginTop = Math.max(paragraphSpacingBefore, 6);
                b.style.marginBottom = Math.max(paragraphSpacingAfter, 4);
            } else if (b.type === 'billing_table' || b.type === 'table') {
                if (!b.tableConfig) b.tableConfig = {};
                b.tableConfig.cellPadding = tableLineSpacing;
                b.style.marginTop = paragraphSpacingBefore;
                b.style.marginBottom = paragraphSpacingAfter;
            } else if (b.type === 'columns') {
                b.style.lineHeight = lineHeight;
                const isAddr = b.id?.includes('head_cols') || b.columnsConfig?.columns?.some((c: any) => c.id?.includes('recipient') || c.id?.includes('anschrift') || String(c.content).includes('return_address'));
                if (!isAddr) {
                    b.style.marginTop = paragraphSpacingBefore;
                    b.style.marginBottom = paragraphSpacingAfter;
                }
            }
        }
        syncFields();
    }

    async function save() {
        if (isSaving) return;
        isSaving = true;
        saveMessage = "Speichert...";
        syncFields();

        try {
            const documentPayload = {
                blocks, fields, orientation, marginTop, marginBottom,
                lineHeight, paragraphSpacingBefore, paragraphSpacingAfter, tableLineSpacing,
                version: 3
            };
            
            const data = { title, type, content_html: documentPayload };
            const action = docId ? 'UPDATE_DOCUMENT_TEMPLATE' : 'CREATE_DOCUMENT_TEMPLATE';
            if (docId) {
                await pb.collection('document_templates').update(docId, data);
            } else {
                const newDoc = await pb.collection('document_templates').create(data);
                docId = newDoc.id;
                goto(`/documents/${newDoc.id}`, { replaceState: true, keepFocus: true });
            }
            await logAuditEvent({ action, route: `/documents/${docId}`, details: { templateId: docId, title, type, blocksCount: blocks.length } });
            saveMessage = "Gespeichert!";
            setTimeout(() => saveMessage = "", 2500);
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
        get title() { return title; }, set title(v) { title = v; },
        get type() { return type; }, set type(v) { type = v; },
        get orientation() { return orientation; }, set orientation(v) { orientation = v; },
        get marginTop() { return marginTop; }, set marginTop(v) { marginTop = v; syncFields(); },
        get marginBottom() { return marginBottom; }, set marginBottom(v) { marginBottom = v; syncFields(); },
        get lineHeight() { return lineHeight; }, set lineHeight(v) { lineHeight = v; applyGlobalSpacings(); },
        get paragraphSpacingBefore() { return paragraphSpacingBefore; }, set paragraphSpacingBefore(v) { paragraphSpacingBefore = v; applyGlobalSpacings(); },
        get paragraphSpacingAfter() { return paragraphSpacingAfter; }, set paragraphSpacingAfter(v) { paragraphSpacingAfter = v; applyGlobalSpacings(); },
        get tableLineSpacing() { return tableLineSpacing; }, set tableLineSpacing(v) { tableLineSpacing = v; applyGlobalSpacings(); },
        get blocks() { return blocks; },
        get fields() { return fields; },
        get selectedBlockId() { return selectedBlockId; }, set selectedBlockId(v) { selectedBlockId = v; },
        get isSaving() { return isSaving; },
        get saveMessage() { return saveMessage; },
        applyGlobalSpacings,
        load, save, addBlock, deleteBlock, moveBlock, duplicateBlock, mergeWithNextBlock, insertLetterhead, syncFields
    };
}