/**
 * Berechnet die Luftlinien-Entfernung in Metern zwischen zwei GPS-Punkten (Haversine).
 */
export function haversineDistanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Löst eine Adresse einmalig beim Speichern in Koordinaten auf (OpenStreetMap Nominatim).
 */
export async function geocodeAddressOnce(
    street?: string,
    housenr?: string,
    zip?: string,
    city?: string
): Promise<{ lat: number; lng: number } | null> {
    if (typeof window === 'undefined' || !navigator.onLine) return null;
    const line1 = `${street || ''} ${housenr || ''}`.trim();
    const line2 = `${zip || ''} ${city || ''}`.trim();
    const query = [line1, line2, 'Deutschland'].filter(Boolean).join(', ');
    if (!line1 && !line2) return null;

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'de' } });
        if (!res.ok) return null;
        const arr = await res.json();
        if (!Array.isArray(arr) || arr.length === 0) return null;
        const lat = parseFloat(arr[0].lat);
        const lng = parseFloat(arr[0].lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng };
    } catch {
        return null;
    }
}
