<!-- src/lib/components/support/ChatMessageList.svelte -->
<script lang="ts">
    import { goto } from '$app/navigation';
    import { triggerHaptic } from '$lib/services/hapticFeedback';
    import { liveSessionStore } from '$lib/services/aiLiveSupportService';
    import type { StoredOmniMessage } from '$lib/services/omniChatStorageService';
    import { formatChatMessageDate, formatChatMessageTime, dedupeOmniMessages } from '$lib/services/omniChatStorageService';
    import omniAvatar from '$lib/assets/omni_avatar.jfif';
    import { RefreshCw, ThumbsUp, ThumbsDown, Volume2, ArrowRight, FileText, ChevronUp } from 'lucide-svelte';

    interface Props {
        messages: StoredOmniMessage[];
        isLoading: boolean;
        currentRoute?: string;
        hasMore?: boolean;
        isLoadingMore?: boolean;
        onQuickAction: (text: string) => void;
        onSpeak: (text: string) => void;
        onCloseModal: () => void;
        onRate?: (messageId: string, rating: 'up' | 'down') => void;
        onLoadMore?: () => void;
        onRetry?: () => void;
    }

    let {
        messages,
        isLoading,
        currentRoute = '/dashboard',
        hasMore = false,
        isLoadingMore = false,
        onQuickAction,
        onSpeak,
        onCloseModal,
        onRate,
        onLoadMore,
        onRetry
    }: Props = $props();

    let chatContainer = $state<HTMLDivElement | null>(null);
    let uniqueMessages = $derived(dedupeOmniMessages(messages));
    let hasActiveStreamBubble = $derived(uniqueMessages.some(m => m.isStreaming));

    export function scrollDown() {
        if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function isDifferentDay(currentDateStr: string, prevDateStr?: string): boolean {
        if (!prevDateStr) return true;
        return new Date(currentDateStr).toDateString() !== new Date(prevDateStr).toDateString();
    }

    function resolveActionLink(link: any): { label: string; href: string } | null {
        if (!link) return null;
        if (typeof link === 'string') {
            try { return JSON.parse(link); } catch { return null; }
        }
        if (typeof link === 'object' && link.href && link.label) return link;
        return null;
    }

    function cleanDisplayMessage(text: string, role: string): string {
        if (role !== 'assistant' || !text) return text;
        return text
            .replace(/\[TICKET_BEREIT\]/gi, '')
            .replace(/Habe ich (das Problem|dein Anliegen|das so|dich) richtig verstanden\s*\??/gi, '')
            .replace(/Hab ich (das Problem|dein Anliegen|das) richtig verstanden\s*\??/gi, '')
            .replace(/^(Moini|Moin|Hallo|Guten (Morgen|Tag|Abend)|Hi|Hey|Servus|Grüß Gott|Na klar|Sehr gerne|Gerne|Alles klar|Herzlich willkommen)[!,\.\s-]*/i, '')
            .replace(/^(ich bin omni[,\.\s!]*)/i, '')
            .trim();
    }

    let explainButtonConfig = $derived.by(() => {
        const r = (currentRoute || '').toLowerCase();
        if (r.includes('clients')) return { label: '📖 Klienten erklären', prompt: 'Erkläre mir bitte die Funktionen im Modul Klienten' };
        if (r.includes('appointment')) return { label: '📖 Termine erklären', prompt: 'Erkläre mir bitte die Funktionen im Modul Termine & Zeiterfassung' };
        if (r.includes('invoice')) return { label: '📖 Rechnungen erklären', prompt: 'Erkläre mir bitte die Funktionen im Modul Rechnungen & Finanzen' };
        if (r.includes('documents')) return { label: '📖 Vorlagen erklären', prompt: 'Erkläre mir bitte die Funktionen für Dokumente & Vorlagen' };
        if (r.includes('contacts')) return { label: '📖 Kontakte erklären', prompt: 'Erkläre mir bitte die Funktionen im Modul Kontakte' };
        if (r.includes('bwa') || r.includes('finance')) return { label: '📖 Finanzen erklären', prompt: 'Erkläre mir bitte die Finanzfunktionen' };
        return { label: '📖 Dashboard erklären', prompt: 'Erkläre mir bitte die Funktionen auf dieser Seite' };
    });
</script>

<div bind:this={chatContainer} class="flex-1 overflow-y-auto space-y-3 p-3 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 min-h-[220px]">
    {#if hasMore && onLoadMore}
        <div class="flex justify-center pb-2">
            <button
                type="button"
                onclick={onLoadMore}
                disabled={isLoadingMore}
                class="px-3 py-1.5 rounded-full text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
                {#if isLoadingMore}
                    <RefreshCw class="w-3 h-3 animate-spin text-indigo-500" />
                    <span>Lade frühere Nachrichten...</span>
                {:else}
                    <ChevronUp class="w-3.5 h-3.5" />
                    <span>Frühere Nachrichten anzeigen</span>
                {/if}
            </button>
        </div>
    {/if}

    {#each uniqueMessages as m, i (m.id)}
        {#if isDifferentDay(m.created, uniqueMessages[i - 1]?.created)}
            <div class="flex items-center justify-center my-3">
                <span class="px-3 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/70 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 border border-slate-300/40 dark:border-slate-700/50">
                    {formatChatMessageDate(m.created)}
                </span>
            </div>
        {/if}

        <div class="flex flex-col {m.role === 'user' ? 'items-end' : 'items-start'}">
            <div class="flex items-start gap-2 max-w-[90%] {m.role === 'user' ? 'flex-row-reverse' : ''}">
                {#if m.role === 'assistant'}
                    <img src={omniAvatar} alt="Omni" class="w-7 h-7 rounded-xl object-cover border border-indigo-200 dark:border-indigo-800 shrink-0 mt-0.5 shadow-2xs" />
                {/if}
                <div class="space-y-1 min-w-0 flex flex-col {m.role === 'user' ? 'items-end' : 'items-start'}">
                    <div class="rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed shadow-2xs {m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-xs' : m.isLiveError ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 rounded-tl-xs' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'}">
                        <span class="whitespace-pre-line">{cleanDisplayMessage(m.text, m.role)}</span>
                        {#if m.isStreaming}
                            <span class="inline-block w-1.5 h-3.5 ml-1 align-middle bg-indigo-500 animate-pulse rounded-xs"></span>
                        {/if}

                        {#if m.attachments && m.attachments.length > 0}
                            <div class="mt-2 pt-2 border-t border-white/20 dark:border-slate-700/60 flex items-center gap-1.5 flex-wrap">
                                {#each m.attachments as att (att.id)}
                                    <a
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/20 hover:bg-white/30 dark:bg-slate-700 dark:hover:bg-slate-600 text-white dark:text-slate-200 transition-colors"
                                    >
                                        <FileText class="w-3 h-3" />
                                        <span class="truncate max-w-[120px]">{att.name}</span>
                                    </a>
                                {/each}
                            </div>
                        {/if}
                    </div>

                    {#if m.isLiveError && onRetry}
                        <button
                            type="button"
                            onclick={onRetry}
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer transition-all mt-1"
                        >
                            <RefreshCw class="w-3 h-3" />
                            <span>Erneut über Live-API senden</span>
                        </button>
                    {/if}

                    <span class="text-[10px] text-slate-400 px-1 select-none">
                        {formatChatMessageTime(m.created)}
                    </span>

                    {#if resolveActionLink(m.actionLink)}
                        {@const link = resolveActionLink(m.actionLink)!}
                        <button
                            type="button"
                            onclick={() => { onCloseModal(); goto(link.href); }}
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs cursor-pointer active:scale-95 transition-all mt-1"
                        >
                            <span>{link.label}</span>
                            <ArrowRight class="w-3.5 h-3.5" />
                        </button>
                    {/if}

                    {#if m.role === 'assistant' && !m.id.startsWith('welcome-') && !m.isStreaming && !m.isLiveError}
                        <div class="flex items-center gap-2 pt-0.5 px-1 text-[11px] text-slate-400">
                            <button type="button" onclick={() => onSpeak(m.text)} class="hover:text-indigo-600 cursor-pointer" title="Antwort vorlesen">
                                <Volume2 class="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onclick={() => { triggerHaptic('tap'); onRate?.(m.id, 'up'); }}
                                class="hover:text-emerald-600 cursor-pointer {m.rating === 'up' ? 'text-emerald-600 font-bold' : ''}"
                                title="Hilfreich"
                            >
                                <ThumbsUp class="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onclick={() => { triggerHaptic('tap'); onRate?.(m.id, 'down'); }}
                                class="hover:text-rose-600 cursor-pointer {m.rating === 'down' ? 'text-rose-600 font-bold' : ''}"
                                title="Nicht hilfreich"
                            >
                                <ThumbsDown class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    {/each}

    {#if isLoading && !hasActiveStreamBubble}
        <div class="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 pl-9">
            <RefreshCw class="w-3.5 h-3.5 animate-spin text-indigo-500" />
            <span>{$liveSessionStore.statusText || 'Omni analysiert live...'}</span>
        </div>
    {/if}

    {#if !isLoading}
        <div class="flex items-center gap-2 pt-2 pb-1 flex-wrap pl-9">
            <button
                type="button"
                onclick={() => onQuickAction(explainButtonConfig.prompt)}
                class="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 transition-all cursor-pointer shadow-2xs"
            >
                {explainButtonConfig.label}
            </button>
            <button
                type="button"
                onclick={() => onQuickAction('Ich habe ein technisches Problem oder einen Fehler')}
                class="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 transition-all cursor-pointer shadow-2xs"
            >
                🚨 Problem melden
            </button>
        </div>
    {/if}
</div>
