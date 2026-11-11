<script lang="ts">
    import { Check, RefreshCw, ExternalLink, Link2Off, Loader2 } from "lucide-svelte";
    import type { GoogleCalendarStatus } from "$lib/services/googleCalendarService";

    interface Props {
        status: GoogleCalendarStatus;
        isSyncing: boolean;
        onToggleLiveSync: () => void;
        onSyncAll: () => void;
        onDisconnect: () => void;
    }

    let { status, isSyncing, onToggleLiveSync, onSyncAll, onDisconnect }: Props = $props();

    function formatLastSync(isoStr: string | null) {
        if (!isoStr) return 'Noch nie synchronisiert';
        try {
            const d = new Date(isoStr);
            return d.toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) + ' Uhr';
        } catch {
            return isoStr;
        }
    }
</script>

<div class="space-y-6">
    <!-- Status-Karte -->
    <div class="bg-emerald-50/70 border-2 border-emerald-200/80 rounded-2xl p-5 relative overflow-hidden">
        <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-3.5">
                <div class="w-12 h-12 rounded-2xl bg-white shadow-sm border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                    <Check class="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Seniorenassistenz OrgaFlow · Verbunden
                        </span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">📅 Kalender</span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">✉️ Gmail</span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">📁 Drive</span>
                    </div>
                    <p class="text-sm font-black text-neutral-900 mt-1.5 truncate max-w-xs">{status.googleEmail || 'Google-Konto'}</p>
                </div>
            </div>
        </div>

        <div class="mt-4 pt-4 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-neutral-600 gap-2">
            <span>Letzte Synchronisation:</span>
            <span class="font-bold text-neutral-800">{formatLastSync(status.lastSync)}</span>
        </div>
    </div>

    <!-- Live Sync Schalter -->
    <div class="flex items-center justify-between p-4 rounded-2xl border border-neutral-200 bg-neutral-50/60">
        <div class="pr-4">
            <p class="text-sm font-bold text-neutral-900">Echtzeit-Synchronisation</p>
            <p class="text-xs text-neutral-500 mt-0.5">Termine beim Anlegen, Ändern oder Löschen in Seniorenassistenz OrgaFlow sofort übertragen.</p>
        </div>
        <button 
            type="button" 
            role="switch" 
            aria-checked={status.syncEnabled}
            aria-label="Echtzeit-Synchronisation umschalten"
            onclick={onToggleLiveSync}
            class="w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 shadow-inner min-h-[44px] min-w-[44px] flex items-center touch-manipulation {status.syncEnabled ? 'bg-emerald-600' : 'bg-neutral-300'}"
        >
            <span class="w-5 h-5 rounded-full bg-white absolute top-0.5 left-0.5 transition-transform shadow-md {status.syncEnabled ? 'translate-x-6' : 'translate-x-0'}"></span>
        </button>
    </div>

    <!-- Haupt-Aktionen -->
    <div class="space-y-2.5">
        <button 
            type="button" 
            onclick={onSyncAll}
            disabled={isSyncing}
            class="orga-button-primary w-full py-3.5 justify-center text-sm shadow-brand-900/15 cursor-pointer disabled:opacity-60 min-h-[44px] touch-manipulation"
        >
            {#if isSyncing}
                <Loader2 class="w-4 h-4 animate-spin" />
                <span>Synchronisiere Termine...</span>
            {:else}
                <RefreshCw class="w-4 h-4" />
                <span>Jetzt alle anstehenden Termine synchronisieren</span>
            {/if}
        </button>

        <div class="grid grid-cols-2 gap-2.5">
            <a 
                href="https://calendar.google.com" 
                target="_blank" 
                rel="noreferrer"
                class="orga-button-ghost justify-center py-2.5 text-xs text-neutral-700 hover:text-neutral-900 inline-flex items-center gap-1.5 min-h-[44px] touch-manipulation"
            >
                <ExternalLink class="w-3.5 h-3.5" />
                <span>Google Kalender öffnen</span>
            </a>

            <button 
                type="button" 
                onclick={onDisconnect}
                class="orga-button-ghost justify-center py-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 inline-flex items-center gap-1.5 cursor-pointer min-h-[44px] touch-manipulation"
            >
                <Link2Off class="w-3.5 h-3.5" />
                <span>Verbindung trennen</span>
            </button>
        </div>
    </div>
</div>
