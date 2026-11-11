export type AppointmentMessageType = 'reminder' | 'info' | 'change' | 'report';

export function buildMultiSalutation(
    client: any,
    selectedContactRefs: any[],
    method: 'email' | 'whatsapp',
    recipient: string
): string {
    if (selectedContactRefs.length === 1) {
        return selectedContactRefs[0].salutation;
    }
    if (selectedContactRefs.length === 2) {
        return `${selectedContactRefs[0].salutation.replace(',', '')},\n${selectedContactRefs[1].salutation.replace(',', '').toLowerCase()},`;
    }
    if (selectedContactRefs.length >= 3 || (method === 'email' && recipient.split(',').filter(Boolean).length > 1)) {
        return 'Sehr geehrte Damen und Herren,';
    }
    const recipientRecord = client?.expand?.caregiver || client;
    if (recipientRecord?.salutation === 'Herr') {
        return `Sehr geehrter Herr ${recipientRecord.name_last},`;
    }
    if (recipientRecord?.salutation === 'Frau') {
        return `Sehr geehrte Frau ${recipientRecord.name_last},`;
    }
    return `Guten Tag ${recipientRecord?.name_first || ''} ${recipientRecord?.name_last || ''},`.trim();
}

export function buildDefaultSubject(
    type: AppointmentMessageType,
    client: any,
    selectedApps: any[]
): string {
    const clientName = client ? `${client.name_first || ''} ${client.name_last || ''}`.trim() : '';
    const dateStr = selectedApps.length === 1 && selectedApps[0]?.appointment
        ? new Date(selectedApps[0].appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';

    switch (type) {
        case 'info':
            return dateStr 
                ? `Termin-Information zum ${dateStr}${clientName ? ` (${clientName})` : ''}`
                : `Information zu Ihren Terminen${clientName ? ` (${clientName})` : ''}`;
        case 'change':
            return dateStr 
                ? `Wichtige Terminänderung zum ${dateStr}${clientName ? ` (${clientName})` : ''}`
                : `Wichtige Terminänderung${clientName ? ` (${clientName})` : ''}`;
        case 'report':
            return dateStr 
                ? `Besuchsbericht zum Termin am ${dateStr}${clientName ? ` (${clientName})` : ''}`
                : `Besuchsbericht zu den Betreuungsterminen${clientName ? ` (${clientName})` : ''}`;
        case 'reminder':
        default:
            return dateStr 
                ? `Terminerinnerung für den ${dateStr}${clientName ? ` (${clientName})` : ''}`
                : `Ihre gebuchten Termine${clientName ? ` (${clientName})` : ''}`;
    }
}

export function buildMultiMessageText(
    client: any,
    availableAppointments: any[],
    selectedAppointmentIds: string[],
    selectedContactRefs: any[],
    salutation: string,
    generatedBody: string | null,
    type: AppointmentMessageType = 'reminder'
): string {
    if (generatedBody) {
        return `${salutation}\n\n${generatedBody}`;
    }

    const isClientOnly = selectedContactRefs.length > 0 ? selectedContactRefs.every((c) => c.isClient) : false;
    const clientName = `${client?.name_first || ''} ${client?.name_last || ''}`.trim();
    const selectedApps = availableAppointments.filter((a) => selectedAppointmentIds.includes(a.id));

    let msg = `${salutation}\n\n`;

    if (type === 'report') {
        const intro = (!isClientOnly && clientName)
            ? `anbei übermitteln wir Ihnen den aktuellen Besuchsbericht für ${clientName}:`
            : `anbei übermitteln wir Ihnen den aktuellen Besuchsbericht:`;
        msg += `${intro}\n\n`;

        selectedApps.forEach((app) => {
            const dateStr = new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const desc = app.description || 'Betreuungstermin';
            msg += `• Termin am ${dateStr} (${timeStr} Uhr) - ${desc}\n`;
            if (app.report && app.report.trim()) {
                msg += `  Besuchsbericht:\n  ${app.report.trim().replace(/\n/g, '\n  ')}\n\n`;
            } else {
                msg += `  (Termin wie geplant durchgeführt)\n\n`;
            }
        });

        msg += `Bei Fragen zum Verlauf oder weiteren Wünschen stehen wir Ihnen jederzeit gerne zur Verfügung.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
        return msg;
    }

    if (type === 'change') {
        const intro = (!isClientOnly && clientName)
            ? `wir möchten Sie über eine wichtige Terminänderung für ${clientName} informieren:`
            : `wir möchten Sie über eine wichtige Änderung bezüglich Ihres Termins informieren:`;
        msg += `${intro}\n\n`;

        selectedApps.forEach((app) => {
            const dateStr = new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            msg += `• Neuer Zeitpunkt: ${dateStr} um ${timeStr} Uhr (${app.description || 'Termin'})\n`;
        });

        msg += `\nBitte vermerken Sie diese Anpassung. Sollte der neue Zeitpunkt nicht passen, geben Sie uns bitte kurz Bescheid.\n\nIhre Termine können Sie auch jederzeit im Klienten-Portal einsehen:\n👉 https://www.ihre-seniorenassistenz.com/portal\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
        return msg;
    }

    if (type === 'info') {
        const intro = (!isClientOnly && clientName)
            ? `hiermit erhalten Sie eine Übersicht und Information zum geplanten Termin für ${clientName}:`
            : `hiermit erhalten Sie eine Information zu Ihrem anstehenden Termin:`;
        msg += `${intro}\n\n`;

        selectedApps.forEach((app) => {
            const dateStr = new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            msg += `• ${dateStr} um ${timeStr} Uhr: ${app.description || 'Termin'}\n`;
        });

        msg += `\nIhre Termine können Sie auch jederzeit im Klienten-Portal einsehen:\n👉 https://www.ihre-seniorenassistenz.com/portal\n\nWir freuen uns auf die Begegnung!\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
        return msg;
    }

    // Default: 'reminder'
    const baseText = (!isClientOnly && clientName)
        ? `hiermit möchten wir Sie an die folgenden gebuchten Termine für ${clientName} erinnern:`
        : `hiermit möchten wir Sie an die folgenden gebuchten Termine erinnern:`;

    msg += `${baseText}\n\n`;
    selectedApps.forEach((app) => {
        const dateStr = new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        msg += `• ${dateStr} um ${timeStr} Uhr: ${app.description || 'Termin'}\n`;
    });

    msg += `\nIhre Termine können Sie auch jederzeit im Klienten-Portal einsehen:\n👉 https://www.ihre-seniorenassistenz.com/portal\n\nWir freuen uns auf Sie!`;
    return msg;
}

export function formatSelectedText(
    text: string,
    type: 'bold' | 'italic' | 'underline',
    method: 'email' | 'whatsapp',
    start: number,
    end: number
): { newText: string; newStart: number; newEnd: number } | null {
    const isWa = method === 'whatsapp';
    let startTag = '';
    let endTag = '';

    if (type === 'bold') {
        startTag = isWa ? '*' : '<b>';
        endTag = isWa ? '*' : '</b>';
    } else if (type === 'italic') {
        startTag = isWa ? '_' : '<i>';
        endTag = isWa ? '_' : '</i>';
    } else if (type === 'underline') {
        startTag = isWa ? '' : '<u>';
        endTag = isWa ? '' : '</u>';
    }

    if (!startTag) return null;

    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + startTag + selected + endTag + text.substring(end);
    return {
        newText,
        newStart: start + startTag.length,
        newEnd: end + startTag.length
    };
}
