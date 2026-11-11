<script lang="ts">
    import { Calendar, Clock, Edit3 } from "lucide-svelte";

    interface Props {
        appointment: any;
        onSaveDateTime: (dateStr: string, startTime: string, endTime?: string) => Promise<boolean>;
    }

    let { appointment, onSaveDateTime }: Props = $props();

    let isEditingTime = $state(false);
    let editDate = $state("");
    let editStartTime = $state("");
    let editEndTime = $state("");
    let isSavingTime = $state(false);

    function initTimeValues() {
        if (!appointment?.appointment) return;
        const d = new Date(appointment.appointment);
        if (isNaN(d.getTime())) return;
        editDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        editStartTime = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const rawEnd = appointment?.appointment_end || appointment?.expand?.time_record?.[0]?.end;
        const endD = rawEnd ? new Date(rawEnd) : null;
        editEndTime = (endD && !isNaN(endD.getTime())) ? endD.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : "";
    }

    $effect(() => {
        if (appointment && !isEditingTime) initTimeValues();
    });

    let formattedDate = $derived(appointment?.appointment ? new Date(appointment.appointment).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Kein Datum');
    let formattedTime = $derived(appointment?.appointment ? new Date(appointment.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr' : '');
    let durationMinutes = $derived.by(() => {
        const start = appointment?.appointment ? new Date(appointment.appointment) : null;
        const rawEnd = appointment?.appointment_end || appointment?.expand?.time_record?.[0]?.end;
        const end = rawEnd ? new Date(rawEnd) : null;
        if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    });

    function applyDuration(minutes: number) {
        if (!editStartTime) editStartTime = "08:00";
        const [h, m] = editStartTime.split(':').map(Number);
        const total = h * 60 + m + minutes;
        editEndTime = `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    }

    async function handleSaveTime() {
        if (!editDate || !editStartTime) return;
        isSavingTime = true;
        const ok = await onSaveDateTime(editDate, editStartTime, editEndTime || undefined);
        isSavingTime = false;
        if (ok) isEditingTime = false;
    }
</script>

<div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between">
    <div class="flex items-center justify-between mb-1.5">
        <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Terminzeit
        </span>
        {#if !isEditingTime}
            <button type="button" onclick={() => { initTimeValues(); isEditingTime = true; }} class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer">
                <Edit3 class="w-3 h-3" /> Ändern
            </button>
        {/if}
    </div>
    {#if isEditingTime}
        <div class="space-y-2 pt-1">
            <div class="grid grid-cols-3 gap-1.5">
                <input type="date" bind:value={editDate} class="col-span-3 text-xs p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" />
                <input type="time" bind:value={editStartTime} class="text-xs p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" />
                <span class="text-center text-xs self-center text-slate-400">bis</span>
                <input type="time" bind:value={editEndTime} class="text-xs p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" />
            </div>
            <div class="flex items-center gap-1 flex-wrap">
                {#each [30, 60, 90, 120] as m}
                    <button type="button" onclick={() => applyDuration(m)} class="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-300">+{m < 60 ? `${m}m` : `${m/60}h`}</button>
                {/each}
            </div>
            <div class="flex justify-end gap-1.5 pt-1">
                <button type="button" onclick={() => isEditingTime = false} class="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-lg">Abbrechen</button>
                <button type="button" onclick={handleSaveTime} disabled={isSavingTime} class="px-3 py-1 text-xs font-bold text-white bg-indigo-600 rounded-lg">{isSavingTime ? '...' : 'Speichern'}</button>
            </div>
        </div>
    {:else}
        <div class="flex items-baseline justify-between gap-2 mt-1">
            <div>
                <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">{formattedDate}</p>
                <p class="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                    <Clock class="w-3 h-3 text-slate-400" /> {formattedTime}
                    {#if editEndTime}bis {editEndTime} Uhr{/if}
                </p>
            </div>
            {#if durationMinutes > 0}
                <span class="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black border border-emerald-300 dark:border-emerald-800 shrink-0">
                    {Math.floor(durationMinutes / 60)}h {durationMinutes % 60 ? `${durationMinutes % 60}m` : ''}
                </span>
            {/if}
        </div>
    {/if}
</div>
