<script lang="ts">
    import { 
        AlignLeft, 
        AlignCenter, 
        AlignRight, 
        Maximize2, 
        Minimize2, 
        Repeat, 
        ChevronUp, 
        ChevronDown, 
        Copy, 
        Trash2,
        Magnet
    } from "lucide-svelte";
    import type { WordBlock } from "./wordTypes";

    let {
        block = $bindable(),
        height,
        align,
        isFirst = false,
        isLast = false,
        onSetSnap,
        onSetHeight,
        onToggleRepeat,
        onMoveUp,
        onMoveDown,
        onDuplicate,
        onDelete
    } = $props<{
        block: WordBlock;
        height: number;
        align: 'left' | 'center' | 'right';
        isFirst?: boolean;
        isLast?: boolean;
        onSetSnap: (snap: 'left' | 'center' | 'right') => void;
        onSetHeight: (h: number) => void;
        onToggleRepeat: () => void;
        onMoveUp?: () => void;
        onMoveDown?: () => void;
        onDuplicate?: () => void;
        onDelete?: () => void;
    }>();

    let fit = $derived(block.logoConfig?.fit ?? 'contain');
    let repeat = $derived(block.logoConfig?.repeatOnAllPages ?? false);
    let isConfirmingDelete = $state(false);

    const heightPresets = [
        { label: '60px', val: 60 },
        { label: '100px', val: 100 },
        { label: '140px', val: 140 }
    ];

    function toggleFit() {
        if (!block.logoConfig) return;
        block.logoConfig.fit = fit === 'cover' ? 'contain' : 'cover';
    }

    function handleDeleteClick(e: MouseEvent) {
        e.stopPropagation();
        if (isConfirmingDelete) {
            isConfirmingDelete = false;
            onDelete?.();
        } else {
            isConfirmingDelete = true;
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    data-no-drag="true"
    class="absolute -bottom-12 left-0 flex flex-wrap items-center gap-1.5 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md shadow-2xl border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 rounded-xl z-40 text-xs whitespace-nowrap select-none ring-1 ring-violet-500/20"
    onclick={(e) => e.stopPropagation()}
    onpointerdown={(e) => e.stopPropagation()}
>
    <!-- Snap Buttons: Links, Mitte, Rechts -->
    <div class="flex items-center gap-1">
        <span class="text-[10px] text-neutral-400 font-bold flex items-center gap-0.5" title="Magnetisches Einrasten">
            <Magnet class="w-3 h-3 text-violet-500" />
            Snaps:
        </span>
        <div class="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-700 p-0.5 rounded-lg">
            <button
                type="button"
                onclick={() => onSetSnap('left')}
                class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer {align === 'left' ? 'bg-violet-600 text-white shadow-xs' : 'text-neutral-600 dark:text-neutral-300 hover:text-violet-600'}"
                title="Bild links einrasten"
            >
                <AlignLeft class="w-2.5 h-2.5" />
                <span>Links</span>
            </button>
            <button
                type="button"
                onclick={() => onSetSnap('center')}
                class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer {align === 'center' ? 'bg-violet-600 text-white shadow-xs' : 'text-neutral-600 dark:text-neutral-300 hover:text-violet-600'}"
                title="Bild mittig einrasten"
            >
                <AlignCenter class="w-2.5 h-2.5" />
                <span>Mitte</span>
            </button>
            <button
                type="button"
                onclick={() => onSetSnap('right')}
                class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer {align === 'right' ? 'bg-violet-600 text-white shadow-xs' : 'text-neutral-600 dark:text-neutral-300 hover:text-violet-600'}"
                title="Bild rechts einrasten (DIN 5008)"
            >
                <AlignRight class="w-2.5 h-2.5" />
                <span>Rechts</span>
            </button>
        </div>
    </div>

    <div class="h-3.5 w-px bg-neutral-200 dark:bg-neutral-700"></div>

    <!-- Height Presets -->
    <div class="flex items-center gap-1" title="Höhe der Picturebox">
        <span class="text-[10px] text-neutral-400 font-bold">Höhe:</span>
        {#each heightPresets as hp}
            <button
                type="button"
                onclick={() => onSetHeight(hp.val)}
                class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer {height === hp.val ? 'bg-violet-600 text-white shadow-xs' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'}"
            >
                {hp.label}
            </button>
        {/each}
    </div>

    <div class="h-3.5 w-px bg-neutral-200 dark:bg-neutral-700"></div>

    <!-- Fit Mode Toggle -->
    <button
        type="button"
        onclick={toggleFit}
        class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200"
        title="Bild-Skalierung: {fit === 'cover' ? 'Ausfüllen (Cover)' : 'Einpassen (Contain)'}"
    >
        {#if fit === 'cover'}
            <Maximize2 class="w-2.5 h-2.5 text-violet-600" />
            <span>Ausfüllen</span>
        {:else}
            <Minimize2 class="w-2.5 h-2.5 text-emerald-600" />
            <span>Einpassen</span>
        {/if}
    </button>

    <!-- Repeat on all pages -->
    <button
        type="button"
        onclick={onToggleRepeat}
        class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer {repeat ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}"
        title="Logo auf allen Folgeseiten wiederholen"
    >
        <Repeat class="w-2.5 h-2.5" />
        <span>Folgeseiten</span>
    </button>

    <div class="h-3.5 w-px bg-neutral-200 dark:bg-neutral-700"></div>

    <!-- Move Up / Down -->
    {#if onMoveUp}
        <button
            type="button"
            onclick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={isFirst}
            class="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-violet-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors disabled:opacity-20 cursor-pointer"
            title="Nach oben verschieben"
        >
            <ChevronUp class="w-3.5 h-3.5" />
        </button>
    {/if}
    {#if onMoveDown}
        <button
            type="button"
            onclick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={isLast}
            class="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-violet-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors disabled:opacity-20 cursor-pointer"
            title="Nach unten verschieben"
        >
            <ChevronDown class="w-3.5 h-3.5" />
        </button>
    {/if}
    {#if onDuplicate}
        <button
            type="button"
            onclick={(e) => { e.stopPropagation(); onDuplicate(); }}
            class="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-violet-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors cursor-pointer"
            title="Logo duplizieren"
        >
            <Copy class="w-3 h-3" />
        </button>
    {/if}
    {#if onDelete}
        <button
            type="button"
            onclick={handleDeleteClick}
            class="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer {isConfirmingDelete ? 'bg-rose-600 text-white animate-pulse' : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 bg-rose-50/50'}"
            title="Logo-Box löschen"
        >
            <Trash2 class="w-3 h-3 text-rose-600 dark:text-rose-400 {isConfirmingDelete ? 'text-white' : ''}" />
            <span>{isConfirmingDelete ? 'Wirklich löschen?' : 'Löschen'}</span>
        </button>
    {/if}
</div>
