<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { useEditor } from "$lib/services/editorService.svelte";
    import EditorTopBar from "$lib/components/editor/EditorTopBar.svelte";
    import EditorCanvas from "$lib/components/editor/EditorCanvas.svelte";
    import EditorSidebar from "$lib/components/editor/EditorSidebar.svelte";

    // Die ID kommt nun dynamisch aus dem Pfad (z.B. /documents/12345 oder /documents/new)
    const docId = $page.params.id === 'new' ? null : ($page.params.id ?? null);
    const editor = useEditor(docId);

    onMount(() => {
        editor.load();
    });
</script>

<svelte:head>
    <title>{editor.title} - OrgaFlow Editor</title>
</svelte:head>

<!-- Die Toolbar und das Layout brechen hier bewusst aus dem normalen orga-layout aus, um Fullscreen zu sein -->
<div class="fixed inset-0 z-50 bg-[#F8F9FA] flex flex-row font-sans">
    <EditorTopBar 
        bind:title={editor.title} 
        bind:type={editor.type}
        saveMessage={editor.saveMessage} 
        isSaving={editor.isSaving} 
        onSave={editor.save} 
        onAdd={editor.addField}
    />
    <div class="flex-1 flex overflow-hidden relative">
        <EditorCanvas 
            fields={editor.fields} 
            bind:selectedFieldId={editor.selectedFieldId}
        />
        <EditorSidebar 
            fields={editor.fields} 
            selectedFieldId={editor.selectedFieldId} 
            onDelete={editor.deleteField}
        />
    </div>
</div>
