import type { AppointmentMessageType } from "$lib/components/appointmentReminder/multiAppointmentReminderHelper";

export function buildAppointmentReminderAiPrompt(params: {
    selectedApps: any[];
    client: any;
    selectedContactRefs: any[];
    type?: AppointmentMessageType;
}): string {
    const { selectedApps, client, selectedContactRefs, type = 'reminder' } = params;
    const isClientOnly = selectedContactRefs.length > 0 ? selectedContactRefs.every((c) => c.isClient) : false;
    const clientNameStr = client ? `${client?.name_first || ''} ${client?.name_last || ''}`.trim() : 'unserem Klienten';

    const recipientContext = isClientOnly
        ? "Die Nachricht richtet sich direkt an den Klienten selbst."
        : `Die Nachricht richtet sich an einen Betreuer oder Angehörigen. Beziehe dich auf die Betreuung für Frau/Herr ${client?.name_last || clientNameStr}.`;

    let appointmentsContext = "";
    selectedApps.forEach((app) => {
        const dateStr = new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const internalNotes = app.internal_notes || app.notes || "";
        const visitReport = app.report || "";

        let locationStr = "";
        if (app.expand?.appointment_at?.[0]) {
            const contact = app.expand.appointment_at[0];
            const namePart = [contact.company_name, `${contact.name_first} ${contact.name_last}`.trim()].filter(Boolean).join(' - ');
            const addressPart = `${contact.street || ''} ${contact.housenr || ''}`.trim();
            const cityPart = `${contact.zip || ''} ${contact.city || ''}`.trim();
            locationStr = [namePart, addressPart, cityPart].filter(Boolean).join(', ');
        } else if (app.location_address) {
            locationStr = app.location_address;
        }

        appointmentsContext += `- Am ${dateStr} um ${timeStr} Uhr. Anliegen: ${app.description || 'Termin'}. Ort: ${locationStr || 'Beim Klienten zu Hause'}.${internalNotes ? ' Notizen: ' + internalNotes : ''}${visitReport ? ' Erfasster Besuchsbericht: ' + visitReport : ''}\n`;
    });

    if (type === 'report') {
        return `Du bist ein professioneller und empathischer Assistent für eine Seniorenassistenz. Formuliere einen warmherzigen, strukturierten und beruhigenden Besuchsbericht für Angehörige bzw. gesetzliche Betreuer.

Termindaten & Notizen:
${appointmentsContext}

Empfänger-Kontext:
${recipientContext}

Anweisungen:
1. Erstelle eine transparente und freundliche Zusammenfassung des Termins / der Betreuung.
2. Gehe auf die erbrachten Unterstützungsleistungen, Aktivitäten und das Befinden der betreuten Person ein. Nutze hierfür insbesondere den erfassten Besuchsbericht und die Notizen.
3. Formuliere absolut verständlich, professionell und ohne bürokratische Floskeln.
4. Schließe ab mit dem Angebot, bei Fragen jederzeit erreichbar zu sein.
5. Verwende KEINE Markdown-Sonderzeichen wie *, _, # oder •. Verwende für Aufzählungen einfache Bindestriche (-).
6. Schließe ab mit:
Mit freundlichen Grüßen
Ihre Seniorenassistenz

WICHTIG: Beginne NICHT mit einer Anrede ("Sehr geehrte..."), da diese bereits vorhanden ist. Beginne direkt mit dem ersten Satz, kleingeschrieben.`;
    }

    if (type === 'change') {
        return `Du bist ein professioneller Assistent für eine Seniorenassistenz. Formuliere eine höfliche, verbindliche Mitteilung über eine Terminänderung bzw. Terminverschiebung.

Termindaten:
${appointmentsContext}

Empfänger-Kontext:
${recipientContext}

Anweisungen:
1. Informiere freundlich und klar über die geänderten Termindaten (neue Uhrzeit, geändertes Datum oder Ort).
2. Entschuldige eventuelle Unannehmlichkeiten durch die Verschiebung.
3. Bitte um kurze Bestätigung oder Rückmeldung, falls der neue Zeitpunkt nicht passt.
4. Erwähne, dass Termine auch im Klienten-Portal einsehbar sind (https://www.ihre-seniorenassistenz.com/portal).
5. Verwende KEINE Sonderzeichen wie *, _, # oder •.
6. Schließe ab mit:
Mit freundlichen Grüßen
Ihre Seniorenassistenz

WICHTIG: Beginne NICHT mit einer Anrede ("Sehr geehrte..."), da diese bereits vorhanden ist. Beginne direkt mit dem ersten Satz, kleingeschrieben.`;
    }

    if (type === 'info') {
        return `Du bist ein professioneller Assistent für eine Seniorenassistenz. Formuliere eine klare, freundliche Termininformation und Terminbestätigung.

Termindaten:
${appointmentsContext}

Empfänger-Kontext:
${recipientContext}

Anweisungen:
1. Bestätige freundlich den anstehenden Termin mit Datum, Uhrzeit und Ort.
2. Formuliere positiv und serviceorientiert.
3. Erwähne, dass Termine auch im Klienten-Portal einsehbar sind (https://www.ihre-seniorenassistenz.com/portal).
4. Verwende KEINE Sonderzeichen wie *, _, # oder •.
5. Schließe ab mit:
Mit freundlichen Grüßen
Ihre Seniorenassistenz

WICHTIG: Beginne NICHT mit einer Anrede ("Sehr geehrte..."), da diese bereits vorhanden ist. Beginne direkt mit dem ersten Satz, kleingeschrieben.`;
    }

    // Default 'reminder'
    return `Du bist ein professioneller Assistent für eine Seniorenassistenz. Formuliere eine prägnante Terminerinnerung für die geplanten Termine.

Geplante Termine:
${appointmentsContext}

Empfänger-Kontext:
${recipientContext}
Wichtige Regel zum Treffpunkt: Sofern in den internen Notizen nicht ausdrücklich ein anderer Treffpunkt vereinbart wurde, treffen wir uns IMMER beim Klienten zu Hause.

Anweisungen an dich:
1. Bestätige freundlich die geplanten Termine. Liste diese übersichtlich auf.
2. Berechne für JEDEN Termin (falls Vorbereitung nötig ist) eine logische und absolut fehlerfreie Ankunftszeit (Treffpunktzeit) bei der Klientin / dem Klienten. Beachte zwingend:
   - PRIORITÄT 1: Bei Taxi/Fahrdienst in den Notizen (z.B. "Taxi 07:15"), Ankunft 15-30 Min. VOR dem Taxi einplanen!
   - Bei Rollstuhl: 1 Stunde vor Termin.
   - Bei Pflegedienst: 15 Min. vor Termin.
   - Sonst: 30 Min. vor Termin.
   Erwähne die berechnete Ankunftszeit freundlich beim jeweiligen Termin.
3. Erstelle am Ende eine Sektion "Kleine Checkliste vorab:" mit 3-5 relevanten Hinweisen im Format:
Kleine Checkliste vorab:
   [ ] - [Hinweis 1]
   [ ] - [Hinweis 2]
4. Verwende absolut KEINERLEI Sonderzeichen wie *, _, # oder • (außer dem "   [ ] - " in der Checkliste).
5. Füge hinzu: "Ihre Termine können Sie auch jederzeit im Klienten-Portal einsehen: https://www.ihre-seniorenassistenz.com/portal"
6. Schließe ab mit:
Mit freundlichen Grüßen
Ihre Seniorenassistenz

WICHTIG: Beginne NICHT mit einer Anrede ("Sehr geehrte..."), da diese schon vorhanden ist. Beginne direkt mit dem ersten Satz, kleingeschrieben.`;
}
