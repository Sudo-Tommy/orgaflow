<script lang="ts">
    import AppointmentRequestsWidget from "$lib/components/AppointmentRequestsWidget.svelte";
    import { tick } from "svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement | undefined;
    let isOpen = $state(false);
    let currentTab = $state<'requests' | 'changes' | 'feedbacks' | 'admissions'>('requests');

    export async function open(tab: 'requests' | 'changes' | 'feedbacks' | 'admissions' = 'requests') {
        currentTab = tab;
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
        class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-900/60 backdrop:backdrop-blur-md w-full max-w-3xl mx-auto my-auto rounded-3xl outline-none z-50 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10"
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
        <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl w-full h-auto flex flex-col relative shadow-2xl border border-slate-200/90 dark:border-slate-800">
            <!-- Content Area -->
            <div class="flex-1 flex flex-col bg-slate-50/60 dark:bg-slate-950/40 rounded-3xl pb-[max(env(safe-area-inset-bottom,0px),0.25rem)]">
                <AppointmentRequestsWidget onclose={close} initialTab={currentTab} />
            </div>
        </div>
    </dialog>
{/if}