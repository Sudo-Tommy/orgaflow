<script lang="ts">
    import { MapPin, Mail, Phone } from "lucide-svelte";
    import type { ParsedRequestData } from "$lib/services/appointmentRequestHelper";

    interface Props {
        requestData: ParsedRequestData;
    }

    let { requestData }: Props = $props();
</script>

<div class="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
    <div class="flex items-center justify-between gap-2">
        <span class="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
            Absender / Anfrager
        </span>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
            <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {requestData.sender_name || 'Unbekannter Anfrager'}
            </h3>
            {#if requestData.street || requestData.zip_city}
                <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-1.5">
                    <MapPin class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{[requestData.street, requestData.zip_city].filter(Boolean).join(', ')}</span>
                </p>
            {/if}
        </div>

        <div class="flex items-center gap-2 flex-wrap">
            {#if requestData.email}
                <a
                    href="mailto:{requestData.email}"
                    class="min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/60 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs touch-manipulation"
                    title="E-Mail senden"
                >
                    <Mail class="w-4 h-4" />
                    <span class="truncate max-w-[150px]">{requestData.email}</span>
                </a>
            {/if}
            {#if requestData.phone}
                <a
                    href="tel:{requestData.phone}"
                    class="min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs touch-manipulation"
                    title="Anrufen"
                >
                    <Phone class="w-4 h-4" />
                    <span>{requestData.phone}</span>
                </a>
            {/if}
        </div>
    </div>
</div>
