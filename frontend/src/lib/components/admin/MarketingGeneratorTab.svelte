<script lang="ts">
    import { onMount } from 'svelte';
    import { pb } from '$lib/services/pocketbase';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { triggerHaptic } from '$lib/services/hapticFeedback';
    import PdfPreviewModal from '$lib/components/PdfPreviewModal.svelte';
    import MarketingToolbar from './marketing/MarketingToolbar.svelte';
    import MarketingFormatTabs from './marketing/MarketingFormatTabs.svelte';
    import MarketingFormatPreviews from './marketing/MarketingFormatPreviews.svelte';
    import { 
        DEFAULT_FORMAT_DATA, 
        getMarketingFormatMeta,
        type MarketingFormat, 
        type TargetAudience 
    } from './marketing/marketingDefaults';
    import { requestMarketingPdf, triggerBlobDownload } from './marketing/marketingPdfService';

    let activeFormat = $state<MarketingFormat>('poster');
    let targetAudience = $state<TargetAudience>('Angehörige');
    let isLoading = $state(false);
    let isGenerating = $state(false);
    let cachedAssets = $state<Record<MarketingFormat, any>>({} as any);
    let flyerSheets = $state<any[]>([]);
    let isDownloadingPdf = $state(false);
    let isLoadingPreview = $state(false);
    let lastAiCacheHit = $state<boolean | null>(null);
    let pdfPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();

    let formatData = $state(JSON.parse(JSON.stringify(DEFAULT_FORMAT_DATA)));

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

    async function triggerAiGeneration(format: MarketingFormat, forceRefresh = false) {
        isGenerating = true;
        lastAiCacheHit = null;
        triggerHaptic('tap');
        try {
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

            let res: Response | null = null;
            try {
                res = await fetch('/api/ai/generate-marketing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (e) {
                console.warn("[Marketing AI] Route fehlgeschlagen, versuche Fallback:", e);
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
                triggerHaptic('success');

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

    async function downloadCurrentPdf() {
        if (activeFormat === 'social_sheet') return;
        isDownloadingPdf = true;
        triggerHaptic('tap');
        try {
            const payload: any = { format: activeFormat, formatData };
            if (activeFormat === 'flyer') payload.sheets = flyerSheets;

            const res = await requestMarketingPdf(payload);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Fehler bei der PDF-Generierung.");
            }

            const blob = await res.blob();
            const { filename } = getMarketingFormatMeta(activeFormat);
            triggerBlobDownload(blob, filename);
            triggerHaptic('success');
            toastStore.success(`${filename} erfolgreich heruntergeladen!`);
        } catch (err: any) {
            console.error("PDF Download Fehler:", err);
            toastStore.error(`PDF-Download fehlgeschlagen: ${err.message || err}`);
        } finally {
            isDownloadingPdf = false;
        }
    }

    async function openPdfPreview() {
        if (activeFormat === 'social_sheet') return;
        isLoadingPreview = true;
        triggerHaptic('tap');
        try {
            const payload: any = { format: activeFormat, formatData };
            if (activeFormat === 'flyer') payload.sheets = flyerSheets;

            const res = await requestMarketingPdf(payload);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Fehler bei der PDF-Generierung.");
            }

            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const { filename, docTitle } = getMarketingFormatMeta(activeFormat);
            pdfPreviewModal?.open(blobUrl, docTitle, filename);
        } catch (err: any) {
            console.error("Vorschau Fehler:", err);
            toastStore.error(`Vorschau fehlgeschlagen: ${err.message || err}`);
        } finally {
            isLoadingPreview = false;
        }
    }
</script>

<div class="space-y-6">
    <MarketingToolbar 
        {activeFormat}
        {targetAudience}
        {isGenerating}
        {isLoadingPreview}
        {isDownloadingPdf}
        {lastAiCacheHit}
        onSelectAudience={(aud) => {
            targetAudience = aud;
            triggerHaptic('tap');
        }}
        onTriggerAi={() => triggerAiGeneration(activeFormat, false)}
        onOpenPreview={openPdfPreview}
        onDownloadPdf={downloadCurrentPdf}
    />

    <MarketingFormatTabs 
        {activeFormat}
        onSelectFormat={(fmt) => {
            activeFormat = fmt;
            triggerHaptic('tap');
        }}
    />

    <MarketingFormatPreviews 
        {activeFormat}
        {formatData}
        bind:flyerSheets
    />
</div>

<PdfPreviewModal bind:this={pdfPreviewModal} />
