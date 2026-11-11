<script lang="ts">
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import QuickLetterHeader from "./quickLetter/QuickLetterHeader.svelte";
    import QuickLetterForm from "./quickLetter/QuickLetterForm.svelte";
    import QuickLetterPaperPreview from "./quickLetter/QuickLetterPaperPreview.svelte";
    import { DEFAULT_POSITIONS, adaptLogoDimensions } from "./quickLetter/quickLetterPositions";
    import { loadLetterPositionsFromPb, saveLetterPositionsToPb } from "./quickLetter/quickLetterPbSync";
    import { buildAndGenerateLetterPdf } from "./quickLetter/quickLetterPdfBuilder";
    import { createQuickLetterDragHandler } from "./quickLetter/quickLetterDragHelper";
    import type { PositionKey, LetterPositions, QuickLetterCompany, QuickLetterRecipient } from "./quickLetter/quickLetterTypes";
    import type { QuickLetterPreset } from "./quickLetter/quickLetterPresets";

    let dialog: HTMLDialogElement | undefined = $state();
    let previewModal: ReturnType<typeof PdfPreviewModal> | undefined = $state();
    let paperSheetEl: HTMLDivElement | undefined = $state();
    let containerWidth = $state(480);
    let previewZoom = $state(1);
    let activeMobileTab = $state<'form' | 'preview'>('form');

    let customImageBase64 = $state<string | null>(null);
    let customImageUrl = $state<string | null>(null);
    let logoScalePercent = $state<number>(100);
    let logoNaturalWidth = $state<number>(0);
    let logoNaturalHeight = $state<number>(0);

    let positions: LetterPositions = $state({
        logo: { ...DEFAULT_POSITIONS.logo },
        absender: { ...DEFAULT_POSITIONS.absender },
        anschrift: { ...DEFAULT_POSITIONS.anschrift },
        datum: { ...DEFAULT_POSITIONS.datum },
        betreff: { ...DEFAULT_POSITIONS.betreff },
        body: { ...DEFAULT_POSITIONS.body }
    });

    let selectedElementKey = $state<PositionKey | null>('logo');
    let activeDragKey = $state<PositionKey | null>(null);
    let activeGuideLines = $state<{ x: number | null; y: number | null }>({ x: null, y: null });

    let isSavingToPb = $state(false);
    let lastSyncedPbTime = $state<string | null>(null);
    let isGenerating = $state(false);
    let selectedCompanyId = $state("");

    let recipient: QuickLetterRecipient = $state({
        company: "", salutation: "Frau", firstname: "", lastname: "",
        street: "", housenr: "", zip: "", city: ""
    });
    let letterDate = $state(new Date().toISOString().split("T")[0]);
    let reference = $state("");
    let subject = $state("Information zu unseren Betreuungs- und Entlastungsleistungen");
    let salutationLine = $state("Sehr geehrte Damen und Herren,");
    let letterBody = $state("wir bedanken uns herzlich für das entgegengebrachte Vertrauen.\n\nAnbei erhalten Sie die gewünschten Unterlagen zu unseren Unterstützungs- und Betreuungsleistungen nach dem Sozialgesetzbuch (SGB XI).\n\nSollten Sie Fragen haben oder eine persönliche Beratung wünschen, stehen wir Ihnen jederzeit gern telefonisch oder per E-Mail zur Verfügung.");
    let closingLine = $state("Mit freundlichen Grüßen");
    let senderName = $state("");
    let includeFooter = $state(true);
    let includeContactUnderLogo = $state(true);

    let availableCompanies = $derived((orgaStore.company?.data as QuickLetterCompany[]) || []);
    let currentCompany = $derived.by(() => {
        if (selectedCompanyId) return availableCompanies.find(c => c.id === selectedCompanyId) || availableCompanies[0] || null;
        const userComp = pb.authStore.model?.company;
        const compId = Array.isArray(userComp) ? userComp[0] : userComp;
        return availableCompanies.find(c => c.id === compId) || availableCompanies[0] || null;
    });

    let effectiveLogoUrl = $derived.by(() => {
        if (customImageUrl) return customImageUrl;
        if (currentCompany && (currentCompany as any).logo) return pb.files.getURL(currentCompany as any, (currentCompany as any).logo);
        return null;
    });

    let returnAddressLine = $derived.by(() => {
        if (!currentCompany) return 'Seniorenassistenz';
        return [currentCompany.name, `${currentCompany.street || ''} ${currentCompany.housenr || ''}`.trim(), `${currentCompany.zip || ''} ${currentCompany.city || ''}`.trim()].filter(Boolean).join(' • ');
    });

    let addressLines = $derived.by(() => {
        const parts: string[] = [];
        if (recipient.company) parts.push(recipient.company);
        const nameLine = [recipient.salutation, recipient.firstname, recipient.lastname].filter(Boolean).join(' ');
        if (nameLine) parts.push(nameLine);
        const street = [recipient.street, recipient.housenr].filter(Boolean).join(' ');
        if (street) parts.push(street);
        const city = [recipient.zip, recipient.city].filter(Boolean).join(' ');
        if (city) parts.push(city);
        return parts;
    });

    let formattedDisplayDate = $derived.by(() => {
        const d = new Date(letterDate || Date.now());
        const str = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return currentCompany?.city ? `${currentCompany.city}, den ${str}` : str;
    });

    function adaptLogoField() {
        const dims = adaptLogoDimensions(logoNaturalWidth, logoNaturalHeight, logoScalePercent);
        positions.logo.w = dims.w;
        positions.logo.h = dims.h;
    }

    async function loadPositions() {
        try {
            const raw = localStorage.getItem('orgaflow_din5008_letter_positions');
            if (raw) {
                const parsed = JSON.parse(raw);
                for (const k of Object.keys(DEFAULT_POSITIONS) as PositionKey[]) {
                    if (parsed[k]) positions[k] = { ...DEFAULT_POSITIONS[k], ...parsed[k] };
                }
                if (typeof parsed.logoScalePercent === 'number') logoScalePercent = parsed.logoScalePercent;
            }
        } catch {}
        const pbData = await loadLetterPositionsFromPb();
        if (pbData?.positions) {
            for (const k of Object.keys(DEFAULT_POSITIONS) as PositionKey[]) {
                if (pbData.positions[k]) positions[k] = { ...DEFAULT_POSITIONS[k], ...pbData.positions[k]! };
            }
            if (pbData.logoScalePercent) logoScalePercent = pbData.logoScalePercent;
            lastSyncedPbTime = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        }
        adaptLogoField();
    }

    async function savePositions(immediate = false) {
        if (typeof window !== 'undefined') {
            try { localStorage.setItem('orgaflow_din5008_letter_positions', JSON.stringify({ ...positions, logoScalePercent })); } catch {}
        }
        isSavingToPb = true;
        const ok = await saveLetterPositionsToPb($state.snapshot(positions), logoScalePercent);
        isSavingToPb = false;
        if (ok) lastSyncedPbTime = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }

    onMount(() => { loadPositions(); });

    function resetPositions() {
        for (const k of Object.keys(DEFAULT_POSITIONS) as PositionKey[]) positions[k] = { ...DEFAULT_POSITIONS[k] };
        logoScalePercent = 100;
        adaptLogoField();
        savePositions(true);
        toastStore.info("DIN 5008 Standard-Positionen wiederhergestellt.");
    }

    function resetSinglePosition(key: PositionKey, e?: MouseEvent) {
        if (e) e.stopPropagation();
        positions[key] = { ...DEFAULT_POSITIONS[key] };
        if (key === 'logo') adaptLogoField();
        savePositions(true);
        toastStore.info(`Position "${key}" zurückgesetzt.`);
    }

    const startDrag = createQuickLetterDragHandler({
        getPaperSheetEl: () => paperSheetEl,
        positions,
        onDragStart: (key) => { selectedElementKey = key; activeDragKey = key; },
        onUpdateGuides: (guides) => { activeGuideLines = guides; },
        onDragEnd: () => { activeDragKey = null; savePositions(); }
    });

    function applyRecipient(item: any, type: string) {
        if (!item) return;
        recipient.company = item.company_name || item.name || '';
        recipient.salutation = item.salutation || (item.gender === 'female' ? 'Frau' : item.gender === 'male' ? 'Herr' : 'Herr');
        recipient.firstname = item.name_first || '';
        recipient.lastname = item.name_last || '';
        recipient.street = item.street || '';
        recipient.housenr = item.housenr || '';
        recipient.zip = item.zip || '';
        recipient.city = item.city || '';
        salutationLine = recipient.lastname ? `Sehr ${recipient.salutation === 'Herr' ? 'geehrter Herr' : 'geehrte Frau'} ${recipient.lastname},` : 'Sehr geehrte Damen und Herren,';
    }

    function applyPreset(p: QuickLetterPreset) {
        subject = p.subject; letterBody = p.body;
        toastStore.info(`Vorlage "${p.title}" geladen.`);
    }

    async function handleGeneratePdf() {
        if (!recipient.lastname && !recipient.company) { toastStore.warning("Bitte Empfänger angeben."); return; }
        if (!letterBody.trim()) { toastStore.warning("Bitte Brieftext eingeben."); return; }
        isGenerating = true;
        try {
            let logoBase64 = customImageBase64;
            if (!logoBase64 && effectiveLogoUrl) {
                try {
                    const r = await fetch(effectiveLogoUrl);
                    if (r.ok) {
                        const b = await r.blob();
                        logoBase64 = await new Promise(res => { const rd = new FileReader(); rd.onloadend = () => res(typeof rd.result === 'string' ? rd.result.split(',')[1] : null); rd.readAsDataURL(b); });
                    }
                } catch {}
            }
            const { blob, fileName } = await buildAndGenerateLetterPdf({ recipient, date: letterDate, reference, subject, body: letterBody, closingSalutation: closingLine, senderName: senderName || currentCompany?.name || '', includeContactUnderLogo, includeFooter }, positions, currentCompany, logoBase64);
            toastStore.success("Geschäftsbrief erfolgreich generiert (DIN 5008).");
            previewModal?.open(URL.createObjectURL(blob), subject || "Geschäftsbrief", fileName);
        } catch (err: any) {
            toastStore.error(err.message || "PDF-Generierung fehlgeschlagen.");
        } finally { isGenerating = false; }
    }

    export function open(prefill?: { clientId?: string; contactId?: string }) {
        const u = pb.authStore.model;
        senderName = u ? `${u.name_first || ''} ${u.name_last || ''}`.trim() : currentCompany?.name || '';
        loadPositions();
        letterDate = new Date().toISOString().split("T")[0];
        activeMobileTab = 'form';
        if (prefill?.clientId) {
            const cl = (orgaStore.clients?.data as any[])?.find(c => c.id === prefill.clientId);
            if (cl) applyRecipient(cl, 'Klient');
        } else if (prefill?.contactId) {
            const ct = (orgaStore.contacts?.data as any[])?.find(c => c.id === prefill.contactId);
            if (ct) applyRecipient(ct, 'Kontakt');
        }
        dialog?.showModal();
    }
    export function close() { dialog?.close(); }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-md w-full max-w-3xl mx-auto my-auto rounded-3xl outline-none" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-neutral-900 rounded-3xl w-full h-auto flex flex-col relative shadow-2xl border border-white/10 text-neutral-100">
        <QuickLetterHeader {activeMobileTab} onSelectMobileTab={(t) => activeMobileTab = t} onApplyPreset={applyPreset} onResetPositions={resetPositions} onClose={close} />
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 bg-neutral-900">
            <div class="lg:col-span-6 p-4 sm:p-5 border-r border-white/5 {activeMobileTab === 'form' ? 'block' : 'hidden lg:block'}">
                <QuickLetterForm bind:recipient {currentCompany} {availableCompanies} bind:selectedCompanyId {effectiveLogoUrl} {customImageUrl} bind:logoScalePercent logoBoxW={positions.logo.w} logoBoxH={positions.logo.h} bind:letterDate bind:reference bind:subject bind:salutationLine bind:letterBody bind:closingLine bind:senderName bind:includeFooter bind:includeContactUnderLogo onSelectRecipient={applyRecipient} onUploadCustomImage={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) { const r = new FileReader(); r.onload = () => { customImageUrl = r.result as string; customImageBase64 = customImageUrl.includes(',') ? customImageUrl.split(',')[1] : customImageUrl; }; r.readAsDataURL(f); } }} onRemoveCustomImage={() => { customImageUrl = null; customImageBase64 = null; }} onScaleChange={() => { adaptLogoField(); savePositions(); }} />
            </div>
            <div class="lg:col-span-6 bg-neutral-950 p-3 sm:p-4 flex flex-col items-center justify-start overflow-x-auto custom-scrollbar {activeMobileTab === 'preview' ? 'block' : 'hidden lg:flex'}">
                <QuickLetterPaperPreview bind:containerWidth bind:previewZoom {positions} {selectedElementKey} {activeDragKey} {activeGuideLines} {currentCompany} {effectiveLogoUrl} {returnAddressLine} {addressLines} {formattedDisplayDate} {reference} {subject} {salutationLine} {letterBody} {closingLine} {senderName} {includeFooter} {includeContactUnderLogo} {isSavingToPb} {lastSyncedPbTime} bind:paperSheetEl onSelectElement={(k, e) => { if (e) e.stopPropagation(); selectedElementKey = k; }} onStartDrag={startDrag} onResetSinglePosition={resetSinglePosition} onBackgroundClick={(e) => { if (e.target === paperSheetEl || (e.target as HTMLElement)?.dataset?.sheetBg === 'true') selectedElementKey = null; }} onLogoImageLoad={(e) => { const img = e.currentTarget as HTMLImageElement; if (img?.naturalWidth) { logoNaturalWidth = img.naturalWidth; logoNaturalHeight = img.naturalHeight; adaptLogoField(); } }} />
            </div>
        </div>
        <div class="px-5 py-3.5 bg-neutral-950 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 rounded-b-3xl">
            <div class="flex items-center gap-2 text-xs text-neutral-400">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>DIN 5008 • Datum auf Betreffhöhe • Elegante 7 pt Rücksendezeile • Fußzeile</span>
            </div>
            <div class="flex items-center gap-2.5 w-full sm:w-auto">
                <button type="button" onclick={close} class="flex-1 sm:flex-initial py-2.5 px-5 text-xs sm:text-sm font-bold text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-750 border border-neutral-700/80 rounded-xl min-h-[44px] cursor-pointer transition-all active:scale-95 touch-manipulation">Abbrechen</button>
                <button type="button" disabled={isGenerating} onclick={handleGeneratePdf} class="bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-600 hover:from-sky-400 text-white flex-1 sm:flex-initial py-2.5 px-6 text-xs sm:text-sm font-bold rounded-xl min-h-[44px] flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50 border border-sky-400/30 touch-manipulation">
                    {#if isGenerating}<span>⏳</span><span>Erstelle PDF...</span>{:else}<span>📄</span><span>PDF generieren & Vorschau</span>{/if}
                </button>
            </div>
        </div>
    </div>
</dialog>
<PdfPreviewModal bind:this={previewModal} />
