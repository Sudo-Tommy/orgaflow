import type { RecordModel } from 'pocketbase';
export * from './orgaTypes';

export interface PaginatedResult<T> {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
    items: T[];
}

export type CollectionName = 
    | 'users'
    | '_superusers'
    | 'accounting'
    | 'appointments'
    | 'clients'
    | 'company'
    | 'contacts'
    | 'document_templates'
    | 'drive_records'
    | 'expenditure'
    | 'insurancies'
    | 'invoices'
    | 'invoice_adjustments'
    | 'letterboxes'
    | 'live_chat'
    | 'mailbox_messages'
    | 'retirement_homes'
    | 'nursing_homes'
    | 'tasks'
    | 'time_records'
    | 'updates'
    | 'system_prompts'
    | 'employee_clients'
    | 'employee_contacts'
    | 'improvement_proposals';

export interface OfflineQueueItem {
    id: string;
    collection: CollectionName | string;
    action: 'create' | 'update' | 'delete';
    recordId?: string;
    data?: any;
    timestamp: number;
    retryCount: number;
    error?: string;
}

export interface CachedRecord<T = any> {
    id: string;
    collection: string;
    data: T;
    cachedAt: number;
    updatedAt: string;
}
