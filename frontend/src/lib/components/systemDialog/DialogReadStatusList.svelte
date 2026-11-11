<!-- src/lib/components/systemDialog/DialogReadStatusList.svelte -->
<!-- Zeigt pro Mitteilung, welcher Empfänger sie geöffnet, bestätigt oder beantwortet hat -->
<script lang="ts">
    import type { SystemDialogRecord } from "$lib/services/systemDialogTypes";
    import { Eye, CheckCheck, MessageSquare, Clock, Users } from "lucide-svelte";

    let { dialog, userNames }: { dialog: SystemDialogRecord; userNames: Record<string, string> } = $props();

    function fmt(iso?: string) {
        return iso ? new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' Uhr' : '';
    }

    let parsedStatus = $derived.by<Record<string, any>>(() => {
        if (!dialog.read_status) return {};
        if (typeof dialog.read_status === 'string') {
            try { return JSON.parse(dialog.read_status); } catch { return {}; }
        }
        return typeof dialog.read_status === 'object' ? dialog.read_status : {};
    });

    let recipientsList = $derived.by<string[]>(() => {
        if (!dialog.recipients) return [];
        if (Array.isArray(dialog.recipients)) return dialog.recipients;
        if (typeof dialog.recipients === 'string') {
            try {
                const parsed = JSON.parse(dialog.recipients);
                return Array.isArray(parsed) ? parsed : [dialog.recipients];
            } catch {
                return [dialog.recipients];
            }
        }
        return [];
    });

    let rows = $derived.by(() => {
        const rs = parsedStatus;
        let baseIds: string[] = [];
        if (dialog.is_broadcast && Object.keys(userNames).length > 0) {
            baseIds = Object.keys(userNames);
        } else {
            baseIds = [...recipientsList, ...Object.keys(rs)];
        }
        const ids = new Set<string>(baseIds);
        if (dialog.sender) ids.delete(dialog.sender);

        return [...ids].map(id => {
            const s = rs[id] || {};
            const state = s.reply_text ? 'reply' : s.confirmed_at ? 'confirmed' : s.first_viewed_at ? 'viewed' : 'unread';
            return { id, name: userNames[id] || `Mitarbeiter (${id.slice(0, 5)})`, s, state };
        }).sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));
    });

    let confirmedCount = $derived(rows.filter(r => r.state === 'confirmed' || r.state === 'reply').length);
    let isExpanded = $state(true);
</script>

<div class="mt-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 p-3 space-y-2">
    <div class="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
        <span class="flex items-center gap-1.5">
            <Users class="w-3.5 h-3.5 text-indigo-500" />
            <span>Gelesen &amp; bestätigt: {confirmedCount} von {rows.length}{dialog.is_broadcast ? ' (an alle)' : ''}</span>
        </span>
        {#if rows.length > 0}
            <button type="button" onclick={() => (isExpanded = !isExpanded)} class="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                {isExpanded ? 'Einklappen' : 'Details anzeigen'}
            </button>
        {/if}
    </div>

    {#if isExpanded}
        {#if rows.length === 0}
            <p class="text-[11px] text-slate-400 italic">Noch keine Empfängerdaten vorhanden.</p>
        {:else}
            <div class="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                {#each rows as r (r.id)}
                    <div class="flex items-center justify-between gap-2 text-xs py-0.5">
                        <div class="flex items-center gap-1.5 min-w-0">
                            {#if r.state === 'reply'}
                                <MessageSquare class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            {:else if r.state === 'confirmed'}
                                <CheckCheck class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            {:else if r.state === 'viewed'}
                                <Eye class="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            {:else}
                                <Clock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {/if}
                            <span class="font-bold text-slate-800 dark:text-slate-200 truncate">{r.name}</span>
                            <span class="text-[11px] truncate {r.state === 'unread' ? 'text-slate-400' : r.state === 'viewed' ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-emerald-700 dark:text-emerald-400 font-semibold'}">
                                {#if r.state === 'reply'}„{r.s.reply_text}“
                                {:else if r.state === 'confirmed'}Gelesen &amp; bestätigt
                                {:else if r.state === 'viewed'}Geöffnet, noch nicht bestätigt
                                {:else}Noch nicht geöffnet{/if}
                            </span>
                        </div>
                        <span class="text-[10px] text-slate-400 font-mono shrink-0">{fmt(r.s.reply_at || r.s.confirmed_at || r.s.first_viewed_at)}</span>
                    </div>
                {/each}
            </div>
        {/if}
    {/if}
</div>
