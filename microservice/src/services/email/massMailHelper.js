export function buildSalutation(anrede, vorname, nachname) {
    const anr = (anrede || '').trim().toLowerCase();
    const nn = (nachname || '').trim();
    const vn = (vorname || '').trim();
    if (anr === 'frau') return nn ? `Sehr geehrte Frau ${nn}` : 'Sehr geehrte Frau';
    if (anr === 'herr' || anr === 'herrn') return nn ? `Sehr geehrter Herr ${nn}` : 'Sehr geehrter Herr';
    if (nn && vn) return `Guten Tag ${vn} ${nn}`;
    if (nn) return `Sehr geehrte/r Frau/Herr ${nn}`;
    return 'Guten Tag';
}

export function parseMailTemplate(templateText, rec) {
    if (!templateText) return '';
    const briefanrede = buildSalutation(
        rec.salutation || rec.anrede,
        rec.name_first || rec.vorname,
        rec.name_last || rec.nachname
    );
    return (templateText || '')
        .replace(/\{\{\s*briefanrede\s*\}\}/gi, briefanrede)
        .replace(/\{\{\s*anrede\s*\}\}/gi, (rec.salutation || rec.anrede || '').trim())
        .replace(/\{\{\s*nachname\s*\}\}/gi, (rec.name_last || rec.nachname || '').trim())
        .replace(/\{\{\s*vorname\s*\}\}/gi, (rec.name_first || rec.vorname || '').trim())
        .replace(/\{\{\s*organisation\s*\}\}/gi, (rec.company_name || rec.organisation || '').trim());
}

export function renderResponsiveMailHtml(plainOrHtmlText, options = {}) {
    const comp = options.companyName || 'Seniorenassistenz Jenzsch';
    const phone = options.senderPhone || '01522 1870605';
    const email = options.senderEmail || 'info@ihre-seniorenassistenz.com';
    const web = options.website || 'https://ihre-seniorenassistenz.com';

    const textStr = plainOrHtmlText || '';
    const formattedBody = textStr.includes('<p>') || textStr.includes('<div>')
        ? textStr
        : textStr
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

