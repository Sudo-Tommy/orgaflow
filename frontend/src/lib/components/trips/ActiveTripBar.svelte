<script lang="ts">
    import { Car, Square, MapPin } from 'lucide-svelte';
    import { tripRecorder } from '$lib/services/trips/tripRecorder.svelte';

    let isRecording = $derived(tripRecorder.isRecording);
    let km = $derived(tripRecorder.kilometers);
    let arrived = $derived(tripRecorder.arrivalTriggered);
</script>

{#if isRecording}
    <div
        role="region"
        aria-label="Aktive Fahrtaufzeichnung"
        class="fixed top-14 left-1/2 -translate-x-1/2 z-[9965] max-w-[94vw] bg-emerald-700 text-white rounded-full px-4 py-2 shadow-xl border border-emerald-500 flex items-center gap-3 animate-enter"
    >
        <div class="flex items-center gap-2 min-w-0">
            <Car class="w-4 h-4 shrink-0 animate-pulse" />
            <span class="text-xs font-black tracking-wide truncate">
                Fahrt läuft: {km.toFixed(1)} km
            </span>
            {#if arrived}
                <span class="px-2 py-0.5 rounded-full bg-amber-300 text-slate-950 text-[10px] font-black flex items-center gap-1 shrink-0">
                    <MapPin class="w-3 h-3" /> Ziel erreicht
                </span>
            {/if}
        </div>

        <button
            type="button"
            onclick={() => tripRecorder.stopTrip(true)}
            class="px-3 py-1 rounded-full bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black flex items-center gap-1.5 shrink-0 active:scale-95 transition-all cursor-pointer"
        >
            <Square class="w-3 h-3 fill-current" />
            <span>Fahrt beenden</span>
        </button>
    </div>
{/if}
