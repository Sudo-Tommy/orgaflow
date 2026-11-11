<script lang="ts">
    import type { CanvasField } from "$lib/services/editorService.svelte";
    import EditorSidebarPositionControls from "./sidebar/EditorSidebarPositionControls.svelte";
    import EditorSidebarTextField from "./sidebar/EditorSidebarTextField.svelte";
    import EditorSidebarTableField from "./sidebar/EditorSidebarTableField.svelte";
    import EditorSidebarStyleControls from "./sidebar/EditorSidebarStyleControls.svelte";

    let { fields, selectedFieldId, onDelete, onDuplicate, isMobile = false, onClose } = $props<{
        fields: CanvasField[];
        selectedFieldId: string | null;
        onDelete: (id: string) => void;
        onDuplicate: (id: string) => void;
        isMobile?: boolean;
        onClose?: () => void;
    }>();

    let activeField = $derived(fields.find((f: CanvasField) => f.id === selectedFieldId) || null);
</script>

<aside class="{isMobile ? 'w-full h-full flex flex-col bg-white dark:bg-slate-900' : 'w-88 bg-white dark:bg-slate-900 border-l border-neutral-200 dark:border-slate-800 hidden md:flex flex-col h-full shrink-0 z-10 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] relative'}">
    <div class="p-4 sm:p-6 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850 flex items-center justify-between">
        <div>
            <h3 class="font-black text-neutral-900 dark:text-white text-base sm:text-lg">Eigenschaften</h3>
            <p class="text-[10px] sm:text-[11px] uppercase tracking-widest text-neutral-400 font-bold mt-0.5">Element konfigurieren</p>
        </div>
        {#if isMobile && onClose}
            <button 
                type="button" 
                onclick={onClose}
                class="w-9 h-9 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm transition-colors active:scale-95 touch-manipulation cursor-pointer"
                aria-label="Eigenschaften schließen"
            >
                ✕
            </button>
        {/if}
    </div>

    <div class="flex-1 p-5 sm:p-6 space-y-6">
        {#if !activeField}
            <div class="text-center text-neutral-400 py-12 flex flex-col items-center gap-3">
                <span class="text-4xl opacity-50 select-none">🖱️</span>
                <p class="text-sm font-medium">Klicke auf ein Element im Canvas,<br>um es zu bearbeiten.</p>
            </div>
        {:else}
            <div class="space-y-6">
                <EditorSidebarPositionControls 
                    {activeField}
                    {onDuplicate}
                    {onDelete}
                />

                {#if activeField.type === 'text'}
                    <EditorSidebarTextField {activeField} />
                {/if}

                {#if activeField.type === 'table'}
                    <EditorSidebarTableField {activeField} />
                {/if}

                <EditorSidebarStyleControls {activeField} />
            </div>
        {/if}
    </div>
</aside>