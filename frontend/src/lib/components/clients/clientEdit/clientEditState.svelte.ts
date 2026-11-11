import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { employeeService } from "$lib/services/employeeService.svelte";
import { getClientTemplateId } from "$lib/services/documentGeneratorRateHelper";
import { getBillingTypeDef, findMatchingTemplateForBillingType } from "$lib/services/clientBillingService";
import type { DocumentTemplateRecord } from "$lib/types/orgaTypes";
import { getDefaultClientEditFormData, type ClientEditFormData } from "./clientEditTypes";

export function toYMD(val: string): string {
    if (!val) return "";
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    if (val.includes('.')) {
        const parts = val.split(/[. ]/);
        if (parts.length >= 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return val.substring(0, 10);
}

export function createClientEditState() {
    let isLoading = $state(false);
    let errorMsg = $state("");
    let activeTab = $state<'master' | 'care' | 'inheritor' | 'documents'>('master');
    let inheritorMode = $state<'contact' | 'direct'>('direct');
    let initialAssignedEmployee = $state<string>('');
    let formData = $state<ClientEditFormData>(getDefaultClientEditFormData());

    let signatureMode = $state<"draw" | "upload">("draw");
    let canvas = $state<HTMLCanvasElement | null>(null);
    let fsCanvas = $state<HTMLCanvasElement | null>(null);
    let uploadedFile = $state<File | null>(null);
    let hasDrawnSignature = $state(false);
    let hasDrawnFsSignature = $state(false);
    let existingSignatureUrl = $state("");
    let deleteExistingSignature = $state(false);
    let initialDataHash = $state("");
    let isSignatureFullscreen = $state(false);

    let age = $derived.by(() => {
        if (!formData.birthdate) return null;
        try {
            const birthDate = new Date(formData.birthdate);
            if (isNaN(birthDate.getTime())) return null;
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
            return calculatedAge;
        } catch { return null; }
    });

    let isExistingPdf = $derived.by(() => {
        if (!existingSignatureUrl) return false;
        return existingSignatureUrl.toLowerCase().includes('.pdf');
    });

    let uploadedPreviewUrl = $derived.by(() => {
        if (!uploadedFile || !uploadedFile.type.startsWith("image/")) return "";
        return URL.createObjectURL(uploadedFile);
    });

    function initForm(target: any) {
        activeTab = 'master';
        if (target) {
            const info = target.inheritor_info || {};
            const linkedContactId = Array.isArray(target.inheritor) ? (target.inheritor[0] || "") : (target.inheritor || "");
            inheritorMode = linkedContactId ? 'contact' : 'direct';

            formData = {
                salutation: target.salutation || "Keine Angabe",
                name_first: target.name_first || "",
                name_last: target.name_last || "",
                nationality: target.nationality || "Deutsch",
                marital_status: target.marital_status || "Keine Angabe",
                email: target.email || "",
                phone: target.phone || "",
                handy: target.handy || "",
                status: target.status || "Aktiv",
                level_of_care: target.level_of_care || "",
                street: target.street || "",
                housenr: target.housenr || "",
                zip: target.zip || "",
                city: target.city || "",
                birthdate: toYMD(target.birthdate),
                insurance: target.insurance || "",
                insurance_nr: target.insurance_nr || "",
                hourly_wage: target.hourly_wage ?? (target.hourly_rate ?? 40),
                km_rate: target.km_rate ?? 0.3,
                tax_rate: target.tax_rate != null ? target.tax_rate.toString() : "0",
                billing_type: target.billing_type || "",
                default_template: getClientTemplateId(target),
                caregiver: target.caregiver || "",
                assigned_employee: (employeeService.getAssignedEmployeeForClient(target.id)?.id || ""),
                company: Array.isArray(target.company) ? (target.company[0] || "") : (target.company || ""),
                notes: target.notes || "",
                inheritor: linkedContactId,

                inheritor_name: target.inheritor_name || info.inheritor_name || info.name || "",
                inheritor_relation: target.inheritor_relation || info.inheritor_relation || info.relation || "Ehepartner/in",
                inheritor_phone: target.inheritor_phone || info.inheritor_phone || info.phone || "",
                inheritor_email: target.inheritor_email || info.inheritor_email || info.email || "",
                inheritor_has_power_of_attorney: target.inheritor_has_power_of_attorney ?? info.has_power_of_attorney ?? false,
                inheritor_notes: target.inheritor_notes || info.inheritor_notes || info.notes || "",
                inheritor_signature: info.inheritor_signature || "",

                careperson_name: info.name || info.careperson_name || (target.expand?.inheritor ? (Array.isArray(target.expand.inheritor) ? `${target.expand.inheritor[0]?.name_first || ''} ${target.expand.inheritor[0]?.name_last || ''}`.trim() : `${target.expand.inheritor.name_first || ''} ${target.expand.inheritor.name_last || ''}`.trim()) : ""),
                careperson_relation: info.relation || "Ehepartner/in",
                careperson_birthdate: toYMD(info.birthdate || ""),
                careperson_street: info.street || "",
                careperson_housenr: info.housenr || "",
                careperson_zip: info.zip || "",
                careperson_city: info.city || "",
                careperson_phone: info.phone || (target.expand?.inheritor ? (Array.isArray(target.expand.inheritor) ? target.expand.inheritor[0]?.phone : target.expand.inheritor.phone) : ""),
                careperson_email: info.email || (target.expand?.inheritor ? (Array.isArray(target.expand.inheritor) ? target.expand.inheritor[0]?.email : target.expand.inheritor.email) : ""),
                careperson_reason: info.reason || "Erholungsurlaub",
                careperson_care_type: info.care_type || "stundenweise",
                careperson_pre_care: info.pre_care_fulfilled ?? true,
                careperson_care_allowance: info.care_allowance ?? true,
                careperson_notes: info.notes || "",
                careperson_signature: info.signature || info.sign || ""
            };
            initialAssignedEmployee = formData.assigned_employee;
            existingSignatureUrl = target.sign ? pb.files.getURL(target, target.sign) : "";
        }
        hasDrawnSignature = false;
        uploadedFile = null;
        deleteExistingSignature = false;
        errorMsg = "";
        initialDataHash = JSON.stringify({ formData, signatureMode, hasDrawnSignature, deleteExistingSignature });
    }

    function copyClientAddressToCareperson() {
        formData.careperson_street = formData.street;
        formData.careperson_housenr = formData.housenr;
        formData.careperson_zip = formData.zip;
        formData.careperson_city = formData.city;
        toastStore.info("Wohnanschrift des Klienten für Pflegeperson übernommen.");
    }

    function handleContactSelected(contactId: string) {
        formData.inheritor = contactId;
        const contact = orgaStore.contacts?.data?.find((c: any) => c.id === contactId);
        if (contact) {
            formData.inheritor_name = `${contact.name_first || ''} ${contact.name_last || ''}`.trim();
            formData.inheritor_phone = contact.phone || contact.handy || '';
            formData.inheritor_email = contact.email || '';
            if (contact.notes) formData.inheritor_notes = contact.notes;
        }
    }

    function handleBillingTypeChanged(newType: string) {
        formData.billing_type = newType;
        const def = getBillingTypeDef(newType);
        if (def) {
            formData.tax_rate = def.defaultTaxRate.toString();
            const templates = (orgaStore.document_templates?.data || []) as DocumentTemplateRecord[];
            const matched = findMatchingTemplateForBillingType(newType, templates);
            if (matched) formData.default_template = matched.id;
        }
    }

    return {
        get isLoading() { return isLoading; }, set isLoading(v) { isLoading = v; },
        get errorMsg() { return errorMsg; }, set errorMsg(v) { errorMsg = v; },
        get activeTab() { return activeTab; }, set activeTab(v) { activeTab = v; },
        get inheritorMode() { return inheritorMode; }, set inheritorMode(v) { inheritorMode = v; },
        get initialAssignedEmployee() { return initialAssignedEmployee; },
        get formData() { return formData; }, set formData(v) { formData = v; },
        get signatureMode() { return signatureMode; }, set signatureMode(v) { signatureMode = v; },
        get canvas() { return canvas; }, set canvas(v) { canvas = v; },
        get fsCanvas() { return fsCanvas; }, set fsCanvas(v) { fsCanvas = v; },
        get uploadedFile() { return uploadedFile; }, set uploadedFile(v) { uploadedFile = v; },
        get hasDrawnSignature() { return hasDrawnSignature; }, set hasDrawnSignature(v) { hasDrawnSignature = v; },
        get hasDrawnFsSignature() { return hasDrawnFsSignature; }, set hasDrawnFsSignature(v) { hasDrawnFsSignature = v; },
        get existingSignatureUrl() { return existingSignatureUrl; }, set existingSignatureUrl(v) { existingSignatureUrl = v; },
        get deleteExistingSignature() { return deleteExistingSignature; }, set deleteExistingSignature(v) { deleteExistingSignature = v; },
        get initialDataHash() { return initialDataHash; },
        get isSignatureFullscreen() { return isSignatureFullscreen; }, set isSignatureFullscreen(v) { isSignatureFullscreen = v; },
        get age() { return age; },
        get isExistingPdf() { return isExistingPdf; },
        get uploadedPreviewUrl() { return uploadedPreviewUrl; },
        initForm,
        copyClientAddressToCareperson,
        handleContactSelected,
        handleBillingTypeChanged,
        isDirty() {
            return JSON.stringify({ formData, signatureMode, hasDrawnSignature, deleteExistingSignature }) !== initialDataHash;
        }
    };
}
