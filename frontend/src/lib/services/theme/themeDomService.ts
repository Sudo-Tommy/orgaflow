import { browser } from '$app/environment';
import type { ThemeMode } from './sunCycleCalculator';

let transitionTimeout: any = null;

export function updateThemeCssVariables(
    mode: ThemeMode,
    isDark: boolean,
    sunWarmth: number,
    sunGradient: string,
    sunHorizonGradient: string,
    sunHorizonOpacity: number,
    sunBgTint: string
): void {
    if (!browser) return;
    const root = document.documentElement;

    if (mode === 'auto') {
        root.style.setProperty('--sun-warmth', `${sunWarmth}`);
        root.style.setProperty('--sun-gradient', sunGradient);
        root.style.setProperty('--sun-horizon-gradient', sunHorizonGradient);
        root.style.setProperty('--sun-horizon-opacity', `${sunHorizonOpacity}`);
        root.style.setProperty('--sun-bg-tint', sunBgTint);
        root.style.setProperty('--app-bg', isDark ? '#020617' : (sunBgTint || '#ffffff'));
    } else {
        root.style.setProperty('--sun-warmth', '0');
        root.style.setProperty('--sun-gradient', 'none');
        root.style.setProperty('--sun-horizon-gradient', 'none');
        root.style.setProperty('--sun-horizon-opacity', '0');
        root.style.setProperty('--sun-bg-tint', mode === 'dark' ? '#020617' : '#ffffff');
        root.style.setProperty('--app-bg', mode === 'dark' ? '#020617' : '#ffffff');
    }
}

export function applyThemeDomClasses(nextIsDark: boolean, withTransition = true): void {
    if (!browser) return;

    const updateClasses = () => {
        if (nextIsDark) {
            document.documentElement.classList.add('dark', 'theme-negative');
        } else {
            document.documentElement.classList.remove('dark', 'theme-negative');
        }
    };

    // 1. Native View Transitions API: Hardware-beschleunigter, glitch-freier Snapshot-Überblendungsmodus
    if (withTransition && typeof document !== 'undefined' && 'startViewTransition' in document) {
        try {
            (document as any).startViewTransition(() => {
                updateClasses();
            });
            return;
        } catch {
            // Fallback auf sanften Klassen-Wechsel
        }
    }

    // 2. Kontrollierter CSS-Klassen-Fallback (nur auf Kern-Container ohne universellen *-Selektor)
    if (withTransition) {
        document.documentElement.classList.add('theme-transitioning');
        if (transitionTimeout) clearTimeout(transitionTimeout);
        transitionTimeout = setTimeout(() => {
            document.documentElement.classList.remove('theme-transitioning');
        }, 260);
    }

    updateClasses();
}

export function updateMetaThemeColor(nextIsDark: boolean, sunBgTint: string): void {
    if (!browser) return;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', nextIsDark ? '#020617' : (sunBgTint || '#ffffff'));
    }
}
