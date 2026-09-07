<script lang="ts">
    import type { CanvasField } from "$lib/services/editorService.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    let { field = $bindable(), allFields = [], isSelected, onSelect, isHeaderFooter = false, marginTop = 250, marginBottom = 150, zoomScale = 1 } = $props<{
        field: CanvasField;
        allFields: CanvasField[];
        isSelected: boolean;
        onSelect: () => void;
        isHeaderFooter?: boolean;
        marginTop?: number;
        marginBottom?: number;
        zoomScale?: number;
    }>();

    let userCompany = $derived.by(() => {
        const user = pb.authStore.model;
        let cId = user?.company;
        if (Array.isArray(cId)) cId = cId[0];
        if (cId) return orgaStore.company?.data?.find((c: any) => c.id === cId);
        return orgaStore.company?.data?.[0];
    });

    let isDragging = false;
    let isResizing = false;
    let startX = 0; let startY = 0;
    let initialFieldX = 0; let initialFieldY = 0;
    let initialFieldW = 0; let initialFieldH = 0;
    
    let snapLineX = $state<number | null>(null);
    let snapLineY = $state<number | null>(null);
    const snapThreshold = 6;
    
    let textSpan: HTMLElement | null = $state(null);
    let contentContainer: HTMLDivElement | null = $state(null);
    let elementHeight = $state(0);

    $effect(() => {
        if (field.type === 'text' && field.style.dynamicHeight && textSpan && contentContainer) {
            // Die exakte Höhe messen, da der Text durch die Floats "auseinandergezogen" wird
            const containerRect = contentContainer.getBoundingClientRect();
            const textRect = textSpan.getBoundingClientRect();
            const actualHeight = textRect.bottom - containerRect.top + (field.style.padding || 0);
            
            if (actualHeight > 0 && Math.abs(field.h - actualHeight) > 2) {
                field.h = actualHeight;
            }
        } else if (elementHeight > 0 && field.type === 'table') {
            if (Math.abs(field.h - elementHeight) > 2) {
                field.h = elementHeight;
            }
        }
    });

    // Erstellt dynamisch die unsichtbaren CSS-Sperrblöcke für Kopf- und Fußzeilen
    let shapeOutside = $derived.by(() => {
        if (field.type !== 'text' || !field.style.dynamicHeight) return '';

        let points = [];
        const pad = field.style.padding || 0;
        
        for (let p = 0; p < 20; p++) {
            let gapStart = (p + 1) * 1123 - (marginBottom || 150) - field.y - pad;
            let gapEnd = (p + 1) * 1123 + (marginTop || 250) - field.y - pad;
            
            if (gapEnd > 0) {
                let s = Math.max(0, gapStart);
                let e = gapEnd;
                if (s < e) {
                    points.push(`0px ${s}px`, `100% ${s}px`, `100% ${e}px`, `0px ${e}px`);
                }
            }
        }
        
        return points.length > 0 ? `polygon(${points.join(', ')})` : '';
    });

    // Berechnet die sichtbaren Hintergrund-Segmente (Visuelles Splitting an Kopf-/Fußzeilen)
    let backgroundSegments = $derived.by(() => {
        if (field.type !== 'text' || !field.style.dynamicHeight) {
            return [{ top: 0, height: field.h }];
        }
        
        const segments = [];
        let currentRelY = 0;
        
        for (let p = 0; p < 20; p++) {
            let gapStart = (p + 1) * 1123 - (marginBottom || 150) - field.y;
            let gapEnd = (p + 1) * 1123 + (marginTop || 250) - field.y;
            
            if (gapEnd <= currentRelY) continue;
            if (gapStart > field.h) break;
            
            if (gapStart > currentRelY) {
                segments.push({ top: currentRelY, height: gapStart - currentRelY });
            }
            
            currentRelY = Math.max(currentRelY, gapEnd);
            if (currentRelY >= field.h) break;
        }
        
        if (currentRelY < field.h) {
            segments.push({ top: currentRelY, height: field.h - currentRelY });
        }
        
        const validSegments = segments.filter(s => s.height > 0);
        return validSegments.length > 0 ? validSegments : [{ top: 0, height: field.h }];
    });

    function calculateMove(dx: number, dy: number) {
        let targetX = Math.max(0, initialFieldX + dx);
        let targetY = Math.max(0, initialFieldY + dy);
        let targetW = field.w;
        let targetH = field.h;

        snapLineX = null;
        snapLineY = null;

        let myEdgesX = [targetX, targetX + targetW / 2, targetX + targetW];
        let myEdgesY = [targetY, targetY + targetH / 2, targetY + targetH];

        let minDiffX = snapThreshold;
        let minDiffY = snapThreshold;

        for (const other of allFields) {
            if (other.id === field.id) continue;
            
            let otherEdgesX = [other.x, other.x + other.w / 2, other.x + other.w];
            let otherEdgesY = [other.y, other.y + other.h / 2, other.y + other.h];

            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    if (Math.abs(myEdgesX[i] - otherEdgesX[j]) < minDiffX) {
                        minDiffX = Math.abs(myEdgesX[i] - otherEdgesX[j]);
                        targetX = otherEdgesX[j] - (i === 0 ? 0 : (i === 1 ? targetW / 2 : targetW));
                        snapLineX = otherEdgesX[j];
                    }
                    if (Math.abs(myEdgesY[i] - otherEdgesY[j]) < minDiffY) {
                        minDiffY = Math.abs(myEdgesY[i] - otherEdgesY[j]);
                        targetY = otherEdgesY[j] - (i === 0 ? 0 : (i === 1 ? targetH / 2 : targetH));
                        snapLineY = otherEdgesY[j];
                    }
                }
            }
        }

        field.x = Math.max(0, targetX);
        field.y = Math.max(0, targetY);
    }

    function calculateResize(dx: number, dy: number) {
        let targetW = Math.max(20, initialFieldW + dx);
        let targetH = Math.max(20, initialFieldH + dy);

        let currentRightEdge = field.x + targetW;
        let currentBottomEdge = field.y + targetH;

        snapLineX = null;
        snapLineY = null;

        let minDiffX = snapThreshold;
        let minDiffY = snapThreshold;

        for (const other of allFields) {
            if (other.id === field.id) continue;
            
            let otherEdgesX = [other.x, other.x + other.w / 2, other.x + other.w];
            let otherEdgesY = [other.y, other.y + other.h / 2, other.y + other.h];

            // X-Snapping für die rechte Kante (Breite)
            for (let j = 0; j < 3; j++) {
                if (Math.abs(currentRightEdge - otherEdgesX[j]) < minDiffX) {
                    minDiffX = Math.abs(currentRightEdge - otherEdgesX[j]);
                    targetW = Math.max(20, otherEdgesX[j] - field.x);
                    snapLineX = otherEdgesX[j];
                }
            }

            // Y-Snapping für die untere Kante (Höhe)
            for (let j = 0; j < 3; j++) {
                if (Math.abs(currentBottomEdge - otherEdgesY[j]) < minDiffY) {
                    minDiffY = Math.abs(currentBottomEdge - otherEdgesY[j]);
                    targetH = Math.max(20, otherEdgesY[j] - field.y);
                    snapLineY = otherEdgesY[j];
                }
            }
        }

        field.w = targetW;
        field.h = targetH;
    }

    function startDrag(e: MouseEvent) {
        e.stopPropagation();
        onSelect();
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        initialFieldX = field.x; initialFieldY = field.y;
        window.addEventListener('mousemove', onDrag);
        window.addEventListener('mouseup', stopDrag);
    }

    function onDrag(e: MouseEvent) {
        if (!isDragging) return;
        const scale = zoomScale || 1;
        const dx = (e.clientX - startX) / scale;
        const dy = (e.clientY - startY) / scale;
        calculateMove(dx, dy);
    }

    function stopDrag() {
        isDragging = false;
        snapLineX = null;
        snapLineY = null;
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
    }

    function startTouchDrag(e: TouchEvent) {
        if (e.touches.length !== 1) return;
        e.stopPropagation();
        onSelect();
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        initialFieldX = field.x;
        initialFieldY = field.y;
        window.addEventListener('touchmove', onTouchDrag, { passive: false });
        window.addEventListener('touchend', stopTouchDrag);
        window.addEventListener('touchcancel', stopTouchDrag);
    }

    function onTouchDrag(e: TouchEvent) {
        if (!isDragging || e.touches.length !== 1) return;
        if (e.cancelable) e.preventDefault();
        const scale = zoomScale || 1;
        const dx = (e.touches[0].clientX - startX) / scale;
        const dy = (e.touches[0].clientY - startY) / scale;
        calculateMove(dx, dy);
    }

    function stopTouchDrag() {
        isDragging = false;
        snapLineX = null;
        snapLineY = null;
        window.removeEventListener('touchmove', onTouchDrag);
        window.removeEventListener('touchend', stopTouchDrag);
        window.removeEventListener('touchcancel', stopTouchDrag);
    }

    function startResize(e: MouseEvent) {
        e.stopPropagation();
        onSelect();
        isResizing = true;
        startX = e.clientX; startY = e.clientY;
        initialFieldW = field.w; initialFieldH = field.h;
        window.addEventListener('mousemove', onResize);
        window.addEventListener('mouseup', stopResize);
    }

    function onResize(e: MouseEvent) {
        if (!isResizing) return;
        const scale = zoomScale || 1;
        const dx = (e.clientX - startX) / scale;
        const dy = (e.clientY - startY) / scale;
        calculateResize(dx, dy);
    }

    function stopResize() {
        isResizing = false;
        snapLineX = null;
        snapLineY = null;
        window.removeEventListener('mousemove', onResize);
        window.removeEventListener('mouseup', stopResize);
    }

    function startTouchResize(e: TouchEvent) {
        if (e.touches.length !== 1) return;
        e.stopPropagation();
        onSelect();
        isResizing = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        initialFieldW = field.w;
        initialFieldH = field.h;
        window.addEventListener('touchmove', onTouchResize, { passive: false });
        window.addEventListener('touchend', stopTouchResize);
        window.addEventListener('touchcancel', stopTouchResize);
    }

    function onTouchResize(e: TouchEvent) {
        if (!isResizing || e.touches.length !== 1) return;
        if (e.cancelable) e.preventDefault();
        const scale = zoomScale || 1;
        const dx = (e.touches[0].clientX - startX) / scale;
        const dy = (e.touches[0].clientY - startY) / scale;
        calculateResize(dx, dy);
    }

    function stopTouchResize() {
        isResizing = false;
        snapLineX = null;
        snapLineY = null;
        window.removeEventListener('touchmove', onTouchResize);
        window.removeEventListener('touchend', stopTouchResize);
        window.removeEventListener('touchcancel', stopTouchResize);
    }

    function formatContent(text: string) {
        if (!text) return '';
        
        // Übersetzt die technischen Variablen in saubere, verständliche Namen
        const mappings: Record<string, string> = {
            'client.salutation': 'Klient: Anrede',
            'client.salutation_formal': 'Klient: Formelle Anrede',
            'client.name_first': 'Klient: Vorname',
            'client.name_last': 'Klient: Nachname',
            'client.street': 'Klient: Straße',
            'client.housenr': 'Klient: Hausnr.',
            'client.zip': 'Klient: PLZ',
            'client.city': 'Klient: Stadt',
            'client.phone': 'Klient: Telefon',
            'client.handy': 'Klient: Mobil',
            'client.insurance_nr': 'Klient: Vers.-Nr.',
            'client.birthdate': 'Klient: Geburtsdatum',
            'client.level_of_care': 'Klient: Pflegegrad',
            'client.hourly_wage': 'Klient: Stundensatz',
            'client.km_rate': 'Klient: KM-Pauschale',
            'client.tax_rate': 'Klient: Steuersatz',
            'client.signature': 'Klient: Unterschrift',
            'insurance.name': 'Kasse: Name',
            'insurance.type': 'Kasse: Art',
            'insurance.street': 'Kasse: Straße',
            'insurance.zip': 'Kasse: PLZ',
            'insurance.city': 'Kasse: Stadt',
            'insurance.phone': 'Kasse: Telefon',
            'insurance.email': 'Kasse: E-Mail',
            'caregiver.salutation': 'Betreuer: Anrede',
            'caregiver.name_first': 'Betreuer: Vorname',
            'caregiver.name_last': 'Betreuer: Nachname',
            'caregiver.company_name': 'Betreuer: Firmenname',
            'caregiver.street': 'Betreuer: Straße',
            'caregiver.housenr': 'Betreuer: Hausnr.',
            'caregiver.zip': 'Betreuer: PLZ',
            'caregiver.city': 'Betreuer: Stadt',
            'caregiver.phone': 'Betreuer: Telefon',
            'caregiver.email': 'Betreuer: E-Mail',
            'caregiver.signature': 'Betreuer: Unterschrift',
            'careperson.name': 'Pflegeperson: Name',
            'careperson.salutation': 'Pflegeperson: Anrede',
            'careperson.relation': 'Pflegeperson: Verwandtschaft',
            'careperson.birthdate': 'Pflegeperson: Geburtsdatum',
            'careperson.street': 'Pflegeperson: Straße',
            'careperson.housenr': 'Pflegeperson: Hausnr.',
            'careperson.zip': 'Pflegeperson: PLZ',
            'careperson.city': 'Pflegeperson: Stadt',
            'careperson.phone': 'Pflegeperson: Telefon',
            'careperson.email': 'Pflegeperson: E-Mail',
            'careperson.reason': 'Pflegeperson: Verhinderungsgrund',
            'careperson.care_type': 'Pflegeperson: Art (stundenweise)',
            'careperson.pre_care': 'Pflegeperson: Vorpflegezeit (≥ 6 Mon.)',
            'careperson.signature': 'Pflegeperson: Unterschrift',
            'inheritor.salutation': 'Pflegeperson: Anrede',
            'inheritor.name_first': 'Pflegeperson: Vorname',
            'inheritor.name_last': 'Pflegeperson: Nachname',
            'inheritor.company_name': 'Pflegeperson: Rolle',
            'inheritor.street': 'Pflegeperson: Straße',
            'inheritor.housenr': 'Pflegeperson: Hausnr.',
            'inheritor.zip': 'Pflegeperson: PLZ',
            'inheritor.city': 'Pflegeperson: Stadt',
            'inheritor.phone': 'Pflegeperson: Telefon',
            'inheritor.email': 'Pflegeperson: E-Mail',
            'inheritor.signature': 'Pflegeperson: Unterschrift',
            'contact.name_first': 'Kontakt: Vorname',
            'contact.name_last': 'Kontakt: Nachname',
            'contact.signature': 'Kontakt: Unterschrift',
            'user.name_first': 'Mitarbeiter: Vorname',
            'user.name_last': 'Mitarbeiter: Nachname',
            'user.street': 'Mitarbeiter: Straße',
            'user.housenr': 'Mitarbeiter: Hausnr.',
            'user.zip': 'Mitarbeiter: PLZ',
            'user.city': 'Mitarbeiter: Stadt',
            'user.tel': 'Mitarbeiter: Telefon',
            'user.handy': 'Mitarbeiter: Mobil',
            'user.email': 'Mitarbeiter: E-Mail',
            'user.signature': 'Mitarbeiter: Unterschrift',
            'company.name': 'Firma: Name',
            'company.street': 'Firma: Straße',
            'company.housenr': 'Firma: Hausnr.',
            'company.zip': 'Firma: PLZ',
            'company.city': 'Firma: Stadt',
            'company.number_telephone': 'Firma: Telefon',
            'company.number_mobile': 'Firma: Mobil',
            'company.email': 'Firma: E-Mail',
            'company.website': 'Firma: Web',
            'company.vatcode': 'Firma: Steuernummer',
            'company.ik_number': 'Firma: IK-Nummer',
            'company.bank_name': 'Bank: Name',
            'company.bank_iban': 'Bank: IBAN',
            'company.bank_bic': 'Bank: BIC',
            'invoice.number': 'Rechnung: Nummer',
            'date.today': 'Heute',
            'date.today_+1y': 'Heute + 1 Jahr',
            'invoice.issue_date': 'Rechnung: Datum',
            'invoice.due_date': 'Rechnung: Fällig',
            'invoice.service_period': 'Rechnung: Zeitraum',
            'leistungszeitraum': 'Rechnung: Zeitraum'
        };

        return text.replace(/\{\{([^}]+)\}\}/g, (match, p1) => {
            const key = p1.trim();
            const label = mappings[key] || key;
            // Rendert die Variable als ein visuelles, schickes Etikett (Badge) passend zur Schriftgröße des Elements
            return `<span class="bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-md text-[0.85em] font-bold border border-brand-200/60 shadow-sm whitespace-nowrap inline-block align-baseline mx-0.5 select-none" contenteditable="false">${label}</span>`;
        });
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    class="absolute group {isSelected ? '' : 'select-none'}"
    style="cursor: {isSelected ? 'default' : 'move'}; left: {field.x}px; top: {field.y}px; width: {field.w}px; height: {field.type === 'table' || field.style.dynamicHeight ? 'auto' : field.h + 'px'}; min-height: {field.type === 'table' || field.style.dynamicHeight ? '50px' : field.h + 'px'}; z-index: {isSelected ? 40 : (isHeaderFooter ? 30 : 10)}; touch-action: manipulation;"
    onmousedown={startDrag}
    ontouchstart={(e) => {
        if ((e.target as HTMLElement)?.getAttribute('contenteditable') === 'true') return;
        startTouchDrag(e);
    }}
>
    <!-- Visual background and selection ring (Gesplittet für Kopf-/Fußzeilen-Gaps) -->
    {#each backgroundSegments as segment}
        <div class="absolute inset-x-0 pointer-events-none transition-shadow {isSelected ? 'ring-2 ring-brand-500 shadow-lg' : 'ring-1 ring-neutral-200/50 group-hover:ring-brand-300'}" style="top: {segment.top}px; height: {segment.height}px; background-color: {field.style.backgroundColor};"></div>
    {/each}

    <!-- Snapping Hilfslinien -->
    {#if snapLineX !== null}
        <div class="absolute bg-brand-500/40 pointer-events-none z-0" style="left: {snapLineX - field.x}px; top: -2000px; bottom: -2000px; width: 1px;"></div>
    {/if}
    {#if snapLineY !== null}
        <div class="absolute bg-brand-500/40 pointer-events-none z-0" style="top: {snapLineY - field.y}px; left: -2000px; right: -2000px; height: 1px;"></div>
    {/if}

    <!-- Rendering des Inhalts -->
    <div bind:this={contentContainer} class="relative w-full {field.type === 'table' || field.style.dynamicHeight ? 'h-auto overflow-visible block' : 'h-full overflow-hidden flex flex-col'}" style="color: {field.style.color}; font-size: {field.style.fontSize}px; font-weight: {field.style.fontWeight}; text-align: {field.style.textAlign}; padding: {field.style.padding}px; justify-content: {field.style.verticalAlign === 'middle' ? 'center' : field.style.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start'};">
        
        {#if field.type === 'text'}
            {#if field.style.dynamicHeight && shapeOutside}
                <!-- Das unsichtbare Magie-Element, das den Text zur Seite (bzw. nach unten) drängt -->
                <div style="float: left; width: 100%; height: {field.h + 2000}px; shape-outside: {shapeOutside}; pointer-events: none; opacity: 0;"></div>
            {/if}
            {#if isSelected}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                    bind:this={textSpan}
                    contenteditable="true"
                    bind:innerHTML={field.content}
                    class="outline-none whitespace-pre-wrap w-full cursor-text"
                    style="min-height: 1em;"
                    onmousedown={(e) => e.stopPropagation()}
                ></div>
            {:else}
                <div 
                    bind:this={textSpan}
                    class="whitespace-pre-wrap w-full cursor-move"
                    style="min-height: 1em;"
                >{@html formatContent(field.content)}</div>
            {/if}
        {:else if field.type === 'logo'}
            {#if userCompany?.logo}
                <div class="w-full h-full flex items-center justify-center bg-transparent">
                    <img src={pb.files.getURL(userCompany, userCompany.logo)} class="max-w-full max-h-full object-contain" alt="Logo" crossorigin="anonymous" />
                </div>
            {:else}
                <div class="w-full h-full border-2 border-dashed border-neutral-300 flex items-center justify-center bg-neutral-50/50 text-neutral-400 font-bold tracking-widest uppercase text-sm">
                    Firmenlogo Platzhalter
                </div>
            {/if}
        {:else if field.type === 'table'}
            <div bind:clientHeight={elementHeight} class="w-full h-full bg-transparent">
                <table class="w-full text-left border-collapse table-fixed" style="font-size: {field.tableConfig?.fontSize ? field.tableConfig.fontSize + 'px' : '12px'};">
                    {#if field.tableConfig?.showHeaders !== false}
                        <thead>
                            <tr style="background-color: {field.tableConfig?.headerBackgroundColor || '#f4f4f5'}; color: {field.tableConfig?.headerTextColor || '#000'}; border-bottom: {(field.tableConfig?.showBorderHeader ?? true) ? (field.tableConfig?.borderWidth || 1) + 'px solid ' + (field.tableConfig?.borderColor || '#cbd5e1') : 'none'};">
                                {#each field.tableConfig?.columns || [] as col}
                                    <th style="padding: {field.tableConfig?.cellPadding ?? 6}px 4px; width: {col.width}%; text-align: {field.tableConfig?.headerTextAlign || col.align}; font-weight: bold;">
                                        <input type="text" bind:value={col.name} class="bg-transparent outline-none w-full hover:bg-black/5 rounded transition-colors" style="text-align: inherit; font-weight: inherit;" />
                                    </th>
                                {/each}
                            </tr>
                        </thead>
                    {/if}
                    <tbody class="text-neutral-600">
                        {#if field.tableConfig?.includeTimeRecords !== false}
                            <tr style="border-bottom: {(field.tableConfig?.showBorderRows ?? true) ? ((field.tableConfig?.borderWidth || 1) * 0.5) + 'px solid ' + (field.tableConfig?.borderColor || '#cbd5e1') : 'none'}; vertical-align: {field.tableConfig?.rowVerticalAlign || 'top'};">
                                {#each field.tableConfig?.columns || [] as col}
                                    <td style="padding: {field.tableConfig?.cellPadding ?? 6}px 4px; text-align: {col.align};" class="truncate">{col.type === 'pos' ? '1' : col.type === 'date' ? '12.05.2026' : col.type === 'duration' ? '2.00 h' : col.type === 'title' ? (field.tableConfig.staticDescription || 'Betreuung: Alltagshilfe') : col.type === 'price' ? '40,00 €' : '80,00 €'}</td>
                                {/each}
                            </tr>
                        {/if}
                        {#if field.tableConfig?.includeDriveLumpSum !== false}
                            <tr style="border-bottom: {(field.tableConfig?.showBorderRows ?? true) ? ((field.tableConfig?.borderWidth || 1) * 0.5) + 'px solid ' + (field.tableConfig?.borderColor || '#cbd5e1') : 'none'}; vertical-align: {field.tableConfig?.rowVerticalAlign || 'top'};">
                                {#each field.tableConfig?.columns || [] as col}
                                    <td style="padding: {field.tableConfig?.cellPadding ?? 6}px 4px; text-align: {col.align};" class="truncate">{col.type === 'pos' ? '2' : col.type === 'date' ? '12.05.2026' : col.type === 'duration' ? '1' : col.type === 'title' ? 'Anfahrt' : col.type === 'price' ? '5,00 €' : '5,00 €'}</td>
                                {/each}
                            </tr>
                        {/if}
                        {#if field.tableConfig?.includeDriveKm !== false}
                            <tr style="border-bottom: {(field.tableConfig?.showBorderRows ?? true) ? ((field.tableConfig?.borderWidth || 1) * 0.5) + 'px solid ' + (field.tableConfig?.borderColor || '#cbd5e1') : 'none'}; vertical-align: {field.tableConfig?.rowVerticalAlign || 'top'};">
                                {#each field.tableConfig?.columns || [] as col}
                                    <td style="padding: {field.tableConfig?.cellPadding ?? 6}px 4px; text-align: {col.align};" class="truncate">{col.type === 'pos' ? '3' : col.type === 'date' ? '12.05.2026' : col.type === 'duration' ? '15 km' : col.type === 'title' ? 'Fahrtkosten (15 km)' : col.type === 'price' ? '0,30 €' : '4,50 €'}</td>
                                {/each}
                            </tr>
                        {/if}
                        {#if field.tableConfig?.includeExpenditures !== false}
                            <tr style="border-bottom: {(field.tableConfig?.showBorderRows ?? true) ? ((field.tableConfig?.borderWidth || 1) * 0.5) + 'px solid ' + (field.tableConfig?.borderColor || '#cbd5e1') : 'none'}; vertical-align: {field.tableConfig?.rowVerticalAlign || 'top'};">
                                {#each field.tableConfig?.columns || [] as col}
                                    <td style="padding: {field.tableConfig?.cellPadding ?? 6}px 4px; text-align: {col.align};" class="truncate">{col.type === 'pos' ? '4' : col.type === 'date' ? '12.05.2026' : col.type === 'duration' ? '1' : col.type === 'title' ? 'Auslage: Apothekeneinkauf' : col.type === 'price' ? '14,50 €' : '14,50 €'}</td>
                                {/each}
                            </tr>
                        {/if}
                    </tbody>
                </table>
                <!-- Dummy Footer -->
                {#if field.tableConfig?.includeTotalNetto !== false || field.tableConfig?.includeTotalTax !== false || field.tableConfig?.includeTotalBrutto !== false}
                    <div class="ml-auto mt-3.75 pt-2.5 flex flex-col" style="width: {field.tableConfig?.footerWidth ?? 200}px; border-top: {field.tableConfig?.borderWidth || 1}px solid {field.tableConfig?.borderColor || '#cbd5e1'}; font-size: {field.tableConfig?.fontSize ? field.tableConfig.fontSize + 'px' : '12px'}; text-align: {field.tableConfig?.footerTextAlign || 'right'};">
                            {#if field.tableConfig?.includeTotalNetto !== false}
                                <div class="flex justify-between mb-1"><span>Netto:</span> <span>104,00 €</span></div>
                            {/if}
                            {#if field.tableConfig?.includeTotalTax !== false}
                                <div class="flex justify-between mb-1"><span>MwSt (0%):</span> <span>0,00 €</span></div>
                            {/if}
                            {#if field.tableConfig?.includeTotalBrutto !== false}
                                <div class="flex justify-between font-bold" style="font-size: {field.tableConfig?.fontSize ? (field.tableConfig.fontSize + 1) + 'px' : '13px'};"><span>Gesamt:</span> <span>104,00 €</span></div>
                            {/if}
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Resize Handle -->
    {#if isSelected}
        <div 
            class="absolute w-6 h-6 sm:w-4 sm:h-4 bg-brand-600 border-2 border-white rounded-full cursor-se-resize shadow-lg z-50 flex items-center justify-center -bottom-3 -right-3 sm:-bottom-2 sm:-right-2 touch-none select-none active:scale-110"
            onmousedown={startResize}
            ontouchstart={startTouchResize}
            title="Größe anpassen"
            role="button"
            tabindex="0"
        ></div>
    {/if}

    <!-- Move Handle -->
    {#if isSelected}
        <div 
            class="absolute w-8 h-8 sm:w-6 sm:h-6 bg-white border-2 border-brand-500 rounded-lg text-brand-600 cursor-move shadow-lg z-50 flex items-center justify-center hover:bg-brand-50 transition-colors -top-4 -left-4 sm:-top-3 sm:-left-3 touch-none select-none active:scale-110" 
            onmousedown={startDrag}
            ontouchstart={startTouchDrag}
            title="Element verschieben"
            role="button"
            tabindex="0"
        >
            <svg class="w-4 h-4 sm:w-3.5 sm:h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
        </div>
    {/if}
</div>