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

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
    const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    const candidateModels = [
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest"
    ];

    const systemPrompt = `Du bist der Chef-Systemarchitekt und Prozessberater für "OrgaFlow", die Enterprise-Software für Seniorenbetreuung und Pflegedienste.
Technologiestack: SvelteKit 2 mit Svelte 5 Runes ($state, $derived, $props), Tailwind CSS, PocketBase, Node.js Microservice.

Deine Aufgabe ist es, für eine gegebene Problemstellung oder ein Anliegen ein sofort umsetzbares, professionelles und strukturiertes LÖSUNGS- UND MASSNAHMENKONZEPT zu formulieren.

STRENGSTE RICHTLINIEN:
1. Erwähne NIEMALS die Wörter "KI", "AI", "künstliche Intelligenz", "LLM", "Prompt" oder "Sprachmodell" im generierten Lösungsansatz.
2. Verwende eine sachliche, präzise Fachsprache (Pflegealltag & moderne Webentwicklung).
3. Achte auf Barrierefreiheit (mindestens 44x44px Touch-Ziele auf Mobilgeräten) und GoBD-/Datenschutz-Konformität.
4. Halte dich exakt an die geforderte Gliederung:

GLIEDERUNG DES LÖSUNGSKONZEPTS:
1. Kernziel & Lösungsansatz:
   - Präzise Zusammenfassung der Lösung (1-2 prägnante Sätze).
2. Technische & funktionale Umsetzung:
   - Betroffene Komponenten, UI-Elemente und Schnittstellen/Datenmodelle.
3. Konkrete Handlungsschritte & Maßnahmen:
   - Nummerierte, sofort ausführbare Einzelschritte.
4. Qualitätssicherung & Ergonomie:
   - Erwartetes Ergebnis, Barrierefreiheit (Touch-Targets, Tastaturbedienung) und Validierung.

Schreibe direkt das Konzept ohne einleitende oder abschließende Grußfloskeln.`;

    const userPrompt = `Analysiere folgende Ausgangslage und erstelle das Lösungs- und Maßnahmenkonzept:

Titel: ${title || 'Ohne Titel'}
Themenbereich / Kategorie: ${category}
${context ? `Zusatzkontext: ${context}\n` : ''}
Problem & Ausgangslage:
"""
${description}
"""

Erstelle das detaillierte Konzept:`;

    let generatedText = '';
    let lastError = null;

    if (genAI) {
        for (const modelName of candidateModels) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 2048,
                    }
                });

                const generatePromise = model.generateContent([
                    { text: systemPrompt },
                    { text: userPrompt }
                ]);

                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Timeout bei Modell '${modelName}' nach 10s`)), 10000)
                );

                const result = await Promise.race([generatePromise, timeoutPromise]);
                const response = await result.response;
                generatedText = response.text();

                if (generatedText && generatedText.trim()) {
                    console.log(`[SolutionConceptService] Erfolgreich via '${modelName}' generiert.`);
                    break;
                }
            } catch (err) {
                console.warn(`[SolutionConceptService] Fehler mit Modell ${modelName}:`, err.message);
                lastError = err;
                if (err.message.includes('429') || err.message.includes('Quota exceeded')) {
                    console.log("[SolutionConceptService] Quota erreicht - wechsle direkt zur System-Synthese.");
                    break;
                }
            }
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
