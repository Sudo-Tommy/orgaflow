<script lang="ts">
    import { onMount } from "svelte";
    import type { CanvasField } from "$lib/services/editorService.svelte";
    import EditorField from "./EditorField.svelte";

    let { 
        fields, 
        marginTop = 250, 
        marginBottom = 150, 
        selectedFieldId = $bindable(),
        zoom = $bindable(1)
    } = $props<{
        fields: CanvasField[];
        marginTop?: number;
        marginBottom?: number;
        selectedFieldId: string | null;
        zoom?: number;
    }>();

    let maxBottom = $derived(
        fields.length > 0 
            ? Math.max(...fields.map((f: { y: any; h: any; }) => f.y + (f.h || 50))) 
            : 1123
    );

    let numPages = $derived(Math.max(1, Math.ceil(maxBottom / 1123)));

    onMount(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 850) {
            zoomFit();
        }
    });

    function zoomIn() {
        zoom = Number(Math.min(2.0, (zoom || 1) + 0.1).toFixed(2));
    }

    function zoomOut() {
        zoom = Number(Math.max(0.3, (zoom || 1) - 0.1).toFixed(2));
    }

    function zoom100() {
        zoom = 1;
    }

    function zoomFit() {
        if (typeof window !== 'undefined') {
            const availableWidth = window.innerWidth < 768 ? window.innerWidth - 24 : window.innerWidth - 450;
            const autoZoom = Math.min(1.2, Math.max(0.35, availableWidth / 794));
            zoom = Number(autoZoom.toFixed(2));
        }
    }

    let isFit = $derived.by(() => {
        if (typeof window === 'undefined') return false;
        const availableWidth = window.innerWidth < 768 ? window.innerWidth - 24 : window.innerWidth - 450;
        const fit = Math.min(1.2, Math.max(0.35, availableWidth / 794));
        return Math.abs((zoom || 1) - fit) < 0.05;
    });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    class="flex-1 overflow-auto custom-scrollbar bg-neutral-200/80 flex flex-col items-center py-4 px-2 sm:px-4 touch-pan-x touch-pan-y relative select-none" 
    onclick={() => selectedFieldId = null}
>
    <!-- Floating Zoom Control Bar -->
    <div 
        class="sticky top-2 z-40 mb-3 flex items-center gap-1.5 bg-neutral-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-full shadow-lg border border-neutral-700/60 text-xs font-bold shrink-0 select-none active:scale-100" 
        onclick={(e) => e.stopPropagation()}
    >
        <button 
            type="button" 
            onclick={zoomFit} 
            class="px-2.5 py-1 rounded-full transition-colors cursor-pointer {isFit ? 'text-indigo-300 bg-neutral-800' : 'text-neutral-400 hover:text-white'}" 
            title="An Bildschirmbreite anpassen"
        >
            Fit
        </button>
        <span class="text-neutral-600">|</span>
        <button 
            type="button" 
            onclick={zoomOut} 
            class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-neutral-800 transition-colors text-neutral-300 active:scale-90 cursor-pointer" 
            title="Verkleinern"
        >
            -
        </button>
        <span class="min-w-10 text-center font-mono text-[11px] text-neutral-300">
            {Math.round((zoom || 1) * 100)}%
        </span>
        <button 
            type="button" 
            onclick={zoomIn} 
            class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-neutral-800 transition-colors text-neutral-300 active:scale-90 cursor-pointer" 
            title="Vergrößern"
        >
            +
        </button>
        <span class="text-neutral-600">|</span>
        <button 
            type="button" 
            onclick={zoom100} 
            class="px-2.5 py-1 rounded-full transition-colors cursor-pointer {zoom === 1 ? 'text-indigo-300 bg-neutral-800' : 'text-neutral-400 hover:text-white'}" 
            title="Originalgröße (100%)"
        >
            100%
        </button>
    </div>

    <!-- Scaled wrapper bounding box -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
        class="relative shrink-0 transition-all duration-150"
        style="width: {794 * (zoom || 1)}px; height: {(numPages * 1123) * (zoom || 1)}px;"
        onclick={(e) => e.stopPropagation()}
    >
        <div 
            class="orga-canvas-a4 absolute top-0 left-0 bg-white shadow-2xl shadow-black/15 origin-top-left"
            style="width: 794px; height: {numPages * 1123}px; transform: scale({zoom || 1});"
        >
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
                <EditorField 
                    bind:field={fields[i]} 
                    allFields={fields} 
                    isSelected={selectedFieldId === fields[i].id} 
                    onSelect={() => selectedFieldId = fields[i].id} 
                    isHeaderFooter={isHF} 
                    marginTop={marginTop} 
                    marginBottom={marginBottom} 
                    zoomScale={zoom || 1}
                />
            {/each}
        </div>
    </div>
</div>