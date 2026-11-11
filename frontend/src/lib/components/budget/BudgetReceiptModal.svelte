<script lang="ts">
    import { Download, X } from 'lucide-svelte';

    interface Props {
        isOpen: boolean;
        receiptUrl: string | null;
        receiptTitle: string;
        onClose: () => void;
    }

    let { isOpen, receiptUrl, receiptTitle, onClose }: Props = $props();

    let dialog = $state<HTMLDialogElement | null>(null);

    $effect(() => {
        if (isOpen && receiptUrl) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    });
</script>

{#if isOpen && receiptUrl}
    <dialog
        bind:this={dialog}
        class="zero-inner-scroll-modal fixed inset-0 m-auto w-full max-w-3xl bg-transparent p-3 sm:p-6 border-none outline-none backdrop:bg-slate-950/70 backdrop:backdrop-blur-xs animate-enter z-50 overflow-visible"
        onclick={(e) => { if (e.target === dialog) onClose(); }}
        oncancel={(e) => { e.preventDefault(); onClose(); }}
    >
        <div class="relative w-full my-auto rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col max-h-[92dvh]">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 shrink-0">
                <h3 class="truncate text-base font-bold text-slate-900 dark:text-white" title={receiptTitle}>
                    {receiptTitle}
                </h3>
                <div class="flex items-center gap-2">
                    <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="min-h-[36px] min-w-[36px] rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition cursor-pointer touch-manipulation active:scale-95"
                        title="In neuem Tab öffnen / herunterladen"
                    >
                        <Download class="h-4 w-4" />
                    </a>
                    <button
                        type="button"
                        onclick={onClose}
                        aria-label="Schließen"
                        title="Schließen"
                        class="min-h-[36px] min-w-[36px] rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition cursor-pointer touch-manipulation active:scale-95"
                    >
                        <X class="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div class="mt-4 rounded-2xl bg-slate-100 p-2 dark:bg-slate-950 flex items-center justify-center flex-1 overflow-hidden min-h-0">
                {#if receiptUrl.toLowerCase().includes('.pdf')}
                    <iframe
                        src={receiptUrl}
                        class="h-[60vh] max-h-full w-full rounded-xl border-0"
                        title="PDF Beleg-Vorschau"
                    ></iframe>
                {:else}
                    <img
                        src={receiptUrl}
                        alt="Beleg-Vorschau"
                        class="max-h-[60vh] max-w-full rounded-xl object-contain shadow-md"
                    />
                {/if}
            </div>
        </div>
    </dialog>
{/if}
