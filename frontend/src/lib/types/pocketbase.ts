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
    | 'improvement_proposals'
    | 'rbac_levels'
    | 'rbac_permissions'
    | 'rbac_config';

export interface PendingFileLink {
    field: string;
    pendingFileId: string;
    append?: boolean;
}

export interface OfflineParentLink {
    parentCollection: string;
    parentId: string;
    parentField: string;
}

export interface OfflineQueueItem {
    id: string;
    collection: CollectionName | string;
    action: 'create' | 'update' | 'delete';
    recordId?: string;
    data?: any;
    fileLinks?: PendingFileLink[];
    parentLink?: OfflineParentLink;
    label?: string;
    timestamp: number;
    retryCount: number;
    error?: string;
}

export interface PendingOfflineFile {
    id: string;
    queueId: string;
    fileName: string;
    mimeType: string;
    blob: Blob;
    createdAt: number;
}

export interface SyncLogEntry {
    id: string;
    collection: string;
    action: string;
    status: 'synced' | 'conflict_server_won' | 'error';
    message: string;
    timestamp: number;
}

export interface CachedRecord<T = any> {
    id: string;
    collection: string;
    data: T;
    cachedAt: number;
    updatedAt: string;
}
