<script lang="ts">
    import { slide } from "svelte/transition";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { submitFeedback, type FeedbackInput } from "$lib/services/feedback.service";
    import { X, Star, Send } from "lucide-svelte";
    import { pb } from "$lib/services/pocketbase";
    import { autoGrow } from "$lib/actions/autoGrow";

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    // Formular-State
    let rating = $state(0);
    let message = $state("");
    let name_first = $state("");
    let name_last = $state("");

    export function open() {
        // Reset bei jedem Öffnen
        rating = 0;
        message = "";
        name_first = "";
        name_last = "";
        errorMsg = "";
        
        // Auto-Fill für eingeloggte Portal-Nutzer UND Mitarbeiter
        let model = pb.authStore.model;
        if (!model && typeof window !== 'undefined') {
            const token = localStorage.getItem('portal_token');
            if (token) {
                try { model = JSON.parse(atob(token.split('.')[1])); } catch (e) {}
            }
        }
        
        if (model) {
            name_first = model.name_first || "";
            name_last = model.name_last || "";
        }
        
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        
        if (rating < 1 || rating > 10) {
            errorMsg = "Bitte wählen Sie eine Bewertung zwischen 1 und 10 aus.";
            return;
        }

        isLoading = true;
        errorMsg = "";

        try {
            const payload: FeedbackInput = {
                rating,
                message: message.trim(),
                name_first: name_first.trim(),
                name_last: name_last.trim()
            };
            
            // Verhindert den 400-Fehler: Superadmin-IDs dürfen nicht in eine normale Nutzer-Relation geschrieben werden
            let user = pb.authStore.model;
            if (!user && typeof window !== 'undefined') {
                const token = localStorage.getItem('portal_token');
                if (token) {
                    try { user = JSON.parse(atob(token.split('.')[1])); } catch (e) {}
                }
            }
            
            const isSuperuser = pb.authStore.isSuperuser || user?.collectionName === '_superusers';
            if (user && !isSuperuser) {
                // Da maxSelect: 0 ist, erwartet PocketBase zwingend ein Array für diese Relation
                // @ts-ignore
                payload.submitted_by = [user.id];
            }
            
            try {
                await submitFeedback(payload);
            } catch (innerErr: any) {
                // Fallback: Falls der Nutzer aus einer falschen Collection stammt und abgelehnt wird, senden wir ohne Relation
                if (innerErr.status === 400 && innerErr.response?.data?.submitted_by) {
                    delete payload.submitted_by;
                    await submitFeedback(payload);
                } else {
                    throw innerErr;
                }
            }

            toastStore.success("Vielen Dank für Ihr Feedback!");
            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Es gab einen Fehler beim Senden Ihres Feedbacks.";
            
            // Schreibt die exakten PocketBase Validierungsfehler (z.B. "rating: cannot be empty") in die UI
            if (err.response?.data) {
                const details = Object.entries(err.response.data).map(([k, v]: any) => `${k}: ${v.message}`).join(", ");
                if (details) errorMsg += ` (${details})`;
            }
        } finally {
            isLoading = false;
        }
    }

    // Visuelles Feedback für die Skala
    function getRatingColor(value: number, isSelected: boolean) {
        if (!isSelected) return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700";
        if (value <= 3) return "bg-rose-500 text-white border-rose-600 shadow-rose-500/30";
        if (value <= 6) return "bg-amber-500 text-white border-amber-600 shadow-amber-500/30";
        if (value <= 8) return "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/30";
        return "bg-teal-500 text-white border-teal-600 shadow-teal-500/30";
    }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-lg mx-auto my-6 sm:my-10 rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl p-6 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:outline-none z-10">
            <X class="w-5 h-5" />
        </button>
        
        <div class="flex items-center gap-3 mb-2 pr-12">
            <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center shadow-inner shrink-0">
                <Star class="w-6 h-6 fill-current" />
            </div>
            <div>
                <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight">Ihr Feedback</h2>
                <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">Wie zufrieden sind Sie mit uns?</p>
            </div>
        </div>

        {#if errorMsg}
            <div class="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-4 rounded-xl mt-6 text-sm font-medium border border-rose-200 dark:border-rose-900/60 animate-enter shadow-sm">
                {errorMsg}
            </div>
        {/if}

        <form onsubmit={handleSubmit} class="mt-6 space-y-6">
            <div>
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 text-center">Auf einer Skala von 1 (Schlecht) bis 10 (Hervorragend)</label>
                <div class="flex flex-wrap justify-center gap-2">
                    {#each Array(10) as _, i}
                        {@const val = i + 1}
                        <button type="button" onclick={() => rating = val} class="w-10 h-12 sm:w-11 sm:h-14 rounded-xl border text-lg sm:text-xl font-black transition-all active:scale-95 flex items-center justify-center shadow-sm {getRatingColor(val, rating === val)}" aria-label="Bewertung {val}">
                            {val}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Progressive Disclosure: Erst wenn ein Rating gewählt wurde, öffnet sich der Rest -->
            {#if rating > 0}
                <div transition:slide={{ duration: 300 }} class="space-y-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div>
                        <label for="feedback-msg" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Was können wir verbessern oder was lief besonders gut?</label>
                        <textarea use:autoGrow id="feedback-msg" bind:value={message} class="auto-grow orga-input-clear w-full min-h-24 resize-none overflow-hidden text-sm" placeholder="Ihre ehrliche Meinung ist uns wichtig..." maxlength="1000" disabled={isLoading}></textarea>
                        <div class="text-[10px] text-slate-400 dark:text-slate-500 text-right mt-1">{message.length}/1000</div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="feedback-fname" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Vorname <span class="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span></label>
                            <input id="feedback-fname" type="text" bind:value={name_first} class="orga-input-clear w-full min-h-12 text-sm" disabled={isLoading} />
                        </div>
                        <div>
                            <label for="feedback-lname" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nachname <span class="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span></label>
                            <input id="feedback-lname" type="text" bind:value={name_last} class="orga-input-clear w-full min-h-12 text-sm" disabled={isLoading} />
                        </div>
                    </div>

                    <div class="pt-4 flex justify-end">
                        <button type="submit" disabled={isLoading} class="orga-button-primary w-full sm:w-auto active:scale-95 px-8 min-h-12 text-sm flex items-center justify-center gap-2">
                            {#if isLoading}
                                <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Sendet...
                            {:else}
                                <Send class="w-4 h-4" /> Feedback senden
                            {/if}
                        </button>
                    </div>
                </div>
            {/if}
        </form>
    </div>
</dialog>