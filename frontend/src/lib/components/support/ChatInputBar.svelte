<!-- src/lib/components/support/ChatInputBar.svelte -->
<script lang="ts">
    import { Send, Mic, MicOff, Paperclip } from 'lucide-svelte';
    import type { ChatAttachment } from '$lib/services/aiLiveSupportService';

    interface Props {
        inputText: string;
        pendingAttachments: ChatAttachment[];
        isLoading: boolean;
        isSubmitting: boolean;
        isRecording: boolean;
        onSend: () => void;
        onAddFiles: (files: FileList | File[]) => void;
        onToggleSpeech: () => void;
    }

    let {
        inputText = $bindable(),
        pendingAttachments,
        isLoading,
        isSubmitting,
        isRecording,
        onSend,
        onAddFiles,
        onToggleSpeech
    }: Props = $props();

    let fileInputRef = $state<HTMLInputElement | null>(null);
</script>

<div class="flex items-center gap-2 shrink-0">
    <input
        type="file"
        multiple
        bind:this={fileInputRef}
        class="hidden"
        onchange={(e) => {
            const target = e.target as HTMLInputElement;
            if (target.files) onAddFiles(target.files);
            target.value = '';
        }}
    />
    <button
        type="button"
        onclick={() => fileInputRef?.click()}
        class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
        title="Datei oder Screenshot anhängen (auch per Strg+V)"
    >
        <Paperclip class="w-4 h-4" />
    </button>
    <button
        type="button"
        onclick={onToggleSpeech}
        class="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0 {isRecording ? 'bg-rose-500 border-rose-600 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}"
        title={isRecording ? 'Aufnahme stoppen' : 'Per Spracheingabe sprechen'}
    >
        {#if isRecording}<MicOff class="w-4 h-4" />{:else}<Mic class="w-4 h-4" />{/if}
    </button>
    <input
        type="text"
        bind:value={inputText}
        onkeydown={(e) => { if (e.key === 'Enter') onSend(); }}
        placeholder="Frag Omni etwas zur App (Dateien per Strg+V)..."
        class="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        disabled={isLoading || isSubmitting}
    />
    <button
        type="button"
        onclick={onSend}
        disabled={(!inputText.trim() && pendingAttachments.length === 0) || isLoading || isSubmitting}
        class="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors active:scale-95"
    >
        <Send class="w-4 h-4" />
    </button>
</div>

