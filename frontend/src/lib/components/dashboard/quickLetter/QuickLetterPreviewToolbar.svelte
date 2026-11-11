<script lang="ts">
    interface Props {
        isSavingToPb: boolean;
        lastSyncedPbTime: string | null;
        previewZoom: number;
    }

    let { isSavingToPb, lastSyncedPbTime, previewZoom = $bindable() }: Props = $props();
</script>

<div class="w-full max-w-[500px] flex items-center justify-between mb-2.5 text-xs text-neutral-400 px-1 gap-2 flex-wrap">
    <div class="flex items-center gap-1.5 flex-wrap">
        <span class="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] font-bold flex items-center gap-1">
            <span>🧲</span><span>Raster-Docking</span>
        </span>
        <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-900 border border-white/10 {isSavingToPb ? 'text-amber-400 animate-pulse' : lastSyncedPbTime ? 'text-emerald-400' : 'text-neutral-400'}">
            {isSavingToPb ? '☁️ Speichert in PB...' : lastSyncedPbTime ? '☁️ In PocketBase gesichert' : '☁️ PocketBase'}
        </span>
    </div>

    <div class="flex items-center gap-1.5">
        <div class="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs text-neutral-300">
            <button 
                type="button" 
                onclick={() => previewZoom = Math.max(0.65, +(previewZoom - 0.15).toFixed(2))} 
                class="min-w-6 min-h-6 flex items-center justify-center rounded hover:bg-white/10 text-neutral-300 hover:text-white font-bold cursor-pointer touch-manipulation" 
                title="Verkleinern"
            >
                -
            </button>
            <button 
                type="button" 
                onclick={() => previewZoom = 1} 
                class="px-2 min-h-6 flex items-center justify-center rounded hover:bg-white/10 font-mono text-[10px] font-semibold text-neutral-300 hover:text-white cursor-pointer touch-manipulation" 
                title="100%"
            >
                {Math.round(previewZoom * 100)}%
            </button>
            <button 
                type="button" 
                onclick={() => previewZoom = Math.min(2.2, +(previewZoom + 0.15).toFixed(2))} 
                class="min-w-6 min-h-6 flex items-center justify-center rounded hover:bg-white/10 text-neutral-300 hover:text-white font-bold cursor-pointer touch-manipulation" 
                title="Vergrößern"
            >
                +
            </button>
        </div>
        <span class="text-[10px] text-neutral-500 hidden sm:inline">DIN A4</span>
    </div>
</div>
