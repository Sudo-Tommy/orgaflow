<script lang="ts">
    import { Sparkles, Loader2 } from 'lucide-svelte';
    import { autoGrow } from '$lib/actions/autoGrow';

    let {
        description = $bindable(''),
        solutionConcept = $bindable(''),
        tags = $bindable(''),
        isGeneratingSolution = false,
        canGenerateSolution = false,
        onGenerateSolution
    }: {
        description: string;
        solutionConcept: string;
        tags: string;
        isGeneratingSolution: boolean;
        canGenerateSolution: boolean;
        onGenerateSolution: () => void;
    } = $props();
</script>

<!-- Problembeschreibung (Auto-Grow) -->
<div class="space-y-1.5">
    <label for="prop-desc" class="block text-xs font-bold text-neutral-800 dark:text-slate-200">
        Problem & Ausgangslage <span class="text-rose-500">*</span>
    </label>
    <textarea
        id="prop-desc"
        use:autoGrow
        bind:value={description}
        placeholder="Beschreiben Sie das aktuelle Verhalten, Einschränkungen oder den Wunsch der Betreuungskräfte bzw. Klienten..."
        class="auto-grow orga-input-clear text-xs py-2.5 px-3.5 w-full leading-relaxed resize-none overflow-hidden min-h-24"
    ></textarea>
</div>

<!-- Erwartete Lösung / Konzept (Auto-Grow) -->
<div class="space-y-1.5">
    <div class="flex items-center justify-between">
        <label for="prop-concept" class="block text-xs font-bold text-neutral-800 dark:text-slate-200">
            Erwartetes Lösungskonzept / Technischer Ansatz
        </label>
        <button
            type="button"
            onclick={onGenerateSolution}
            disabled={!canGenerateSolution}
            class="min-h-11 px-3 py-1 text-[11px] font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/40 border border-brand-200 dark:border-brand-800/60 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-2xs touch-manipulation"
            title="Generiert automatisch ein strukturiertes Lösungs- und Maßnahmenkonzept"
        >
            {#if isGeneratingSolution}
                <Loader2 class="w-3.5 h-3.5 animate-spin text-brand-600 dark:text-brand-400" />
                <span>Generiert Konzept...</span>
            {:else}
                <Sparkles class="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>✨ Lösungsansatz vorschlagen (1-Click)</span>
            {/if}
        </button>
    </div>
    <textarea
        id="prop-concept"
        use:autoGrow
        bind:value={solutionConcept}
        placeholder="Welche UI-Elemente, API-Endpoints, Datenbank-Felder oder Berechnungen sollen angepasst werden? (Tipp: Nutzen Sie den 1-Click-Assistenten oben rechts)"
        disabled={isGeneratingSolution}
        class="auto-grow orga-input-clear text-xs py-2.5 px-3.5 w-full leading-relaxed resize-none overflow-hidden min-h-32 {isGeneratingSolution ? 'opacity-50 animate-pulse' : ''}"
    ></textarea>
</div>

<!-- Tags -->
<div class="space-y-1.5">
    <label for="prop-tags" class="block text-xs font-bold text-neutral-800 dark:text-slate-200 flex items-center justify-between">
        <span>Schlagworte / Tags</span>
        <span class="text-neutral-400 dark:text-slate-500 font-normal text-[11px]">(Komma-getrennt)</span>
    </label>
    <input
        id="prop-tags"
        type="text"
        bind:value={tags}
        placeholder="z. B. haushaltsbuch, ocr, quellen, export"
        class="orga-input-clear text-xs py-2.5 px-3.5 w-full min-h-11 touch-manipulation"
    />
</div>
