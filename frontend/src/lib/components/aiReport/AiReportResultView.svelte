<script lang="ts">
    import { autoGrow } from "$lib/actions/autoGrow";
    import { PROMPT_FAMILIE, PROMPT_INTERN, PROMPT_STANDARD } from "./aiReportPrompts";
    import { triggerHaptic } from "$lib/services/hapticFeedback";

    interface Recipient {
        name: string;
        role: string;
    }

    interface Props {
        generatedText: string;
        customPrompt: string;
        reportType: 'family' | 'internal' | 'standard';
        availableRecipients: Recipient[];
        selectedRecipientName: string;
        onRegenerate: () => void;
        onBack: () => void;
        onSave: () => void;
    }

    let {
        generatedText = $bindable(),
        customPrompt = $bindable(),
        reportType = $bindable(),
        availableRecipients,
        selectedRecipientName = $bindable(),
        onRegenerate,
        onBack,
        onSave
    }: Props = $props();

    // Alphabetische Sortierung nach Anzeigename per alphabetical-select.md
    let sortedRecipients = $derived(
        [...availableRecipients].sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }))
    );
</script>

<div class="animate-enter space-y-6">
    <div>
        <label for="ai-result" class="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
            Generierter Bericht (Bitte prüfen & anpassen)
        </label>
        <textarea 
            use:autoGrow 
            id="ai-result" 
            bind:value={generatedText} 
            class="auto-grow orga-input-clear resize-none overflow-hidden text-sm leading-relaxed min-h-32"
        ></textarea>
    </div>
    
    <div class="bg-neutral-50 dark:bg-slate-900/60 p-4 rounded-xl border border-neutral-200 dark:border-slate-800">
        {#if (reportType === 'family' || reportType === 'standard') && sortedRecipients.length > 0}
            <div class="mb-4 pb-4 border-b border-neutral-200 dark:border-slate-800">
                <label for="ai-recipient-regen" class="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Bericht adressieren an (Betreuer / Kontakt)
                </label>
                <select 
                    id="ai-recipient-regen" 
                    bind:value={selectedRecipientName} 
                    class="orga-input-clear py-2 text-sm bg-white dark:bg-slate-800 border-neutral-200 dark:border-slate-700 cursor-pointer min-h-[44px]"
                >
                    <option value="">Keine direkte Anrede (Allgemein)</option>
                    {#each sortedRecipients as rec}
                        <option value={rec.name}>{rec.name} ({rec.role})</option>
                    {/each}
                </select>
            </div>
        {/if}

        <div class="flex items-center justify-between mb-1.5">
            <label for="ai-prompt-edit" class="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                KI-Prompt anpassen
            </label>
            <div class="flex gap-2">
                <button 
                    type="button" 
                    onclick={() => { triggerHaptic('tap'); reportType = 'family'; customPrompt = PROMPT_FAMILIE; }} 
                    class="px-2 py-1 {reportType === 'family' ? 'bg-indigo-600 text-white shadow-xs border-indigo-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'} text-[10px] font-bold rounded-md border transition-colors min-h-[32px] cursor-pointer touch-manipulation"
                >Für Familie</button>
                <button 
                    type="button" 
                    onclick={() => { triggerHaptic('tap'); reportType = 'standard'; customPrompt = PROMPT_STANDARD; }} 
                    class="px-2 py-1 {reportType === 'standard' ? 'bg-blue-600 text-white shadow-xs border-blue-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'} text-[10px] font-bold rounded-md border transition-colors min-h-[32px] cursor-pointer touch-manipulation"
                >Standard</button>
                <button 
                    type="button" 
                    onclick={() => { triggerHaptic('tap'); reportType = 'internal'; customPrompt = PROMPT_INTERN; }} 
                    class="px-2 py-1 {reportType === 'internal' ? 'bg-emerald-600 text-white shadow-xs border-emerald-700' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'} text-[10px] font-bold rounded-md border transition-colors min-h-[32px] cursor-pointer touch-manipulation"
                >Intern (Team)</button>
            </div>
        </div>

        <textarea 
            use:autoGrow 
            id="ai-prompt-edit" 
            bind:value={customPrompt} 
            class="auto-grow orga-input-clear text-sm resize-none overflow-hidden min-h-20"
        ></textarea>

        <div class="flex justify-end mt-3">
            <button 
                type="button" 
                onclick={onRegenerate} 
                class="orga-button-ghost py-2 px-4 text-xs font-bold bg-white dark:bg-slate-800 shadow-2xs border border-neutral-200 dark:border-slate-700 hover:border-indigo-300 min-h-[40px] cursor-pointer touch-manipulation active:scale-95"
            >Mit neuem Prompt neu generieren 🔄</button>
        </div>
    </div>

    <div class="pt-4 border-t border-neutral-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-3">
        <button 
            type="button" 
            onclick={onBack} 
            class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5 min-h-[44px] cursor-pointer touch-manipulation active:scale-95"
        >Zurück zu den Aufnahmen</button>
        <button 
            type="button" 
            onclick={onSave} 
            class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 w-full sm:w-auto py-3 sm:py-2.5 min-h-[44px] cursor-pointer touch-manipulation active:scale-95"
        >Bericht übernehmen</button>
    </div>
</div>
