<!--

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
                feedbackMessage =
                    "Fertig! Ihr Entwurf wurde erfolgreich gespeichert.";
                specificationText = "";
            } else {
                throw new Error("Fehler bei der Übermittlung");
            }
        } catch (error) {
            feedbackMessage =
                "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.";
            isError = true;
        } finally {
            isSubmitting = false;
            globalUiSubmitting.submitting = false;
        }
    }
</script>

<div
    class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs max-w-2xl w-full"
>
    <h3 class="text-lg font-bold text-slate-900 mb-2">
        Text automatisch verbessern & Entwurf erstellen
    </h3>
    <p class="text-sm text-slate-600 mb-4">
        Schreiben Sie hier Ihre Notizen oder Stichpunkte auf. Unser System
        formuliert daraus automatisch einen sauberen, vollständigen Entwurf für
        Sie.
    </p>

    <form onsubmit={handleSecureSubmit} class="space-y-4">
        <div>
            <label
                for="specification"
                class="block font-semibold text-gray-700 mb-1"
            >
                Ihre Notizen oder Wünsche:
            </label>
            <textarea
                id="specification"
                bind:value={specificationText}
                rows="4"
                placeholder="z. B. kurze Stichpunkte zum Termin, wichtige Vereinbarungen oder was im Dokument stehen soll..."
                class="border border-slate-300 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-sm transition-all"
                required
            ></textarea>
        </div>

        {#if feedbackMessage}
            <div
                class="p-3 rounded-xl text-sm font-medium {isError
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}"
            >
                {feedbackMessage}
            </div>
        {/if}

        
        <button
            type="submit"
            disabled={isSubmitting}
            class="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 min-w-[150px] transition-all disabled:bg-gray-400 disabled:cursor-not-allowed shadow-xs active:scale-98"
        >
            {#if isSubmitting}
                <span
                    class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                ></span>
                Verarbeitet...
            {:else}
                Änderungen speichern
            {/if}
        </button>
    </form>
</div>
-->
