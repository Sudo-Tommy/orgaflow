<script lang="ts">
    import { locationService } from "$lib/services/locationService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { MapPin, Loader2 } from "lucide-svelte";

    interface Props {
        onAddressCaptured: (address: string, coords: { latitude: number; longitude: number }) => void;
        label?: string;
        variant?: 'button' | 'icon';
        disabled?: boolean;
        class?: string;
    }

    let {
        onAddressCaptured,
        label = "Standort erfassen",
        variant = 'button',
        disabled = false,
        class: extraClass = ""
    }: Props = $props();

    let isLocating = $state(false);

    async function handleCaptureLocation() {
        if (isLocating || disabled) return;
        isLocating = true;

        try {
            const pos = await locationService.getCurrentPosition();
            const coords = { latitude: pos.latitude, longitude: pos.longitude };
            const resolvedAddress = pos.address || `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`;

            toastStore.success("Standort erfolgreich übernommen.");
            onAddressCaptured(resolvedAddress, coords);
        } catch (err: any) {
            console.error("Standorterfassung fehlgeschlagen:", err);
            toastStore.error(err?.message || "Aktueller Standort konnte nicht ermittelt werden.");
        } finally {
            isLocating = false;
        }
    }
</script>

{#if variant === 'icon'}
    <button
        type="button"
        onclick={handleCaptureLocation}
        disabled={disabled || isLocating}
        class="p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl border border-indigo-200 dark:border-indigo-800 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 {extraClass}"
        title={label}
        aria-label={label}
    >
        {#if isLocating}
            <Loader2 class="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
        {:else}
            <MapPin class="w-5 h-5" />
        {/if}
    </button>
{:else}
    <button
        type="button"
        onclick={handleCaptureLocation}
        disabled={disabled || isLocating}
        class="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 px-3.5 py-2 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer touch-manipulation disabled:opacity-50 {extraClass}"
        title={label}
    >
        {#if isLocating}
            <Loader2 class="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Ermittle Position...</span>
        {:else}
            <MapPin class="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{label}</span>
        {/if}
    </button>
{/if}
