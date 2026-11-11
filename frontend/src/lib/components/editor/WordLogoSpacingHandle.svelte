<script lang="ts">
    import { Minus, Plus } from "lucide-svelte";

    let {
        marginBottom = $bindable(),
        zoom = 1,
        onChange
    } = $props<{
        marginBottom?: number;
        zoom?: number;
        onChange?: () => void;
    }>();

    let isDragging = $state(false);
    let currentMb = $derived(marginBottom ?? 8);

    function startDrag(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;

        const startY = e.clientY;
        const initialMb = currentMb;
        const pxPerMm = 3.78 * (zoom || 1);

        function onPointerMove(ev: PointerEvent) {
            const dy = ev.clientY - startY;
            const deltaMm = Math.round(dy / pxPerMm);
            const newMb = Math.max(0, Math.min(80, initialMb + deltaMm));
            if (newMb !== marginBottom) {
                marginBottom = newMb;
                onChange?.();
            }
        }

        function onPointerUp() {
            isDragging = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        }

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    }

    function step(delta: number, e: MouseEvent) {
        e.stopPropagation();
        marginBottom = Math.max(0, Math.min(80, currentMb + delta));
        onChange?.();
    }
</script>

<!-- Interaktiver Abstands-Ziehgriff direkt zwischen Logo und Adressblock -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    data-no-drag="true"
    class="w-full relative flex items-center justify-center my-1 select-none transition-all group/spacer"
    style="height: {Math.max(16, currentMb * 3.78)}px;"
>
    <!-- Dezentes Abstands-Gitter / Bereich -->
    <div class="absolute inset-x-0 inset-y-0.5 rounded-md border border-dashed border-violet-400/40 bg-violet-50/20 dark:bg-violet-950/20 pointer-events-none transition-opacity {isDragging ? 'border-violet-500 bg-violet-100/30 dark:bg-violet-900/30' : 'opacity-80 group-hover/spacer:opacity-100'}"></div>

    <!-- Schwebende Abstands-Pille mit Ziehgriff & Schnelltastern -->
    <div 
        class="relative z-30 flex items-center gap-1 bg-white dark:bg-neutral-800 shadow-md border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 rounded-full text-xs cursor-ns-resize transition-all hover:scale-105 {isDragging ? 'ring-2 ring-violet-500 shadow-lg scale-105' : ''}"
        onpointerdown={startDrag}
        title="Klicken & Ziehen zum stufenlosen Anpassen des Logo-Abstands nach unten"
    >
        <button 
            type="button" 
            onclick={(e) => step(-2, e)} 
            class="w-4 h-4 flex items-center justify-center rounded-full text-neutral-500 hover:text-violet-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            title="Abstand verringern (-2 mm)"
        >
            <Minus class="w-2.5 h-2.5" />
        </button>

        <span class="font-mono text-[10px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-0.5 pointer-events-none">
            ↕ {currentMb} mm
        </span>

        <button 
            type="button" 
            onclick={(e) => step(2, e)} 
            class="w-4 h-4 flex items-center justify-center rounded-full text-neutral-500 hover:text-violet-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            title="Abstand vergrößern (+2 mm)"
        >
            <Plus class="w-2.5 h-2.5" />
        </button>
    </div>

    <!-- Horizontaler Zieh-Balken an der Unterkante -->
    <div 
        class="absolute bottom-0 inset-x-4 h-2 cursor-ns-resize flex items-center justify-center group-hover/spacer:opacity-100 opacity-60 transition-opacity"
        onpointerdown={startDrag}
        title="Unten ziehen zum Vergrößern/Verkleinern"
    >
        <div class="w-24 h-1 rounded-full bg-violet-400 group-hover/spacer:bg-violet-600 transition-colors"></div>
    </div>
</div>
