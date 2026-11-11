async function run() {
  const suRes = await fetch('http://127.0.0.1:8090/api/collections/_superusers/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 't.jenzsch@ihre-seniorenassistenz.com', password: '6AZePm6YLLa2DGE' })
  }).then(r => r.json());
  const token = suRes.token;

  if (!token) {
    console.error('Superuser Auth Failed:', suRes);
    return;
  }

  // 1. mail_templates
  const tplCol = {
    name: 'mail_templates',
    type: 'base',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      { name: 'titel', type: 'text', required: true },
      { name: 'betreff', type: 'text', required: true },
      { name: 'inhalt', type: 'text', required: true },
      { name: 'category', type: 'text', required: false }
    ]
  };

  const createTpl = await fetch('http://127.0.0.1:8090/api/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(tplCol)
  }).then(r => r.json());
  console.log('mail_templates created:', createTpl.id || createTpl.message || createTpl);

  // 2. mail_logs
  const logCol = {
    name: 'mail_logs',
    type: 'base',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      { name: 'empfaenger_id', type: 'text', required: false },
      { name: 'empfaenger_name', type: 'text', required: false },
      { name: 'empfaenger_email', type: 'email', required: false },
      { name: 'template_id', type: 'text', required: false },
      { name: 'betreff', type: 'text', required: true },
      { name: 'status', type: 'select', values: ['gesendet', 'fehler'], required: true },
      { name: 'fehlermeldung', type: 'text', required: false },
      { name: 'gesendet_am', type: 'date', required: false }
    ]
  };

  const createLog = await fetch('http://127.0.0.1:8090/api/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(logCol)
  }).then(r => r.json());
  console.log('mail_logs created:', createLog.id || createLog.message || createLog);

  // 3. Add default template
  const defaultTpl = {
    titel: 'Freie Kapazitäten in der Seniorenassistenz',
    betreff: 'Aktuelle Betreuungskapazitäten & Entlastungsleistungen – Seniorenassistenz Jenzsch',
    inhalt: '{{briefanrede}},\n\nwir möchten Sie heute kurz und unverbindlich darüber informieren, dass wir aktuell wieder freie Betreuungskapazitäten für die qualifizierte Seniorenassistenz und alltagsunterstützende Entlastungsleistungen (nach § 45b SGB XI sowie Verhinderungspflege § 39 SGB XI) zur Verfügung haben.\n\nGerne unterstützen wir Ihre Klienten zuverlässig bei:\n• Begleitung zu Terminen, Ärzten und Behörden\n• Alltagsgestaltung, Aktivierung & emotionaler Entlastung\n• Einkäufen, Haushaltshilfe und Freizeitgestaltung\n• Entlastung pflegender Angehöriger\n\nSollten Sie aktuell oder in naher Zukunft Bedarf für Klienten in Ihrem Wirkungsbereich haben, freuen wir uns über eine kurze Rückmeldung oder Ihren Anruf.\n\nMit freundlichen Grüßen,\nIhr Team der Seniorenassistenz Jenzsch',
    category: 'kapazitaeten'
  };

  const resTpl = await fetch('http://127.0.0.1:8090/api/collections/mail_templates/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(defaultTpl)
  }).then(r => r.json());
  console.log('Default template created:', resTpl.id || resTpl);
}

run().catch(console.error);
