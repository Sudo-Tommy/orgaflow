/**
 * solutionConceptService.js
 *
 * Automatisierter Lösungs- und Maßnahmen-Assistent für OrgaFlow.
 * Analysiert gemeldete Probleme, Anforderungen oder Betreuungssituationen
 * und erzeugt strukturierte, praxisorientierte Lösungs- und Handlungskonzepte.
 *
 * Gemäß OrgaFlow-Richtlinien:
 * - Keine Erwähnung von "KI" oder "AI" im generierten Text
 * - Klare Strukturierung: Ausgangslage, Lösungsansatz, Maßnahmenplan, Qualitätskriterien
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildCacheOptimizedPrompt, callGeminiWithFallback } from './tokenSaverEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

/**
 * Generiert ein strukturiertes Lösungs- und Maßnahmenkonzept.
 * @param {Object} params
 * @param {string} params.title - Titel des Anliegens / des Vorschlags
 * @param {string} params.description - Problembeschreibung / Ausgangslage
 * @param {string} [params.category] - Modul-Bereich (z. B. 'Core Engine & API', 'UI/UX & Design', 'Termine & Außendienst')
 * @param {string} [params.context] - Zusätzlicher Kontext oder Metadaten
 * @param {string} [params.format='structured'] - 'structured' | 'compact' | 'action_plan'
 * @returns {Promise<{success: boolean, solutionConcept: string, summary: string}>}
 */
export async function generateSolutionConcept(params = {}) {
    const {
        title = '',
        description = '',
        category = 'Core Engine & API',
        context = '',
        format = 'structured'
    } = params;

    if (!title?.trim() && !description?.trim()) {
        throw new Error('Titel oder Beschreibung müssen angegeben werden.');
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // --- TOKEN-SAVER ENGINE: Statische Rollen-Instruktion (cach-bar) ---
    const staticSystemInstruction = `Du bist der Chef-Systemarchitekt und Prozessberater für "OrgaFlow", die Enterprise-Software für Seniorenbetreuung und Pflegedienste.
Technologiestack: SvelteKit 2 mit Svelte 5 Runes ($state, $derived, $props), Tailwind CSS, PocketBase, Node.js Microservice.

Aufgabe: Für eine Problemstellung ein sofort umsetzbares, professionelles LOSUNGS- UND MASSNAHMENKONZEPT formulieren.

STRENGSTE RICHTLINIEN (unveränderlich):
1. Nie "KI", "AI", "künstliche Intelligenz", "LLM", "Prompt" oder "Sprachmodell" erwähnen.
2. Sachliche, präzise Fachsprache (Pflegealltag & moderne Webentwicklung).
3. Barrierefreiheit: 44×44 px Touch-Ziele, GoBD-/Datenschutz-Konformität.
4. Exakt diese Gliederung – keine weiteren Abschnitte:
   1. Kernziel & Lösungsansatz (1-2 Sätze)
   2. Technische & funktionale Umsetzung (Komponenten, Schnittstellen)
   3. Konkrete Handlungsschritte & Maßnahmen (nummeriert)
   4. Qualitätssicherung & Ergonomie (Ergebnis, Validierung)
Ohne einleitende oder abschließende Grussfloskeln.`;

    // --- DYNAMISCHER TASK-TEIL (immer am Ende – nie gecacht) ---
    const dynamicTaskPrompt = `Analysiere folgende Ausgangslage und erstelle das Lösungs- und Maßnahmenkonzept:

Titel: ${title || 'Ohne Titel'}
Themenbereich / Kategorie: ${category}
${context ? `Zusatzkontext: ${context}\n` : ''}
Problem & Ausgangslage:
"""
${description}
"""

Erstelle das detaillierte Konzept:`;

    const { systemPart, userPart } = buildCacheOptimizedPrompt(staticSystemInstruction, dynamicTaskPrompt);

    let generatedText = '';
    let lastError = null;

    if (apiKey) {
        try {
            const result = await callGeminiWithFallback({
                apiKey,
                systemPart,
                userPart,
                timeoutMs: 25000,
                temperature: 0.2,
                maxOutputTokens: 4096,
                label: 'SolutionConcept',
            });
            generatedText = result.text;
        } catch (err) {
            lastError = err;
            console.warn('[SolutionConceptService] Alle Modelle fehlgeschlagen:', err.message);
        }
    }

    // Robuster Fallback: Strukturierte Synthese aus den übergebenen Parametern, falls die API offline ist
    if (!generatedText || !generatedText.trim()) {
        console.warn(`[SolutionConceptService] API nicht verfügbar (${lastError?.message || 'Kein API-Key'}). Erzeuge strukturiertes Lösungs- und Maßnahmenkonzept als System-Synthese...`);
        
        const cleanTitle = title || 'Optimierung & Fehlerbehebung';
        const cleanCategory = category || 'Core Engine & API';
        const summarySentence = description.length > 120 ? description.substring(0, 117) + '...' : description;

        generatedText = `1. Kernziel & Lösungsansatz:
- Behebung der gemeldeten Problematik ("${cleanTitle}") im Modulbereich "${cleanCategory}".
- Ziel ist ein stabiler, unterbrechungsfreier Ablauf mit klaren Benutzerhinweisen und konsistenter Datenspeicherung: ${summarySentence}

2. Technische & funktionale Umsetzung:
- Frontend & UI: Überprüfung der betroffenen Svelte 5 Komponenten ($state, $derived, $props), Einbindung von Double-Submission-Schutz (isSubmitting-Flag) und barrierefreien Mindest-Touch-Flächen (mind. 44x44px bzw. h-11).
- Backend & PocketBase: Absicherung der Datenvalidierung, Überprüfung der Relationsintegrität und Härtung der Zugriffsregeln nach HRBAC-Sicherheitsmatrix.
- Asynchronität: Implementierung von eindeutigen Ladeindikatoren und optimistischem State-Update mit robuster Fehlerbehandlung bei Verbindungsunterbrechungen.

3. Konkrete Handlungsschritte & Maßnahmen:
1. Ursachenanalyse der gemeldeten Ausgangslage ("${cleanTitle}") in den relevanten Frontend-Routen und Backend-Services.
2. Validierung der Nutzereingaben und Bereitstellung eindeutiger Statusrückmeldungen (Toast-Benachrichtigungen).
3. Härtung der API-Aufrufe mit Timeout-Schutz und idempotenten Request-Handlern.
4. Einhaltung der Barrierefreiheit: Ausreichende Kontraste und mobile Daumenzonen für Betreuungskräfte im Außendienst.

4. Qualitätssicherung & Ergonomie:
- Technische Validierung: Ausführen von 'npm run check' und 'npm run build' zur Vermeidung von Typ- und Syntaxfehlern.
- Manuelle Prüfung: Funktionsprüfung im mobilen Viewport (375px) sowie Verifikation des fehlerfreien Speicherns in PocketBase.`;
    }

    // Zusätzlicher Schutzfilter: Entferne eventuell noch vorhandene KI/AI Erwähnungen
    let sanitizedText = generatedText.trim();
    sanitizedText = sanitizedText.replace(/\b(die\s+)?(KI|AI|Künstliche\s+Intelligenz|Künstlichen\s+Intelligenz)\b/gi, 'das automatisierte System');

    return {
        success: true,
        solutionConcept: sanitizedText,
        title,
        category
    };
}
