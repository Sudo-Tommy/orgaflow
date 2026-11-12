import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin, Location } from '@capacitor-community/background-geolocation';
import { pb } from '$lib/services/pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { locationService } from '$lib/services/locationService';
import { toastStore } from '$lib/services/toastService.svelte';
import { connectionManager } from '$lib/services/connectionManager.svelte';
import { queueOfflineMutation } from '$lib/services/offlineDb';
import { haversineDistanceMeters } from './geoUtils';
import { checkGeofenceArrival, triggerArrivalHint } from './arrivalWatcher';
import type { ClientRecord } from '$lib/types/pocketbase';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export interface CompletedTripSummary {
    km: number;
    startedAt: string;
    endedAt: string;
    startAddress: string;
    endAddress: string;
    appointmentId?: string;
    clientId?: string;
}

class TripRecorderService {
    isRecording = $state(false);
    distanceMeters = $state(0);
    startedAtMs = $state(0);
    appointmentId = $state<string | undefined>(undefined);
    clientId = $state<string | undefined>(undefined);
    arrivalTriggered = $state(false);
    lastCompletedTrip = $state<CompletedTripSummary | null>(null);

    private watcherId: string | null = null;
    private webWatchId: number | null = null;
    private lastLat: number | null = null;
    private lastLng: number | null = null;
    private startAddress = '';

    get kilometers(): number {
        return Math.round((this.distanceMeters / 1000) * 10) / 10;
    }

    async startTrip(options?: { appointmentId?: string; clientId?: string }): Promise<boolean> {
        if (this.isRecording) return true;

        this.distanceMeters = 0;
        this.startedAtMs = Date.now();
        this.appointmentId = options?.appointmentId;
        this.clientId = options?.clientId;
        this.arrivalTriggered = false;
        this.lastLat = null;
        this.lastLng = null;
        this.startAddress = '';

        try {
            if (Capacitor.isNativePlatform()) {
                this.watcherId = await BackgroundGeolocation.addWatcher(
                    {
                        backgroundTitle: 'Fahrtaufzeichnung läuft',
                        backgroundMessage: 'Kilometer für Ihr Fahrtenbuch werden erfasst.',
                        requestPermissions: true,
                        stale: false,
                        distanceFilter: 25
                    },
                    (pos, err) => {
                        if (err) {
                            if (err.code === 'NOT_AUTHORIZED') {
                                toastStore.warning('Standortberechtigung „Immer zulassen“ erforderlich.');
                            }
                            return;
                        }
                        if (pos) this.handlePoint(pos.latitude, pos.longitude, pos.accuracy);
                    }
                );
            } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
                this.webWatchId = navigator.geolocation.watchPosition(
                    (pos) => this.handlePoint(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
                    () => {},
                    { enableHighAccuracy: true, maximumAge: 5000 }
                );
            } else {
                toastStore.error('Standortermittlung wird auf diesem Gerät nicht unterstützt.');
                return false;
            }

            this.isRecording = true;
            toastStore.success('Fahrtaufzeichnung gestartet.');
            return true;
        } catch (e: any) {
            toastStore.error(e?.message || 'Fahrt konnte nicht gestartet werden.');
            return false;
        }
    }

    private handlePoint(lat: number, lng: number, accuracy: number) {
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || accuracy > 50) return;

        if (this.lastLat === null || this.lastLng === null) {
            this.lastLat = lat;
            this.lastLng = lng;
            locationService.reverseGeocode(lat, lng).then((addr) => {
                if (addr && !this.startAddress) this.startAddress = addr;
            }).catch(() => {});
        } else {
            const step = haversineDistanceMeters(this.lastLat, this.lastLng, lat, lng);
            if (step >= 15 && step <= 2000) {
                this.distanceMeters += step;
                this.lastLat = lat;
                this.lastLng = lng;
            }
        }

        if (!this.arrivalTriggered && this.clientId) {
            const client = orgaStore.clients?.getById(this.clientId) as ClientRecord | undefined;
            const check = checkGeofenceArrival(lat, lng, client);
            if (check.arrived) {
                this.arrivalTriggered = true;
                triggerArrivalHint(check.clientName, this.appointmentId);
            }
        }
    }

    async stopTrip(saveToDatabase = true): Promise<CompletedTripSummary | null> {
        if (!this.isRecording) return null;

        if (this.watcherId && Capacitor.isNativePlatform()) {
            await BackgroundGeolocation.removeWatcher({ id: this.watcherId }).catch(() => {});
            this.watcherId = null;
        }
        if (this.webWatchId !== null && typeof navigator !== 'undefined') {
            navigator.geolocation.clearWatch(this.webWatchId);
            this.webWatchId = null;
        }
        this.isRecording = false;

        let endAddress = '';
        if (this.lastLat !== null && this.lastLng !== null) {
            endAddress = (await locationService.reverseGeocode(this.lastLat, this.lastLng).catch(() => null)) || '';
        }

        const summary: CompletedTripSummary = {
            km: this.kilometers,
            startedAt: new Date(this.startedAtMs).toISOString(),
            endedAt: new Date().toISOString(),
            startAddress: this.startAddress || 'Startpunkt',
            endAddress: endAddress || 'Zielpunkt',
            appointmentId: this.appointmentId,
            clientId: this.clientId
        };
        this.lastCompletedTrip = summary;

        if (saveToDatabase && summary.km > 0) {
            const payload = {
                type: 'Fahrt (GPS)',
                km: summary.km,
                date: summary.startedAt,
                notes: `${summary.startAddress} → ${summary.endAddress}`
            };
            try {
                if (!connectionManager.isOnline) {
                    await queueOfflineMutation('drive_records', 'create', undefined, payload, {
                        label: 'GPS-Fahrt',
                        parentLink: summary.appointmentId
                            ? { parentCollection: 'appointments', parentId: summary.appointmentId, parentField: 'drive_record' }
                            : undefined
                    });
                    toastStore.info(`Fahrt (${summary.km} km) offline gespeichert.`);
                } else {
                    const dr = await pb.collection('drive_records').create(payload);
                    if (summary.appointmentId) {
                        const app = await pb.collection('appointments').getOne(summary.appointmentId, { requestKey: null });
                        const existing = Array.isArray(app.drive_record) ? app.drive_record : [];
                        await pb.collection('appointments').update(summary.appointmentId, { drive_record: [...existing, dr.id] });
                    }
                    toastStore.success(`Fahrt beendet: ${summary.km} km im Fahrtenbuch gespeichert.`);
                }
            } catch {
                await queueOfflineMutation('drive_records', 'create', undefined, payload, { label: 'GPS-Fahrt' });
                toastStore.info(`Fahrt (${summary.km} km) lokal vorgemerkt.`);
            }
        } else {
            toastStore.info(`Fahrt beendet (${summary.km} km).`);
        }
        return summary;
    }

    async openLocationSettings(): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        await BackgroundGeolocation.openSettings().catch(() => {});
    }
}

export const tripRecorder = new TripRecorderService();
