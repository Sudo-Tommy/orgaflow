<script lang="ts">
    import type { CanvasField } from "$lib/services/editorService.svelte";
    import { Trash2, Copy } from "lucide-svelte";

    let { activeField, onDuplicate, onDelete }: {
        activeField: CanvasField;
        onDuplicate: (id: string) => void;
        onDelete: (id: string) => void;
    } = $props();
</script>

<div class="space-y-4">
    <div class="flex justify-between items-center">
        <span class="text-[10px] font-black uppercase tracking-widest text-brand-600 bg-brand-50 dark:bg-brand-950/40 px-3 py-1.5 rounded-lg border border-brand-100 dark:border-brand-900">
            {activeField.type} Element
        </span>
        <div class="flex items-center gap-1">
            <button 
                type="button"
                onclick={() => onDuplicate(activeField.id)} 
                class="text-brand-500 hover:text-white hover:bg-brand-500 p-2 rounded-xl transition-all shadow-xs border border-transparent hover:border-brand-600 active:scale-95 touch-manipulation cursor-pointer" 
                title="Element duplizieren"
            >
                <Copy class="w-4 h-4" />
            </button>
            <button 
                type="button"
                onclick={() => onDelete(activeField.id)} 
                class="text-rose-500 hover:text-white hover:bg-rose-500 p-2 rounded-xl transition-all shadow-xs border border-transparent hover:border-rose-600 active:scale-95 touch-manipulation cursor-pointer" 
                title="Element löschen"
            >
                <Trash2 class="w-4 h-4" />
            </button>
        </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
        <div>
            <label for="prop-x" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">X Pos (px)</label>
            <div class="flex items-center gap-1">
                <button type="button" onclick={() => activeField.x = Math.max(0, activeField.x - 10)} class="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-xs flex items-center justify-center active:scale-90 touch-manipulation cursor-pointer" title="-10px">-10</button>
                <input id="prop-x" type="number" bind:value={activeField.x} class="orga-input-clear py-1 px-2 text-center text-sm font-mono flex-1 min-w-0" />
                <button type="button" onclick={() => activeField.x = activeField.x + 10} class="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-xs flex items-center justify-center active:scale-90 touch-manipulation cursor-pointer" title="+10px">+10</button>
            </div>
        </div>
        <div>
            <label for="prop-y" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Y Pos (px)</label>
            <div class="flex items-center gap-1">
                <button type="button" onclick={() => activeField.y = Math.max(0, activeField.y - 10)} class="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-xs flex items-center justify-center active:scale-90 touch-manipulation cursor-pointer" title="-10px">-10</button>
                <input id="prop-y" type="number" bind:value={activeField.y} class="orga-input-clear py-1 px-2 text-center text-sm font-mono flex-1 min-w-0" />
                <button type="button" onclick={() => activeField.y = activeField.y + 10} class="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-xs flex items-center justify-center active:scale-90 touch-manipulation cursor-pointer" title="+10px">+10</button>
            </div>
        </div>
        <div>
            <label for="prop-w" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Breite (px)</label>
            <div class="flex items-center gap-1">
                <button type="button" onclick={() => activeField.w = Math.max(20, activeField.w - 10)} class="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-xs flex items-center justify-center active:scale-90 touch-manipulation cursor-pointer" title="-10px">-10</button>
                <input id="prop-w" type="number" bind:value={activeField.w} class="orga-input-clear py-1 px-2 text-center text-sm font-mono flex-1 min-w-0" />
                <button type="button" onclick={() => activeField.w = activeField.w + 10} class="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-xs flex items-center justify-center active:scale-90 touch-manipulation cursor-pointer" title="+10px">+10</button>
            </div>
        </div>
        <div>
            <label for="prop-h" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Höhe (px)</label>
            <div class="flex items-center gap-1">
                <button type="button" onclick={() => activeField.h = Math.max(20, activeField.h - 10)} class="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-xs flex items-center justify-center active:scale-90 touch-manipulation cursor-pointer" title="-10px">-10</button>
                <input id="prop-h" type="number" bind:value={activeField.h} class="orga-input-clear py-1 px-2 text-center text-sm font-mono flex-1 min-w-0" />
                <button type="button" onclick={() => activeField.h = activeField.h + 10} class="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-xs flex items-center justify-center active:scale-90 touch-manipulation cursor-pointer" title="+10px">+10</button>
            </div>
        </div>
    </div>
</div>
