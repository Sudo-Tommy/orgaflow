<script lang="ts">
    import { portalBlockedState } from "./portalBlockedState.svelte";
    import { performPortalLogout } from "./portalDataService";

    let dialog = $state<HTMLDialogElement | null>(null);

    $effect(() => {
        if (portalBlockedState.isBlocked) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    });

    function handleConfirmAndLogout() {
        portalBlockedState.reset();
        performPortalLogout();
    }
</script>

{#if portalBlockedState.isBlocked}
    <dialog 
        bind:this={dialog}
        aria-labelledby="blocked-dialog-title"
        class="zero-inner-scroll-modal fixed inset-0 m-auto w-full max-w-md bg-transparent p-4 border-none outline-none backdrop:bg-slate-950/80 backdrop:backdrop-blur-md animate-enter z-50 overflow-visible"
        oncancel={(e) => { e.preventDefault(); handleConfirmAndLogout(); }}
    >
        <div class="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-3xl p-6 sm:p-8 w-full shadow-2xl text-center space-y-5 animate-enter">
            <!-- Warn-Icon -->
            <div class="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-3xl mx-auto shadow-inner border border-amber-200/80 dark:border-amber-800/60">
                🔒
            </div>

            <!-- Titel -->
            <div>
                <h3 id="blocked-dialog-title" class="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                    Zugang nicht freigeschaltet
                </h3>
                <p class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mt-1">
                    Freigabe erforderlich
                </p>
            </div>

            <!-- Nachricht -->
            <div class="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed text-left space-y-2">
                <p class="font-semibold text-slate-900 dark:text-slate-100">
                    {portalBlockedState.blockedReason}
                </p>
                <p class="text-slate-500 dark:text-slate-400 text-xs">
                    Ihr persönlicher Zugang wurde noch nicht vom Administrator aktiviert oder vorübergehend gesperrt. Bitte wenden Sie sich an Ihre Seniorenassistenz.
                </p>
            </div>

            <!-- Bestätigungs-Button -->
            <div>
                <button
                    type="button"
                    onclick={handleConfirmAndLogout}
                    class="orga-button-primary w-full py-3 px-6 min-h-[48px] text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-amber-600/20 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl active:scale-95 transition-all"
                >
                    <span>Zurück zur Anmeldung</span>
                    <span>&rarr;</span>
                </button>
            </div>
        </div>
    </dialog>
{/if}
