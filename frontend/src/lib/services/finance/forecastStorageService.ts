import type { ForecastScenario } from './forecastTypes';

export function getForecastStorageKey(targetUserId: string | undefined, selectedYear: number): string {
    return `orgaflow_ai_forecast_${targetUserId || 'global'}_${selectedYear}`;
}

export function saveForecastToStorage(
    targetUserId: string | undefined,
    selectedYear: number,
    aiSpeculationData: any,
    aiModelUsed: string,
    scenario: ForecastScenario
): string | null {
    if (typeof localStorage === 'undefined' || !aiSpeculationData) return null;
    try {
        const nowIso = new Date().toISOString();
        const payload = {
            data: aiSpeculationData,
            model: aiModelUsed,
            scenario: scenario,
            savedAt: nowIso
        };
        localStorage.setItem(getForecastStorageKey(targetUserId, selectedYear), JSON.stringify(payload));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('orgaflow-forecast-saved', { detail: { year: selectedYear } }));
        }
        return nowIso;
    } catch (e) {
        console.warn('[AI Forecast] Konnte Prognose nicht im Speicher ablegen:', e);
        return null;
    }
}

export function loadForecastFromStorage(
    targetUserId: string | undefined,
    selectedYear: number
): { data: any; model: string; scenario: ForecastScenario; savedAt: string | null } | null {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(getForecastStorageKey(targetUserId, selectedYear));
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.data) {
                return {
                    data: parsed.data,
                    model: parsed.model || 'gemini-3.8-flash',
                    scenario: parsed.scenario || 'ai_speculative',
                    savedAt: parsed.savedAt || null
                };
            }
        }
    } catch (e) {
        console.warn('[AI Forecast] Fehler beim Laden der gespeicherten Prognose:', e);
    }
    return null;
}
