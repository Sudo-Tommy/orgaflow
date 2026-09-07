<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        children?: Snippet;
        class?: string;
        zIndex?: number;
    }

    let { children, class: customClass = '', zIndex = 20 }: Props = $props();

    // Viewport-Zustände für mobile Tastatur
    let keyboardHeight = $state(0);

    // Visual Viewport Listener via Svelte 5 $effect
    $effect(() => {
        if (typeof window === 'undefined' || !window.visualViewport) return;

        const handleResize = () => {
            const vv = window.visualViewport;
            if (vv) {
                // Ermittlung der Tastaturhöhe durch Differenz von innerHeight und visualViewport-Höhe
                const heightDifference = window.innerHeight - vv.height;
                keyboardHeight = heightDifference > 60 ? heightDifference : 0;
            }
        };

        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);

        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('scroll', handleResize);
        };
    });
</script>

<!-- Sticky Action Bar mit Safe-Area-Bottom Integration und dynamischem Tastatur-Offset -->
<footer 
    class="sticky bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 transition-all duration-150 ease-out {customClass}"
    style="z-index: {zIndex}; transform: translateY(-{keyboardHeight}px);"
>
    <div class="max-w-4xl mx-auto w-full">
        {#if children}
            {@render children()}
        {/if}
    </div>
</footer>
