import type { RecordModel } from 'pocketbase';

// Basis-Typ für alle PocketBase Records
export interface BaseRecord extends RecordModel {
    id: string;
    created: string;
    updated: string;
    expand?: Record<string, any>;
}

// ==========================================
// ENUMS (Auswählbare Werte aus deiner DB)
// ==========================================
export type Role = 'guest' | 'user' | 'admin' | 'superadmin';
export type Salutation = 'Herr' | 'Frau' | 'Divers' | 'Keine Angabe';
export type MaritalStatus = 'Ledig' | 'Verheiratet' | 'Geschieden' | 'Verwitwet';
export type ClientStatus = 'Aktiv' | 'Inaktiv' | 'Verstorben';
export type InvoiceStatus = 'Entwurf' | 'Eingereicht' | 'In Bearbeitung' | 'Abgeschlossen' | 'Abgelehnt' | 'Storniert';
export type AccountingTransactionType = 'Einnahme' | 'Ausgabe';
export type AccountingPaymentMethod = 'Banküberweisung' | 'Bar';
export type AccountingStatus = 'Offen' | 'Bezahlt' | 'Überfälltig' | 'Storniert';
export type DocumentTemplateType = 'rechnung' | 'quittung' | 'arbeitszeitnachweis' | 'brief';
export type DriveRecordType = 'Anfahrt' | 'Auftragsfahrt';
export type InsuranceType = 'GKV (Gesetzlich)' | 'PKV (Privat)' | 'Beihilfe' | 'Berufsgenossenschaft';
export type LevelOfCare = '0' | '1' | '2' | '3' | '4' | '5';
export type TaxRate = '0' | '7' | '9' | '19';

// ==========================================
// COLLECTION TYPEN
// ==========================================

export interface UserRecord extends BaseRecord {
    email: string;
    username: string;
    name_first: string;
    name_last: string;
    date_birth?: string;
    street?: string;
    housenr?: string;
    zip?: string;
    city?: string;
    role?: Role;
    sign?: string; // file
    company?: string | string[]; // Relation
    tel?: string;
    handy?: string;
    smtp_mail?: string;
    smtp_password?: string;
}

export interface SuperuserRecord extends BaseRecord {
    email: string;
    verified?: boolean;
    emailVisibility?: boolean;
}

export interface AccountingRecord extends BaseRecord {
    title?: string;
    transaction_type?: AccountingTransactionType;
    amount_net?: number;
    tax_rate?: TaxRate;
    amount_gross?: number;
    transaction_date?: string; // date
    category?: string;
    account_number?: string;
    payment_method?: AccountingPaymentMethod;
    status?: AccountingStatus;
    receipt_file?: string[]; // file (max 10)
    related_document?: string | string[]; // Relation
    createdby?: string | string[]; // Relation
    notes?: string;
}

export interface AppointmentRecord extends BaseRecord {
    user?: string; // Relation
    client?: string[]; // Relation
    is_private?: boolean;
    appointment?: string; // date
    description?: string;
    drive_record?: string[]; // Relation
    time_record?: string[]; // Relation
    tasks?: string[]; // Relation
    expenditures?: string[]; // Relation
}

export interface ClientRecord extends BaseRecord {
    salutation?: Salutation;
    name_first?: string;
    name_last?: string;
    marital_status?: MaritalStatus;
    birthdate?: string;
    nationality?: string;
    street?: string;
    housenr?: string;
    zip?: string;
    city?: string;
    email?: string;
    phone?: string;
    handy?: string;
    level_of_care?: LevelOfCare;
    insurance_nr?: string;
    notes?: string;
    sign?: string; // file
    status?: ClientStatus;
    hourly_rate?: number;
    tax_rate?: number;
    km_rate?: number;
    group_drive_records?: boolean;
    insurance?: string | string[]; // Relation
    retirement_homes?: string | string[]; // Relation
    contacts?: string[]; // Relation
    templates?: string | string[]; // Relation
    caregiver?: string; // Relation
}

export interface CompanyRecord extends BaseRecord {
    name: string;
    street: string;
    housenr: string;
    zip: string;
    city: string;
    users?: string[]; // Relation
    logo?: string; // file
    ik_number?: string;
    bank_name?: string;
    bank_iban?: string;
    bank_bic?: string;
    vatcode?: string;
    clients?: string[]; // Relation
    number_telephone?: string;
    number_mobile?: string;
    email?: string;
    website?: string;
}

export interface ContactRecord extends BaseRecord {
    salutation?: Salutation;
    company_name?: string;
    name_first?: string;
    name_last?: string;
    email?: string;
    phone?: string;
    street?: string;
    housenr?: string;
    zip?: string;
    city?: string;
    notes?: any; // JSON
    sign?: string; // file
}

export interface DocumentTemplateRecord extends BaseRecord {
    title?: string;
    type?: DocumentTemplateType;
    content_html?: any; // JSON
    css_style?: any; // JSON
}

export interface DriveRecordRecord extends BaseRecord {
    type?: DriveRecordType;
    km?: number;
    lump_sum?: number;
}

export interface ExpenditureRecord extends BaseRecord {
    titel?: string;
    sum?: number;
}

export interface InsuranceRecord extends BaseRecord {
    name?: string;
    type?: InsuranceType;
    street?: string;
    zip?: string;
    city?: string;
    email?: string;
    phone?: string;
    billing_address_extra?: string;
    notes?: string; // Editor HTML
}

export interface InvoiceRecord extends BaseRecord {
    user?: string | string[]; // Relation
    client?: string | string[]; // Relation
    invoice_nr?: string;
    status?: InvoiceStatus;
    notes?: string;
    pdf?: string[]; // file
    issue_date?: string; // date
    due_date?: string; // date
    tax_rate?: TaxRate;
    netto?: number;
    tax_sum?: number;
    brutto?: number;
    hourly_wage?: number;
    travel_expanses_rate?: number;
    table_positions?: any; // JSON
    table_sum_positions?: any; // JSON
    appointments?: string[]; // Relation
    company?: string | string[]; // Relation
}

export interface LetterboxRecord extends BaseRecord {
    location?: string;
    geoPoint?: string; // geoPoint string
    daysTimes_emptying?: any; // JSON
}

export interface LiveChatRecord extends BaseRecord {
    text?: string;
    user?: string | string[]; // Relation
    whispered?: boolean;
    whispered_user?: string | string[]; // Relation
    file?: string; // file
}

export interface MailboxMessageRecord extends BaseRecord {
    message_id?: string;
    folder?: string;
    from_address?: string;
    to_address?: string;
    subject?: string;
    body_text?: string;
    body_html?: string; // Editor HTML
    date?: string; // date
    is_read?: boolean;
    client?: string | string[]; // Relation
}

export interface RetirementHomeRecord extends BaseRecord {
    name?: string;
    phone?: string;
    email?: string;
    address?: string; // geoPoint string
    contacts?: string[]; // Relation
}

export interface TaskRecord extends BaseRecord {
    title: string;
    description?: string;
}

export interface TimeRecordRecord extends BaseRecord {
    start?: string; // date
    end?: string; // date
}

export interface UpdateRecord extends BaseRecord {
    number?: number;
    date?: string; // date
    text?: string;
}