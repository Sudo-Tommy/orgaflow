/**
 * formDraftService.ts
 * Automatisches Zwischenspeichern von Formularentwürfen im LocalStorage.
 * Schützt Benutzer vor Datenverlust bei Verbindungsabbrüchen oder versehentlichem Schließen.
 */

const DRAFT_PREFIX = 'orga_draft_';

export class FormDraftService {
    /**
     * Speichert einen Entwurf debounced oder sofort.
     */
    static saveDraft<T>(formKey: string, data: T): void {
        if (typeof window === 'undefined') return;
        try {
            const payload = {
                timestamp: Date.now(),
                data
            };
            localStorage.setItem(DRAFT_PREFIX + formKey, JSON.stringify(payload));
        } catch (e) {
            console.warn(`[Draft] Konnte Entwurf für '${formKey}' nicht speichern:`, e);
        }
    }

    /**
     * Lädt einen gespeicherten Entwurf, falls vorhanden.
     */
    static loadDraft<T>(formKey: string): { data: T; timestamp: number } | null {
        if (typeof window === 'undefined') return null;
        try {
            const raw = localStorage.getItem(DRAFT_PREFIX + formKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && 'data' in parsed) {
                return parsed;
            }
            return { data: parsed, timestamp: Date.now() };
        } catch {
            return null;
        }
    }

    /**
     * Lädt direkt die Nutzdaten des gespeicherten Entwurfs
     */
    static loadDraftData<T>(formKey: string): T | null {
        const res = FormDraftService.loadDraft<T>(formKey);
        return res ? res.data : null;
    }

    /**
     * Löscht den gespeicherten Entwurf nach erfolgreichem Abspeichern oder manuellem Verwerfen.
     */
    static clearDraft(formKey: string): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.removeItem(DRAFT_PREFIX + formKey);
        } catch {}
    }

    /**
     * Prüft, ob ein Entwurf für dieses Formular existiert.
     */
    static hasDraft(formKey: string): boolean {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(DRAFT_PREFIX + formKey) !== null;
    }

    /**
     * Sicherheitsabfrage vor dem Verwerfen nicht gespeicherter Änderungen.
     */
    static confirmDiscard(hasChangesOrKey: boolean | string, onConfirm?: () => void): boolean {
        if (typeof hasChangesOrKey === 'string') {
            const confirmed = typeof window !== 'undefined' 
                ? window.confirm('Möchten Sie das Formular wirklich schließen? Nicht gespeicherte Änderungen gehen verloren.') 
                : true;
            if (confirmed && onConfirm) onConfirm();
            return confirmed;
        }
        if (!hasChangesOrKey) return true;
        if (typeof window === 'undefined') return true;
        return window.confirm('Möchten Sie das Formular wirklich schließen? Nicht gespeicherte Änderungen gehen verloren.');
    }
}

export const formDraftService = FormDraftService;
