import type { RecordModel } from 'pocketbase';
import type { Role, EmploymentType, EmployeeStatus, Salutation, ContactType } from './orgaEnums';

// Basis-Typ für alle PocketBase Records
export interface BaseRecord extends RecordModel {
    id: string;
    created: string;
    updated: string;
    expand?: Record<string, any>;
}

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
    qualifications?: string;
    emergency_contacts?: string;
    employment_type?: EmploymentType;
    status?: EmployeeStatus;
    assigned_clients?: string[];
    assigned_contacts?: string[];
    quick_access_token?: string;
    token_expires_at?: string;
    facility?: string;
}

export interface SuperuserRecord extends BaseRecord {
    email: string;
    verified?: boolean;
    emailVisibility?: boolean;
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
    contact_type?: ContactType;
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
    documents?: string[]; // files
    created_by?: string; // Relation
    assigned_employees?: string[]; // Relation
}

export interface EmployeeClientRecord extends BaseRecord {
    employee: string;
    client: string;
    facility?: string;
    notes?: string;
}

export interface EmployeeContactRecord extends BaseRecord {
    employee: string;
    contact: string;
    access_type?: 'read_only' | 'full';
}

export interface SystemPromptRecord extends BaseRecord {
    title: string;
    calendar_week?: string;
    prompt_content: string;
    feedback_count?: number;
    source_period_start?: string;
    source_period_end?: string;
    status: 'open' | 'applied' | 'archived';
    raw_summary?: string;
    metadata?: Record<string, any>;
}

export interface ImprovementProposalRecord extends BaseRecord {
    title: string;
    category: 'UI/UX & Design' | 'Core Engine & API' | 'Haushaltsbuch & Finanzen' | 'Dokumente & Vorlagen' | 'Termine & Außendienst' | 'Sicherheit & Audit' | 'Sonstiges';
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'idea' | 'planned' | 'in_progress' | 'implemented';
    description: string;
    solution_concept?: string;
    expected_behavior?: string;
    ai_prompt?: string;
    team_briefing?: string;
    tags?: string;
    source_type?: 'manual' | 'feedback' | 'chat' | 'inquiry';
    source_id?: string;
    author_name?: string;
    author?: string;
}
