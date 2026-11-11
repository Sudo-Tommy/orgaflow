export interface PortalNewClientFormData {
    company: string;
    salutation: string;
    name_first: string;
    name_last: string;
    birthdate: string;
    marital_status: string;
    nationality: string;
    street: string;
    housenr: string;
    zip: string;
    city: string;
    email: string;
    phone: string;
    handy: string;
    level_of_care: string;
    insurance_nr: string;
    insurance: string;
    other_insurance_name: string;
    other_insurance_street: string;
    other_insurance_zip: string;
    other_insurance_city: string;
    retirement_homes: string;
    notes: string;
    // Gesetzlicher Betreuer / Bevollmächtigte Person
    has_caregiver: boolean;
    caregiver_relation: string;
    caregiver_salutation: string;
    caregiver_company: string;
    caregiver_name_first: string;
    caregiver_name_last: string;
    caregiver_phone: string;
    caregiver_email: string;
    caregiver_street: string;
    caregiver_housenr: string;
    caregiver_zip: string;
    caregiver_city: string;
    caregiver_has_power_of_attorney: boolean;
    caregiver_notes: string;
    // Direkter Terminwunsch / Erstgespräch
    request_appointment: boolean;
    appointment_service: string;
    appointment_date: string;
    appointment_time: string;
    appointment_notes: string;
}

export function createDefaultNewClientFormData(defaultCompanyId = ""): PortalNewClientFormData {
    return {
        company: defaultCompanyId,
        salutation: "Keine Angabe",
        name_first: "",
        name_last: "",
        birthdate: "",
        marital_status: "",
        nationality: "",
        street: "",
        housenr: "",
        zip: "",
        city: "",
        email: "",
        phone: "",
        handy: "",
        level_of_care: "",
        insurance_nr: "",
        insurance: "",
        other_insurance_name: "",
        other_insurance_street: "",
        other_insurance_zip: "",
        other_insurance_city: "",
        retirement_homes: "",
        notes: "",
        has_caregiver: false,
        caregiver_relation: "Gesetzlicher Betreuer",
        caregiver_salutation: "Keine Angabe",
        caregiver_company: "",
        caregiver_name_first: "",
        caregiver_name_last: "",
        caregiver_phone: "",
        caregiver_email: "",
        caregiver_street: "",
        caregiver_housenr: "",
        caregiver_zip: "",
        caregiver_city: "",
        caregiver_has_power_of_attorney: false,
        caregiver_notes: "",
        request_appointment: false,
        appointment_service: "Kennenlerngespräch / Erstberatung",
        appointment_date: "",
        appointment_time: "",
        appointment_notes: "",
    };
}

