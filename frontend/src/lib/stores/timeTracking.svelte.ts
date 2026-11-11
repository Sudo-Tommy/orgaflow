import { pb } from "$lib/services/pocketbase";
import { extractClientFromAppointment } from "./timeTrackingClientHelper";
import {
    processPendingSync as runSync,
    persistSessionToStorage,
    restoreSessionFromStorage
} from "./timeTrackingSyncHelper";
import {
    executeStartTracking,
    executePauseTracking,
    executeResumeTracking,
    executeStopTracking
} from "./timeTrackingActionService";
import {
    checkIsVisibleForCurrentUser,
    resolveEffectiveClientName,
    resolveEffectiveClientId,
    formatElapsedSeconds,
    computeElapsedSeconds
} from "./timeTrackingDerivedHelper";
import type { TrackingSessionData } from "./timeTrackingTypes";

export type { TrackingSessionData };
export { extractClientFromAppointment };

export function createTimeTrackingStore() {
    let activeEntryId = $state<string | null>(null), startTime = $state<string | null>(null), startTimeMs = $state<number>(0);
    let clientId = $state<string | null>(null), clientName = $state<string | null>(null), serviceType = $state<string | null>(null);
    let appointmentId = $state<string | null>(null), userId = $state<string | null>(null);
    let isPaused = $state(false), pausedAtMs = $state<number | undefined>(undefined), totalPausedMs = $state(0);
    let elapsedSeconds = $state(0), isSubmitting = $state(false), isSyncing = $state(false);
    let timerInterval: ReturnType<typeof setInterval> | null = null;

    let currentAuthUserId = $state<string | null>(
        typeof window !== 'undefined' ? (pb.authStore.record?.id || pb.authStore.model?.id || null) : null
    );
    let isAuthValid = $state<boolean>(
        typeof window !== 'undefined' ? pb.authStore.isValid : false
    );

    if (typeof window !== 'undefined') {
        pb.authStore.onChange(() => {
            currentAuthUserId = pb.authStore.record?.id || pb.authStore.model?.id || null;
            isAuthValid = pb.authStore.isValid;
        });
    }

    let isVisibleForCurrentUser = $derived(
        checkIsVisibleForCurrentUser(activeEntryId, isAuthValid, currentAuthUserId, appointmentId, userId)
    );
    let effectiveClientName = $derived(
        resolveEffectiveClientName(clientName, appointmentId, clientId)
    );
    let effectiveClientId = $derived(
        resolveEffectiveClientId(clientId, appointmentId)
    );
    let pausedDuration = $derived.by(() => {
        if (!activeEntryId) return 0;
        let cur = totalPausedMs;
        if (isPaused && pausedAtMs) cur += Math.max(0, Date.now() - pausedAtMs);
        return Math.floor(cur / 1000);
    });
    let isActive = $derived(Boolean(activeEntryId));
    let formattedTime = $derived(formatElapsedSeconds(elapsedSeconds));

    let activeSession = $derived.by<TrackingSessionData | null>(() => {
        if (!activeEntryId || !startTime) return null;
        return {
            activeEntryId, startTime, startTimeMs,
            clientId: effectiveClientId || '',
            clientName: effectiveClientName || '',
            serviceType: serviceType || '',
            appointmentId: appointmentId || undefined,
            userId: userId || undefined,
            isPaused, pausedAtMs, totalPausedMs
        };
    });

    function recalculateElapsed() {
        elapsedSeconds = computeElapsedSeconds(activeEntryId, startTimeMs, totalPausedMs, isPaused, pausedAtMs);
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        recalculateElapsed();
        timerInterval = setInterval(() => { if (!isPaused) recalculateElapsed(); }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function persist() {
        persistSessionToStorage(activeSession);
    }

    async function triggerPendingSync() {
        if (isSyncing) return;
        isSyncing = true;
        try {
            await runSync(() => activeEntryId, (id) => { activeEntryId = id; }, persist);
        } finally {
            isSyncing = false;
        }
    }

    function applySessionData(data: TrackingSessionData | null) {
        if (!data) {
            stopTimer();
            activeEntryId = null; startTime = null; startTimeMs = 0;
            clientId = null; clientName = null; serviceType = null; appointmentId = null; userId = null;
            isPaused = false; pausedAtMs = undefined; totalPausedMs = 0; elapsedSeconds = 0;
            persist();
            return;
        }
        activeEntryId = data.activeEntryId;
        startTime = data.startTime;
        startTimeMs = data.startTimeMs || new Date(data.startTime).getTime();
        clientId = data.clientId || null;
        clientName = data.clientName || null;
        serviceType = data.serviceType || null;
        appointmentId = data.appointmentId || null;
        userId = data.userId || null;
        isPaused = Boolean(data.isPaused);
        pausedAtMs = data.pausedAtMs;
        totalPausedMs = data.totalPausedMs || 0;
        recalculateElapsed();
        persist();
        startTimer();
    }

    if (typeof window !== 'undefined') {
        const saved = restoreSessionFromStorage();
        if (saved) applySessionData(saved);
        window.addEventListener('online', () => { triggerPendingSync(); });
        if (navigator.onLine) setTimeout(() => { triggerPendingSync(); }, 1500);
    }

    async function start(
        targetClientId: string | { clientId: string; serviceType?: string; clientName?: string; appointmentId?: string },
        argServiceType: string = '',
        argClientName: string = '',
        argAppointmentId: string = ''
    ): Promise<boolean> {
        if (isSubmitting) return false;
        isSubmitting = true;
        try {
            const res = await executeStartTracking({ targetClientId, argServiceType, argClientName, argAppointmentId });
            if (res.success && res.recordId) {
                applySessionData({
                    activeEntryId: res.recordId,
                    startTime: res.startTimeIso || '',
                    startTimeMs: res.startTimeMs || Date.now(),
                    clientId: res.clientId || '',
                    clientName: res.clientName || '',
                    serviceType: res.serviceType || '',
                    appointmentId: res.appointmentId || undefined,
                    isPaused: false,
                    totalPausedMs: 0
                });
                return true;
            }
            return false;
        } finally {
            isSubmitting = false;
        }
    }

    async function pause(): Promise<void> {
        if (!activeEntryId || isPaused || isSubmitting) return;
        isSubmitting = true;
        isPaused = true;
        pausedAtMs = Date.now();
        recalculateElapsed();
        persist();
        try {
            await executePauseTracking(activeEntryId, clientId, elapsedSeconds);
        } finally {
            isSubmitting = false;
        }
    }

    async function resume(): Promise<void> {
        if (!activeEntryId || !isPaused || isSubmitting) return;
        isSubmitting = true;
        const now = Date.now();
        if (pausedAtMs) totalPausedMs += Math.max(0, now - pausedAtMs);
        isPaused = false;
        pausedAtMs = undefined;
        recalculateElapsed();
        persist();
        try {
            await executeResumeTracking(activeEntryId, clientId, totalPausedMs);
        } finally {
            isSubmitting = false;
        }
    }

    async function stop(): Promise<boolean> {
        if (!activeEntryId || isSubmitting) return false;
        isSubmitting = true;
        stopTimer();
        recalculateElapsed();
        try {
            const ok = await executeStopTracking({
                recordId: activeEntryId, clientId, clientName, appointmentId,
                startTime, startTimeMs, serviceType, recordedSeconds: elapsedSeconds
            });
            if (ok) {
                applySessionData(null);
                return true;
            }
            return false;
        } finally {
            isSubmitting = false;
        }
    }

    return {
        get activeEntryId() { return activeEntryId; },
        get startTime() { return startTime; },
        get clientId() { return effectiveClientId; },
        get clientName() { return effectiveClientName; },
        get serviceType() { return serviceType; },
        get appointmentId() { return appointmentId; },
        get userId() { return userId; },
        get isVisibleForCurrentUser() { return isVisibleForCurrentUser; },
        get isPaused() { return isPaused; },
        get pausedDuration() { return pausedDuration; },
        get elapsedSeconds() { return elapsedSeconds; },
        get formattedTime() { return formattedTime; },
        get isActive() { return isActive; },
        get isSubmitting() { return isSubmitting; },
        get isSyncing() { return isSyncing; },
        get activeSession() { return activeSession; },
        start, pause, resume, stop,
        setActiveSessionDirectly: (data: TrackingSessionData) => applySessionData(data),
        clearActiveSession: () => applySessionData(null),
        processPendingSync: triggerPendingSync,
        startTracking: start, pauseTracking: pause, resumeTracking: resume, stopTracking: stop
    };
}

export const timeTrackingStore = createTimeTrackingStore();
