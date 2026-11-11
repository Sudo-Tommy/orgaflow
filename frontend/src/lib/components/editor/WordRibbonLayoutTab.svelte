<script lang="ts">
    import { LayoutTemplate, RotateCw } from "lucide-svelte";
    import type { WordBlock } from "./wordTypes";

    let { 
        marginTop = $bindable(250), 
        marginBottom = $bindable(150),
        orientation = $bindable("portrait"),
        logoBlock = null,
        onApplyPreset
    } = $props<{
        marginTop: number;
        marginBottom: number;
        orientation: string;
        logoBlock?: WordBlock | null;
        onApplyPreset: (variant: 'formA' | 'formB') => void;
    }>();

    function stepLogo(prop: 'marginTop' | 'marginBottom', delta: number) {
        if (!logoBlock) return;
        if (!logoBlock.logoConfig) logoBlock.logoConfig = {};
        const cur = logoBlock.logoConfig[prop] ?? (prop === 'marginBottom' ? 8 : 0);
        logoBlock.logoConfig[prop] = Math.max(0, Math.min(80, cur + delta));
    }
</script>

<div class="flex flex-wrap items-center gap-3 sm:gap-4 py-1 text-neutral-800 dark:text-neutral-200">
    <!-- Format & Ausrichtung -->
    <div class="flex flex-col gap-0.5">
        <label for="ribbon-orientation" class="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">Ausrichtung</label>
        <div class="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 h-8">
            <button
                type="button"
                id="ribbon-orientation"
                onclick={() => orientation = 'portrait'}
                class="px-2.5 h-7 flex items-center gap-1 rounded-md text-xs font-semibold transition-colors {orientation === 'portrait' ? 'bg-white dark:bg-neutral-700 shadow-xs text-violet-600 dark:text-violet-300' : 'text-neutral-600 dark:text-neutral-400'}"
            >
                <LayoutTemplate class="w-3.5 h-3.5" />
                <span>Hochformat (DIN A4)</span>
            </button>
            <button
                type="button"
                onclick={() => orientation = 'landscape'}
                class="px-2.5 h-7 flex items-center gap-1 rounded-md text-xs font-semibold transition-colors {orientation === 'landscape' ? 'bg-white dark:bg-neutral-700 shadow-xs text-violet-600 dark:text-violet-300' : 'text-neutral-600 dark:text-neutral-400'}"
            >
                <RotateCw class="w-3.5 h-3.5" />
                <span>Querformat</span>
            </button>
        </div>
    </div>

    <div class="h-7 w-px bg-neutral-200 dark:bg-neutral-700 mx-0.5 hidden sm:block"></div>

    <!-- DIN 5008 Schnellauswahl -->
    <div class="flex flex-col gap-0.5">
        <span class="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">DIN 5008 Norm</span>
        <div class="flex items-center gap-1 h-8">
            <button
                type="button"
                onclick={() => onApplyPreset('formB')}
                class="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:border-violet-400 transition-colors"
                title="DIN 5008 Form B: Anschriftfeld bei 45mm (Standard für Geschäftsbriefe)"
            >
                Form B (Standard)
            </button>
            <button
                type="button"
                onclick={() => onApplyPreset('formA')}
                class="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:border-violet-400 transition-colors"
                title="DIN 5008 Form A: Anschriftfeld bei 27mm (Kompakt)"
            >
                Form A (Kompakt)
            </button>
        </div>
    </div>

    <div class="h-7 w-px bg-neutral-200 dark:bg-neutral-700 mx-0.5 hidden sm:block"></div>

    <!-- Ränder (Kopfzeile / Fußzeile) -->
    <div class="flex items-center gap-2">
        <div class="flex flex-col gap-0.5">
            <label for="ribbon-margin-top" class="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">Kopfzeile (px)</label>
            <input 
                id="ribbon-margin-top"
                type="number" 
                bind:value={marginTop} 
                min="50" 
                max="500" 
                class="w-18 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs font-mono h-8 focus:ring-1 focus:ring-violet-500 focus:outline-none"
            />
        </div>
        <div class="flex flex-col gap-0.5">
            <label for="ribbon-margin-bottom" class="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">Fußzeile (px)</label>
            <input 
                id="ribbon-margin-bottom"
                type="number" 
                bind:value={marginBottom} 
                min="50" 
                max="400" 
                class="w-18 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs font-mono h-8 focus:ring-1 focus:ring-violet-500 focus:outline-none"
            />
        </div>
    </div>

    <!-- Logo-Abstände (Kopfbereich oben/unten) -->
    {#if logoBlock}
        <div class="h-7 w-px bg-neutral-200 dark:bg-neutral-700 mx-0.5 hidden sm:block"></div>

        <div class="flex items-center gap-2">
            <!-- Logo Abstand oben -->
            <div class="flex flex-col gap-0.5">
                <span class="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">Logo oben</span>
                <div class="flex items-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-0.5 h-8">
                    <button
                        type="button"
                        onclick={() => stepLogo('marginTop', -2)}
                        class="w-5 h-full flex items-center justify-center text-neutral-500 hover:text-violet-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded font-bold"
                        title="Logo-Abstand oben verringern (-2 mm)"
                    >
                        -
                    </button>
                    <span class="w-11 text-center text-xs font-mono font-bold text-violet-600 dark:text-violet-400">
                        {logoBlock.logoConfig?.marginTop ?? 0} mm
                    </span>
                    <button
                        type="button"
                        onclick={() => stepLogo('marginTop', 2)}
                        class="w-5 h-full flex items-center justify-center text-neutral-500 hover:text-violet-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded font-bold"
                        title="Logo-Abstand oben vergrößern (+2 mm)"
                    >
                        +
                    </button>
                </div>
            </div>

            <!-- Logo Abstand unten -->
            <div class="flex flex-col gap-0.5">
                <span class="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">Logo unten</span>
                <div class="flex items-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-0.5 h-8">
                    <button
                        type="button"
                        onclick={() => stepLogo('marginBottom', -2)}
                        class="w-5 h-full flex items-center justify-center text-neutral-500 hover:text-violet-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded font-bold"
                        title="Logo-Abstand unten verringern (-2 mm)"
                    >
                        -
                    </button>
                    <span class="w-11 text-center text-xs font-mono font-bold text-violet-600 dark:text-violet-400">
                        {logoBlock.logoConfig?.marginBottom ?? 8} mm
                    </span>
                    <button
                        type="button"
                        onclick={() => stepLogo('marginBottom', 2)}
                        class="w-5 h-full flex items-center justify-center text-neutral-500 hover:text-violet-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded font-bold"
                        title="Logo-Abstand unten vergrößern (+2 mm)"
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>
