<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { fade } from "svelte/transition";
    import { useEditor } from "$lib/services/editorService.svelte";
    import WordRibbon from "$lib/components/editor/WordRibbon.svelte";
    import WordDocumentCanvas from "$lib/components/editor/WordDocumentCanvas.svelte";
    import WordMobileActionBar from "$lib/components/editor/WordMobileActionBar.svelte";
    import type { WordBlockType } from "$lib/components/editor/wordTypes";
    import { initCursorTracking, insertTokenAtCursor } from "$lib/components/editor/wordCursorManager";

    const docId = $derived($page.params.id === 'new' ? null : ($page.params.id ?? null));
    const editor = useEditor($page.params.id === 'new' ? null : ($page.params.id ?? null));

    let zoom = $state(1);
    let isPreview = $state(false);

    let activeBlock = $derived(
        editor.blocks.find(b => b.id === editor.selectedBlockId) || null
    );

    onMount(() => {
        const cleanupTracking = initCursorTracking();
        editor.load().then(() => {
            if ($page.url.searchParams.get('preset') === 'letterhead' && editor.blocks.length === 0) {
                editor.insertLetterhead('formB');
                editor.title = "Geschäftsbrief mit Firmenlogo (DIN 5008)";
                editor.type = "allgemein";
            }
        });
        zoomFit();

        return () => {
            cleanupTracking();
        };
    });

    function zoomFit() {
        if (typeof window !== 'undefined') {
            const availableWidth = window.innerWidth < 768 ? window.innerWidth - 24 : window.innerWidth - 120;
            const targetWidth = editor.orientation === 'landscape' ? 1123 : 794;
            const autoZoom = Math.min(1.2, Math.max(0.4, availableWidth / targetWidth));
            zoom = Number(autoZoom.toFixed(2));
        }
    }

    function handleInsertVariable(token: string) {
        const handled = insertTokenAtCursor(token, activeBlock, () => editor.syncFields());
        if (!handled) {
            const newBlock = editor.addBlock('paragraph');
            newBlock.content = token;
            editor.syncFields();
        }
    }

    function handleKeyDown(e: KeyboardEvent) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            editor.save();
        }
    }
</script>

<svelte:window onkeydown={handleKeyDown} onresize={zoomFit} />

<svelte:head>
    <title>{editor.title} - Word Vorlageneditor | OrgaFlow</title>
</svelte:head>

<div in:fade={{ duration: 180 }} class="fixed inset-0 z-50 bg-neutral-100 dark:bg-neutral-950 flex flex-col font-sans overflow-hidden landscape:pb-0">
    <!-- Top Word Ribbon Toolbar with Preview & Formatting -->
    <WordRibbon
        bind:title={editor.title}
        bind:type={editor.type}
        bind:marginTop={editor.marginTop}
        bind:marginBottom={editor.marginBottom}
        bind:orientation={editor.orientation}
        bind:lineHeight={editor.lineHeight}
        bind:paragraphSpacingBefore={editor.paragraphSpacingBefore}
        bind:paragraphSpacingAfter={editor.paragraphSpacingAfter}
        bind:tableLineSpacing={editor.tableLineSpacing}
        bind:zoom
        bind:isPreview
        {activeBlock}
        blocks={editor.blocks}
        isSaving={editor.isSaving}
        saveMessage={editor.saveMessage}
        onSave={editor.save}
        onAddBlock={(type: WordBlockType, idx?: number, count?: number) => editor.addBlock(type, idx, count)}
        onInsertVariable={handleInsertVariable}
        onInsertLetterhead={(variant) => editor.insertLetterhead(variant)}
        onZoomFit={zoomFit}
        onUpdateSpacings={() => editor.applyGlobalSpacings()}
    />

    <!-- Center Word Document Page Canvas -->
    <main class="flex-1 flex overflow-hidden relative w-full h-full pb-14 md:pb-0">
        <WordDocumentCanvas
            bind:blocks={editor.blocks}
            bind:selectedBlockId={editor.selectedBlockId}
            {zoom}
            {isPreview}
            marginTop={editor.marginTop}
            marginBottom={editor.marginBottom}
            orientation={editor.orientation}
            onAddBlock={(type, idx, count) => editor.addBlock(type, idx, count)}
            onDeleteBlock={(id) => editor.deleteBlock(id)}
            onMoveBlock={(id, dir) => editor.moveBlock(id, dir)}
            onDuplicateBlock={(id) => editor.duplicateBlock(id)}
            onMergeWithNextBlock={(id) => editor.mergeWithNextBlock(id)}
        />
    </main>

    <!-- Mobile Quick Action Floating Bar (hidden in preview) -->
    {#if !isPreview}
        <WordMobileActionBar
            onAddBlock={(type, idx, count) => editor.addBlock(type, idx, count)}
            onInsertVariable={handleInsertVariable}
            onInsertLetterhead={(variant) => editor.insertLetterhead(variant)}
        />
    {/if}
</div>
