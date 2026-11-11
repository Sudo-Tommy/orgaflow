import { pb } from "$lib/services/pocketbase";

const routeDurationCache = new Map<string, { duration: number; distance: number }>();

export function cleanAddressForRouting(addr: string): string {
    if (!addr) return '';
    let clean = addr.trim();
    const parts = clean.split(',').map(p => p.trim());
    if (parts.length >= 3) {
        const hasZip = /\b\d{5}\b/.test(parts[parts.length - 1]);
        const hasStreetNum = /\d+/.test(parts[parts.length - 2]);
        if (hasZip && hasStreetNum) {
            clean = parts.slice(parts.length - 2).join(', ');
        }
    }
    return clean.replace(/\s*\([^)]*\)\s*$/g, '').trim();
}

export function formatMinutes(mins: number): string {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours === 0) return `${remainingMins} min`;
    return `${hours}h ${remainingMins > 0 ? `${remainingMins}m` : ''}`.trim();
}

export function formatElapsed(totalSecs: number): string {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return hours > 0 ? `${pad(hours)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

export function getDuration(startStr: string, endStr: string): string {
    if (!startStr || !endStr) return "-";
    const diffMs = new Date(endStr).getTime() - new Date(startStr).getTime();
    if (diffMs < 0) return "Fehlerhafte Zeiten";
    const diffMins = Math.round(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours === 0 ? `${mins} min` : `${hours}h ${mins}m`;
}

export async function fetchRouteMetrics(origin: string, destination: string): Promise<{ distance: number; duration: number } | null> {
    if (!origin || !destination || origin === 'Current+Location') return null;
    const normOrigin = origin.trim().toLowerCase();
    const normDest = destination.trim().toLowerCase();
    if (normOrigin === normDest) return { distance: 0, duration: 0 };
    const cacheKey = `${normOrigin}-->${normDest}`;
    if (routeDurationCache.has(cacheKey)) return routeDurationCache.get(cacheKey)!;

    try {
        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const microserviceUrl = (import.meta as any).env?.DEV || isLocal ? `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3000` : '';
        const res = await fetch(`${microserviceUrl}/api/emails/vma/duration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pb.authStore.token}` },
            body: JSON.stringify({ origin: origin.trim(), destination: destination.trim() })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success && typeof data.distance === 'number' && typeof data.duration === 'number') {
                const result = { distance: data.distance, duration: data.duration };
                routeDurationCache.set(cacheKey, result);
                return result;
            }
        }
    } catch (e) {
        console.warn("[Route Metrics] Fehler:", e);
    }
    return null;
}
