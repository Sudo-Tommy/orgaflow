<script lang="ts">
    import QRCode from 'qrcode';
    import { printElement } from '$lib/utils/print';
    import { ShieldCheck, Smartphone, Laptop, Printer, HelpCircle, Check } from 'lucide-svelte';

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
        if (!portalCode) return portalUrl || "";
        return `https://ihre-seniorenassistenz.com/portal?auth=${portalCode}`;
    });

    $effect(() => {
        if (targetUrl) {
            QRCode.toDataURL(targetUrl, {
                width: 280,
                margin: 2,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff'
                },
                errorCorrectionLevel: 'M'
            }).then((url) => {
                qrDataUrl = url;
            }).catch((err) => {
                console.error("[PortalAccessCardPrint] QR Code Error:", err);
            });
        }
    });

    let pinChars = $derived.by(() => {
        if (!portalPin) return [];
        return portalPin.split('');
    });

    export function printCard() {
        printElement('portal-access-card-print-area', {
            title: `${roleTitle} - ${clientName || 'Zugangskarte'}`,
            pageOrientation: 'portrait',
            pageMargin: '10mm'
        });
    }
</script>

<div id="portal-access-card-print-area" class="bg-white text-slate-900 font-sans p-6 sm:p-8 max-w-3xl mx-auto rounded-3xl border border-slate-200 shadow-xl print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print-avoid-break">
    
    <!-- HEADER -->
    <div class="flex items-center justify-between border-b-2 border-brand-800 pb-4 mb-5 print-avoid-break">
        <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-brand-800 text-white flex items-center justify-center font-black text-xl shadow-sm">
                <ShieldCheck class="w-7 h-7" />
            </div>
            <div>
                <h1 class="text-2xl sm:text-3xl font-black text-brand-950 tracking-tight leading-tight">{roleTitle}</h1>
                <p class="text-xs sm:text-sm font-semibold text-brand-800">{subtitle}</p>
            </div>
        </div>
        <div class="text-right">
            <span class="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-black uppercase tracking-wider">
                Gültiger Zugang
            </span>
            <p class="text-xs text-slate-400 mt-1 font-medium">Seniorenassistenz & Betreuung</p>
        </div>
    </div>

    <!-- BEGRÜSSUNG / KLIENTEN-INFO -->
    <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print-avoid-break">
        <div>
            <p class="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">{nameLabel}</p>
            <p class="text-lg sm:text-xl font-black text-slate-900">{clientName || 'Klient'}</p>
        </div>
        <div class="sm:text-right">
            <p class="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Hinterlegte E-Mail-Adresse:</p>
            <p class="text-xs sm:text-sm font-mono font-bold text-slate-800 break-all">{clientEmail || 'Nicht hinterlegt'}</p>
        </div>
    </div>

    <!-- 2 WEGE ZUM LOGIN (Print stets 2-spaltig nebeneinander) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5 print:grid-cols-2 print-avoid-break">
        
        <!-- WEG 1: QR-CODE (MOBILE & TABLET) -->
        <div class="bg-indigo-50/60 rounded-2xl p-5 border border-indigo-100 flex flex-col items-center text-center justify-between print-avoid-break">
            <div class="w-full">
                <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-black mb-2">
                    <Smartphone class="w-3.5 h-3.5" />
                    <span>Weg 1: Smartphone & Tablet</span>
                </div>
                <p class="text-xs font-bold text-slate-600 mb-3">1-Klick-Anmeldung ohne Tastatur</p>

                <div class="p-2.5 bg-white rounded-2xl border border-indigo-200 shadow-sm mb-3 flex items-center justify-center mx-auto w-fit">
                    {#if qrDataUrl}
                        <img src={qrDataUrl} alt="Portal QR-Code" class="w-32 h-32 sm:w-36 sm:h-36 object-contain rounded-lg" />
                    {:else}
                        <div class="w-32 h-32 flex items-center justify-center text-xs text-slate-400">
                            Erstelle QR-Code...
                        </div>
                    {/if}
                </div>
            </div>

            <ol class="text-left text-xs text-slate-700 space-y-1.5 font-medium px-2 w-full">
                <li class="flex items-start gap-1.5">
                    <span class="font-bold text-indigo-700 shrink-0">1.</span>
                    <span>Kamera des Handys auf den Code halten.</span>
                </li>
                <li class="flex items-start gap-1.5">
                    <span class="font-bold text-indigo-700 shrink-0">2.</span>
                    <span>Auf den Link tippen &ndash; <strong>sofort drin!</strong></span>
                </li>
                <li class="flex items-start gap-1.5 pt-1 text-slate-500">
                    <span class="font-bold text-indigo-700 shrink-0">💡</span>
                    <span>Tipp: Als Verknüpfung auf dem Startbildschirm ablegen.</span>
                </li>
            </ol>
        </div>

        <!-- WEG 2: PC & LAPTOP (E-MAIL + PIN) -->
        <div class="bg-amber-50/60 rounded-2xl p-5 border border-amber-100 flex flex-col items-center text-center justify-between print-avoid-break">
            <div class="w-full">
                <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 text-white rounded-full text-xs font-black mb-2">
                    <Laptop class="w-3.5 h-3.5" />
                    <span>Weg 2: Computer & Laptop</span>
                </div>
                <p class="text-xs font-bold text-slate-600 mb-3">Klassische Anmeldung im Browser</p>

                <div class="w-full bg-white rounded-2xl p-3.5 border border-amber-200 shadow-sm mb-3 text-left space-y-2.5">
                    <div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1. Internetadresse:</span>
                        <span class="text-xs sm:text-sm font-mono font-bold text-indigo-950 break-all select-all">ihre-seniorenassistenz.com/portal</span>
                    </div>

                    <div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">2. E-Mail-Adresse:</span>
                        <span class="text-xs sm:text-sm font-mono font-bold text-slate-800 break-all select-all">{clientEmail || 'Ihre hinterlegte E-Mail'}</span>
                    </div>

                    <div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">3. Persönliche PIN:</span>
                        <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                            {#if pinChars.length > 0}
                                {#each pinChars as char}
                                    <span class="w-7 h-8 sm:w-8 sm:h-9 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-mono font-black text-base text-slate-900 shadow-2xs">
                                        {char}
                                    </span>
                                {/each}
                            {:else}
                                <span class="font-mono text-sm text-slate-400 font-bold">Nicht festgelegt</span>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>

            <div class="text-left text-xs text-slate-700 space-y-1 font-medium px-2 w-full">
                <div class="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <Check class="w-3.5 h-3.5 shrink-0" />
                    <span>Funktioniert sofort ohne E-Mail-Warten.</span>
                </div>
                <div class="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <Check class="w-3.5 h-3.5 shrink-0" />
                    <span>PIN bleibt dauerhaft für Sie gültig.</span>
                </div>
            </div>
        </div>

    </div>

    <!-- WAS SIE IM PORTAL EINSEHEN KÖNNEN -->
    <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600 print-avoid-break">
        <div class="flex items-start gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold">
                ℹ️
            </div>
            <div>
                <p class="font-bold text-slate-900">Was Sie im Portal einsehen können:</p>
                <p class="text-slate-600">Alle anstehenden und vergangenen Betreuungstermine, Berichte und Monatsrechnungen transparent auf einen Blick.</p>
            </div>
        </div>
        <div class="text-right shrink-0">
            <p class="text-[11px] text-slate-400 font-bold uppercase">Bei Fragen oder Verlust:</p>
            <p class="font-bold text-slate-900">Ihre persönliche Seniorenassistenz</p>
        </div>
    </div>

</div>
