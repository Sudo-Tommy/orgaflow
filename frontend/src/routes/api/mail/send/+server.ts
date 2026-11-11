import type { RequestHandler } from '@sveltejs/kit';
import { parseMailTemplate, renderResponsiveMailHtml } from '$lib/utils/mailParser';
import type { MailRecipient, MassMailPayload } from '$lib/types/mail';
import {
  PB_URL,
  THROTTLE_MS,
  normalizeBearer,
  sleep,
  fetchRecipient,
  logMail,
  sendMailViaMicroservice
} from './mailSendHelper';

export const POST: RequestHandler = async ({ request }) => {
  const rawAuth = request.headers.get('Authorization') || '';
  if (!rawAuth.trim()) {
    return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), { status: 401 });
  }
  const authHeader = normalizeBearer(rawAuth);

  const payload: MassMailPayload = await request.json().catch(() => ({}));
  const { recipientIds = [], subject = '', bodyTemplate = '', templateId = '', isTest = false } = payload;

  if (!subject.trim() || !bodyTemplate.trim()) {
    return new Response(JSON.stringify({ error: 'Betreff und Vorlage sind erforderlich.' }), { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (isTest) {
          sendEvent({ current: 0, total: 1, recipient: 'Testversand', status: 'wartend' });

          const userRes = await fetch(`${PB_URL}/api/collections/users/records?perPage=1`, {
            headers: { Authorization: authHeader }
          }).then(r => r.json()).catch(() => null);
          const adminEmail = userRes?.items?.[0]?.email || 'info@ihre-seniorenassistenz.com';

          const dummyRecipient: MailRecipient = {
            id: 'test-preview',
            anrede: 'Frau',
            vorname: 'Erika',
            nachname: 'Muster-Betreuerin',
            email: adminEmail,
            rolle: 'betreuer',
            organisation: 'Betreuungsbüro Musterstadt',
            opt_out: false,
            originType: 'contact'
          };

          const parsedSubj = parseMailTemplate(subject, dummyRecipient);
          const parsedBody = parseMailTemplate(bodyTemplate, dummyRecipient);
          const html = renderResponsiveMailHtml(parsedBody);

          try {
            await sendMailViaMicroservice(authHeader, {
              to: adminEmail,
              subject: `[TEST] ${parsedSubj}`,
              html,
              text: parsedBody
            });

            await logMail(authHeader, {
              empfaenger_id: 'test-admin',
              empfaenger_name: 'Test-Admin',
              empfaenger_email: adminEmail,
              template_id: templateId || undefined,
              betreff: `[TEST] ${parsedSubj}`,
              status: 'gesendet'
            });

            sendEvent({ current: 1, total: 1, recipient: adminEmail, status: 'gesendet' });
          } catch (e: any) {
            sendEvent({ current: 1, total: 1, recipient: adminEmail, status: 'fehler', errorMessage: e.message });
          }

          sendEvent({ done: true });
          controller.close();
          return;
        }

        const total = recipientIds.length;
        for (let i = 0; i < total; i++) {
          const id = recipientIds[i];
          const rec = await fetchRecipient(id, authHeader);

          if (!rec) {
            sendEvent({ current: i + 1, total, recipient: `ID: ${id}`, status: 'fehler', errorMessage: 'Empfänger nicht gefunden' });
            continue;
          }

          const recName = `${rec.vorname} ${rec.nachname}`.trim() || rec.email;

          if (rec.opt_out) {
            sendEvent({ current: i + 1, total, recipient: recName, status: 'fehler', errorMessage: 'Opt-Out aktiv (abgemeldet)' });
            continue;
          }

          if (!rec.email || !rec.email.includes('@')) {
            sendEvent({ current: i + 1, total, recipient: recName, status: 'fehler', errorMessage: 'Keine gültige E-Mail-Adresse' });
            continue;
          }

          const parsedSubj = parseMailTemplate(subject, rec);
          const parsedBody = parseMailTemplate(bodyTemplate, rec);
          const html = renderResponsiveMailHtml(parsedBody);

          try {
            await sendMailViaMicroservice(authHeader, {
              to: rec.email,
              subject: parsedSubj,
              html,
              text: parsedBody
            });

            await logMail(authHeader, {
              empfaenger_id: rec.id,
              empfaenger_name: recName,
              empfaenger_email: rec.email,
              template_id: templateId || undefined,
              betreff: parsedSubj,
              status: 'gesendet'
            });

            sendEvent({ current: 1 + i, total, recipient: recName, status: 'gesendet' });
          } catch (err: any) {
            await logMail(authHeader, {
              empfaenger_id: rec.id,
              empfaenger_name: recName,
              empfaenger_email: rec.email,
              template_id: templateId || undefined,
              betreff: parsedSubj,
              status: 'fehler',
              fehlermeldung: err.message
            });

            sendEvent({ current: 1 + i, total, recipient: recName, status: 'fehler', errorMessage: err.message });
          }

          if (i < total - 1) {
            await sleep(THROTTLE_MS);
          }
        }

        sendEvent({ done: true });
        controller.close();
      } catch (fatal: any) {
        sendEvent({ done: true, fatal: fatal.message });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
};
