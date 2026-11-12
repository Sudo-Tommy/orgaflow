export interface ClientEditFormData {
    salutation: string;
    name_first: string;
    name_last: string;
    nationality: string;
    marital_status: string;
    email: string;
    phone: string;
    handy: string;
    status: string;
    level_of_care: string;
    street: string;
    housenr: string;
    zip: string;
    city: string;
    geofence_radius: number;
    birthdate: string;
    insurance: string;
    insurance_nr: string;
    hourly_wage: number;
    km_rate: number;
    tax_rate: string;
    billing_type: string;
    default_template: string;
    caregiver: string;
    assigned_employee: string;
    company: string;
    notes: string;
    inheritor: string;

    inheritor_name: string;
    inheritor_relation: string;
    inheritor_phone: string;
    inheritor_email: string;
    inheritor_has_power_of_attorney: boolean;
    inheritor_notes: string;
    inheritor_signature?: string;

    careperson_name: string;
    careperson_relation: string;
    careperson_birthdate: string;
    careperson_street: string;
    careperson_housenr: string;
    careperson_zip: string;
    careperson_city: string;
    careperson_phone: string;
    careperson_email: string;
    careperson_reason: string;
    careperson_care_type: string;
    careperson_pre_care: boolean;
    careperson_care_allowance: boolean;
    careperson_notes: string;
    careperson_signature?: string;
}

export function getDefaultClientEditFormData(): ClientEditFormData {
    return {
        salutation: "Keine Angabe",
        name_first: "",
        name_last: "",
        nationality: "Deutsch",
        marital_status: "Keine Angabe",
        email: "",
        phone: "",
        handy: "",
        status: "Aktiv",
        level_of_care: "",
        street: "",
        housenr: "",
        zip: "",
        city: "",
        geofence_radius: 150,
        birthdate: "",
        insurance: "",
        insurance_nr: "",
        hourly_wage: 40,
        km_rate: 0.3,
        tax_rate: "0",
        billing_type: "",
        default_template: "",
        caregiver: "",
        assigned_employee: "",
        company: "",
        notes: "",
        inheritor: "",

        inheritor_name: "",
        inheritor_relation: "Ehepartner/in",
        inheritor_phone: "",
        inheritor_email: "",
        inheritor_has_power_of_attorney: false,
        inheritor_notes: "",
        inheritor_signature: "",

        careperson_name: "",
        careperson_relation: "Ehepartner/in",
        careperson_birthdate: "",
        careperson_street: "",
        careperson_housenr: "",
        careperson_zip: "",
        careperson_city: "",
        careperson_phone: "",
        careperson_email: "",
        careperson_reason: "Erholungsurlaub",
        careperson_care_type: "stundenweise",
        careperson_pre_care: true,
        careperson_care_allowance: true,
        careperson_notes: "",
        careperson_signature: ""
    };
}
