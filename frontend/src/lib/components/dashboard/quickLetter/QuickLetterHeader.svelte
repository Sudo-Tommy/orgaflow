<script lang="ts">
    import { Sparkles, RotateCcw, X, Edit3, Eye, Move } from 'lucide-svelte';
    import { QUICK_LETTER_PRESETS, type QuickLetterPreset } from './quickLetterPresets';

    interface Props {
        activeMobileTab: 'form' | 'preview';
        onSelectMobileTab: (tab: 'form' | 'preview') => void;
        onApplyPreset: (preset: QuickLetterPreset) => void;
        onResetPositions: () => void;
        onClose: () => void;
    }

    let {
        activeMobileTab,
        onSelectMobileTab,
        onApplyPreset,
        onResetPositions,
        onClose
    }: Props = $props();
</script>

<!-- Header -->
<div class="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0 relative overflow-hidden">
    <div class="absolute -top-10 right-20 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>

    <div class="flex items-center gap-3.5 min-w-0">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center text-xl shadow-lg shadow-sky-500/20 shrink-0 ring-2 ring-white/10">
            ✉️
        </div>
        <div class="min-w-0">
            <div class="flex items-center gap-2">
                <h2 class="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                    Geschäftsbrief schreiben
                </h2>
                <span class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                    <Move class="w-3 h-3" />
                    <span>Drag & Drop aktiv</span>
                </span>
                <span class="hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    DIN 5008 • Mit Geschäftsfußzeile
                </span>
            </div>
            <p class="text-xs text-neutral-400 truncate mt-0.5">
                Datum auf Betreffhöhe • Elegante 7 pt Rücksendezeile • Vollständige Fußzeile
            </p>
        </div>
    </div>

    <!-- Mobile Switcher & Schließen -->
    <div class="flex items-center gap-2">
        <div class="flex lg:hidden bg-white/10 p-1 rounded-xl border border-white/10">
            <button
                type="button"
                onclick={() => onSelectMobileTab('form')}
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 {activeMobileTab === 'form' ? 'bg-sky-500 text-white shadow-xs' : 'text-neutral-400 hover:text-white'}"
            >
                <Edit3 class="w-3.5 h-3.5" />
                <span>Text</span>
            </button>
            <button
                type="button"
                onclick={() => onSelectMobileTab('preview')}
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 {activeMobileTab === 'preview' ? 'bg-sky-500 text-white shadow-xs' : 'text-neutral-400 hover:text-white'}"
            >
                <Eye class="w-3.5 h-3.5" />
                <span>Blatt</span>
            </button>
        </div>

        <button 
            type="button" 
            onclick={onClose} 
            class="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 cursor-pointer"
            aria-label="Schließen"
        >
            <X class="w-5 h-5" />
        </button>
    </div>
</div>

<!-- Schnell-Vorlagen Bar -->
<div class="px-6 py-2 bg-neutral-950/80 border-b border-white/5 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar shrink-0 text-xs">
    <div class="flex items-center gap-2">
        <span class="text-neutral-400 font-semibold text-[11px] whitespace-nowrap flex items-center gap-1">
            <Sparkles class="w-3.5 h-3.5 text-amber-400" />
            <span>Vorlagen:</span>
        </span>
        <div class="flex items-center gap-1.5">
            {#each QUICK_LETTER_PRESETS as p}
                <button
                    type="button"
                    onclick={() => onApplyPreset(p)}
                    class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium active:scale-95 cursor-pointer"
                >
                    <span>{p.icon}</span>
                    <span>{p.title}</span>
                </button>
            {/each}
        </div>
    </div>

    <!-- Positionen auf DIN 5008 Ideal zurücksetzen Button -->
    <button
        type="button"
        onclick={onResetPositions}
        class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium active:scale-95 cursor-pointer shrink-0"
        title="Alle Elemente auf DIN 5008 Standard-Positionen (Datum auf Betreffhöhe, 7 pt Rücksendezeile) zurücksetzen"
    >
        <RotateCcw class="w-3.5 h-3.5" />
        <span>Layout zurücksetzen</span>
    </button>
</div>
