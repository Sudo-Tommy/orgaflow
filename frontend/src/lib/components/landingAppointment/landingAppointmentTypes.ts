export interface OpenAppointmentOptions {
    clientId?: string;
    clientName?: string;
    companyId?: string;
    role?: "client" | "caregiver" | "contact" | "user" | "admin" | "guest";
    senderName?: string;
    email?: string;
    phone?: string;
    street?: string;
    zip_city?: string;
    availableClients?: { id: string; name: string; company?: string }[];
}

export interface AppointmentCategory {
    label: string;
    icon: string;
}

export const APPOINTMENT_CATEGORIES: AppointmentCategory[] = [
    { label: "Arzt- & Therapiebegleitung", icon: "🩺" },
    { label: "Einkauf & Besorgungen", icon: "🛒" },
    { label: "Spaziergang & Alltagsbegleitung", icon: "🌳" },
    { label: "Behördengang & Anträge", icon: "🏛️" },
    { label: "Pflegekassen-Beratung", icon: "💡" },
    { label: "Persönlicher Austausch", icon: "☕" }
];

export const DOCTOR_OR_AUTHORITY_KEYWORD_REGEX =
    /arzt|ärzt|doktor|dr\.|praxis|klinik|klinikum|krankenhaus|sprechstunde|untersuchung|behandlung|therapie|physio|ergotherap|logopäd|dialyse|\bhno\b|\bmrt\b|\bct\b|röntgen|ultraschall|sonograph|blutabnahme|rezept|überweisung|kardiolog|neurolog|orthopäd|dermatolog|urolog|gynäkolog|chirurg|pneumolog|psychiatr|radiolog|internist|onkolog|pädiatr|zahnbehandlung|zahnarzt|behörd|bürgeramt|rathaus|einwohnermelde|sozialamt|finanzamt|arbeitsamt|arbeitsagentur|jobcenter|standesamt|versorgungsamt|landratsamt|jugendamt|amtsgericht|gericht|polizei|rentenversicherung|pflegekasse|krankenkasse|ausländeramt|ausländerbehörde|zulassungsstelle|meldeamt|ordnungsamt|bauamt|notar|notariat|anwalt|kanzlei|gutachter|gerichtstermin|[a-zäöüß]*amt\b|\bamt\b|\bämter\b/i;

export function hasDoctorOrAuthorityKeyword(text: string): boolean {
    return DOCTOR_OR_AUTHORITY_KEYWORD_REGEX.test(text || "");
}
