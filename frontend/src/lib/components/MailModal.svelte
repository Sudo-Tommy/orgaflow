<!-- src/lib/components/MailModal.svelte -->
<script lang="ts">
    import MailLayout from "$lib/components/MailLayout.svelte";
    import { tick } from "svelte";
    import { Mail, X, ExternalLink } from "lucide-svelte";

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
        class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-900/60 backdrop:backdrop-blur-md w-full max-w-4xl mx-auto my-auto rounded-3xl outline-none z-50 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10"
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
        <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl w-full flex flex-col relative shadow-2xl border border-slate-200/90 dark:border-slate-800">
            <!-- Modal Header Bar: Bleibt beim Scrollen komfortabel oben angeheftet -->
            <div class="px-4 sm:px-6 py-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 sticky top-0 z-30 rounded-t-3xl shadow-xs">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-2xs border border-indigo-100 dark:border-indigo-900/50">
                        <Mail class="w-4 h-4" />
                    </div>
                    <div>
                        <h2 class="text-sm font-bold text-slate-900 dark:text-white leading-tight">E-Mail Postfach</h2>
                        <p class="text-[10px] text-slate-500 dark:text-slate-400 font-medium">OrgaFlow Posteingang</p>
                    </div>
                </div>
                
                <div class="flex items-center gap-2">
                    <a 
                        href="/mail/" 
                        onclick={close} 
                        class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        title="In eigenem Tab / ganzer Seite öffnen"
                    >
                        <span>Volle Seite</span>
                        <ExternalLink class="w-3.5 h-3.5" />
                    </a>
                    <button 
                        type="button" 
                        onclick={close} 
                        class="min-h-11 min-w-11 inline-flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        aria-label="Schließen"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>
            </div>

            <!-- Content Area: MailLayout im Zero-Inner-Scroll Modus -->
            <div class="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-b-3xl">
                <MailLayout />
            </div>
        </div>
    </dialog>
{/if}
