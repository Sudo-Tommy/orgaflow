import type { BaseRecord } from './orgaCoreRecords';
import type {
    AccountingTransactionType,
    AccountingPaymentMethod,
    AccountingStatus,
    DocumentTemplateType,
    DriveRecordType,
    InsuranceType,
    InvoiceStatus,
    LevelOfCare,
    MaritalStatus,
    Salutation,
    TaxRate,
    ClientStatus,
    ClientBillingType,
    InvoiceAdjustmentActionType
} from './orgaEnums';

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
    assigned_to?: string; // Relation
    client?: string[]; // Relation
    is_private?: boolean;
    appointment?: string; // date
    description?: string;
    drive_record?: string[]; // Relation
    time_record?: string[]; // Relation
    tasks?: string[]; // Relation
    expenditures?: string[]; // Relation
    location_address?: string;
    pickup_address?: string;
    documents?: string[];
    route_distance?: number;
    route_duration?: number;
    report?: string;
    notes?: string;
    settled?: boolean;
    checklist?: any;
    billing_type?: ClientBillingType;
    billing_user?: string; // Relation
    status?: 'geplant' | 'abgesagt' | string;
    cancellation_reason?: string;
    remaining_amount?: number;
    already_paid_amount?: number;
    original_amount?: number;
    parent_invoice?: string;
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
    billing_type?: ClientBillingType;
    billing_user?: string; // Relation
    group_drive_records?: boolean;
    insurance?: string | string[]; // Relation
    retirement_homes?: string | string[]; // Relation
    contacts?: string[]; // Relation
    templates?: string | string[]; // Relation
    caregiver?: string; // Relation
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
    dispute_hold?: boolean;
    paid_amount?: number;
    remaining_amount?: number;
    write_off_amount?: number;
    write_off_reason?: string;
    parent_invoice?: string;
}

export interface InvoiceAdjustmentRecord extends BaseRecord {
    invoice: string;
    action_type: InvoiceAdjustmentActionType;
    difference_amount?: number;
    received_amount?: number;
    reference_nr?: string;
    notes?: string;
    createdby?: string;
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
    status?: 'Neu' | 'In Bearbeitung' | 'Gelöst' | 'Archiviert' | string;
    admin_notes?: string;
    admin_reply?: string;
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

export interface NursingHomeRecord extends BaseRecord {
    name: string;
    street?: string;
    zip?: string;
    city?: string;
    phone?: string;
    status?: 'preliminary' | 'verified';
}

export interface TaskRecord extends BaseRecord {
    title: string;
    description?: string;
    due_date?: string;
    status?: 'Offen' | 'In Bearbeitung' | 'Erledigt' | string;
    client?: string;
    related_invoice?: string;
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
