<script lang="ts">
    import { Sliders } from "lucide-svelte";

    interface FeatureFlags {
        googleCalendarSync: boolean;
        clientPortalOnboarding: boolean;
        vmaSettlement: boolean;
        digitalSignatureCapture: boolean;
        autoInvoicingNotice: boolean;
        strictGoBdAudit: boolean;
    }

    let { 
        featureFlags, 
        onToggle 
    }: { 
        featureFlags: FeatureFlags; 
        onToggle: (key: keyof FeatureFlags, title: string) => void;
    } = $props();
</script>

<div class="orga-card-white p-6 flex flex-col justify-between hover:border-brand-300 dark:hover:border-brand-500/50 transition-all shadow-sm">
    <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div class="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner">
                <Sliders class="w-6 h-6" />
            </div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                Matrix aktiv
            </span>
        </div>

        <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Funktions- &amp; Feature-Flags</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Systemweite Module und Workflows für den laufenden Betrieb ein- oder ausschalten.
            </p>
        </div>

        <div class="space-y-2">
            <!-- Switch 1: Kalender Sync -->
            <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Google Kalender Sync</span>
                <button
                    type="button"
                    onclick={() => onToggle('googleCalendarSync', 'Google Kalender Sync')}
                    class="min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                    aria-label="Google Kalender Sync umschalten"
                >
                    <span class="w-10 h-6 flex items-center rounded-full p-1 transition-colors {featureFlags.googleCalendarSync ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}">
                        <span class="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform {featureFlags.googleCalendarSync ? 'translate-x-4' : 'translate-x-0'}"></span>
                    </span>
                </button>
            </div>

            <!-- Switch 2: Portal Selbsterfassung -->
            <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Klienten-Selbsterfassung</span>
                <button
                    type="button"
                    onclick={() => onToggle('clientPortalOnboarding', 'Klienten-Selbsterfassung')}
                    class="min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                    aria-label="Klienten-Selbsterfassung umschalten"
                >
                    <span class="w-10 h-6 flex items-center rounded-full p-1 transition-colors {featureFlags.clientPortalOnboarding ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}">
                        <span class="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform {featureFlags.clientPortalOnboarding ? 'translate-x-4' : 'translate-x-0'}"></span>
                    </span>
                </button>
            </div>

            <!-- Switch 3: VMA Abrechnung -->
            <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">VMA-Abrechnungsmodul</span>
                <button
                    type="button"
                    onclick={() => onToggle('vmaSettlement', 'VMA-Abrechnung')}
                    class="min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                    aria-label="VMA Abrechnung umschalten"
                >
                    <span class="w-10 h-6 flex items-center rounded-full p-1 transition-colors {featureFlags.vmaSettlement ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}">
                        <span class="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform {featureFlags.vmaSettlement ? 'translate-x-4' : 'translate-x-0'}"></span>
                    </span>
                </button>
            </div>
        </div>
    </div>

    <div class="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
        <span class="text-[11px] text-slate-400 font-medium">Änderungen werden live übernommen</span>
    </div>
</div>
