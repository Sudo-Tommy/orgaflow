<script lang="ts">
    import { autoGrow } from "$lib/actions/autoGrow";
    import { PROMPT_FAMILIE, PROMPT_INTERN, PROMPT_STANDARD } from "./aiReportPrompts";
    import type { AiReportState } from "./aiReportState.svelte";
    import { triggerHaptic } from "$lib/services/hapticFeedback";

    interface Recipient {
        name: string;
        role: string;
    }

    interface Props {
        reportState: AiReportState;
        inputType: 'record' | 'text' | 'standard';
        manualText: string;
        reportType: 'family' | 'internal' | 'standard';
        customPrompt: string;
        availableRecipients: Recipient[];
        selectedRecipientName: string;
        onClose: () => void;
        onGenerate: () => void;
    }

    let {
        reportState,
        inputType = $bindable(),
        manualText = $bindable(),
        reportType = $bindable(),
        customPrompt = $bindable(),
        availableRecipients,
        selectedRecipientName = $bindable(),
        onClose,
        onGenerate
    }: Props = $props();

    let documentInput = $state<HTMLInputElement>();
    let audioInput = $state<HTMLInputElement>();

    function formatTime(seconds: number) {
        return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
    }

    let sortedRecipients = $derived(
        [...availableRecipients].sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }))
    );
</script>

<div class="flex flex-col gap-4">
    <!-- Input Type Selector Tabs -->
    <div class="flex gap-2 p-1 bg-neutral-100 dark:bg-slate-800 rounded-xl">
        <button 
            type="button" 
            onclick={() => { triggerHaptic('tap'); inputType = 'record'; }} 
            class="flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors min-h-[40px] cursor-pointer touch-manipulation {inputType === 'record' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-300' : 'text-neutral-500 hover:text-neutral-700'}"
        >🎤 Aufnahme</button>
        <button 
            type="button" 
            onclick={() => { triggerHaptic('tap'); inputType = 'text'; }} 
            class="flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors min-h-[40px] cursor-pointer touch-manipulation {inputType === 'text' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-300' : 'text-neutral-500 hover:text-neutral-700'}"
        >✍️ Text eingeben</button>
        <button 
            type="button" 
            onclick={() => { triggerHaptic('tap'); inputType = 'standard'; reportType = 'standard'; customPrompt = PROMPT_STANDARD; }} 
            class="flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors min-h-[40px] cursor-pointer touch-manipulation {inputType === 'standard' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-300' : 'text-neutral-500 hover:text-neutral-700'}"
        >✅ Ohne Vorkommnisse</button>
    </div>

    <!-- Document Attachments -->
    <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between px-1">
            <span class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Zusätzliche Dokumente (Arztbrief etc.)</span>
            <input type="file" bind:this={documentInput} onchange={(e) => reportState.handleDocumentUpload(e)} class="hidden" accept="image/*,application/pdf" multiple />
            <button 
                type="button" 
                onclick={() => documentInput?.click()} 
                class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1.5 rounded-lg min-h-[36px] cursor-pointer touch-manipulation active:scale-95"
            >
                <span>📎</span> Anhängen
            </button>
        </div>
        {#if reportState.attachedDocuments.length > 0}
            <div class="flex flex-col gap-2 p-1">
                {#each reportState.attachedDocuments as doc (doc.id)}
                    <div class="flex items-center justify-between bg-neutral-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 shadow-2xs">
                        <span class="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate mr-2">📄 {doc.name}</span>
                        <button type="button" onclick={() => reportState.deleteDocument(doc.id)} class="text-rose-500 hover:text-rose-700 w-7 h-7 flex items-center justify-center rounded-full hover:bg-rose-50 transition-colors font-bold text-sm cursor-pointer touch-manipulation">✕</button>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    {#if inputType === 'standard'}
        <div class="animate-enter bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-4 rounded-xl text-center">
            <span class="text-3xl mb-2 block">✅</span>
            <h3 class="font-bold text-blue-900 dark:text-blue-200 mb-1">Standard-Bericht generieren</h3>
            <p class="text-xs sm:text-sm text-blue-800 dark:text-blue-300 leading-relaxed">Die KI formuliert einen professionellen Kurzbericht basierend auf den Termindaten (Ort, Leistungen etc.), der bestätigt, dass alles planmäßig und ohne besondere Auffälligkeiten verlief.</p>
        </div>
    {:else if inputType === 'record'}
        <div class="animate-enter space-y-4">
            {#if reportState.recordings.length > 0}
                <div class="bg-indigo-50/30 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                    <h3 class="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-3">Aufnahmen ({reportState.recordings.length})</h3>
                    <div class="flex flex-col gap-2 pr-2">
                        {#each reportState.recordings as rec (rec.id)}
                            <div class="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 rounded-full flex items-center justify-center text-xs">🎵</div>
                                    <div>
                                        <p class="text-[11px] font-bold text-neutral-900 dark:text-neutral-100">Sprachnotiz</p>
                                        <p class="text-xs text-neutral-500">{rec.duration > 0 ? `Dauer: ${formatTime(rec.duration)}` : 'Hochgeladene Datei'}</p>
                                    </div>
                                </div>
                                <button type="button" onclick={() => reportState.deleteRecording(rec.id)} class="text-rose-500 hover:text-rose-700 w-8 h-8 rounded-full hover:bg-rose-50 transition-colors flex items-center justify-center font-bold cursor-pointer touch-manipulation" title="Löschen">✕</button>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <div class="flex flex-col items-center justify-center py-8 bg-neutral-50/50 dark:bg-slate-800/40 rounded-2xl border border-neutral-100 dark:border-slate-800 border-dashed">
                {#if reportState.isRecording}
                    <div class="text-3xl font-mono font-black text-rose-600 mb-6 animate-pulse">{formatTime(reportState.recordingTime)}</div>
                    <div class="flex gap-4">
                        <button type="button" onclick={() => reportState.cancelRecording()} class="w-14 h-14 bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 text-neutral-600 dark:text-neutral-200 hover:bg-neutral-100 rounded-full flex items-center justify-center transition-colors shadow-2xs cursor-pointer touch-manipulation" title="Abbrechen">✕</button>
                        <button type="button" onclick={() => reportState.stopRecording()} class="w-16 h-16 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg shadow-rose-500/30 cursor-pointer touch-manipulation active:scale-95" title="Aufnahme beenden">
                            <div class="w-5 h-5 bg-white rounded-xs"></div>
                        </button>
                    </div>
                    <p class="text-xs text-rose-500 mt-4 font-bold animate-pulse">Nimmt auf...</p>
                {:else}
                    <button type="button" onclick={() => reportState.startRecording()} class="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-full flex flex-col items-center justify-center transition-colors shadow-2xs group cursor-pointer touch-manipulation active:scale-95">
                        <span class="text-3xl group-hover:scale-110 transition-transform">🎤</span>
                    </button>
                    <p class="text-sm font-bold text-neutral-700 dark:text-neutral-200 mt-4">Neue Notiz aufnehmen</p>
                    <div class="flex items-center gap-2 my-2 w-40">
                        <div class="h-px flex-1 bg-neutral-200 dark:bg-slate-700"></div>
                        <span class="text-xs text-neutral-400 font-medium">oder</span>
                        <div class="h-px flex-1 bg-neutral-200 dark:bg-slate-700"></div>
                    </div>
                    <input type="file" bind:this={audioInput} onchange={(e) => reportState.handleFileUpload(e)} class="hidden" accept="audio/*,.m4a,audio/mp4,audio/x-m4a,video/mp4" multiple />
                    <button type="button" onclick={() => audioInput?.click()} class="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline min-h-[36px] cursor-pointer touch-manipulation">Datei hochladen</button>
                {/if}
            </div>
        </div>
    {:else}
        <div class="animate-enter">
            <label for="manual-text" class="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Manueller Text</label>
            <textarea use:autoGrow id="manual-text" bind:value={manualText} class="auto-grow orga-input-clear resize-none overflow-hidden text-sm leading-relaxed min-h-32" placeholder="Stichpunkte, Sätze oder ganze Absätze hier einfügen..."></textarea>
        </div>
    {/if}

    {#if (inputType === 'record' && reportState.recordings.length > 0 && !reportState.isRecording) || (inputType === 'text' && manualText.trim()) || inputType === 'standard' || reportState.attachedDocuments.length > 0}
        <div class="bg-neutral-50 dark:bg-slate-800/60 p-4 rounded-xl border border-neutral-200 dark:border-slate-800">
            {#if (reportType === 'family' || reportType === 'standard') && sortedRecipients.length > 0}
                <div class="mb-4 pb-4 border-b border-neutral-200 dark:border-slate-700">
                    <label for="ai-recipient" class="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Bericht adressieren an (Betreuer / Kontakt)</label>
                    <select id="ai-recipient" bind:value={selectedRecipientName} class="orga-input-clear py-2 text-sm bg-white dark:bg-slate-800 border-neutral-200 dark:border-slate-700 cursor-pointer min-h-[44px]">
                        <option value="">Keine direkte Anrede (Allgemein)</option>
                        {#each sortedRecipients as rec}
                            <option value={rec.name}>{rec.name} ({rec.role})</option>
                        {/each}
                    </select>
                </div>
            {/if}
            <div class="flex items-center justify-between mb-1.5">
                <label for="ai-prompt" class="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">KI-Anweisung (Prompt)</label>
                <div class="flex gap-2">
                    <button type="button" onclick={() => { triggerHaptic('tap'); reportType = 'family'; customPrompt = PROMPT_FAMILIE; }} class="px-2 py-1 {reportType === 'family' ? 'bg-indigo-600 text-white shadow-xs border-indigo-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'} text-[10px] font-bold rounded-md border transition-colors min-h-[32px] cursor-pointer touch-manipulation">Für Familie</button>
                    <button type="button" onclick={() => { triggerHaptic('tap'); reportType = 'standard'; customPrompt = PROMPT_STANDARD; }} class="px-2 py-1 {reportType === 'standard' ? 'bg-blue-600 text-white shadow-xs border-blue-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'} text-[10px] font-bold rounded-md border transition-colors min-h-[32px] cursor-pointer touch-manipulation">Standard</button>
                    <button type="button" onclick={() => { triggerHaptic('tap'); reportType = 'internal'; customPrompt = PROMPT_INTERN; }} class="px-2 py-1 {reportType === 'internal' ? 'bg-emerald-600 text-white shadow-xs border-emerald-700' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'} text-[10px] font-bold rounded-md border transition-colors min-h-[32px] cursor-pointer touch-manipulation">Intern (Team)</button>
                </div>
            </div>
            <textarea use:autoGrow id="ai-prompt" bind:value={customPrompt} class="auto-grow orga-input-clear text-sm resize-none overflow-hidden min-h-20"></textarea>
        </div>
        
        <div class="pt-4 mt-2 border-t border-neutral-100 dark:border-slate-800 flex flex-col sm:flex-row justify-end gap-3">
            <button type="button" onclick={onClose} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5 min-h-[44px] cursor-pointer touch-manipulation active:scale-95">Abbrechen</button>
            <button type="button" onclick={onGenerate} class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 w-full sm:w-auto py-3 sm:py-2.5 min-h-[44px] cursor-pointer touch-manipulation active:scale-95">Bericht generieren ✨</button>
        </div>
    {/if}
</div>
