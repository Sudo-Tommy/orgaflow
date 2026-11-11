<script lang="ts">
    import { Calendar as CalendarIcon, Smartphone, RefreshCw, MapPin, Loader2, AlertCircle } from "lucide-svelte";
    import type { GoogleCalendarStatus } from "$lib/services/googleCalendarService";

    interface Props {
        status: GoogleCalendarStatus;
        isConnecting: boolean;
        onConnect: () => void;
    }

    let { status, isConnecting, onConnect }: Props = $props();
</script>

<div class="space-y-6">
    <!-- Header Info -->
    <div class="text-center space-y-4">
        <div class="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 border border-blue-200/80 mx-auto flex items-center justify-center shadow-sm">
            <CalendarIcon class="w-8 h-8" />
        </div>
        <div class="max-w-md mx-auto">
            <h4 class="text-lg font-black text-neutral-900">Termine automatisch synchronisieren</h4>
            <p class="text-xs text-neutral-500 mt-1 leading-relaxed">
                Verknüpfen Sie Ihren Google Kalender, damit alle Einsätze, Besuche und Termine live auf Ihrem Smartphone und Computer erscheinen.
            </p>
        </div>
    </div>

    <!-- Feature Highlights -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-center">
            <Smartphone class="w-5 h-5 text-brand-600 mx-auto mb-1.5" />
            <p class="text-xs font-bold text-neutral-900">Überall abrufbar</p>
            <p class="text-[10px] text-neutral-500 mt-0.5">Auf Android, iPhone & PC in Ihrer Kalender-App</p>
        </div>
        <div class="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-center">
            <RefreshCw class="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
            <p class="text-xs font-bold text-neutral-900">Echtzeit-Sync</p>
            <p class="text-[10px] text-neutral-500 mt-0.5">Änderungen werden sofort automatisch übertragen</p>
        </div>
        <div class="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-center">
            <MapPin class="w-5 h-5 text-amber-600 mx-auto mb-1.5" />
            <p class="text-xs font-bold text-neutral-900">Mit Navigation</p>
            <p class="text-[10px] text-neutral-500 mt-0.5">Klienten-Adresse direkt für Google Maps verlinkt</p>
        </div>
    </div>

    <!-- Haupt-Verbindungs-Button -->
    {#if status.hasCredentials}
        <button 
            type="button" 
            onclick={onConnect}
            disabled={isConnecting}
            class="w-full py-4 px-6 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm shadow-xl shadow-neutral-900/15 flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 min-h-[44px] touch-manipulation"
        >
            {#if isConnecting}
                <Loader2 class="w-5 h-5 animate-spin" />
                <span>Öffne Google-Login...</span>
            {:else}
                <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Mit Google Kalender verknüpfen</span>
            {/if}
        </button>
    {:else}
        <div class="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <AlertCircle class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
                <p class="font-bold">Google API Anmeldedaten erforderlich</p>
                <p class="mt-0.5 text-amber-800">
                    Bevor Mitarbeiter ihren Google Kalender verbinden können, muss einmalig eine Google Cloud OAuth-Client-ID hinterlegt werden.
                </p>
            </div>
        </div>
    {/if}
</div>
