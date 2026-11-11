<script lang="ts">
    import { ChevronDown, Minus, Plus } from "lucide-svelte";

    let {
        lineHeight = $bindable(1.4),
        paragraphSpacingBefore = $bindable(0),
        paragraphSpacingAfter = $bindable(4),
        tableLineSpacing = $bindable(1.8),
        logoBlock = null,
        onUpdate
    } = $props<{
        lineHeight: number;
        paragraphSpacingBefore: number;
        paragraphSpacingAfter: number;
        tableLineSpacing: number;
        logoBlock?: any;
        onUpdate: () => void;
    }>();

    let isOpen = $state(false);
    let menuRef = $state<HTMLElement | null>(null);

    const linePresets = [1.0, 1.15, 1.25, 1.4, 1.5, 2.0];
    const tablePresets = [
        { label: 'Kompakt', val: 1.2 },
        { label: 'Normal', val: 1.8 },
        { label: 'Weit', val: 2.6 }
    ];

    function setLineHeight(val: number) {
        lineHeight = Number(val.toFixed(2));
        onUpdate();
    }

    function setTableSpacing(val: number) {
        tableLineSpacing = Number(val.toFixed(1));
        onUpdate();
    }

    function adjustSpacing(prop: 'before' | 'after', delta: number) {
        if (prop === 'before') {
            paragraphSpacingBefore = Math.max(0, Math.min(36, paragraphSpacingBefore + delta));
        } else {
            paragraphSpacingAfter = Math.max(0, Math.min(36, paragraphSpacingAfter + delta));
        }
        onUpdate();
    }

    $effect(() => {
        if (!isOpen) return;
        function handleOutside(e: PointerEvent) {
            if (menuRef && !menuRef.contains(e.target as Node)) {
                isOpen = false;
            }
        }
        window.addEventListener('pointerdown', handleOutside);
        return () => window.removeEventListener('pointerdown', handleOutside);
    });
</script>

<div bind:this={menuRef} class="relative flex flex-col gap-0.5">
    <span class="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">Abstand</span>
    <button
        type="button"
        onclick={() => isOpen = !isOpen}
        class="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700/80 px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 h-8 text-xs font-medium transition-colors {isOpen ? 'ring-2 ring-violet-500 bg-white dark:bg-neutral-700 text-violet-600 dark:text-violet-400' : 'text-neutral-700 dark:text-neutral-200'}"
        title="Zeilen- und Absatzabstand (Dokumentweit)"
        aria-expanded={isOpen}
    >
        <!-- Word-Style Zeilenabstand-Icon -->
        <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 3v18" />
            <path d="m4 6 3-3 3 3" />
            <path d="m4 18 3 3 3-3" />
            <path d="M14 6h7" />
            <path d="M14 12h7" />
            <path d="M14 18h7" />
        </svg>
        <span class="font-mono text-[11px] font-bold">{lineHeight.toFixed(2)}</span>
        <ChevronDown class="w-3 h-3 text-neutral-400 transition-transform {isOpen ? 'rotate-180' : ''}" />
    </button>

    {#if isOpen}
        <div class="absolute left-0 top-full mt-1.5 w-76 sm:w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl p-3 z-50 text-neutral-800 dark:text-neutral-100 text-xs flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-100">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span class="font-bold text-[12px] text-neutral-800 dark:text-neutral-100">Zeilen- & Absatzabstand</span>
                <span class="text-[9px] font-semibold bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full">Global</span>
            </div>

            <!-- Fließtext Zeilenabstand -->
            <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between text-[11px]">
                    <span class="font-semibold text-neutral-600 dark:text-neutral-300">Fließtext (line-height)</span>
                    <span class="font-mono font-bold text-violet-600 dark:text-violet-400">{lineHeight.toFixed(2)}×</span>
                </div>
                <!-- Presets -->
                <div class="grid grid-cols-6 gap-1">
                    {#each linePresets as p}
                        <button
                            type="button"
                            onclick={() => setLineHeight(p)}
                            class="py-1 rounded font-mono text-[11px] font-semibold border transition-all {Math.abs(lineHeight - p) < 0.02 ? 'bg-violet-600 text-white border-violet-600 shadow-xs' : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700'}"
                        >
                            {p}
                        </button>
                    {/each}
                </div>
                <!-- Stufenloser Slider -->
                <div class="flex items-center gap-2 mt-0.5">
                    <input 
                        type="range" 
                        min="1.0" 
                        max="2.5" 
                        step="0.05"
                        value={lineHeight}
                        oninput={(e) => setLineHeight(Number(e.currentTarget.value))}
                        class="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                    <input
                        type="number"
                        min="1.0"
                        max="3.0"
                        step="0.05"
                        value={lineHeight}
                        onchange={(e) => setLineHeight(Math.max(0.8, Math.min(3.0, Number(e.currentTarget.value))))}
                        class="w-13 text-center py-0.5 text-[11px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md outline-none focus:ring-1 focus:ring-violet-500"
                    />
                </div>
            </div>

            <!-- Absatzabstände (Vor / Nach) -->
            <div class="flex flex-col gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-2">
                <span class="font-semibold text-[11px] text-neutral-600 dark:text-neutral-300">Absatzabstand</span>
                <div class="grid grid-cols-2 gap-2">
                    <!-- Davor -->
                    <div class="flex flex-col gap-1 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
                        <span class="text-[10px] text-neutral-500">Davor</span>
                        <div class="flex items-center justify-between">
                            <button type="button" onclick={() => adjustSpacing('before', -2)} class="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 shadow-xs border border-neutral-200 dark:border-neutral-600">
                                <Minus class="w-2.5 h-2.5" />
                            </button>
                            <span class="font-mono text-xs font-bold">{paragraphSpacingBefore} pt</span>
                            <button type="button" onclick={() => adjustSpacing('before', 2)} class="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 shadow-xs border border-neutral-200 dark:border-neutral-600">
                                <Plus class="w-2.5 h-2.5" />
                            </button>
                        </div>
                    </div>
                    <!-- Danach -->
                    <div class="flex flex-col gap-1 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
                        <span class="text-[10px] text-neutral-500">Danach</span>
                        <div class="flex items-center justify-between">
                            <button type="button" onclick={() => adjustSpacing('after', -2)} class="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 shadow-xs border border-neutral-200 dark:border-neutral-600">
                                <Minus class="w-2.5 h-2.5" />
                            </button>
                            <span class="font-mono text-xs font-bold">{paragraphSpacingAfter} pt</span>
                            <button type="button" onclick={() => adjustSpacing('after', 2)} class="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 shadow-xs border border-neutral-200 dark:border-neutral-600">
                                <Plus class="w-2.5 h-2.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tabellen-Zeilenabstand -->
            <div class="flex flex-col gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-2">
                <div class="flex items-center justify-between text-[11px]">
                    <span class="font-semibold text-neutral-600 dark:text-neutral-300">Tabellenzeilen (Zellhöhe)</span>
                    <span class="font-mono font-bold text-violet-600 dark:text-violet-400">{tableLineSpacing.toFixed(1)} mm</span>
                </div>
                <div class="grid grid-cols-3 gap-1">
                    {#each tablePresets as tp}
                        <button
                            type="button"
                            onclick={() => setTableSpacing(tp.val)}
                            class="py-1 px-1 rounded text-[10px] font-semibold border transition-all text-center {Math.abs(tableLineSpacing - tp.val) < 0.1 ? 'bg-violet-600 text-white border-violet-600 shadow-xs' : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'}"
                        >
                            {tp.label}
                        </button>
                    {/each}
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                    <input 
                        type="range" 
                        min="1.0" 
                        max="3.5" 
                        step="0.1"
                        value={tableLineSpacing}
                        oninput={(e) => setTableSpacing(Number(e.currentTarget.value))}
                        class="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                    <input
                        type="number"
                        min="0.8"
                        max="5.0"
                        step="0.1"
                        value={tableLineSpacing}
                        onchange={(e) => setTableSpacing(Math.max(0.8, Math.min(5.0, Number(e.currentTarget.value))))}
                        class="w-13 text-center py-0.5 text-[11px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md outline-none focus:ring-1 focus:ring-violet-500"
                    />
                </div>
            </div>

            <!-- Logo-Abstände (Kopfbereich oben/unten) -->
            {#if logoBlock}
                <div class="flex flex-col gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-2">
                    <span class="font-semibold text-[11px] text-neutral-600 dark:text-neutral-300">Logo-Abstände</span>
                    <div class="grid grid-cols-2 gap-2">
                        <div class="flex flex-col gap-1 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
                            <span class="text-[10px] text-neutral-500">Logo oben</span>
                            <div class="flex items-center justify-between">
                                <button type="button" onclick={() => { if (!logoBlock.logoConfig) logoBlock.logoConfig = {}; logoBlock.logoConfig.marginTop = Math.max(0, (logoBlock.logoConfig.marginTop || 0) - 2); onUpdate(); }} class="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 shadow-xs border border-neutral-200 dark:border-neutral-600 font-bold">-</button>
                                <span class="font-mono text-xs font-bold text-violet-600 dark:text-violet-400">{logoBlock.logoConfig?.marginTop ?? 0} mm</span>
                                <button type="button" onclick={() => { if (!logoBlock.logoConfig) logoBlock.logoConfig = {}; logoBlock.logoConfig.marginTop = Math.min(80, (logoBlock.logoConfig.marginTop || 0) + 2); onUpdate(); }} class="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 shadow-xs border border-neutral-200 dark:border-neutral-600 font-bold">+</button>
                            </div>
                        </div>
                        <div class="flex flex-col gap-1 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
                            <span class="text-[10px] text-neutral-500">Logo unten</span>
                            <div class="flex items-center justify-between">
                                <button type="button" onclick={() => { if (!logoBlock.logoConfig) logoBlock.logoConfig = {}; logoBlock.logoConfig.marginBottom = Math.max(0, (logoBlock.logoConfig.marginBottom || 8) - 2); onUpdate(); }} class="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 shadow-xs border border-neutral-200 dark:border-neutral-600 font-bold">-</button>
                                <span class="font-mono text-xs font-bold text-violet-600 dark:text-violet-400">{logoBlock.logoConfig?.marginBottom ?? 8} mm</span>
                                <button type="button" onclick={() => { if (!logoBlock.logoConfig) logoBlock.logoConfig = {}; logoBlock.logoConfig.marginBottom = Math.min(80, (logoBlock.logoConfig.marginBottom || 8) + 2); onUpdate(); }} class="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 shadow-xs border border-neutral-200 dark:border-neutral-600 font-bold">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>
