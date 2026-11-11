export type PhoneCategory = 'mobile' | 'landline' | 'unknown';

export interface ClassifiedPhone {
    raw: string;
    clean: string;
    waNumber: string; // Für wa.me, z. B. 491761234567
    international: string; // z. B. +491761234567
    category: PhoneCategory;
    isMobile: boolean;
    isLandline: boolean;
    label: string; // 'Mobilfunk', 'Festnetz', 'Telefon'
}

/**
 * Klassifiziert eine Telefonnummer präzise nach Festnetz und Mobilfunk.
 * Erkennt deutsche Mobilfunk-Vorwahlen (015x, 016x, 017x) sowie AT/CH Mobilfunk.
 */
export function classifyPhoneNumber(rawNumber?: string | null): ClassifiedPhone | null {
    if (!rawNumber || !rawNumber.trim()) return null;
    const raw = rawNumber.trim();

    // Entferne Formatierungszeichen
    const cleaned = raw.replace(/[\s\-\/\(\)\.]/g, '');
    if (!cleaned) return null;

    let normalized = cleaned;
    if (normalized.startsWith('00')) {
        normalized = '+' + normalized.slice(2);
    } else if (normalized.startsWith('0') && !normalized.startsWith('00')) {
        normalized = '+49' + normalized.slice(1);
    } else if (!normalized.startsWith('+')) {
        normalized = '+' + normalized;
    }

    const waNumber = normalized.replace('+', '');

    // Prüfung auf Mobilfunkpräfixe:
    // Deutschland: 0150-0159, 0160-0163, 0170-0179 (+4915, +4916, +4917)
    // Österreich: 0650-0699 (+436)
    // Schweiz: 075-079 (+417)
    let category: PhoneCategory = 'unknown';

    if (
        normalized.startsWith('+4915') ||
        normalized.startsWith('+4916') ||
        normalized.startsWith('+4917') ||
        normalized.startsWith('+436') ||
        normalized.startsWith('+417')
    ) {
        category = 'mobile';
    } else if (
        normalized.startsWith('+49') ||
        normalized.startsWith('+43') ||
        normalized.startsWith('+41')
    ) {
        category = 'landline';
    } else if (
        cleaned.startsWith('015') || 
        cleaned.startsWith('016') || 
        cleaned.startsWith('017')
    ) {
        category = 'mobile';
    } else if (cleaned.startsWith('0')) {
        category = 'landline';
    }

    return {
        raw,
        clean: cleaned,
        waNumber,
        international: normalized,
        category,
        isMobile: category === 'mobile',
        isLandline: category === 'landline',
        label: category === 'mobile' ? 'Mobilfunk' : (category === 'landline' ? 'Festnetz' : 'Telefon')
    };
}

export interface ClientPhoneAnalysis {
    mobile: ClassifiedPhone | null;
    landline: ClassifiedPhone | null;
    hasMobile: boolean;
    hasLandline: boolean;
    recommendedWhatsAppMode: 'direct_mobile' | 'share_landline' | 'general_share';
}

/**
 * Analysiert Festnetz- und Mobilfunkangaben eines Klienten oder Kontakts
 */
export function analyzeClientPhones(handyField?: string | null, phoneField?: string | null): ClientPhoneAnalysis {
    const handyClassified = classifyPhoneNumber(handyField);
    const phoneClassified = classifyPhoneNumber(phoneField);

    let mobile: ClassifiedPhone | null = null;
    let landline: ClassifiedPhone | null = null;

    // 1. Suche nach echter Mobilfunknummer
    if (handyClassified?.isMobile) {
        mobile = handyClassified;
    } else if (phoneClassified?.isMobile) {
        mobile = phoneClassified;
    } else if (handyClassified) {
        // Im Handy-Feld hinterlegt, behandle es als primäre Mobilnummer
        mobile = { ...handyClassified, category: 'mobile', isMobile: true, isLandline: false, label: 'Mobilfunk' };
    }

    // 2. Suche nach Festnetznummer
    if (phoneClassified?.isLandline && phoneClassified !== mobile) {
        landline = phoneClassified;
    } else if (handyClassified?.isLandline && handyClassified !== mobile) {
        landline = handyClassified;
    } else if (phoneClassified && phoneClassified !== mobile) {
        landline = phoneClassified;
    }

    const hasMobile = !!mobile;
    const hasLandline = !!landline;

    let recommendedWhatsAppMode: 'direct_mobile' | 'share_landline' | 'general_share' = 'general_share';
    if (hasMobile) {
        recommendedWhatsAppMode = 'direct_mobile';
    } else if (hasLandline) {
        recommendedWhatsAppMode = 'share_landline';
    }

    return {
        mobile,
        landline,
        hasMobile,
        hasLandline,
        recommendedWhatsAppMode
    };
}
