<script lang="ts">
    import { HardDrive, Loader2, CheckCircle2, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-svelte';

    interface Props {
        needsDriveConsent: boolean;
        driveApiDisabled?: boolean;
        googleEmail?: string;
        activationUrl?: string | null;
        consentScreenUrl?: string | null;
        isConnecting: boolean;
        isLoading?: boolean;
        onConnect: () => void;
        onRetry?: () => void;
    }

    let {
        needsDriveConsent,
        driveApiDisabled = false,
        googleEmail,
        activationUrl = 'https://console.cloud.google.com/apis/library/drive.googleapis.com?project=485464187491',
        consentScreenUrl = 'https://console.cloud.google.com/apis/credentials/consent?project=485464187491',
        isConnecting,
        isLoading = false,
        onConnect,
        onRetry
    }: Props = $props();
</script>

{#if driveApiDisabled}
    <div class="py-4 px-2 sm:px-4 space-y-4 max-w-lg mx-auto">
        <div class="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 text-left">
            <CheckCircle2 class="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div class="text-xs">
                <p class="font-bold text-emerald-900 dark:text-emerald-200">
                    OAuth2-Anmeldung erfolgreich hinterlegt &amp; gespeichert!
                </p>
                <p class="text-emerald-700 dark:text-emerald-300/90 mt-0.5">
                    Konto <strong>{googleEmail || 'Verbunden'}</strong> ist fest mit <strong>Seniorenassistenz OrgaFlow</strong> verknüpft.
                </p>
            </div>
        </div>

        <div class="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-left space-y-3">
            <div class="flex items-start gap-2.5">
                <HardDrive class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white">
                        Einmalige Google Cloud Freigabe erforderlich
                    </h4>
                    <p class="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        Ihre Anmeldung ist gespeichert, aber in Ihrem Google-Cloud-Projekt ist der Schalter für die <strong>Google Drive API</strong> noch deaktiviert. Zudem können Sie dort den Anzeigenamen von <em>„333“</em> auf <strong>„Seniorenassistenz OrgaFlow“</strong> umstellen:
                    </p>
                </div>
            </div>

            <div class="space-y-2 pt-1">
                <a
                    href={activationUrl || 'https://console.cloud.google.com/apis/library/drive.googleapis.com?project=485464187491'}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 hover:border-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between gap-2 shadow-2xs transition-colors"
                >
                    <span>1. Google Drive API in Google Cloud aktivieren („Aktivieren“ klicken)</span>
                    <ExternalLink class="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                </a>

                <a
                    href={consentScreenUrl || 'https://console.cloud.google.com/apis/credentials/consent?project=485464187491'}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2 transition-colors"
                >
                    <span>2. Optional: Name „333“ zu „Seniorenassistenz OrgaFlow“ ändern &amp; veröffentlichen</span>
                    <ExternalLink class="w-4 h-4 text-slate-400 shrink-0" />
                </a>
            </div>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            {#if onRetry}
                <button
                    type="button"
                    onclick={onRetry}
                    disabled={isLoading}
                    class="orga-button-primary min-h-[44px] px-5 py-2.5 text-xs font-bold rounded-xl inline-flex items-center gap-2 cursor-pointer touch-manipulation"
                >
                    <RefreshCw class="w-4 h-4 {isLoading ? 'animate-spin' : ''}" />
                    <span>Jetzt erneut prüfen &amp; Dateien laden</span>
                </button>
            {/if}
            <button
                type="button"
                onclick={onConnect}
                disabled={isConnecting}
                class="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer touch-manipulation"
            >
                {#if isConnecting}
                    <Loader2 class="w-3.5 h-3.5 animate-spin" />
                    <span>Verbinde...</span>
                {:else}
                    <span>Anderes Google-Konto wählen</span>
                {/if}
            </button>
        </div>
    </div>
{:else}
    <div class="py-8 text-center space-y-4 max-w-md mx-auto">
        <div class="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
            <HardDrive class="w-8 h-8" />
        </div>
        <div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold mb-2">
                <ShieldCheck class="w-3.5 h-3.5" /> Seniorenassistenz OrgaFlow
            </div>
            <h4 class="text-base font-bold text-slate-900 dark:text-white">
                {needsDriveConsent ? 'Google Drive Zugriff freischalten' : 'Mit Google Drive verbinden'}
            </h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {needsDriveConsent
                    ? `Ihr Google-Konto (${googleEmail || 'unbekannt'}) benötigt noch die Berechtigung für Google Drive Dateien.`
                    : 'Verknüpfen Sie Ihr Google-Konto mit Seniorenassistenz OrgaFlow, um Dokumente direkt aus Ihrem Drive hochzuladen.'}
            </p>
        </div>
        <button
            type="button"
            onclick={onConnect}
            disabled={isConnecting}
            class="orga-button-primary min-h-[44px] px-5 py-2.5 text-xs font-bold rounded-xl inline-flex items-center gap-2 cursor-pointer touch-manipulation"
        >
            {#if isConnecting}
                <Loader2 class="w-4 h-4 animate-spin" /> <span>Verbinde mit Seniorenassistenz OrgaFlow...</span>
            {:else}
                <HardDrive class="w-4 h-4" /> <span>{needsDriveConsent ? 'Zugriff jetzt freischalten' : 'Google Drive jetzt verknüpfen'}</span>
            {/if}
        </button>
    </div>
{/if}
