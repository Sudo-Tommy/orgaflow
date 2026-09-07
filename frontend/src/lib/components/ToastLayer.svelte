<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { fly, fade } from "svelte/transition";
    import { onMount } from "svelte";

    let containerEl: HTMLElement | undefined = $state();

    // Gruppiert identische Toasts, die direkt nacheinander kommen
    let groupedToasts = $derived.by(() => {
        const groups: any[] = [];
        for (const toast of toastStore.toasts) {
            const last = groups[groups.length - 1];
            if (last && last.message === toast.message && last.type === toast.type) {
                last.count += 1;
                last.ids.push(toast.id);
            } else {
                groups.push({ ...toast, count: 1, ids: [toast.id] });
            }
        }
        return groups;
    });

    function dismissGroup(ids: string[]) {
        ids.forEach(id => toastStore.remove(id));
    }

    /**
     * Bringt den Toast-Layer verlässlich in den Browser Top-Layer,
     * sodass Toasts NIEMALS hinter modalen <dialog>-Fenstern (z. B. QuickLetterModal, PdfPreviewModal, etc.) landen!
     */
    function syncPopoverState() {
        if (!containerEl || typeof containerEl.showPopover !== 'function') return;
        try {
            if (toastStore.toasts.length > 0) {
                // Falls bereits im Top-Layer: kurz schließen und neu öffnen,
                // damit der Toast-Container ganz oben über neu geöffnete <dialog>-Elemente springt
                try {
                    containerEl.hidePopover();
                } catch (e) {}
                containerEl.showPopover();
            } else {
                try {
                    containerEl.hidePopover();
                } catch (e) {}
            }
        } catch (err) {
            // Sanfter Fallback auf standardmäßige fixed CSS-Positionierung
        }
    }

    // Reagiert sofort, wenn Toasts hinzugefügt oder entfernt werden
    $effect(() => {
        const _ = toastStore.toasts.length;
        syncPopoverState();
    });

    onMount(() => {
        syncPopoverState();

        // Überwacht das Öffnen von <dialog>-Modalfenstern im Dokument.
        // Sobald ein Modal aufgerufen wird (.showModal()), wird der Toast-Container
        // erneut an die oberste Spitze des Top-Layers befördert.
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'attributes' && m.attributeName === 'open') {
                    const target = m.target as HTMLElement;
                    if (target.tagName === 'DIALOG' && target.hasAttribute('open')) {
                        if (toastStore.toasts.length > 0) {
                            syncPopoverState();
                        }
                    }
                }
            }
        });

        observer.observe(document.body, {
            attributes: true,
            subtree: true,
            attributeFilter: ['open']
        });

        return () => {
            observer.disconnect();
        };
    });
</script>

<!-- 
    Mobile-First Top-Layer Toast Container:
    - Verwendet popover="manual" für native Platzierung im Top-Layer ÜBER allen modalen <dialog>-Fenstern
    - pointer-events-none auf dem Container verhindert jegliches Blockieren der Benutzeroberfläche
    - Maximaler z-index als universeller Fallback
-->
<div 
    bind:this={containerEl}
    popover="manual"
    id="global-toast-container"
    class="fixed top-2 left-3 right-3 sm:top-auto sm:bottom-6 sm:right-6 sm:left-auto sm:max-w-md z-[2147483647] pointer-events-none flex flex-col items-center sm:items-end gap-2.5 pt-[max(env(safe-area-inset-top,0px),0.25rem)] m-0 p-0 border-0 bg-transparent overflow-visible"
    aria-live="polite"
    aria-atomic="true"
>
    {#each groupedToasts as toast (toast.ids[0])}
        <button
            type="button"
            in:fly={{ y: -20, duration: 220 }}
            out:fade={{ duration: 160 }}
            class="pointer-events-auto w-full sm:w-auto min-w-[280px] max-w-sm sm:max-w-md bg-neutral-900/95 text-white backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] border p-3.5 sm:p-4 flex items-start gap-3.5 transition-all active:scale-[0.98] select-none text-left cursor-pointer ring-1
                   {toast.type === 'error' ? 'border-rose-500/50 ring-rose-500/30' : 
                    toast.type === 'warning' ? 'border-amber-500/50 ring-amber-500/30' : 
                    toast.type === 'info' ? 'border-sky-500/50 ring-sky-500/30' : 
                    'border-emerald-500/50 ring-emerald-500/30'}"
            onclick={() => dismissGroup(toast.ids)}
        >
            <!-- Typ-Icon -->
            <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base font-bold shadow-sm
                        {toast.type === 'error' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 
                         toast.type === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
                         toast.type === 'info' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 
                         'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}">
                {#if toast.type === 'error'}
                    ✕
                {:else if toast.type === 'warning'}
                    ⚠️
                {:else if toast.type === 'info'}
                    ℹ️
                {:else}
                    ✓
                {/if}
            </div>

            <!-- Nachricht & Hinweis -->
            <div class="flex-1 min-w-0 pt-0.5">
                <p class="text-xs sm:text-sm font-bold text-white leading-snug break-words">
                    {toast.message}
                </p>
                <p class="text-[10px] text-neutral-400 mt-0.5 font-medium">
                    Tippen zum Schließen
                </p>
            </div>

            {#if toast.count > 1}
                <!-- Multi-Hit Combo Zähler -->
                <span class="bg-indigo-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs shrink-0 self-center">
                    {toast.count}x
                </span>
            {/if}

            <!-- Schließen-Icon -->
            <div class="w-8 h-8 -mr-1 -mt-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors shrink-0" aria-hidden="true">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
        </button>
    {/each}
</div>

<style>
    /* 
       Native Browser Top-Layer Reset für den Popover-Container:
       Garantiert, dass der Popover transparent ist, keine Browser-Standard-Ränder besitzt
       und oberhalb ALLER <dialog>-Backdrops platziert wird.
    */
    :global(#global-toast-container[popover]) {
        position: fixed !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        background: transparent !important;
        color: inherit !important;
        overflow: visible !important;
        pointer-events: none !important;
        width: auto !important;
        height: auto !important;
        max-height: 100vh !important;
        inset: unset !important;
        z-index: 2147483647 !important;
    }

    /* Mobile: Oben zentriert */
    :global(#global-toast-container[popover]) {
        top: 0.5rem !important;
        left: 0.75rem !important;
        right: 0.75rem !important;
        bottom: auto !important;
    }

    /* Desktop (ab 640px): Unten rechts */
    @media (min-width: 640px) {
        :global(#global-toast-container[popover]) {
            top: auto !important;
            bottom: 1.5rem !important;
            right: 1.5rem !important;
            left: auto !important;
            max-width: 28rem !important;
        }
    }

    :global(#global-toast-container::backdrop) {
        display: none !important;
        background: transparent !important;
        pointer-events: none !important;
    }
</style>