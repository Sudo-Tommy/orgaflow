<script lang="ts">
    import type { Snippet } from 'svelte';
    import { X } from 'lucide-svelte';

    interface Props {
        title?: string;
        subtitle?: string;
        maxWidth?: string; // e.g. 'max-w-2xl', 'max-w-4xl'
        showCloseButton?: boolean;
        closeOnOutsideClick?: boolean;
        onclose?: () => void;
        header?: Snippet;
        children?: Snippet;
        footer?: Snippet;
    }

    let {
        title = '',
        subtitle = '',
        maxWidth = 'max-w-2xl',
        showCloseButton = true,
        closeOnOutsideClick = true,
        onclose,
        header,
        children,
        footer
    }: Props = $props();

    let dialog = $state<HTMLDialogElement | null>(null);
    let isOpen = $state(false);
    let viewportHeight = $state('100dvh');

    $effect(() => {
        if (typeof window === 'undefined') return;

        const handleViewportChange = () => {
            if (window.visualViewport) {
                viewportHeight = `${window.visualViewport.height}px`;
            }
        };

        window.visualViewport?.addEventListener('resize', handleViewportChange);
        window.visualViewport?.addEventListener('scroll', handleViewportChange);
        handleViewportChange();

        return () => {
            window.visualViewport?.removeEventListener('resize', handleViewportChange);
            window.visualViewport?.removeEventListener('scroll', handleViewportChange);
        };
    });

    export function open() {
        isOpen = true;
        dialog?.showModal();
    }

    export function close() {
        isOpen = false;
        dialog?.close();
        onclose?.();
    }

    function handleBackdropClick(e: MouseEvent) {
        if (closeOnOutsideClick && e.target === dialog) {
            close();
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full {maxWidth} m-0 sm:m-auto fixed sm:relative inset-x-0 bottom-0 sm:bottom-auto rounded-t-3xl sm:rounded-3xl border-none shadow-2xl z-[9999] touch-pan-y"
    onclick={handleBackdropClick}
>
    <!-- Drag handle on mobile -->
    <div class="w-12 h-1.5 bg-neutral-300 dark:bg-slate-700 rounded-full mx-auto my-2 sm:hidden shrink-0"></div>

    <div
        class="form-mobile-container sm:h-auto sm:min-h-0 sm:max-h-[92vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full flex flex-col relative overflow-hidden shadow-2xl border border-neutral-100 dark:border-slate-800"
        style="height: {viewportHeight};"
    >
        <!-- Modal Header -->
        {#if header}
            <div class="px-5 sm:px-8 py-4 sm:py-5 border-b border-neutral-200 dark:border-slate-800 shrink-0 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex justify-between items-center">
                {@render header()}
                {#if showCloseButton}
                    <button
                        type="button"
                        aria-label="Schließen"
                        title="Schließen"
                        onclick={close}
                        class="min-w-[44px] min-h-[44px] w-11 h-11 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors shrink-0 ml-3"
                    >
                        <X class="w-5 h-5" />
                    </button>
                {/if}
            </div>
        {:else if title}
            <div class="px-5 sm:px-8 py-4 sm:py-5 border-b border-neutral-200 dark:border-slate-800 shrink-0 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex justify-between items-center">
                <div>
                    <h2 class="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white leading-tight">{title}</h2>
                    {#if subtitle}
                        <p class="text-xs text-neutral-500 dark:text-slate-400 font-medium mt-0.5">{subtitle}</p>
                    {/if}
                </div>
                {#if showCloseButton}
                    <button
                        type="button"
                        aria-label="Schließen"
                        title="Schließen"
                        onclick={close}
                        class="min-w-[44px] min-h-[44px] w-11 h-11 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors shrink-0"
                    >
                        <X class="w-5 h-5" />
                    </button>
                {/if}
            </div>
        {/if}

        <!-- Scrollable Body Content -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8">
            {#if children}
                {@render children()}
            {/if}
        </div>

        <!-- Sticky Footer (stays above virtual keyboard) -->
        {#if footer}
            <div class="border-t border-neutral-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
                {@render footer()}
            </div>
        {/if}
    </div>
</dialog>
