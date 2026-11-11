<script lang="ts">
    import type { LetterPositions, PositionKey, QuickLetterCompany } from './quickLetterTypes';
    import QuickLetterDraggableItem from './QuickLetterDraggableItem.svelte';
    import QuickLetterFooterPreview from './QuickLetterFooterPreview.svelte';
    import QuickLetterPreviewToolbar from './QuickLetterPreviewToolbar.svelte';

    interface Props {
        containerWidth: number;
        previewZoom: number;
        positions: LetterPositions;
        selectedElementKey: PositionKey | null;
        activeDragKey: PositionKey | null;
        activeGuideLines: { x: number | null; y: number | null };
        currentCompany: QuickLetterCompany | null;
        effectiveLogoUrl: string | null;
        returnAddressLine: string;
        addressLines: string[];
        formattedDisplayDate: string;
        reference: string;
        subject: string;
        salutationLine: string;
        letterBody: string;
        closingLine: string;
        senderName: string;
        includeFooter: boolean;
        includeContactUnderLogo: boolean;
        isSavingToPb: boolean;
        lastSyncedPbTime: string | null;
        paperSheetEl: HTMLDivElement | undefined;
        onSelectElement: (key: PositionKey, e?: MouseEvent | TouchEvent) => void;
        onStartDrag: (e: MouseEvent | TouchEvent, key: PositionKey) => void;
        onResetSinglePosition: (key: PositionKey, e?: MouseEvent) => void;
        onBackgroundClick: (e: MouseEvent) => void;
        onLogoImageLoad: (e: Event) => void;
    }

    let {
        containerWidth = $bindable(480),
        previewZoom = $bindable(1),
        positions,
        selectedElementKey,
        activeDragKey,
        activeGuideLines,
        currentCompany,
        effectiveLogoUrl,
        returnAddressLine,
        addressLines,
        formattedDisplayDate,
        reference,
        subject,
        salutationLine,
        letterBody,
        closingLine,
        senderName,
        includeFooter,
        includeContactUnderLogo,
        isSavingToPb,
        lastSyncedPbTime,
        paperSheetEl = $bindable(),
        onSelectElement,
        onStartDrag,
        onResetSinglePosition,
        onBackgroundClick,
        onLogoImageLoad
    }: Props = $props();

    let baseSheetWidth = $derived(Math.max(280, Math.min(containerWidth > 40 ? containerWidth - 32 : 480, 500)));
    let paperSheetWidth = $derived(Math.round(baseSheetWidth * previewZoom));
    let scale = $derived(paperSheetWidth > 0 ? paperSheetWidth / 794 : 0.6);
    let sheetHeight = $derived(Math.round(1123 * scale));

    let phone = $derived(currentCompany?.number_telephone || currentCompany?.number_mobile || '');
    let email = $derived(currentCompany?.email || '');
    let website = $derived(currentCompany?.website || '');
</script>

<div bind:clientWidth={containerWidth} class="w-full flex flex-col items-center justify-start overflow-auto custom-scrollbar">
    <QuickLetterPreviewToolbar 
        {isSavingToPb} 
        {lastSyncedPbTime} 
        bind:previewZoom 
    />

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        bind:this={paperSheetEl}
        onclick={onBackgroundClick}
        class="bg-white rounded-sm shadow-2xl border border-neutral-300 text-neutral-900 relative select-none overflow-hidden touch-pan-x touch-pan-y shrink-0 {activeDragKey ? '!transition-none cursor-grabbing' : 'transition-all duration-75'}"
        style="width: {paperSheetWidth}px; height: {sheetHeight}px;"
        data-sheet-bg="true"
    >
        <div class="absolute left-1 w-2 h-[1px] bg-neutral-300 pointer-events-none" style="top: {180 * scale}px;"></div>
        <div class="absolute left-1 w-3.5 h-[1px] bg-neutral-300 pointer-events-none" style="top: {315 * scale}px;"></div>
        <div class="absolute left-1 w-2 h-[1px] bg-neutral-300 pointer-events-none" style="top: {450 * scale}px;"></div>

        {#if activeGuideLines.x !== null}
            <div class="absolute top-0 bottom-0 w-[1px] bg-sky-500/90 z-40 pointer-events-none" style="left: {activeGuideLines.x * scale}px;">
                <span class="absolute top-2 -left-3 bg-sky-600 text-white text-[7px] font-mono px-1 py-0.5 rounded">X:{activeGuideLines.x}</span>
            </div>
        {/if}
        {#if activeGuideLines.y !== null}
            <div class="absolute left-0 right-0 h-[1px] bg-sky-500/90 z-40 pointer-events-none" style="top: {activeGuideLines.y * scale}px;">
                <span class="absolute left-2 -top-3 bg-sky-600 text-white text-[7px] font-mono px-1 py-0.5 rounded">Y:{activeGuideLines.y}</span>
            </div>
        {/if}

        <QuickLetterDraggableItem
            itemKey="logo"
            position={positions.logo}
            {scale}
            isSelected={selectedElementKey === 'logo'}
            isDragging={activeDragKey === 'logo'}
            title="Firmenlogo & Infoblock"
            onSelect={onSelectElement}
            onStartDrag={onStartDrag}
            onResetPosition={onResetSinglePosition}
        >
            <div class="w-full h-full flex flex-col justify-start items-end pointer-events-none select-none">
                {#if effectiveLogoUrl}
                    <img src={effectiveLogoUrl} alt="Logo" onload={onLogoImageLoad} class="w-full max-h-[85px] object-contain block" />
                {:else}
                    <div class="font-black text-neutral-800 tracking-tight text-right truncate" style="font-size: {13 * scale * 1.3}px;">
                        {currentCompany?.name || 'Seniorenassistenz'}
                    </div>
                {/if}

                {#if includeContactUnderLogo}
                    <div class="text-right text-neutral-600 leading-tight mt-1 truncate w-full" style="font-size: {Math.max(6, 8 * scale * 1.25)}px;">
                        {#if phone}<div>Tel: {phone}</div>{/if}
                        {#if email}<div>E-Mail: {email}</div>{/if}
                        {#if website}<div>Web: {website}</div>{/if}
                    </div>
                {/if}
            </div>
        </QuickLetterDraggableItem>

        <QuickLetterDraggableItem
            itemKey="absender"
            position={positions.absender}
            {scale}
            isSelected={selectedElementKey === 'absender'}
            isDragging={activeDragKey === 'absender'}
            title="Rücksendezeile (7 pt)"
            onSelect={onSelectElement}
            onStartDrag={onStartDrag}
            onResetPosition={onResetSinglePosition}
        >
            <div class="text-neutral-500 border-b border-neutral-300 truncate pointer-events-none select-none leading-none w-full" style="font-size: {Math.max(6, 7 * scale * 1.25)}px; padding-bottom: 2px;">
                {returnAddressLine}
            </div>
        </QuickLetterDraggableItem>

        <QuickLetterDraggableItem
            itemKey="anschrift"
            position={positions.anschrift}
            {scale}
            isSelected={selectedElementKey === 'anschrift'}
            isDragging={activeDragKey === 'anschrift'}
            title="Empfängeradresse"
            onSelect={onSelectElement}
            onStartDrag={onStartDrag}
            onResetPosition={onResetSinglePosition}
        >
            <div class="space-y-0.5 text-neutral-900 font-medium pointer-events-none select-none leading-tight" style="font-size: {10 * scale * 1.3}px;">
                {#if addressLines.length > 0}
                    {#each addressLines as line}<div>{line}</div>{/each}
                {:else}
                    <div class="text-neutral-400 italic">(Empfänger angeben)</div>
                {/if}
            </div>
        </QuickLetterDraggableItem>

        <QuickLetterDraggableItem
            itemKey="datum"
            position={positions.datum}
            {scale}
            isSelected={selectedElementKey === 'datum'}
            isDragging={activeDragKey === 'datum'}
            title="Datum & Referenz (auf Betreffhöhe)"
            onSelect={onSelectElement}
            onStartDrag={onStartDrag}
            onResetPosition={onResetSinglePosition}
        >
            <div class="text-neutral-700 pointer-events-none select-none leading-tight text-right" style="font-size: {9 * scale * 1.3}px;">
                {#if reference}<div class="text-neutral-500 mb-0.5">Ihr Zeichen: {reference}</div>{/if}
                <div class="font-semibold text-neutral-900">{formattedDisplayDate}</div>
            </div>
        </QuickLetterDraggableItem>

        <QuickLetterDraggableItem
            itemKey="betreff"
            position={positions.betreff}
            {scale}
            isSelected={selectedElementKey === 'betreff'}
            isDragging={activeDragKey === 'betreff'}
            title="Betreffzeile"
            onSelect={onSelectElement}
            onStartDrag={onStartDrag}
            onResetPosition={onResetSinglePosition}
        >
            <div class="font-bold text-neutral-950 pointer-events-none select-none leading-snug" style="font-size: {12 * scale * 1.3}px;">
                {subject ? (subject.toLowerCase().startsWith('betreff:') ? subject : `Betreff: ${subject}`) : 'Geschäftsbrief'}
            </div>
        </QuickLetterDraggableItem>

        <QuickLetterDraggableItem
            itemKey="body"
            position={positions.body}
            {scale}
            isSelected={selectedElementKey === 'body'}
            isDragging={activeDragKey === 'body'}
            title="Brieftext & Grußformel"
            onSelect={onSelectElement}
            onStartDrag={onStartDrag}
            onResetPosition={onResetSinglePosition}
        >
            <div class="text-neutral-800 pointer-events-none select-none" style="font-size: {Math.max(8.5, 10.5 * scale * 1.25)}px; line-height: 1.5;">
                <div class="font-semibold text-neutral-900 mb-2">{salutationLine}</div>
                <div class="space-y-2">
                    {#each (letterBody || '(Brieftext im Editor verfassen...)').split('\n\n') as p}
                        <p class="text-neutral-700 m-0 leading-relaxed">{p}</p>
                    {/each}
                </div>
                <div class="pt-2.5">
                    <div>{closingLine}</div>
                    <div class="font-bold text-neutral-900 mt-2.5">{senderName || (currentCompany?.name || '')}</div>
                </div>
            </div>
        </QuickLetterDraggableItem>

        {#if includeFooter}
            <QuickLetterFooterPreview company={currentCompany} {scale} />
        {:else}
            <div class="absolute bottom-2 inset-x-0 text-center text-[7px] text-neutral-300 uppercase tracking-widest pointer-events-none select-none">
                DIN 5008 • Ohne Fußzeile
            </div>
        {/if}
    </div>
</div>
