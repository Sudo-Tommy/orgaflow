import type { SystemPromptRecord } from '$lib/types/orgaTypes';

export interface UnifiedInboxItem {
    id: string;
    source: 'feedback' | 'inquiry' | 'chat';
    title: string;
    sender: string;
    email: string;
    message: string;
    rating: number | null;
    status: string;
    date: string;
    context: string;
    rawRecord: any;
}

export const DEFAULT_PROMPT_TEMPLATE = `## Executive Summary & Zielsetzung
Überblick über die durchgeführten Analysen und Kernziele für diese Kalenderwoche.

## Bereich 1: Core Engine & System-Architektur
- Konkrete Architekturverbesserungen
- Fehlerkorrekturen und Typensicherheit

## Bereich 2: Datenmodell & PocketBase Integrität
- Schemaanpassungen und Validierungen
- Regelwerke und Berechtigungen

## Bereich 3: Abrechnung & Finanz-Workflows
- Rechnungs- und BWA-Optimierungen
- DATEV- und Exportlogik

## Bereich 4: Mobile & Mitarbeiter-UX
- UI-Optimierungen für Smartphones
- Zeiterfassungs- und Fahrtenbuch-Flows

## Bereich 5: Stabilität & Performance
- Ladezeiten und Caching
- Logging und Fehlertoleranz

## Priorisierte Umsetzungsreihenfolge
1. Sofortmaßnahmen (Prio 1)
2. Folgeanpassungen (Prio 2)
3. Refactoring (Prio 3)`;

export function getISOWeekString(date = new Date()): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function formatKW(kwStr?: string): string {
    if (!kwStr) return '';
    const match = kwStr.match(/^(\d{4})-W(\d{1,2})$/);
    if (match) {
        return `KW ${parseInt(match[2], 10)} / ${match[1]}`;
    }
    return kwStr;
}

export function formatDate(dateStr: string): string {
    if (!dateStr) return '–';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
}

export function formatShortDate(dateStr: string): string {
    if (!dateStr) return '–';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    } catch {
        return dateStr;
    }
}

export function getStatusBadge(status: string) {
    switch (status) {
        case 'applied':
            return {
                label: 'Angewendet',
                bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                dot: 'bg-emerald-500'
            };
        case 'archived':
            return {
                label: 'Archiviert',
                bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
                dot: 'bg-slate-400'
            };
        case 'open':
        default:
            return {
                label: 'Offen / Neu',
                bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                dot: 'bg-amber-500 animate-pulse'
            };
    }
}
