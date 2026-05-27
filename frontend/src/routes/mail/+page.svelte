<script lang="ts">
    import MailLayout from '$lib/components/MailLayout.svelte';
    import { onMount } from 'svelte';

    let container: HTMLDivElement | undefined = $state();

    // Blockiert hart das Scrollen der gesamten Seite (inkl. iOS "Bounce"), 
    // da die Mail-Ansicht eine eigenständige Full-Screen App-Ansicht ist.
    onMount(() => {
        const originalBodyOverflow = document.body.style.overflow;
        const originalHtmlOverflow = document.documentElement.style.overflow;
        
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        
        window.scrollTo(0, 0); // Scroll zurücksetzen

        function updateHeight() {
            if (container) {
                const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
                const rect = container.getBoundingClientRect();
                const availableHeight = Math.max(0, viewportHeight - rect.top);
                container.style.height = `${availableHeight}px`;
            }
        }

        setTimeout(updateHeight, 10);
        window.addEventListener('resize', updateHeight);
        if (window.visualViewport) window.visualViewport.addEventListener('resize', updateHeight);

        return () => {
            document.body.style.overflow = originalBodyOverflow;
            document.documentElement.style.overflow = originalHtmlOverflow;
            window.removeEventListener('resize', updateHeight);
            if (window.visualViewport) window.visualViewport.removeEventListener('resize', updateHeight);
        };
    });
</script>

<div bind:this={container} class="w-full max-w-screen-2xl mx-auto p-0 sm:p-4 md:p-6 text-neutral-900 flex flex-col overflow-hidden">
    <div class="w-full h-full bg-white sm:rounded-3xl border-t sm:border border-neutral-200 sm:shadow-sm flex overflow-hidden min-h-0">
        <MailLayout />
    </div>
</div>
