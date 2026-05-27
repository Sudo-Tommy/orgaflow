<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { fade } from "svelte/transition";
    import { useEditor } from "$lib/services/editorService.svelte";
    import EditorTopBar from "$lib/components/editor/EditorTopBar.svelte";
    import EditorCanvas from "$lib/components/editor/EditorCanvas.svelte";
    import EditorSidebar from "$lib/components/editor/EditorSidebar.svelte";

    // Die ID kommt nun dynamisch aus dem Pfad (z.B. /documents/12345 oder /documents/new)
    let docId = $derived($page.params.id === 'new' ? null : ($page.params.id ?? null));
    const editor = useEditor($page.params.id === 'new' ? null : ($page.params.id ?? null));

    onMount(() => {
        editor.load();
    });
</script>

<svelte:head>
    <title>{editor.title} - OrgaFlow Editor</title>
</svelte:head>

<!-- Die Toolbar und das Layout brechen hier bewusst aus dem normalen orga-layout aus, um Fullscreen zu sein -->
<div in:fade={{ duration: 250, delay: 50 }} class="fixed inset-0 z-50 bg-neutral-100 flex flex-row font-sans overflow-hidden">
    <EditorTopBar 
        bind:title={editor.title} 
        bind:type={editor.type}
        bind:marginTop={editor.marginTop}
        bind:marginBottom={editor.marginBottom}
        saveMessage={editor.saveMessage} 
        isSaving={editor.isSaving} 
        onSave={editor.save} 
        onAdd={editor.addField}
    />
    <main class="flex-1 flex overflow-hidden relative w-full h-full">
        <EditorCanvas 
            fields={editor.fields} 
            marginTop={editor.marginTop}
            marginBottom={editor.marginBottom}
            bind:selectedFieldId={editor.selectedFieldId}
        />
        <EditorSidebar 
            fields={editor.fields} 
            selectedFieldId={editor.selectedFieldId} 
            onDelete={editor.deleteField}
        />
    </main>
</div>
