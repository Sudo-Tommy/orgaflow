import type { RecordModel } from 'pocketbase';

export interface MailboxMessage extends RecordModel {
  user: string;
  message_id: string;
  folder: string;
  from_address: string;
  to_address: string;
  subject: string;
  body_text: string;
  body_html?: string;
  date: string;
  is_read: boolean;
  is_starred: boolean;
  client?: string;
  attachments?: string[];
  created: string;
  updated: string;
}

export interface EmailFilter {
  folder: string;
  isRead?: boolean;
  fromAddress?: string;
  search?: string;
  userId?: string;
  userEmail?: string;
}
