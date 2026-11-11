/**
 * proposalStorageHelpers.ts
 *
 * Persistenz- und Hilfsfunktionen für Verbesserungsvorschläge (Cache, Gelesen-Status).
 */

import type { ImprovementProposalRecord } from '$lib/types/orgaTypes';

export const PROPOSALS_STORAGE_KEY = 'orgaflow_improvement_proposals_cache';
export const READ_PROPOSALS_KEY = 'orgaflow_read_proposals_ids';
export const PROPOSALS_LAST_SEEN_KEY = 'orgaflow_proposals_last_seen_ts';

export function loadCachedProposals(): ImprovementProposalRecord[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(PROPOSALS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveCachedProposals(proposals: ImprovementProposalRecord[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(proposals));
    } catch {}
}

export function loadReadProposalIds(currentProposals: ImprovementProposalRecord[] = []): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(READ_PROPOSALS_KEY);
        if (raw !== null) {
            return JSON.parse(raw);
        }
        // Erster Aufruf: Bestehende ältere Vorschläge als initial gelesen markieren,
        // außer solche vom heutigen Tag (z. B. der neue Vorschlag vom 10.10.2026)
        const todayStr = new Date().toISOString().slice(0, 10);
        const initialRead = currentProposals
            .filter(p => !p.created || !p.created.startsWith(todayStr))
            .map(p => p.id);
        localStorage.setItem(READ_PROPOSALS_KEY, JSON.stringify(initialRead));
        return initialRead;
    } catch {
        return [];
    }
}

export function saveReadProposalIds(ids: string[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(READ_PROPOSALS_KEY, JSON.stringify(ids));
    } catch {}
}
