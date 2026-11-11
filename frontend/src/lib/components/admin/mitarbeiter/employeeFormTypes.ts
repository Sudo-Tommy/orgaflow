import type { EmploymentType, EmployeeStatus } from '$lib/types/orgaTypes';

export interface EmployeeFormData {
    name_first: string;
    name_last: string;
    email: string;
    username: string;
    password: string;
    role: string;
    employment_type: EmploymentType;
    status: EmployeeStatus;
    qualifications: string;
    emergency_contacts: string;
    tel: string;
    handy: string;
    street: string;
    housenr: string;
    zip: string;
    city: string;
}

export function getDefaultEmployeeFormData(): EmployeeFormData {
    return {
        name_first: '',
        name_last: '',
        email: '',
        username: '',
        password: '',
        role: 'employee',
        employment_type: 'Vollzeit',
        status: 'Aktiv',
        qualifications: '',
        emergency_contacts: '',
        tel: '',
        handy: '',
        street: '',
        housenr: '',
        zip: '',
        city: ''
    };
}

// Alphabetisch sortiert nach dem angezeigten Text gemäß alphabetical-select.md
export const ROLE_OPTIONS = [
    { label: 'Betriebsleiter (Admin)', value: 'admin' },
    { label: 'Betreuer (Caregiver)', value: 'caregiver' },
    { label: 'Entwickler (Developer)', value: 'developer' },
    { label: 'Mitarbeiter / Pflegekraft', value: 'employee' },
    { label: 'Superadmin', value: 'superadmin' }
];

export const EMPLOYMENT_TYPE_OPTIONS: { label: string; value: EmploymentType }[] = [
    { label: 'Freiberuflich / Honorar', value: 'Freiberuflich' },
    { label: 'Minijob (538 €)', value: 'Minijob' },
    { label: 'Praktikum', value: 'Praktikum' },
    { label: 'Teilzeit', value: 'Teilzeit' },
    { label: 'Vollzeit', value: 'Vollzeit' },
    { label: 'Werkstudent', value: 'Werkstudent' }
];

export const STATUS_OPTIONS: { label: string; value: EmployeeStatus }[] = [
    { label: 'Aktiv im Dienst', value: 'Aktiv' },
    { label: 'Im Urlaub', value: 'Urlaub' },
    { label: 'Inaktiv / Pausiert', value: 'Inaktiv' },
    { label: 'Krank / Abwesend', value: 'Krank' }
];
