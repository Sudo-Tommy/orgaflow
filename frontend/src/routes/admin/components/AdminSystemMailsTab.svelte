<script lang="ts">
    let {
        systemMails = []
    }: {
        systemMails: any[];
    } = $props();
</script>

<div class="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden animate-enter">
    <div class="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
            <h3 class="font-bold text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                <span>🤖</span>
                <span>Automatisch generierte System-E-Mails</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Vollständiges Protokoll aller vom System versandten Benachrichtigungen, Mahnungen und Berichte.
            </p>
        </div>
        <div class="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-xl w-fit">
            {systemMails.length} Protokoll-Einträge
        </div>
    </div>

    <div>
        <table class="w-full text-left border-collapse">
            <thead class="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
                <tr>
                    <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Datum / Uhrzeit</th>
                    <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Empfänger</th>
                    <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Betreff</th>
                    <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider text-center">Klient</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                {#if systemMails.length === 0}
                    <tr>
                        <td colspan="4" class="p-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                            Keine System-E-Mails im Protokoll gefunden.
                        </td>
                    </tr>
                {/if}
                {#each systemMails as mail}
                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td class="p-3.5 sm:p-4 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
                            {mail.date ? new Date(mail.date).toLocaleString('de-DE') : '-'}
                        </td>
                        <td class="p-3.5 sm:p-4 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                            {mail.to_address}
                        </td>
                        <td class="p-3.5 sm:p-4 text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium truncate max-w-xs" title={mail.subject}>
                            {mail.subject}
                        </td>
                        <td class="p-3.5 sm:p-4 text-center">
                            {#if mail.expand?.client}
                                {@const c = Array.isArray(mail.expand.client) ? mail.expand.client[0] : mail.expand.client}
                                <span class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-lg whitespace-nowrap">
                                    {c.name_first} {c.name_last}
                                </span>
                            {:else}
                                <span class="text-slate-400 dark:text-slate-600">-</span>
                            {/if}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
