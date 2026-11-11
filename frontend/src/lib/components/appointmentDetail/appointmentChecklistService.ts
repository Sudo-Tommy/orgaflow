import { pb } from "$lib/services/pocketbase";
import { toastStore } from "$lib/services/toastService.svelte";
import { refreshAppointmentInStore } from "./appointmentDetailService";

export interface ChecklistItem {
    id: string;
    text: string;
    priority?: 'high' | 'medium' | 'low';
    completed: boolean;
    completed_at: string | null;
    completed_by: string | null;
}

/**
 * Stellt sicher, dass ein To-Do-Text maximal maxWords Wörter umfasst.
 */
export function truncateChecklistWords(text: string, maxWords: number = 8): string {
    if (!text || typeof text !== 'string') return '';
    const clean = text.trim().replace(/\s+/g, ' ');
    const dangling = new Set(['und', 'oder', 'sowie', 'für', 'mit', 'in', 'im', 'am', 'an', 'zu', 'zum', 'zur', 'von', 'vom', 'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines', 'einem', 'einen', 'als', 'wie', 'bei', 'beim', 'um']);
    
    let words = clean.split(' ').filter(Boolean);
    if (words.length > maxWords) {
        words = words.slice(0, maxWords);
    }
    while (words.length > 3 && dangling.has(words[words.length - 1].toLowerCase().replace(/[^a-zäöüß]/gi, ''))) {
        words.pop();
    }
    let truncated = words.join(' ').replace(/[,;:\-\s]+$/, '');
    if (!/[.!?]$/.test(truncated)) {
        truncated += '.';
    }
    return truncated;
}

/**
 * Ermittelt die potenziellen Endpunkte für die Checklisten-Generierung.
 * In Live-Produktion (ihre-seniorenassistenz.com) leitet Nginx nur Anfragen mit /api/emails/
 * an den Express-Microservice weiter.
 */
function getChecklistEndpoints(appointmentId: string): string[] {
    const endpoints: string[] = [];
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname || '127.0.0.1';
        const isLiveProduction = hostname.includes('ihre-seniorenassistenz.com');

        if (isLiveProduction) {
            endpoints.push(`/api/emails/v1/appointments/${appointmentId}/generate-checklist`);
            endpoints.push(`/api/emails/appointments/${appointmentId}/generate-checklist`);
        } else {
            endpoints.push(`http://${hostname}:3000/api/emails/v1/appointments/${appointmentId}/generate-checklist`);
            endpoints.push(`http://${hostname}:3000/api/v1/appointments/${appointmentId}/generate-checklist`);
            endpoints.push(`/api/emails/v1/appointments/${appointmentId}/generate-checklist`);
            endpoints.push(`/api/v1/appointments/${appointmentId}/generate-checklist`);
            if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
                endpoints.push(`http://localhost:3000/api/emails/v1/appointments/${appointmentId}/generate-checklist`);
            }
        }
    } else {
        endpoints.push(`/api/emails/v1/appointments/${appointmentId}/generate-checklist`);
    }
    return endpoints;
}

export async function generateChecklistFromAi(
    appointmentId: string, 
    options?: { previousAppointmentId?: string }
): Promise<ChecklistItem[]> {
    if (!pb.authStore.isValid && !pb.authStore.token) {
        throw new Error("Nicht autorisiert: Bitte loggen Sie sich erneut ein.");
    }

    const endpoints = getChecklistEndpoints(appointmentId);
    let lastError: Error | null = null;
    const bodyPayload = options?.previousAppointmentId ? JSON.stringify({ previousAppointmentId: options.previousAppointmentId }) : JSON.stringify({});

    for (const url of endpoints) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: bodyPayload
            });

            if (!res.ok) {
                let errorDetail = `HTTP ${res.status}`;
                let isNotFound = res.status === 404;
                try {
                    const errorJson = await res.json();
                    if (errorJson.error) errorDetail = errorJson.error;
                    if (errorJson.notFound) isNotFound = true;
                } catch {
                    const text = await res.text().catch(() => '');
                    if (text) errorDetail = text.slice(0, 120);
                }

                if (isNotFound && (errorDetail.includes("nicht gefunden") || errorDetail.includes("gelöscht") || errorDetail.includes("wasn't found"))) {
                    console.warn(`[generateChecklistFromAi] Termin ${appointmentId} nicht gefunden (evtl. gelöscht).`);
                    return [];
                }

                lastError = new Error(`Serverantwort ${res.status}: ${errorDetail}`);
                continue;
            }

            const data = await res.json();
            const rawList = data.checklist || [];
            const list: ChecklistItem[] = rawList.map((item: any) => ({
                ...item,
                text: truncateChecklistWords(item.text || '', 8)
            }));
            await refreshAppointmentInStore(appointmentId);
            return list;
        } catch (err: any) {
            lastError = err;
            continue;
        }
    }

    console.error("[generateChecklistFromAi] Alle Endpunkte fehlgeschlagen:", lastError);
    throw lastError || new Error("Fehler beim Abrufen der Checkliste vom Microservice.");
}

export async function persistChecklist(appointmentId: string, checklist: ChecklistItem[]): Promise<boolean> {
    try {
        await pb.collection('appointments').update(appointmentId, { checklist });
        await refreshAppointmentInStore(appointmentId);
        return true;
    } catch {
        toastStore.error("Fehler beim Speichern der Checkliste.");
        return false;
    }
}

export async function toggleChecklistItem(appointmentId: string, currentList: ChecklistItem[], itemId: string, userId?: string): Promise<ChecklistItem[]> {
    const uid = userId || pb.authStore.model?.id || 'unknown';
    const updated = currentList.map(item => {
        if (item.id !== itemId) return item;
        const nextCompleted = !item.completed;
        return {
            ...item,
            completed: nextCompleted,
            completed_at: nextCompleted ? new Date().toISOString() : null,
            completed_by: nextCompleted ? uid : null
        };
    });
    const ok = await persistChecklist(appointmentId, updated);
    if (!ok) return currentList;
    return updated;
}

export async function addChecklistItem(appointmentId: string, currentList: ChecklistItem[], text: string): Promise<ChecklistItem[]> {
    if (!text.trim()) return currentList;
    const newItem: ChecklistItem = {
        id: `ck_${Date.now()}`,
        text: text.trim(),
        priority: 'medium',
        completed: false,
        completed_at: null,
        completed_by: null
    };
    const updated = [...currentList, newItem];
    const ok = await persistChecklist(appointmentId, updated);
    if (!ok) return currentList;
    toastStore.success("Aufgabe hinzugefügt.");
    return updated;
}

export async function deleteChecklistItem(appointmentId: string, currentList: ChecklistItem[], itemId: string): Promise<ChecklistItem[]> {
    const updated = currentList.filter(item => item.id !== itemId);
    const ok = await persistChecklist(appointmentId, updated);
    if (!ok) return currentList;
    toastStore.info("Aufgabe gelöscht.");
    return updated;
}

/**
 * Triggert die automatische Checklisten-Erstellung im Hintergrund bei neu angelegten Terminen.
 */
export async function triggerAutoChecklistGeneration(
    appointmentId: string, 
    options?: { isPrivate?: boolean; isBlocked?: boolean; silent?: boolean; previousAppointmentId?: string }
): Promise<ChecklistItem[]> {
    if (options?.isPrivate || options?.isBlocked) {
        return [];
    }

    try {
        const list = await generateChecklistFromAi(appointmentId, { previousAppointmentId: options?.previousAppointmentId });
        if (list && list.length > 0 && !options?.silent) {
            toastStore.info(`To-Do-Checkliste automatisch erstellt (${list.length} Aufgaben) ✓`);
        }
        return list;
    } catch (err: any) {
        console.warn("[triggerAutoChecklistGeneration] Automatische Checklisten-Erstellung:", err?.message || err);
        const msg = String(err?.message || '');
        if (!options?.silent && !msg.includes('404') && !msg.includes('nicht gefunden') && !msg.includes('gelöscht')) {
            toastStore.info("Hinweis: Checkliste konnte nicht automatisch erstellt werden. Sie kann im Termin manuell generiert werden.");
        }
        return [];
    }
}
