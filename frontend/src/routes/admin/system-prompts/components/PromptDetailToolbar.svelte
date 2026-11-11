<script lang="ts">
    import { 
        ChevronLeft, ChevronDown, Check, Zap, Copy, FileDown, Edit3, Trash2 
    } from 'lucide-svelte';
    import type { SystemPromptRecord } from '$lib/types/orgaTypes';
    import { formatKW, formatDate, getStatusBadge } from '../types';

    let {
        prompt,
        mobileView = $bindable<'list' | 'detail'>('list'),
        viewMode = $bindable<'formatted' | 'raw'>('formatted'),
        copiedState = false,
        copyForAntigravitySuccess = false,
        onUpdateStatus,
        onCopyAntigravity,
        onCopyContent,
        onDownload,
        onEdit,
        onDelete
    }: {
        prompt: SystemPromptRecord;
        mobileView: 'list' | 'detail';
        viewMode: 'formatted' | 'raw';
        copiedState: boolean;
        copyForAntigravitySuccess: boolean;
        onUpdateStatus: (id: string, status: 'open' | 'applied' | 'archived') => void;
        onCopyAntigravity: () => void;
        onCopyContent: () => void;
        onDownload: () => void;
        onEdit: (p: SystemPromptRecord) => void;
        onDelete: (id: string) => void;
    } = $props();

    let showStatusSelectDropdown = $state(false);
    let statusDropdownRef = $state<HTMLDivElement>();
    const currentStatus = $derived(getStatusBadge(prompt.status));
    const selectedKWDisplay = $derived(formatKW(prompt.calendar_week));

    function handleWindowClick(e: MouseEvent) {
        if (!showStatusSelectDropdown) return;
        if (statusDropdownRef && !statusDropdownRef.contains(e.target as Node)) {
            showStatusSelectDropdown = false;
        }
    }
</script>

<svelte:window onclick={handleWindowClick} onkeydown={(e) => { if (showStatusSelectDropdown && e.key === 'Escape') showStatusSelectDropdown = false; }} />

<div class="relative z-30 px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-2xs">
    <div class="flex items-center gap-2 min-w-0">
        <button
            type="button"
            onclick={() => mobileView = 'list'}
            class="md:hidden p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            title="Zurück zur Liste"
        >
            <ChevronLeft class="w-4 h-4" />
        </button>

        <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
                {#if selectedKWDisplay}
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-600 text-white shadow-2xs">
                        {selectedKWDisplay}
                    </span>
                {/if}
                
                <div bind:this={statusDropdownRef} class="relative">
                    <button
                        type="button"
                        onclick={(e) => { e.stopPropagation(); showStatusSelectDropdown = !showStatusSelectDropdown; }}
                        class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors cursor-pointer {currentStatus.bg}"
                    >
                        <span class="w-1.5 h-1.5 rounded-full {currentStatus.dot}"></span>
                        <span>{currentStatus.label}</span>
                        <ChevronDown class="w-3 h-3 opacity-60" />
                    </button>

                    {#if showStatusSelectDropdown}
                        <div class="absolute left-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-1 z-50 space-y-0.5 text-xs font-bold animate-enter">
                            <button
                                type="button"
                                onclick={() => { showStatusSelectDropdown = false; onUpdateStatus(prompt.id, 'open'); }}
                                class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-between cursor-pointer"
                            >
                                <span>Offen / Neu</span>
                                {#if prompt.status === 'open'}<Check class="w-3.5 h-3.5" />{/if}
                            </button>
                            <button
                                type="button"
                                onclick={() => { showStatusSelectDropdown = false; onUpdateStatus(prompt.id, 'applied'); }}
                                class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-between cursor-pointer"
                            >
                                <span>Angewendet</span>
                                {#if prompt.status === 'applied'}<Check class="w-3.5 h-3.5" />{/if}
                            </button>
                            <button
                                type="button"
                                onclick={() => { showStatusSelectDropdown = false; onUpdateStatus(prompt.id, 'archived'); }}
                                class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-between cursor-pointer"
                            >
                                <span>Archiviert</span>
                                {#if prompt.status === 'archived'}<Check class="w-3.5 h-3.5" />{/if}
                            </button>
                        </div>
                    {/if}
                </div>

                <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                    Erstellt: {formatDate(prompt.created)}
                </span>
            </div>
            <h2 class="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate mt-0.5">
                {prompt.title}
            </h2>
        </div>
    </div>

    <div class="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
        <button 
            type="button" 
            onclick={onCopyAntigravity}
            class="px-3 py-1.5 rounded-xl text-xs font-black transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs {copyForAntigravitySuccess ? 'bg-emerald-600 text-white shadow-emerald-600/30' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/20'}"
            title="Kopiert den Prompt mit Antigravity-Agent Anweisung"
        >
            {#if copyForAntigravitySuccess}
                <Check class="w-3.5 h-3.5" />
                <span>Agent kopiert!</span>
            {:else}
                <Zap class="w-3.5 h-3.5 text-amber-300" />
                <span>In Antigravity</span>
            {/if}
        </button>

        <button 
            type="button" 
            onclick={onCopyContent}
            class="p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            title="Prompt-Text in Zwischenablage kopieren"
        >
            {#if copiedState}
                <Check class="w-3.5 h-3.5 text-emerald-500" />
                <span class="hidden sm:inline">Kopiert!</span>
            {:else}
                <Copy class="w-3.5 h-3.5" />
                <span class="hidden sm:inline">Kopieren</span>
            {/if}
        </button>

        <button 
            type="button" 
            onclick={onDownload}
            class="p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            title="Markdown herunterladen"
        >
            <FileDown class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Export</span>
        </button>

        <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold">
            <button 
                type="button" 
                onclick={() => viewMode = 'formatted'}
                class="px-2.5 py-1 rounded-lg transition-all cursor-pointer {viewMode === 'formatted' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}"
            >
                Fließtext
            </button>
            <button 
                type="button" 
                onclick={() => viewMode = 'raw'}
                class="px-2.5 py-1 rounded-lg transition-all cursor-pointer {viewMode === 'raw' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}"
            >
                Raw
            </button>
        </div>

        <button 
            type="button" 
            onclick={() => onEdit(prompt)}
            class="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Prompt bearbeiten"
        >
            <Edit3 class="w-3.5 h-3.5" />
        </button>

        <button 
            type="button" 
            onclick={() => onDelete(prompt.id)}
            class="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 transition-colors cursor-pointer"
            title="Prompt löschen"
        >
            <Trash2 class="w-3.5 h-3.5" />
        </button>
    </div>
</div>
