<script lang="ts">
    import { Copy, Check, BookOpen, Sparkles, FileText } from 'lucide-svelte';

    interface Props {
        content: string;
        title?: string;
        onCopyText?: (text: string) => void;
    }

    let { content = '', title = '', onCopyText }: Props = $props();

    let copiedSectionIndex = $state<number | null>(null);

    interface ParagraphBlock {
        type: 'h1' | 'h2' | 'h3' | 'paragraph';
        text: string;
    }

    let blocks = $derived.by<ParagraphBlock[]>(() => {
        if (!content.trim()) return [];
        const lines = content.split('\n');
        const result: ParagraphBlock[] = [];
        let currentParagraph: string[] = [];

        function flushParagraph() {
            if (currentParagraph.length > 0) {
                const text = currentParagraph.join(' ').trim();
                if (text) {
                    result.push({ type: 'paragraph', text });
                }
                currentParagraph = [];
            }
        }

        for (let line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                flushParagraph();
                continue;
            }

            if (trimmed.startsWith('# ')) {
                flushParagraph();
                result.push({ type: 'h1', text: trimmed.replace(/^#\s+/, '') });
            } else if (trimmed.startsWith('## ')) {
                flushParagraph();
                result.push({ type: 'h2', text: trimmed.replace(/^##\s+/, '') });
            } else if (trimmed.startsWith('### ')) {
                flushParagraph();
                result.push({ type: 'h3', text: trimmed.replace(/^###\s+/, '') });
            } else {
                currentParagraph.push(trimmed);
            }
        }
        flushParagraph();
        return result;
    });

    function copyBlock(text: string, index: number) {
        if (onCopyText) {
            onCopyText(text);
        } else {
            navigator.clipboard.writeText(text);
        }
        copiedSectionIndex = index;
        setTimeout(() => {
            if (copiedSectionIndex === index) copiedSectionIndex = null;
        }, 2500);
    }
</script>

<div class="w-full max-w-4xl mx-auto space-y-4">
    <!-- Header-Info Fließtext-Modus -->
    <div class="flex items-center justify-between px-4 py-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-xs font-medium text-indigo-900 dark:text-indigo-200">
        <div class="flex items-center gap-2">
            <BookOpen class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span class="font-bold">Fließtext-Lesemodus</span>
            <span class="text-indigo-600/70 dark:text-indigo-400/70 hidden sm:inline">• Reiner zusammenhängender Text für präzises Agent-Briefing</span>
        </div>
        <span class="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 font-bold border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
            {blocks.filter(b => b.type === 'paragraph').length} Absätze
        </span>
    </div>

    <!-- Fließtext Dokumentenkarte -->
    <article class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-5 sm:p-8 space-y-6 text-slate-800 dark:text-slate-200">
        {#if blocks.length === 0}
            <div class="text-center py-12 text-slate-400 dark:text-slate-500">
                <FileText class="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p class="text-sm font-medium">Kein Prompt-Inhalt vorhanden.</p>
            </div>
        {:else}
            {#each blocks as block, idx}
                {#if block.type === 'h1'}
                    <div class="pt-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                        <h1 class="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Sparkles class="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>{block.text}</span>
                        </h1>
                    </div>
                {:else if block.type === 'h2'}
                    <div class="pt-4 pb-1 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between group">
                        <h2 class="text-sm sm:text-base font-bold text-indigo-700 dark:text-indigo-300 tracking-tight">
                            {block.text}
                        </h2>
                        <button
                            type="button"
                            onclick={() => copyBlock(`## ${block.text}`, idx)}
                            class="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer rounded"
                            title="Überschrift kopieren"
                        >
                            {#if copiedSectionIndex === idx}
                                <Check class="w-3.5 h-3.5 text-emerald-500" />
                            {:else}
                                <Copy class="w-3.5 h-3.5" />
                            {/if}
                        </button>
                    </div>
                {:else if block.type === 'h3'}
                    <h3 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white pt-2">
                        {block.text}
                    </h3>
                {:else}
                    <div class="relative group">
                        <p class="text-xs sm:text-sm leading-relaxed sm:leading-loose text-slate-700 dark:text-slate-300 font-normal">
                            {block.text}
                        </p>
                        <button
                            type="button"
                            onclick={() => copyBlock(block.text, idx)}
                            class="absolute right-0 top-0 -mt-1 p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                            title="Diesen Absatz kopieren"
                        >
                            {#if copiedSectionIndex === idx}
                                <Check class="w-3 h-3 text-emerald-500" />
                            {:else}
                                <Copy class="w-3 h-3" />
                            {/if}
                        </button>
                    </div>
                {/if}
            {/each}
        {/if}
    </article>
</div>
