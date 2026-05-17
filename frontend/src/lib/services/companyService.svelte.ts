import { pb } from "$lib/services/pocketbase";

export function useCompanyService() {
    let isLoading = $state(false);
    let errorMsg = $state("");
    let successMsg = $state("");

    let id = $state<string | null>(null);
    let formData = $state({
        name: "",
        email: "",
        number_telephone: "",
        number_mobile: "",
        website: "",
        street: "",
        housenr: "",
        zip: "",
        city: "",
        ik_number: "",
        bank_name: "",
        bank_iban: "",
        bank_bic: "",
        vatcode: "",
        calendar_color: "#4f46e5"
    });

    let logoFile = $state<File | null>(null);
    let existingLogoUrl = $state("");
    let deleteLogo = $state(false);

    let isLoaded = $state(false);

    function load(companyRecord: any) {
        if (companyRecord) {
            id = companyRecord.id;
            formData = {
                name: companyRecord.name || "",
                email: companyRecord.email || "",
                number_telephone: companyRecord.number_telephone || "",
                number_mobile: companyRecord.number_mobile || "",
                website: companyRecord.website || "",
                street: companyRecord.street || "",
                housenr: companyRecord.housenr || "",
                zip: companyRecord.zip || "",
                city: companyRecord.city || "",
                ik_number: companyRecord.ik_number || "",
                bank_name: companyRecord.bank_name || "",
                bank_iban: companyRecord.bank_iban || "",
                bank_bic: companyRecord.bank_bic || "",
                vatcode: companyRecord.vatcode || "",
                calendar_color: companyRecord.calendar_color || "#4f46e5"
            };
            if (companyRecord.logo) {
                existingLogoUrl = pb.files.getURL(companyRecord, companyRecord.logo);
            } else {
                existingLogoUrl = "";
            }
        } else {
            id = null;
        }
        deleteLogo = false;
        logoFile = null;
        isLoaded = true;
    }

    async function save() {
        isLoading = true;
        errorMsg = "";
        successMsg = "";

        try {
            const pbFormData = new FormData();
            
            for (const [key, value] of Object.entries(formData)) {
                pbFormData.append(key, value as string);
            }

            if (logoFile) {
                pbFormData.append("logo", logoFile);
            } else if (deleteLogo) {
                pbFormData.append("logo", ""); // PocketBase löscht die Datei bei einem leeren String
            }

            if (id) {
                await pb.collection('company').update(id, pbFormData);
            } else {
                await pb.collection('company').create(pbFormData);
            }

            successMsg = "Firmendaten erfolgreich gespeichert!";
            setTimeout(() => successMsg = "", 3000);
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Speichern.";
        } finally {
            isLoading = false;
        }
    }

    return {
        get id() { return id; },
        get formData() { return formData; },
        set formData(v) { formData = v; },
        get logoFile() { return logoFile; },
        set logoFile(v) { logoFile = v; },
        get existingLogoUrl() { return existingLogoUrl; },
        get deleteLogo() { return deleteLogo; },
        set deleteLogo(v) { deleteLogo = v; },
        get isLoading() { return isLoading; },
        get errorMsg() { return errorMsg; },
        get successMsg() { return successMsg; },
        get isLoaded() { return isLoaded; },
        load,
        save
    };
}