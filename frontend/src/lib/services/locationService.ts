import { Geolocation, type Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface LocationCoordinates {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    address?: string;
}

/**
 * Service für die punktuelle GPS-Standortübernahme für Fahrtenbuch und Einsätze.
 * Verhindert Akkubelastung durch gezielte Einzelabfrage ("Standort übernehmen").
 */
class LocationService {
    /**
     * Prüft oder fordert die erforderlichen Berechtigungen an.
     */
    async checkOrRequestPermissions(): Promise<boolean> {
        try {
            if (Capacitor.isNativePlatform()) {
                const status = await Geolocation.checkPermissions();
                if (status.location === 'granted') return true;
                const req = await Geolocation.requestPermissions({ permissions: ['location'] });
                return req.location === 'granted';
            }
            if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
                return true;
            }
            return false;
        } catch (error) {
            console.warn('Standortberechtigung konnte nicht abgefragt werden:', error);
            return false;
        }
    }

    /**
     * Ermittelt die aktuelle Position (Einzelmessung mit 10s Timeout).
     */
    async getCurrentPosition(): Promise<LocationCoordinates> {
        const hasPermission = await this.checkOrRequestPermissions();
        if (!hasPermission) {
            throw new Error('Der Standortzugriff wurde abgelehnt. Bitte in den Geräteeinstellungen aktivieren.');
        }

        try {
            const pos: Position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 5000
            });

            const result: LocationCoordinates = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: pos.timestamp
            };

            // Optional: Adresse über schnelles Reverse-Geocoding auflösen
            try {
                const addr = await this.reverseGeocode(result.latitude, result.longitude);
                if (addr) result.address = addr;
            } catch (e) {
                // Bei Netzwerkausfall bleibt der Koordinatensatz gültig
            }

            return result;
        } catch (error: any) {
            console.error('Fehler bei der Standortermittlung:', error);
            if (error?.message?.includes('Timeout') || error?.code === 3) {
                throw new Error('Standort-Signal zu schwach. Bitte kurz warten oder ins Freie treten.');
            }
            throw new Error('Der aktuelle Standort konnte nicht erfasst werden.');
        }
    }

    /**
     * Löst Koordinaten in Straße, Hausnummer und Ort auf (OpenStreetMap Nominatim).
     */
    async reverseGeocode(lat: number, lon: number): Promise<string | null> {
        if (typeof window === 'undefined' || !navigator.onLine) return null;
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
            const resp = await fetch(url, {
                headers: { 'Accept-Language': 'de' }
            });
            if (!resp.ok) return null;
            const data = await resp.json();
            const addr = data.address;
            if (!addr) return data.display_name || null;

            const street = addr.road || addr.pedestrian || addr.street || '';
            const houseNo = addr.house_number || '';
            const city = addr.city || addr.town || addr.village || addr.municipality || '';
            const postcode = addr.postcode || '';

            const parts = [];
            if (street) parts.push(`${street} ${houseNo}`.trim());
            if (postcode || city) parts.push(`${postcode} ${city}`.trim());

            return parts.length > 0 ? parts.join(', ') : data.display_name || null;
        } catch (e) {
            return null;
        }
    }
}

export const locationService = new LocationService();
