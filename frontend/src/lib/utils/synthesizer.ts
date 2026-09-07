
/**
 * synthesizer.ts
 *
 * Hilfsfunktion zur strukturierten Aufbereitung und Formatierung von
 * Verbesserungsvorschlägen als gebündeltes System-Schnittstellen-Dokument
 * ("Sammel-Arbeitsauftrag / Releasespezifikation") für Gemini Code Assist (Agent) in Antigravity.
 */

export interface ProposalSynthesizerRecord {
    id: string;
    title: string;
    category?: string;
    priority?: string;
    author_name?: string;
    author?: string;
    description: string;
    solution_concept?: string;
    expected_behavior?: string;
    tags?: string;
    status?: string;
    created?: string;
    updated?: string;
}

/**
 * Wandelt interne Prioritäts-Schlüssel in menschenlesbare deutsche Bezeichnungen um.
 */
export function formatPriorityLabel(priority?: string): string {
    if (!priority) return 'Medium';
    switch (priority.toLowerCase()) {
        case 'critical':
            return 'Kritisch (Höchste Dringlichkeit)';
        case 'high':
            return 'Hoch (Erhöhte Dringlichkeit)';
        case 'medium':
            return 'Medium (Standard)';
        case 'low':
            return 'Niedrig (Geringe Dringlichkeit)';
        default:
            return priority;
    }
}

/**
 * Ordnet eine Kategorie den typischen betroffenen Quellcode-Dateien zu.
 */
function getFilesForCategory(cat?: string): string[] {
    const c = (cat || '').toLowerCase();
    if (c.includes('finanz') || c.includes('haushalt') || c.includes('abrechn')) {
        return [
            '`frontend/src/routes/finances/+page.svelte` (Finanzübersicht & Buchungen)',
            '`frontend/src/lib/services/personalFinanceService.svelte.ts` (Buchungslogik & Stornos)'
        ];
    }
    if (c.includes('dokument') || c.includes('vorlage')) {
        return [
            '`frontend/src/routes/documents/+page.svelte` (Dokumentenverwaltung)',
            '`frontend/src/lib/services/documentGeneratorService.svelte.ts` (PDF/Drucktoken-Engine)',
            '`frontend/src/lib/components/editor/EditorTopBar.svelte` (Editor & Vorlagen)'
        ];
    }
    if (c.includes('termin') || c.includes('außendienst') || c.includes('mobile')) {
        return [
            '`frontend/src/routes/appointments/+page.svelte` (Terminkalender & Touren)',
            '`frontend/src/lib/components/AppointmentModal.svelte` (Terminformular)'
        ];
    }
    if (c.includes('sicherheit') || c.includes('audit') || c.includes('hrbac')) {
        return [
            '`pocketbase/pb_migrations/...` (HRBAC-Regeln & Sicherheitsschema)',
            '`frontend/src/lib/services/rbacService.svelte.ts` (Rollenprüfung)',
            '`frontend/src/hooks.server.ts` (Server-Routing-Guards)'
        ];
    }
    return [
        '`frontend/src/routes/...` (Relevante Frontend-Routen)',
        '`frontend/src/lib/services/...` (Zustand & API-Services)',
        '`microservice/...` (Node.js API-Schnittstellen)'
    ];
}

/**
 * Generiert ein konsolidiertes Entwickler-Spezifikationsdokument aus ausgewählten Vorschlägen
 * im verbindlichen 4-teiligen Antigravity-Ausbesserungsprompt-Format.
 */
export function generateSammelAuftragBriefing(records: ProposalSynthesizerRecord[]): string {
    const datum = new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const titlesList = records.map(r => r.title || 'Unbenannt').join(', ');
    const shortTitle = records.length === 1 
        ? (records[0].title || 'Vorgang') 
        : `Sammel-Arbeitsauftrag (${records.length} Vorgänge)`;

    let output = `# Spezifischer Ausbesserungsprompt für Gemini Code Assist (Agent) in Antigravity: ${shortTitle}\n\n`;

    // 1. Executive Problem-Diagnose & Kontext
    output += `## 1. Executive Problem-Diagnose & Kontext\n`;
    output += `- **Erstellungsdatum:** ${datum}\n`;
    output += `- **Anzahl gebündelter Vorgänge:** ${records.length}\n`;
    output += `- **Überblick der Vorgänge:** ${titlesList}\n\n`;

    records.forEach((rec, index) => {
        const creator = rec.author_name || rec.author || 'Superadmin';
        const category = rec.category || 'Core Engine & API';
        const priority = formatPriorityLabel(rec.priority);
        output += `### Vorgang [${index + 1}]: ${rec.title || 'Unbenannter Vorgang'}\n`;
        output += `- **ID:** \`${rec.id}\` | **Kategorie:** ${category} | **Priorität:** ${priority} | **Erfasser:** ${creator}\n`;
        output += `- **Ausgangslage:** ${rec.description || 'Keine Beschreibung angegeben.'}\n`;
        if (rec.solution_concept) {
            output += `- **Erwartetes Lösungskonzept:** ${rec.solution_concept}\n`;
        }
        if (rec.tags && rec.tags.trim()) {
            output += `- **Tags:** #${rec.tags.trim().split(',').map(t => t.trim()).join(' #')}\n`;
        }
        output += `\n`;
    });

    // 2. Betroffene Komponenten & Dateien
    output += `## 2. Betroffene Komponenten & Dateien\n`;
    const uniqueFiles = new Set<string>();
    records.forEach(rec => {
        getFilesForCategory(rec.category).forEach(f => uniqueFiles.add(f));
    });
    uniqueFiles.forEach(f => {
        output += `- ${f}\n`;
    });
    output += `\n`;

    // 3. Konkreter technischer Ausbesserungsplan
    output += `## 3. Konkreter technischer Ausbesserungsplan\n`;
    records.forEach((rec, index) => {
        const solution = rec.solution_concept || rec.expected_behavior || 'Nach Best Practices implementieren und testen.';
        output += `### Maßnahme ${index + 1}: ${rec.title}\n`;
        output += `1. **Soll-Zustand herstellen:** ${solution}\n`;
        output += `2. **Svelte 5 Runes:** Reaktive Werte sauber mit \`$state\`, \`$derived\`, \`$props\` deklarieren.\n`;
        output += `3. **Double-Submission-Schutz:** Asynchrone Schaltflächen während des API-Calls mit \`isSubmitting\` sperren.\n\n`;
    });

    output += `### Globale Architektur- & Qualitätsrichtlinien:\n`;
    output += `- **Ergonomie:** Alle klickbaren Schaltflächen mindestens 44x44px (\`h-11\`) mit Daumenzonen-Optimierung.\n`;
    output += `- **Strikte KI-Blacklist:** Keine Erwähnung von "KI", "AI", "Prompt" im gerenderten Interface.\n`;
    output += `- **Formelle Ansprache:** Durchgängig formelle Sie-Form im Klienten- und Angehörigenbereich.\n\n`;

    // 4. Test- & Verifikationskriterien
    output += `## 4. Test- & Verifikationskriterien\n`;
    output += `- TypeScript- & Svelte-Check ausführen: \`cd frontend && npm run check\`\n`;
    output += `- Frontend Build-Validierung: \`cd frontend && npm run build\`\n`;
    output += `- Asset-Synchronisation: \`robocopy frontend\\pb_public backend\\pb_public /MIR\`\n`;
    output += `- Manuelle Prüfung im mobilen Viewport (375px) auf barrierefreie Bedienung.\n`;

    return output;
}
