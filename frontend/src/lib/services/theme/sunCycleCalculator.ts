export type ThemeMode = 'auto' | 'light' | 'dark';

export type SunPhase = 
    | 'night'        // 22:00 - 05:30 (Reine, ruhige Nacht)
    | 'dawn'         // 05:30 - 06:30 (Morgengrauen / Dämmerung)
    | 'sunrise'      // 06:30 - 08:30 (Sonnenaufgang: Übergang zu Hell mit goldenem Licht)
    | 'morning'      // 08:30 - 11:30 (Vormittag: Erhellendes Tageslicht)
    | 'noon'         // 11:30 - 16:30 (Tag / Mittag: Komplett klares Weiß)
    | 'golden_hour'  // 16:30 - 18:00 (Goldene Stunde: Sanfte Nachmittagswärme)
    | 'sunset'       // 18:00 - 19:45 (Sonnenuntergang: Bernstein/Koralle zu Dunkel)
    | 'dusk';        // 19:45 - 22:00 (Abenddämmerung: Sanfter Ausklang)

export interface SunCycleState {
    phase: SunPhase;
    progress: number;
    label: string;
    icon: string;
    description: string;
    isDark: boolean;
    warmthOpacity: number;
    gradient: string;
    horizonGradient: string;
    horizonOpacity: number;
    bgTint: string;
    timeString: string;
}

/**
 * Berechnet den aktuellen Sonnenzyklus anhand der Uhrzeit in Minuten von Mitternacht (0..1439).
 */
export function calculateSunCycleFromMinutes(rawMinutes: number): SunCycleState {
    const m = ((rawMinutes % 1440) + 1440) % 1440;
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    const timeString = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    // 1. Deep Night (00:00 - 05:30) -> 0 - 330 min
    if (m < 330) {
        return {
            phase: 'night',
            progress: m / 330,
            label: 'Nacht',
            icon: '🌙',
            description: 'Ruhiger, tiefer Nachtmodus',
            isDark: true,
            warmthOpacity: 0,
            gradient: 'none',
            horizonGradient: 'none',
            horizonOpacity: 0,
            bgTint: '#020617',
            timeString
        };
    }

    // 2. Early Dawn (05:30 - 06:30) -> 330 - 390 min
    if (m < 390) {
        const progress = (m - 330) / 60;
        return {
            phase: 'dawn',
            progress,
            label: 'Morgengrauen',
            icon: '🌌',
            description: 'Erstes zartes Morgenlicht am Horizont',
            isDark: true,
            warmthOpacity: 0.04 + 0.06 * progress,
            gradient: 'radial-gradient(circle at 15% 85%, rgba(217, 119, 6, 0.18) 0%, rgba(147, 51, 234, 0.12) 40%, transparent 80%)',
            horizonGradient: 'linear-gradient(to top, rgba(217, 119, 6, 0.12) 0%, rgba(147, 51, 234, 0.06) 30%, transparent 70%)',
            horizonOpacity: 0.08 + 0.10 * progress,
            bgTint: '#040714',
            timeString
        };
    }

    // 3. Sunrise / Sonnenaufgang (06:30 - 08:30) -> 390 - 510 min
    if (m < 510) {
        const progress = (m - 390) / 120;
        const isDark = m < 420;
        const distFromPeak = Math.abs(m - 435) / 75;
        const warmthFactor = Math.max(0, 1 - distFromPeak);
        const warmthOpacity = 0.10 + 0.16 * warmthFactor;

        return {
            phase: 'sunrise',
            progress,
            label: 'Sonnenaufgang',
            icon: '🌅',
            description: 'Goldener Sonnenaufgang mit warmem Morgenlicht',
            isDark,
            warmthOpacity,
            gradient: 'radial-gradient(ellipse at 15% 10%, rgba(251, 146, 60, 0.38) 0%, rgba(245, 158, 11, 0.22) 40%, rgba(254, 215, 170, 0.12) 70%, transparent 95%)',
            horizonGradient: 'linear-gradient(to top, rgba(251, 146, 60, 0.16) 0%, rgba(245, 158, 11, 0.08) 35%, transparent 70%)',
            horizonOpacity: 0.10 + 0.15 * warmthFactor,
            bgTint: isDark ? '#080d1a' : '#fffaf3',
            timeString
        };
    }

    // 4. Morning / Vormittag (08:30 - 11:30) -> 510 - 690 min
    if (m < 690) {
        const progress = (m - 510) / 180;
        return {
            phase: 'morning',
            progress,
            label: 'Vormittag',
            icon: '🌤️',
            description: 'Heller werdendes, frisches Tageslicht',
            isDark: false,
            warmthOpacity: 0.10 * (1 - progress),
            gradient: 'radial-gradient(circle at 25% 0%, rgba(251, 146, 60, 0.18) 0%, rgba(245, 158, 11, 0.10) 40%, transparent 80%)',
            horizonGradient: 'linear-gradient(to top, rgba(251, 146, 60, 0.06) 0%, transparent 40%)',
            horizonOpacity: 0.08 * (1 - progress),
            bgTint: '#fdfcfa',
            timeString
        };
    }

    // 5. Noon / Tag & Mittagssonne (11:30 - 16:30) -> 690 - 990 min
    if (m < 990) {
        return {
            phase: 'noon',
            progress: (m - 690) / 300,
            label: 'Tag',
            icon: '☀️',
            description: 'Klares, reines Weiß für maximale Helligkeit und Übersicht',
            isDark: false,
            warmthOpacity: 0,
            gradient: 'none',
            horizonGradient: 'none',
            horizonOpacity: 0,
            bgTint: '#ffffff',
            timeString
        };
    }

    // 6. Golden Hour / Spätnachmittag (16:30 - 18:00) -> 990 - 1080 min
    if (m < 1080) {
        const progress = (m - 990) / 90;
        return {
            phase: 'golden_hour',
            progress,
            label: 'Goldene Stunde',
            icon: '🌇',
            description: 'Sanftes, bernsteinfarbenes Nachmittagslicht',
            isDark: false,
            warmthOpacity: 0.03 + 0.08 * progress,
            gradient: 'radial-gradient(circle at 80% 10%, rgba(245, 158, 11, 0.22) 0%, rgba(251, 146, 60, 0.14) 40%, transparent 85%)',
            horizonGradient: 'linear-gradient(to top, rgba(245, 158, 11, 0.08) 0%, transparent 40%)',
            horizonOpacity: 0.04 + 0.08 * progress,
            bgTint: '#fdf9f3',
            timeString
        };
    }

    // 7. Sunset / Sonnenuntergang (18:00 - 19:45) -> 1080 - 1185 min
    if (m < 1185) {
        const progress = (m - 1080) / 105;
        const isDark = m >= 1155;
        const distFromPeak = Math.abs(m - 1130) / 55;
        const warmthFactor = Math.max(0, 1 - distFromPeak);
        const warmthOpacity = 0.12 + 0.16 * warmthFactor;

        return {
            phase: 'sunset',
            progress,
            label: 'Sonnenuntergang',
            icon: '🌄',
            description: 'Malerischer Sonnenuntergang mit fließendem Übergang zur Nacht',
            isDark,
            warmthOpacity,
            gradient: 'radial-gradient(ellipse at 85% 15%, rgba(244, 63, 94, 0.36) 0%, rgba(249, 115, 22, 0.28) 35%, rgba(139, 92, 246, 0.18) 65%, transparent 95%)',
            horizonGradient: 'linear-gradient(to top, rgba(244, 63, 94, 0.18) 0%, rgba(249, 115, 22, 0.10) 35%, transparent 70%)',
            horizonOpacity: 0.12 + 0.16 * warmthFactor,
            bgTint: isDark ? '#0c0714' : '#fff5eb',
            timeString
        };
    }

    // 8. Dusk / Abenddämmerung (19:45 - 22:00) -> 1185 - 1320 min
    if (m < 1320) {
        const progress = (m - 1185) / 135;
        return {
            phase: 'dusk',
            progress,
            label: 'Abend',
            icon: '🌆',
            description: 'Dämmerung und beruhigender Übergang in die Nacht',
            isDark: true,
            warmthOpacity: 0.10 * (1 - progress),
            gradient: 'radial-gradient(circle at 75% 20%, rgba(99, 102, 241, 0.16) 0%, rgba(139, 92, 246, 0.10) 40%, transparent 80%)',
            horizonGradient: 'linear-gradient(to top, rgba(99, 102, 241, 0.08) 0%, transparent 40%)',
            horizonOpacity: 0.10 * (1 - progress),
            bgTint: '#050816',
            timeString
        };
    }

    // 9. Late Night (22:00 - 24:00) -> 1320 - 1440 min
    return {
        phase: 'night',
        progress: (m - 1320) / 120,
        label: 'Nacht',
        icon: '🌙',
        description: 'Ruhiger, tiefer Nachtmodus',
        isDark: true,
        warmthOpacity: 0,
        gradient: 'none',
        horizonGradient: 'none',
        horizonOpacity: 0,
        bgTint: '#020617',
        timeString
    };
}
