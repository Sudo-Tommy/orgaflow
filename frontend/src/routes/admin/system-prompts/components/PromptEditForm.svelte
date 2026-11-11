<script lang="ts">
    import { AlertCircle } from 'lucide-svelte';
    import type { SystemPromptRecord } from '$lib/types/orgaTypes';
    import { formatKW } from '../types';

    let {
        modalCalendarWeek = $bindable(''),
        modalTitle = $bindable(''),
        modalStatus = $bindable<'open' | 'applied' | 'archived'>('open'),
        modalPromptContent = $bindable(''),
        modalRawSummary = $bindable(''),
        isSaving = false,
        kwConflictPrompt = null,
        currentKWString,
        onSwitchPrompt
    }: {
        modalCalendarWeek: string;
        modalTitle: string;
        modalStatus: 'open' | 'applied' | 'archived';
        modalPromptContent: string;
        modalRawSummary: string;
        isSaving: boolean;
        kwConflictPrompt: SystemPromptRecord | null;
        currentKWString: string;
        onSwitchPrompt: (p: SystemPromptRecord) => void;
    } = $props();
</script>

<div class="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-4">
    {#if kwConflictPrompt}
        <div class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2 text-xs">
            <div class="flex items-start gap-2">
                <AlertCircle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div class="space-y-1">
                    <p class="font-bold">Kalenderwoche bereits belegt ({formatKW(modalCalendarWeek)})!</p>
                    <p class="text-amber-800 dark:text-amber-300 leading-relaxed">
                        Für <strong>{formatKW(modalCalendarWeek)}</strong> existiert bereits ein Prompt: 
                        <span class="font-semibold italic">"{kwConflictPrompt.title}"</span>.
                    </p>
                </div>
            </div>
            <button 
                type="button" 
                onclick={() => onSwitchPrompt(kwConflictPrompt)}
                class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
            >
                Zu diesem Prompt wechseln &rarr;
            </button>
        </div>
    {/if}

    <div class="space-y-1">
        <label for="modal-kw-input" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Kalenderwoche (Format: YYYY-Www) <span class="text-rose-500">*</span>
        </label>
        <div class="flex items-center gap-2">
            <div class="relative flex-1">
                <input 
                    id="modal-kw-input"
                    type="text" 
                    bind:value={modalCalendarWeek} 
                    placeholder="z. B. 2026-W37"
                    class="w-full py-2.5 px-3 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-950 border text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 {kwConflictPrompt ? 'border-amber-500 focus:ring-amber-500' : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-500'}"
                    required 
                    disabled={isSaving}
                />
                {#if kwConflictPrompt}
                    <span class="absolute right-3 top-2.5 text-amber-600 font-bold text-[10px] flex items-center gap-1">
                        <AlertCircle class="w-3 h-3" /> Belegt
                    </span>
                {/if}
            </div>
            <button 
                type="button" 
                onclick={() => modalCalendarWeek = currentKWString}
                class="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                disabled={isSaving}
            >
                Aktuelle KW ({formatKW(currentKWString)})
            </button>
        </div>
    </div>

    <div class="space-y-1">
        <label for="prompt-title" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Titel / Bezeichnung <span class="text-rose-500">*</span>
        </label>
        <input 
            id="prompt-title"
            type="text" 
            bind:value={modalTitle} 
            placeholder="z. B. Wöchentlicher System-Ausbesserungsprompt (KW 37 / 2026)"
            class="w-full py-2.5 px-3 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required 
            disabled={isSaving}
        />
    </div>

    <div class="space-y-1">
        <span class="block text-xs font-bold text-slate-700 dark:text-slate-300">Bearbeitungsstatus</span>
        <div class="flex items-center gap-3">
            <label class="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="radio" bind:group={modalStatus} value="open" class="text-amber-500 focus:ring-amber-500" disabled={isSaving} />
                <span>Offen / Neu</span>
            </label>
            <label class="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="radio" bind:group={modalStatus} value="applied" class="text-emerald-600 focus:ring-emerald-500" disabled={isSaving} />
                <span>In Umsetzung / Angewendet</span>
            </label>
            <label class="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="radio" bind:group={modalStatus} value="archived" class="text-slate-600 focus:ring-slate-500" disabled={isSaving} />
                <span>Archiviert</span>
            </label>
        </div>
    </div>

    <div class="space-y-1">
        <div class="flex items-center justify-between">
            <label for="prompt-content" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Prompt-Inhalt (Markdown) <span class="text-rose-500">*</span>
            </label>
            <span class="text-[10px] font-mono text-slate-400">{modalPromptContent.length} Zeichen</span>
        </div>
        <textarea 
            id="prompt-content"
            bind:value={modalPromptContent} 
            rows="10" 
            placeholder="Geben Sie hier den Prompt-Text ein..."
            class="w-full py-2.5 px-3 text-xs font-mono leading-relaxed rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y custom-scrollbar"
            required 
            disabled={isSaving}
        ></textarea>
    </div>

    <details class="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
        <summary class="cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span>Zusätzliche Rohdaten / Audit-Logs (Optional)</span>
            <span class="text-slate-400">▼</span>
        </summary>
        <div class="mt-2.5">
            <textarea 
                bind:value={modalRawSummary} 
                rows="4" 
                placeholder="Zusätzliche Aggregations-Logs..."
                class="w-full py-2 px-3 text-xs font-mono rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 custom-scrollbar"
                disabled={isSaving}
            ></textarea>
        </div>
    </details>
</div>
