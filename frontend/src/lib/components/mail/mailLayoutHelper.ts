import type { MailboxMessage } from '$lib/services/emailServiceStore.svelte';
import { cleanGarbledQuoteText } from '$lib/services/emailQuoteFormatter';

export function extractPlainTextFromHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|tr|li|blockquote)>/gi, '\n\n')
    .replace(/<\/td>/gi, '  ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface ReplyForwardPayload {
  to: string;
  subject: string;
  body: string;
  quoteHtml?: string;
}

export function buildReplyPayload(email: MailboxMessage): ReplyForwardPayload {
  const to = email.from_address?.match(/<(.+)>/)?.[1] || email.from_address || '';
  const subject = email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`;
  const rawQuote = (email.body_text || '').trim() || extractPlainTextFromHtml(email.body_html || '');
  const quoteBody = cleanGarbledQuoteText(rawQuote);
  const dateStr = email.date ? new Date(email.date).toLocaleString('de-DE') : '';
  const body = `\n\n\n--- Ursprüngliche Nachricht ---\nVon: ${email.from_address}\nDatum: ${dateStr}\nBetreff: ${email.subject || ''}\n\n${quoteBody}`;

  return {
    to,
    subject,
    body,
    quoteHtml: email.body_html || undefined
  };
}

export function buildForwardPayload(email: MailboxMessage): ReplyForwardPayload {
  const subject = email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject || ''}`;
  const rawQuote = (email.body_text || '').trim() || extractPlainTextFromHtml(email.body_html || '');
  const quoteBody = cleanGarbledQuoteText(rawQuote);
  const dateStr = email.date ? new Date(email.date).toLocaleString('de-DE') : '';
  const body = `\n\n\n--- Weitergeleitete Nachricht ---\nVon: ${email.from_address}\nDatum: ${dateStr}\nBetreff: ${email.subject || ''}\nAn: ${email.to_address || ''}\n\n${quoteBody}`;

  return {
    to: '',
    subject,
    body,
    quoteHtml: email.body_html || undefined
  };
}
