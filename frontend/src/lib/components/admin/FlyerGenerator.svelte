<script lang="ts">
    import { onMount } from 'svelte';
    
    type ElementType = 'text' | 'box' | 'image';
    interface FlyerElement {
        id: string; type: ElementType; content: string;
        x: number; y: number; w: number; h: number;
        fontSize: number; color: string; bgColor: string;
        textAlign: 'left' | 'center' | 'right' | 'justify';
        fontWeight: 'normal' | 'bold' | '900';
        borderRadius: number; zIndex: number; padding: number;
        borderWidth?: number; borderColor?: string;
    }

    interface Sheet { id: string; name: string; elements: FlyerElement[]; }

    const STORAGE_KEY = 'orgaflow_flyer_state';

    function getDefaultSheets(): Sheet[] {
        return [
            {
                id: 'sheet1', name: 'Außenseite (Bogen 1)', elements: [
                    // Col 1: Einklapper Links (0-97mm)
                    { id: 'bg1', type: 'box', content: '', x: 0, y: 0, w: 97, h: 210, fontSize: 12, color: '#000000', bgColor: '#fef3c7', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 1, padding: 0 },
                    { id: 't1', type: 'text', content: 'Auf uns können\nSie bauen', x: 10, y: 20, w: 77, h: 0, fontSize: 24, color: '#134e4a', bgColor: 'transparent', textAlign: 'left', fontWeight: 'bold', borderRadius: 0, zIndex: 2, padding: 0 },
                    { id: 't2', type: 'text', content: '🔒 Verschwiegen wie ein Tresor\nIhre Daten und Anliegen sind absolut sicher.\n\n🛡️ Sicherheitsnetz für alle Fälle\nWir sind da, wenn das Leben mal unvorhersehbar wird.\n\n📝 Klipp & Klar dokumentiert\nTransparente Berichte für Sie und Ihre Angehörigen.', x: 10, y: 55, w: 77, h: 0, fontSize: 11, color: '#134e4a', bgColor: 'transparent', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 2, padding: 0 },
                    { id: 't3', type: 'text', content: 'Was ist Seniorenassistenz?\nSie sind der Kapitän, wir der Navigator.\n\nWas, wenn was schiefgeht?\nWir verfügen über eine umfassende Betriebshaftpflichtversicherung.', x: 10, y: 150, w: 77, h: 0, fontSize: 9, color: '#4b5563', bgColor: '#ffffff', textAlign: 'left', fontWeight: 'normal', borderRadius: 4, zIndex: 2, padding: 4 },
                    
                    // Col 2: Rückseite Mitte (97-197mm)
                    { id: 'bg2', type: 'box', content: '', x: 97, y: 0, w: 100, h: 210, fontSize: 12, color: '#000000', bgColor: '#134e4a', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 1, padding: 0 },
                    { id: 't4', type: 'text', content: 'Die Gesichter hinter der Hilfe', x: 107, y: 20, w: 80, h: 0, fontSize: 20, color: '#ffffff', bgColor: 'transparent', textAlign: 'left', fontWeight: 'bold', borderRadius: 0, zIndex: 2, padding: 0 },
                    { id: 't5', type: 'text', content: 'Kein unpersönliches Callcenter. Bei uns landen Sie direkt bei Menschen, die Ihnen zuhören.', x: 107, y: 35, w: 80, h: 0, fontSize: 10, color: '#ccfbf1', bgColor: 'transparent', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 2, padding: 0 },
                    { id: 't6', type: 'text', content: 'Tommy Jenzsch\nHalle (Saale)\n📞 0151 57515432\n\nDoreen Jenzsch\nLutherstadt Wittenberg\n📞 0160 7303830', x: 107, y: 65, w: 80, h: 0, fontSize: 10, color: '#f97316', bgColor: '#0f3d3a', textAlign: 'left', fontWeight: 'bold', borderRadius: 4, zIndex: 3, padding: 5 },
                    { id: 't7', type: 'text', content: 'Pflegegrad (1-5) vorhanden?\nSichern Sie sich mtl. 131 € Entlastungsbetrag.', x: 107, y: 130, w: 80, h: 0, fontSize: 10, color: '#78350f', bgColor: '#ffedd5', textAlign: 'center', fontWeight: 'bold', borderRadius: 4, zIndex: 2, padding: 4 },
                    { id: 't8', type: 'text', content: '☕ Kaffee steht bereit!\nWann dürfen wir kommen?', x: 107, y: 165, w: 80, h: 0, fontSize: 12, color: '#ffffff', bgColor: 'transparent', textAlign: 'center', fontWeight: 'bold', borderRadius: 0, zIndex: 2, padding: 0 },

                    // Col 3: Titelseite Rechts (197-297mm)
                    { id: 'bg3', type: 'box', content: '', x: 197, y: 0, w: 100, h: 210, fontSize: 12, color: '#000000', bgColor: '#ffffff', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 1, padding: 0 },
                    { id: 't9', type: 'image', content: '/favicon.png', x: 232, y: 25, w: 30, h: 30, fontSize: 12, color: '#134e4a', bgColor: 'transparent', textAlign: 'center', fontWeight: 'normal', borderRadius: 0, zIndex: 2, padding: 0, borderWidth: 0, borderColor: '#000000' },
                    { id: 't10', type: 'text', content: 'Zuhause wohlfühlen.\nSelbstbestimmt bleiben.', x: 207, y: 65, w: 80, h: 0, fontSize: 24, color: '#134e4a', bgColor: 'transparent', textAlign: 'center', fontWeight: '900', borderRadius: 0, zIndex: 2, padding: 0 },
                    { id: 't11', type: 'text', content: 'Wir jonglieren Ihren Papierkram, begleiten Sie zum Arzt und zaubern Ordnung in den Alltag. Persönlich, verlässlich und liebevoll.', x: 207, y: 105, w: 80, h: 0, fontSize: 10, color: '#4b5563', bgColor: 'transparent', textAlign: 'center', fontWeight: 'normal', borderRadius: 0, zIndex: 2, padding: 0 },
                    { id: 't12', type: 'text', content: '✓ Kostenloses Kennenlernen\n✓ Keine Vertragsbindung\n✓ Arbeit nach Auftrag\n✓ Einzelabrechnung möglich', x: 212, y: 140, w: 70, h: 0, fontSize: 10, color: '#134e4a', bgColor: '#f0fdf4', textAlign: 'left', fontWeight: 'bold', borderRadius: 4, zIndex: 2, padding: 4 },
                    { id: 't13', type: 'text', content: '🔐 Zum Portal', x: 222, y: 185, w: 50, h: 0, fontSize: 12, color: '#ffffff', bgColor: '#134e4a', textAlign: 'center', fontWeight: 'bold', borderRadius: 4, zIndex: 2, padding: 4 },
                ]
            },
            {
                id: 'sheet2', name: 'Innenseite (Bogen 2)', elements: [
                    // Col 1: Innenseite Links (0-100mm)
                    { id: 'bg4', type: 'box', content: '', x: 0, y: 0, w: 100, h: 210, fontSize: 12, color: '#000000', bgColor: '#ffffff', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 1, padding: 0 },
                    { id: 't14', type: 'text', content: 'Ihre persönliche\nTask-Force für den Alltag', x: 10, y: 20, w: 80, h: 0, fontSize: 22, color: '#134e4a', bgColor: 'transparent', textAlign: 'left', fontWeight: '900', borderRadius: 0, zIndex: 2, padding: 0 },
                    { id: 't15', type: 'text', content: 'Egal ob Papierkrieg, Großeinkauf oder einfach nur jemand, der zuhört. Wir passen uns voll und ganz Ihren Wünschen an.', x: 10, y: 55, w: 80, h: 0, fontSize: 10, color: '#6b7280', bgColor: 'transparent', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 2, padding: 0 },
                    { id: 't16', type: 'text', content: '🤝 Alltagsbegleitung mit Herz\nOb Arztbesuch, Bankgeschäft oder der Gang zur Behörde: Wir sind Ihr sicherer Anker.\n\n🏡 Zuhause wohlfühlen\nWir schnappen uns den Einkaufszettel, gießen Blumen und sorgen für Ordnung.\n\n📱 Organisationstalent inklusive\nKrankenkasse, Pflegedienst, störrische Handwerker... Wir übernehmen das Telefon-Ping-Pong für Sie.', x: 10, y: 85, w: 80, h: 0, fontSize: 11, color: '#1f2937', bgColor: 'transparent', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 2, padding: 0 },

                    // Col 2: Innenseite Mitte (100-200mm)
                    { id: 'bg5', type: 'box', content: '', x: 100, y: 0, w: 100, h: 210, fontSize: 12, color: '#000000', bgColor: '#f0fdfa', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 1, padding: 0 },
                    { id: 't17', type: 'text', content: 'Unser gemeinsamer Weg', x: 110, y: 20, w: 80, h: 0, fontSize: 22, color: '#134e4a', bgColor: 'transparent', textAlign: 'center', fontWeight: '900', borderRadius: 0, zIndex: 2, padding: 0 },
                    { id: 't18', type: 'text', content: '☕ Tasse Kaffee\nUnverbindliches Beschnuppern bei Ihnen zu Hause.\n\n📄 Vorbereitung\nWir sortieren das Zettelchaos und notieren Fragen für den Arzt.\n\n🚗 Begleitung\nWir navigieren Sie sicher von A nach B.\n\n✨ Durchatmen\nWieder daheim heften wir alles ordentlich ab.', x: 115, y: 60, w: 70, h: 0, fontSize: 11, color: '#134e4a', bgColor: '#ffffff', textAlign: 'left', fontWeight: 'normal', borderRadius: 4, zIndex: 2, padding: 5 },

                    // Col 3: Einklapper Rechts (200-297mm)
                    { id: 'bg6', type: 'box', content: '', x: 200, y: 0, w: 97, h: 210, fontSize: 12, color: '#000000', bgColor: '#ffffff', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 1, padding: 0 },
                    { id: 't19', type: 'text', content: '💡 Gute Neuigkeiten:\nDie Kasse zahlt!', x: 215, y: 25, w: 67, h: 0, fontSize: 14, color: '#9a3412', bgColor: '#fff7ed', textAlign: 'left', fontWeight: 'bold', borderRadius: 4, zIndex: 3, padding: 5 },
                    { id: 't20', type: 'text', content: 'Da wir als anerkannter Betreuungsdienst oft direkt abrechnen können, kostet Sie unsere Hilfe meist keinen Cent aus eigener Tasche.', x: 215, y: 48, w: 67, h: 0, fontSize: 10, color: '#c2410c', bgColor: 'transparent', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 3, padding: 0 },
                    { id: 't21', type: 'text', content: 'Das Dreamteam für\nAngehörige & Betreuer', x: 210, y: 95, w: 77, h: 0, fontSize: 18, color: '#134e4a', bgColor: 'transparent', textAlign: 'left', fontWeight: '900', borderRadius: 0, zIndex: 2, padding: 0 },
                    { id: 't22', type: 'text', content: 'Wir drängen uns nicht auf, sondern springen da ein, wo der Schuh drückt. So wird aus Familie wieder echte Familienzeit.', x: 210, y: 125, w: 77, h: 0, fontSize: 10, color: '#4b5563', bgColor: 'transparent', textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 2, padding: 0 },
                    { id: 't23', type: 'text', content: '🎯 Clever vorsorgen\n\n🤝 Teamwork\n\n⚡ Sondersituationen', x: 210, y: 155, w: 77, h: 0, fontSize: 11, color: '#134e4a', bgColor: 'transparent', textAlign: 'left', fontWeight: 'bold', borderRadius: 0, zIndex: 2, padding: 0 },
                ]
            }
        ];
    }

    let sheets = $state<Sheet[]>(getDefaultSheets());
    let isLoaded = $state(false);

    let activeSheetIndex = $state(0);
    let selectedElementId = $state<string | null>(null);
    let isFullscreen = $state(false);
    let zoom = $state(0.7);
    
    // Drag & Drop State
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initX = 0;
    let initY = 0;
    
    let activeSheet = $derived(sheets[activeSheetIndex]);
    let selectedElementIndex = $derived(activeSheet.elements.findIndex(e => e.id === selectedElementId));

    onMount(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                sheets = JSON.parse(stored);
            } catch (e) {
                console.error("Gespeicherter Flyer konnte nicht geladen werden.", e);
            }
        }
        isLoaded = true;
    });

    $effect(() => {
        if (isLoaded && typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
        }
    });

    function addElement(type: ElementType) {
        let content = type === 'text' ? 'Neuer Text' : '';
        if (type === 'image') content = '/favicon.png';
        
        const newEl: FlyerElement = {
            id: crypto.randomUUID(), type, content,
            x: 20, y: 20, w: type === 'box' ? 50 : 60, h: (type === 'box' || type === 'image') ? 50 : 0,
            fontSize: 12, color: type === 'text' ? '#134e4a' : '#000000', bgColor: type === 'box' ? '#e2e8f0' : 'transparent',
            textAlign: 'left', fontWeight: 'normal', borderRadius: 0, zIndex: 10, padding: 0,
            borderWidth: 0, borderColor: '#000000'
        };
        sheets[activeSheetIndex].elements.push(newEl);
        selectedElementId = newEl.id;
    }

    function handlePointerDown(e: PointerEvent, el: FlyerElement) {
        if (e.button !== 0) return; // Nur Linksklick
        e.preventDefault(); // Verhindert Textmarkierung beim Ziehen
        selectedElementId = el.id;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        initX = el.x;
        initY = el.y;
        (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
        e.stopPropagation();
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isDragging || !selectedElementId) return;
        const container = document.getElementById('flyer-sheet-interactive');
        if (!container) return;
        // Maßstab berechnen: A4 hat 297mm Breite.
        const mmToPx = container.getBoundingClientRect().width / 297;
        
        const dx = (e.clientX - dragStartX) / mmToPx;
        const dy = (e.clientY - dragStartY) / mmToPx;

        if (selectedElementIndex !== -1) {
            // Auf 1 Nachkommastelle runden für saubere Millimeter
            sheets[activeSheetIndex].elements[selectedElementIndex].x = Math.round((initX + dx) * 10) / 10;
            sheets[activeSheetIndex].elements[selectedElementIndex].y = Math.round((initY + dy) * 10) / 10;
        }
    }

    function handlePointerUp(e: PointerEvent) {
        isDragging = false;
        (e.currentTarget as HTMLElement)?.releasePointerCapture(e.pointerId);
    }

    function resetToDefault() {
        if (confirm("Wirklich alles auf das Standard-Design zurücksetzen? Deine ungespeicherten Änderungen gehen dabei verloren!")) {
            sheets = getDefaultSheets();
            selectedElementId = null;
        }
    }

    function printFlyer() {
        selectedElementId = null;
        
        setTimeout(() => {
            const printContent = document.getElementById('flyer-print-content');
            if (printContent) {
                const clonedNode = printContent.cloneNode(true) as HTMLElement;
                clonedNode.classList.remove('hidden');
                clonedNode.style.display = 'block';
                
                const printContainer = document.createElement('div');
                printContainer.id = 'print-container';
                printContainer.appendChild(clonedNode);
                
                const oldContainer = document.getElementById('print-container');
                if (oldContainer) oldContainer.remove();
                
                document.body.appendChild(printContainer);
                
                window.print();
                
                setTimeout(() => {
                    printContainer.remove();
                }, 500);
            }
        }, 100);
    }
</script>

<!-- svelte-ignore css_unused_selector -->
<style>
    @media print {
        @page { size: A4 landscape; margin: 0; padding: 0; }
        body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        :global(body > div:not(#print-container)) { display: none !important; }
        :global(#print-container) { display: block !important; margin: 0; padding: 0; width: 100%; background: white; }
    }
</style>

<!-- Root Container: Vollbild-Modus wenn aktiviert -->
<div id="print-root-layer" class="flex overflow-hidden bg-neutral-200 {isFullscreen ? 'fixed inset-0 z-9999' : 'relative w-full h-full'}">
    
    <!-- Linke Toolbar (Werkzeuge & Bogen-Wechsel) -->
    <div class="w-16 sm:w-20 bg-neutral-900 flex flex-col items-center py-6 gap-6 no-print shrink-0 z-20 shadow-2xl">
        <div class="flex flex-col gap-3 w-full px-2 border-b border-neutral-800 pb-6">
            <button onclick={() => addElement('text')} title="Text hinzufügen" class="w-full aspect-square bg-neutral-800 hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-colors font-bold text-xl">T</button>
            <button onclick={() => addElement('box')} title="Farbfläche/Box hinzufügen" class="w-full aspect-square bg-neutral-800 hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-colors font-bold text-xl">⬛</button>
            <button onclick={() => addElement('image')} title="Bild / Logo hinzufügen" class="w-full aspect-square bg-neutral-800 hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-colors font-bold text-xl">🖼️</button>
        </div>
        
        <div class="flex flex-col gap-3 w-full px-2">
            <button onclick={() => {activeSheetIndex = 0; selectedElementId = null;}} title="Außenseite (Bogen 1)" class="w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-colors font-bold text-xs {activeSheetIndex === 0 ? 'bg-indigo-600 text-white shadow-inner' : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'}">S. 1</button>
            <button onclick={() => {activeSheetIndex = 1; selectedElementId = null;}} title="Innenseite (Bogen 2)" class="w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-colors font-bold text-xs {activeSheetIndex === 1 ? 'bg-indigo-600 text-white shadow-inner' : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'}">S. 2</button>
        </div>

        <div class="mt-auto flex flex-col gap-3 w-full px-2">
            <button onclick={() => isFullscreen = !isFullscreen} title={isFullscreen ? 'Fenster-Modus' : 'Vollbild-Modus'} class="w-full aspect-square bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl flex items-center justify-center transition-colors">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d={isFullscreen ? "M6 18L18 6M6 6l12 12" : "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"} /></svg>
            </button>
            <button onclick={printFlyer} title="Als PDF speichern / Drucken" class="w-full aspect-square bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            </button>
            <button onclick={resetToDefault} title="Flyer auf Standard zurücksetzen" class="w-full aspect-square bg-rose-600 hover:bg-rose-500 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg mt-2">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
        </div>
    </div>

    <!-- Arbeitsfläche (Canvas) -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="flex-1 overflow-auto relative custom-scrollbar flex items-start justify-center p-10 no-print" onclick={(e) => { if(e.target === e.currentTarget) selectedElementId = null; }}>
        
        <!-- Skalierungs-Wrapper, der die physischen CSS-Pixel reserviert, damit der Scrollbereich stimmt -->
        <div class="relative shadow-2xl bg-white" style="width: {297 * 3.78 * zoom}px; height: {210 * 3.78 * zoom}px;">
            
            <!-- Das echte, in mm dimensionierte Sheet (wird per CSS scale hoch/runter skaliert) -->
            <div 
                id="flyer-sheet-interactive"
                class="absolute top-0 left-0 bg-white origin-top-left overflow-hidden"
                style="width: 297mm; height: 210mm; transform: scale({zoom});"
            >
                <!-- Falzmarkierungen (Orientierung beim Designen) -->
                {#if activeSheetIndex === 0}
                    <div class="absolute left-[97mm] top-0 bottom-0 w-px border-l border-dashed border-neutral-300 z-0 opacity-50 pointer-events-none"></div>
                    <div class="absolute left-[197mm] top-0 bottom-0 w-px border-l border-dashed border-neutral-300 z-0 opacity-50 pointer-events-none"></div>
                {:else}
                    <div class="absolute left-[100mm] top-0 bottom-0 w-px border-l border-dashed border-neutral-300 z-0 opacity-50 pointer-events-none"></div>
                    <div class="absolute left-[200mm] top-0 bottom-0 w-px border-l border-dashed border-neutral-300 z-0 opacity-50 pointer-events-none"></div>
                {/if}

                <!-- Die Elemente auf dem Bogen -->
                {#each activeSheet.elements as el (el.id)}
                    <div 
                        class="absolute cursor-move {selectedElementId === el.id ? 'ring-2 ring-indigo-500 shadow-xl' : 'hover:ring-1 hover:ring-indigo-300'}"
                        style="
                            left: {el.x}mm; top: {el.y}mm; width: {el.w}mm; 
                            {el.h > 0 ? `height: ${el.h}mm;` : ''}
                            font-size: {el.fontSize}pt; color: {el.color}; background-color: {el.bgColor};
                            text-align: {el.textAlign}; font-weight: {el.fontWeight};
                            border-radius: {el.borderRadius}mm; z-index: {el.zIndex};
                            padding: {el.padding || 0}mm; box-sizing: border-box;
                            white-space: pre-wrap; word-break: break-word; overflow: hidden;
                            line-height: 1.4; border: {el.borderWidth || 0}mm solid {el.borderColor || '#000000'};
                        "
                        onpointerdown={(e) => handlePointerDown(e, el)}
                        onpointermove={handlePointerMove}
                        onpointerup={handlePointerUp}
                        onpointercancel={handlePointerUp}
                    >
                        {#if el.type === 'image'}
                            <!-- svelte-ignore a11y_missing_attribute -->
                            <img src={el.content} style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />
                        {:else}
                            {el.content}
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
        
        <!-- Zoom Control schwebend unten in der Mitte -->
        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-neutral-200 px-4 py-2 rounded-full shadow-lg flex items-center gap-4 z-30">
            <span class="text-xs font-bold text-neutral-500">Zoom</span>
            <input type="range" min="0.3" max="1.5" step="0.1" bind:value={zoom} class="w-32 accent-indigo-600" />
            <span class="text-xs font-bold text-neutral-700 w-8 text-right">{Math.round(zoom * 100)}%</span>
        </div>
    </div>

    <!-- Rechte Sidebar (Eigenschaften des ausgewählten Elements) -->
    {#if selectedElementIndex !== -1}
        <div class="w-80 bg-white border-l border-neutral-200 flex flex-col no-print shrink-0 z-20 shadow-xl">
            <div class="p-5 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
                <h3 class="font-bold text-neutral-900">Eigenschaften</h3>
                <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{activeSheet.elements[selectedElementIndex].type}</span>
            </div>
            <div class="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                
                <!-- Text / Inhalt -->
                <div>
                    {#if sheets[activeSheetIndex].elements[selectedElementIndex].type === 'image'}
                        <label for="prop-img-url" class="block text-xs font-semibold text-neutral-700 mb-1.5">Bild-URL / Pfad</label>
                        <input id="prop-img-url" type="text" bind:value={sheets[activeSheetIndex].elements[selectedElementIndex].content} class="orga-input-clear py-1.5 text-sm w-full" placeholder="/favicon.png oder https://..." />
                    {:else}
                        <label for="prop-content" class="block text-xs font-semibold text-neutral-700 mb-1.5">Inhalt / Text</label>
                        <textarea id="prop-content" bind:value={sheets[activeSheetIndex].elements[selectedElementIndex].content} rows="4" class="orga-input-clear py-2 text-sm w-full resize-y custom-scrollbar"></textarea>
                    {/if}
                </div>

                <!-- Position & Dimensionen -->
                <div class="grid grid-cols-2 gap-3">
                    <div><label for="prop-x" class="block text-xs font-semibold text-neutral-700 mb-1">X Pos (mm)</label><input id="prop-x" type="number" bind:value={sheets[activeSheetIndex].elements[selectedElementIndex].x} class="orga-input-clear py-1.5 text-sm w-full" /></div>
                    <div><label for="prop-y" class="block text-xs font-semibold text-neutral-700 mb-1">Y Pos (mm)</label><input id="prop-y" type="number" bind:value={sheets[activeSheetIndex].elements[selectedElementIndex].y} class="orga-input-clear py-1.5 text-sm w-full" /></div>
                    <div><label for="prop-w" class="block text-xs font-semibold text-neutral-700 mb-1">Breite (mm)</label><input id="prop-w" type="number" bind:value={sheets[activeSheetIndex].elements[selectedElementIndex].w} class="orga-input-clear py-1.5 text-sm w-full" /></div>
                    <div><label for="prop-h" class="block text-xs font-semibold text-neutral-700 mb-1">Höhe (mm) <span class="text-[9px] text-neutral-400 font-normal">0=Auto</span></label><input id="prop-h" type="number" bind:value={sheets[activeSheetIndex].elements[selectedElementIndex].h} class="orga-input-clear py-1.5 text-sm w-full" /></div>
                </div>

                <!-- Typografie & Styling -->
                <div class="grid grid-cols-2 gap-3">
                    <div><label for="prop-fs" class="block text-xs font-semibold text-neutral-700 mb-1">Schriftgröße (pt)</label><input id="prop-fs" type="number" bind:value={sheets[activeSheetIndex].elements[selectedElementIndex].fontSize} class="orga-input-clear py-1.5 text-sm w-full" /></div>
                    <div><label for="prop-pad" class="block text-xs font-semibold text-neutral-700 mb-1">Innenabstand (mm)</label><input id="prop-pad" type="number" bind:value={sheets[activeSheetIndex].elements[selectedElementIndex].padding} class="orga-input-clear py-1.5 text-sm w-full" /></div>
                    
                    <div>
                        <label for="prop-fw" class="block text-xs font-semibold text-neutral-700 mb-1">Schriftschnitt</label>
                        <select id="prop-fw" bind:value={sheets[activeSheetIndex].elements[selectedElementIndex].fontWeight} class="orga-input-clear py-1.5 text-sm w-full cursor-pointer">
                            <option value="normal">Normal</option>
                            <option value="bold">Fett (Bold)</option>
                            <option value="900">Sehr Fett (Black)</option>
                        </select>
                    </div>
                    <div>
                        <label for="prop-ta" class="block text-xs font-semibold text-neutral-700 mb-1">Ausrichtung</label>
                        <select id="prop-ta" bind:value={sheets[activeSheetIndex].elements[selectedElementIndex].textAlign} class="orga-input-clear py-1.5 text-sm w-full cursor-pointer">
                            <option value="left">Links</option>
                            <option value="center">Mittig</option>
                            <option value="right">Rechts</option>
                            <option value="justify">Blocksatz</option>
                        </select>
                    </div>
                </div>
                
                <!-- Farben -->
                <div class="grid grid-cols-2 gap-3 pt-2">
                    <div><label for="prop-color" class="block text-xs font-semibold text-neutral-700 mb-1">Textfarbe</label><input id="prop-color" type="color" bind:value={sheets[activeSheetIndex].elements[selectedElementIndex].color} class="w-full h-8 cursor-pointer rounded border border-neutral-200" /></div>
                    <div><label for="prop-bgcolor" class="block text-xs font-semibold text-neutral-700 mb-1">Hintergrund</label><input id="prop-bgcolor" type="color" bind:value={sheets[activeSheetIndex].elements[selectedElementIndex].bgColor} class="w-full h-8 cursor-pointer rounded border border-neutral-200" /></div>
                </div>
                
                <!-- Rahmen & Ecken -->
                <div class="grid grid-cols-3 gap-3 pt-2">
                    <div><label for="prop-br" class="block text-[10px] font-semibold text-neutral-700 mb-1 truncate" title="Eckenrundung">Rundung</label><input id="prop-br" type="number" bind:value={sheets[activeSheetIndex].elements[selectedElementIndex].borderRadius} class="orga-input-clear py-1.5 text-sm w-full" /></div>
                    <div><label for="prop-bw" class="block text-[10px] font-semibold text-neutral-700 mb-1 truncate" title="Rahmendicke">Rahmen (mm)</label><input id="prop-bw" type="number" bind:value={sheets[activeSheetIndex].elements[selectedElementIndex].borderWidth} class="orga-input-clear py-1.5 text-sm w-full" /></div>
                    <div><label for="prop-bc" class="block text-[10px] font-semibold text-neutral-700 mb-1 truncate" title="Rahmenfarbe">Rand-Farbe</label><input id="prop-bc" type="color" bind:value={sheets[activeSheetIndex].elements[selectedElementIndex].borderColor} class="w-full h-8 cursor-pointer rounded border border-neutral-200" /></div>
                </div>

                <label class="flex items-center gap-2 text-xs font-semibold text-neutral-600 cursor-pointer mt-2">
                    <input type="checkbox" checked={sheets[activeSheetIndex].elements[selectedElementIndex].bgColor === 'transparent'} onchange={(e) => sheets[activeSheetIndex].elements[selectedElementIndex].bgColor = e.currentTarget.checked ? 'transparent' : '#ffffff'} class="rounded text-indigo-600 focus:ring-indigo-500">
                    Kein Hintergrund (Transparent)
                </label>

                <!-- Z-Index / Reihenfolge -->
                <div class="pt-4 border-t border-neutral-100">
                    <span class="block text-xs font-semibold text-neutral-700 mb-2">Ebene (Reihenfolge)</span>
                    <div class="flex gap-2">
                        <button onclick={() => sheets[activeSheetIndex].elements[selectedElementIndex].zIndex -= 1} class="flex-1 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-lg transition-colors">Nach hinten</button>
                        <button onclick={() => sheets[activeSheetIndex].elements[selectedElementIndex].zIndex += 1} class="flex-1 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-lg transition-colors">Nach vorne</button>
                    </div>
                </div>
                
                <button onclick={() => { sheets[activeSheetIndex].elements.splice(selectedElementIndex, 1); selectedElementId = null; }} class="w-full mt-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold rounded-xl transition-colors shadow-sm">Element löschen</button>
            </div>
        </div>
    {/if}
</div>

<!-- Spezielle, unsichtbare Render-Ebene NUR für den Drucker -->
<!-- Hier rendern wir strikt beide Bögen nacheinander in 100% Skalierung -->
<div id="flyer-print-content" class="hidden">
    {#each sheets as sheet}
        <div class="flyer-print-sheet" style="width: 297mm; height: 210mm; position: relative; overflow: hidden; page-break-after: always; background: white;">
            {#each sheet.elements as el}
                <div style="position: absolute; left: {el.x}mm; top: {el.y}mm; width: {el.w}mm; {el.h > 0 ? `height: ${el.h}mm;` : ''} font-size: {el.fontSize}pt; color: {el.color}; background-color: {el.bgColor}; text-align: {el.textAlign}; font-weight: {el.fontWeight}; border-radius: {el.borderRadius}mm; z-index: {el.zIndex}; padding: {el.padding || 0}mm; box-sizing: border-box; white-space: pre-wrap; word-break: break-word; line-height: 1.4; border: {el.borderWidth || 0}mm solid {el.borderColor || '#000000'};">
                    {#if el.type === 'image'}
                        <!-- svelte-ignore a11y_missing_attribute -->
                        <img src={el.content} style="width: 100%; height: 100%; object-fit: contain;" />
                    {:else}
                        {el.content}
                    {/if}
                </div>
            {/each}
        </div>
    {/each}
</div>