import { browser } from '$app/environment';
import {
    type ThemeMode,
    type SunPhase,
    type SunCycleState,
    calculateSunCycleFromMinutes
} from './theme/sunCycleCalculator';
import {
    updateThemeCssVariables,
    applyThemeDomClasses,
    updateMetaThemeColor
} from './theme/themeDomService';

export type { ThemeMode, SunPhase, SunCycleState };
export { calculateSunCycleFromMinutes };

class ThemeService {
    mode = $state<ThemeMode>('auto');
    isDark = $state<boolean>(false);
    timeOfDay = $state<'day' | 'night'>('day');

    sunPhase = $state<SunPhase>('noon');
    sunPhaseLabel = $state<string>('Tag');
    sunPhaseIcon = $state<string>('☀️');
    sunPhaseDescription = $state<string>('Klares Tageslicht');
    sunWarmth = $state<number>(0);
    sunGradient = $state<string>('none');
    sunHorizonGradient = $state<string>('none');
    sunHorizonOpacity = $state<number>(0);
    sunBgTint = $state<string>('');

    simulatedMinutes = $state<number | null>(null);

    private intervalId: any = null;
    private mediaQuery: MediaQueryList | null = null;

    constructor() {
        if (browser) {
            const storedMode = localStorage.getItem('orga_theme_mode') as ThemeMode | null;
            if (storedMode && ['auto', 'light', 'dark'].includes(storedMode)) {
                this.mode = storedMode;
            } else {
                const legacy = localStorage.getItem('theme_preference');
                if (legacy === 'dark' || legacy === 'light') {
                    this.mode = legacy;
                } else {
                    this.mode = 'auto';
                }
            }

            this.calculateCurrentSunCycle();
            this.init();
        }
    }

    public calculateSunCycle(targetMinutes?: number): SunCycleState {
        let m: number;
        if (typeof targetMinutes === 'number') {
            m = targetMinutes;
        } else if (this.simulatedMinutes !== null) {
            m = this.simulatedMinutes;
        } else {
            const now = new Date();
            m = now.getHours() * 60 + now.getMinutes();
        }
        return calculateSunCycleFromMinutes(m);
    }

    private calculateCurrentSunCycle() {
        const cycle = this.calculateSunCycle();
        this.sunPhase = cycle.phase;
        this.sunPhaseLabel = cycle.label;
        this.sunPhaseIcon = cycle.icon;
        this.sunPhaseDescription = cycle.description;
        this.timeOfDay = cycle.isDark ? 'night' : 'day';

        if (this.mode === 'auto') {
            this.sunWarmth = cycle.warmthOpacity;
            this.sunGradient = cycle.gradient;
            this.sunHorizonGradient = cycle.horizonGradient;
            this.sunHorizonOpacity = cycle.horizonOpacity;
            this.sunBgTint = cycle.bgTint;
        } else {
            this.sunWarmth = 0;
            this.sunGradient = 'none';
            this.sunHorizonGradient = 'none';
            this.sunHorizonOpacity = 0;
            this.sunBgTint = this.mode === 'dark' ? '#020617' : '#f8fafc';
        }
    }

    private determineIsDark(): boolean {
        if (this.mode === 'dark') return true;
        if (this.mode === 'light') return false;
        return this.calculateSunCycle().isDark;
    }

    init() {
        if (!browser) return;

        (window as any).themeService = this;
        this.applyTheme(false);

        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => {
            if (this.mode === 'auto') {
                const wasDark = this.isDark;
                const cycle = this.calculateSunCycle();
                const shouldBeDark = cycle.isDark;

                this.calculateCurrentSunCycle();
                this.updateVariables();

                if (wasDark !== shouldBeDark) {
                    this.applyTheme(true);
                }
            }
        }, 30000);

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.mode === 'auto') {
                this.applyTheme(true);
            }
        });

        if (window.matchMedia) {
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            try {
                this.mediaQuery.addEventListener('change', () => {
                    if (this.mode === 'auto') {
                        this.applyTheme(true);
                    }
                });
            } catch (e) {
                this.mediaQuery.addListener?.(() => {
                    if (this.mode === 'auto') {
                        this.applyTheme(true);
                    }
                });
            }
        }

        window.addEventListener('theme-changed', () => {
            this.isDark = document.documentElement.classList.contains('dark') || document.documentElement.classList.contains('theme-negative');
        });
    }

    private updateVariables() {
        updateThemeCssVariables(
            this.mode,
            this.isDark,
            this.sunWarmth,
            this.sunGradient,
            this.sunHorizonGradient,
            this.sunHorizonOpacity,
            this.sunBgTint
        );
    }

    applyTheme(withTransition = true) {
        if (!browser) return;

        this.calculateCurrentSunCycle();
        const nextIsDark = this.determineIsDark();
        this.isDark = nextIsDark;

        this.updateVariables();
        applyThemeDomClasses(nextIsDark, withTransition);
        updateMetaThemeColor(nextIsDark, this.sunBgTint);

        localStorage.setItem('orga_theme_mode', this.mode);
        localStorage.setItem('theme_preference', nextIsDark ? 'dark' : 'light');

        window.dispatchEvent(new CustomEvent('theme-changed', { 
            detail: { 
                mode: this.mode, 
                isDark: nextIsDark, 
                sunPhase: this.sunPhase,
                simulated: this.simulatedMinutes !== null 
            } 
        }));
    }

    setMode(newMode: ThemeMode) {
        this.mode = newMode;
        this.applyTheme(true);
    }

    toggle() {
        if (this.simulatedMinutes !== null) {
            this.clearSimulation();
            return;
        }

        if (this.mode === 'auto') {
            this.setMode(this.isDark ? 'light' : 'dark');
        } else if (this.mode === 'dark') {
            this.setMode('light');
        } else {
            this.setMode('auto');
        }
    }

    simulateTime(hour: number, minute: number = 0) {
        this.mode = 'auto';
        this.simulatedMinutes = hour * 60 + minute;
        this.applyTheme(true);
    }

    clearSimulation() {
        this.simulatedMinutes = null;
        this.applyTheme(true);
    }

    get isSimulating(): boolean {
        return this.simulatedMinutes !== null;
    }

    get icon(): string {
        if (this.mode === 'auto') {
            return this.sunPhaseIcon;
        }
        return this.mode === 'dark' ? '🌙' : '☀️';
    }

    get statusBadge(): string {
        if (this.mode === 'auto') {
            const simTag = this.isSimulating ? ' [Test]' : '';
            return `Auto (${this.sunPhaseLabel}${simTag})`;
        }
        return this.mode === 'dark' ? 'Nacht (Manuell)' : 'Tag (Manuell)';
    }

    get tooltipText(): string {
        if (this.mode === 'auto') {
            const simInfo = this.isSimulating 
                ? ` [Simulation: ${this.calculateSunCycle().timeString} Uhr - Klick zum Beenden]`
                : ` (${this.calculateSunCycle().timeString} Uhr - ${this.sunPhaseDescription})`;
            return `Sonnenstand-Automatik: ${this.sunPhaseLabel}${simInfo} - Klicken zum Umschalten`;
        }
        return `Modus: ${this.mode === 'dark' ? 'Nacht (Manuell)' : 'Tag (Manuell)'} - Klicken für Automatik`;
    }
}

export const themeService = new ThemeService();
