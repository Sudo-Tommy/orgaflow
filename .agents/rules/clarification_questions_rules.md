# Regel: Immer 3 Fragen zu jedem Prompt

## Verbindlicher Grundsatz
Bei jeder neuen Aufgabenstellung bzw. jedem neuen Benutzer-Prompt stellt der Assistent **immer genau 3 präzise, zielgerichtete Fragen**, bevor oder während die Ausführung geplant und umgesetzt wird.

## Zweck
- Schärfung von Anforderungen und Designentscheidungen
- Aufdecken von Randfällen (Edge Cases), Validierungsregeln und Benutzererwartungen
- Vermeidung von Fehlannahmen, Missverständnissen und unnötigen Korrekturzyklen

## Umsetzung
1. **Tool-Nutzung**: Bevorzugt wird das interaktive Modal-Tool `ask_question` verwendet, damit der Nutzer bequem aus vorkonfigurierten Optionen wählen oder eigene Antworten eingeben kann.
2. **Qualität der Fragen**:
   - Frage 1: Funktionalität & Verhalten (z. B. Was soll im Detail passieren bei Zustand X?)
   - Frage 2: UI / UX & Interaktion (z. B. Wie soll die visuelle Darstellung, Animation oder Platzierung aussehen?)
   - Frage 3: Edge Cases, Datenintegrität & Scope (z. B. Welche Daten, Berechtigungen oder Ausnahmen müssen berücksichtigt werden?)
