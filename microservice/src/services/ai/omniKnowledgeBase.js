/**
 * omniKnowledgeBase.js
 *
 * Strukturierte Wissensdatenbank für die Support-KI "Omni".
 * Enthält Erklärungen, Navigationspfade und Schritt-für-Schritt-Anleitungen
 * für alle Kernmodule der OrgaFlow-Plattform.
 */

export const ORGAFLOW_CORE_KNOWLEDGE = {
    modules: [
        {
            name: "Dashboard & Startseite",
            path: "/dashboard",
            role: "all",
            summary: "Zentrale Übersicht aller Tagesaufgaben, Termine und Schnellzugriffe.",
            steps: [
                "1. Oben siehst du aktive Klienten, offene Rechnungen und Team-Kilometer.",
                "2. Links stehen Termine für 'Heute' und die 'Nächsten 7 Tage'.",
                "3. In der Kalenderübersicht rechts kannst du Tage anklicken und Termine direkt einsehen."
            ]
        },
        {
            name: "Termine & Zeiterfassung",
            path: "/appointments",
            role: "all",
            summary: "Planung, Durchführung und Zeiterfassung von Betreuungseinsätzen.",
            steps: [
                "1. Neuen Termin erstellen: Klicke oben rechts auf '+ Neuer Termin' oder direkt im Kalender.",
                "2. Zeiterfassung vor Ort starten: Klicke auf der Terminkarte auf den blauen 'Start'-Button.",
                "3. Einsatz beenden & Bericht: Klicke auf 'Beenden', trage erbrachte Leistungen und Notizen ein.",
                "4. teilAuto verknüpfen: Bei Bedarf Fahrzeug im Terminformular auswählen."
            ]
        },
        {
            name: "Klienten & Pflegekassen-Budgets",
            path: "/clients",
            role: "all",
            summary: "Stammdaten, Pflegegrade, §45b Entlastungsbetrag, Angehörige & Unterschriften.",
            steps: [
                "1. Klientenakte öffnen: In der Klientenliste auf den Namen klicken.",
                "2. Budgets prüfen: Im Reiter 'Budget' siehst du den Entlastungsbetrag (§ 45b) und Restguthaben.",
                "3. Pflegeperson & Vertretung: Im Reiter 'Netzwerk' oder Stammdaten können Angehörige und rechtliche Betreuer inklusive Unterschrift hinterlegt werden."
            ]
        },
        {
            name: "Rechnungen & Finanzen",
            path: "/invoices",
            role: "admin",
            summary: "Rechnungserstellung aus beendeten Terminen, Lexoffice-Sync und Mahnungen.",
            steps: [
                "1. Rechnung erstellen: In der Rechnungsübersicht auf '+ Neue Rechnung' klicken oder in der Klientenakte auf 'Rechnung'.",
                "2. Abrechnungszeitraum & Leistungen wählen: Beendete Termine werden automatisch gelistet.",
                "3. E-Mail-Versand: Nach dem Erstellen kann die Rechnung direkt per E-Mail an Pflegekasse oder Klient gesendet werden.",
                "4. Lexoffice: Rechnungen synchronisieren sich automatisch mit dem Buchhaltungskonto."
            ]
        },
        {
            name: "Dokumente & Vorlagen",
            path: "/documents",
            role: "all",
            summary: "Dokumentengenerator mit Word-Vorlagen, Platzhaltern und digitaler Signatur.",
            steps: [
                "1. Vorlage wählen: Vorlagenliste öffnen (z. B. Betreuungsvertrag, Abtretungserklärung).",
                "2. Klient auswählen: Platzhalter wie Name, Anschrift und Pflegegrad füllen sich automatisch.",
                "3. Unterschreiben & Export: Unterschriftenfeld nutzen und als PDF speichern oder drucken."
            ]
        },
        {
            name: "E-Mail-Postfach",
            path: "/mail",
            role: "all",
            summary: "Integriertes E-Mail-System mit Klientenbezug und einheitlichem Briefbogen.",
            steps: [
                "1. Postfach aufrufen: Klicke in der Seitenleiste auf 'E-Mails'.",
                "2. Nachricht verfassen: '+ Neue E-Mail' wählen, Klient auswählen – der offizielle Briefbogen wird automatisch angehängt.",
                "3. Quick-Mail: Aus jeder Klientenakte kann mit einem Klick eine Vorlagen-Mail gestartet werden."
            ]
        },
        {
            name: "Reisekosten & VMA",
            path: "/vma",
            role: "all",
            summary: "Verpflegungsmehraufwand (VMA) und gefahrene Dienst-Kilometer erfassen.",
            steps: [
                "1. Menü 'Reisekosten (VMA)' öffnen.",
                "2. Einsatztage und Abwesenheitszeiten prüfen.",
                "3. Monatsbericht generieren und GoBD-konform archivieren."
            ]
        },
        {
            name: "Klienten-Portal",
            path: "/portal",
            role: "all",
            summary: "Gesichertes Online-Portal für Klienten und Angehörige.",
            steps: [
                "1. Zugang vergeben: In der Klientenakte unter 'Mehr' -> 'Portal-Zugangsdaten' klicken.",
                "2. Klienten sehen geplante Einsätze, Berichte und Rechnungen transparent im Web-Browser."
            ]
        }
    ]
};

export async function getOmniKnowledgePrompt({ userRole = 'employee', pbAdmin = null }) {
    const isPrivileged = userRole === 'developer' || userRole === 'owner' || userRole === 'admin' || userRole === 'superadmin';
    const accessibleModules = ORGAFLOW_CORE_KNOWLEDGE.modules.filter(m => m.role === 'all' || (isPrivileged && m.role === 'admin'));

    let prompt = `Hier ist dein offizielles Wissen über alle Funktionen der OrgaFlow-App:\n\n`;

    for (const m of accessibleModules) {
        prompt += `### Modul: ${m.name} (Pfad: ${m.path})\n`;
        prompt += `Zweck: ${m.summary}\n`;
        prompt += `Schritte für den Nutzer:\n${m.steps.join('\n')}\n\n`;
    }

    if (pbAdmin) {
        try {
            const updates = await pbAdmin.collection('updates').getList(1, 3, { sort: '-created', requestKey: null });
            if (updates.items.length > 0) {
                prompt += `### Neueste Updates & Versions-News der App:\n`;
                for (const u of updates.items) {
                    prompt += `- Version ${u.number || ''} (${u.date || ''}): ${(u.text || '').slice(0, 150)}...\n`;
                }
                prompt += `\n`;
            }
        } catch {}

        try {
            const customKnowledge = await pbAdmin.collection('app_knowledge').getList(1, 15, { requestKey: null });
            if (customKnowledge.items.length > 0) {
                prompt += `### Zusätzliche Hilfeartikel aus der Datenbank:\n`;
                for (const k of customKnowledge.items) {
                    prompt += `- **${k.title}** (${k.module || 'Allgemein'}): ${k.content || k.summary || ''}\n`;
                }
                prompt += `\n`;
            }
        } catch {}
    }

    return prompt;
}

