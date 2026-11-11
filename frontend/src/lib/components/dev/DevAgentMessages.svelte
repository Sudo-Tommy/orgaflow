<script lang="ts">
    import { devAgentState, type DevMessage } from '$lib/services/devAgentState.svelte';
    import { Sparkles, Terminal, FileCode, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-svelte';

    let openToolIndexes = $state<Record<string, boolean>>({});

    function toggleTool(msgId: string, idx: number) {
        const key = `${msgId}_${idx}`;
        openToolIndexes[key] = !openToolIndexes[key];
    }
</script>

<div class="flex-1 space-y-3.5 pr-1">
    {#if devAgentState.messages.length === 0}
        <div class="py-8 px-3 text-center text-slate-400 dark:text-slate-500">
            <div class="w-10 h-10 mx-auto mb-2.5 rounded-2xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-400 flex items-center justify-center">
                <Sparkles class="w-5 h-5" />
            </div>
            <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">Antigravity Live-Entwicklung</p>
            <p class="text-[11px] mt-1 text-slate-500 dark:text-slate-400 max-w-[240px] mx-auto">
                Prompte Änderungen direkt im Browser. Quellcode wird sofort aktualisiert.
            </p>
        </div>
    {/if}

    {#each devAgentState.messages as msg (msg.id)}
        {#if msg.role === 'user'}
            <div class="flex justify-end">
                <div class="max-w-[88%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 bg-violet-600 text-white text-xs shadow-sm">
                    <p class="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <span class="block mt-1 text-[9px] text-violet-200 text-right">{msg.timestamp}</span>
                </div>
            </div>
        {:else}
            <div class="flex justify-start">
                <div class="w-full max-w-[94%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 text-xs shadow-sm">
                    {#if msg.statusText}
                        <div class="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-medium pb-1.5 animate-pulse text-[11px]">
                            <span class="w-2 h-2 rounded-full bg-violet-500 animate-ping"></span>
                            <span>{msg.statusText}</span>
                        </div>
                    {/if}

                    {#if msg.tools && msg.tools.length > 0}
                        <div class="space-y-1 mb-2 pt-1 border-t border-slate-200 dark:border-slate-700/50">
                            {#each msg.tools as tool, idx}
                                <div class="rounded-lg bg-slate-200/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/40 p-1.5 text-[10px]">
                                    <button 
                                        type="button"
                                        onclick={() => toggleTool(msg.id, idx)}
                                        class="w-full flex items-center justify-between text-left text-slate-600 dark:text-slate-400 font-mono hover:text-slate-800 dark:hover:text-slate-200"
                                    >
                                        <span class="flex items-center gap-1">
                                            <Terminal class="w-3 h-3 text-cyan-500" />
                                            <span>{tool.name}</span>
                                        </span>
                                        {#if openToolIndexes[`${msg.id}_${idx}`]}
                                            <ChevronDown class="w-3 h-3" />
                                        {:else}
                                            <ChevronRight class="w-3 h-3" />
                                        {/if}
                                    </button>
                                    {#if openToolIndexes[`${msg.id}_${idx}`]}
                                        <pre class="mt-1 p-1.5 bg-slate-900 text-slate-300 rounded overflow-x-auto text-[9px] max-h-32 custom-scrollbar">{JSON.stringify(tool.args || tool.result, null, 2)}</pre>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}

                    <div class="whitespace-pre-wrap leading-relaxed space-y-1">
                        {msg.content}
                    </div>

                    {#if msg.filesChanged && msg.filesChanged.length > 0}
                        <div class="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                            <span class="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">Geänderte Dateien:</span>
                            <div class="flex flex-wrap gap-1">
                                {#each msg.filesChanged as file}
                                    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                                        <FileCode class="w-2.5 h-2.5" />
                                        <span class="truncate max-w-[190px]">{file}</span>
                                    </span>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <span class="block mt-1 text-[9px] text-slate-400 text-right">{msg.timestamp}</span>
                </div>
            </div>
        {/if}
    {/each}
</div>
