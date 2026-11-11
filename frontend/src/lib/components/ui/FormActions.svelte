<script lang="ts">
    import type { Snippet } from 'svelte';
    import { triggerHaptic } from '$lib/services/hapticFeedback';

    interface Props {
        isSubmitting?: boolean;
        submitLabel?: string;
        cancelLabel?: string;
        formId?: string;
        disabled?: boolean;
        sticky?: boolean;
        oncancel?: () => void;
        onsubmit?: (event: Event) => void;
        leading?: Snippet;
        trailing?: Snippet;
    }

    let {
        isSubmitting = false,
        submitLabel = 'Speichern',
        cancelLabel = 'Abbrechen',
        formId,
        disabled = false,
        sticky = true,
        oncancel,
        onsubmit,
        leading,
        trailing
    }: Props = $props();

    function handleCancel() {
        triggerHaptic('tap');
        if (oncancel) {
            oncancel();
        } else if (typeof history !== 'undefined') {
            history.back();
        }
    }
</script>

<div
    class="border-t border-slate-200 bg-white/95 backdrop-blur-md p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] landscape:p-2.5 landscape:pb-[calc(env(safe-area-inset-bottom)+0.35rem)] dark:border-slate-800 dark:bg-slate-950/95 z-10 transition-all {sticky ? 'sticky bottom-0' : ''}"
>
    <div class="flex items-center justify-between gap-3 max-w-5xl mx-auto">
        <div>
            {#if leading}
                {@render leading()}
            {/if}
        </div>

        <div class="flex items-center justify-end gap-3 ml-auto">
            <button
                type="button"
                class="h-11 px-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-semibold active:scale-95 touch-manipulation cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                onclick={handleCancel}
                disabled={isSubmitting || disabled}
            >
                {cancelLabel}
            </button>

            <button
                type="submit"
                form={formId}
                class="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all text-sm font-semibold flex items-center justify-center gap-2 min-w-[130px] active:scale-95 touch-manipulation cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                disabled={isSubmitting || disabled}
                onclick={(e) => { triggerHaptic('success'); onsubmit?.(e); }}
            >
                {#if isSubmitting}
                    <svg
                        class="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                        ></circle>
                        <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                    <span>Speichert...</span>
                {:else}
                    <span>{submitLabel}</span>
                {/if}
            </button>

            {#if trailing}
                {@render trailing()}
            {/if}
        </div>
    </div>
</div>
