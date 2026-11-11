<script lang="ts">
    import { slide } from "svelte/transition";
    import { Clock, Play, Square, Edit3, Trash2 } from "lucide-svelte";
    import { formatMinutes, formatElapsed, getDuration } from "./appointmentRouteService";

    interface Props {
        timeRecords: any[];
        runningTimeRecord: any;
        elapsedSeconds: number;
        totalRecordedMinutes: number;
        isTimeLoading: boolean;
        isAssignedCaregiver?: boolean;
        onStartTracking: () => void;
        onStopTracking: (recordId: string) => void;
        onDeleteTime: (recordId: string) => void;
        onOpenTimeModal: (record?: any) => void;
    }

    let {
        timeRecords, runningTimeRecord, elapsedSeconds, totalRecordedMinutes, isTimeLoading,
        isAssignedCaregiver = false,
        onStartTracking, onStopTracking, onDeleteTime, onOpenTimeModal
    }: Props = $props();
</script>

<div class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-neutral-200/90 dark:border-slate-800 shadow-xs">
    <div class="flex items-center justify-between mb-4 border-b border-neutral-100 dark:border-slate-800 pb-2.5">
        <div class="flex items-center gap-2">
            <h3 class="text-xs font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Clock class="w-4 h-4 text-indigo-600" /> Zeiterfassung</h3>
            {#if totalRecordedMinutes > 0}<span class="px-2 py-0.5 text-xs font-black rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">{formatMinutes(totalRecordedMinutes)}</span>{/if}
        </div>
        <button type="button" onclick={() => onOpenTimeModal()} class="min-h-10 px-3 bg-neutral-100 dark:bg-slate-800 rounded-xl text-xs font-bold border border-neutral-200 dark:border-slate-700 cursor-pointer">+ Manuell</button>
    </div>

    {#if isAssignedCaregiver}
        {#if runningTimeRecord}
            <div transition:slide class="mb-5 bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-6 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-4 text-center sm:text-left w-full sm:w-auto">
                    <div class="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl shrink-0">⏱️</div>
                    <div class="min-w-0 flex-1">
                        <p class="text-xs font-bold uppercase text-emerald-100 flex items-center justify-center sm:justify-start gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-white animate-ping"></span> Live-Zeiterfassung aktiv</p>
                        <p class="text-3xl sm:text-4xl font-black font-mono tracking-tight mt-0.5">{formatElapsed(elapsedSeconds)}</p>
                        <p class="text-xs text-emerald-100 mt-0.5">Start: {new Date(runningTimeRecord.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                    </div>
                </div>
                <button type="button" onclick={() => onStopTracking(runningTimeRecord.id)} disabled={isTimeLoading} class="min-h-12 w-full sm:w-auto px-6 bg-white text-rose-600 font-black rounded-xl shadow-md flex items-center justify-center gap-2 text-sm shrink-0 cursor-pointer"><Square class="w-4 h-4 fill-current" /> Stoppen</button>
            </div>
        {:else}
            <div transition:slide class="mb-5 flex justify-center">
                <button type="button" onclick={onStartTracking} disabled={isTimeLoading} class="min-h-12 w-full sm:w-auto sm:px-8 text-sm sm:text-base font-black rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 cursor-pointer shadow-md"><Play class="w-5 h-5 fill-current" /> Zeiterfassung jetzt starten</button>
            </div>
        {/if}
    {:else if runningTimeRecord}
        <div transition:slide class="mb-5 p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 min-w-0">
                <span class="relative flex h-2.5 w-2.5 shrink-0">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span class="font-semibold text-slate-700 dark:text-slate-200 truncate">Zeiterfassung läuft aktuell durch den Betreuer</span>
            </div>
            <span class="text-[11px] text-slate-400 font-mono shrink-0">Start: {new Date(runningTimeRecord.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
        </div>
    {/if}

    {#if timeRecords.filter(r => r.start && r.end).length > 0}
        <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 pl-1">Erfasste Zeiten ({timeRecords.filter(r => r.start && r.end).length})</h4>
        <div class="space-y-2.5">
            {#each timeRecords.filter(r => r.start && r.end) as record (record.id)}
                <div class="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-slate-800 bg-neutral-50/80 dark:bg-slate-800/50 shadow-2xs">
                    <div class="flex items-center gap-2.5">
                        <span class="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
                        <div>
                            <p class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">{new Date(record.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – {new Date(record.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                            <p class="text-[11px] text-neutral-500">{new Date(record.start).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                        </div>
                    </div>
                    <div class="text-right flex items-center gap-2">
                        <span class="text-brand-800 dark:text-indigo-300 font-black text-xs bg-brand-100/70 dark:bg-indigo-950/60 px-2 py-1 rounded-lg border border-brand-200/50 dark:border-indigo-800">{getDuration(record.start, record.end)}</span>
                        <button type="button" onclick={() => onOpenTimeModal(record)} class="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-indigo-600 bg-white dark:bg-slate-800 rounded-lg border border-neutral-200 dark:border-slate-700 cursor-pointer" title="Bearbeiten"><Edit3 class="w-3.5 h-3.5" /></button>
                        <button type="button" onclick={() => onDeleteTime(record.id)} class="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-rose-600 bg-white dark:bg-slate-800 rounded-lg border border-neutral-200 dark:border-slate-700 cursor-pointer" title="Löschen"><Trash2 class="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            {/each}
        </div>
    {:else if !runningTimeRecord}
        <p class="text-center text-xs font-medium text-neutral-400 py-6 bg-neutral-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-neutral-200 dark:border-slate-700">Noch keine Zeiten für diesen Termin erfasst.</p>
    {/if}
</div>
