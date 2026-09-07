import { OrgaLiveCollection } from '$lib/services/OrgaLiveCollection.svelte';
import type { 
    UserRecord, SuperuserRecord, AccountingRecord, AppointmentRecord, 
    ClientRecord, CompanyRecord, ContactRecord, DocumentTemplateRecord, 
    DriveRecordRecord, ExpenditureRecord, InsuranceRecord, InvoiceRecord, 
    LetterboxRecord, LiveChatRecord, MailboxMessageRecord, RetirementHomeRecord, 
    TaskRecord, TimeRecordRecord, UpdateRecord, SystemPromptRecord 
} from '$lib/types/orgaTypes';

// Hier definieren wir unsere zentralen Daten-Töpfe.
// Du kannst hier direkt Sortierungen (-created bedeutet absteigend) oder 
// Expands (z.B. lade die Versicherungsdaten beim Klienten direkt mit) festlegen.

export const orgaStore = {
    users: new OrgaLiveCollection<UserRecord>('users', { 
        expand: 'company'
    }),
    superusers: new OrgaLiveCollection<SuperuserRecord>('_superusers'),
    
    accounting: new OrgaLiveCollection<AccountingRecord>('accounting', { 
        sort: '-transaction_date',
        expand: 'related_document,createdby'
    }),
    
    appointments: new OrgaLiveCollection<AppointmentRecord>('appointments', { 
        sort: '-appointment', // Neueste Termine zuerst
        expand: 'user,client,drive_record,time_record,tasks,expenditures,appointment_at' // WIRKLICH ALLE Verknüpfungen
    }),
    
    clients: new OrgaLiveCollection<ClientRecord>('clients', { 
        sort: 'name_last', 
        expand: 'insurance,retirement_homes,contacts,templates,caregiver,inheritor'
        // WICHTIG: Entferne hier den harten Filter, der 'Verstorben' oder 'Inaktiv' ausschließt!
    }),

    
    company: new OrgaLiveCollection<CompanyRecord>('company', { 
        expand: 'users,clients'
    }),
    
    contacts: new OrgaLiveCollection<ContactRecord>('contacts', { sort: 'name_last' }),
    document_templates: new OrgaLiveCollection<DocumentTemplateRecord>('document_templates'),
    drive_records: new OrgaLiveCollection<DriveRecordRecord>('drive_records'),
    expenditure: new OrgaLiveCollection<ExpenditureRecord>('expenditure'),
    insurancies: new OrgaLiveCollection<InsuranceRecord>('insurancies', { sort: 'name' }),

    invoices: new OrgaLiveCollection<InvoiceRecord>('invoices', {
        sort: '-issue_date', // Neueste Rechnungen zuerst
        expand: 'user,client,appointments,company' // WIRKLICH ALLE Verknüpfungen
    }),

    letterboxes: new OrgaLiveCollection<LetterboxRecord>('letterboxes'),
    
    live_chat: new OrgaLiveCollection<LiveChatRecord>('live_chat', { 
        sort: '-created', 
        expand: 'user,whispered_user'
    }),
    
    mailbox_messages: new OrgaLiveCollection<MailboxMessageRecord>('mailbox_messages', { 
        sort: '-date',
        expand: 'client'
    }),
    
    retirement_homes: new OrgaLiveCollection<RetirementHomeRecord>('retirement_homes', { 
        sort: 'name',
        expand: 'contacts'
    }),
    
    tasks: new OrgaLiveCollection<TaskRecord>('tasks', { sort: '-created' }),
    time_records: new OrgaLiveCollection<TimeRecordRecord>('time_records', { sort: '-start' }),
    updates: new OrgaLiveCollection<UpdateRecord>('updates', { sort: '-date' }),
    system_prompts: new OrgaLiveCollection<SystemPromptRecord>('system_prompts', { sort: '-created' })
};