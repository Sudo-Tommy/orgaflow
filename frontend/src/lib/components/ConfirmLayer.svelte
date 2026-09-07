<script lang="ts">
    import { confirmStore } from "$lib/services/confirmService.svelte";

    let dialog: HTMLDialogElement;

    $effect(() => {
        if (confirmStore.isVisible && dialog && !dialog.open) {
            dialog.showModal();
        } else if (!confirmStore.isVisible && dialog && dialog.open) {
            dialog.close();
        }
    });
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-sm mx-auto my-auto rounded-3xl border-none outline-none shadow-2xl" onclick={(e) => { if (e.target === dialog) confirmStore.respond(false); }}>
    {#if confirmStore.isVisible}
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 w-full flex flex-col gap-4 animate-enter">
            <div class="flex items-center gap-3 mb-2 {confirmStore.isDanger ? 'text-rose-900 dark:text-rose-200' : 'text-slate-900 dark:text-slate-100'}">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner {confirmStore.isDanger ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400' : 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400'}">
                    {confirmStore.isDanger ? '⚠️' : '🤔'}
                </div>
                <h3 class="text-xl font-bold leading-tight">{confirmStore.title}</h3>
            </div>
            
            <p class="text-slate-600 dark:text-slate-300 leading-relaxed font-normal">{confirmStore.message}</p>
            
            <div class="flex gap-3 mt-4 pt-5 border-t border-slate-100 dark:border-slate-800">
                <button onclick={() => confirmStore.respond(false)} class="flex-1 py-2.5 px-4 rounded-xl font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">{confirmStore.cancelText}</button>
                <button onclick={() => confirmStore.respond(true)} class="flex justify-center items-center gap-2 font-bold py-2.5 px-6 rounded-xl transition-all duration-300 shadow-lg active:scale-95 flex-1 {confirmStore.isDanger ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 hover:shadow-rose-600/50' : 'bg-brand-800 hover:bg-brand-700 text-white shadow-brand-800/30 hover:shadow-brand-800/50'}">{confirmStore.confirmText}</button>
            </div>
        </div>
    {/if}
</dialog>