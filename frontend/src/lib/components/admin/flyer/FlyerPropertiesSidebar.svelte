<script lang="ts">
    import type { FlyerElement } from './flyerTypes';

    interface Props {
        element: FlyerElement;
        onDelete: () => void;
        onZIndexChange: (delta: number) => void;
    }

    let { element = $bindable(), onDelete, onZIndexChange }: Props = $props();

    // Alphabetisch sortierte Optionen nach deutschem Anzeigetext gemäß alphabetical-select.md
    const FONT_WEIGHT_OPTIONS = [
        { label: 'Fett (Bold)', value: 'bold' },
        { label: 'Normal', value: 'normal' },
        { label: 'Sehr Fett (Black)', value: '900' }
    ];

    const TEXT_ALIGN_OPTIONS = [
        { label: 'Blocksatz', value: 'justify' },
        { label: 'Links', value: 'left' },
        { label: 'Mittig', value: 'center' },
        { label: 'Rechts', value: 'right' }
    ];
</script>

<div class="w-80 bg-white dark:bg-slate-900 border-l border-neutral-200 dark:border-slate-800 flex flex-col no-print shrink-0 z-20 shadow-xl">
    <div class="p-5 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-800/50 flex items-center justify-between">
        <h3 class="font-bold text-neutral-900 dark:text-white">Eigenschaften</h3>
        <span class="text-[10px] font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-widest">{element.type}</span>
    </div>

    <div class="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
        <!-- Text / Inhalt -->
        <div>
            {#if element.type === 'image'}
                <label for="prop-img-url" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Bild-URL / Pfad</label>
                <input id="prop-img-url" type="text" bind:value={element.content} class="orga-input-clear py-1.5 text-sm w-full" placeholder="/favicon.png oder https://..." />
            {:else}
                <label for="prop-content" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Inhalt / Text</label>
                <textarea id="prop-content" bind:value={element.content} rows="4" class="orga-input-clear py-2 text-sm w-full resize-y custom-scrollbar"></textarea>
            {/if}
        </div>

        <!-- Position & Dimensionen -->
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label for="prop-x" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">X Pos (mm)</label>
                <input id="prop-x" type="number" bind:value={element.x} class="orga-input-clear py-1.5 text-sm w-full" />
            </div>
            <div>
                <label for="prop-y" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">Y Pos (mm)</label>
                <input id="prop-y" type="number" bind:value={element.y} class="orga-input-clear py-1.5 text-sm w-full" />
            </div>
            <div>
                <label for="prop-w" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">Breite (mm)</label>
                <input id="prop-w" type="number" bind:value={element.w} class="orga-input-clear py-1.5 text-sm w-full" />
            </div>
            <div>
                <label for="prop-h" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">Höhe (mm) <span class="text-[9px] text-neutral-400 font-normal">0=Auto</span></label>
                <input id="prop-h" type="number" bind:value={element.h} class="orga-input-clear py-1.5 text-sm w-full" />
            </div>
        </div>

        <!-- Typografie & Styling -->
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label for="prop-fs" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">Schriftgröße (pt)</label>
                <input id="prop-fs" type="number" bind:value={element.fontSize} class="orga-input-clear py-1.5 text-sm w-full" />
            </div>
            <div>
                <label for="prop-pad" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">Innenabstand (mm)</label>
                <input id="prop-pad" type="number" bind:value={element.padding} class="orga-input-clear py-1.5 text-sm w-full" />
            </div>
            <div>
                <label for="prop-fw" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">Schriftschnitt</label>
                <select id="prop-fw" bind:value={element.fontWeight} class="orga-input-clear py-1.5 text-sm w-full cursor-pointer">
                    {#each FONT_WEIGHT_OPTIONS as opt}
                        <option value={opt.value}>{opt.label}</option>
                    {/each}
                </select>
            </div>
            <div>
                <label for="prop-ta" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">Ausrichtung</label>
                <select id="prop-ta" bind:value={element.textAlign} class="orga-input-clear py-1.5 text-sm w-full cursor-pointer">
                    {#each TEXT_ALIGN_OPTIONS as opt}
                        <option value={opt.value}>{opt.label}</option>
                    {/each}
                </select>
            </div>
        </div>
        
        <!-- Farben -->
        <div class="grid grid-cols-2 gap-3 pt-2">
            <div>
                <label for="prop-color" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">Textfarbe</label>
                <input id="prop-color" type="color" bind:value={element.color} class="w-full h-8 cursor-pointer rounded border border-neutral-200 dark:border-slate-700" />
            </div>
            <div>
                <label for="prop-bgcolor" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">Hintergrund</label>
                <input id="prop-bgcolor" type="color" bind:value={element.bgColor} class="w-full h-8 cursor-pointer rounded border border-neutral-200 dark:border-slate-700" />
            </div>
        </div>
        
        <!-- Rahmen & Ecken -->
        <div class="grid grid-cols-3 gap-3 pt-2">
            <div>
                <label for="prop-br" class="block text-[10px] font-semibold text-neutral-700 dark:text-slate-300 mb-1 truncate" title="Eckenrundung">Rundung</label>
                <input id="prop-br" type="number" bind:value={element.borderRadius} class="orga-input-clear py-1.5 text-sm w-full" />
            </div>
            <div>
                <label for="prop-bw" class="block text-[10px] font-semibold text-neutral-700 dark:text-slate-300 mb-1 truncate" title="Rahmendicke">Rahmen (mm)</label>
                <input id="prop-bw" type="number" bind:value={element.borderWidth} class="orga-input-clear py-1.5 text-sm w-full" />
            </div>
            <div>
                <label for="prop-bc" class="block text-[10px] font-semibold text-neutral-700 dark:text-slate-300 mb-1 truncate" title="Rahmenfarbe">Rand-Farbe</label>
                <input id="prop-bc" type="color" bind:value={element.borderColor} class="w-full h-8 cursor-pointer rounded border border-neutral-200 dark:border-slate-700" />
            </div>
        </div>

        <label class="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-slate-300 cursor-pointer mt-2 min-h-[36px]">
            <input 
                type="checkbox" 
                checked={element.bgColor === 'transparent'} 
                onchange={(e) => element.bgColor = e.currentTarget.checked ? 'transparent' : '#ffffff'} 
                class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            >
            <span>Kein Hintergrund (Transparent)</span>
        </label>

        <!-- Z-Index / Reihenfolge -->
        <div class="pt-4 border-t border-neutral-100 dark:border-slate-800">
            <span class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-2">Ebene (Reihenfolge)</span>
            <div class="flex gap-2">
                <button
                    type="button"
                    onclick={() => onZIndexChange(-1)}
                    class="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors min-h-[44px] touch-manipulation cursor-pointer"
                >
                    Nach hinten
                </button>
                <button
                    type="button"
                    onclick={() => onZIndexChange(1)}
                    class="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors min-h-[44px] touch-manipulation cursor-pointer"
                >
                    Nach vorne
                </button>
            </div>
        </div>
        
        <button
            type="button"
            onclick={onDelete}
            class="w-full mt-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-sm font-bold rounded-xl transition-colors shadow-sm min-h-[44px] touch-manipulation cursor-pointer active:scale-95"
        >
            Element löschen
        </button>
    </div>
</div>
