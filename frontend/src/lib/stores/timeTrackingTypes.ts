export interface TrackingSessionData {
    activeEntryId: string;
    startTime: string;
    startTimeMs: number;
    clientId: string;
    clientName: string;
    serviceType: string;
    appointmentId?: string;
    userId?: string;
    isPaused: boolean;
    pausedAtMs?: number;
    totalPausedMs: number;
}
