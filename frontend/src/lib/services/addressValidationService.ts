/**
 * Intelligente Validierung & Formatierung deutscher Adressen
 * Verhindert Tippfehler, fehlende Hausnummern und fehlerhafte GPS-Routen.
 */

export interface AddressValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    formattedAddress: string;
}

export interface ParsedAddress {
    street: string;
    housenr: string;
    zip: string;
    city: string;
}

export function validateGermanAddress(
    street: string,
    housenr: string,
    zip: string,
    city: string
): AddressValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const cleanStreet = (street || '').trim();
    const cleanHouseNr = (housenr || '').trim();
    const cleanZip = (zip || '').trim();
    const cleanCity = (city || '').trim();

    if (!cleanStreet) {
        errors.push('Straße fehlt.');
    } else if (/\d+/.test(cleanStreet) && !cleanHouseNr) {
        warnings.push('Die Straße scheint bereits eine Hausnummer zu enthalten.');
    }

    if (!cleanHouseNr && cleanStreet && !/\d+/.test(cleanStreet)) {
        warnings.push('Keine Hausnummer angegeben.');
    }

    if (!cleanZip) {
        errors.push('Postleitzahl fehlt.');
    } else if (!/^[0-9]{5}$/.test(cleanZip)) {
        errors.push('Die Postleitzahl muss genau 5 Ziffern haben.');
    }

    if (!cleanCity) {
        errors.push('Ort fehlt.');
    }

    let formattedAddress = '';
    if (cleanStreet) {
        const streetPart = cleanHouseNr ? `${cleanStreet} ${cleanHouseNr}` : cleanStreet;
        const cityPart = cleanZip && cleanCity ? `${cleanZip} ${cleanCity}` : (cleanCity || cleanZip);
        formattedAddress = [streetPart, cityPart].filter(Boolean).join(', ');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        formattedAddress
    };
}

export function areAddressesDuplicate(addressA: string, addressB: string): boolean {
    if (!addressA || !addressB) return false;
    const normalize = (addr: string) => 
        addr.toLowerCase().replace(/[\s,.-]+/g, ' ').trim();
    return normalize(addressA) === normalize(addressB);
}

/**
 * Parst eine einzeilige Adresse (z. B. aus Nominatim-Reverse-Geocoding)
 * in die 4 Teilfelder für die Stammdatenmasken.
 */
export function parseGermanAddress(address: string): ParsedAddress {
    if (!address || typeof address !== 'string') {
        return { street: '', housenr: '', zip: '', city: '' };
    }

    const clean = address.trim();
    if (!clean) {
        return { street: '', housenr: '', zip: '', city: '' };
    }

    // Koordinaten-Fallback (z. B. bei Offline-GPS "52.520008, 13.404954")
    if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(clean)) {
        return { street: clean, housenr: '', zip: '', city: '' };
    }

    let street = '';
    let housenr = '';
    let zip = '';
    let city = '';

    const parts = clean.split(',').map(p => p.trim()).filter(Boolean);

    if (parts.length >= 2) {
        const streetPart = parts[0];
        const streetMatch = streetPart.match(/^(.+?)\s+(\d+[\s\w\-\/]*)$/);
        if (streetMatch) {
            street = streetMatch[1].trim();
            housenr = streetMatch[2].trim();
        } else {
            street = streetPart;
        }

        let foundZipCity = false;
        for (let i = 1; i < parts.length; i++) {
            const p = parts[i];
            const zipMatch = p.match(/^(\d{5})\s+(.+)$/);
            if (zipMatch) {
                zip = zipMatch[1].trim();
                city = zipMatch[2].trim();
                foundZipCity = true;
                break;
            } else if (/^\d{5}$/.test(p)) {
                zip = p;
                if (i + 1 < parts.length && !/^(Deutschland|Germany)$/i.test(parts[i + 1])) {
                    city = parts[i + 1];
                }
                foundZipCity = true;
                break;
            }
        }

        if (!foundZipCity) {
            const fallbackZipMatch = parts[1].match(/^(\d{4,5})\s*(.*)$/);
            if (fallbackZipMatch && fallbackZipMatch[1]) {
                zip = fallbackZipMatch[1].trim();
                city = fallbackZipMatch[2].trim();
            } else {
                city = parts[1];
            }
        }
    } else if (parts.length === 1) {
        const fullMatch = clean.match(/^(.+?)\s+(\d+[\s\w\-\/]*)\s+(\d{5})\s+(.+)$/);
        if (fullMatch) {
            street = fullMatch[1].trim();
            housenr = fullMatch[2].trim();
            zip = fullMatch[3].trim();
            city = fullMatch[4].trim();
        } else {
            const noHouseMatch = clean.match(/^(.+?)\s+(\d{5})\s+(.+)$/);
            if (noHouseMatch) {
                street = noHouseMatch[1].trim();
                zip = noHouseMatch[2].trim();
                city = noHouseMatch[3].trim();
            } else {
                street = clean;
            }
        }
    }

    return { street, housenr, zip, city };
}

export const parseAddressString = parseGermanAddress;
