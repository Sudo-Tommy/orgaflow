// src/lib/services/systemDialogTypes.ts

export interface SystemDialogReadInfo {
    first_viewed_at?: string;
    confirmed_at?: string;
    reply_text?: string;
    reply_at?: string;
    reply_seen_by_admin?: boolean;
}

export interface SystemDialogRecord {
    id: string;
    sender: string;
    recipients?: string[];
    is_broadcast?: boolean;
    title: string;
    message: string;
    priority: 'urgent' | 'important' | 'info';
    attachments?: string[];
    read_status?: Record<string, SystemDialogReadInfo>;
    status?: 'open' | 'answered' | 'completed';
    statuses?: Array<{
        user_name: string;
        reply_text?: string;
        confirmed_at?: string;
        first_viewed_at?: string;
        reply_at?: string;
    }>;
    created?: string;
    updated?: string;
    expand?: any;
}

export interface AdminReplyEvent {
    dialog: SystemDialogRecord;
    userId: string;
    userName: string;
    userAvatar?: string;
    replyText: string;
    replyAt: string;
}
