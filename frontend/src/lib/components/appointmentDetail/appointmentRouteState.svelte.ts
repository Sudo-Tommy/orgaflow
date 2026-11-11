import { pb } from "$lib/services/pocketbase";
import type { RouteTargetMode } from "./appointmentDetailTypes";
import { cleanAddressForRouting, fetchRouteMetrics } from "./appointmentRouteService";

export function createAppointmentRouteState(
    getAppointment: () => any,
    getPickupAddress: () => string,
    getClientAddress: () => string,
    getTargetAddress: () => string,
    getTargetTitle: () => string,
    getAssignedUser: () => any
) {
    let isMobile = $state(false);
    let userLocation = $state<{ lat: number; lng: number } | null>(null);
    let isLocatingUser = $state(false);
    let locationError = $state<string | null>(null);
    let routeTargetMode = $state<RouteTargetMode>('client_to_destination');
    let routeDistance = $state<number | null>(null);
    let routeDuration = $state<number | null>(null);
    let isCalculatingRoute = $state(false);

    let currentLoadedAppId = $state<string | null>(null);
    let lastAutoCalcKey = $state("");

    // Initialisiere gespeicherte Metriken aus PocketBase oder führe Einmalberechnung durch
    $effect(() => {
        const app = getAppointment();
        const appId = app?.id || null;

        if (appId !== currentLoadedAppId) {
            currentLoadedAppId = appId;
            routeDistance = (app?.route_distance !== undefined && app?.route_distance !== null) ? app.route_distance : null;
            routeDuration = (app?.route_duration !== undefined && app?.route_duration !== null) ? app.route_duration : null;
            lastAutoCalcKey = "";
        } else {
            if (app?.route_distance !== undefined && app?.route_distance !== null && routeDistance === null) {
                routeDistance = app.route_distance;
            }
            if (app?.route_duration !== undefined && app?.route_duration !== null && routeDuration === null) {
                routeDuration = app.route_duration;
            }
        }

        // Falls noch keine Metriken hinterlegt sind, starte Einmalberechnung (Antwort 16)
        const currentKey = `${appId}:${routeOrigin}:${routeDestination}`;
        const hasSaved = routeDistance !== null && routeDuration !== null;
        if (!hasSaved && currentKey !== lastAutoCalcKey && routeOrigin && routeDestination && routeOrigin !== 'Current+Location' && !isCalculatingRoute) {
            lastAutoCalcKey = currentKey;
            updateRoute(false);
        }
    });

    // Mitarbeiter-Adresse (Desktop) oder GPS (Mobile)
    const userAddress = $derived.by(() => {
        if (isMobile && userLocation) return `${userLocation.lat},${userLocation.lng}`;
        const u = getAssignedUser() || pb.authStore.model;
        return u
            ? [`${u.street || ''} ${u.housenr || ''}`.trim(), `${u.zip || ''} ${u.city || ''}`.trim()].filter(Boolean).join(', ')
            : '';
    });

    /**
     * Startpunkt je nach Modus:
     * - 'destination'           → Mitarbeiter/GPS → Terminort
     * - 'client'                → Mitarbeiter/GPS → Klient
     * - 'client_to_destination' → Abholort / Klient → Terminort (Antwort 5a)
     */
    const routeOrigin = $derived.by(() => {
        if (routeTargetMode === 'client_to_destination') {
            return cleanAddressForRouting(getPickupAddress() || getClientAddress() || userAddress);
        }
        return cleanAddressForRouting(userAddress) || 'Current+Location';
    });

    // Zieladresse je nach Modus
    const routeDestination = $derived.by(() => {
        if (routeTargetMode === 'client') {
            return cleanAddressForRouting(getClientAddress() || getTargetAddress());
        }
        return cleanAddressForRouting(getTargetAddress() || getClientAddress());
    });

    const activeDestinationTitle = $derived(
        routeTargetMode === 'client' ? 'Klient' : (getTargetTitle() || 'Zielort')
    );

    const routeEmbedUrl = $derived(
        routeDestination
            ? `https://maps.google.com/maps?saddr=${encodeURIComponent(routeOrigin)}&daddr=${encodeURIComponent(routeDestination)}&output=embed`
            : ''
    );
    const googleMapsNavUrl = $derived(
        routeDestination
            ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(routeOrigin)}&destination=${encodeURIComponent(routeDestination)}`
            : ''
    );

    async function updateRoute(force = false) {
        const app = getAppointment();
        // Wenn bereits Metriken im Termin hinterlegt sind und nicht erzwungen, nutze diese (Einmalberechnung)
        if (!force && app?.route_distance !== undefined && app?.route_distance !== null && app?.route_duration !== undefined && app?.route_duration !== null) {
            routeDistance = app.route_distance;
            routeDuration = app.route_duration;
            return;
        }

        if (routeOrigin && routeDestination && routeOrigin !== 'Current+Location') {
            isCalculatingRoute = true;
            const metrics = await fetchRouteMetrics(routeOrigin, routeDestination);
            if (metrics) {
                routeDistance = metrics.distance;
                routeDuration = metrics.duration;
                // Einmalberechnung: Speichern in PocketBase (Antwort 16)
                if (app?.id) {
                    app.route_distance = metrics.distance;
                    app.route_duration = metrics.duration;
                    pb.collection('appointments').update(app.id, {
                        route_distance: metrics.distance,
                        route_duration: metrics.duration
                    }).catch(err => console.warn("[RouteState] Fehler beim Speichern in PB:", err));
                }
            }
            isCalculatingRoute = false;
        } else {
            routeDistance = null;
            routeDuration = null;
        }
    }

    function fetchGps() {
        if (typeof window === 'undefined' || !navigator?.geolocation) {
            locationError = "Geolocation nicht unterstützt.";
            return;
        }
        isLocatingUser = true;
        locationError = null;
        navigator.geolocation.getCurrentPosition(
            p => { 
                userLocation = { lat: p.coords.latitude, lng: p.coords.longitude }; 
                isLocatingUser = false; 
                updateRoute(true); 
            },
            () => { locationError = "Standort nicht verfügbar."; isLocatingUser = false; },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }

    return {
        get isMobile() { return isMobile; }, set isMobile(v) { isMobile = v; },
        get userLocation() { return userLocation; }, get isLocatingUser() { return isLocatingUser; },
        get locationError() { return locationError; }, get routeTargetMode() { return routeTargetMode; },
        set routeTargetMode(v) { routeTargetMode = v; updateRoute(true); },
        get routeDistance() { return routeDistance; }, get routeDuration() { return routeDuration; },
        get isCalculatingRoute() { return isCalculatingRoute; },
        get activeDestinationAddress() { return routeDestination; },
        get activeDestinationTitle() { return activeDestinationTitle; },
        get routeEmbedUrl() { return routeEmbedUrl; }, get googleMapsNavUrl() { return googleMapsNavUrl; },
        fetchGps, updateRoute
    };
}
