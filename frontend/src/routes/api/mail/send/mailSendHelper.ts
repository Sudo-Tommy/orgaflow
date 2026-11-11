import type { MailRecipient } from '$lib/types/mail';

export const PB_URL = 'http://127.0.0.1:8090';
export const MICROSERVICE_URL = 'http://127.0.0.1:3000';
export const THROTTLE_MS = 700;

export function normalizeBearer(token: string): string {
  const t = (token || '').trim();
  return t.startsWith('Bearer ') ? t : `Bearer ${t}`;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchRecipient(id: string, token: string): Promise<MailRecipient | null> {
  const authHeader = normalizeBearer(token);

  // 1. Zuerst in Kontakte suchen
  try {
    const res = await fetch(`${PB_URL}/api/collections/contacts/records/${id}`, {
      headers: { Authorization: authHeader }
    });
    if (res.ok) {
      const c = await res.json();
      return {
        id: c.id,
        anrede: c.salutation || '',
        vorname: c.name_first || '',
        nachname: c.name_last || '',
        email: c.email || '',
        rolle: 'betreuer',
        organisation: c.company_name || '',
        opt_out: Boolean(c.opt_out),
        originType: 'contact'
      };
    }
  } catch {}

  // 2. In Klienten suchen
  try {
    const res = await fetch(`${PB_URL}/api/collections/clients/records/${id}`, {
      headers: { Authorization: authHeader }
    });
    if (res.ok) {
      const cl = await res.json();
      return {
        id: cl.id,
        anrede: cl.salutation || '',
        vorname: cl.name_first || '',
        nachname: cl.name_last || '',
        email: cl.email || '',
        rolle: 'klient',
        organisation: '',
        opt_out: Boolean(cl.opt_out || (cl.mailing_list === false)),
        originType: 'client'
      };
    }
  } catch {}

  return null;
}

export async function logMail(token: string, entry: {
  empfaenger_id?: string;
  empfaenger_name?: string;
  empfaenger_email?: string;
  template_id?: string;
  betreff: string;
  status: 'gesendet' | 'fehler';
  fehlermeldung?: string;
}): Promise<void> {
  try {
    await fetch(`${PB_URL}/api/collections/mail_logs/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: normalizeBearer(token)
      },
      body: JSON.stringify({
        ...entry,
        gesendet_am: new Date().toISOString()
      })
    });
  } catch (err) {
    console.error('[MassMail] Log-Fehler:', err);
  }
}

export async function sendMailViaMicroservice(token: string, payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<any> {
  const res = await fetch(`${MICROSERVICE_URL}/api/emails/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: normalizeBearer(token)
    },
    body: JSON.stringify({
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${res.status}: E-Mail-Versand fehlgeschlagen`);
  }
  return res.json();
}
