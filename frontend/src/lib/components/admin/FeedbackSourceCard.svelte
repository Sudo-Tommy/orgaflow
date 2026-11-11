<script lang="ts">
    import { Star } from 'lucide-svelte';

    let {
        senderName = '',
        senderEmail = '',
        ratingScore = null,
        contextInfo = '',
        messageText = '',
        itemSource = 'feedback'
    }: {
        senderName: string;
        senderEmail: string;
        ratingScore: number | null;
        contextInfo: string;
        messageText: string;
        itemSource: string;
    } = $props();
</script>

<div class="bg-neutral-50/80 rounded-2xl p-4 sm:p-5 border border-neutral-200/80 space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/60 pb-3">
        <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-xl bg-white border border-neutral-200 text-neutral-700 flex items-center justify-center text-xs shadow-xs">
                👤
            </span>
            <div>
                <span class="text-xs font-bold text-neutral-900">{senderName}</span>
                {#if senderEmail}
                    <span class="text-[11px] text-neutral-400 font-mono ml-1.5">({senderEmail})</span>
                {/if}
            </div>
        </div>
        <div class="flex items-center gap-2">
            {#if ratingScore}
                <span class="text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 {ratingScore <= 5 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}">
                    <span>{ratingScore <= 5 ? '⚠️' : '⭐'}</span>
                    {ratingScore} / 10
                </span>
            {/if}
            <span class="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-neutral-200/70 text-neutral-700">
                {itemSource}
            </span>
        </div>
    </div>

    {#if contextInfo}
        <div class="text-[11px] text-neutral-500 font-medium flex items-center gap-1.5">
            <span>ℹ️</span>
            <span>{contextInfo}</span>
        </div>
    {/if}

    <div class="bg-white rounded-xl p-3.5 border border-neutral-200/80 text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed">
        {messageText}
    </div>
</div>
