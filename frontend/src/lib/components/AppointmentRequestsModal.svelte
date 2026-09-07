<script lang="ts">
    import AppointmentRequestsWidget from "$lib/components/AppointmentRequestsWidget.svelte";
    import { X } from "lucide-svelte";
    import { tick } from "svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement | undefined;
    let isOpen = $state(false);

    export async function open() {
        isOpen = true;
        await tick();
        if (dialog && !dialog.open) {
            dialog.showModal();
        }
    }

    export function close() {
        if (dialog?.open) {
            dialog.close();
        }
        isOpen = false;
    }
</script>

{#if isOpen}
    <dialog 
        bind:this={dialog} 
        class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-5xl m-0 sm:mx-auto sm:my-auto fixed bottom-0 sm:relative sm:bottom-auto rounded-t-3xl sm:rounded-3xl overflow-hidden outline-none z-50"
        onclick={(e) => {
            if (e.target === dialog) {
                e.stopPropagation();
                close();
            }
        }}
        oncancel={(e) => {
            e.preventDefault();
            close();
        }}
    >
        <div class="bg-neutral-50 rounded-t-3xl sm:rounded-3xl w-full h-[88dvh] sm:h-[90vh] flex flex-col relative shadow-2xl overflow-hidden border border-neutral-200">
            <!-- Mobile Drag Indicator -->
            <div class="pt-3 pb-1 sm:hidden flex justify-center shrink-0 bg-white">
                <div class="w-12 h-1.5 bg-neutral-300 rounded-full"></div>
            </div>

            <!-- Header -->
            <div class="bg-white px-5 sm:px-6 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-xs">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-inner text-lg">
                        📬
                    </div>
                    <div>
                        <h2 class="text-lg sm:text-xl font-bold text-neutral-900 leading-tight">Posteingang</h2>
                        <p class="text-[10px] sm:text-xs text-neutral-500 font-medium mt-0.5">Anfragen, Änderungen &amp; Feedback</p>
                    </div>
                </div>
                <button 
                    type="button"
                    aria-label="Schließen" 
                    onclick={close} 
                    class="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors shadow-xs shrink-0 active:scale-95 cursor-pointer"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Content -->
            <div class="overflow-y-auto custom-scrollbar flex-1 p-4 sm:p-6 bg-neutral-100/50 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
                <AppointmentRequestsWidget />
            </div>
        </div>
    </dialog>
{/if}