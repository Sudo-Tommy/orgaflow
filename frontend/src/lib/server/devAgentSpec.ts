import { Type } from '@google/genai';

const str = (description: string) => ({ type: Type.STRING, description });

export const toolsDefinition: any = [{
    functionDeclarations: [
        {
            name: 'read_file',
            description: 'Liest eine Datei. Optional nur einen Zeilenbereich (bei großen Dateien bevorzugen).',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    path: str('Relativer oder absoluter Pfad'),
                    start_line: { type: Type.NUMBER, description: 'Erste Zeile (1-basiert)' },
                    end_line: { type: Type.NUMBER, description: 'Letzte Zeile' }
                },
                required: ['path']
            }
        },
        {
            name: 'replace_in_file',
            description: 'Ersetzt EINE eindeutige Textstelle in einer Datei. Bevorzugtes Werkzeug für Änderungen an bestehenden Dateien.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    path: str('Dateipfad'),
                    old_text: str('Exakter, eindeutiger Originaltext'),
                    new_text: str('Neuer Text')
                },
                required: ['path', 'old_text', 'new_text']
            }
        },
        {
            name: 'write_file',
            description: 'Erstellt eine neue Datei oder überschreibt sie vollständig (maximal 250 Zeilen).',
            parameters: {
                type: Type.OBJECT,
                properties: { path: str('Dateipfad'), content: str('Vollständiger Inhalt ohne Auslassungen') },
                required: ['path', 'content']
            }
        },
        {
            name: 'list_dir',
            description: 'Listet Dateien und Verzeichnisse auf.',
            parameters: { type: Type.OBJECT, properties: { path: str('Verzeichnispfad') } }
        },
        {
            name: 'search_code',
            description: 'Sucht Text in Projektdateien (svelte, ts, js, css, json).',
            parameters: {
                type: Type.OBJECT,
                properties: { query: str('Suchbegriff'), path: str('Optionaler Unterordner') },
                required: ['query']
            }
        },
        {
            name: 'run_command',
            description: 'Führt Shell-Befehle im Projekt aus (z. B. npm run check).',
            parameters: { type: Type.OBJECT, properties: { command: str('Befehl') }, required: ['command'] }
        }
    ]
}];

export const SYSTEM_INSTRUCTION = `Du bist Antigravity, der Pair-Programming-Agent für OrgaFlow (Svelte 5 Runes, Tailwind v4, PocketBase). Du änderst den Code live, während der Nutzer die App im Browser sieht (Vite HMR lädt automatisch neu).
VORGEHEN:
1. Verstehe den Auftrag, nutze den KONTEXT (Route, Komponente, DOM, Fehler) und finde die richtigen Dateien gezielt per search_code / list_dir.
2. Lies relevanten Code (read_file, bei großen Dateien mit Zeilenbereich).
3. Ändere mit replace_in_file (klein und gezielt). write_file nur für neue Dateien oder Komplettüberarbeitungen.
4. Prüfe bei größeren Änderungen mit run_command (z. B. "npm run check" im Ordner frontend) und behebe Fehler.
5. Fasse am Ende kurz auf Deutsch zusammen, was du geändert hast.
REGELN:
- Jede Datei max. 250 Zeilen; sonst in Unterkomponenten/Module aufteilen.
- Dropdowns alphabetisch sortieren. Daten immer aus PocketBase.
- Design: Schiefer/Marine, Violett (Hauptaktion), Smaragdgrün (aktiv), Cyan (Portal), Bernstein (Hinweise), Hell/Dunkel-Modus.
- Einfache deutsche Texte für Endnutzer, kein Horizontal-Scrollen, keine inneren Scrollbereiche.
- Pfade relativ zum Projekt-Root (z. B. frontend/src/lib/...).
- Keine Rückfragen bei eindeutigen Aufträgen: einfach umsetzen.`;
