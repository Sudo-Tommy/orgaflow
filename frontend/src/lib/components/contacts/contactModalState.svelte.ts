import { pb } from "$lib/services/pocketbase";
import { confirmStore } from "$lib/services/confirmService.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import type { ContactRecord, ClientRecord, RetirementHomeRecord, Salutation, ContactType } from "$lib/types/orgaTypes";
import { createContactSignatureState } from "./contactSignatureState.svelte";
import { extractContactInitialState, submitContact, deleteContact, updateContactPortal, toYMD, safeFormatDate } from "./contactFormService";

export { toYMD, safeFormatDate };

export interface ContactModalOpenOptions {
    targetClient?: ClientRecord | any;
    isInheritorMode?: boolean;
    requireSignature?: boolean;
    onSaved?: (savedContact: ContactRecord) => Promise<void> | void;
}

export function createContactModalState() {
    let isLoading = $state(false), errorMsg = $state(""), isEditing = $state(false);
    let currentRecord = $state<ContactRecord | null>(null);
    let targetClient = $state<ClientRecord | any>(null);
    let isInheritorMode = $state(false), requireSignature = $state(false);
    let onSavedCallback: ((savedContact: ContactRecord) => Promise<void> | void) | null = null;
    let activeDialog: HTMLDialogElement | null = null;

    let salutation = $state<Salutation>("Keine Angabe"), contact_type = $state<ContactType | "">("");
    let company_name = $state(""), name_first = $state(""), name_last = $state(""), email = $state("");
    let phone = $state(""), street = $state(""), housenr = $state(""), zip = $state(""), city = $state("");
    let notes = $state(""), birthdate = $state(""), portal_pin = $state(""), portal_code = $state(""), portal_active = $state(false);

    let clientSearchFilter = $state(""), homeSearchFilter = $state("");
    let linkedClients = $state<string[]>([]), linkedHomes = $state<string[]>([]), linkedMailingLists = $state<string[]>([]);
    let initialLinkedClients: string[] = [], initialLinkedHomes: string[] = [];
    let initialDataHash = "";

    let existingDocuments = $state<string[]>([]), newDocuments = $state<File[]>([]), documentsToDelete = $state<string[]>([]);
    const sig = createContactSignatureState();
    let editId = $derived(currentRecord?.id ?? null);
    let initialEmail = $derived(currentRecord?.email || "");
    let hasPortalAccess = $derived(portal_active || !!((currentRecord as any)?.portal_pin || (currentRecord as any)?.portal_code || portal_pin || portal_code));
    let existingSignatureUrl = $derived((!sig.deleteExistingSignature && currentRecord?.sign) ? pb.files.getURL(currentRecord, currentRecord.sign) : "");

    function getCurrentHash(): string {
        return JSON.stringify({
            contact_type, salutation, company_name, name_first, name_last, email, phone, street, housenr, zip, city, notes, birthdate, portal_active,
            hasDrawnSignature: sig.hasDrawnSignature, deleteExistingSignature: sig.deleteExistingSignature,
            linkedClients, linkedHomes, linkedMailingLists, newDocCount: newDocuments.length, docsToDelete: documentsToDelete.length
        });
    }

    let isDirty = $derived(getCurrentHash() !== initialDataHash);

    function open(record?: ContactRecord | null, dialog?: HTMLDialogElement | null, options?: ContactModalOpenOptions) {
        clientSearchFilter = ""; homeSearchFilter = "";
        currentRecord = record || null; isEditing = !record;
        targetClient = options?.targetClient || null;
        isInheritorMode = !!options?.isInheritorMode;
        requireSignature = !!options?.requireSignature;
        onSavedCallback = options?.onSaved || null;
        if (dialog) activeDialog = dialog;

        const data = extractContactInitialState(record, (orgaStore.clients?.data || []) as ClientRecord[], (orgaStore.retirement_homes?.data || []) as RetirementHomeRecord[]);
        salutation = data.salutation; company_name = data.company_name; name_first = data.name_first; name_last = data.name_last;
        email = data.email; phone = data.phone; street = data.street; housenr = data.housenr; zip = data.zip; city = data.city;
        notes = data.notes; birthdate = data.birthdate; portal_pin = data.portal_pin; portal_code = data.portal_code;
        portal_active = data.portal_active; contact_type = data.contact_type;
        linkedClients = [...data.linkedClients]; initialLinkedClients = [...data.linkedClients];
        linkedHomes = [...data.linkedHomes]; initialLinkedHomes = [...data.linkedHomes];
        linkedMailingLists = [...data.linkedMailingLists];
        existingDocuments = [...(data.documents || [])]; newDocuments = []; documentsToDelete = [];

        if (!record && isInheritorMode) {
            company_name = "Pflegeperson (Angehörige/r)";
            contact_type = "relative";
            street = ""; housenr = ""; zip = ""; city = ""; notes = "";
            if (targetClient?.id && !linkedClients.includes(targetClient.id)) linkedClients = [targetClient.id];
        }

        sig.resetSignatureState();
        errorMsg = "";
        initialDataHash = getCurrentHash();
        (dialog || activeDialog)?.showModal();
        if (isEditing && !editId) setTimeout(sig.clearSignature, 50);
    }

    async function togglePortalActive() {
        const nextActive = !portal_active;
        portal_active = nextActive;
        if (!editId) { toastStore.info(nextActive ? "Portal-Freigabe aktiviert." : "Portal-Freigabe deaktiviert."); return; }
        try {
            const res = await updateContactPortal(editId, nextActive, portal_pin, portal_code, currentRecord);
            portal_pin = res.portal_pin; portal_code = res.portal_code;
        } catch (err: any) {
            portal_active = !nextActive;
            toastStore.error("Fehler beim Ändern des Portal-Status: " + (err?.message || ""));
        }
    }

    function close(dialog?: HTMLDialogElement | null) { (dialog || activeDialog)?.close(); }
    async function attemptClose(dialog?: HTMLDialogElement | null) {
        const target = dialog || activeDialog;
        if (isInheritorMode && !editId) {
            if (!(await confirmStore.ask("Möchtest du das Anlegen der Pflegeperson wirklich abbrechen?", "Anlegen abbrechen?", "Ja, abbrechen", "Weiter bearbeiten", true))) return;
            close(target); return;
        }
        if (isDirty && !(await confirmStore.ask("Sie haben ungespeicherte Änderungen. Möchten Sie das Fenster wirklich schließen?", "Änderungen verwerfen?", "Verwerfen", "Weiter bearbeiten", true))) return;
        close(target);
    }

    function startEdit() { isEditing = true; setTimeout(sig.clearSignature, 50); }
    async function cancelEdit(dialog?: HTMLDialogElement | null) {
        await attemptClose(dialog || activeDialog);
    }

    function prefillData(data: Partial<ContactRecord>) {
        if (data.contact_type) contact_type = data.contact_type;
        if (data.company_name) company_name = data.company_name;
        if (data.salutation) salutation = data.salutation;
        if (data.name_first) name_first = data.name_first;
        if (data.name_last) name_last = data.name_last;
        if (data.street) street = data.street;
        if (data.housenr) housenr = data.housenr;
        if (data.zip) zip = data.zip;
        if (data.city) city = data.city;
        if (data.phone) phone = data.phone;
        if (data.email) email = data.email;
        if (data.notes) notes = notes ? `${notes}\n${data.notes}` : String(data.notes);
        toastStore.success("Daten wurden in das Formular übernommen.");
    }

    async function checkDuplicates(): Promise<boolean> {
        if (editId || !name_first.trim() || !name_last.trim()) return true;
        const exists = (orgaStore.contacts?.data || []).some((c: any) =>
            c.name_first?.trim().toLowerCase() === name_first.trim().toLowerCase() &&
            c.name_last?.trim().toLowerCase() === name_last.trim().toLowerCase()
        );
        if (!exists) return true;
        return await confirmStore.ask(
            `Ein Kontakt mit dem Namen „${name_first.trim()} ${name_last.trim()}“ existiert bereits. Möchtest du ihn trotzdem neu anlegen?`,
            "Kontakt existiert bereits", "Trotzdem anlegen", "Abbrechen", true
        );
    }

    async function onSubmit(e?: Event, dialog?: HTMLDialogElement | null) {
        e?.preventDefault();
        errorMsg = "";
        if (isInheritorMode) {
            if (!name_first.trim() || !name_last.trim()) { errorMsg = "Bitte Vor- und Nachname der Pflegeperson angeben."; return; }
        } else {
            if (!contact_type) { errorMsg = "Bitte wählen Sie die Art des Kontakts aus."; return; }
            if (!name_first.trim() && !name_last.trim() && !company_name.trim()) { errorMsg = "Bitte Nachname, Vorname oder Firmenname angeben."; return; }
        }
        if (requireSignature) {
            const hasSig = (sig.signatureMode === "upload" && !!sig.uploadedFile) || (sig.signatureMode === "draw" && sig.hasDrawnSignature) || (!sig.deleteExistingSignature && !!existingSignatureUrl);
            if (!hasSig) { errorMsg = "Bitte Unterschrift der Pflegeperson hinterlegen."; return; }
        }
        if (!(await checkDuplicates())) return;

        isLoading = true;
        try {
            const signatureBlob = await sig.getSignatureBlob();
            const result = await submitContact({
                editId, salutation, company_name, name_first, name_last, email, phone, street, housenr, zip, city, notes, contact_type,
                portal_active, portal_pin, portal_code, birthdate, signatureBlob, uploadedFile: sig.uploadedFile,
                signatureMode: sig.signatureMode, hasDrawnSignature: sig.hasDrawnSignature, deleteExistingSignature: sig.deleteExistingSignature,
                initialLinkedClients, linkedClients, initialLinkedHomes, linkedHomes, newDocuments, documentsToDelete, skipToast: isInheritorMode
            });
            if (result.pin) portal_pin = result.pin;
            if (result.code) portal_code = result.code;
            if (onSavedCallback) await onSavedCallback(result.saved);
            if (isInheritorMode) toastStore.success(`Pflegeperson ${result.saved.name_first || ''} ${result.saved.name_last || ''} als Kontakt angelegt und verknüpft ✓`);
            close(dialog);
        } catch (err: any) {
            console.error(err);
            errorMsg = err?.message || "Fehler beim Speichern des Kontakts.";
            toastStore.error(errorMsg);
        } finally { isLoading = false; }
    }

    async function onDelete(dialog?: HTMLDialogElement | null) {
        if (!editId || !(await confirmStore.ask("Diesen Kontakt wirklich unwiderruflich löschen?", "Kontakt löschen?", "Löschen", "Abbrechen", true))) return;
        isLoading = true;
        try { await deleteContact(editId); close(dialog); }
        catch (err: any) { errorMsg = err?.message || "Fehler beim Löschen."; toastStore.error(errorMsg); }
        finally { isLoading = false; }
    }

    return {
        get isLoading() { return isLoading; }, set isLoading(v: boolean) { isLoading = v; },
        get errorMsg() { return errorMsg; }, set errorMsg(v: string) { errorMsg = v; },
        get isEditing() { return isEditing; }, set isEditing(v: boolean) { isEditing = v; },
        get editId() { return editId; }, get isDirty() { return isDirty; },
        get isInheritorMode() { return isInheritorMode; }, get requireSignature() { return requireSignature; }, get targetClient() { return targetClient; },
        get hasPortalAccess() { return hasPortalAccess; }, get portal_active() { return portal_active; },
        set portal_active(v: boolean) { portal_active = v; }, togglePortalActive,
        get salutation() { return salutation; }, set salutation(v: Salutation) { salutation = v; },
        get contact_type() { return contact_type; }, set contact_type(v: ContactType | "") { contact_type = v; },
        get company_name() { return company_name; }, set company_name(v: string) { company_name = v; },
        get name_first() { return name_first; }, set name_first(v: string) { name_first = v; },
        get name_last() { return name_last; }, set name_last(v: string) { name_last = v; },
        get email() { return email; }, set email(v: string) { email = v; },
        get initialEmail() { return initialEmail; },
        get phone() { return phone; }, set phone(v: string) { phone = v; },
        get street() { return street; }, set street(v: string) { street = v; },
        get housenr() { return housenr; }, set housenr(v: string) { housenr = v; },
        get zip() { return zip; }, set zip(v: string) { zip = v; },
        get city() { return city; }, set city(v: string) { city = v; },
        get notes() { return notes; }, set notes(v: string) { notes = v; },
        get birthdate() { return birthdate; }, set birthdate(v: string) { birthdate = v; },
        get portal_pin() { return portal_pin; }, set portal_pin(v: string) { portal_pin = v; },
        get portal_code() { return portal_code; }, set portal_code(v: string) { portal_code = v; },
        get clientSearchFilter() { return clientSearchFilter; }, set clientSearchFilter(v: string) { clientSearchFilter = v; },
        get homeSearchFilter() { return homeSearchFilter; }, set homeSearchFilter(v: string) { homeSearchFilter = v; },
        get currentRecord() { return currentRecord; }, get existingSignatureUrl() { return existingSignatureUrl; },
        get signatureMode() { return sig.signatureMode; }, set signatureMode(v: "draw" | "upload") { sig.signatureMode = v; },
        get canvas() { return sig.canvas; }, set canvas(v: HTMLCanvasElement | null) { sig.canvas = v; },
        get fsCanvas() { return sig.fsCanvas; }, set fsCanvas(v: HTMLCanvasElement | null) { sig.fsCanvas = v; },
        get fsDialog() { return sig.fsDialog; }, set fsDialog(v: HTMLDialogElement | null) { sig.fsDialog = v; },
        get uploadedFile() { return sig.uploadedFile; }, set uploadedFile(v: File | null) { sig.uploadedFile = v; },
        get uploadedPreviewUrl() { return sig.uploadedPreviewUrl; },
        get hasDrawnSignature() { return sig.hasDrawnSignature; }, set hasDrawnSignature(v: boolean) { sig.hasDrawnSignature = v; },
        get deleteExistingSignature() { return sig.deleteExistingSignature; }, set deleteExistingSignature(v: boolean) { sig.deleteExistingSignature = v; },
        get isSignatureFullscreen() { return sig.isSignatureFullscreen; },
        startDrawing: sig.startDrawing, draw: sig.draw, stopDrawing: sig.stopDrawing,
        startFsDrawing: sig.startFsDrawing, drawFs: sig.drawFs, stopFsDrawing: sig.stopFsDrawing,
        clearSignature: sig.clearSignature, clearFsSignature: sig.clearFsSignature,
        handleFileChange: sig.handleFileChange, openSignatureFullscreen: sig.openSignatureFullscreen,
        applyFsSignature: sig.applyFsSignature, closeSignatureFullscreen: sig.closeSignatureFullscreen,
        get existingDocuments() { return existingDocuments; }, get newDocuments() { return newDocuments; }, get documentsToDelete() { return documentsToDelete; },
        addNewDocuments(files: File[]) { newDocuments = [...newDocuments, ...files]; },
        removeNewDocument(idx: number) { newDocuments = newDocuments.filter((_, i) => i !== idx); },
        toggleDeleteExistingDocument(name: string) {
            documentsToDelete = documentsToDelete.includes(name) ? documentsToDelete.filter(d => d !== name) : [...documentsToDelete, name];
        },
        get linkedClients() { return linkedClients; }, set linkedClients(v: string[]) { linkedClients = v; },
        get linkedHomes() { return linkedHomes; }, set linkedHomes(v: string[]) { linkedHomes = v; },
        get linkedMailingLists() { return linkedMailingLists; }, set linkedMailingLists(v: string[]) { linkedMailingLists = v; },
        toggleClient(id: string) { linkedClients = linkedClients.includes(id) ? linkedClients.filter((cId) => cId !== id) : [...linkedClients, id]; },
        toggleHome(id: string) { linkedHomes = linkedHomes.includes(id) ? linkedHomes.filter((hId) => hId !== id) : [...linkedHomes, id]; },
        toggleMailingList(id: string) { linkedMailingLists = linkedMailingLists.includes(id) ? linkedMailingLists.filter((cId) => cId !== id) : [...linkedMailingLists, id]; },
        open, close, attemptClose, startEdit, cancelEdit, prefillData, onSubmit, onDelete, toYMD, safeFormatDate
    };
}

export type ContactModalState = ReturnType<typeof createContactModalState>;
