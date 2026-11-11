import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { rbacService } from "$lib/services/rbacService.svelte";
import { employeeService } from "$lib/services/employeeService.svelte";
import { buildRoleRelationFields } from "$lib/services/clientContactRoleHelper";
import type { ClientFormData } from "./types";

export function scrollToTop() {
    if (typeof window === "undefined") return;
    const mainEl = document.querySelector("main");
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
}

export function populateFromUrlParams(formData: ClientFormData, searchParams: URLSearchParams) {
    if (searchParams.get("name_first")) formData.name_first = searchParams.get("name_first") || "";
    if (searchParams.get("name_last")) formData.name_last = searchParams.get("name_last") || "";
    if (searchParams.get("email")) formData.email = searchParams.get("email") || "";
    if (searchParams.get("phone")) formData.phone = searchParams.get("phone") || "";
    if (searchParams.get("handy")) formData.handy = searchParams.get("handy") || "";
    if (searchParams.get("street")) formData.street = searchParams.get("street") || "";
    if (searchParams.get("housenr")) formData.housenr = searchParams.get("housenr") || "";
    if (searchParams.get("zip")) formData.zip = searchParams.get("zip") || "";
    if (searchParams.get("city")) formData.city = searchParams.get("city") || "";
    if (searchParams.get("salutation")) formData.salutation = searchParams.get("salutation") || "Keine Angabe";
    if (searchParams.get("company")) formData.company = searchParams.get("company") || "";
    if (!formData.company && rbacService.userCompanyId) {
        formData.company = rbacService.userCompanyId;
    }
}

export async function submitClientRecord(
    formData: ClientFormData,
    assignedUserId: string,
    _inheritorMode: "contact" | "direct",
    signatureBlob: Blob | null,
    uploadedSignatureFile: File | null
) {
    let firstName = formData.name_first.trim();
    let lastName = formData.name_last.trim();
    if (!firstName && !lastName) {
        firstName = "Neuer";
        lastName = "Klient";
    }

    let insuranceId = formData.insurance;
    if (insuranceId === "other" && formData.other_insurance_name.trim()) {
        const newName = formData.other_insurance_name.trim();
        const existingList = await pb.collection("insurancies").getFullList({
            filter: `name ~ "${newName}"`,
            requestKey: null
        }).catch(() => []);

        const match = existingList.find((i: any) => i.name.toLowerCase().trim() === newName.toLowerCase().trim());
        if (match) {
            insuranceId = match.id;
        } else {
            const created = await pb.collection("insurancies").create({ name: newName, type: "GKV (Gesetzlich)" });
            insuranceId = created.id;
            if (orgaStore.insurancies) {
                orgaStore.insurancies.data = [created as any, ...orgaStore.insurancies.data];
            }
        }
    } else if (insuranceId === "other") {
        insuranceId = "";
    }

    const pbFormData = new FormData();
    pbFormData.append("name_first", firstName);
    pbFormData.append("name_last", lastName);

    const activeRelations: Record<string, any> = {};
    for (const cId of formData.contacts || []) {
        activeRelations[cId] = formData.contact_relations?.[cId] || {
            relation: "Angehörige/r",
            is_primary: false,
            is_careperson: false,
            has_power_of_attorney: false
        };
    }
    const { caregiver, inheritor } = buildRoleRelationFields(activeRelations);

    for (const [key, value] of Object.entries(formData)) {
        if (
            key.startsWith("careperson_") ||
            key.startsWith("inheritor") ||
            key === "contact_relations" ||
            key === "caregiver" ||
            key === "other_insurance_name" ||
            key === "name_first" ||
            key === "name_last" ||
            key === "hourly_wage" ||
            key === "insurance"
        ) continue;

        if (key === "tax_rate") {
            pbFormData.append(key, (value != null && value !== "") ? value.toString() : "0");
        } else if (key === "billing_type") {
            const bt = (value as string || "").trim();
            if (bt) pbFormData.append(key, bt);
        } else if (key === "km_rate") {
            pbFormData.append(key, (value != null && value !== "") ? value.toString() : "0.3");
        } else if (key === "marital_status") {
            pbFormData.append(key, (value === "Keine Angabe" || !value) ? "" : value.toString());
        } else if (key === "birthdate") {
            const cleanVal = (value as string || "").trim();
            pbFormData.append(key, cleanVal ? `${cleanVal} 12:00:00.000Z` : "");
        } else if (key === "email") {
            const em = (value as string || "").trim();
            pbFormData.append(key, (em.includes("@") && em.includes(".")) ? em : "");
        } else if (["company", "templates", "retirement_homes", "facility"].includes(key)) {
            if (typeof value === "string" && value.trim().length > 0 && value !== "none") {
                pbFormData.append(key, value.trim());
            }
        } else if (key === "contacts") {
            if (Array.isArray(value) && value.length > 0) {
                value.filter(item => typeof item === "string" && item.trim().length > 0)
                    .forEach(item => pbFormData.append(key, item.toString()));
            }
        } else if (typeof value === "boolean") {
            pbFormData.append(key, value.toString());
        } else if (value !== null && value !== undefined && value !== "") {
            pbFormData.append(key, value.toString());
        }
    }

    pbFormData.append("contact_relations", JSON.stringify(activeRelations));
    if (caregiver) pbFormData.append("caregiver", caregiver);
    for (const inhId of inheritor) pbFormData.append("inheritor", inhId);

    if (insuranceId) pbFormData.append("insurance", insuranceId);

    const hourlyRate = Number(formData.hourly_wage ?? 40);
    pbFormData.append("hourly_rate", isNaN(hourlyRate) ? "40" : hourlyRate.toString());

    if (!pbFormData.get("company")) {
        const fallbackComp = rbacService.userCompanyId || orgaStore.company?.data?.[0]?.id || "";
        if (fallbackComp) pbFormData.set("company", fallbackComp);
    }

    const effectiveAssignedUserId = assignedUserId || (rbacService.isCaregiver ? (rbacService.currentUser?.id || "") : "");
    if (effectiveAssignedUserId) {
        pbFormData.append("assigned_employee", effectiveAssignedUserId);
    }

    const vhpMetaInfo = {
        reason: formData.careperson_reason,
        care_type: formData.careperson_care_type,
        pre_care_fulfilled: formData.careperson_pre_care,
        care_allowance: formData.careperson_care_allowance,
        updated_at: new Date().toISOString()
    };
    pbFormData.append("inheritor_info", JSON.stringify(vhpMetaInfo));

    if (uploadedSignatureFile) {
        pbFormData.append("sign", uploadedSignatureFile);
    } else if (signatureBlob) {
        pbFormData.append("sign", signatureBlob, "signature.png");
    }

    if (rbacService.isCaregiver) {
        pbFormData.set("status", "Inaktiv");
        const existingNotes = pbFormData.get("notes")?.toString() || "";
        pbFormData.set("notes", `${existingNotes}\n[NEUAUFNAHME - Entwurf zur Freigabe eingereicht]`.trim());
    }

    const newClient = await pb.collection("clients").create(pbFormData);

    if (effectiveAssignedUserId) {
        await employeeService.assignEmployeeToClient(newClient.id, effectiveAssignedUserId, false).catch(() => {});
    } else if (orgaStore.clients) {
        await orgaStore.clients.refresh().catch(() => {});
    }

    return { client: newClient, firstName, lastName };
}
