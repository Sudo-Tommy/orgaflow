<script lang="ts">
    import { slide } from 'svelte/transition';
    import { ChevronLeft, Type, Image as ImageIcon, Table, Save, Loader2, ChevronDown, Check, Copy, FileText, Stamp } from 'lucide-svelte';

    let { title = $bindable(), type = $bindable(), marginTop = $bindable(250), marginBottom = $bindable(150), saveMessage, isSaving, selectedFieldId, onSave, onAdd, onDuplicate, onInsertLetterhead } = $props<{
        title: string;
        type: string;
        marginTop?: number;
        marginBottom?: number;
        saveMessage: string;
        isSaving: boolean;
        selectedFieldId: string | null;
        onSave: () => void;
        onAdd: (type: 'text' | 'logo' | 'table') => void;
        onDuplicate: (id: string) => void;
        onInsertLetterhead?: (variant: 'formA' | 'formB') => void;
    }>();

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

    let selectedDocType = $derived(docTypes.find(t => t.value === type) ?? docTypes[0]);
    let isLetterheadMenuOpen = $state(false);

    function selectType(val: string) {
        type = val;
        isTypeDropdownOpen = false;
    }
</script>

<!-- Wird nun als linkes Menü (Sidebar) gerendert -->
<aside class="hidden md:flex bg-neutral-900 text-neutral-300 w-72 flex-col border-r border-neutral-800 shrink-0 h-full shadow-2xl z-20 relative overflow-hidden">
    <div class="absolute top-0 left-0 w-full h-40 bg-brand-500/5 blur-3xl pointer-events-none"></div>

    <!-- Back Button & Header -->
    <div class="p-6 border-b border-neutral-800/80 flex items-center gap-4 relative z-10 bg-neutral-950/20">
        <a href="/documents" class="w-12 h-12 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-2xl transition-all shadow-sm border border-neutral-700 active:scale-95" title="Zurück zur Übersicht">
            <ChevronLeft class="w-6 h-6" />
        </a>
        <div>
            <h1 class="font-black text-white text-xl leading-tight">Editor</h1>
            <p class="text-[10px] uppercase tracking-widest text-brand-400 font-bold mt-0.5">Vorlagen-Design</p>
        </div>
    </div>
    
    <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 relative z-10">
        <!-- Dokumenten-Einstellungen -->
        <div class="space-y-4">
            <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-500">Dokument</h3>
            
            <div>
                <label for="doc-title" class="block text-xs font-semibold text-neutral-400 mb-1.5">Titel der Vorlage</label>
                <input 
                    id="doc-title"
                    type="text" 
                    bind:value={title} 
                    class="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 min-h-12 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all" 
                    placeholder="z.B. Standard Rechnung"
                />
            </div>
            
            <div class="relative">
                <label for="doc-type" class="block text-xs font-semibold text-neutral-400 mb-1.5">Dokumententyp</label>
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                    class="w-full bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-white rounded-xl px-4 min-h-12 text-sm flex items-center justify-between cursor-pointer transition-all"
                    onclick={() => isTypeDropdownOpen = !isTypeDropdownOpen}
                >
                    <span class="font-medium">{selectedDocType.label}</span>
                    <ChevronDown class="w-4 h-4 text-neutral-500 transition-transform duration-300 {isTypeDropdownOpen ? 'rotate-180' : ''}" />
                </div>
                
                {#if isTypeDropdownOpen}
                    <div transition:slide={{ duration: 200 }} class="absolute left-0 right-0 mt-2 bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl overflow-hidden z-20">
                        {#each docTypes as docType}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div 
                                class="px-4 py-3 text-sm flex items-center justify-between cursor-pointer hover:bg-neutral-700 transition-colors {type === docType.value ? 'text-brand-400 bg-neutral-700/50 font-bold' : 'text-neutral-300'}"
                                onclick={() => selectType(docType.value)}
                            >
                                <span>{docType.label}</span>
                                {#if type === docType.value}
                                    <Check class="w-4 h-4" />
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <div class="grid grid-cols-2 gap-3 mt-4">
                <div><label for="doc-margin-top" class="block text-xs font-semibold text-neutral-400 mb-1.5">Kopfzeile (px)</label><input id="doc-margin-top" type="number" bind:value={marginTop} class="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 min-h-12 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all" /></div>
                <div><label for="doc-margin-bottom" class="block text-xs font-semibold text-neutral-400 mb-1.5">Fußzeile (px)</label><input id="doc-margin-bottom" type="number" bind:value={marginBottom} class="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 min-h-12 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all" /></div>
            </div>
            <p class="text-[10px] text-neutral-500 leading-relaxed -mt-2">Begrenzt den Bereich für dynamische Texte & Tabellen.</p>
        </div>
        
        <div class="h-px w-full bg-neutral-800"></div>
        
        <!-- Vorlagen-Presets (DIN 5008 Briefkopf) -->
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-500">Briefkopf (DIN 5008)</h3>
                <span class="text-[9px] uppercase tracking-wider font-bold bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded">Neu</span>
            </div>

            <div class="bg-neutral-950/60 border border-brand-500/30 rounded-2xl p-3 shadow-inner">
                <div class="flex items-center gap-2.5 mb-2.5">
                    <div class="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
                        <Stamp class="w-4 h-4" />
                    </div>
                    <div>
                        <p class="text-xs font-bold text-white">Geschäftsbriefkopf</p>
                        <p class="text-[10px] text-neutral-400">Mit Firmenlogo & Anschrift</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <button 
                        type="button"
                        onclick={() => onInsertLetterhead?.('formB')} 
                        class="px-2.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 text-center flex flex-col items-center justify-center min-h-12"
                        title="Standard für moderne Geschäftsbriefe (45mm Kopfbereich)"
                    >
                        <span>Form B</span>
                        <span class="text-[9px] font-normal text-brand-200">Standard</span>
                    </button>
                    <button 
                        type="button"
                        onclick={() => onInsertLetterhead?.('formA')} 
                        class="px-2.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95 text-center flex flex-col items-center justify-center min-h-12"
                        title="Kompakter Kopfbereich (27mm)"
                    >
                        <span>Form A</span>
                        <span class="text-[9px] font-normal text-neutral-400">Kompakt</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="h-px w-full bg-neutral-800"></div>

        <!-- Elemente hinzufügen -->
        <div class="space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Elemente einfügen</h3>
            
            <button onclick={() => onAdd('text')} class="w-full flex items-center gap-3 p-3 min-h-12 rounded-xl bg-neutral-950/40 hover:bg-neutral-800 border border-neutral-800 hover:border-brand-500/50 transition-all group shadow-sm hover:shadow-md active:scale-95">
                <div class="w-10 h-10 rounded-lg bg-neutral-900 group-hover:bg-brand-500/20 text-neutral-400 group-hover:text-brand-400 flex items-center justify-center shadow-inner transition-colors border border-neutral-800 group-hover:border-brand-500/30 shrink-0">
                    <Type class="w-4 h-4" />
                </div>
                <div class="text-left flex-1 min-w-0">
                    <p class="text-xs font-bold text-neutral-200 group-hover:text-white transition-colors truncate">Textfeld</p>
                    <p class="text-[10px] text-neutral-500 group-hover:text-neutral-400 transition-colors mt-0.5 truncate">Für Variablen & Fließtext</p>
                </div>
            </button>
            
            <button onclick={() => onAdd('logo')} class="w-full flex items-center gap-3 p-3 min-h-12 rounded-xl bg-neutral-950/40 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/50 transition-all group shadow-sm hover:shadow-md active:scale-95">
                <div class="w-10 h-10 rounded-lg bg-neutral-900 group-hover:bg-emerald-500/20 text-neutral-400 group-hover:text-emerald-400 flex items-center justify-center shadow-inner transition-colors border border-neutral-800 group-hover:border-emerald-500/30 shrink-0">
                    <ImageIcon class="w-4 h-4" />
                </div>
                <div class="text-left flex-1 min-w-0">
                    <p class="text-xs font-bold text-neutral-200 group-hover:text-white transition-colors truncate">Firmenlogo</p>
                    <p class="text-[10px] text-neutral-500 group-hover:text-neutral-400 transition-colors mt-0.5 truncate">Lädt Ihr hinterlegtes Logo</p>
                </div>
            </button>
            
            <button onclick={() => onAdd('table')} class="w-full flex items-center gap-3 p-3 min-h-12 rounded-xl bg-neutral-950/40 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/50 transition-all group shadow-sm hover:shadow-md active:scale-95">
                <div class="w-10 h-10 rounded-lg bg-neutral-900 group-hover:bg-amber-500/20 text-neutral-400 group-hover:text-amber-400 flex items-center justify-center shadow-inner transition-colors border border-neutral-800 group-hover:border-amber-500/30 shrink-0">
                    <Table class="w-4 h-4" />
                </div>
                <div class="text-left flex-1 min-w-0">
                    <p class="text-xs font-bold text-neutral-200 group-hover:text-white transition-colors truncate">Tabelle</p>
                    <p class="text-[10px] text-neutral-500 group-hover:text-neutral-400 transition-colors mt-0.5 truncate">Für Rechnungspositionen</p>
                </div>
            </button>

            <!-- Duplizieren Button -->
            <div class="pt-4 mt-4 border-t border-neutral-800/80">
                <button onclick={() => selectedFieldId && onDuplicate(selectedFieldId)} disabled={!selectedFieldId} class="w-full flex items-center gap-3 p-3 min-h-12 rounded-xl bg-neutral-950/40 hover:bg-neutral-800 border border-neutral-800 hover:border-indigo-500/50 transition-all group shadow-sm hover:shadow-md active:scale-95 disabled:opacity-30 disabled:pointer-events-none" title={selectedFieldId ? "Kopiert das aktuell markierte Element" : "Bitte zuerst ein Element anklicken"}>
                    <div class="w-10 h-10 rounded-lg bg-neutral-900 group-hover:bg-indigo-500/20 text-neutral-400 group-hover:text-indigo-400 flex items-center justify-center shadow-inner transition-colors border border-neutral-800 group-hover:border-indigo-500/30 shrink-0">
                        <Copy class="w-4 h-4" />
                    </div>
                    <div class="text-left flex-1 min-w-0">
                        <p class="text-xs font-bold text-neutral-200 group-hover:text-white transition-colors truncate">Duplizieren</p>
                        <p class="text-[10px] text-neutral-500 group-hover:text-neutral-400 transition-colors mt-0.5 truncate">Kopiert das markierte Element</p>
                    </div>
                </button>
            </div>
        </div>
    </div>
    
    <!-- Speichern Bereich -->
    <div class="p-6 border-t border-neutral-800 bg-neutral-950/50 shrink-0 relative z-10">
        {#if saveMessage}
            <div class="mb-4 flex items-center gap-2 text-xs font-bold px-4 py-3 rounded-xl bg-neutral-900 border shadow-inner {saveMessage.includes('Fehler') ? 'text-rose-400 border-rose-900/50' : 'text-emerald-400 border-emerald-900/50'} animate-enter">
                {#if saveMessage.includes('Fehler')}
                    <span class="text-rose-500">❌</span>
                {:else}
                    <Check class="w-4 h-4 text-emerald-500" />
                {/if}
                {saveMessage}
            </div>
        {/if}
        <button onclick={onSave} disabled={isSaving} class="orga-button-primary w-full shadow-brand-600/20 disabled:opacity-50 min-h-14">
            {#if isSaving}
                <Loader2 class="w-5 h-5 animate-spin" />
                Speichert...
            {:else}
                <Save class="w-5 h-5" />
                Vorlage speichern
            {/if}
        </button>
    </div>
</aside>