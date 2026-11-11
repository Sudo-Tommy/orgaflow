<script lang="ts">
    import { Bold, Italic, Underline } from 'lucide-svelte';
    import { hapticFeedback } from '$lib/services/hapticFeedback';

    interface Props {
        message: string;
        method: 'email' | 'whatsapp';
        isSending: boolean;
        isGenerating: boolean;
        onGenerateAi: () => void;
    }

    let {
        message = $bindable(),
        method,
        isSending,
        isGenerating,
        onGenerateAi
    }: Props = $props();

    let textareaRef = $state<HTMLTextAreaElement | null>(null);

    function applyFormat(type: 'bold' | 'italic' | 'underline') {
        if (!textareaRef) return;
        hapticFeedback.tap();
        const isWa = method === 'whatsapp';
        let startTag = '', endTag = '';
        if (type === 'bold') { startTag = isWa ? '*' : '<b>'; endTag = isWa ? '*' : '</b>'; }
        else if (type === 'italic') { startTag = isWa ? '_' : '<i>'; endTag = isWa ? '_' : '</i>'; }
        else if (type === 'underline') { startTag = isWa ? '' : '<u>'; endTag = isWa ? '' : '</u>'; }
        if (!startTag) return;

        const start = textareaRef.selectionStart;
        const end = textareaRef.selectionEnd;
        const selectedText = message.substring(start, end);
        message = message.substring(0, start) + startTag + selectedText + endTag + message.substring(end);
        setTimeout(() => { 
            textareaRef?.focus(); 
            textareaRef?.setSelectionRange(start + startTag.length, end + startTag.length); 
        }, 10);
    }
</script>

<div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <label for="rem-message" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            Nachricht *
        </label>
        <div class="flex items-center justify-end gap-2">
            <div class="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg p-0.5 shadow-sm">
                <button 
                    type="button" 
                    onclick={() => applyFormat('bold')} 
                    class="w-8 h-8 min-h-[32px] min-w-[32px] flex items-center justify-center hover:bg-neutral-100 text-neutral-700 rounded touch-manipulation cursor-pointer" 
                    title="Fett"
                >
                    <Bold class="w-3.5 h-3.5" />
                </button>
                <button 
                    type="button" 
                    onclick={() => applyFormat('italic')} 
                    class="w-8 h-8 min-h-[32px] min-w-[32px] flex items-center justify-center hover:bg-neutral-100 text-neutral-700 rounded touch-manipulation cursor-pointer" 
                    title="Kursiv"
                >
                    <Italic class="w-3.5 h-3.5" />
                </button>
                {#if method === 'email'}
                    <button 
                        type="button" 
                        onclick={() => applyFormat('underline')} 
                        class="w-8 h-8 min-h-[32px] min-w-[32px] flex items-center justify-center hover:bg-neutral-100 text-neutral-700 rounded touch-manipulation cursor-pointer" 
                        title="Unterstrichen"
                    >
                        <Underline class="w-3.5 h-3.5" />
                    </button>
                {/if}
            </div>
            <button 
                type="button" 
                onclick={onGenerateAi} 
                disabled={isSending || isGenerating} 
                class="min-h-10 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 touch-manipulation cursor-pointer active:scale-95"
            >
                {#if isGenerating}
                    <div class="w-3 h-3 border-2 border-brand-200 border-t-brand-700 rounded-full animate-spin"></div>
                    <span>KI schreibt...</span>
                {:else}
                    <span>✨</span>
                    <span>KI-Vorschlag</span>
                {/if}
            </button>
        </div>
    </div>
    <textarea 
        id="rem-message" 
        bind:this={textareaRef} 
        bind:value={message} 
        rows="6" 
        class="orga-input-clear min-h-36 py-3 text-sm resize-none custom-scrollbar touch-manipulation" 
        required 
        disabled={isSending || isGenerating}
    ></textarea>
</div>
