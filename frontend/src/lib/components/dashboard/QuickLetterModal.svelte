<script lang="ts">
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import { generatePdfBlob } from "$lib/services/pdfGeneratorService";
    import { Mail, FileText, User, Building, Calendar, X, Sparkles, Printer, Check, Eye, Edit3, Move, RotateCcw, ChevronDown, Upload, Image as ImageIcon, Trash2, ZoomIn, ZoomOut } from "lucide-svelte";

    let dialog: HTMLDialogElement | undefined = $state();
    let previewModal: ReturnType<typeof PdfPreviewModal> | undefined = $state();
    let paperSheetEl: HTMLDivElement | undefined = $state();
    let fileInputEl: HTMLInputElement | undefined = $state();
    let containerWidth = $state(480);
    let previewZoom = $state(1);

    // Ansichtsmodus für kleine Bildschirme (Formular vs. Live-Papier)
    let activeMobileTab = $state<'form' | 'preview'>('form');

    type PositionKey = 'logo' | 'absender' | 'anschrift' | 'datum' | 'betreff' | 'body';

    // Standard DIN 5008 Form B Koordinaten (in 794 x 1123 PDF Pixelraum)
    const DEFAULT_POSITIONS: Record<PositionKey, { x: number; y: number; w: number; h: number }> = {
        logo: { x: 480, y: 35, w: 254, h: 75 },
        absender: { x: 60, y: 143, w: 360, h: 18 },
        anschrift: { x: 60, y: 165, w: 340, h: 90 },
        datum: { x: 480, y: 175, w: 254, h: 50 },
        betreff: { x: 60, y: 280, w: 674, h: 32 },
        body: { x: 60, y: 330, w: 674, h: 380 }
    };

    const STORAGE_KEY = 'orgaflow_din5008_letter_positions';

    // Bild-Zustand & automatische Feld-Anpassung
    let customImageBase64 = $state<string | null>(null);
    let customImageUrl = $state<string | null>(null);
    let logoScalePercent = $state<number>(100);
    let logoNaturalWidth = $state<number>(0);
    let logoNaturalHeight = $state<number>(0);

    // Reaktive Positionen aller Elemente
    let positions: Record<PositionKey, { x: number; y: number; w: number; h: number }> = $state({
        logo: { ...DEFAULT_POSITIONS.logo },
        absender: { ...DEFAULT_POSITIONS.absender },
        anschrift: { ...DEFAULT_POSITIONS.anschrift },
        datum: { ...DEFAULT_POSITIONS.datum },
        betreff: { ...DEFAULT_POSITIONS.betreff },
        body: { ...DEFAULT_POSITIONS.body }
    });

    let activeDragKey = $state<PositionKey | null>(null);
    let activeGuideLines = $state<{ x: number | null; y: number | null }>({ x: null, y: null });

    // Skalierungsfaktor für das interaktive Blatt (1 PDF-Pixel = scale Preview-Pixel)
    let baseSheetWidth = $derived(Math.max(280, Math.min(containerWidth > 40 ? containerWidth - 32 : 480, 500)));
    let paperSheetWidth = $derived(Math.round(baseSheetWidth * previewZoom));
    let scale = $derived(paperSheetWidth > 0 ? paperSheetWidth / 794 : 0.6);
    let sheetHeight = $derived(Math.round(1123 * scale));

    const SNAP_THRESHOLD = 8; // Snap-Schwelle in PDF-Koordinaten (magnetisches Einrasten)
    const GRID_STEP = 10;     // Raster-Schrittweite

    // Intelligente Einrast- & Docking-Berechnung für Kanten, Mitten und Raster
    function calculateSnapping(
        currentKey: PositionKey,
        rawX: number,
        rawY: number,
        w: number,
        h: number
    ): { x: number; y: number; guideX: number | null; guideY: number | null } {
        let bestX = rawX;
        let bestY = rawY;
        let guideX: number | null = null;
        let guideY: number | null = null;
        let minDiffX = SNAP_THRESHOLD + 1;
        let minDiffY = SNAP_THRESHOLD + 1;

        // 1. Horizontale Ziele (X-Achse: Kanten & Mitten aller anderen Elemente + Seitenränder)
        const targetXList: number[] = [60, 397, 734];
        for (const [key, pos] of Object.entries(positions) as Array<[PositionKey, { x: number; y: number; w: number; h: number }]>) {
            if (key === currentKey) continue;
            targetXList.push(pos.x);                         // Linke Kante
            targetXList.push(pos.x + pos.w);                 // Rechte Kante
            targetXList.push(Math.round(pos.x + pos.w / 2)); // Horizontale Mitte
        }

        for (const targetX of targetXList) {
            // A. Linke Kante dockt an targetX
            const diffLeft = Math.abs(rawX - targetX);
            if (diffLeft < minDiffX) {
                minDiffX = diffLeft;
                bestX = targetX;
                guideX = targetX;
            }
            // B. Rechte Kante dockt an targetX
            const diffRight = Math.abs((rawX + w) - targetX);
            if (diffRight < minDiffX) {
                minDiffX = diffRight;
                bestX = targetX - w;
                guideX = targetX;
            }
            // C. Mitte dockt an targetX
            const diffCenter = Math.abs((rawX + w / 2) - targetX);
            if (diffCenter < minDiffX) {
                minDiffX = diffCenter;
                bestX = Math.round(targetX - w / 2);
                guideX = targetX;
            }
        }

        // Falls kein Element-Andocken gegriffen hat: An Raster einrasten
        if (minDiffX > SNAP_THRESHOLD) {
            const gridX = Math.round(rawX / GRID_STEP) * GRID_STEP;
            if (Math.abs(rawX - gridX) <= 4) {
                bestX = gridX;
            }
        }

        // 2. Vertikale Ziele (Y-Achse: Kanten & Mitten aller anderen Elemente + Standard-Höhen)
        const targetYList: number[] = [35, 143, 165, 175, 280, 330];
        for (const [key, pos] of Object.entries(positions) as Array<[PositionKey, { x: number; y: number; w: number; h: number }]>) {
            if (key === currentKey) continue;
            targetYList.push(pos.y);                         // Obere Kante
            targetYList.push(pos.y + pos.h);                 // Untere Kante
            targetYList.push(Math.round(pos.y + pos.h / 2)); // Vertikale Mitte
        }

        for (const targetY of targetYList) {
            // A. Obere Kante dockt an targetY
            const diffTop = Math.abs(rawY - targetY);
            if (diffTop < minDiffY) {
                minDiffY = diffTop;
                bestY = targetY;
                guideY = targetY;
            }
            // B. Untere Kante dockt an targetY
            const diffBottom = Math.abs((rawY + h) - targetY);
            if (diffBottom < minDiffY) {
                minDiffY = diffBottom;
                bestY = targetY - h;
                guideY = targetY;
            }
            // C. Mitte dockt an targetY
            const diffCenter = Math.abs((rawY + h / 2) - targetY);
            if (diffCenter < minDiffY) {
                minDiffY = diffCenter;
                bestY = Math.round(targetY - h / 2);
                guideY = targetY;
            }
        }

        // Falls kein Element-Andocken gegriffen hat: An Raster einrasten
        if (minDiffY > SNAP_THRESHOLD) {
            const gridY = Math.round(rawY / GRID_STEP) * GRID_STEP;
            if (Math.abs(rawY - gridY) <= 4) {
                bestY = gridY;
            }
        }

        return {
            x: Math.round(Math.max(10, Math.min(794 - w - 10, bestX))),
            y: Math.round(Math.max(10, Math.min(1123 - h - 10, bestY))),
            guideX,
            guideY
        };
    }

    // Touch- & Pinch-to-Zoom Ergonomie für mobile Bildschirme
    let initialPinchDist = 0;
    let initialZoom = 1;

    function getTouchDistance(touches: TouchList): number {
        const t1 = touches[0];
        const t2 = touches[1];
        return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    }

    function handleSheetTouchStart(e: TouchEvent) {
        if (e.touches.length >= 2) {
            // Multi-Touch erkannt: Drag sofort abbrechen & Zoom initialisieren
            activeDragKey = null;
            activeGuideLines = { x: null, y: null };
            initialPinchDist = getTouchDistance(e.touches);
            initialZoom = previewZoom;
        }
    }

    function handleSheetTouchMove(e: TouchEvent) {
        if (e.touches.length >= 2 && initialPinchDist > 0) {
            e.preventDefault();
            const currentDist = getTouchDistance(e.touches);
            const factor = currentDist / initialPinchDist;
            previewZoom = Math.max(0.65, Math.min(2.5, +(initialZoom * factor).toFixed(2)));
        }
    }

    function handleSheetTouchEnd(e: TouchEvent) {
        if (e.touches.length < 2) {
            initialPinchDist = 0;
        }
    }

    const MAX_LOGO_BOX_W = 250;
    const MAX_LOGO_BOX_H = 85;

    // Passt das Feld des Logos/Bildes EXAKT an das Seitenverhältnis und den Inhalt des Bildes an
    function adaptLogoField() {
        if (logoNaturalWidth > 0 && logoNaturalHeight > 0) {
            const ratio = logoNaturalWidth / logoNaturalHeight;
            let w = MAX_LOGO_BOX_W;
            let h = Math.round(w / ratio);
            if (h > MAX_LOGO_BOX_H) {
                h = MAX_LOGO_BOX_H;
                w = Math.round(h * ratio);
            }
            // Anwender-Skalierungsfaktor (50% - 150%, Standard 100%)
            const factor = Math.max(0.4, Math.min(2.0, logoScalePercent / 100));
            w = Math.round(w * factor);
            h = Math.round(h * factor);

            // Begrenzung innerhalb der DIN 5008 Seitenränder
            w = Math.max(35, Math.min(360, w));
            h = Math.max(20, Math.min(160, h));

            const oldW = positions.logo.w || DEFAULT_POSITIONS.logo.w;
            // Rechte Kante beibehalten (Standard DIN 5008 rechtsbündig)
            const currentRight = positions.logo.x + oldW;
            let newX = currentRight - w;
            if (newX < 10) newX = 10;
            if (newX + w > 784) newX = 784 - w;

            positions.logo.w = w;
            positions.logo.h = h;
            positions.logo.x = Math.round(newX);
        } else {
            // Text-Fallback für reinen Firmennamen ohne Bild
            positions.logo.w = 230;
            positions.logo.h = 45;
        }
    }

    let isSavingToPb = $state(false);
    let lastSyncedPbTime = $state<string | null>(null);
    let pbSaveTimeout: any = null;

    // Lädt gespeicherte Element-Positionen aus der PocketBase 'document_templates' Collection
    async function loadPositionsFromPocketbase() {
        if (!pb.authStore.isValid) return;
        try {
            let template: any = (orgaStore.document_templates?.data || []).find((t: any) => 
                (t.type || '').toLowerCase() === 'brief' || 
                (t.title || '').toLowerCase().includes('din 5008')
            );

            if (!template) {
                const list = await pb.collection('document_templates').getFullList({
                    filter: 'type = "brief"',
                    sort: '-updated'
                });
                if (list.length > 0) template = list[0];
            }

            if (template?.content_html) {
                const data = typeof template.content_html === 'string' 
                    ? JSON.parse(template.content_html) 
                    : template.content_html;

                if (data.positions) {
                    for (const key of Object.keys(DEFAULT_POSITIONS) as PositionKey[]) {
                        if (data.positions[key] && typeof data.positions[key].x === 'number' && typeof data.positions[key].y === 'number') {
                            positions[key] = {
                                ...DEFAULT_POSITIONS[key],
                                x: Math.round(data.positions[key].x),
                                y: Math.round(data.positions[key].y)
                            };
                        }
                    }
                }
                if (typeof data.logoScalePercent === 'number' && data.logoScalePercent >= 40 && data.logoScalePercent <= 200) {
                    logoScalePercent = data.logoScalePercent;
                }
                adaptLogoField();
                if (typeof window !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...positions, logoScalePercent }));
                }
                lastSyncedPbTime = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            }
        } catch (err) {
            console.warn("[QuickLetterModal] Fehler beim Laden der Positionen aus PocketBase:", err);
        }
    }

    // Speichert die Koordinaten aller verschobenen Elemente in PocketBase
    async function savePositionsToPocketbase() {
        if (!pb.authStore.isValid) return;
        try {
            isSavingToPb = true;
            let existing: any = (orgaStore.document_templates?.data || []).find((t: any) => 
                (t.type || '').toLowerCase() === 'brief' || 
                (t.title || '').toLowerCase().includes('din 5008')
            );

            if (!existing) {
                const list = await pb.collection('document_templates').getFullList({
                    filter: 'type = "brief"',
                    sort: '-updated'
                });
                if (list.length > 0) existing = list[0];
            }

            const payload = {
                title: existing?.title || 'Standard Geschäftsbrief (DIN 5008)',
                type: 'brief',
                content_html: {
                    positions: $state.snapshot(positions),
                    logoScalePercent,
                    savedAt: new Date().toISOString()
                },
                css_style: {
                    standard: 'DIN 5008 Form B',
                    orientation: 'portrait'
                }
            };

            if (existing?.id) {
                await pb.collection('document_templates').update(existing.id, payload);
            } else {
                await pb.collection('document_templates').create(payload);
            }

            lastSyncedPbTime = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        } catch (err) {
            console.error("[QuickLetterModal] Fehler beim Speichern der Positionen in PocketBase:", err);
        } finally {
            isSavingToPb = false;
        }
    }

    function savePositions(immediate = false) {
        if (typeof window === 'undefined') return;
        try {
            const toSave = {
                ...positions,
                logoScalePercent
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch (err) {
            console.warn("Fehler beim Speichern der Briefpositionen im Browser:", err);
        }

        // PocketBase Cloud-Speicherung (debounced oder sofort)
        if (immediate) {
            if (pbSaveTimeout) clearTimeout(pbSaveTimeout);
            savePositionsToPocketbase();
        } else {
            if (pbSaveTimeout) clearTimeout(pbSaveTimeout);
            pbSaveTimeout = setTimeout(() => {
                savePositionsToPocketbase();
            }, 350);
        }
    }

    function loadSavedPositions() {
        if (typeof window === 'undefined') return;
        // 1. Sofortiger lokaler Cache für schnelles UI-Feedback
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                for (const key of Object.keys(DEFAULT_POSITIONS) as PositionKey[]) {
                    if (parsed[key] && typeof parsed[key].x === 'number' && typeof parsed[key].y === 'number') {
                        positions[key] = {
                            ...DEFAULT_POSITIONS[key],
                            x: Math.round(parsed[key].x),
                            y: Math.round(parsed[key].y)
                        };
                    }
                }
                if (typeof parsed.logoScalePercent === 'number' && parsed.logoScalePercent >= 40 && parsed.logoScalePercent <= 200) {
                    logoScalePercent = parsed.logoScalePercent;
                }
            }
        } catch (err) {
            console.warn("Fehler beim Laden der gespeicherten Briefpositionen:", err);
        }
        adaptLogoField();

        // 2. Aus PocketBase nachladen
        loadPositionsFromPocketbase();
    }

    onMount(() => {
        loadSavedPositions();
    });

    function resetPositions() {
        positions.logo = { ...DEFAULT_POSITIONS.logo };
        positions.absender = { ...DEFAULT_POSITIONS.absender };
        positions.anschrift = { ...DEFAULT_POSITIONS.anschrift };
        positions.datum = { ...DEFAULT_POSITIONS.datum };
        positions.betreff = { ...DEFAULT_POSITIONS.betreff };
        positions.body = { ...DEFAULT_POSITIONS.body };
        logoScalePercent = 100;
        adaptLogoField();
        activeGuideLines = { x: null, y: null };
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (e) {}
        }
        savePositions(true);
        toastStore.info("Standard DIN 5008 Layout-Positionen wiederhergestellt und in PocketBase gespeichert.");
    }

    // Drag & Drop Steuerung mit Snapping & Touch-Ergonomie
    function startDrag(e: MouseEvent | TouchEvent, key: PositionKey) {
        if ('touches' in e && e.touches.length > 1) {
            return; // Multi-Touch für Pinch-Zoom reservieren, kein Element-Verschieben
        }
        e.preventDefault();
        e.stopPropagation();
        activeDragKey = key;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const targetPos = positions[key];
        const startMouseX = clientX;
        const startMouseY = clientY;
        const startElemX = targetPos.x;
        const startElemY = targetPos.y;

        const onMove = (moveEvt: MouseEvent | TouchEvent) => {
            if (!activeDragKey || !paperSheetEl) return;
            if ('touches' in moveEvt && moveEvt.touches.length > 1) {
                // Bei 2 Fingern sofort Drag abbrechen und dem Pinch-Zoom überlassen
                activeDragKey = null;
                activeGuideLines = { x: null, y: null };
                return;
            }

            const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
            const curY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

            const currentScale = paperSheetEl.clientWidth / 794;
            const dx = (curX - startMouseX) / currentScale;
            const dy = (curY - startMouseY) / currentScale;

            const curElem = positions[activeDragKey];
            const rawX = startElemX + dx;
            const rawY = startElemY + dy;

            // Intelligentes Einrasten an Raster & anderen Element-Kanten
            const snapped = calculateSnapping(activeDragKey, rawX, rawY, curElem.w, curElem.h);

            positions[activeDragKey].x = snapped.x;
            positions[activeDragKey].y = snapped.y;
            activeGuideLines = { x: snapped.guideX, y: snapped.guideY };
        };

        const onEnd = () => {
            activeDragKey = null;
            activeGuideLines = { x: null, y: null };
            savePositions();
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
        };

        window.addEventListener('mousemove', onMove, { passive: false });
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
    }

    // Formular-State
    let selectedContactId = $state<string>("");
    let recipientCompany = $state("");
    let recipientSalutation = $state("Frau");
    let recipientFirstname = $state("");
    let recipientLastname = $state("");
    let recipientStreet = $state("");
    let recipientHousenr = $state("");
    let recipientZip = $state("");
    let recipientCity = $state("");

    let letterDate = $state(new Date().toISOString().split("T")[0]);
    let reference = $state("");
    let subject = $state("Information zu unseren Betreuungs- und Entlastungsleistungen");
    let salutationLine = $state("Sehr geehrte Damen und Herren,");
    let letterBody = $state(
        "wir bedanken uns herzlich für das entgegengebrachte Vertrauen.\n\nAnbei erhalten Sie die gewünschten Unterlagen zu unseren Unterstützungs- und Betreuungsleistungen nach dem Sozialgesetzbuch (SGB XI).\n\nSollten Sie Fragen haben oder eine persönliche Beratung wünschen, stehen wir Ihnen jederzeit gern telefonisch oder per E-Mail zur Verfügung."
    );
    let closingLine = $state("Mit freundlichen Grüßen");
    let senderName = $state("");

    let isGenerating = $state(false);
    let selectedCompanyId = $state("");

    // Vorlagen / Presets
    const presets = [
        {
            id: 'info',
            icon: '📄',
            title: 'Allgemein',
            subject: 'Information zu unseren Betreuungs- und Entlastungsleistungen',
            body: 'wir bedanken uns herzlich für das entgegengebrachte Vertrauen.\n\nAnbei erhalten Sie die gewünschten Unterlagen zu unseren Unterstützungs- und Betreuungsleistungen nach dem Sozialgesetzbuch (SGB XI).\n\nSollten Sie Fragen haben oder eine persönliche Beratung wünschen, stehen wir Ihnen jederzeit gern telefonisch oder per E-Mail zur Verfügung.'
        },
        {
            id: 'appointment',
            icon: '📅',
            title: 'Termin',
            subject: 'Ankündigung unseres nächsten Betreuungseinsatzes',
            body: 'wir freuen uns auf unseren nächsten gemeinsamen Betreuungstermin.\n\nGerne bestätigen wir Ihnen die geplante Durchführung unserer vereinbarten Unterstützungsleistungen. Sollten sich Ihrerseits zeitliche Änderungen ergeben, bitten wir Sie um eine kurze Rückmeldung bis 24 Stunden vor dem Termin.\n\nWir freuen uns auf das persönliche Wiedersehen!'
        },
        {
            id: 'insurance',
            icon: '🛡️',
            title: 'Kasse / SGB XI',
            subject: 'Antrag auf Kostenübernahme für Entlastungsleistungen (§ 45b SGB XI)',
            body: 'hiermit übersenden wir Ihnen im Auftrag unseres/r Klienten/in die Unterlagen zur Abrechnung bzw. Kostenübernahme der erbrachten Entlastungs- und Unterstützungsleistungen gemäß § 45b SGB XI.\n\nDie entsprechenden Leistungsnachweise und Abtretungserklärungen liegen diesem Schreiben bei. Wir bitten um Prüfung und Freigabe auf das hinterlegte Geschäftskonto.'
        },
        {
            id: 'blank',
            icon: '✍️',
            title: 'Leeres Blatt',
            subject: '',
            body: ''
        }
    ];

    function applyPreset(p: typeof presets[0]) {
        subject = p.subject;
        letterBody = p.body;
        toastStore.info(`Vorlage "${p.title}" geladen.`);
    }

    // Ermittlung des Unternehmens (Logo & Absenderdaten)
    let availableCompanies = $derived((orgaStore.company?.data as any[]) || []);
    let currentCompany = $derived.by(() => {
        if (selectedCompanyId) {
            return availableCompanies.find(c => c.id === selectedCompanyId) || availableCompanies[0];
        }
        const userComp = pb.authStore.model?.company;
        const compId = Array.isArray(userComp) ? userComp[0] : userComp;
        return availableCompanies.find(c => c.id === compId) || availableCompanies[0];
    });

    let returnAddressLine = $derived.by(() => {
        if (!currentCompany) return 'Seniorenassistenz';
        const parts = [
            currentCompany.name,
            `${currentCompany.street || ''} ${currentCompany.housenr || ''}`.trim(),
            `${currentCompany.zip || ''} ${currentCompany.city || ''}`.trim()
        ].filter(Boolean);
        return parts.join(' • ');
    });

    // Wirksame Bild- / Logo-Quelle (individuell hochgeladenes Bild oder Standard-Firmenlogo)
    let effectiveLogoUrl = $derived.by(() => {
        if (customImageUrl) return customImageUrl;
        if (currentCompany?.logo) {
            return pb.files.getURL(currentCompany, currentCompany.logo);
        }
        return null;
    });

    // Bild im Hintergrund vorladen und Dimensionen ermitteln -> Feldgröße passt sich dem Inhalt an!
    $effect(() => {
        const url = effectiveLogoUrl;
        if (url) {
            if (typeof window !== 'undefined') {
                const img = new Image();
                img.onload = () => {
                    logoNaturalWidth = img.naturalWidth;
                    logoNaturalHeight = img.naturalHeight;
                    adaptLogoField();
                };
                img.onerror = () => {
                    logoNaturalWidth = 0;
                    logoNaturalHeight = 0;
                    adaptLogoField();
                };
                img.src = url;
            }
        } else {
            logoNaturalWidth = 0;
            logoNaturalHeight = 0;
            adaptLogoField();
        }
    });

    // Event-Handler für das Rendern im Live-Canvas
    function handleLogoImageLoad(e: Event) {
        const img = e.currentTarget as HTMLImageElement;
        if (img && img.naturalWidth && img.naturalHeight) {
            logoNaturalWidth = img.naturalWidth;
            logoNaturalHeight = img.naturalHeight;
            adaptLogoField();
        }
    }

    function handleCustomImageUpload(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toastStore.warning("Bitte wählen Sie eine gültige Bilddatei (PNG, JPG, SVG, WebP) aus.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const res = reader.result as string;
            customImageUrl = res;
            if (res.includes(',')) {
                customImageBase64 = res.split(',')[1];
            } else {
                customImageBase64 = res;
            }
            toastStore.success("Eigenes Bild für diesen Brief geladen.");
        };
        reader.readAsDataURL(file);
    }

    function removeCustomImage() {
        customImageUrl = null;
        customImageBase64 = null;
        if (fileInputEl) fileInputEl.value = '';
        toastStore.info("Standard-Firmenlogo wiederhergestellt.");
    }

    // Kontakte und Klienten zur Schnellauswahl zusammenfassen
    let recipientOptions = $derived.by(() => {
        const list: { id: string; label: string; type: string; raw: any }[] = [];
        
        (orgaStore.clients?.data || []).forEach((c: any) => {
            const name = `${c.salutation || ''} ${c.name_first || ''} ${c.name_last || ''}`.trim();
            list.push({
                id: `client_${c.id}`,
                label: `👤 Klient: ${name} (${c.city || 'Kein Ort'})`,
                type: 'Klient',
                raw: c
            });
        });

        (orgaStore.contacts?.data || []).forEach((ct: any) => {
            const name = `${ct.name_first || ''} ${ct.name_last || ''}`.trim() || ct.company_name || 'Kontakt';
            list.push({
                id: `contact_${ct.id}`,
                label: `👥 Kontakt: ${name} ${ct.category ? `[${ct.category}]` : ''}`,
                type: 'Kontakt',
                raw: ct
            });
        });

        (orgaStore.insurancies?.data || []).forEach((ins: any) => {
            list.push({
                id: `ins_${ins.id}`,
                label: `🏥 Kasse: ${ins.name} (${ins.city || ''})`,
                type: 'Pflegekasse',
                raw: ins
            });
        });

        return list;
    });

    export function open(prefill?: { clientId?: string; contactId?: string }) {
        const user = pb.authStore.model;
        if (user) {
            senderName = `${user.name_first || ''} ${user.name_last || ''}`.trim() || currentCompany?.name || "Ihr Betreuungsteam";
        } else {
            senderName = currentCompany?.name || "Ihr Betreuungsteam";
        }

        loadSavedPositions();
        adaptLogoField();
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

    export function close() {
        dialog?.close();
    }

    function applyRecipient(item: any, type: string) {
        if (!item) return;

        if (type === 'Pflegekasse') {
            recipientCompany = item.name || '';
            recipientSalutation = '';
            recipientFirstname = '';
            recipientLastname = '';
            recipientStreet = item.street || '';
            recipientHousenr = item.housenr || '';
            recipientZip = item.zip || '';
            recipientCity = item.city || '';
            salutationLine = 'Sehr geehrte Damen und Herren,';
            return;
        }

        recipientCompany = item.company_name || '';
        recipientSalutation = item.salutation || (item.gender === 'female' ? 'Frau' : item.gender === 'male' ? 'Herr' : 'Herr');
        recipientFirstname = item.name_first || '';
        recipientLastname = item.name_last || '';
        recipientStreet = item.street || '';
        recipientHousenr = item.housenr || '';
        recipientZip = item.zip || '';
        recipientCity = item.city || '';

        if (recipientLastname) {
            if (recipientSalutation === 'Frau') {
                salutationLine = `Sehr geehrte Frau ${recipientLastname},`;
            } else if (recipientSalutation === 'Herr') {
                salutationLine = `Sehr geehrter Herr ${recipientLastname},`;
            } else if (recipientSalutation === 'Familie') {
                salutationLine = `Liebe Familie ${recipientLastname},`;
            } else {
                salutationLine = `Guten Tag ${recipientFirstname} ${recipientLastname},`.trim() + ',';
            }
        } else {
            salutationLine = 'Sehr geehrte Damen und Herren,';
        }
    }

    function handleRecipientSelect(e: Event) {
        const val = (e.target as HTMLSelectElement).value;
        selectedContactId = val;
        if (!val) return;

        const opt = recipientOptions.find(o => o.id === val);
        if (opt) {
            applyRecipient(opt.raw, opt.type);
        }
    }

    function blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') resolve(reader.result.split(',')[1]);
                else reject(new Error("Failed to convert blob to base64"));
            };
            reader.readAsDataURL(blob);
        });
    }

    let addressLines = $derived.by(() => {
        const parts: string[] = [];
        if (recipientCompany) parts.push(recipientCompany);
        const nameLine = [recipientSalutation, recipientFirstname, recipientLastname].filter(Boolean).join(' ');
        if (nameLine) parts.push(nameLine);
        const streetLine = [recipientStreet, recipientHousenr].filter(Boolean).join(' ');
        if (streetLine) parts.push(streetLine);
        const cityLine = [recipientZip, recipientCity].filter(Boolean).join(' ');
        if (cityLine) parts.push(cityLine);
        return parts;
    });

    let formattedDisplayDate = $derived.by(() => {
        const d = new Date(letterDate || Date.now());
        const dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return currentCompany?.city ? `${currentCompany.city}, den ${dateStr}` : dateStr;
    });

    let wordCount = $derived(letterBody.trim() ? letterBody.trim().split(/\s+/).length : 0);

    async function handleGeneratePdf() {
        if (!recipientLastname && !recipientCompany) {
            toastStore.warning("Bitte geben Sie einen Empfängernamen oder eine Firma an.");
            return;
        }
        if (!letterBody.trim()) {
            toastStore.warning("Bitte geben Sie einen Brieftext ein.");
            return;
        }

        isGenerating = true;
        try {
            // 1. Firmenlogo oder individuelles Bild laden
            let logoBase64: string | null = customImageBase64;
            if (!logoBase64 && effectiveLogoUrl) {
                try {
                    const resp = await fetch(effectiveLogoUrl);
                    if (resp.ok) {
                        const blob = await resp.blob();
                        logoBase64 = await blobToBase64(blob);
                    }
                } catch (e) {
                    console.warn("Bild konnte nicht geladen werden:", e);
                }
            }

            // 2. Datum & Ort Block
            let dateBlock = formattedDisplayDate;
            if (reference) {
                dateBlock = `Ihr Zeichen: ${reference}\n${dateBlock}`;
            }

            // 3. Vollständigen Brieftext zusammenstellen
            const fullBody = [
                salutationLine,
                '',
                letterBody.trim(),
                '',
                closingLine,
                '',
                senderName || (currentCompany?.name || '')
            ].join('\n');

            // 4. DIN 5008 Felder mit den EXAKTEN, vom Nutzer verschobenen und dem Bild angepassten Koordinaten!
            const fields: any[] = [];

            // A. Logo / Bild (Feld passt sich immer dem Bildinhalt an!)
            if (logoBase64) {
                fields.push({
                    id: 'f_logo',
                    type: 'logo',
                    content: 'Firmenlogo',
                    imageBase64: logoBase64,
                    x: positions.logo.x,
                    y: positions.logo.y,
                    w: positions.logo.w,
                    h: positions.logo.h,
                    style: {
                        textAlign: 'center',
                        dynamicHeight: false,
                        repeatOnAllPages: false
                    }
                });
            }

            // B. Absenderzeile (Rücksendeangabe über Anschriftfeld)
            fields.push({
                id: 'f_absender',
                type: 'text',
                content: returnAddressLine,
                x: positions.absender.x,
                y: positions.absender.y,
                w: positions.absender.w,
                h: positions.absender.h,
                style: {
                    fontSize: 8,
                    color: '#6b7280',
                    fontWeight: 'normal',
                    textAlign: 'left',
                    dynamicHeight: false,
                    repeatOnAllPages: false
                }
            });

            // C. Anschriftfeld
            fields.push({
                id: 'f_anschrift',
                type: 'text',
                content: addressLines.join('\n'),
                x: positions.anschrift.x,
                y: positions.anschrift.y,
                w: positions.anschrift.w,
                h: positions.anschrift.h,
                style: {
                    fontSize: 10,
                    color: '#111827',
                    fontWeight: 'normal',
                    textAlign: 'left',
                    dynamicHeight: false,
                    repeatOnAllPages: false
                }
            });

            // D. Datum & Zeichen
            fields.push({
                id: 'f_datum',
                type: 'text',
                content: dateBlock,
                x: positions.datum.x,
                y: positions.datum.y,
                w: positions.datum.w,
                h: positions.datum.h,
                style: {
                    fontSize: 9,
                    color: '#374151',
                    textAlign: 'right',
                    dynamicHeight: false,
                    repeatOnAllPages: false
                }
            });

            // E. Betreffzeile
            fields.push({
                id: 'f_betreff',
                type: 'text',
                content: subject ? (subject.toLowerCase().startsWith('betreff:') ? subject : `Betreff: ${subject}`) : 'Geschäftsbrief',
                x: positions.betreff.x,
                y: positions.betreff.y,
                w: positions.betreff.w,
                h: positions.betreff.h,
                style: {
                    fontSize: 12,
                    color: '#000000',
                    fontWeight: 'bold',
                    textAlign: 'left',
                    dynamicHeight: false,
                    repeatOnAllPages: false
                }
            });

            // F. Fließtext
            fields.push({
                id: 'f_body',
                type: 'text',
                content: fullBody,
                x: positions.body.x,
                y: positions.body.y,
                w: positions.body.w,
                h: positions.body.h,
                style: {
                    fontSize: 11,
                    color: '#1f2937',
                    fontWeight: 'normal',
                    textAlign: 'left',
                    dynamicHeight: true,
                    repeatOnAllPages: false
                }
            });

            // 5. PDF generieren mit automatischem Fallback auf Port 3000 / Nginx
            const pdfBlob = await generatePdfBlob({
                templateJson: {
                    orientation: 'portrait',
                    marginTop: Math.max(50, Math.min(positions.body.y, 400)),
                    marginBottom: 50,
                    fields: fields
                },
                data: {
                    companyLogoBase64: logoBase64
                },
                isTimesheet: false
            });
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const safeName = (recipientLastname || recipientCompany || 'Schreiben').replace(/[^a-zA-Z0-9_-]/g, '_');
            const fileName = `Brief_${safeName}_${letterDate}.pdf`;

            toastStore.success("Brief erfolgreich im individuellen Layout generiert!");
            
            // Sofortige Präsentation im PDF Vorschau Modal
            previewModal?.open(pdfUrl, subject || "Geschäftsbrief", fileName);

        } catch (error: any) {
            console.error("Fehler beim Generieren des Briefs:", error);
            toastStore.error(error.message || "Brief konnte nicht generiert werden.");
        } finally {
            isGenerating = false;
        }
    }
</script>

<!-- Moderner Studio-Dialog mit Live-A4-Papier-Simulation und Drag & Drop -->
<dialog 
    bind:this={dialog} 
    class="p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-md w-full max-w-6xl mx-auto my-auto rounded-3xl outline-none"
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-neutral-900 rounded-3xl w-full max-h-[94vh] flex flex-col relative shadow-2xl overflow-hidden border border-white/10 text-neutral-100">
        
        <!-- Header -->
        <div class="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0 relative overflow-hidden">
            <div class="absolute -top-10 right-20 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div class="flex items-center gap-3.5 min-w-0">
                <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center text-xl shadow-lg shadow-sky-500/20 shrink-0 ring-2 ring-white/10">
                    ✉️
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-2">
                        <h2 class="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                            Geschäftsbrief schreiben
                        </h2>
                        <span class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                            <Move class="w-3 h-3" />
                            <span>Drag & Drop aktiv</span>
                        </span>
                        <span class="hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-neutral-300">
                            Ohne Fußzeile
                        </span>
                    </div>
                    <p class="text-xs text-neutral-400 truncate mt-0.5">
                        Elemente auf dem Blatt frei verschieben • Live-DIN-5008-Papieransicht
                    </p>
                </div>
            </div>

            <!-- Mobile View Switcher & Schließen -->
            <div class="flex items-center gap-2">
                <div class="flex lg:hidden bg-white/10 p-1 rounded-xl border border-white/10">
                    <button
                        type="button"
                        onclick={() => activeMobileTab = 'form'}
                        class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 {activeMobileTab === 'form' ? 'bg-sky-500 text-white shadow-xs' : 'text-neutral-400 hover:text-white'}"
                    >
                        <Edit3 class="w-3.5 h-3.5" />
                        <span>Text</span>
                    </button>
                    <button
                        type="button"
                        onclick={() => activeMobileTab = 'preview'}
                        class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 {activeMobileTab === 'preview' ? 'bg-sky-500 text-white shadow-xs' : 'text-neutral-400 hover:text-white'}"
                    >
                        <Eye class="w-3.5 h-3.5" />
                        <span>Blatt</span>
                    </button>
                </div>

                <button 
                    type="button" 
                    onclick={close} 
                    class="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 cursor-pointer"
                    aria-label="Schließen"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>
        </div>

        <!-- Schnell-Vorlagen Bar -->
        <div class="px-6 py-2 bg-neutral-950/80 border-b border-white/5 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar shrink-0 text-xs">
            <div class="flex items-center gap-2">
                <span class="text-neutral-400 font-semibold text-[11px] whitespace-nowrap flex items-center gap-1">
                    <Sparkles class="w-3.5 h-3.5 text-amber-400" />
                    <span>Vorlagen:</span>
                </span>
                <div class="flex items-center gap-1.5">
                    {#each presets as p}
                        <button
                            type="button"
                            onclick={() => applyPreset(p)}
                            class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium active:scale-95 cursor-pointer"
                        >
                            <span>{p.icon}</span>
                            <span>{p.title}</span>
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Positionen zurücksetzen Button -->
            <button
                type="button"
                onclick={resetPositions}
                class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium active:scale-95 cursor-pointer shrink-0"
                title="Alle verschobenen Elemente wieder an ihre DIN 5008 Standard-Position setzen"
            >
                <RotateCcw class="w-3.5 h-3.5" />
                <span>Layout zurücksetzen</span>
            </button>
        </div>

        <!-- Dual-Pane Studio Workspace -->
        <div class="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-neutral-900">
            
            <!-- Linker Bereich: Formular & Inhalte -->
            <div class="lg:col-span-6 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar border-r border-white/5 {activeMobileTab === 'form' ? 'block' : 'hidden lg:block'}">

                <!-- 1. Empfänger-Card -->
                <div class="bg-neutral-800/80 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4 shadow-sm">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-sm font-bold">
                                1
                            </div>
                            <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-200">
                                Empfängerdaten (Anschrift)
                            </h3>
                        </div>
                        <span class="text-[10px] text-neutral-400">1-Click oder manuell</span>
                    </div>

                    <!-- Schnellauswahl Dropdown -->
                    <div>
                        <label for="recipient-picker" class="block text-xs font-semibold text-neutral-300 mb-1.5">
                            Schnellauswahl aus Adressbuch:
                        </label>
                        <div class="relative">
                            <select 
                                id="recipient-picker"
                                class="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-medium rounded-xl pl-3.5 pr-10 py-2.5 transition-all shadow-inner outline-none cursor-pointer appearance-none"
                                onchange={handleRecipientSelect}
                                value={selectedContactId}
                            >
                                <option value="">-- Empfänger aus Klienten & Kontakten wählen --</option>
                                {#each recipientOptions as opt}
                                    <option value={opt.id}>{opt.label}</option>
                                {/each}
                            </select>
                            <ChevronDown class="w-4 h-4 text-neutral-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>

                    <!-- Adress-Felder -->
                    <div class="space-y-3 pt-1">
                        <div>
                            <label for="recipient-company-input" class="block text-xs font-semibold text-neutral-300 mb-1">
                                Firma / Institution / Kasse (optional):
                            </label>
                            <input 
                                id="recipient-company-input"
                                type="text" 
                                bind:value={recipientCompany} 
                                placeholder="z. B. Pflegekasse / Hausarzt / Betreuungsbehörde" 
                                class="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 transition-all shadow-inner outline-none placeholder:text-neutral-500" 
                            />
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                                <label for="recipient-salutation-select" class="block text-xs font-semibold text-neutral-300 mb-1">
                                    Anrede:
                                </label>
                                <div class="relative">
                                    <select 
                                        id="recipient-salutation-select"
                                        bind:value={recipientSalutation} 
                                        class="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-medium rounded-xl pl-3 pr-8 py-2.5 transition-all shadow-inner outline-none cursor-pointer appearance-none"
                                    >
                                        <option value="Herr">Herr</option>
                                        <option value="Frau">Frau</option>
                                        <option value="Familie">Familie</option>
                                        <option value="">(Keine)</option>
                                    </select>
                                    <ChevronDown class="w-3.5 h-3.5 text-neutral-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                                </div>
                            </div>
                            <div>
                                <label for="recipient-fname-input" class="block text-xs font-semibold text-neutral-300 mb-1">
                                    Vorname:
                                </label>
                                <input 
                                    id="recipient-fname-input"
                                    type="text" 
                                    bind:value={recipientFirstname} 
                                    placeholder="Vorname" 
                                    class="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 transition-all shadow-inner outline-none placeholder:text-neutral-500" 
                                />
                            </div>
                            <div>
                                <label for="recipient-lname-input" class="block text-xs font-semibold text-neutral-300 mb-1">
                                    Nachname *:
                                </label>
                                <input 
                                    id="recipient-lname-input"
                                    type="text" 
                                    bind:value={recipientLastname} 
                                    placeholder="Nachname *" 
                                    class="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-bold rounded-xl px-3.5 py-2.5 transition-all shadow-inner outline-none placeholder:text-neutral-500" 
                                    required 
                                />
                            </div>
                        </div>

                        <div class="grid grid-cols-4 gap-2.5">
                            <div class="col-span-3">
                                <label for="recipient-street-input" class="block text-xs font-semibold text-neutral-300 mb-1">
                                    Straße:
                                </label>
                                <input 
                                    id="recipient-street-input"
                                    type="text" 
                                    bind:value={recipientStreet} 
                                    placeholder="Straße" 
                                    class="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 transition-all shadow-inner outline-none placeholder:text-neutral-500" 
                                />
                            </div>
                            <div>
                                <label for="recipient-housenr-input" class="block text-xs font-semibold text-neutral-300 mb-1">
                                    Nr.:
                                </label>
                                <input 
                                    id="recipient-housenr-input"
                                    type="text" 
                                    bind:value={recipientHousenr} 
                                    placeholder="Nr." 
                                    class="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 transition-all shadow-inner outline-none placeholder:text-neutral-500" 
                                />
                            </div>
                        </div>

                        <div class="grid grid-cols-3 gap-2.5">
                            <div>
                                <label for="recipient-zip-input" class="block text-xs font-semibold text-neutral-300 mb-1">
                                    PLZ:
                                </label>
                                <input 
                                    id="recipient-zip-input"
                                    type="text" 
                                    bind:value={recipientZip} 
                                    placeholder="PLZ" 
                                    class="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 transition-all shadow-inner outline-none placeholder:text-neutral-500" 
                                />
                            </div>
                            <div class="col-span-2">
                                <label for="recipient-city-input" class="block text-xs font-semibold text-neutral-300 mb-1">
                                    Ort:
                                </label>
                                <input 
                                    id="recipient-city-input"
                                    type="text" 
                                    bind:value={recipientCity} 
                                    placeholder="Ort" 
                                    class="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 transition-all shadow-inner outline-none placeholder:text-neutral-500" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. Absender- & Bezugszeichen-Card -->
                <div class="bg-neutral-800/80 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4 shadow-sm">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-bold">
                                2
                            </div>
                            <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-200">
                                Absender & Bild / Logo
                            </h3>
                        </div>
                        {#if effectiveLogoUrl}
                            <span class="text-[10px] text-emerald-400 flex items-center gap-1 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <span>✓</span>
                                <span>Feld angepasst ({positions.logo.w} × {positions.logo.h} px)</span>
                            </span>
                        {:else}
                            <span class="text-[10px] text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                                Text-Modus ({positions.logo.w} × {positions.logo.h} px)
                            </span>
                        {/if}
                    </div>

                    <!-- Logo & Firma Info -->
                    <div class="space-y-2.5 p-3 bg-neutral-900/90 rounded-xl border border-white/10">
                        <div class="flex items-center gap-3">
                            {#if effectiveLogoUrl}
                                <img 
                                    src={effectiveLogoUrl} 
                                    alt="Firmenlogo" 
                                    class="w-12 h-10 object-contain rounded-lg bg-white p-1 shrink-0 shadow-xs" 
                                />
                            {:else}
                                <div class="w-12 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-400 text-center font-bold shrink-0">
                                    Logo
                                </div>
                            {/if}
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2">
                                    <p class="text-xs font-bold text-white truncate">{currentCompany?.name || 'Seniorenassistenz'}</p>
                                    {#if customImageUrl}
                                        <span class="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-400/30">Eigenes Bild</span>
                                    {/if}
                                </div>
                                <p class="text-[11px] text-neutral-400 truncate mt-0.5">
                                    {logoNaturalWidth > 0 ? `Original: ${logoNaturalWidth}×${logoNaturalHeight}px • Feld passt sich 1:1 an` : returnAddressLine}
                                </p>
                            </div>
                            {#if availableCompanies.length > 1 && !customImageUrl}
                                <div class="relative shrink-0">
                                    <select 
                                        bind:value={selectedCompanyId} 
                                        class="bg-neutral-800 hover:bg-neutral-750 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-200 text-xs font-semibold rounded-xl pl-3 pr-8 py-1.5 transition-all shadow-inner outline-none cursor-pointer appearance-none"
                                    >
                                        {#each availableCompanies as comp}
                                            <option value={comp.id}>{comp.name}</option>
                                        {/each}
                                    </select>
                                    <ChevronDown class="w-3.5 h-3.5 text-neutral-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                                </div>
                            {/if}
                        </div>

                        <!-- Steuerung: Bildgröße skalieren (Feld bleibt 100% am Inhalt) & Eigenes Bild -->
                        <div class="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div class="flex items-center gap-2 flex-1 min-w-[200px]">
                                <span class="text-[11px] text-neutral-400 font-medium whitespace-nowrap">Größe:</span>
                                <button 
                                    type="button" 
                                    onclick={() => { logoScalePercent = Math.max(40, logoScalePercent - 10); adaptLogoField(); savePositions(); }}
                                    class="w-6 h-6 flex items-center justify-center rounded bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-300 hover:text-white font-bold cursor-pointer transition-all"
                                    title="Bild kleiner skalieren"
                                >-</button>
                                <input 
                                    type="range" 
                                    min="40" 
                                    max="180" 
                                    step="5" 
                                    bind:value={logoScalePercent} 
                                    oninput={() => { adaptLogoField(); savePositions(); }}
                                    class="flex-1 accent-sky-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                                />
                                <button 
                                    type="button" 
                                    onclick={() => { logoScalePercent = Math.min(180, logoScalePercent + 10); adaptLogoField(); savePositions(); }}
                                    class="w-6 h-6 flex items-center justify-center rounded bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-300 hover:text-white font-bold cursor-pointer transition-all"
                                    title="Bild größer skalieren"
                                >+</button>
                                <button 
                                    type="button" 
                                    onclick={() => { logoScalePercent = 100; adaptLogoField(); savePositions(); }}
                                    class="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 font-mono text-[10px] text-neutral-300 hover:text-white cursor-pointer transition-all"
                                    title="Standardgröße 100%"
                                >{logoScalePercent}%</button>
                            </div>

                            <div class="flex items-center gap-1.5">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    bind:this={fileInputEl} 
                                    onchange={handleCustomImageUpload} 
                                    class="hidden" 
                                    id="custom-logo-upload"
                                />
                                <label 
                                    for="custom-logo-upload" 
                                    class="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                                    title="Ein individuelles Logo oder Bild für dieses Schreiben verwenden"
                                >
                                    <Upload class="w-3 h-3 text-sky-400" />
                                    <span>Bild laden</span>
                                </label>

                                {#if customImageUrl}
                                    <button 
                                        type="button" 
                                        onclick={removeCustomImage} 
                                        class="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] transition-all cursor-pointer"
                                        title="Eigenes Bild entfernen und Firmenlogo wiederherstellen"
                                    >
                                        <Trash2 class="w-3 h-3" />
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                            <label for="date-input" class="block text-xs font-semibold text-neutral-300 mb-1">Briefdatum:</label>
                            <input 
                                id="date-input"
                                type="date" 
                                bind:value={letterDate} 
                                class="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 transition-all shadow-inner outline-none" 
                            />
                        </div>
                        <div>
                            <label for="ref-input" class="block text-xs font-semibold text-neutral-300 mb-1">Ihr Zeichen / Aktenzeichen:</label>
                            <input 
                                id="ref-input"
                                type="text" 
                                bind:value={reference} 
                                placeholder="z. B. 123/2026 SGB XI" 
                                class="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 transition-all shadow-inner outline-none placeholder:text-neutral-500" 
                            />
                        </div>
                    </div>
                </div>

                <!-- 3. Inhalt & Fließtext-Card -->
                <div class="bg-neutral-800/80 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4 shadow-sm">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold">
                                3
                            </div>
                            <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-200">
                                Betreff, Anrede & Brieftext
                            </h3>
                        </div>
                        <span class="text-[10px] text-neutral-400">{wordCount} Wörter</span>
                    </div>

                    <div>
                        <label for="subject-input" class="block text-xs font-semibold text-neutral-300 mb-1">Betreffzeile (DIN 5008 fett):</label>
                        <input 
                            id="subject-input"
                            type="text" 
                            bind:value={subject} 
                            placeholder="Betreff..." 
                            class="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-bold rounded-xl px-3.5 py-2.5 transition-all shadow-inner outline-none placeholder:text-neutral-500" 
                        />
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label for="salutation-input" class="block text-xs font-semibold text-neutral-300 mb-1">Anrede im Text:</label>
                            <input 
                                id="salutation-input"
                                type="text" 
                                bind:value={salutationLine} 
                                placeholder="Sehr geehrte Damen und Herren," 
                                class="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 transition-all shadow-inner outline-none placeholder:text-neutral-500" 
                            />
                        </div>
                        <div>
                            <label for="closing-input" class="block text-xs font-semibold text-neutral-300 mb-1">Grußformel & Unterzeichner:</label>
                            <div class="flex gap-2">
                                <input 
                                    id="closing-input"
                                    type="text" 
                                    bind:value={closingLine} 
                                    class="w-1/2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 transition-all shadow-inner outline-none" 
                                />
                                <input 
                                    type="text" 
                                    bind:value={senderName} 
                                    class="w-1/2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2.5 transition-all shadow-inner outline-none placeholder:text-neutral-500" 
                                    placeholder="Ihr Name" 
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label for="body-input" class="block text-xs font-semibold text-neutral-300 mb-1">Brieftext:</label>
                        <textarea 
                            id="body-input"
                            bind:value={letterBody} 
                            rows="7" 
                            placeholder="Schreiben Sie hier Ihren Brief..." 
                            class="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm leading-relaxed rounded-xl p-3.5 transition-all shadow-inner outline-none placeholder:text-neutral-500 custom-scrollbar resize-y min-h-[140px]"
                        ></textarea>
                    </div>
                </div>

            </div>

            <!-- Rechter Bereich: Realistische DIN A4 Papier-Simulation mit Drag & Drop, Zoom & Docking -->
            <div 
                bind:clientWidth={containerWidth}
                class="lg:col-span-6 bg-neutral-950 p-3 sm:p-6 flex flex-col items-center justify-start overflow-auto custom-scrollbar {activeMobileTab === 'preview' ? 'block' : 'hidden lg:flex'}"
            >
                
                <!-- Toolbar über dem Blatt mit Magnet-Indikator, PocketBase-Sync und Zoom-Buttons -->
                <div class="w-full max-w-[500px] flex items-center justify-between mb-2.5 text-xs text-neutral-400 px-1 gap-2 flex-wrap">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="flex items-center gap-1 font-bold uppercase tracking-wider text-[10px] text-sky-400">
                            <span class="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center gap-1">
                                <span>🧲</span>
                                <span>Raster-Docking</span>
                            </span>
                        </span>
                        <span class="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-900 border border-white/10 {isSavingToPb ? 'text-amber-400 animate-pulse' : lastSyncedPbTime ? 'text-emerald-400' : 'text-neutral-400'}">
                            <span>{isSavingToPb ? '☁️ Speichert in PB...' : lastSyncedPbTime ? '☁️ In PocketBase gesichert' : '☁️ PocketBase'}</span>
                        </span>
                    </div>

                    <!-- Zoom Controls (auch per 2-Finger-Geste auf Touchscreens) -->
                    <div class="flex items-center gap-1.5">
                        <div class="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs text-neutral-300 shadow-xs">
                            <button 
                                type="button" 
                                onclick={() => previewZoom = Math.max(0.65, +(previewZoom - 0.15).toFixed(2))}
                                class="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 active:scale-95 text-neutral-300 hover:text-white font-bold cursor-pointer"
                                title="Verkleinern"
                            >-</button>
                            <button 
                                type="button" 
                                onclick={() => previewZoom = 1}
                                class="px-2 h-6 flex items-center justify-center rounded hover:bg-white/10 font-mono text-[10px] font-semibold text-neutral-300 hover:text-white cursor-pointer"
                                title="Zoom auf 100% zurücksetzen"
                            >{Math.round(previewZoom * 100)}%</button>
                            <button 
                                type="button" 
                                onclick={() => previewZoom = Math.min(2.2, +(previewZoom + 0.15).toFixed(2))}
                                class="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 active:scale-95 text-neutral-300 hover:text-white font-bold cursor-pointer"
                                title="Vergrößern"
                            >+</button>
                        </div>
                        <span class="text-[10px] text-neutral-500 hidden sm:inline">
                            DIN A4
                        </span>
                    </div>
                </div>

                <!-- DIN A4 Papier-Container (Maßstabsgerechter Pixelraum 794 x 1123) -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                    bind:this={paperSheetEl}
                    ontouchstart={handleSheetTouchStart}
                    ontouchmove={handleSheetTouchMove}
                    ontouchend={handleSheetTouchEnd}
                    class="bg-white rounded-sm shadow-2xl border border-neutral-300 text-neutral-900 relative select-none overflow-hidden touch-pan-x touch-pan-y shrink-0 transition-all duration-75"
                    style="width: {paperSheetWidth}px; height: {sheetHeight}px;"
                >
                    <!-- Dezent angedeutete DIN 5008 Falz- und Lochmarken am linken Rand -->
                    <div class="absolute left-1 w-2 h-[1px] bg-neutral-300 pointer-events-none" style="top: {180 * scale}px;" title="Falzmarke 1"></div>
                    <div class="absolute left-1 w-3.5 h-[1px] bg-neutral-300 pointer-events-none" style="top: {315 * scale}px;" title="Lochmarke"></div>
                    <div class="absolute left-1 w-2 h-[1px] bg-neutral-300 pointer-events-none" style="top: {450 * scale}px;" title="Falzmarke 2"></div>

                    <!-- Dynamische magnetische Hilfslinien beim Andocken (Smart Guides) -->
                    {#if activeGuideLines.x !== null}
                        <div 
                            class="absolute top-0 bottom-0 w-[1.5px] bg-sky-500 z-40 pointer-events-none shadow-[0_0_8px_rgba(14,165,233,1)]"
                            style="left: {activeGuideLines.x * scale}px;"
                        >
                            <span class="absolute top-2 -left-3 bg-sky-600 text-white text-[7px] font-mono px-1 py-0.5 rounded shadow-xs pointer-events-none">
                                X:{activeGuideLines.x}
                            </span>
                        </div>
                    {/if}

                    {#if activeGuideLines.y !== null}
                        <div 
                            class="absolute left-0 right-0 h-[1.5px] bg-sky-500 z-40 pointer-events-none shadow-[0_0_8px_rgba(14,165,233,1)]"
                            style="top: {activeGuideLines.y * scale}px;"
                        >
                            <span class="absolute left-2 -top-3 bg-sky-600 text-white text-[7px] font-mono px-1 py-0.5 rounded shadow-xs pointer-events-none">
                                Y:{activeGuideLines.y}
                            </span>
                        </div>
                    {/if}

                    <!-- 1. DRAGGABLE: Firmenlogo / Bild (Feld passt sich immer dem Bildinhalt an) -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div 
                        class="absolute cursor-move group transition-shadow rounded-lg p-0.5 {activeDragKey === 'logo' ? 'ring-2 ring-sky-500 bg-sky-50/40 shadow-lg z-30' : 'hover:ring-1 hover:ring-sky-400 hover:bg-sky-50/20 z-10'}"
                        style="left: {positions.logo.x * scale}px; top: {positions.logo.y * scale}px; width: {positions.logo.w * scale}px; height: {positions.logo.h * scale}px;"
                        onmousedown={(e) => startDrag(e, 'logo')}
                        ontouchstart={(e) => startDrag(e, 'logo')}
                        title="Bild / Firmenlogo verschieben (Feldgröße passt sich dem Bildinhalt an)"
                    >
                        <div class="w-full h-full flex items-center justify-center overflow-hidden">
                            {#if effectiveLogoUrl}
                                <img 
                                    src={effectiveLogoUrl} 
                                    alt="Logo" 
                                    onload={handleLogoImageLoad}
                                    class="w-full h-full object-contain pointer-events-none select-none block" 
                                />
                            {:else}
                                <div class="w-full h-full flex flex-col justify-center items-end pointer-events-none leading-tight">
                                    <div class="font-black text-neutral-800 tracking-tight text-right truncate" style="font-size: {13 * scale * 1.3}px;">{currentCompany?.name || 'Seniorenassistenz'}</div>
                                    <div class="text-neutral-400 uppercase tracking-wider text-right" style="font-size: {8 * scale * 1.3}px;">Betreuung & Entlastung</div>
                                </div>
                            {/if}
                        </div>
                        <div class="absolute -top-4 right-0 bg-sky-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1 whitespace-nowrap">
                            <Move class="w-2.5 h-2.5" />
                            <span>Bild ({positions.logo.x}, {positions.logo.y}) {positions.logo.w}×{positions.logo.h}px</span>
                        </div>
                    </div>

                    <!-- 2. DRAGGABLE: Rücksendeangabe (Absenderzeile) -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div 
                        class="absolute cursor-move group transition-shadow rounded p-0.5 {activeDragKey === 'absender' ? 'ring-2 ring-sky-500 bg-sky-50/30 shadow-lg z-30' : 'hover:ring-1 hover:ring-sky-400 hover:bg-sky-50/10 z-10'}"
                        style="left: {positions.absender.x * scale}px; top: {positions.absender.y * scale}px; width: {positions.absender.w * scale}px; height: {positions.absender.h * scale}px;"
                        onmousedown={(e) => startDrag(e, 'absender')}
                        ontouchstart={(e) => startDrag(e, 'absender')}
                        title="Rücksendeangabe verschieben"
                    >
                        <div class="text-neutral-500 border-b border-neutral-200 truncate pointer-events-none leading-none" style="font-size: {8 * scale * 1.3}px; padding-bottom: 2px;">
                            {returnAddressLine}
                        </div>
                        <div class="absolute -top-4 left-0 bg-sky-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1 whitespace-nowrap">
                            <Move class="w-2.5 h-2.5" />
                            <span>Rücksendezeile</span>
                        </div>
                    </div>

                    <!-- 3. DRAGGABLE: Anschriftfeld (Kuvertfenster) -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div 
                        class="absolute cursor-move group transition-shadow rounded-lg p-1 {activeDragKey === 'anschrift' ? 'ring-2 ring-sky-500 bg-sky-50/30 shadow-lg z-30' : 'hover:ring-1 hover:ring-sky-400 hover:bg-sky-50/10 z-10'}"
                        style="left: {positions.anschrift.x * scale}px; top: {positions.anschrift.y * scale}px; width: {positions.anschrift.w * scale}px; height: {positions.anschrift.h * scale}px;"
                        onmousedown={(e) => startDrag(e, 'anschrift')}
                        ontouchstart={(e) => startDrag(e, 'anschrift')}
                        title="Empfängeradresse verschieben"
                    >
                        <div class="space-y-0.5 text-neutral-900 font-medium pointer-events-none leading-tight" style="font-size: {10 * scale * 1.3}px;">
                            {#if addressLines.length > 0}
                                {#each addressLines as line}
                                    <div>{line}</div>
                                {/each}
                            {:else}
                                <div class="text-neutral-400 italic">(Noch kein Empfänger angegeben)</div>
                            {/if}
                        </div>
                        <div class="absolute -top-4 left-0 bg-sky-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1 whitespace-nowrap">
                            <Move class="w-2.5 h-2.5" />
                            <span>Anschrift ({positions.anschrift.x}, {positions.anschrift.y})</span>
                        </div>
                    </div>

                    <!-- 4. DRAGGABLE: Datum & Bezugszeichen -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div 
                        class="absolute cursor-move group transition-shadow rounded-lg p-1 text-right {activeDragKey === 'datum' ? 'ring-2 ring-sky-500 bg-sky-50/30 shadow-lg z-30' : 'hover:ring-1 hover:ring-sky-400 hover:bg-sky-50/10 z-10'}"
                        style="left: {positions.datum.x * scale}px; top: {positions.datum.y * scale}px; width: {positions.datum.w * scale}px; height: {positions.datum.h * scale}px;"
                        onmousedown={(e) => startDrag(e, 'datum')}
                        ontouchstart={(e) => startDrag(e, 'datum')}
                        title="Datum & Referenz verschieben"
                    >
                        <div class="text-neutral-700 pointer-events-none leading-tight" style="font-size: {9 * scale * 1.3}px;">
                            {#if reference}
                                <div class="text-neutral-500 mb-0.5">Ihr Zeichen: {reference}</div>
                            {/if}
                            <div class="font-semibold text-neutral-900">{formattedDisplayDate}</div>
                        </div>
                        <div class="absolute -top-4 right-0 bg-sky-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1 whitespace-nowrap">
                            <Move class="w-2.5 h-2.5" />
                            <span>Datum ({positions.datum.x}, {positions.datum.y})</span>
                        </div>
                    </div>

                    <!-- 5. DRAGGABLE: Betreffzeile -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div 
                        class="absolute cursor-move group transition-shadow rounded-lg p-1 {activeDragKey === 'betreff' ? 'ring-2 ring-sky-500 bg-sky-50/30 shadow-lg z-30' : 'hover:ring-1 hover:ring-sky-400 hover:bg-sky-50/10 z-10'}"
                        style="left: {positions.betreff.x * scale}px; top: {positions.betreff.y * scale}px; width: {positions.betreff.w * scale}px; height: {positions.betreff.h * scale}px;"
                        onmousedown={(e) => startDrag(e, 'betreff')}
                        ontouchstart={(e) => startDrag(e, 'betreff')}
                        title="Betreffzeile verschieben"
                    >
                        <div class="font-bold text-neutral-950 pointer-events-none leading-snug" style="font-size: {12 * scale * 1.3}px;">
                            {subject ? (subject.toLowerCase().startsWith('betreff:') ? subject : `Betreff: ${subject}`) : 'Geschäftsbrief'}
                        </div>
                        <div class="absolute -top-4 left-0 bg-sky-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1 whitespace-nowrap">
                            <Move class="w-2.5 h-2.5" />
                            <span>Betreff ({positions.betreff.x}, {positions.betreff.y})</span>
                        </div>
                    </div>

                    <!-- 6. DRAGGABLE: Fließtext & Unterschrift -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div 
                        class="absolute cursor-move group transition-shadow rounded-lg p-1 {activeDragKey === 'body' ? 'ring-2 ring-sky-500 bg-sky-50/30 shadow-lg z-30' : 'hover:ring-1 hover:ring-sky-400 hover:bg-sky-50/10 z-10'}"
                        style="left: {positions.body.x * scale}px; top: {positions.body.y * scale}px; width: {positions.body.w * scale}px; min-height: {positions.body.h * scale}px;"
                        onmousedown={(e) => startDrag(e, 'body')}
                        ontouchstart={(e) => startDrag(e, 'body')}
                        title="Brieftext & Unterschrift verschieben"
                    >
                        <div class="space-y-3 text-neutral-800 pointer-events-none leading-relaxed" style="font-size: {10.5 * scale * 1.3}px;">
                            <div class="font-semibold text-neutral-900">
                                {salutationLine}
                            </div>

                            <div class="whitespace-pre-line text-neutral-700">
                                {letterBody || '(Bitte verfassen Sie Ihren Brieftext im linken Editor...)'}
                            </div>

                            <div class="pt-2">
                                <div>{closingLine}</div>
                                <div class="font-bold text-neutral-900 mt-4">{senderName || (currentCompany?.name || '')}</div>
                            </div>
                        </div>
                        <div class="absolute -top-4 left-0 bg-sky-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1 whitespace-nowrap">
                            <Move class="w-2.5 h-2.5" />
                            <span>Fließtext ({positions.body.x}, {positions.body.y})</span>
                        </div>
                    </div>

                    <!-- Deutlicher visueller Hinweis: Keine Fußzeile! -->
                    <div class="absolute bottom-2 inset-x-0 text-center text-[7px] text-neutral-300 uppercase tracking-widest pointer-events-none">
                        DIN 5008 • Ohne Fußzeile
                    </div>

                </div>

            </div>

        </div>

        <!-- Sticky Footer / Aktionsleiste -->
        <div class="px-6 py-4 bg-neutral-950 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <div class="flex items-center gap-2 text-xs text-neutral-400">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Elemente frei positionierbar • Maßstabsgerecht im PDF übernommen</span>
            </div>

            <div class="flex items-center gap-2.5 w-full sm:w-auto">
                <button 
                    type="button" 
                    onclick={close} 
                    class="flex-1 sm:flex-initial py-2.5 px-5 text-xs sm:text-sm font-bold text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-750 border border-neutral-700/80 hover:border-neutral-600 rounded-xl min-h-[44px] flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs"
                >
                    Abbrechen
                </button>

                <button 
                    type="button" 
                    disabled={isGenerating}
                    onclick={handleGeneratePdf} 
                    class="bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-600 hover:from-sky-400 hover:to-indigo-500 text-white flex-1 sm:flex-initial py-2.5 px-6 text-xs sm:text-sm font-bold rounded-xl min-h-[44px] flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none border border-sky-400/30"
                >
                    {#if isGenerating}
                        <span class="inline-block animate-spin">⏳</span>
                        <span>Erstelle individuelles PDF...</span>
                    {:else}
                        <span>📄</span>
                        <span>PDF generieren & Vorschau</span>
                    {/if}
                </button>
            </div>
        </div>

    </div>
</dialog>

<!-- Integriertes Vorschau-Modal (zeigt das generierte PDF an und bietet Druck & Download) -->
<PdfPreviewModal bind:this={previewModal} />
