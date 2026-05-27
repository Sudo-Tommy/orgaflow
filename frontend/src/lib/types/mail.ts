import type { RecordModel } from 'pocketbase';

/**
 * Zentralisierte Typdefinitionen für das E-Mail-Modul.
 * Ausgelagert, um Svelte 5/TypeScript Compiler-Fehler in .svelte-Dateien zu vermeiden.
 */

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
  client?: string; // Optional relation to client
  attachments?: string[]; // E-Mail Anhänge (PocketBase File Array)
  created: string;
  updated: string;
}

export interface SendEmailInput {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  body_html?: string;
  attachments?: File[];
}