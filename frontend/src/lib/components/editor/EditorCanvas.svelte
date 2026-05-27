<script lang="ts">
    import type { CanvasField } from "$lib/services/editorService.svelte";
    import EditorField from "./EditorField.svelte";

    let { fields, marginTop = 250, marginBottom = 150, selectedFieldId = $bindable() } = $props<{
        fields: CanvasField[];
        marginTop?: number;
        marginBottom?: number;
        selectedFieldId: string | null;
    }>();

    let maxBottom = $derived(
        fields.length > 0 
            ? Math.max(...fields.map((f: { y: any; h: any; }) => f.y + (f.h || 50))) 
            : 1123
    );

    let numPages = $derived(Math.max(1, Math.ceil(maxBottom / 1123)));
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex-1 overflow-auto custom-scrollbar bg-neutral-200 flex justify-center py-10" onclick={() => selectedFieldId = null}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="orga-canvas-a4 relative bg-white shadow-xl shadow-black/10 shrink-0" style="height: {numPages * 1123}px;" onclick={(e) => e.stopPropagation()}>
        
        {#each Array(numPages) as _, p}
            {#if p > 0}
                <div class="absolute left-0 right-0 border-t-2 border-neutral-300 z-0 pointer-events-none" style="top: {p * 1123}px;">
                    <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-200 text-neutral-500 text-[10px] font-bold px-3 py-1 rounded-full shadow-inner border border-neutral-300">
                        Seitenumbruch
                    </div>
                </div>
            {/if}

            <div class="absolute left-0 right-0 border-b-2 border-dashed border-brand-500/40 z-0 flex items-end pointer-events-none" style="top: {p * 1123 + marginTop}px;">
                <span class="text-[10px] font-bold text-brand-500/60 ml-2 mb-0.5 select-none">Start Dynamischer Textbereich (Seite {p + 1})</span>
            </div>
            <div class="absolute left-0 right-0 border-t-2 border-dashed border-rose-500/40 z-0 flex items-start pointer-events-none" style="top: {(p + 1) * 1123 - marginBottom}px;">
                <span class="text-[10px] font-bold text-rose-500/60 ml-2 mt-0.5 select-none">Ende Dynamischer Textbereich (Seite {p + 1})</span>
            </div>
            
            <div class="absolute left-0 right-0 z-0 flex justify-center pointer-events-none opacity-10 text-[120px] font-black text-neutral-400 select-none" style="top: {p * 1123 + 400}px;">
                {p + 1}
            </div>

            <!-- Geister-Elemente für wiederholte Kopf- und Fußzeilen -->
            {#each fields.filter((f: { y: number; style: { repeatOnAllPages: boolean; }; }) => ((f.y % 1123) < marginTop || (f.y % 1123) >= 1123 - marginBottom) && f.style.repeatOnAllPages !== false) as ghostField}
                <div class="absolute z-30 pointer-events-none opacity-95" style="left: {ghostField.x}px; top: {(ghostField.y % 1123) + p * 1123}px; width: {ghostField.w}px; height: {ghostField.type === 'table' ? '50px' : ghostField.h + 'px'};">
                    <div class="w-full h-full bg-white/90 backdrop-blur-md border-2 border-dashed border-brand-300/50 flex flex-col items-center justify-center rounded overflow-hidden shadow-sm">
                        <span class="text-brand-600/80 font-bold text-[10px] uppercase tracking-widest">{ghostField.type}</span>
                        <span class="text-[8px] text-brand-500/60 font-semibold mt-0.5">Wiederholung</span>
                    </div>
                </div>
            {/each}
        {/each}

        {#each fields as _, i (fields[i].id)}
            {@const isHF = (fields[i].y % 1123) < marginTop || (fields[i].y % 1123) >= 1123 - marginBottom}
            <EditorField bind:field={fields[i]} allFields={fields} isSelected={selectedFieldId === fields[i].id} onSelect={() => selectedFieldId = fields[i].id} isHeaderFooter={isHF} marginTop={marginTop} marginBottom={marginBottom} />
        {/each}
    </div>
</div>