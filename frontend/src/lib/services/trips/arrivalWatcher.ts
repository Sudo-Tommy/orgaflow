import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { haversineDistanceMeters } from './geoUtils';
import { toastStore } from '$lib/services/toastService.svelte';
import type { ClientRecord } from '$lib/types/pocketbase';

export interface ArrivalCheckResult {
    arrived: boolean;
    distanceMeters?: number;
    radiusMeters: number;
    clientName: string;
}

/**
 * Reine Prüfung, ob eine Position innerhalb des beim Klienten eingestellten Ankunftsradius liegt.
 */
export function checkGeofenceArrival(
    lat: number,
    lng: number,
    client?: Partial<ClientRecord> | null
): ArrivalCheckResult {
    const radius = Math.max(30, Number(client?.geofence_radius) || 150);
    const clientName = client ? `${client.name_first || ''} ${client.name_last || ''}`.trim() || 'Klient' : 'Klient';

    if (typeof client?.geo_lat !== 'number' || typeof client?.geo_lng !== 'number') {
        return { arrived: false, radiusMeters: radius, clientName };
    }

    const distanceMeters = Math.round(haversineDistanceMeters(lat, lng, client.geo_lat, client.geo_lng));
    return {
        arrived: distanceMeters <= radius,
        distanceMeters,
        radiusMeters: radius,
        clientName
    };
}

export async function triggerArrivalHint(clientName: string, appointmentId?: string): Promise<void> {
    toastStore.info(`Angekommen bei ${clientName} – Fahrt beenden?`);
    if (!Capacitor.isNativePlatform()) return;

    try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') return;
        await LocalNotifications.schedule({
            notifications: [{
                id: 888001,
                title: `Angekommen bei ${clientName}`,
                body: 'Tippen, um die Fahrt zu beenden und Kilometer zu übernehmen.',
                channelId: 'orgaflow_reminders',
                schedule: { at: new Date(Date.now() + 500), allowWhileIdle: true },
                extra: { route: appointmentId ? `/calendar?appointment=${appointmentId}` : '/vma' }
            }]
        });
    } catch {
        // Unkritisch
    }
}
