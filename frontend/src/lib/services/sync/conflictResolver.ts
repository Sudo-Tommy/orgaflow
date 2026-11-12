export interface ConflictDecision {
    winner: 'local' | 'server';
    message?: string;
}

/**
 * Konfliktauflösung nach dem Prinzip „Neueste Änderung gewinnt“.
 * Vergleicht den Server-Zeitstempel (`updated`) mit dem Zeitpunkt der Offline-Erfassung.
 */
export function resolveSyncConflict(
    serverUpdatedAt: string | undefined | null,
    localTimestampMs: number,
    label = 'Eintrag'
): ConflictDecision {
    if (!serverUpdatedAt) return { winner: 'local' };
    const serverMs = new Date(serverUpdatedAt).getTime();
    if (!Number.isFinite(serverMs)) return { winner: 'local' };

    // Server-Änderung ist echt neuer (> 1 Sekunde Toleranz)
    if (serverMs > localTimestampMs + 1000) {
        return {
            winner: 'server',
            message: `Änderung an „${label}“ wurde durch eine neuere Server-Version ersetzt.`
        };
    }

    return { winner: 'local' };
}
