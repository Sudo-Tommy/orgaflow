// ==========================================
// ENUMS (Auswählbare Werte aus deiner DB)
// ==========================================
export type Role = 'guest' | 'user' | 'admin' | 'superadmin' | 'owner' | 'caregiver' | 'employee' | 'client' | 'developer';
export type EmploymentType = 'Vollzeit' | 'Teilzeit' | 'Minijob' | 'Freiberuflich' | 'Praktikum' | 'Werkstudent';
export type EmployeeStatus = 'Aktiv' | 'Inaktiv' | 'Urlaub' | 'Krank';
export type Salutation = 'Herr' | 'Frau' | 'Divers' | 'Keine Angabe';
export type MaritalStatus = 'Ledig' | 'Verheiratet' | 'Geschieden' | 'Verwitwet';
export type ClientStatus = 'Aktiv' | 'Inaktiv' | 'Verstorben';
export type InvoiceStatus = 'Entwurf' | 'Eingereicht' | 'In Bearbeitung' | 'Abgeschlossen' | 'Abgelehnt' | 'Storniert' | 'Teilweise bezahlt';
export type AccountingTransactionType = 'Einnahme' | 'Ausgabe';
export type AccountingPaymentMethod = 'Banküberweisung' | 'Bar';
export type AccountingStatus = 'Offen' | 'Bezahlt' | 'Überfälltig' | 'Storniert';
export type DocumentTemplateType = 'rechnung' | 'quittung' | 'arbeitszeitnachweis' | 'brief';
export type DriveRecordType = 'Anfahrt' | 'Auftragsfahrt';
export type InsuranceType = 'GKV (Gesetzlich)' | 'PKV (Privat)' | 'Beihilfe' | 'Berufsgenossenschaft';
export type LevelOfCare = '0' | '1' | '2' | '3' | '4' | '5';
export type TaxRate = '0' | '7' | '9' | '19';
export type InvoiceAdjustmentActionType = 'full_payment' | 'dispute' | 'bill_client_privat' | 'write_off';
export type ContactType = 'caregiver' | 'relative' | 'other';
export type ClientBillingType = '45a' | 'EL' | 'Kombi' | 'Privat' | 'VHP' | string;
