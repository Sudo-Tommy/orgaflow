<script lang="ts">
    import { Zap, Terminal, Code2 } from 'lucide-svelte';
    import type { SystemPromptRecord } from '$lib/types/orgaTypes';
    import { toastStore } from '$lib/services/toastService.svelte';
    import PromptFliesstextViewer from '$lib/components/admin/PromptFliesstextViewer.svelte';
    import PromptDetailToolbar from './PromptDetailToolbar.svelte';

    let {
        prompt,
        mobileView = $bindable<'list' | 'detail'>('list'),
        onUpdateStatus,
        onEdit,
        onDelete
    }: {
        prompt: SystemPromptRecord | null;
        mobileView: 'list' | 'detail';
        onUpdateStatus: (id: string, status: 'open' | 'applied' | 'archived') => void;
        onEdit: (p: SystemPromptRecord) => void;
        onDelete: (id: string) => void;
    } = $props();

    let viewMode = $state<'formatted' | 'raw'>('formatted');
    let copiedState = $state(false);
    let copyForAntigravitySuccess = $state(false);

    async function copyToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            copiedState = true;
            toastStore.success('Prompt in Zwischenablage kopiert! 📋');
            setTimeout(() => { copiedState = false; }, 3000);
        } catch {
            toastStore.error('Kopieren fehlgeschlagen.');
        }
    }

    async function copyForAntigravity() {
        if (!prompt?.prompt_content) return;
        try {
            const formatted = `=== AUSBESSERUNGSAUFTRAG FÜR GEMINI CODE ASSIST (AGENT) IN ANTIGRAVITY ===\n\n` +
                prompt.prompt_content.trim() + 
                `\n\n=== VERIFIKATION NACH UMSETZUNG ===\n` +
                `- Typecheck: cd frontend && npm run check\n` +
                `- Build: cd frontend && npm run build\n` +
                `- Asset-Sync: robocopy frontend\\pb_public backend\\pb_public /MIR\n`;
            await navigator.clipboard.writeText(formatted);
            copyForAntigravitySuccess = true;
            toastStore.success('Perfekt formatiert für Antigravity Agent kopiert! ⚡');
            setTimeout(() => { copyForAntigravitySuccess = false; }, 3000);
        } catch {
            toastStore.error('Kopieren fehlgeschlagen.');
        }
    }

    function downloadPromptFile() {
        if (!prompt?.prompt_content) return;
        try {
            const kwPart = prompt.calendar_week ? prompt.calendar_week.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Prompt';
            const blob = new Blob([prompt.prompt_content], { type: 'text/markdown;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `System-Prompt_${kwPart}.md`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toastStore.success('Prompt heruntergeladen! 💾');
        } catch {
            toastStore.error('Download fehlgeschlagen.');
        }
    }
</script>

<section class="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950 overflow-hidden {mobileView === 'list' ? 'hidden md:flex' : 'flex'}">
    {#if prompt}
        <PromptDetailToolbar 
            {prompt}
            bind:mobileView
            bind:viewMode
            {copiedState}
            {copyForAntigravitySuccess}
            {onUpdateStatus}
            onCopyAntigravity={copyForAntigravity}
            onCopyContent={() => copyToClipboard(prompt.prompt_content)}
            onDownload={downloadPromptFile}
            {onEdit}
            {onDelete}
        />

        <div class="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4">
            {#if viewMode === 'formatted'}
                <div class="space-y-4 max-w-5xl mx-auto">
                    <PromptFliesstextViewer 
                        content={prompt.prompt_content} 
                        title={prompt.title} 
                        onCopyText={(text) => copyToClipboard(text)} 
                    />

                    {#if prompt.raw_summary}
                        <details class="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 transition-all">
                            <summary class="cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-between">
                                <span class="flex items-center gap-2">
                                    <Terminal class="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Aggregierter Rohdaten-Kontext (Audit Log)</span>
                                </span>
                                <span class="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <pre class="bg-slate-950 text-slate-200 p-4 rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-80 custom-scrollbar">{prompt.raw_summary}</pre>
                            </div>
                        </details>
                    {/if}
                </div>
            {:else}
                <div class="h-full flex flex-col space-y-2">
                    <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span class="flex items-center gap-1.5">
                            <Code2 class="w-3.5 h-3.5 text-indigo-500" />
                            <span>Markdown-Quelltext:</span>
                        </span>
                        <span>{prompt.prompt_content?.length || 0} Zeichen</span>
                    </div>
                    <textarea 
                        readonly 
                        class="flex-1 w-full min-h-[500px] bg-slate-950 text-slate-100 p-4 rounded-2xl font-mono text-xs leading-relaxed custom-scrollbar border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none select-all shadow-inner"
                        value={prompt.prompt_content}
                    ></textarea>
                </div>
            {/if}
        </div>
    {:else}
        <div class="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-3">
            <Zap class="w-12 h-12 text-indigo-400 opacity-40 animate-pulse" />
            <h3 class="text-base font-bold text-slate-700 dark:text-slate-200">Kein Prompt ausgewählt</h3>
            <p class="text-xs max-w-sm">Wählen Sie links einen Prompt aus oder generieren Sie einen neuen Wochen-Prompt per KI-Analyse.</p>
        </div>
    {/if}
</section>
