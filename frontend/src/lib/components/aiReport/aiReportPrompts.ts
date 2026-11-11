import { getAppointmentTasks, getAppointmentTimeRecords } from "$lib/components/calendar/calendarUtils";

export const PROMPT_FAMILIE = `Erstelle einen professionellen und gut lesbaren Besuchsbericht aus den vorliegenden Aufzeichnungen.
Der Bericht soll sich direkt an den Betreuer/Kontakt richten.

Nutze exakt folgende Struktur:

"Guten Tag [Name des Adressaten, falls angegeben],
hiermit erhalten Sie eine Zusammenfassung des Termins mit [Name des Klienten] vom [Datum] um [Uhrzeit] Uhr.

Medizinische Beobachtungen:
[Stichpunkte zu Gesundheitszustand, Auffälligkeiten, etc.]

Durchgeführte Maßnahmen:
[Stichpunkte zu Tätigkeiten, Begleitung, etc.]

To-Dos:
[Stichpunkte zu nächsten Schritten, Hinweisen, etc.]"

Schreibe KEINE Floskeln davor oder danach (wie "Hier ist dein Bericht:"). Formuliere professionell und verbindlich im "Sie"-Format.
WICHTIG: Erwähne unter keinen Umständen Begriffe wie "KI", "AI", "künstliche Intelligenz", "Modell" oder ähnliche Hinweise auf maschinelle Erstellung.`;

export const PROMPT_INTERN = "Erstelle eine präzise interne Notiz für das Team aus den Aufzeichnungen. Bitte fasse alle wichtigen Fakten, medizinischen Auffälligkeiten und To-Dos sachlich und kurz in Stichpunkten zusammen. Keine langen Fließtexte, sondern reine Fakten für die interne Akte.";

export const PROMPT_STANDARD = `Erstelle einen kurzen, professionellen Besuchsbericht aus den vorliegenden Aufzeichnungen (falls vorhanden) und dem Kontext.
Der Bericht soll sich direkt an den Betreuer/Kontakt richten und mitteilen, dass der Termin planmäßig und ohne besondere Vorkommnisse verlief.

Nutze exakt folgende Struktur:

"Guten Tag [Name des Adressaten, falls angegeben],
hiermit erhalten Sie eine kurze Rückmeldung zum Termin mit [Name des Klienten] vom [Datum] um [Uhrzeit] Uhr.

Status:
Der Termin verlief planmäßig und ohne besondere Auffälligkeiten. Der allgemeine Zustand ist unverändert gut.

Durchgeführte Maßnahmen / Ort:
[Fasse hier den Ort und die Tätigkeiten/Leistungen aus dem Termin-Kontext zusammen]

To-Dos:
[Aktuell kein weiterer Handlungsbedarf, sofern nicht explizit anders im Kontext angegeben]"

Schreibe KEINE Floskeln davor oder danach. Formuliere professionell im "Sie"-Format.
WICHTIG: Erwähne unter keinen Umständen Begriffe wie "KI", "AI", "künstliche Intelligenz" oder Modellhinweise.`;

export function buildAiContext(client: any, appointment: any, selectedRecipientName: string, customPrompt: string): string {
    let contextText = "Kontext für den Bericht:\n";
    if (client) {
        const clientName = `${client.salutation !== 'Keine Angabe' && client.salutation ? client.salutation + ' ' : ''}${client.name_first} ${client.name_last}`.trim();
        contextText += `- Klient: ${clientName}\n`;
    }
    if (appointment) {
        const appDate = new Date(appointment.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const appTime = new Date(appointment.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        contextText += `- Datum des Termins: ${appDate}\n`;
        contextText += `- Uhrzeit des Termins: ${appTime} Uhr\n`;
        contextText += `- Beschreibung: ${appointment.description || 'Allgemeiner Termin'}\n`;
        
        if (appointment.expand?.appointment_at) {
            const contacts = appointment.expand.appointment_at.map((c: any) => `${c.company_name ? c.company_name + ' ' : ''}${c.name_first} ${c.name_last}`).join(', ');
            contextText += `- Ort / Arzt: ${contacts}\n`;
        } else if (appointment.location_address) {
            contextText += `- Ort: ${appointment.location_address}\n`;
        }
        
        const appTasks = getAppointmentTasks(appointment);
        if (appTasks.length > 0) {
            const tasks = appTasks.map((t: any) => t.title).join(', ');
            contextText += `- Durchgeführte Leistungen: ${tasks}\n`;
        }

        const appTrs = getAppointmentTimeRecords(appointment);
        if (appTrs.length > 0) {
            let totalMs = 0;
            appTrs.forEach((tr: any) => {
                if (tr.start && tr.end) {
                    totalMs += new Date(tr.end).getTime() - new Date(tr.start).getTime();
                }
            });
            if (totalMs > 0) {
                const totalMins = Math.round(totalMs / 60000);
                const hours = Math.floor(totalMins / 60);
                const mins = totalMins % 60;
                const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                contextText += `- Erfasste Dauer: ${durationStr}\n`;
            }
        }
    }
    if (selectedRecipientName) {
        contextText += `- Adressat des Berichts (Betreuer/Angehöriger): ${selectedRecipientName}\n`;
    }
    contextText += "\n----\n\n";
    return contextText + customPrompt;
}

export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') resolve(reader.result.split(',')[1]);
            else reject(new Error("Fehler beim Konvertieren"));
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
