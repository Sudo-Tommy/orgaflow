<script lang="ts">
    import { slide } from "svelte/transition";
    import { VARIABLE_CATEGORIES } from "./wordVariables";
    import { saveCurrentCursor } from "./wordCursorManager";
    import type { WordBlockType } from "./wordTypes";
    import { 
        Plus, Type, Heading1, Table, Receipt, Image as ImageIcon, 
        Mail, ChevronDown, Sparkles, Columns2, Columns3, Columns4, Scissors 
    } from "lucide-svelte";

    let { 
        onAddBlock, 
        onInsertVariable, 
        onInsertLetterhead 
    } = $props<{
        onAddBlock: (type: WordBlockType, index?: number, count?: number) => void;
        onInsertVariable: (token: string) => void;
        onInsertLetterhead: (variant: 'formA' | 'formB') => void;
    }>();

    let isVarDropdownOpen = $state(false);
    let selectedCategoryIndex = $state(0);
    let varSearchQuery = $state("");
    let buttonRef: HTMLButtonElement | null = $state(null);
    let dropdownPos = $state({ top: 96, left: 16 });

    let filteredVariables = $derived.by(() => {
        const cat = VARIABLE_CATEGORIES[selectedCategoryIndex];
        if (!varSearchQuery) return cat.items;
        return cat.items.filter(item => 
            item.label.toLowerCase().includes(varSearchQuery.toLowerCase()) ||
            item.token.toLowerCase().includes(varSearchQuery.toLowerCase())
        );
    });

    function toggleDropdown() {
        if (!isVarDropdownOpen && buttonRef) {
            const rect = buttonRef.getBoundingClientRect();
            dropdownPos = {
                top: rect.bottom + 6,
                left: Math.max(12, Math.min(rect.left, window.innerWidth - 390))
            };
        }
        isVarDropdownOpen = !isVarDropdownOpen;
    }

    function handleSelectVariable(token: string) {
        onInsertVariable(token);
        isVarDropdownOpen = false;
        varSearchQuery = "";
    }
</script>

<div class="flex flex-wrap items-center gap-2 py-1 text-neutral-800 dark:text-neutral-200 relative">
    
    <!-- 1. VARIABLE EINFÜGEN BUTTON -->
    <div class="relative">
        <button
            bind:this={buttonRef}
            type="button"
            onpointerdown={(e) => { saveCurrentCursor(); e.preventDefault(); }}
            onclick={toggleDropdown}
            class="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer h-8"
        >
            <Sparkles class="w-3.5 h-3.5 text-violet-200" />
            <span>+ Variable einfügen</span>
            <ChevronDown class="w-3.5 h-3.5 transition-transform duration-200 {isVarDropdownOpen ? 'rotate-180' : ''}" />
        </button>

        {#if isVarDropdownOpen}
            <!-- Fixed Backdrop over all page elements -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div 
                class="fixed inset-0 z-[9998] bg-black/15 backdrop-blur-[0.5px]" 
                onclick={() => isVarDropdownOpen = false} 
                aria-hidden="true"
            ></div>

            <!-- Fixed Dropdown Popup immune to parent clipping -->
            <div 
                data-no-cursor-track="true"
                transition:slide={{ duration: 150 }}
                style="top: {dropdownPos.top}px; left: {dropdownPos.left}px;"
                class="fixed z-[9999] w-88 sm:w-96 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-3.5 flex flex-col gap-2.5 max-h-[75vh] ring-1 ring-black/10"
            >
                <div class="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-700">
                    <span class="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-100">Seriendruck-Feld (Variable)</span>
                    <span class="text-[10px] text-neutral-400">Klick zum Einfügen</span>
                </div>

                <!-- Kategorie-Reiter -->
                <div class="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                    {#each VARIABLE_CATEGORIES as cat, idx}
                        <button
                            type="button"
                            onpointerdown={(e) => e.preventDefault()}
                            onclick={() => { selectedCategoryIndex = idx; varSearchQuery = ""; }}
                            class="px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors {selectedCategoryIndex === idx ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}"
                        >
                            <span>{cat.icon}</span> {cat.category.split(' ')[0]}
                        </button>
                    {/each}
                </div>

                <!-- Suchfeld -->
                <input 
                    type="text" 
                    bind:value={varSearchQuery} 
                    placeholder="Variable suchen (z. B. Name, IBAN)..." 
                    class="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none"
                />

                <!-- Variablen-Liste -->
                <div class="flex-1 overflow-y-auto space-y-1 max-h-56 pr-1 custom-scrollbar">
                    {#each filteredVariables as item}
                        <button
                            type="button"
                            onpointerdown={(e) => e.preventDefault()}
                            onclick={() => handleSelectVariable(item.token)}
                            class="w-full text-left p-2 rounded-lg hover:bg-violet-50 dark:hover:bg-neutral-700/60 transition-colors flex items-center justify-between group cursor-pointer border border-transparent hover:border-violet-200 dark:hover:border-violet-800"
                        >
                            <div>
                                <p class="text-xs font-bold text-neutral-800 dark:text-neutral-100 group-hover:text-violet-600 dark:group-hover:text-violet-300">{item.label}</p>
                                <p class="text-[10px] text-neutral-400 font-mono mt-0.5">{item.token} <span class="italic text-neutral-500">({item.sample})</span></p>
                            </div>
                            <span class="text-xs text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">+</span>
                        </button>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

    <div class="h-7 w-px bg-neutral-200 dark:bg-neutral-700 mx-0.5 hidden sm:block"></div>

    <!-- 2. INHALTSBLÖCKE -->
    <div class="flex items-center gap-1">
        <button
            type="button"
            onclick={() => onAddBlock('paragraph')}
            class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:border-violet-400 transition-colors h-8"
            title="Neuen Textabsatz hinzufügen"
        >
            <Type class="w-3.5 h-3.5 text-neutral-500" />
            <span>Absatz</span>
        </button>

        <button
            type="button"
            onclick={() => onAddBlock('heading1')}
            class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:border-violet-400 transition-colors h-8"
            title="Überschrift hinzufügen"
        >
            <Heading1 class="w-3.5 h-3.5 text-neutral-500" />
            <span>Überschrift</span>
        </button>

        <button
            type="button"
            onclick={() => onAddBlock('table')}
            class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:border-violet-400 transition-colors h-8"
            title="Freie Tabelle einfügen"
        >
            <Table class="w-3.5 h-3.5 text-neutral-500" />
            <span>Tabelle</span>
        </button>

        <button
            type="button"
            onclick={() => onAddBlock('billing_table')}
            class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 hover:bg-amber-100 transition-colors h-8"
            title="Leistungsaufstellung & Abrechnungstabelle einfügen"
        >
            <Receipt class="w-3.5 h-3.5 text-amber-600" />
            <span>Abrechnungstabelle</span>
        </button>

        <button
            type="button"
            onclick={() => onAddBlock('columns', undefined, 3)}
            class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:border-violet-400 transition-colors h-8"
            title="3-spaltige Fußzeile für Anschrift, Bankverbindung & Firmendaten"
        >
            <Columns3 class="w-3.5 h-3.5 text-violet-600" />
            <span>3 Spalten (Fußzeile)</span>
        </button>

        <button
            type="button"
            onclick={() => onAddBlock('columns', undefined, 2)}
            class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:border-violet-400 transition-colors h-8"
            title="2-spaltigen Bereich einfügen"
        >
            <Columns2 class="w-3.5 h-3.5 text-neutral-500" />
            <span>2 Spalten</span>
        </button>

        <button
            type="button"
            onclick={() => onAddBlock('columns', undefined, 4)}
            class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:border-violet-400 transition-colors h-8"
            title="4-spaltigen Bereich einfügen"
        >
            <Columns4 class="w-3.5 h-3.5 text-neutral-500" />
            <span>4 Spalten</span>
        </button>

        <button
            type="button"
            onclick={() => onAddBlock('logo')}
            class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:border-violet-400 transition-colors h-8"
            title="Firmenlogo Block einfügen"
        >
            <ImageIcon class="w-3.5 h-3.5 text-emerald-600" />
            <span>Firmenlogo</span>
        </button>

        <button
            type="button"
            onclick={() => onInsertLetterhead('formB')}
            class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:border-violet-400 transition-colors h-8"
            title="DIN 5008 Briefkopf (Absender, Anschrift, Betreff, Datum)"
        >
            <Mail class="w-3.5 h-3.5 text-sky-600" />
            <span>Briefkopf (DIN 5008)</span>
        </button>

        <button
            type="button"
            onclick={() => onAddBlock('page_break')}
            class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700/80 hover:bg-rose-100 transition-colors h-8"
            title="Manuellen Seitenumbruch (DIN A4) erzwingen"
        >
            <Scissors class="w-3.5 h-3.5 text-rose-600" />
            <span>Seitenumbruch</span>
        </button>
    </div>
</div>
