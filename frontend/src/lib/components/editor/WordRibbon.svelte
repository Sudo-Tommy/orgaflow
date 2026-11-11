<script lang="ts">
    import { ChevronLeft, Save, Loader2, Check, Eye, Pencil } from "lucide-svelte";
    import WordRibbonHomeTab from "./WordRibbonHomeTab.svelte";
    import WordRibbonInsertTab from "./WordRibbonInsertTab.svelte";
    import WordRibbonLayoutTab from "./WordRibbonLayoutTab.svelte";
    import WordRibbonTableDesignTab from "./WordRibbonTableDesignTab.svelte";
    import WordRibbonTableLayoutTab from "./WordRibbonTableLayoutTab.svelte";
    import WordTablePropertiesModal from "./WordTablePropertiesModal.svelte";
    import WordBillingTableConfigModal from "./WordBillingTableConfigModal.svelte";
    import type { WordBlock, WordBlockType } from "./wordTypes";

    let {
        title = $bindable(),
        type = $bindable(),
        marginTop = $bindable(),
        marginBottom = $bindable(),
        orientation = $bindable(),
        lineHeight = $bindable(1.4),
        paragraphSpacingBefore = $bindable(0),
        paragraphSpacingAfter = $bindable(4),
        tableLineSpacing = $bindable(1.8),
        zoom = $bindable(1),
        isPreview = $bindable(false),
        activeBlock = null,
        blocks = [],
        isSaving,
        saveMessage,
        onSave,
        onAddBlock,
        onInsertVariable,
        onInsertLetterhead,
        onZoomFit,
        onUpdateSpacings
    } = $props<{
        title: string;
        type: string;
        marginTop: number;
        marginBottom: number;
        orientation: string;
        lineHeight: number;
        paragraphSpacingBefore: number;
        paragraphSpacingAfter: number;
        tableLineSpacing: number;
        zoom: number;
        isPreview: boolean;
        activeBlock: WordBlock | null;
        blocks?: WordBlock[];
        isSaving: boolean;
        saveMessage: string;
        onSave: () => void;
        onAddBlock: (type: WordBlockType, index?: number, count?: number) => void;
        onInsertVariable: (token: string) => void;
        onInsertLetterhead: (variant: 'formA' | 'formB') => void;
        onZoomFit: () => void;
        onUpdateSpacings: () => void;
    }>();

    let logoBlock = $derived(blocks.find((b: WordBlock) => b.type === 'logo') || null);
    let activeTab = $state<'home' | 'insert' | 'layout' | 'table_design' | 'table_layout'>('home');
    let isTableActive = $derived(activeBlock?.type === 'billing_table' || activeBlock?.type === 'table');
    let isPropertiesOpen = $state(false);
    let isBillingConfigOpen = $state(false);
    let isBorderPainterActive = $state(false);

    let prevIsTableActive = $state(false);
    $effect(() => {
        if (isTableActive && !prevIsTableActive) {
            activeTab = 'table_design';
        } else if (!isTableActive && (activeTab === 'table_design' || activeTab === 'table_layout')) {
            activeTab = 'home';
        }
        prevIsTableActive = isTableActive;
    });

    function handleOpenProperties() {
        if (activeBlock?.type === 'billing_table') {
            isBillingConfigOpen = true;
        } else {
            isPropertiesOpen = true;
        }
    }

    const docTypes = [
        { value: 'rechnung', label: 'Rechnung' },
        { value: 'arbeitszeitnachweis', label: 'Arbeitszeitnachweis' },
        { value: 'vollmacht', label: 'Vollmacht' },
        { value: 'antrag', label: 'Antrag' },
        { value: 'kündigung', label: 'Kündigung' },
        { value: 'vertrag', label: 'Vertrag' },
        { value: 'allgemein', label: 'Brief / Sonstiges' }
    ];
</script>

<header data-ribbon="true" class="bg-neutral-900 text-white border-b border-neutral-800 shadow-md shrink-0 z-40 select-none relative">
    <!-- Top Header: Back, Title, Type, Zoom, Preview & Save -->
    <div class="px-3 sm:px-4 py-2 flex items-center justify-between gap-2 border-b border-neutral-800/80">
        <div class="flex items-center gap-2 sm:gap-3 min-w-0">
            <a 
                href="/documents" 
                class="flex items-center gap-1 text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-xs font-bold transition-all shrink-0"
                title="Zurück zur Vorlagenübersicht"
            >
                <ChevronLeft class="w-4 h-4" />
                <span class="hidden sm:inline">Vorlagen</span>
            </a>

            <!-- Document Title -->
            <div class="flex items-center gap-1.5 min-w-0">
                <input 
                    type="text" 
                    bind:value={title} 
                    placeholder="Unbenannte Vorlage..."
                    class="bg-transparent hover:bg-neutral-800/60 focus:bg-neutral-800 text-white font-bold text-xs sm:text-sm px-2 py-1 rounded-md border border-transparent focus:border-neutral-700 outline-none truncate max-w-40 sm:max-w-72 transition-colors"
                />
                <select 
                    bind:value={type}
                    class="hidden md:block bg-neutral-800 border border-neutral-700 text-neutral-300 text-[11px] font-semibold rounded-md px-2 py-1 outline-none cursor-pointer"
                >
                    {#each docTypes as dt}
                        <option value={dt.value}>{dt.label}</option>
                    {/each}
                </select>
            </div>
        </div>

        <!-- Zoom, Preview & Save Actions -->
        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div class="hidden md:flex items-center bg-neutral-800/90 rounded-lg p-0.5 border border-neutral-700 text-xs">
                <button type="button" onclick={onZoomFit} class="px-2 py-1 text-neutral-400 hover:text-white font-semibold text-[11px]" title="Anpassen">Fit</button>
                <button type="button" onclick={() => zoom = Number(Math.max(0.4, zoom - 0.1).toFixed(2))} class="w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-white">-</button>
                <span class="font-mono text-[11px] min-w-9 text-center text-neutral-300">{Math.round(zoom * 100)}%</span>
                <button type="button" onclick={() => zoom = Number(Math.min(2.0, zoom + 0.1).toFixed(2))} class="w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-white">+</button>
            </div>

            <!-- Preview Toggle Button -->
            <button
                type="button"
                onclick={() => isPreview = !isPreview}
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer h-8 border {isPreview ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30' : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white hover:bg-neutral-700'}"
            >
                {#if isPreview}
                    <Pencil class="w-3.5 h-3.5 text-amber-300" /> <span>Bearbeiten</span>
                {:else}
                    <Eye class="w-3.5 h-3.5 text-violet-400" /> <span>Vorschau</span>
                {/if}
            </button>

            <!-- Save Button -->
            <button 
                type="button" 
                onclick={onSave}
                disabled={isSaving}
                class="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-violet-950/40 transition-all active:scale-95 disabled:opacity-50 cursor-pointer h-8"
            >
                {#if isSaving}
                    <Loader2 class="w-3.5 h-3.5 animate-spin" /> <span>Speichert...</span>
                {:else if saveMessage}
                    <Check class="w-3.5 h-3.5 text-emerald-300" /> <span>{saveMessage}</span>
                {:else}
                    <Save class="w-3.5 h-3.5" /> <span>Speichern</span>
                {/if}
            </button>
        </div>
    </div>

    <!-- Word Tabs Bar -->
    {#if !isPreview}
        <div class="px-2 sm:px-4 flex items-center gap-1 bg-neutral-950/50 border-b border-neutral-800 text-xs">
            <button type="button" onclick={() => activeTab = 'home'} class="px-3 sm:px-4 py-2 font-bold tracking-wide transition-colors relative cursor-pointer {activeTab === 'home' ? 'text-violet-400' : 'text-neutral-400 hover:text-neutral-200'}">
                Start
                {#if activeTab === 'home'}<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500"></div>{/if}
            </button>
            <button type="button" onclick={() => activeTab = 'insert'} class="px-3 sm:px-4 py-2 font-bold tracking-wide transition-colors relative cursor-pointer {activeTab === 'insert' ? 'text-violet-400' : 'text-neutral-400 hover:text-neutral-200'}">
                Einfügen
                {#if activeTab === 'insert'}<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500"></div>{/if}
            </button>
            <button type="button" onclick={() => activeTab = 'layout'} class="px-3 sm:px-4 py-2 font-bold tracking-wide transition-colors relative cursor-pointer {activeTab === 'layout' ? 'text-violet-400' : 'text-neutral-400 hover:text-neutral-200'}">
                Layout
                {#if activeTab === 'layout'}<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500"></div>{/if}
            </button>

            <!-- 2 Kontextuelle Tabs wie in Word -->
            {#if isTableActive}
                <button type="button" onclick={() => activeTab = 'table_design'} class="px-3 sm:px-4 py-2 font-bold tracking-wide transition-colors relative cursor-pointer {activeTab === 'table_design' ? 'text-violet-400' : 'text-amber-400 hover:text-amber-300'} flex items-center gap-1">
                    <span>📊 Tabellenentwurf</span>
                    {#if activeTab === 'table_design'}<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500"></div>{/if}
                </button>
                <button type="button" onclick={() => activeTab = 'table_layout'} class="px-3 sm:px-4 py-2 font-bold tracking-wide transition-colors relative cursor-pointer {activeTab === 'table_layout' ? 'text-violet-400' : 'text-cyan-400 hover:text-cyan-300'} flex items-center gap-1">
                    <span>📐 Tabellenlayout</span>
                    {#if activeTab === 'table_layout'}<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"></div>{/if}
                </button>
            {/if}
        </div>

        <!-- Active Tab Ribbon Toolbar -->
        <div class="px-3 sm:px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 shadow-inner relative z-30">
            {#if activeTab === 'home'}
                <WordRibbonHomeTab 
                    {activeBlock} 
                    {logoBlock}
                    bind:lineHeight 
                    bind:paragraphSpacingBefore 
                    bind:paragraphSpacingAfter 
                    bind:tableLineSpacing 
                    onUpdateSpacings={onUpdateSpacings} 
                />
            {:else if activeTab === 'insert'}
                <WordRibbonInsertTab {onAddBlock} {onInsertVariable} {onInsertLetterhead} />
            {:else if activeTab === 'layout'}
                <WordRibbonLayoutTab bind:marginTop bind:marginBottom bind:orientation {logoBlock} onApplyPreset={onInsertLetterhead} />
            {:else if activeTab === 'table_design'}
                <WordRibbonTableDesignTab {activeBlock} bind:isBorderPainterActive onOpenProperties={handleOpenProperties} />
            {:else if activeTab === 'table_layout'}
                <WordRibbonTableLayoutTab {activeBlock} onOpenProperties={handleOpenProperties} />
            {/if}
        </div>
    {:else}
        <div class="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-center text-xs text-amber-300 font-medium">
            👁️ Dokument-Vorschau aktiv: Platzhalter werden mit realistischen Musterdaten dargestellt.
        </div>
    {/if}

    {#if isBillingConfigOpen && activeBlock}
        <WordBillingTableConfigModal bind:block={activeBlock} bind:isOpen={isBillingConfigOpen} onClose={() => isBillingConfigOpen = false} />
    {/if}
    {#if isPropertiesOpen && activeBlock}
        <WordTablePropertiesModal bind:block={activeBlock} bind:isOpen={isPropertiesOpen} onClose={() => isPropertiesOpen = false} />
    {/if}
</header>
