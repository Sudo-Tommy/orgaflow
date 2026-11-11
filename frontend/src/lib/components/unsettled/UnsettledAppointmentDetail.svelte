<script lang="ts">
    import { Clock, Check, FileText } from "lucide-svelte";

    interface Props {
        app: any;
        appHours: number;
        taskCount: number;
    }

    let { app, appHours, taskCount }: Props = $props();
</script>

<div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs flex flex-col gap-2.5 min-w-0">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 min-w-0">
        <div class="p-3 rounded-xl border min-w-0 {appHours === 0 ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200' : 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800 text-cyan-950 dark:text-cyan-200'}">
            <div class="flex items-center justify-between font-bold mb-1.5 pb-1 border-b border-current/10">
                <span class="flex items-center gap-1.5"><Clock class="w-3.5 h-3.5 shrink-0" /> Arbeitszeit:</span>
                <span class="text-[10px] uppercase font-black">{appHours > 0 ? `${appHours.toFixed(1)} Std.` : 'Fehlt'}</span>
            </div>
            {#if app.expand?.time_record && app.expand.time_record.length > 0}
                <ul class="space-y-1 text-[11px] min-w-0">
                    {#each app.expand.time_record as tr}
                        <li class="flex items-center justify-between gap-1 py-0.5">
                            <span class="font-medium">{new Date(tr.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – {tr.end ? new Date(tr.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Offen'} Uhr</span>
                            {#if tr.break_minutes}<span class="opacity-70 text-[10px] shrink-0">({tr.break_minutes} Min. Pause)</span>{/if}
                        </li>
                    {/each}
                </ul>
            {:else}
                <p class="text-[11px] opacity-80">Keine Zeit erfasst.</p>
            {/if}
        </div>

        <div class="p-3 rounded-xl border min-w-0 {taskCount === 0 ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-200' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'}">
            <div class="flex items-center justify-between font-bold mb-1.5 pb-1 border-b border-current/10">
                <span class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5 shrink-0" /> Leistungen:</span>
                <span class="text-[10px] uppercase font-black">{taskCount > 0 ? `${taskCount} erfasst` : 'Fehlt'}</span>
            </div>
            {#if app.expand?.tasks && app.expand.tasks.length > 0}
                <ul class="space-y-1 text-[11px] min-w-0">
                    {#each app.expand.tasks as t}
                        <li class="flex items-center gap-1.5 break-words py-0.5 font-medium">
                            <Check class="w-3 h-3 shrink-0 text-emerald-600" />
                            <span>{t.title || t.name || 'Leistung'}</span>
                        </li>
                    {/each}
                </ul>
            {:else}
                <p class="text-[11px] opacity-80">Keine Leistungen zugeordnet.</p>
            {/if}
        </div>
    </div>

    {#if app.report || app.notes || app.internal_notes}
        <div class="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 min-w-0">
            <span class="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1"><FileText class="w-3 h-3" /> Notizen:</span>
            <p class="text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words italic leading-relaxed">{app.report || app.notes || app.internal_notes}</p>
        </div>
    {/if}
</div>
