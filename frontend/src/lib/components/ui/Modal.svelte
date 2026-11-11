<script lang="ts">
    import type { Snippet } from 'svelte';
    import { triggerHaptic } from '$lib/services/hapticFeedback';

    interface Props {
        title?: string;
        subtitle?: string;
        badge?: string;
        icon?: string;
        iconBgClass?: string;
        gradientClass?: string;
        maxWidth?: string; // e.g. 'max-w-lg', 'max-w-2xl', 'max-w-4xl'
        showCloseButton?: boolean;
        closeOnOutsideClick?: boolean;
        isNested?: boolean;
        onclose?: () => void;
        header?: Snippet;
        children?: Snippet;
        footer?: Snippet;
    }

    let {
        title = '',
        subtitle = '',
        badge = '',
        icon = '✨',
        iconBgClass = 'bg-indigo-600 text-white shadow-indigo-500/20',
        gradientClass = 'from-indigo-500/10 via-sky-500/5',
        maxWidth = 'max-w-lg',
        showCloseButton = true,
        closeOnOutsideClick = true,
        isNested = false,
        onclose,
        header,
        children,
        footer
    }: Props = $props();

    let dialog = $state<HTMLDialogElement | null>(null);
    let isOpen = $state(false);

    export function open() {
        isOpen = true;
        triggerHaptic('tap');
        dialog?.showModal();
    }

    export function close() {
        isOpen = false;
        triggerHaptic('tap');
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
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-neutral-900/60 backdrop:backdrop-blur-sm w-full {maxWidth} mx-auto my-auto rounded-3xl border-none shadow-2xl {isNested ? 'z-60' : 'z-50'} outline-none"
    onclick={handleBackdropClick}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-slate-800 w-full flex flex-col relative transition-colors">
        <!-- Modal Header Bild-3-Design -->
        {#if header}
            <div class="p-4 sm:p-5 bg-gradient-to-r {gradientClass} to-transparent border-b border-neutral-100 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0 rounded-t-3xl">
                {@render header()}
                {#if showCloseButton}
                    <button
                        type="button"
                        aria-label="Schließen"
                        title="Schließen"
                        onclick={close}
                        class="w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-300 flex items-center justify-center transition-colors text-sm shrink-0 cursor-pointer touch-manipulation active:scale-95"
                    >
                        ✕
                    </button>
                {/if}
            </div>
        {:else if title}
            <div class="p-4 sm:p-5 bg-gradient-to-r {gradientClass} to-transparent border-b border-neutral-100 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0 rounded-t-3xl">
                <div class="flex items-center gap-3">
                    {#if icon}
                        <div class="w-10 h-10 rounded-2xl {iconBgClass} flex items-center justify-center shadow-lg text-base shrink-0">
                            {icon}
                        </div>
                    {/if}
                    <div>
                        <div class="flex items-center gap-2">
                            {#if badge}
                                <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                                    {badge}
                                </span>
                            {/if}
                            {#if subtitle}
                                <span class="text-[10px] font-semibold text-neutral-400 dark:text-slate-400 truncate max-w-[200px]">
                                    {subtitle}
                                </span>
                            {/if}
                        </div>
                        <h3 class="text-base sm:text-lg font-bold text-neutral-900 dark:text-white mt-0.5 line-clamp-2">
                            {title}
                        </h3>
                    </div>
                </div>
                {#if showCloseButton}
                    <button
                        type="button"
                        aria-label="Schließen"
                        title="Schließen"
                        onclick={close}
                        class="w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-300 flex items-center justify-center transition-colors text-sm shrink-0 cursor-pointer touch-manipulation active:scale-95"
                    >
                        ✕
                    </button>
                {/if}
            </div>
        {/if}

        <!-- Modal Body Content -->
        <div class="p-4 sm:p-5 space-y-3.5 flex-1">
            {#if children}
                {@render children()}
            {/if}
        </div>

        <!-- Footer Bild-3-Design -->
        {#if footer}
            <div class="p-3.5 sm:p-4 bg-neutral-50 dark:bg-slate-900/80 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 rounded-b-3xl">
                {@render footer()}
            </div>
        {/if}
    </div>
</dialog>
