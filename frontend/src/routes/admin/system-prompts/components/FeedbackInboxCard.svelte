<script lang="ts">
    import { Lightbulb, Sparkles } from 'lucide-svelte';
    import type { UnifiedInboxItem } from '../types';
    import { formatDate } from '../types';

    let {
        item,
        onUpdateStatus,
        onConvertToProposal,
        onCreatePrompt
    }: {
        item: UnifiedInboxItem;
        onUpdateStatus: (item: UnifiedInboxItem, newStatus: string) => Promise<void>;
        onConvertToProposal: (item: UnifiedInboxItem) => void;
        onCreatePrompt: (item: UnifiedInboxItem) => void;
    } = $props();
</script>

<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3">
    <div class="space-y-2.5">
        <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold border {
                    item.source === 'feedback' 
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
                        : item.source === 'chat'
                        ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                        : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                }">
                    {item.source === 'feedback' ? '⭐ Feedback' : item.source === 'chat' ? '💬 Chat-Anfrage' : '📬 Support-Anfrage'}
                </span>
                {#if item.rating !== null}
                    <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold border {item.rating <= 5 ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'}">
                        {item.rating} / 10
                    </span>
                {/if}
                <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold {item.status === 'Neu' || item.status === 'new' ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200' : item.status === 'In Bearbeitung' || item.status === 'in_progress' ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200' : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'}">
                    {item.status}
                </span>
            </div>
            <span class="text-[11px] text-slate-400 whitespace-nowrap">
                {formatDate(item.date)}
            </span>
        </div>

        <div>
            <h4 class="text-sm font-bold text-slate-900 dark:text-white">
                {item.sender}
                {#if item.email}
                    <span class="text-xs font-normal text-slate-400 font-mono ml-1">({item.email})</span>
                {/if}
            </h4>
            {#if item.context}
                <p class="text-[11px] text-slate-400 mt-0.5 font-medium">{item.context}</p>
            {/if}
        </div>

        <div class="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
            <p class="text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">
                "{item.message}"
            </p>
        </div>
    </div>

    <!-- Footer Actions -->
    <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 mt-1">
        <div class="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 gap-0.5">
            <button
                type="button"
                onclick={() => onUpdateStatus(item, 'Neu')}
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer {
                    (item.status === 'Neu' || item.status === 'new')
                        ? 'bg-amber-500 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }"
            >
                Neu
            </button>
            <button
                type="button"
                onclick={() => onUpdateStatus(item, 'In Bearbeitung')}
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer {
                    (item.status === 'In Bearbeitung' || item.status === 'in_progress' || item.status === 'Gelesen')
                        ? 'bg-indigo-600 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }"
            >
                In Arbeit
            </button>
            <button
                type="button"
                onclick={() => onUpdateStatus(item, 'Gelöst')}
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer {
                    (item.status === 'Gelöst' || item.status === 'resolved' || item.status === 'Archiviert' || item.status === 'Archieviert' || item.status === 'converted')
                        ? 'bg-emerald-600 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }"
            >
                ✓ Gelöst
            </button>
        </div>

        <div class="flex items-center gap-1.5">
            <button
                type="button"
                onclick={() => onConvertToProposal(item)}
                class="py-1.5 px-2.5 text-xs text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-1 cursor-pointer font-bold"
                title="Als Verbesserungsvorschlag erfassen"
            >
                <Lightbulb class="w-3.5 h-3.5 text-amber-500" />
                <span class="hidden sm:inline">Als Vorschlag</span>
            </button>

            <button
                type="button"
                onclick={() => onCreatePrompt(item)}
                class="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-600/30 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
            >
                <Sparkles class="w-3.5 h-3.5 text-amber-300" />
                <span>Prompt erstellen</span>
            </button>
        </div>
    </div>
</div>
