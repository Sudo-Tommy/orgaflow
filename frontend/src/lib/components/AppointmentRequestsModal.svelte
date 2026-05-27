<script lang="ts">
    import AppointmentRequestsWidget from "$lib/components/AppointmentRequestsWidget.svelte";
    import { X } from "lucide-svelte";

    let dialog: HTMLDialogElement | undefined = $state();

    export function open() {
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-5xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-neutral-50 rounded-3xl w-full h-[90vh] flex flex-col relative shadow-2xl overflow-hidden border border-neutral-200">
        <div class="bg-white px-6 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-sm">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-inner text-lg">📬</div>
                <div>
                    <h2 class="text-xl font-bold text-neutral-900 leading-tight">Posteingang</h2>
                    <p class="text-[10px] sm:text-xs text-neutral-500 font-medium mt-0.5">Anfragen, Änderungen & Feedback</p>
                </div>
            </div>
            <button aria-label="Schließen" onclick={close} class="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors shadow-sm shrink-0 active:scale-95">
                <X class="w-5 h-5" />
            </button>
        </div>
        <div class="overflow-y-auto custom-scrollbar flex-1 p-4 sm:p-6 bg-neutral-100/50">
            <AppointmentRequestsWidget />
        </div>
    </div>
</dialog>