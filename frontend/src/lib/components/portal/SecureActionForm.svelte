<script lang="ts">
    import { isSubmitting as globalUiSubmitting } from "$lib/states/ui.svelte";

    let isSubmitting = $state(false);
    let feedbackMessage = $state("");
    let isError = $state(false);
    let specificationText = $state("");

    async function handleSecureSubmit(event: Event) {
        event.preventDefault();
        if (isSubmitting) return;
        isSubmitting = true;
        globalUiSubmitting.submitting = true;
        feedbackMessage = "";
        isError = false;

        try {
            // Asynchroner Speicherprozess für automatische Text-Optimierung
            const response = await fetch("/api/secure-action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    specification: specificationText,
                    type: "system-specification",
                }),
            });

            if (response.ok) {
                feedbackMessage = "Fertig! Ihr Entwurf wurde erfolgreich gespeichert.";
                specificationText = "";
            } else {
                throw new Error("Fehler bei der Übermittlung");
            }
        } catch (error) {
            feedbackMessage = "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.";
            isError = true;
        } finally {
            isSubmitting = false;
            globalUiSubmitting.submitting = false;
        }
    }
</script>

<div
    class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs max-w-2xl w-full transition-colors"
>
    <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
        Text automatisch verbessern & Entwurf erstellen
    </h3>
    <p class="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
        Schreiben Sie hier Ihre Notizen oder Stichpunkte auf. Unser System
        formuliert daraus automatisch einen sauberen, vollständigen Entwurf für
        Sie.
    </p>

    <form onsubmit={handleSecureSubmit} class="space-y-4">
        <div>
            <label
                for="specification"
                class="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-sm"
            >
                Ihre Notizen oder Wünsche:
            </label>
            <textarea
                id="specification"
                bind:value={specificationText}
                rows="4"
                placeholder="z. B. kurze Stichpunkte zum Termin, wichtige Vereinbarungen oder was im Dokument stehen soll..."
                class="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-3.5 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-sm transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                required
            ></textarea>
        </div>

        {#if feedbackMessage}
            <div
                class="p-3.5 rounded-xl text-sm font-medium transition-all {isError
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'}"
            >
                {feedbackMessage}
            </div>
        {/if}

        <!-- Barrierefreies Touch-Ziel (h-11 / min 44px Höhe) und Double-Submission Lock -->
        <button
            type="submit"
            disabled={isSubmitting}
            class="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 min-w-[160px] transition-all disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed shadow-xs active:scale-98 cursor-pointer"
        >
            {#if isSubmitting}
                <span
                    class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                ></span>
                <span>Verarbeitet...</span>
            {:else}
                <span>Änderungen speichern</span>
            {/if}
        </button>
    </form>
</div>
