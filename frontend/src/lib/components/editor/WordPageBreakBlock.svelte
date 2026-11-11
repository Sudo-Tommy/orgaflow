<script lang="ts">
    import type { WordBlock } from "./wordTypes";
    import { Scissors, FileSpreadsheet } from "lucide-svelte";

    let {
        block = $bindable(),
        isSelected = false,
        onFocus
    } = $props<{
        block: WordBlock;
        isSelected?: boolean;
        onFocus?: () => void;
    }>();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    class="w-full py-2 my-1 select-none cursor-pointer group"
    onclick={() => onFocus?.()}
>
    <div class="relative flex items-center justify-center">
        <!-- Dashed separator line -->
        <div class="absolute inset-0 flex items-center" aria-hidden="true">
            <div class="w-full border-t-2 border-dashed border-rose-300 dark:border-rose-700/80 group-hover:border-rose-400 transition-colors"></div>
        </div>

        <!-- Center Badge -->
        <div class="relative flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-bold shadow-sm group-hover:scale-105 transition-all">
            <Scissors class="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>Manueller Seitenumbruch (DIN A4)</span>
            <span class="text-[9px] font-normal text-rose-500/80 dark:text-rose-400/80 ml-1">Erzwingt neue PDF-Seite</span>
        </div>
    </div>
</div>
