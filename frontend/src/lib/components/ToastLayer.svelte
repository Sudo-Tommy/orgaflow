<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { fly, fade } from "svelte/transition";
    import { onMount } from "svelte";

    let popoverEl: HTMLElement;
    
    onMount(() => {
        if (popoverEl && typeof popoverEl.showPopover === 'function') {
            popoverEl.showPopover();
        }
    });

    let lastToastId = "";

    $effect(() => {
        const toasts = toastStore.toasts;
        if (toasts.length > 0) {
            const newest = toasts[toasts.length - 1];
            // Sobald ein neuer Toast auftaucht, rücken wir den Container wieder nach ganz oben
            if (newest.id !== lastToastId && popoverEl && typeof popoverEl.showPopover === 'function') {
                try {
                    if (popoverEl.matches(':popover-open')) popoverEl.hidePopover();
                    popoverEl.showPopover();
                } catch (e) {}
                lastToastId = newest.id;
            }
        }
    });
</script>

<div bind:this={popoverEl} popover="manual" class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:bottom-8 z-9999 flex flex-col items-center sm:items-end gap-4 pointer-events-none bg-transparent border-none m-0 p-0 overflow-visible w-auto h-auto outline-none">
    {#each toastStore.toasts as toast (toast.id)}
        <!-- Der ECHTE Kawaii-Toast! 🍞 -->
        <div 
            in:fly={{ y: 50, duration: 600, opacity: 0, easing: (t) => --t * t * t + 1 }} 
            out:fade={{ duration: 200 }}
            class="pointer-events-auto relative flex flex-col items-center justify-center p-6 pt-10 pb-6
                   rounded-4xl rounded-t-[3.5rem] border-[6px] sm:border-8 w-full max-w-sm sm:w-72 shadow-2xl 
                   transform transition-transform hover:scale-105 cursor-pointer overflow-hidden
                   {toast.type === 'error' ? 'bg-[#D2A679] border-[#6D4222] text-[#4A2C16]' : 'bg-[#FDEBD0] border-[#D98A44] text-[#8C5220]'}"
            onclick={() => toastStore.remove(toast.id)}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && toastStore.remove(toast.id)}
            title="Klicken zum Schließen"
        >
            <!-- Der Belag (Honig, Marmelade, Blaubeere...) -->
            {#if toast.type === 'success'}
                <!-- Honig 🍯 -->
                <div class="absolute top-0 left-0 right-0 h-8 bg-amber-400/90 rounded-b-4xl"></div>
                <div class="absolute top-6 left-[20%] w-8 h-12 bg-amber-400/90 rounded-b-full"></div>
                <div class="absolute top-6 right-[30%] w-6 h-10 bg-amber-400/90 rounded-b-full"></div>
                <div class="absolute top-6 right-[15%] w-4 h-6 bg-amber-400/90 rounded-b-full"></div>
            {:else if toast.type === 'warning'}
                <!-- Erdbeermarmelade 🍓 -->
                <div class="absolute top-0 left-0 right-0 h-8 bg-rose-500/90 rounded-b-4xl"></div>
                <div class="absolute top-6 left-[15%] w-10 h-10 bg-rose-500/90 rounded-b-full"></div>
                <div class="absolute top-6 right-[25%] w-7 h-14 bg-rose-500/90 rounded-b-full"></div>
            {:else if toast.type === 'info'}
                <!-- Blaubeermarmelade 🫐 -->
                <div class="absolute top-0 left-0 right-0 h-8 bg-blue-500/80 rounded-b-4xl"></div>
                <div class="absolute top-6 left-[30%] w-6 h-10 bg-blue-500/80 rounded-b-full"></div>
                <div class="absolute top-6 right-[20%] w-8 h-8 bg-blue-500/80 rounded-b-full"></div>
            {:else if toast.type === 'error'}
                <!-- Verbrannt 🔥 -->
                <div class="absolute -top-4 -left-4 w-16 h-16 bg-[#5C3A21] rounded-full blur-xl opacity-50"></div>
                <div class="absolute bottom-4 right-4 w-12 h-12 bg-[#5C3A21] rounded-full blur-lg opacity-40"></div>
            {/if}

            <!-- Das Kawaii-Gesicht 🥺 -->
            <div class="flex items-center justify-center gap-7 mb-4 relative z-10">
                <!-- Linkes Auge -->
                <div class="w-3.5 h-3.5 rounded-full {toast.type === 'error' ? 'bg-[#4A2C16]' : 'bg-[#8C5220]'} relative">
                    <div class="absolute -bottom-2 -left-3.5 w-4 h-2.5 bg-rose-300/70 rounded-full blur-[1px]"></div>
                    {#if toast.type === 'error'}
                        <div class="absolute -top-2 -left-1 w-4 h-1 border-t-2 border-[#4A2C16] rounded-t-full transform rotate-12"></div>
                    {/if}
                </div>

                <!-- Mund -->
                <div class="relative -mt-2">
                    {#if toast.type === 'success' || toast.type === 'info'}
                        <!-- Lächeln -->
                        <svg class="w-6 h-6 text-[#8C5220]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14c2.5 3 7.5 3 10 0" /></svg>
                    {:else if toast.type === 'error'}
                        <!-- Traurig / Oops -->
                        <svg class="w-6 h-6 text-[#4A2C16] transform rotate-180 mt-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14c2.5 3 7.5 3 10 0" /></svg>
                    {:else}
                        <!-- Überrascht (Warning) -->
                        <div class="w-3.5 h-3.5 border-4 border-[#8C5220] rounded-full mt-1"></div>
                    {/if}
                </div>

                <!-- Rechtes Auge -->
                <div class="w-3.5 h-3.5 rounded-full {toast.type === 'error' ? 'bg-[#4A2C16]' : 'bg-[#8C5220]'} relative">
                    {#if toast.type === 'info'}
                        <!-- Zwinkern -->
                        <div class="absolute inset-0 bg-[#FDEBD0] scale-110 translate-y-1"></div>
                        <div class="absolute inset-0 border-t-[3.5px] border-[#8C5220] rounded-t-full"></div>
                    {/if}
                    <div class="absolute -bottom-2 -right-3.5 w-4 h-2.5 bg-rose-300/70 rounded-full blur-[1px]"></div>
                    {#if toast.type === 'error'}
                        <div class="absolute -top-2 -right-1 w-4 h-1 border-t-2 border-[#4A2C16] rounded-t-full transform -rotate-12"></div>
                    {/if}
                </div>
            </div>

            <!-- Text-Inhalt -->
            <p class="text-center font-extrabold text-sm sm:text-base leading-snug relative z-10 px-2 drop-shadow-sm">{toast.message}</p>
            
            <!-- Kleines X oben rechts -->
            <div class="absolute top-4 right-5 opacity-20 hover:opacity-100 transition-opacity z-20">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
        </div>
    {/each}
</div>