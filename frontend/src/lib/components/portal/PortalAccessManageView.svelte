<script lang="ts">
    import { Copy, RefreshCw, Printer, Share2, KeyRound, ExternalLink, Check, Lightbulb, Send, Smartphone, Phone } from "lucide-svelte";

    interface Props {
        accessState: any;
        copiedPin: boolean;
        copiedLink: boolean;
        onCopyPin: () => void;
        onCopyLink: () => void;
        onOpenWhatsApp: (mode?: 'mobile' | 'landline' | 'share') => void;
        onTriggerPrint: () => void;
    }

    let { accessState, copiedPin, copiedLink, onCopyPin, onCopyLink, onOpenWhatsApp, onTriggerPrint }: Props = $props();
</script>

<div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <!-- KARTE 1: PERSÖNLICHE PIN -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <KeyRound class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Persönliche PIN
                    </span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                        Aktiv
                    </span>
                </div>
                <div class="my-3 py-2 px-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span class="text-2xl sm:text-3xl font-black font-mono tracking-widest text-indigo-950 dark:text-indigo-200 select-all">
                        {accessState.portalPin || '------'}
                    </span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Wird für den klassischen Login im Browser auf dem PC zusammen mit der E-Mail genutzt.
                </p>
            </div>

            <div class="mt-4 flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onclick={onCopyPin} class="orga-button-ghost py-2 px-3 text-xs flex-1 font-bold flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer">
                    {#if copiedPin}
                        <Check class="w-4 h-4 text-emerald-600" /><span>Kopiert!</span>
                    {:else}
                        <Copy class="w-4 h-4" /><span>PIN kopieren</span>
                    {/if}
                </button>
                <button type="button" onclick={() => accessState.generateNew()} disabled={accessState.isLoading} class="orga-button-ghost py-2 px-3 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1 font-bold min-h-[44px] cursor-pointer" title="Neue PIN & neuen Link generieren">
                    <RefreshCw class="w-3.5 h-3.5 {accessState.isLoading ? 'animate-spin' : ''}" /><span>Neu</span>
                </button>
            </div>
        </div>

        <!-- KARTE 2: DIREKT-ZUGANGS-LINK & SCHNELLVERSAND -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ExternalLink class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Direkt-Zugangs-Link
                    </span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50">
                        1-Klick Login
                    </span>
                </div>
                <div class="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 break-all my-2 line-clamp-2 select-all">
                    {accessState.fullPortalUrl || 'Wird geladen...'}
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Per WhatsApp oder SMS versenden &ndash; loggt den Klienten ohne Passworteingabe direkt ein!
                </p>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div class="flex flex-col sm:flex-row gap-2">
                    <button type="button" onclick={onCopyLink} class="orga-button-ghost flex-1 py-2 px-3 text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer">
                        {#if copiedLink}
                            <Check class="w-4 h-4 text-emerald-600" /><span>Link kopiert!</span>
                        {:else}
                            <Copy class="w-4 h-4" /><span>Link kopieren</span>
                        {/if}
                    </button>

                    {#if accessState.phoneAnalysis.hasMobile}
                        <button type="button" onclick={() => onOpenWhatsApp('mobile')} class="orga-button-ghost py-2 px-3 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer" title="Direkt-Chat mit Mobilfunknummer {accessState.phoneAnalysis.mobile?.raw} starten">
                            <Smartphone class="w-3.5 h-3.5 text-emerald-600" /><span>WhatsApp (Mobil)</span>
                        </button>
                    {:else if accessState.phoneAnalysis.hasLandline}
                        <button type="button" onclick={() => onOpenWhatsApp('share')} class="orga-button-ghost py-2 px-3 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer" title="WhatsApp Empfängerauswahl öffnen">
                            <Share2 class="w-3.5 h-3.5 text-emerald-600" /><span>WhatsApp (Teilen)</span>
                        </button>
                    {:else}
                        <button type="button" onclick={() => onOpenWhatsApp('share')} class="orga-button-ghost py-2 px-3 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer" title="Direkt per WhatsApp an Kontakte teilen">
                            <Send class="w-3.5 h-3.5 text-emerald-600" /><span>WhatsApp</span>
                        </button>
                    {/if}
                </div>

                {#if accessState.phoneAnalysis.hasMobile && accessState.phoneAnalysis.hasLandline}
                    <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-0.5">
                        <span class="flex items-center gap-1">
                            <Smartphone class="w-3 h-3 text-emerald-600" /> Mobil: <strong class="text-slate-700 dark:text-slate-300 font-mono">{accessState.phoneAnalysis.mobile?.raw}</strong>
                        </span>
                        <span class="flex items-center gap-1">
                            <Phone class="w-3 h-3 text-slate-400" /> Festnetz: <span class="font-mono">{accessState.phoneAnalysis.landline?.raw}</span>
                        </span>
                    </div>
                {:else if accessState.phoneAnalysis.hasMobile}
                    <div class="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 px-1">
                        <Smartphone class="w-3 h-3" /><span>Mobilfunk erkannt: <strong class="font-mono">{accessState.phoneAnalysis.mobile?.raw}</strong></span>
                    </div>
                {:else if accessState.phoneAnalysis.hasLandline}
                    <div class="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-2 text-[11px] text-amber-800 dark:text-amber-300 flex items-start justify-between gap-2">
                        <div class="flex items-start gap-1.5">
                            <Phone class="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>Nur Festnetz (<strong class="font-mono">{accessState.phoneAnalysis.landline?.raw}</strong>) &ndash; Button öffnet WhatsApp zur Auswahl.</span>
                        </div>
                        <button type="button" onclick={() => onOpenWhatsApp('landline')} class="shrink-0 text-[10px] font-bold text-amber-700 dark:text-amber-400 underline hover:no-underline cursor-pointer ml-1">
                            Trotzdem Festnetz
                        </button>
                    </div>
                {/if}
            </div>
        </div>

        <!-- KARTE 3: QR-CODE -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center justify-between text-center transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
            <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                QR-Code Sofortzugang
            </span>
            <div class="p-2.5 bg-white rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm my-1 flex items-center justify-center">
                {#if accessState.qrDataUrl}
                    <img src={accessState.qrDataUrl} alt="Portal QR-Code" class="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-lg" />
                {:else}
                    <div class="w-24 h-24 flex items-center justify-center text-xs text-slate-400">Erstelle Code...</div>
                {/if}
            </div>
            <button type="button" onclick={onTriggerPrint} class="orga-button-primary w-full py-2 text-xs font-bold mt-2 flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer">
                <Printer class="w-3.5 h-3.5" /><span>Als Karte drucken</span>
            </button>
        </div>
    </div>

    <!-- EIGENE WUNSCH-PIN FESTLEGEN -->
    <div class="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div class="flex items-center gap-2.5 mb-2">
            <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <KeyRound class="w-4 h-4" />
            </div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">Eigene Wunsch-PIN festlegen</h3>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-2xl leading-relaxed">
            Möchten Sie eine leicht merkbare PIN für den Klienten hinterlegen? Erlaubt sind sowohl Zahlen als auch Buchstaben (mindestens 4 Zeichen, z. B. <span class="font-mono font-bold">1234</span> oder ein individuelles Kennwort).
        </p>
        <form onsubmit={(e) => { e.preventDefault(); accessState.saveCustomPin(); }} class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <input 
                type="text"
                bind:value={accessState.customPinInput}
                placeholder="z. B. 123456 oder MeinCode"
                maxlength="16"
                class="orga-input-clear py-2.5 px-4 text-sm font-mono max-w-xs min-h-[44px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                disabled={accessState.isSaving || accessState.isLoading}
            />
            <button 
                type="submit" 
                disabled={accessState.isSaving || accessState.isLoading || !accessState.customPinInput?.trim() || accessState.customPinInput.trim() === accessState.portalPin}
                class="orga-button-primary py-2.5 px-6 text-xs font-bold shrink-0 min-h-[44px] cursor-pointer disabled:opacity-50">
                {accessState.isSaving ? 'Speichert...' : 'PIN speichern'}
            </button>
        </form>
    </div>

    <!-- SENIOREN-HINWEIS -->
    <div class="bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-xs text-indigo-950 dark:text-indigo-200">
        <div class="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 shadow-xs">
            <Lightbulb class="w-5 h-5" />
        </div>
        <div class="space-y-1">
            <p class="font-bold text-sm text-indigo-900 dark:text-indigo-200">Seniorenfreundlicher Praxis-Tipp:</p>
            <p class="text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed">
                Drucken Sie die <strong>Zugangskarte</strong> mit dem Button oben aus und übergeben Sie sie dem Klienten oder dessen Angehörigen bei Ihrem nächsten Termin. 
                Ältere Menschen müssen dadurch kein langes Passwort tippen, sondern halten einfach ihr Smartphone oder Tablet an den aufgedruckten QR-Code.
            </p>
        </div>
    </div>
</div>
