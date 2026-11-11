<script lang="ts">
    import { autoGrow } from '$lib/actions/autoGrow';
    import { Sparkles, Copy, Check, Save, Send, RotateCw } from 'lucide-svelte';
    import type { GeneratedFeedbackPromptResult } from './feedbackActionPromptService';

    let {
        generatedResult,
        activeTab = $bindable<'prompt' | 'team' | 'reply'>('prompt'),
        teamChatEditableText = $bindable(''),
        replyEditableText = $bindable(''),
        isPromptCopied = false,
        isTeamPromptCopied = false,
        isReplyCopied = false,
        isSavingToPrompts = false,
        isPostingToChat = false,
        onCopyPrompt,
        onCopyTeamPrompt,
        onCopyReply,
        onSaveToPrompts,
        onPostToChat
    }: {
        generatedResult: GeneratedFeedbackPromptResult;
        activeTab: 'prompt' | 'team' | 'reply';
        teamChatEditableText: string;
        replyEditableText: string;
        isPromptCopied: boolean;
        isTeamPromptCopied: boolean;
        isReplyCopied: boolean;
        isSavingToPrompts: boolean;
        isPostingToChat: boolean;
        onCopyPrompt: () => void;
        onCopyTeamPrompt: () => void;
        onCopyReply: () => void;
        onSaveToPrompts: () => void;
        onPostToChat: () => void;
    } = $props();
</script>

<div class="border border-neutral-200 rounded-2xl overflow-hidden shadow-xs">
    <div class="bg-neutral-50 px-4 py-3 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
            <button
                type="button"
                onclick={() => activeTab = 'prompt'}
                class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeTab === 'prompt' ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'}"
            >
                🤖 Gemini Prompt
            </button>
            <button
                type="button"
                onclick={() => activeTab = 'team'}
                class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeTab === 'team' ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'}"
            >
                💬 Team & Support
            </button>
            <button
                type="button"
                onclick={() => activeTab = 'reply'}
                class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeTab === 'reply' ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'}"
            >
                ✉️ Kundenantwort
            </button>
        </div>

        <div class="flex items-center gap-1.5">
            {#if activeTab === 'prompt'}
                <button
                    type="button"
                    onclick={onCopyPrompt}
                    class="px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1 min-h-[32px] cursor-pointer {isPromptCopied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}"
                    title="In Zwischenablage kopieren"
                >
                    {#if isPromptCopied}
                        <Check class="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kopiert!</span>
                    {:else}
                        <Copy class="w-3.5 h-3.5 text-neutral-500" />
                        <span>Kopieren</span>
                    {/if}
                </button>
                <button
                    type="button"
                    onclick={onSaveToPrompts}
                    disabled={isSavingToPrompts || !!generatedResult.savedSystemPromptId}
                    class="px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1 min-h-[32px] cursor-pointer {generatedResult.savedSystemPromptId ? 'bg-indigo-50 text-indigo-700 border-indigo-200 cursor-default' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}"
                    title="Dauerhaft in System-Prompts ablegen"
                >
                    <Save class="w-3.5 h-3.5" />
                    <span>{generatedResult.savedSystemPromptId ? 'Gespeichert ✓' : 'In Prompts sichern'}</span>
                </button>
            {:else if activeTab === 'team'}
                <button
                    type="button"
                    onclick={onCopyTeamPrompt}
                    class="px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1 min-h-[32px] cursor-pointer {isTeamPromptCopied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}"
                    title="Team-Briefing in Zwischenablage kopieren"
                >
                    {#if isTeamPromptCopied}
                        <Check class="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kopiert!</span>
                    {:else}
                        <Copy class="w-3.5 h-3.5 text-neutral-500" />
                        <span>Briefing kopieren</span>
                    {/if}
                </button>
                <button
                    type="button"
                    onclick={onPostToChat}
                    disabled={isPostingToChat || !teamChatEditableText.trim()}
                    class="px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1 min-h-[32px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 disabled:opacity-50 cursor-pointer"
                    title="Direkt als Nachricht im OrgaFlow Team-Chat veröffentlichen"
                >
                    {#if isPostingToChat}
                        <RotateCw class="w-3.5 h-3.5 animate-spin" />
                        <span>Sendet...</span>
                    {:else}
                        <Send class="w-3.5 h-3.5 text-indigo-600" />
                        <span>In Team-Chat posten</span>
                    {/if}
                </button>
            {:else}
                <button
                    type="button"
                    onclick={onCopyReply}
                    class="px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1 min-h-[32px] cursor-pointer {isReplyCopied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}"
                >
                    {#if isReplyCopied}
                        <Check class="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kopiert!</span>
                    {:else}
                        <Copy class="w-3.5 h-3.5" />
                        <span>Antwort kopieren</span>
                    {/if}
                </button>
            {/if}
        </div>
    </div>

    <!-- Tab-Inhalt ohne innere Scrollbars -->
    <div class="p-4 sm:p-5 bg-white">
        {#if activeTab === 'prompt'}
            <div class="space-y-3">
                <div class="flex items-center justify-between text-xs text-neutral-400">
                    <span class="font-bold text-neutral-700">{generatedResult.title}</span>
                    <span>Bereit zum Einfügen in Gemini Code Assist in Antigravity</span>
                </div>
                <pre class="bg-neutral-900 text-neutral-100 rounded-xl p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed select-all">{generatedResult.prompt}</pre>
            </div>
        {:else if activeTab === 'team'}
            <div class="space-y-3">
                <div class="flex items-center justify-between text-xs">
                    <label for="team-chat-text" class="font-bold text-neutral-800 flex items-center gap-1.5">
                        <span>💬</span> Briefing & Handlungsanweisungen für Team Chat & Support:
                    </label>
                    <span class="text-neutral-400 text-[11px]">Für Außendienst vor Ort, Team-Chat & Kundensupport</span>
                </div>
                <textarea
                    use:autoGrow
                    id="team-chat-text"
                    bind:value={teamChatEditableText}
                    class="auto-grow orga-input-clear text-xs font-sans py-3 px-3.5 leading-relaxed bg-white border border-neutral-200 rounded-xl resize-none overflow-hidden min-h-32"
                    placeholder="Team Chat & Support Briefing wird generiert..."
                ></textarea>
            </div>
        {:else}
            <div class="space-y-3">
                <label for="reply-text" class="block text-xs font-bold text-neutral-700">
                    Antwortschreiben an Kunden (formell "Sie"):
                </label>
                <textarea
                    use:autoGrow
                    id="reply-text"
                    bind:value={replyEditableText}
                    class="auto-grow orga-input-clear text-xs py-3 px-3.5 leading-relaxed resize-none overflow-hidden min-h-28"
                    placeholder="Text der Kundenantwort..."
                ></textarea>
            </div>
        {/if}
    </div>
</div>
