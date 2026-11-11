const routesCache = new Map();

function sanitizeAddr(addr) {
    if (!addr || typeof addr !== 'string') return '';
    let s = addr.trim();
    const parts = s.split(',').map(p => p.trim());
    if (parts.length >= 3) {
        const hasZip = /\b\d{5}\b/.test(parts[parts.length - 1]);
        const hasStreetNum = /\d+/.test(parts[parts.length - 2]);
        if (hasZip && hasStreetNum) {
            s = parts.slice(parts.length - 2).join(', ');
        }
    }
    return s.replace(/\s*\([^)]*\)\s*$/g, '').trim();
}

function parseWaypoint(addr) {
    const coordMatch = addr.trim().match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
    if (coordMatch) {
        return {
            location: {
                latLng: {
                    latitude: parseFloat(coordMatch[1]),
                    longitude: parseFloat(coordMatch[2])
                }
            }
        };
    }
    return { address: addr.trim() };
}

async function geocodeAddress(addr) {
    if (!addr) return null;
    const clean = addr.trim();
    const coordMatch = clean.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
    if (coordMatch) {
        return { lat: parseFloat(coordMatch[1]), lon: parseFloat(coordMatch[2]) };
    }

    // 1. Photon (Komoot OSM Geocoder - schnell, stabil, kein Rate-Limit)
    try {
        const pRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(clean)}&limit=1`).then(r => r.json());
        const c = pRes.features?.[0]?.geometry?.coordinates;
        if (c && c.length >= 2) return { lon: c[0], lat: c[1] };
    } catch {}

    // 2. Nominatim Fallback
    try {
        const nRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean)}&limit=1`, { 
            headers: { 'User-Agent': 'OrgaFlow-VmaRouting/1.0 (info@ihre-seniorenassistenz.com)' } 
        }).then(r => r.json());
        if (nRes?.[0]?.lat && nRes?.[0]?.lon) {
            return { lat: parseFloat(nRes[0].lat), lon: parseFloat(nRes[0].lon) };
        }
    } catch {}

    return null;
}

export async function computeRouteDuration(origin, destination) {
    const cleanOrigin = sanitizeAddr(origin) || origin.trim();
    const cleanDest = sanitizeAddr(destination) || destination.trim();

    if (cleanOrigin.toLowerCase() === cleanDest.toLowerCase()) {
        return { duration: 0, distance: 0, provider: 'identity' };
    }

    const cacheKey = `${cleanOrigin.toLowerCase()}|${cleanDest.toLowerCase()}`;
    if (routesCache.has(cacheKey)) {
        return { ...routesCache.get(cacheKey), cached: true };
    }

    const googleApiKey = process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;

    // 1. Google Routes API (wenn Key konfiguriert ist)
    if (googleApiKey) {
        try {
            const googleResponse = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': googleApiKey,
                    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.description'
                },
                body: JSON.stringify({
                    origin: parseWaypoint(cleanOrigin),
                    destination: parseWaypoint(cleanDest),
                    travelMode: "DRIVE",
                    routingPreference: "TRAFFIC_UNAWARE",
                    languageCode: "de"
                })
            });

            if (googleResponse.ok) {
                const googleData = await googleResponse.json();
                if (googleData.routes && googleData.routes.length > 0) {
                    const route = googleData.routes[0];
                    const durationSec = parseInt((route.duration || '0s').replace('s', ''), 10) || 0;
                    const durationMin = Math.ceil(durationSec / 60);
                    const distanceKm = Math.round(((route.distanceMeters || 0) / 1000) * 10) / 10;
                    const result = { duration: durationMin, distance: distanceKm, provider: 'google_routes' };
                    routesCache.set(cacheKey, result);
                    routesCache.set(`${cleanDest.toLowerCase()}|${cleanOrigin.toLowerCase()}`, result);
                    return result;
                }
            }
        } catch (gErr) {
            console.error("[Google Routes API] Fehler:", gErr);
        }
    }

    // 2. Photon + OSRM Routing (präzise Geodaten & Driving-Berechnung)
    try {
        const originCoord = await geocodeAddress(cleanOrigin);
        const destCoord = await geocodeAddress(cleanDest);
        if (originCoord && destCoord) {
            const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${originCoord.lon},${originCoord.lat};${destCoord.lon},${destCoord.lat}?overview=false`).then(r => r.json());
            if (osrmRes.routes?.[0]) {
                const r = osrmRes.routes[0];
                const durationMin = Math.ceil((r.duration || 0) / 60);
                const distanceKm = Math.round(((r.distance || 0) / 1000) * 10) / 10;
                const result = { duration: durationMin, distance: distanceKm, provider: 'osrm' };
                routesCache.set(cacheKey, result);
                routesCache.set(`${cleanDest.toLowerCase()}|${cleanOrigin.toLowerCase()}`, result);
                return result;
            }
        }
    } catch (e) {
        console.warn("[OSRM Routing] Fehler:", e);
    }

    return null;
}

export function getVmaConfig() {
    const googleKey = process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || '';
    return {
        success: true,
        provider: googleKey ? 'google_routes' : 'osrm',
        hasGoogleKey: !!googleKey,
        cacheEntries: routesCache.size
    };
}
