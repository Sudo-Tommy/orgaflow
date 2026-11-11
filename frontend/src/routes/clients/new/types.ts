import type { ContactRoleRelation } from "$lib/services/clientContactRoleHelper";

export interface ClientFormData {
    // Persönliche Daten
    salutation: string;
    name_first: string;
    name_last: string;
    marital_status: string;
    birthdate: string;
    nationality: string;
    street: string;
    housenr: string;
    zip: string;
    city: string;

    // Kontaktdaten
    email: string;
    phone: string;
    handy: string;

    // Pflege & Status
    status: string;
    level_of_care: string;
    insurance_nr: string;
    insurance: string;
    other_insurance_name: string;
    retirement_homes: string;
    contacts: string[];
    contact_relations: Record<string, ContactRoleRelation>;
    caregiver: string;

    // Notizen
    notes: string;

    // Abrechnungskonditionen
    billing_type: string;
    hourly_wage: number;
    km_rate: number;
    tax_rate: string;
    templates: string;

    // Firmenzuordnung
    company: string;

    // Erben- / Bevollmächtigten-Felder (Legacy-Kompatibilität)
    inheritor: string;
    inheritor_name: string;
    inheritor_relation: string;
    inheritor_phone: string;
    inheritor_email: string;
    inheritor_has_power_of_attorney: boolean;
    inheritor_notes: string;
    inheritor_signature: string;

    // Verhinderungspflege (§ 39 SGB XI) Parameter
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
    careperson_signature: string;
}

export type WizardStepId = "master" | "care" | "inheritor" | "billing";

export interface WizardStep {
    id: WizardStepId;
    title: string;
    subtitle: string;
    icon: string;
    stepNumber: number;
}

export function createDefaultClientFormData(): ClientFormData {
    return {
        salutation: "Keine Angabe",
        name_first: "",
        name_last: "",
        marital_status: "Keine Angabe",
        birthdate: "",
        nationality: "Deutsch",
        street: "",
        housenr: "",
        zip: "",
        city: "",
        email: "",
        phone: "",
        handy: "",
        status: "Aktiv",
        level_of_care: "",
        insurance_nr: "",
        insurance: "",
        other_insurance_name: "",
        retirement_homes: "",
        contacts: [],
        contact_relations: {},
        caregiver: "",
        notes: "",
        billing_type: "",
        hourly_wage: 40,
        km_rate: 0.3,
        tax_rate: "0",
        templates: "",
        company: "",
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
