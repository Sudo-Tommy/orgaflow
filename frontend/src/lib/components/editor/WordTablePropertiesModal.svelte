<script lang="ts">
    import { X, Check, Settings2 } from "lucide-svelte";
    import type { WordBlock } from "./wordTypes";

    let { 
        block = $bindable(), 
        isOpen = $bindable(),
        onClose 
    } = $props<{
        block: WordBlock;
        isOpen: boolean;
        onClose: () => void;
    }>();

    let dialog = $state<HTMLDialogElement>();

    $effect(() => {
        if (!dialog) return;
        if (isOpen) {
            if (!dialog.open) {
                try { dialog.showModal(); } catch {}
            }
        } else if (dialog.open) {
            try { dialog.close(); } catch {}
        }
    });

    let fontSize = $state(block.tableConfig?.fontSize ?? 9.5);
    let headerFontSize = $state(block.tableConfig?.headerFontSize ?? (block.tableConfig?.fontSize ?? 9.5));
    let cellPadding = $state(block.tableConfig?.cellPadding ?? 6);
    let repeatHeader = $state(block.tableConfig?.repeatHeader ?? true);
    let keepTogether = $state(block.tableConfig?.keepTogether ?? true);
    let textWrap = $state(block.tableConfig?.textWrap ?? 'inline');
    let altTitle = $state(block.tableConfig?.altTitle ?? '');
    let altDescription = $state(block.tableConfig?.altDescription ?? '');

    function saveProperties() {
        if (!block.tableConfig) block.tableConfig = {};
        block.tableConfig.fontSize = fontSize;
        block.tableConfig.headerFontSize = headerFontSize;
        block.tableConfig.cellPadding = cellPadding;
        block.tableConfig.repeatHeader = repeatHeader;
        block.tableConfig.keepTogether = keepTogether;
        block.tableConfig.textWrap = textWrap;
        block.tableConfig.altTitle = altTitle;
        block.tableConfig.altDescription = altDescription;
        onClose();
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-xs w-full max-w-md mx-auto my-auto rounded-2xl border-none outline-none shadow-2xl"
    onclick={(e) => { if (e.target === dialog) onClose(); }}
    onclose={onClose}
>
    {#if isOpen}
        <div class="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full overflow-hidden text-neutral-800 dark:text-neutral-200">
            <div class="p-4 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <Settings2 class="w-4 h-4 text-violet-500" />
                    <div>
                        <h3 class="font-bold text-sm">Tabelleneigenschaften</h3>
                        <p class="text-[11px] text-neutral-500">Schriftgrößen, Zellränder &amp; Umbrüche</p>
                    </div>
                </div>
                <button type="button" onclick={onClose} class="w-8 h-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-500 cursor-pointer">
                    <X class="w-4 h-4" />
                </button>
            </div>

            <div class="p-4 space-y-4 text-xs">
                <div>
                    <span class="block font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">Schriftgrößen</span>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label for="table-font-size-input" class="block text-[11px] text-neutral-500 mb-1">Inhalt / Zeilen (pt)</label>
                            <input id="table-font-size-input" type="number" min="6" max="24" step="0.5" bind:value={fontSize} class="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-violet-500 font-mono" />
                        </div>
                        <div>
                            <label for="table-header-font-size-input" class="block text-[11px] text-neutral-500 mb-1">Tabellenkopf (pt)</label>
                            <input id="table-header-font-size-input" type="number" min="6" max="24" step="0.5" bind:value={headerFontSize} class="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-violet-500 font-mono" />
                        </div>
                    </div>
                </div>

                <div class="border-t border-neutral-200 dark:border-neutral-700 pt-3">
                    <label for="cell-padding-input" class="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">Zellenbegrenzung (Innenabstand)</label>
                    <div class="flex items-center gap-2">
                        <input id="cell-padding-input" type="range" min="2" max="16" bind:value={cellPadding} class="flex-1 accent-violet-600" />
                        <span class="font-mono text-xs w-12 text-right">{cellPadding} px</span>
                    </div>
                </div>

                <div class="space-y-2 border-t border-neutral-200 dark:border-neutral-700 pt-3">
                    <span class="block font-bold text-neutral-700 dark:text-neutral-300">Seitenwechsel &amp; Kopfzeilen</span>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" bind:checked={repeatHeader} class="rounded text-violet-600 focus:ring-violet-500" />
                        <span>Kopfzeile auf jeder Folgeseite wiederholen</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" bind:checked={keepTogether} class="rounded text-violet-600 focus:ring-violet-500" />
                        <span>Zeilenumbruch über Seiten hinweg unterbinden</span>
                    </label>
                </div>

                <div class="space-y-1.5 border-t border-neutral-200 dark:border-neutral-700 pt-3">
                    <span class="block font-bold text-neutral-700 dark:text-neutral-300">Textumbruch</span>
                    <div class="grid grid-cols-2 gap-2">
                        <button type="button" onclick={() => textWrap = 'inline'} class="p-2 rounded-xl border text-center transition-all cursor-pointer {textWrap === 'inline' ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 font-bold text-violet-900 dark:text-violet-200' : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750'}">
                            Im Textfluss
                        </button>
                        <button type="button" onclick={() => textWrap = 'wrap'} class="p-2 rounded-xl border text-center transition-all cursor-pointer {textWrap === 'wrap' ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 font-bold text-violet-900 dark:text-violet-200' : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750'}">
                            Umgebend (Umfließen)
                        </button>
                    </div>
                </div>

                <div class="space-y-2 border-t border-neutral-200 dark:border-neutral-700 pt-3">
                    <span class="block font-bold text-neutral-700 dark:text-neutral-300">Alternativtext (Barrierefreiheit)</span>
                    <input type="text" bind:value={altTitle} placeholder="Titel der Tabelle..." class="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-violet-500" />
                    <textarea bind:value={altDescription} rows="2" placeholder="Detaillierte Beschreibung des Inhalts..." class="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-violet-500"></textarea>
                </div>
            </div>

            <div class="p-3 bg-neutral-50 dark:bg-neutral-850 border-t border-neutral-100 dark:border-neutral-700 flex justify-end gap-2">
                <button type="button" onclick={onClose} class="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-semibold cursor-pointer">
                    Abbrechen
                </button>
                <button type="button" onclick={saveProperties} class="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1">
                    <Check class="w-3.5 h-3.5" />
                    <span>Übernehmen</span>
                </button>
            </div>
        </div>
    {/if}
</dialog>
