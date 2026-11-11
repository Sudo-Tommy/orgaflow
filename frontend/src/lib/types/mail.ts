import type { RecordModel } from 'pocketbase';

/**
 * Zentralisierte Typdefinitionen für das E-Mail- und Massenmail-Modul.
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
  client?: string;
  attachments?: string[];
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

export type RecipientRole = 'betreuer' | 'klient' | 'angehoeriger' | 'partner';

export interface MailRecipient {
  id: string;
  anrede: string;
  vorname: string;
  nachname: string;
  email: string;
  rolle: RecipientRole;
  organisation: string;
  opt_out: boolean;
  last_contacted?: string;
  originType: 'contact' | 'client';
}

export interface MailTemplate extends RecordModel {
  id: string;
  titel: string;
  betreff: string;
  inhalt: string;
  category?: string;
  created: string;
  updated: string;
}

export interface MailLog extends RecordModel {
  id: string;
  empfaenger_id?: string;
  empfaenger_name?: string;
  empfaenger_email?: string;
  template_id?: string;
  betreff: string;
  status: 'gesendet' | 'fehler';
  fehlermeldung?: string;
  gesendet_am?: string;
}

export interface MassMailPayload {
  recipientIds: string[];
  subject: string;
  bodyTemplate: string;
  templateId?: string;
  isTest?: boolean;
}

export interface MassMailProgressEvent {
  current: number;
  total: number;
  recipient: string;
  status: 'gesendet' | 'fehler' | 'wartend';
  errorMessage?: string;
}
