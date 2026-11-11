import type { TravelReport, TravelMealState, VmaTotals } from "./vmaTypes";
import { pb } from "$lib/services/pocketbase";

export const PER_DIEM_RATES = {
    SINGLE_DAY_OVER_8H: 14.00,
    MULTI_DAY_BOUND: 14.00,
    FULL_DAY: 28.00
};

export const MEAL_DEDUCTIONS = {
    BREAKFAST: 5.60,
    LUNCH: 11.20,
    DINNER: 11.20
};

export const KM_RATE = 0.30;
export const ACCOMMODATION_LUMP_SUM = 20.00;

export const TICKET_KEYWORDS = ['bahn', 'zug', 'ticket', 'fahrkarte', 'bus', 'tram', 'öpnv', 'taxi', 'uber', 'flug', 'streifenkarte', 'fahrschein'];
export const HOTEL_KEYWORDS = ['hotel', 'übernachtung', 'pension', 'hostel', 'unterkunft', 'motel', 'zimmer', 'bnb', 'airbnb'];

const travelCache = new Map<string, { duration: number; distance: number; provider: string }>();

export function formatTime(date: Date | null): string {
    if (!date || isNaN(date.getTime())) return "";
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(hours: number): string {
    const safeHours = Math.max(0, hours || 0);
    const h = Math.floor(safeHours);
    const m = Math.round((safeHours - h) * 60);
    return `${h}h ${m}m`;
}

export function getMonthName(month: number, year: number): string {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleString('de-DE', { month: 'long' });
}

export function calculateTotals(reports: TravelReport[]): VmaTotals {
    return reports.reduce((acc, r) => {
        acc.absence = Math.round((acc.absence + (r.totalAbsenceHours || 0)) * 100) / 100;
        acc.km = Math.round((acc.km + (r.totalKm || 0)) * 10) / 10;
        acc.mileage = Math.round((acc.mileage + (r.mileageCosts || 0)) * 100) / 100;
        acc.ticket = Math.round((acc.ticket + (r.ticketCosts || 0)) * 100) / 100;
        acc.travel = Math.round((acc.travel + (r.travelCosts || 0)) * 100) / 100;
        acc.grossVma = Math.round((acc.grossVma + (r.grossPerDiem || 0)) * 100) / 100;
        acc.deductions = Math.round((acc.deductions + (r.totalDeduction || 0)) * 100) / 100;
        acc.vma = Math.round((acc.vma + (r.netPerDiem || 0)) * 100) / 100;
        acc.accommodation = Math.round((acc.accommodation + (r.accommodation || 0)) * 100) / 100;
        acc.incidental = Math.round((acc.incidental + (r.incidentalCosts || 0)) * 100) / 100;
        acc.total = Math.round((acc.total + (r.dayTotal || 0)) * 100) / 100;
        return acc;
    }, {
        absence: 0, km: 0, mileage: 0, ticket: 0, travel: 0,
        grossVma: 0, deductions: 0, vma: 0, accommodation: 0, incidental: 0, total: 0
    });
}

export function recalculateReportWithMeals(report: TravelReport, meals: TravelMealState): TravelReport {
    let deduction = 0;
    const parts: string[] = [];
    if (meals.breakfast) { deduction += MEAL_DEDUCTIONS.BREAKFAST; parts.push('F -5,60 €'); }
    if (meals.lunch) { deduction += MEAL_DEDUCTIONS.LUNCH; parts.push('M -11,20 €'); }
    if (meals.dinner) { deduction += MEAL_DEDUCTIONS.DINNER; parts.push('A -11,20 €'); }
    deduction = Math.round(deduction * 100) / 100;

    const netPerDiem = report.grossPerDiem > 0 ? Math.round(Math.max(0, report.grossPerDiem - deduction) * 100) / 100 : 0;
    const deductionText = parts.length > 0 ? `-${deduction.toFixed(2).replace('.', ',')} € (${parts.map(p => p[0]).join(', ')})` : '';
    const dayTotal = Math.round((report.travelCosts + netPerDiem + report.accommodation + report.incidentalCosts) * 100) / 100;

    return { ...report, meals, totalDeduction: deduction, deductionText, netPerDiem, dayTotal };
}

export async function estimateTravel(
    origin: string, destination: string, authToken: string, microserviceUrl: string
): Promise<{ duration: number; distance: number; provider: string }> {
    if (!origin || !destination || origin.trim().length < 3 || destination.trim().length < 3) {
        return { duration: 30, distance: 15, provider: 'fallback' };
    }
    const cleanOrigin = origin.trim();
    const cleanDest = destination.trim();
    const cacheKey = `${cleanOrigin.toLowerCase()}|${cleanDest.toLowerCase()}`;
    const reverseKey = `${cleanDest.toLowerCase()}|${cleanOrigin.toLowerCase()}`;
    if (travelCache.has(cacheKey)) return travelCache.get(cacheKey)!;
    if (travelCache.has(reverseKey)) return travelCache.get(reverseKey)!;

    try {
        const res = await fetch(`${microserviceUrl}/api/emails/vma/duration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ origin: cleanOrigin, destination: cleanDest })
        });
        if (res.ok) {
            const data = await res.json();
            const result = { duration: data.duration || 30, distance: data.distance || 15, provider: data.provider || 'google_routes' };
            travelCache.set(cacheKey, result);
            travelCache.set(reverseKey, result);
            return result;
        }
    } catch (e) { console.warn("[VMA Routes API] Abruf fehlgeschlagen:", e); }
    const fallback = { duration: 30, distance: 15, provider: 'standard_estimate' };
    travelCache.set(cacheKey, fallback);
    return fallback;
}

export function loadStoredMeals(uid: string): Record<string, TravelMealState> {
    try {
        const raw = localStorage.getItem(`orga_vma_meals_${uid}`);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

export function saveStoredMeals(uid: string, data: Record<string, TravelMealState>) {
    try { localStorage.setItem(`orga_vma_meals_${uid}`, JSON.stringify(data)); } catch {}
}

export async function loadCompanyData(effectiveUser: any): Promise<any> {
    try {
        let cId = Array.isArray(effectiveUser?.company) ? effectiveUser.company[0] : effectiveUser?.company;
        if (cId) return await pb.collection('company').getOne(cId, { requestKey: null });
        const list = await pb.collection('company').getList(1, 1, { requestKey: null });
        return list.items.length > 0 ? list.items[0] : null;
    } catch (e) {
        console.warn("[VMA] Firmendaten konnten nicht geladen werden:", e);
        return null;
    }
}
