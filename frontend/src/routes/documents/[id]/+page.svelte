<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { fade, slide } from "svelte/transition";
    import { useEditor } from "$lib/services/editorService.svelte";
    import EditorTopBar from "$lib/components/editor/EditorTopBar.svelte";
    import EditorCanvas from "$lib/components/editor/EditorCanvas.svelte";
    import EditorSidebar from "$lib/components/editor/EditorSidebar.svelte";
    import { 
        ChevronLeft, 
        Save, 
        Loader2, 
        Plus, 
        Sliders, 
        Layers, 
        Check, 
        Copy, 
        Trash2, 
        Type, 
        Image as ImageIcon, 
        Table, 
        X,
        ChevronDown
    } from "lucide-svelte";

    // Die ID kommt nun dynamisch aus dem Pfad (z.B. /documents/12345 oder /documents/new)
    let docId = $derived($page.params.id === 'new' ? null : ($page.params.id ?? null));
    const editor = useEditor($page.params.id === 'new' ? null : ($page.params.id ?? null));

    let activeMobileSheet = $state<'none' | 'document' | 'add' | 'elements' | 'properties'>('none');
    let isTypeDropdownOpen = $state(false);

    const docTypes = [
        { value: 'rechnung', label: 'Rechnung' },
        { value: 'arbeitszeitnachweis', label: 'Arbeitszeitnachweis' },
        { value: 'vollmacht', label: 'Vollmacht' },
        { value: 'antrag', label: 'Antrag' },
        { value: 'kündigung', label: 'Kündigung' },
        { value: 'vertrag', label: 'Vertrag' },
        { value: 'allgemein', label: 'Brief / Sonstiges' }
    ];

    let selectedDocType = $derived(docTypes.find(t => t.value === editor.type) ?? docTypes[0]);

    onMount(async () => {
        await editor.load();
        if ($page.url.searchParams.get('preset') === 'letterhead' && editor.fields.length === 0) {
            editor.insertLetterhead('formB');
            editor.title = "Geschäftsbrief mit Firmenlogo (DIN 5008)";
            editor.type = "allgemein";
        }
    });

    function handleDuplicate(id: string) {
        const field = editor.fields.find((f: any) => f.id === id);
        if (field) {
            const copy = JSON.parse(JSON.stringify(field));
            copy.id = "f_" + Math.random().toString(36).substring(2, 11);
            copy.y += 30;
            copy.x += 30;
            editor.fields.push(copy);
            editor.selectedFieldId = copy.id;
        }
    }

    function handleAddFromMobile(type: 'text' | 'logo' | 'table') {
        editor.addField(type);
        activeMobileSheet = 'properties'; // Direkt die Eigenschaften des neuen Elements öffnen!
    }

    let activeField = $derived(editor.fields.find((f: any) => f.id === editor.selectedFieldId) || null);
</script>

<svelte:head>
    <title>{editor.title} - OrgaFlow Editor</title>
</svelte:head>

<!-- Der Haupt-Editor-Wrapper bricht bewusst für maximale Arbeitsfläche aus dem orga-layout aus -->
<div in:fade={{ duration: 250, delay: 50 }} class="fixed inset-0 z-50 bg-neutral-100 flex flex-col md:flex-row font-sans overflow-hidden">
    
    <!-- ============================================== -->
    <!-- MOBILE TOP BAR (< md)                          -->
    <!-- ============================================== -->
    <header class="md:hidden bg-neutral-900 text-white px-3 py-2 flex items-center justify-between border-b border-neutral-800 shadow-md shrink-0 z-30 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <a 
            href="/documents" 
            class="flex items-center gap-1 text-neutral-300 hover:text-white px-2 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700/80 active:scale-95 text-xs font-bold transition-all"
            title="Zurück zu Vorlagen"
        >
            <ChevronLeft class="w-4 h-4" />
            <span>Vorlagen</span>
        </a>

        <!-- Dokument-Titel & Typ Antipp-Button -->
        <button 
            type="button" 
            onclick={() => activeMobileSheet = activeMobileSheet === 'document' ? 'none' : 'document'}
            class="flex flex-col items-center max-w-[48vw] px-2 py-0.5 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
        >
            <span class="text-xs font-bold text-white truncate max-w-full leading-tight flex items-center gap-1">
                {editor.title || 'Unbenannte Vorlage'}
                <ChevronDown class="w-3 h-3 text-neutral-400 shrink-0" />
            </span>
            <span class="text-[9px] uppercase tracking-wider font-semibold text-brand-400 truncate max-w-full">
                {selectedDocType.label}
            </span>
        </button>

        <!-- Speichern Button -->
        <button 
            type="button" 
            onclick={editor.save} 
            disabled={editor.isSaving}
            class="flex items-center gap-1.5 bg-brand-800 hover:bg-brand-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-brand-900/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
            {#if editor.isSaving}
                <Loader2 class="w-3.5 h-3.5 animate-spin" />
                <span>...</span>
            {:else if editor.saveMessage}
                <Check class="w-3.5 h-3.5 text-emerald-400" />
                <span>Ok!</span>
            {:else}
                <Save class="w-3.5 h-3.5" />
                <span>Speichern</span>
            {/if}
        </button>
    </header>

    <!-- ============================================== -->
    <!-- DESKTOP LEFT SIDEBAR (>= md)                  -->
    <!-- ============================================== -->
    <EditorTopBar 
        bind:title={editor.title} 
        bind:type={editor.type}
        bind:marginTop={editor.marginTop}
        bind:marginBottom={editor.marginBottom}
        saveMessage={editor.saveMessage} 
        isSaving={editor.isSaving} 
        selectedFieldId={editor.selectedFieldId}
        onSave={editor.save} 
        onAdd={editor.addField}
        onDuplicate={handleDuplicate}
        onInsertLetterhead={editor.insertLetterhead}
    />

    <!-- ============================================== -->
    <!-- CENTER CANVAS AREA                             -->
    <!-- ============================================== -->
    <main class="flex-1 flex overflow-hidden relative w-full h-full pb-14 md:pb-0">
        <EditorCanvas 
            fields={editor.fields} 
            marginTop={editor.marginTop}
            marginBottom={editor.marginBottom}
            bind:selectedFieldId={editor.selectedFieldId}
        />

        <!-- ============================================== -->
        <!-- DESKTOP RIGHT SIDEBAR (>= md)                 -->
        <!-- ============================================== -->
        <EditorSidebar 
            fields={editor.fields} 
            selectedFieldId={editor.selectedFieldId} 
            onDelete={editor.deleteField}
            onDuplicate={handleDuplicate}
        />
    </main>

    <!-- ============================================== -->
    <!-- MOBILE CONTEXTUAL FLOATING BAR (When Selected) -->
    <!-- ============================================== -->
    {#if activeField && activeMobileSheet === 'none'}
        <div 
            transition:slide={{ duration: 150 }}
            class="md:hidden fixed bottom-16 left-3 right-3 z-30 flex items-center justify-between bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/80 p-2 rounded-2xl shadow-2xl text-white"
        >
            <div class="flex items-center gap-2 min-w-0 pl-1">
                <span class="text-[10px] font-black uppercase tracking-wider text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-lg border border-brand-500/20 truncate">
                    {activeField.type}
                </span>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
                <button 
                    type="button" 
                    onclick={() => activeMobileSheet = 'properties'}
                    class="flex items-center gap-1 bg-brand-600 hover:bg-brand-500 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold shadow transition-all active:scale-95 cursor-pointer"
                    title="Eigenschaften bearbeiten"
                >
                    <Sliders class="w-3.5 h-3.5" />
                    <span>Optionen</span>
                </button>

                <button 
                    type="button" 
                    onclick={() => handleDuplicate(activeField.id)}
                    class="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors active:scale-95 cursor-pointer"
                    title="Duplizieren"
                >
                    <Copy class="w-3.5 h-3.5" />
                </button>

                <button 
                    type="button" 
                    onclick={() => editor.deleteField(activeField.id)}
                    class="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors active:scale-95 cursor-pointer"
                    title="Löschen"
                >
                    <Trash2 class="w-3.5 h-3.5" />
                </button>

                <button 
                    type="button" 
                    onclick={() => editor.selectedFieldId = null}
                    class="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors active:scale-95 cursor-pointer"
                    title="Abwählen"
                >
                    <X class="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    {/if}

    <!-- ============================================== -->
    <!-- MOBILE BOTTOM ACTION BAR (< md)                -->
    <!-- ============================================== -->
    <nav 
        class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-800 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-2xl transition-all"
        aria-label="Editor Mobile Menü"
    >
        <div class="grid grid-cols-4 items-center max-w-md mx-auto">
            <!-- 1. Dokument-Einstellungen -->
            <button 
                type="button" 
                onclick={() => activeMobileSheet = activeMobileSheet === 'document' ? 'none' : 'document'}
                class="flex flex-col items-center justify-center py-1 rounded-2xl transition-all active:scale-95 {activeMobileSheet === 'document' ? 'text-brand-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'}"
            >
                <div class="p-1 rounded-xl {activeMobileSheet === 'document' ? 'bg-brand-500/15' : ''}">
                    <Sliders class="w-4 h-4" />
                </div>
                <span class="text-[10px] tracking-tight mt-0.5">Dokument</span>
            </button>

            <!-- 2. Einfügen -->
            <button 
                type="button" 
                onclick={() => activeMobileSheet = activeMobileSheet === 'add' ? 'none' : 'add'}
                class="flex flex-col items-center justify-center py-1 rounded-2xl transition-all active:scale-95 {activeMobileSheet === 'add' ? 'text-brand-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'}"
            >
                <div class="p-1 rounded-xl {activeMobileSheet === 'add' ? 'bg-brand-500/15' : ''}">
                    <Plus class="w-4 h-4" />
                </div>
                <span class="text-[10px] tracking-tight mt-0.5">Einfügen</span>
            </button>

            <!-- 3. Alle Elemente Liste -->
            <button 
                type="button" 
                onclick={() => activeMobileSheet = activeMobileSheet === 'elements' ? 'none' : 'elements'}
                class="flex flex-col items-center justify-center py-1 rounded-2xl transition-all active:scale-95 relative {activeMobileSheet === 'elements' ? 'text-brand-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'}"
            >
                <div class="p-1 rounded-xl {activeMobileSheet === 'elements' ? 'bg-brand-500/15' : ''}">
                    <Layers class="w-4 h-4" />
                </div>
                <span class="text-[10px] tracking-tight mt-0.5">Elemente ({editor.fields.length})</span>
            </button>

            <!-- 4. Eigenschaften (aktiv wenn Element gewählt) -->
            <button 
                type="button" 
                onclick={() => activeMobileSheet = activeMobileSheet === 'properties' ? 'none' : 'properties'}
                class="flex flex-col items-center justify-center py-1 rounded-2xl transition-all active:scale-95 {activeMobileSheet === 'properties' ? 'text-brand-400 font-bold' : (activeField ? 'text-neutral-200 font-medium' : 'text-neutral-500 opacity-60')}"
            >
                <div class="p-1 rounded-xl {activeMobileSheet === 'properties' ? 'bg-brand-500/15' : ''}">
                    <Type class="w-4 h-4" />
                </div>
                <span class="text-[10px] tracking-tight mt-0.5">Optionen</span>
            </button>
        </div>
    </nav>

    <!-- ============================================== -->
    <!-- MOBILE BOTTOM SHEETS (< md)                    -->
    <!-- ============================================== -->
    {#if activeMobileSheet !== 'none'}
        <!-- Backdrop -->
        <div 
            transition:fade={{ duration: 180 }}
            class="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
            onclick={() => activeMobileSheet = 'none'}
            aria-hidden="true"
        ></div>

        <!-- Sheet Modal Container -->
        <div 
            transition:slide={{ duration: 250 }}
            class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[82vh] flex flex-col overflow-hidden pb-[max(env(safe-area-inset-bottom),1rem)]"
        >
            <!-- Grab Handle Indicator -->
            <div class="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0"></div>

            <!-- SHEET 1: DOKUMENT-EINSTELLUNGEN -->
            {#if activeMobileSheet === 'document'}
                <div class="p-5 border-b border-neutral-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 class="font-black text-neutral-900 text-lg">Dokument-Einstellungen</h2>
                        <p class="text-xs text-neutral-500">Format, Typ & Kopf-/Fußzeilen definieren</p>
                    </div>
                    <button 
                        type="button" 
                        onclick={() => activeMobileSheet = 'none'}
                        class="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center font-bold"
                    >
                        ✕
                    </button>
                </div>

                <div class="p-5 overflow-y-auto space-y-4">
                    <div>
                        <label for="m-doc-title" class="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Titel der Vorlage</label>
                        <input 
                            id="m-doc-title" 
                            type="text" 
                            bind:value={editor.title} 
                            class="orga-input-clear py-3 text-sm" 
                            placeholder="z.B. Standard Rechnung" 
                        />
                    </div>

                    <div>
                        <label for="m-doc-type" class="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Dokumententyp</label>
                        <div class="relative">
                            <button 
                                type="button"
                                class="w-full bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-900 rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-between shadow-inner"
                                onclick={() => isTypeDropdownOpen = !isTypeDropdownOpen}
                            >
                                <span>{selectedDocType.label}</span>
                                <ChevronDown class="w-4 h-4 text-neutral-500 transition-transform duration-200 {isTypeDropdownOpen ? 'rotate-180' : ''}" />
                            </button>

                            {#if isTypeDropdownOpen}
                                <div class="mt-2 bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-neutral-100">
                                    {#each docTypes as docType}
                                        <button 
                                            type="button"
                                            class="w-full px-4 py-3 text-sm text-left flex items-center justify-between hover:bg-neutral-50 transition-colors {editor.type === docType.value ? 'text-brand-600 font-bold bg-brand-50/50' : 'text-neutral-700'}"
                                            onclick={() => { editor.type = docType.value; isTypeDropdownOpen = false; }}
                                        >
                                            <span>{docType.label}</span>
                                            {#if editor.type === docType.value}
                                                <Check class="w-4 h-4 text-brand-600" />
                                            {/if}
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3 pt-2">
                        <div>
                            <label for="m-margin-top" class="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Kopfzeile (px)</label>
                            <input id="m-margin-top" type="number" bind:value={editor.marginTop} class="orga-input-clear py-2.5 text-sm" />
                        </div>
                        <div>
                            <label for="m-margin-bottom" class="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Fußzeile (px)</label>
                            <input id="m-margin-bottom" type="number" bind:value={editor.marginBottom} class="orga-input-clear py-2.5 text-sm" />
                        </div>
                    </div>

                    <button 
                        type="button" 
                        onclick={() => activeMobileSheet = 'none'} 
                        class="orga-button-primary w-full mt-4"
                    >
                        Fertig
                    </button>
                </div>

            <!-- SHEET 2: ELEMENT EINFÜGEN -->
            {:else if activeMobileSheet === 'add'}
                <div class="p-5 border-b border-neutral-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 class="font-black text-neutral-900 text-lg">Element einfügen</h2>
                        <p class="text-xs text-neutral-500">Wählen Sie das gewünschte Element</p>
                    </div>
                    <button 
                        type="button" 
                        onclick={() => activeMobileSheet = 'none'}
                        class="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center font-bold"
                    >
                        ✕
                    </button>
                </div>

                <div class="p-5 space-y-3 overflow-y-auto">
                    <!-- DIN 5008 Briefkopf Vorlage -->
                    <div class="p-4 rounded-2xl bg-brand-50/80 border-2 border-brand-200 text-left shadow-sm">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0">
                                <span class="font-black text-xs">DIN</span>
                            </div>
                            <div>
                                <p class="font-bold text-neutral-900 text-sm">Briefkopf einfügen</p>
                                <p class="text-xs text-neutral-500">Logo, Anschrift & Absenderzeile</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <button 
                                type="button" 
                                onclick={() => { editor.insertLetterhead('formB'); activeMobileSheet = 'none'; }}
                                class="py-2.5 px-3 bg-brand-600 active:bg-brand-700 text-white text-xs font-bold rounded-xl text-center shadow"
                            >
                                Form B (Standard)
                            </button>
                            <button 
                                type="button" 
                                onclick={() => { editor.insertLetterhead('formA'); activeMobileSheet = 'none'; }}
                                class="py-2.5 px-3 bg-neutral-200 active:bg-neutral-300 text-neutral-800 text-xs font-bold rounded-xl text-center"
                            >
                                Form A (Kompakt)
                            </button>
                        </div>
                    </div>

                    <button 
                        type="button"
                        onclick={() => handleAddFromMobile('text')} 
                        class="w-full flex items-center gap-4 p-4 rounded-2xl bg-white hover:bg-neutral-50 border-2 border-neutral-200 hover:border-brand-500 transition-all text-left shadow-sm active:scale-[0.98]"
                    >
                        <div class="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 border border-brand-200/60 flex items-center justify-center shrink-0">
                            <Type class="w-6 h-6" />
                        </div>
                        <div class="flex-1">
                            <p class="font-bold text-neutral-900 text-sm">Textfeld</p>
                            <p class="text-xs text-neutral-500 mt-0.5">Für Platzhalter-Variablen & Brieftext</p>
                        </div>
                    </button>

                    <button 
                        type="button"
                        onclick={() => handleAddFromMobile('logo')} 
                        class="w-full flex items-center gap-4 p-4 rounded-2xl bg-white hover:bg-neutral-50 border-2 border-neutral-200 hover:border-emerald-500 transition-all text-left shadow-sm active:scale-[0.98]"
                    >
                        <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
                            <ImageIcon class="w-6 h-6" />
                        </div>
                        <div class="flex-1">
                            <p class="font-bold text-neutral-900 text-sm">Firmenlogo</p>
                            <p class="text-xs text-neutral-500 mt-0.5">Lädt das in den Firmendaten hinterlegte Logo</p>
                        </div>
                    </button>

                    <button 
                        type="button"
                        onclick={() => handleAddFromMobile('table')} 
                        class="w-full flex items-center gap-4 p-4 rounded-2xl bg-white hover:bg-neutral-50 border-2 border-neutral-200 hover:border-amber-500 transition-all text-left shadow-sm active:scale-[0.98]"
                    >
                        <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
                            <Table class="w-6 h-6" />
                        </div>
                        <div class="flex-1">
                            <p class="font-bold text-neutral-900 text-sm">Tabelle</p>
                            <p class="text-xs text-neutral-500 mt-0.5">Für Leistungspositionen & Rechnungsdaten</p>
                        </div>
                    </button>
                </div>

            <!-- SHEET 3: ALLE ELEMENTE LISTE -->
            {:else if activeMobileSheet === 'elements'}
                <div class="p-5 border-b border-neutral-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 class="font-black text-neutral-900 text-lg">Element-Übersicht</h2>
                        <p class="text-xs text-neutral-500">{editor.fields.length} Element(e) auf dieser Vorlage</p>
                    </div>
                    <button 
                        type="button" 
                        onclick={() => activeMobileSheet = 'none'}
                        class="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center font-bold"
                    >
                        ✕
                    </button>
                </div>

                <div class="p-4 space-y-2 overflow-y-auto max-h-[60vh] divide-y divide-neutral-100">
                    {#if editor.fields.length === 0}
                        <div class="py-10 text-center text-neutral-400">
                            <p class="text-sm font-medium">Noch keine Elemente vorhanden.</p>
                            <button type="button" onclick={() => activeMobileSheet = 'add'} class="orga-button-ghost mt-3 inline-flex text-xs py-2 px-4">
                                + Erstes Element einfügen
                            </button>
                        </div>
                    {/if}

                    {#each editor.fields as f (f.id)}
                        {@const isCurSelected = editor.selectedFieldId === f.id}
                        <div class="pt-2 first:pt-0 flex items-center justify-between gap-3">
                            <button 
                                type="button"
                                onclick={() => { editor.selectedFieldId = f.id; activeMobileSheet = 'properties'; }}
                                class="flex items-center gap-3 text-left flex-1 min-w-0 p-2.5 rounded-xl transition-all {isCurSelected ? 'bg-brand-50 border border-brand-200 font-bold text-brand-900' : 'hover:bg-neutral-50 text-neutral-700'}"
                            >
                                <span class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 {f.type === 'text' ? 'bg-blue-50 text-blue-600' : f.type === 'logo' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}">
                                    {#if f.type === 'text'}T{:else if f.type === 'logo'}🖼️{:else}📊{/if}
                                </span>
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs truncate font-bold">{f.content || (f.type === 'logo' ? 'Logo' : 'Tabelle')}</p>
                                    <p class="text-[10px] text-neutral-400 font-mono mt-0.5">X: {f.x}px | Y: {f.y}px</p>
                                </div>
                            </button>

                            <div class="flex items-center gap-1 shrink-0">
                                <button 
                                    type="button" 
                                    onclick={() => handleDuplicate(f.id)} 
                                    class="p-2 text-neutral-400 hover:text-brand-600 rounded-lg hover:bg-neutral-100 transition-colors"
                                    title="Duplizieren"
                                >
                                    <Copy class="w-4 h-4" />
                                </button>
                                <button 
                                    type="button" 
                                    onclick={() => editor.deleteField(f.id)} 
                                    class="p-2 text-neutral-400 hover:text-rose-500 rounded-lg hover:bg-neutral-100 transition-colors"
                                    title="Löschen"
                                >
                                    <Trash2 class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>

            <!-- SHEET 4: EIGENSCHAFTEN-EDITOR -->
            {:else if activeMobileSheet === 'properties'}
                <div class="flex-1 overflow-y-auto">
                    <EditorSidebar 
                        fields={editor.fields} 
                        selectedFieldId={editor.selectedFieldId} 
                        onDelete={editor.deleteField}
                        onDuplicate={handleDuplicate}
                        isMobile={true}
                        onClose={() => activeMobileSheet = 'none'}
                    />
                </div>
            {/if}
        </div>
    {/if}
</div>
