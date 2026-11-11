import type { MailRecipient } from '$lib/types/mail';

/**
 * Erstellt eine dynamische, grammatikalisch korrekte Briefanrede.
 */
export function buildSalutation(recipient: Partial<MailRecipient>): string {
  const anrede = (recipient.anrede || '').trim().toLowerCase();
  const nachname = (recipient.nachname || '').trim();
  const vorname = (recipient.vorname || '').trim();

  if (anrede === 'frau') {
    return nachname ? `Sehr geehrte Frau ${nachname}` : 'Sehr geehrte Frau';
  }
  if (anrede === 'herr' || anrede === 'herrn') {
    return nachname ? `Sehr geehrter Herr ${nachname}` : 'Sehr geehrter Herr';
  }
  if (nachname && vorname) {
    return `Guten Tag ${vorname} ${nachname}`;
  }
  if (nachname) {
    return `Sehr geehrte/r Frau/Herr ${nachname}`;
  }
  return 'Guten Tag';
}

/**
 * Ersetzt alle Platzhalter im Template-Text durch die echten Empfängerdaten.
 */
export function parseMailTemplate(templateText: string, recipient: Partial<MailRecipient>): string {
  if (!templateText) return '';

  const briefanrede = buildSalutation(recipient);
  const anrede = (recipient.anrede || '').trim();
  const nachname = (recipient.nachname || '').trim();
  const vorname = (recipient.vorname || '').trim();
  const organisation = (recipient.organisation || '').trim();

  return templateText
    .replace(/\{\{\s*briefanrede\s*\}\}/gi, briefanrede)
    .replace(/\{\{\s*anrede\s*\}\}/gi, anrede)
    .replace(/\{\{\s*nachname\s*\}\}/gi, nachname)
    .replace(/\{\{\s*vorname\s*\}\}/gi, vorname)
    .replace(/\{\{\s*organisation\s*\}\}/gi, organisation);
}

export interface MailLayoutOptions {
  companyName?: string;
  senderName?: string;
  senderPhone?: string;
  senderEmail?: string;
  website?: string;
}

/**
 * Rendert eine formatierte E-Mail in einem responsiven HTML-Layout.
 */
export function renderResponsiveMailHtml(plainOrHtmlText: string, options: MailLayoutOptions = {}): string {
  const comp = options.companyName || 'Seniorenassistenz Jenzsch';
  const phone = options.senderPhone || '01522 1870605';
  const email = options.senderEmail || 'info@ihre-seniorenassistenz.com';
  const web = options.website || 'https://ihre-seniorenassistenz.com';

  const formattedBody = plainOrHtmlText.includes('<p>') || plainOrHtmlText.includes('<div>')
    ? plainOrHtmlText
    : plainOrHtmlText
        .split('\n\n')
        .map(paragraph => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${paragraph.replace(/\n/g, '<br/>')}</p>`)
        .join('');

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${comp}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 28px 32px; color: #ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">${comp}</h1>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #c7d2fe; font-weight: 500;">Alltagsbegleitung, Entlastung & Betreuung</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 36px 32px 28px 32px; font-size: 15px; color: #334155; line-height: 1.65;">
              ${formattedBody}
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px;">
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 0;" />
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; font-size: 12px; color: #64748b; line-height: 1.6;">
              <strong style="color: #1e293b; font-size: 13px;">${comp}</strong><br/>
              Telefon: <a href="tel:${phone.replace(/\s+/g, '')}" style="color: #4f46e5; text-decoration: none;">${phone}</a> &bull; 
              E-Mail: <a href="mailto:${email}" style="color: #4f46e5; text-decoration: none;">${email}</a><br/>
              Web: <a href="${web}" target="_blank" style="color: #4f46e5; text-decoration: none;">${web}</a>
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #94a3b8;">
                Diese Nachricht wurde im Rahmen der Seniorenassistenz-Kooperation versendet. Falls Sie keine weiteren Benachrichtigungen wünschen, antworten Sie bitte kurz mit „Abmelden“.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

