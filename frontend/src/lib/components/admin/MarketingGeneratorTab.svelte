<script lang="ts">
    import { onMount } from 'svelte';
    import { pb } from '$lib/services/pocketbase';
    import { toastStore } from '$lib/services/toastService.svelte';
    import FlyerGenerator from './FlyerGenerator.svelte';
    import PdfPreviewModal from '$lib/components/PdfPreviewModal.svelte';
    import { Sparkles, RefreshCw, Copy, Check, Download, FileText, Image, Layout, Tag, Eye } from 'lucide-svelte';

    type MarketingFormat = 'flyer' | 'poster' | 'social_sheet' | 'insert' | 'factsheet' | 'voucher';

    let activeFormat = $state<MarketingFormat>('poster');
    let isLoading = $state(false);
    let isGenerating = $state(false);
    let cachedAssets = $state<Record<MarketingFormat, any>>({} as any);
    let copySuccess = $state(false);
    let flyerSheets = $state<any[]>([]);
    let isDownloadingPdf = $state(false);
    let isLoadingPreview = $state(false);
    let pdfPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();

    // Standard-Inhalte für die 5 neuen Formate (wird durch KI erweitert/gecached)
    let formatData = $state({
        poster: {
            headline: "Liebevolle Unterstützung für Senioren & Angehörige",
            subheadline: "Selbstbestimmt im eigenen Zuhause leben",
            bulletpoints: [
                "Begleitung zum Arzt, zu Behörden & Einkäufen",
                "Hilfe beim lästigen Papierkram & Anträgen",
                "Entlastung für pflegende Angehörige",
                "Kostenübernahme über die Pflegekasse (ab Pflegegrad 1)"
            ],
            highlight_box: "131 € mtl. Entlastungsbetrag nach § 45b SGB XI sicher nutzen!",
            cta: "Jetzt kostenloses Kennenlernen vereinbaren",
            contacts: "Tommy Jenzsch (Halle): 0151 57515432 · Doreen Jenzsch (Wittenberg): 0160 7303830\ninfo@ihre-seniorenassistenz.com · www.ihre-seniorenassistenz.com"
        },
        social_sheet: [
            {
                platform: "Instagram & Facebook (Beitrag 1: Entlastungsbetrag)",
                hook: "Wussten Sie, dass Ihnen jeden Monat 131 € für Alltagsunterstützung zustehen? 💶",
                text: "Viele Pflegebedürftige und Angehörige wissen nicht: Ab Pflegegrad 1 zahlt die Pflegekasse 131 € monatlich für Entlastungsleistungen nach § 45b SGB XI!\n\nWir begleiten Sie zu Arztterminen, helfen bei Anträgen oder gehen gemeinsam spazieren. Das Beste: Wir rechnen auf Wunsch direkt mit der Kasse ab.",
                cta: "Schreiben Sie uns eine Nachricht oder buchen Sie ein Kennenlernen unter ihre-seniorenassistenz.com!",
                hashtags: "#Seniorenassistenz #HalleSaale #Wittenberg #Pflegegrad #Pflegekasse #Entlastungsbetrag #Angehörige"
            },
            {
                platform: "Instagram & Facebook (Beitrag 2: Persönliche Nähe)",
                hook: "Kein anonymes Callcenter – Bei uns zählt das persönliche Gespräch bei einer Tasse Kaffee. ☕",
                text: "Hilfe anzunehmen ist Vertrauenssache. Deshalb lernen wir uns zuerst ganz unverbindlich bei Ihnen zu Hause kennen.\n\nOb Doreen in Wittenberg oder Tommy in Halle: Wir sind an Ihrer Seite, wenn der Alltag zu schwer wird.",
                cta: "Rufen Sie uns unverbindlich an: 0345 / 213 895 20",
                hashtags: "#Alltagsbegleitung #MitHerz #Seniorenhilfe #Vertrauen #Familie"
            }
        ],
        insert: {
            title: "Ihre verlässliche Seniorenassistenz",
            subtitle: "Wir sind für Sie da – persönlich, herzlich und kompetent.",
            benefits: [
                "Begleitung zu Ärzten & Terminen",
                "Unterstützung bei Behördenpost",
                "Kostenlose Beratung zum Pflegegrad"
            ],
            footer: "Seniorenassistenz Jenzsch · Dreyhauptstr. 2, 06108 Halle · Tel: 0345 / 213 895 20"
        },
        factsheet: {
            title: "Übersicht: Finanzierung & Entlastungsleistungen (§ 45b SGB XI)",
            section1_title: "1. Was ist der Entlastungsbetrag?",
            section1_text: "Versicherte ab Pflegegrad 1 haben einen gesetzlichen Anspruch auf 131 € monatlich (1.572 € pro Jahr). Nicht genutzte Beträge können bis zum 30. Juni des Folgejahres angespart werden.",
            section2_title: "2. Wofür kann der Betrag verwendet werden?",
            section2_items: [
                "Alltagsbegleitung und Begleitdienste (Einkäufe, Arztbesuche, Kultur)",
                "Unterstützung im Haushalt und bei der Organisation",
                "Entlastung von pflegenden Angehörigen"
            ],
            section3_title: "3. Wie erfolgt die Abrechnung?",
            section3_text: "Wir verfügen über die Anerkennung nach Landesrecht Sachsen-Anhalt. Wir können die erbrachten Leistungen direkt mit allen Pflegekassen abrechnen (Abtretungserklärung), sodass Sie keine Vorkasse leisten müssen."
        },
        voucher: {
            title: "Gutschein für ein persönliches Kennenlernen",
            value: "100% Kostenfrei & Unverbindlich",
            description: "Wir laden Sie zu einem unverbindlichen Beratungs- und Kennenlerngespräch bei einer Tasse Kaffee bei Ihnen zu Hause ein.",
            code: "GUTSCHEIN-KENNENLERNEN-2026",
            validity: "Gültig für Neukunden in Halle (Saale), Wittenberg und Umgebung."
        }
    });

    onMount(async () => {
        await loadAssetsFromDb();
    });

    async function loadAssetsFromDb() {
        isLoading = true;
        try {
            const records = await pb.collection('marketing_assets').getFullList({ requestKey: null });
            for (const r of records) {
                if (r.format && r.content_json) {
                    cachedAssets[r.format as MarketingFormat] = r;
                    (formatData as any)[r.format] = r.content_json;
                }
            }
        } catch (e) {
            console.warn("[MarketingAssets] Konnte Marketing-Assets nicht abrufen:", e);
        } finally {
            isLoading = false;
        }
    }

    // Persistentes Caching in PocketBase
    async function saveAssetToDb(format: MarketingFormat, data: any) {
        try {
            const title = `Marketing-Vorlage: ${format.toUpperCase()}`;
            let existing = cachedAssets[format];

            if (existing?.id) {
                const updated = await pb.collection('marketing_assets').update(existing.id, {
                    content_json: data,
                    title
                });
                cachedAssets[format] = updated;
            } else {
                const created = await pb.collection('marketing_assets').create({
                    format,
                    title,
                    content_json: data
                });
                cachedAssets[format] = created;
            }
            toastStore.success(`Vorlage "${format.toUpperCase()}" in PocketBase gespeichert.`);
        } catch (e: any) {
            console.error("Speicherfehler:", e);
            toastStore.error("Fehler beim Speichern des Marketing-Assets.");
        }
    }

    let targetAudience = $state<'Angehörige' | 'Senioren' | 'Ärzte' | 'Allgemein'>('Angehörige');
    let lastAiCacheHit = $state<boolean | null>(null);

    // KI-Generierung mit Gemini & SHA-256 Caching
    async function triggerAiGeneration(format: MarketingFormat, forceRefresh = false) {
        isGenerating = true;
        lastAiCacheHit = null;
        try {
            // Landing-Page Texte als Kontext abrufen
            let cmsContext = "";
            try {
                const cmsRecords = await pb.collection('landing_page_content').getFullList({ requestKey: null });
                cmsContext = JSON.stringify(cmsRecords.map(r => ({ section: r.section_key, content: r.content_json })));
            } catch {}

            toastStore.info("KI optimiert das Werbemittel...");

            const payload = {
                format,
                target_audience: targetAudience,
                context: cmsContext || 'Seniorenassistenz Halle (Saale) und Lutherstadt Wittenberg, 131 € Entlastungsbetrag § 45b SGB XI',
                force_refresh: forceRefresh
            };

            // Versuche primär die SvelteKit-Serverroute, sekundär Microservice-Fallback
            let res: Response | null = null;
            try {
                res = await fetch('/api/ai/generate-marketing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (e) {
                console.warn("[Marketing AI] SvelteKit Route fehlgeschlagen, versuche Microservice:", e);
            }

            if (!res || !res.ok) {
                const microUrl = typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')
                    ? 'http://localhost:3000/api/ai/generate-marketing'
                    : '/api/emails/ai/generate-marketing';
                res = await fetch(microUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            if (data.content) {
                (formatData as any)[format] = data.content;
                lastAiCacheHit = Boolean(data.cached);

                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate(50); } catch {}
                }

                if (data.cached) {
                    toastStore.success(`⚡ Aus PocketBase-Cache geladen (${format.toUpperCase()})`);
                } else {
                    toastStore.success(`✨ Neu via KI generiert (${format.toUpperCase()} - ${targetAudience})`);
                }

                await loadAssetsFromDb();
            }
        } catch (e: any) {
            console.error("[Marketing AI Error]:", e);
            toastStore.error(`KI-Generierung fehlgeschlagen: ${e.message || e}`);
        } finally {
            isGenerating = false;
        }
    }

    function getMarketingPdfUrl(): string {
        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        return isLocal ? 'http://localhost:3000/api/emails/generate-marketing-pdf' : '/api/emails/generate-marketing-pdf';
    }

    async function requestMarketingPdf(payload: any): Promise<Response> {
        const primaryUrl = getMarketingPdfUrl();
        try {
            const res = await fetch(primaryUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) return res;
            console.warn(`Primary PDF endpoint ${primaryUrl} returned status ${res.status}, trying fallback...`);
        } catch (e) {
            console.warn(`Primary PDF endpoint ${primaryUrl} failed, trying fallback...`, e);
        }
        return fetch('/api/generate-marketing-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }

    async function downloadCurrentPdf() {
        if (activeFormat === 'social_sheet') return;
        
        isDownloadingPdf = true;
        try {
            const payload: any = {
                format: activeFormat,
                formatData
            };
            if (activeFormat === 'flyer') {
                payload.sheets = flyerSheets;
            }

            const res = await requestMarketingPdf(payload);

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Fehler bei der PDF-Generierung.");
            }

            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            let filename = 'Werbemittel.pdf';
            if (activeFormat === 'flyer') filename = 'Flyer-Seniorenassistenz-Wickelfalz.pdf';
            else if (activeFormat === 'poster') filename = 'Plakat-Aushang-A4.pdf';
            else if (activeFormat === 'factsheet') filename = 'Infoblatt-Pflegekassen-A4.pdf';
            else if (activeFormat === 'insert') filename = 'Beileger-Postkarte-A6.pdf';
            else if (activeFormat === 'voucher') filename = 'Gutschein-Kennenlernen-A6.pdf';

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            }, 100);

            toastStore.success(`${filename} erfolgreich heruntergeladen!`);
        } catch (err: any) {
            console.error("PDF Download Fehler:", err);
            toastStore.error(`PDF-Download fehlgeschlagen: ${err.message || err}`);
        } finally {
            isDownloadingPdf = false;
        }
    }

    function downloadCurrentFormatPdf() {
        return downloadCurrentPdf();
    }

    async function openPdfPreview() {
        if (activeFormat === 'social_sheet') return;
        
        isLoadingPreview = true;
        try {
            const payload: any = {
                format: activeFormat,
                formatData
            };
            if (activeFormat === 'flyer') {
                payload.sheets = flyerSheets;
            }

            const res = await requestMarketingPdf(payload);

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Fehler bei der PDF-Generierung.");
            }

            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            let filename = 'Werbemittel.pdf';
            let docTitle = 'Werbemittel';
            if (activeFormat === 'flyer') {
                filename = 'Flyer-Seniorenassistenz-Wickelfalz.pdf';
                docTitle = '6-Seiter Flyer (Wickelfalz)';
            } else if (activeFormat === 'poster') {
                filename = 'Plakat-Aushang-A4.pdf';
                docTitle = 'Aushang / Plakat (DIN A4)';
            } else if (activeFormat === 'factsheet') {
                filename = 'Infoblatt-Pflegekassen-A4.pdf';
                docTitle = 'Infoblatt Pflegekassen (DIN A4)';
            } else if (activeFormat === 'insert') {
                filename = 'Beileger-Postkarte-A6.pdf';
                docTitle = 'Beileger / Postkarte (DIN A6)';
            } else if (activeFormat === 'voucher') {
                filename = 'Gutschein-Kennenlernen-A6.pdf';
                docTitle = 'Gutschein-Karte (DIN A6)';
            }

            pdfPreviewModal?.open(blobUrl, docTitle, filename);
        } catch (err: any) {
            console.error("Vorschau Fehler:", err);
            toastStore.error(`Vorschau fehlgeschlagen: ${err.message || err}`);
        } finally {
            isLoadingPreview = false;
        }
    }

    function printCurrentFormat() {
        const styleId = 'dynamic-marketing-print-style';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }
        
        if (activeFormat === 'flyer') {
            styleEl.textContent = `
                @page { size: A4 landscape; margin: 0; }
                @media print {
                    body { margin: 0 !important; padding: 0 !important; background: white !important; }
                }
            `;
        } else if (activeFormat === 'poster' || activeFormat === 'factsheet') {
            styleEl.textContent = `
                @page { size: A4 portrait; margin: 10mm; }
                @media print {
                    body { margin: 0 !important; padding: 0 !important; background: white !important; }
                }
            `;
        } else if (activeFormat === 'insert' || activeFormat === 'voucher') {
            styleEl.textContent = `
                @page { size: auto; margin: 8mm; }
                @media print {
                    body { margin: 0 !important; padding: 0 !important; background: white !important; }
                }
            `;
        }
        
        window.print();
    }

    async function copySocialText(item: any) {
        const fullText = `${item.hook}\n\n${item.text}\n\n${item.cta}\n\n${item.hashtags}`;
        await navigator.clipboard.writeText(fullText);
        copySuccess = true;
        toastStore.success("Social-Media-Text in die Zwischenablage kopiert!");
        setTimeout(() => copySuccess = false, 3000);
    }
</script>

<div class="space-y-6">
    <!-- Format Selector Toolbar (Print-Hidden) -->
    <div class="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
        <div>
            <h2 class="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <span>🎨</span> Werbemittel- & Marketing-Studio
            </h2>
            <p class="text-xs text-neutral-500">6 Formate für Druck & Social Media mit KI-Unterstützung und echtem Vektor-PDF-Export</p>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
            <!-- Zielgruppen-Auswahl -->
            <div class="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200" title="Zielgruppe für die KI-Generierung">
                <span class="text-[10px] font-bold text-neutral-400 uppercase px-2 hidden sm:inline">Ziel:</span>
                {#each (['Angehörige', 'Senioren', 'Ärzte', 'Allgemein'] as const) as aud}
                    <button 
                        type="button"
                        onclick={() => targetAudience = aud}
                        class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all min-h-[32px] {targetAudience === aud ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-neutral-500 hover:text-neutral-700'}"
                    >
                        {aud}
                    </button>
                {/each}
            </div>

            {#if activeFormat !== 'flyer'}
                <div class="flex items-center gap-1">
                    <button 
                        type="button" 
                        onclick={() => triggerAiGeneration(activeFormat, false)}
                        class="orga-button-ghost text-xs py-2 px-3 flex items-center gap-1.5 border border-neutral-200 min-h-[40px]"
                        disabled={isGenerating}
                        title="Mit KI anpassen (nutzt Cache falls unverändert)"
                    >
                        <Sparkles class="w-3.5 h-3.5 text-amber-500" />
                        <span>{isGenerating ? 'Generiert...' : 'Mit KI anpassen'}</span>
                    </button>
                    {#if lastAiCacheHit !== null}
                        <span class="text-[10px] font-bold px-2 py-1 rounded-md {lastAiCacheHit ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                            {lastAiCacheHit ? '⚡ Cache' : '✨ Neu'}
                        </span>
                    {/if}
                </div>
            {/if}

            {#if activeFormat !== 'social_sheet'}
                <button 
                    type="button" 
                    onclick={openPdfPreview} 
                    class="orga-button-primary text-xs py-2.5 px-4 flex items-center gap-1.5 shadow-brand-600/20"
                    disabled={isLoadingPreview}
                    title="PDF-Druckvorschau im Fenster öffnen"
                >
                    {#if isLoadingPreview}
                        <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Erstelle Vorschau...</span>
                    {:else}
                        <Eye class="w-4 h-4" />
                        <span>Vorschau & Drucken</span>
                    {/if}
                </button>

                <button 
                    type="button" 
                    onclick={downloadCurrentPdf} 
                    class="orga-button-ghost text-xs py-2.5 px-4 flex items-center gap-1.5 border border-neutral-300 hover:bg-neutral-100 {isDownloadingPdf ? 'opacity-50 cursor-wait' : ''}"
                    disabled={isDownloadingPdf}
                    title="Als echte druckfertige Vektor-PDF herunterladen"
                >
                    <Download class="w-4 h-4 text-indigo-600" />
                    <span>{isDownloadingPdf ? 'Erstelle PDF...' : 'PDF herunterladen'}</span>
                </button>
            {/if}
        </div>
    </div>

    <!-- Format Tabs (Print-Hidden) -->
    <div class="print:hidden flex gap-2 overflow-x-auto pb-2 border-b border-neutral-200 custom-scrollbar">
        {#each [
            { key: 'poster', label: '🪧 Aushang / Plakat', desc: 'DIN A4 Praxis-Aushang' },
            { key: 'flyer', label: '📄 6-Seiter Flyer', desc: 'Wickelfalz DIN Lang' },
            { key: 'social_sheet', label: '📱 Social-Media Sheet', desc: 'Post-Vorlagen & Hooks' },
            { key: 'insert', label: '📬 Beileger / Postkarte', desc: 'DIN A6 Übergabekarte' },
            { key: 'factsheet', label: '📋 Infoblatt Kassen', desc: 'DIN A4 Entlastungsbetrag' },
            { key: 'voucher', label: '🎟️ Gutschein-Karte', desc: 'Kennenlern-Angebot' }
        ] as fmt}
            <button 
                type="button"
                onclick={() => activeFormat = fmt.key as MarketingFormat}
                class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex flex-col items-start
                {activeFormat === fmt.key ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'}"
            >
                <span>{fmt.label}</span>
                <span class="text-[10px] font-normal opacity-80">{fmt.desc}</span>
            </button>
        {/each}
    </div>

    <!-- CONTENT PREVIEWS & PRINT STYLES -->
    <div class="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 overflow-hidden print:p-0 print:m-0 print:border-none print:shadow-none print:bg-transparent print:overflow-visible">
        
        <!-- 1. PLAKAT / AUSHANG (DIN A4) -->
        {#if activeFormat === 'poster'}
            <div class="max-w-[210mm] mx-auto bg-white border border-neutral-300 p-8 sm:p-12 shadow-lg rounded-xl print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:h-full">
                <div class="text-center pb-8 border-b-2 border-amber-500">
                    <span class="text-xs font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">Offizielle Seniorenassistenz</span>
                    <h1 class="text-2xl sm:text-4xl font-extrabold text-neutral-900 mt-4 leading-tight">{formatData.poster.headline}</h1>
                    <p class="text-base sm:text-lg text-neutral-600 font-medium mt-2">{formatData.poster.subheadline}</p>
                </div>

                <div class="py-8 space-y-4">
                    <h2 class="text-sm font-bold uppercase tracking-wider text-neutral-500">Unsere Leistungen für Sie:</h2>
                    <div class="grid grid-cols-1 gap-3">
                        {#each formatData.poster.bulletpoints as bp}
                            <div class="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                                <span class="text-lg">✅</span>
                                <span class="text-sm sm:text-base font-bold text-neutral-800">{bp}</span>
                            </div>
                        {/each}
                    </div>
                </div>

                <div class="bg-indigo-900 text-white p-6 rounded-2xl text-center shadow-md my-6 print:bg-indigo-900 print:text-white">
                    <p class="text-xs uppercase tracking-widest text-indigo-300 font-bold mb-1">Pflegekassen-Vorteil</p>
                    <p class="text-lg sm:text-xl font-black">{formatData.poster.highlight_box}</p>
                </div>

                <div class="text-center pt-6 border-t border-neutral-200">
                    <p class="text-sm font-bold text-neutral-900">{formatData.poster.cta}</p>
                    <div class="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-200 font-mono text-xs sm:text-sm text-amber-950 whitespace-pre-line font-bold">
                        {formatData.poster.contacts}
                    </div>
                </div>
            </div>

        <!-- 2. FLYER (Wickelfalz DIN Lang 6 Seiten) -->
        {:else if activeFormat === 'flyer'}
            <div class="w-full">
                <FlyerGenerator bind:sheets={flyerSheets} />
            </div>

        <!-- 3. SOCIAL-MEDIA SHEET -->
        {:else if activeFormat === 'social_sheet'}
            <div class="space-y-6 max-w-3xl mx-auto">
                <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900">
                    💡 <strong>Social-Media-Vorlagen:</strong> Nutzen Sie den Kopier-Button, um die fertigen Texte direkt in Instagram, Facebook oder den WhatsApp-Unternehmensstatus einzufügen.
                </div>

                {#each formatData.social_sheet as item, idx}
                    <div class="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 space-y-4 shadow-sm">
                        <div class="flex items-center justify-between pb-3 border-b border-neutral-200">
                            <span class="font-bold text-xs uppercase tracking-wider text-indigo-900">{item.platform}</span>
                            <button 
                                type="button" 
                                onclick={() => copySocialText(item)}
                                class="orga-button-primary text-xs py-1.5 px-3 flex items-center gap-1"
                            >
                                <Copy class="w-3.5 h-3.5" />
                                <span>Text kopieren</span>
                            </button>
                        </div>
                        <div>
                            <span class="text-[11px] font-bold text-neutral-500 uppercase">Hookline / Überschrift</span>
                            <p class="text-sm font-bold text-neutral-900 mt-0.5">{item.hook}</p>
                        </div>
                        <div>
                            <span class="text-[11px] font-bold text-neutral-500 uppercase">Beitragstext</span>
                            <p class="text-xs text-neutral-700 whitespace-pre-line mt-0.5 leading-relaxed">{item.text}</p>
                        </div>
                        <div>
                            <span class="text-[11px] font-bold text-neutral-500 uppercase">Call To Action</span>
                            <p class="text-xs font-semibold text-amber-700 mt-0.5">{item.cta}</p>
                        </div>
                        <div class="text-[11px] text-indigo-600 font-mono">
                            {item.hashtags}
                        </div>
                    </div>
                {/each}
            </div>

        <!-- 4. BEILEGER / POSTKARTE (DIN A6) -->
        {:else if activeFormat === 'insert'}
            <div class="max-w-[148mm] mx-auto bg-white border-2 border-indigo-900 p-8 rounded-2xl shadow-md print:border-indigo-900 print:shadow-none print:m-0">
                <div class="text-center pb-4 border-b border-neutral-200">
                    <span class="text-xs font-bold text-indigo-600 uppercase tracking-widest">Seniorenassistenz Jenzsch</span>
                    <h2 class="text-xl font-bold text-neutral-900 mt-1">{formatData.insert.title}</h2>
                    <p class="text-xs text-neutral-600 mt-1">{formatData.insert.subtitle}</p>
                </div>
                <div class="py-6 space-y-2">
                    {#each formatData.insert.benefits as b}
                        <div class="text-xs font-semibold text-neutral-800 flex items-center gap-2">
                            <span>✨</span> <span>{b}</span>
                        </div>
                    {/each}
                </div>
                <div class="pt-4 border-t border-neutral-200 text-center text-[10px] text-neutral-500 font-medium">
                    {formatData.insert.footer}
                </div>
            </div>

        <!-- 5. INFOBLATT (DIN A4) -->
        {:else if activeFormat === 'factsheet'}
            <div class="max-w-[210mm] mx-auto bg-white border border-neutral-300 p-8 sm:p-12 shadow-lg rounded-xl print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none">
                <div class="flex items-center justify-between pb-6 border-b-2 border-indigo-600">
                    <div>
                        <h1 class="text-xl sm:text-2xl font-black text-neutral-900">{formatData.factsheet.title}</h1>
                        <p class="text-xs text-neutral-500 mt-1">Information für Klienten, Angehörige & Betreuer</p>
                    </div>
                    <div class="text-right text-xs font-bold text-indigo-900">
                        Seniorenassistenz Jenzsch<br>
                        Halle & Wittenberg
                    </div>
                </div>

                <div class="py-6 space-y-6 text-xs sm:text-sm leading-relaxed text-neutral-800">
                    <div>
                        <h3 class="font-bold text-base text-indigo-950 mb-1">{formatData.factsheet.section1_title}</h3>
                        <p>{formatData.factsheet.section1_text}</p>
                    </div>
                    <div>
                        <h3 class="font-bold text-base text-indigo-950 mb-2">{formatData.factsheet.section2_title}</h3>
                        <ul class="list-disc pl-5 space-y-1">
                            {#each formatData.factsheet.section2_items as it}
                                <li>{it}</li>
                            {/each}
                        </ul>
                    </div>
                    <div>
                        <h3 class="font-bold text-base text-indigo-950 mb-1">{formatData.factsheet.section3_title}</h3>
                        <p>{formatData.factsheet.section3_text}</p>
                    </div>
                </div>

                <div class="pt-6 border-t border-neutral-200 text-center text-xs text-neutral-500">
                    Seniorenassistenz Jenzsch · Dreyhauptstr. 2, 06108 Halle (Saale) · Tel: 0345 / 213 895 20 · info@ihre-seniorenassistenz.com
                </div>
            </div>

        <!-- 6. GUTSCHEIN-KARTE -->
        {:else if activeFormat === 'voucher'}
            <div class="max-w-lg mx-auto bg-linear-to-r from-amber-50 to-orange-50 border-2 border-dashed border-amber-400 p-8 rounded-3xl text-center shadow-md relative overflow-hidden print:border-amber-400 print:shadow-none print:m-0">
                <div class="text-xs font-black uppercase tracking-widest text-amber-800 mb-2">🎁 Einladung zum Kennenlernen</div>
                <h2 class="text-2xl font-black text-neutral-900 mb-2">{formatData.voucher.title}</h2>
                <div class="inline-block bg-amber-500 text-white font-black text-sm px-4 py-1.5 rounded-full my-3 shadow-md">
                    {formatData.voucher.value}
                </div>
                <p class="text-xs text-neutral-700 leading-relaxed max-w-sm mx-auto mb-6">
                    {formatData.voucher.description}
                </p>
                <div class="p-3 bg-white rounded-xl border border-amber-300 font-mono font-bold text-sm text-neutral-900 tracking-wider">
                    {formatData.voucher.code}
                </div>
                <p class="text-[10px] text-neutral-500 mt-4">{formatData.voucher.validity}</p>
            </div>
        {/if}
    </div>
</div>

<PdfPreviewModal bind:this={pdfPreviewModal} />
