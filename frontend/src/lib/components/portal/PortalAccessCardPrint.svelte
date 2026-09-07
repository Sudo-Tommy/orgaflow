<script lang="ts">
    import QRCode from 'qrcode';
    import { onMount } from 'svelte';

    let {
        clientName = "",
        clientEmail = "",
        portalPin = "",
        portalCode = "",
        portalUrl = "",
        roleTitle = "Klienten-Portal",
        subtitle = "Ihre persönliche Zugangskarte",
        nameLabel = "Ausgestellt für:"
    }: {
        clientName: string;
        clientEmail: string;
        portalPin: string;
        portalCode: string;
        portalUrl?: string;
        roleTitle?: string;
        subtitle?: string;
        nameLabel?: string;
    } = $props();

    let qrDataUrl = $state("");

    // Ermittle die Ziel-URL für den QR-Code (stets die offizielle Produktions-Domain)
    let targetUrl = $derived.by(() => {
        if (!portalCode) return "";
        return `https://ihre-seniorenassistenz.com/portal?auth=${portalCode}`;
    });

    $effect(() => {
        if (targetUrl) {
            QRCode.toDataURL(targetUrl, {
                width: 260,
                margin: 2,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff'
                },
                errorCorrectionLevel: 'M'
            }).then((url) => {
                qrDataUrl = url;
            }).catch((err) => {
                console.error("QR Code Error:", err);
            });
        }
    });

    export function printCard() {
        window.print();
    }
</script>

<div id="portal-access-card-print-area" class="bg-white text-neutral-900 font-sans p-6 sm:p-8 max-w-3xl mx-auto rounded-3xl border border-neutral-200 shadow-xl print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none">
    
    <!-- HEADER -->
    <div class="flex items-center justify-between border-b-2 border-brand-800 pb-5 mb-6">
        <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-brand-800 text-white flex items-center justify-center font-black text-2xl shadow-sm">
                🪪
            </div>
            <div>
                <h1 class="text-2xl sm:text-3xl font-black text-brand-950 tracking-tight">{roleTitle}</h1>
                <p class="text-sm font-semibold text-brand-800">{subtitle}</p>
            </div>
        </div>
        <div class="text-right">
            <span class="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-black uppercase tracking-wider">
                Gültiger Zugang
            </span>
            <p class="text-xs text-neutral-400 mt-1 font-medium">Seniorenassistenz & Betreuung</p>
        </div>
    </div>

    <!-- BEGRÜSSUNG / KLIENTEN-INFO -->
    <div class="bg-neutral-50 rounded-2xl p-4 sm:p-5 border border-neutral-200 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
            <p class="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-0.5">{nameLabel}</p>
            <p class="text-xl font-black text-neutral-900">{clientName || 'Klient'}</p>
        </div>
        <div class="sm:text-right">
            <p class="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-0.5">Hinterlegte E-Mail-Adresse:</p>
            <p class="text-sm font-mono font-bold text-neutral-800 break-all">{clientEmail || 'Nicht hinterlegt'}</p>
        </div>
    </div>

    <!-- 2 WEGE ZUM LOGIN -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        <!-- WEG 1: QR-CODE (MOBILE & TABLET) -->
        <div class="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 flex flex-col items-center text-center">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-black mb-3">
                <span>📱</span> Weg 1: Smartphone & Tablet
            </div>
            <p class="text-xs font-bold text-neutral-600 mb-3">1-Klick-Anmeldung ohne Tastatur</p>

            <div class="p-3 bg-white rounded-2xl border border-indigo-200 shadow-md mb-3 flex items-center justify-center min-h-[160px] min-w-[160px]">
                {#if qrDataUrl}
                    <img src={qrDataUrl} alt="Portal QR-Code" class="w-40 h-40 object-contain rounded-lg" />
                {:else}
                    <div class="w-40 h-40 flex items-center justify-center text-xs text-neutral-400">
                        Erstelle QR-Code...
                    </div>
                {/if}
            </div>

            <ol class="text-left text-xs text-neutral-700 space-y-1.5 font-medium px-2">
                <li class="flex items-start gap-1.5">
                    <span class="font-bold text-indigo-700 shrink-0">1.</span>
                    <span>Kamera Ihres Smartphones auf den Code halten.</span>
                </li>
                <li class="flex items-start gap-1.5">
                    <span class="font-bold text-indigo-700 shrink-0">2.</span>
                    <span>Auf den angezeigten Link tippen &ndash; <strong>sofort angemeldet!</strong></span>
                </li>
                <li class="flex items-start gap-1.5">
                    <span class="font-bold text-indigo-700 shrink-0">💡</span>
                    <span class="text-neutral-500">Tipp: Auf dem Startbildschirm als App ablegen.</span>
                </li>
            </ol>
        </div>

        <!-- WEG 2: PC & LAPTOP (E-MAIL + PIN) -->
        <div class="bg-amber-50/50 rounded-2xl p-5 border border-amber-100 flex flex-col items-center text-center">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 text-white rounded-full text-xs font-black mb-3">
                <span>💻</span> Weg 2: Computer & Laptop
            </div>
            <p class="text-xs font-bold text-neutral-600 mb-3">Klassische Anmeldung im Browser</p>

            <div class="w-full bg-white rounded-2xl p-4 border border-amber-200 shadow-md mb-3 text-left space-y-3">
                <div>
                    <span class="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">1. Internetadresse im Browser:</span>
                    <span class="text-sm font-mono font-bold text-indigo-950 break-all select-all">ihre-seniorenassistenz.com/portal</span>
                </div>

                <div>
                    <span class="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">2. Ihre E-Mail-Adresse:</span>
                    <span class="text-sm font-mono font-bold text-neutral-800 break-all select-all">{clientEmail}</span>
                </div>

                <div>
                    <span class="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">3. Ihre persönliche PIN:</span>
                    <div class="flex items-center justify-center gap-2 py-1">
                        {#each portalPin.split('') as digit}
                            <span class="w-9 h-11 bg-neutral-100 border-2 border-neutral-300 rounded-lg flex items-center justify-center text-2xl font-black font-mono text-brand-950 shadow-inner">
                                {digit}
                            </span>
                        {/each}
                    </div>
                </div>
            </div>

            <ol class="text-left text-xs text-neutral-700 space-y-1.5 font-medium px-2">
                <li class="flex items-start gap-1.5">
                    <span class="font-bold text-amber-700 shrink-0">✓</span>
                    <span>Funktioniert ohne E-Mail-Bestätigung.</span>
                </li>
                <li class="flex items-start gap-1.5">
                    <span class="font-bold text-amber-700 shrink-0">✓</span>
                    <span>PIN bleibt dauerhaft für Sie gültig.</span>
                </li>
            </ol>
        </div>
    </div>

    <!-- HINWEISBOX -->
    <div class="bg-neutral-100/80 rounded-2xl p-4 border border-neutral-200 text-xs text-neutral-600 leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
            <span class="text-2xl shrink-0">ℹ️</span>
            <div>
                <p class="font-bold text-neutral-900">Was Sie im Portal einsehen können:</p>
                <p class="text-neutral-500">Alle anstehenden und vergangenen Betreuungstermine, Berichte und Monatsrechnungen transparent auf einen Blick.</p>
            </div>
        </div>
        <div class="shrink-0 text-right font-medium text-neutral-500 text-[11px]">
            <span>Bei Fragen oder Verlust der Karte:</span><br/>
            <span class="font-bold text-neutral-800">Ihre persönliche Seniorenassistenz</span>
        </div>
    </div>
</div>

<style>
    @media print {
        :global(body *) {
            visibility: hidden !important;
        }
        #portal-access-card-print-area,
        #portal-access-card-print-area * {
            visibility: visible !important;
        }
        #portal-access-card-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
        }
    }
</style>
