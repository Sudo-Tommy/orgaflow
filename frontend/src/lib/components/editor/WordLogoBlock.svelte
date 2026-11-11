<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import type { WordBlock } from "./wordTypes";
    import { Image as ImageIcon } from "lucide-svelte";
    import WordLogoToolbar from "./WordLogoToolbar.svelte";
    import WordLogoResizeHandles from "./WordLogoResizeHandles.svelte";
    import WordLogoSpacingHandle from "./WordLogoSpacingHandle.svelte";
    import { handleHeightResize, handleImageSnapDrag, type SnapInfo } from "./wordLogoInteractions";

    let { 
        block = $bindable(), 
        isSelected, 
        zoom = 1,
        isFirst = false,
        isLast = false,
        onFocus,
        onMoveUp,
        onMoveDown,
        onDuplicate,
        onDelete
    } = $props<{
        block: WordBlock;
        isSelected: boolean;
        zoom?: number;
        isFirst?: boolean;
        isLast?: boolean;
        onFocus: () => void;
        onMoveUp?: () => void;
        onMoveDown?: () => void;
        onDuplicate?: () => void;
        onDelete?: () => void;
    }>();

    let containerEl = $state<HTMLElement | null>(null);
    let imageEl = $state<HTMLElement | null>(null);

    let isResizing = $state(false);
    let isDraggingSnap = $state(false);
    let snapInfo = $state<SnapInfo | null>(null);

    let userCompany = $derived.by(() => {
        const user = pb.authStore.model;
        let cId = user?.company;
        if (Array.isArray(cId)) cId = cId[0];
        if (cId) return orgaStore.company?.data?.find((c: any) => c.id === cId);
        return orgaStore.company?.data?.[0];
    });

    let logoUrl = $derived.by(() => {
        if (block.logoConfig?.url) return block.logoConfig.url;
        if (userCompany && userCompany.logo) {
            return pb.files.getURL(userCompany, userCompany.logo);
        }
        return null;
    });

    // Ensure clean default settings (full width in flow, never floating)
    $effect(() => {
        if (!block.logoConfig) {
            block.logoConfig = {
                height: 90,
                align: 'right',
                isFree: false,
                repeatOnAllPages: false,
                fit: 'contain',
                imgOffsetX: 0,
                imgOffsetY: 0,
                marginTop: 0,
                marginBottom: 8
            };
        } else {
            block.logoConfig.isFree = false;
            if (!block.logoConfig.height) block.logoConfig.height = 90;
            if (!block.logoConfig.align) block.logoConfig.align = 'right';
            if (!block.logoConfig.fit) block.logoConfig.fit = 'contain';
            if (block.logoConfig.marginTop === undefined) block.logoConfig.marginTop = 0;
            if (block.logoConfig.marginBottom === undefined) block.logoConfig.marginBottom = 8;
        }
    });

    let height = $derived(block.logoConfig?.height || 90);
    let align = $derived<'left' | 'center' | 'right'>(block.logoConfig?.align || 'right');
    let fit = $derived(block.logoConfig?.fit ?? 'contain');

    function onStartHeightResize(e: PointerEvent) {
        isResizing = true;
        handleHeightResize(e, block, zoom, onFocus, () => {}, () => {
            isResizing = false;
        });
    }

    function onStartSnapDrag(e: PointerEvent) {
        if (!containerEl || !imageEl) return;
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('[data-no-drag]')) return;

        isDraggingSnap = true;
        handleImageSnapDrag(e, containerEl, imageEl, block, zoom, onFocus, (info) => {
            snapInfo = info;
        }, (finalAlign) => {
            isDraggingSnap = false;
            snapInfo = null;
            if (block.logoConfig) block.logoConfig.align = finalAlign;
        });
    }

    function setSnap(newAlign: 'left' | 'center' | 'right') {
        if (!block.logoConfig) return;
        block.logoConfig.align = newAlign;
        block.logoConfig.imgOffsetX = 0;
        block.logoConfig.imgOffsetY = 0;
    }

    function setHeight(newH: number) {
        if (!block.logoConfig) return;
        block.logoConfig.height = newH;
    }

    function toggleRepeat() {
        if (!block.logoConfig) return;
        block.logoConfig.repeatOnAllPages = !block.logoConfig.repeatOnAllPages;
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div 
    class="w-full select-none relative my-1 cursor-pointer" 
    onclick={(e) => { e.stopPropagation(); onFocus(); }} 
    role="region" 
    aria-label="Firmenlogo Box (100% Breite)"
>
    <!-- 100% Width Box Frame -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
        bind:this={containerEl}
        class="w-full rounded-xl overflow-hidden relative transition-colors {isSelected ? 'border-2 border-violet-500 bg-violet-50/20 dark:bg-violet-950/20 shadow-xs ring-1 ring-violet-500/30' : (logoUrl ? 'border border-transparent hover:border-dashed hover:border-violet-400/60' : 'border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/30 dark:bg-neutral-800/10')}"
        style="height: {height}px;"
        onclick={(e) => { e.stopPropagation(); onFocus(); }}
    >
        <!-- Horizontal Inner Image Alignment Wrapper -->
        <div 
            class="w-full h-full relative flex items-center px-2 cursor-grab active:cursor-grabbing {align === 'left' ? 'justify-start' : align === 'center' ? 'justify-center' : 'justify-end'}"
            onpointerdown={onStartSnapDrag}
            onclick={(e) => { e.stopPropagation(); onFocus(); }}
            title="Klicken & Ziehen zum Verschieben mit Snaps (Links, Mitte, Rechts)"
        >
            <div 
                bind:this={imageEl}
                class="h-full max-w-full flex items-center transition-transform duration-75"
                style="{snapInfo?.offsetX ? `transform: translateX(${snapInfo.offsetX}px);` : ''}"
            >
                {#if logoUrl}
                    <img 
                        src={logoUrl} 
                        alt="Firmenlogo" 
                        class="max-h-full max-w-full pointer-events-none select-none"
                        style="object-fit: {fit};" 
                    />
                {:else}
                    <div class="h-full flex items-center justify-center gap-2 text-neutral-400 font-bold text-xs px-4">
                        <ImageIcon class="w-4 h-4 text-emerald-500" />
                        <span>Firmenlogo hier einfügen</span>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Magnetic Snap Guideline Display -->
        {#if isDraggingSnap && snapInfo?.activeSnap}
            <div 
                class="absolute top-0 bottom-0 w-0.5 bg-violet-500 shadow-md pointer-events-none z-20 animate-in fade-in"
                style="left: {snapInfo.guideX}px;"
            >
                <div class="absolute top-1 -translate-x-1/2 left-0 bg-violet-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap">
                    {snapInfo.snapLabel}
                </div>
            </div>
        {/if}
    </div>

    <!-- Bottom Height Resize Handle -->
    {#if isSelected && !isDraggingSnap}
        <WordLogoResizeHandles 
            {isResizing} 
            currentHeight={height} 
            onStartResize={onStartHeightResize} 
        />
    {/if}

    <!-- Interaktiver Abstands-Ziehgriff direkt zwischen Logo und Adressblock -->
    {#if isSelected && !isDraggingSnap && !isResizing && block.logoConfig}
        <WordLogoSpacingHandle 
            bind:marginBottom={block.logoConfig.marginBottom} 
            {zoom} 
        />
    {/if}

    <!-- Logo Toolbar with Snaps & Settings -->
    {#if isSelected && !isDraggingSnap}
        <WordLogoToolbar 
            bind:block 
            {height} 
            {align}
            {isFirst}
            {isLast}
            onSetSnap={setSnap}
            onSetHeight={setHeight}
            onToggleRepeat={toggleRepeat} 
            {onMoveUp}
            {onMoveDown}
            {onDuplicate}
            {onDelete}
        />
    {/if}
</div>
