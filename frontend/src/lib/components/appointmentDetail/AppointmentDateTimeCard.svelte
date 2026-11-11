<script lang="ts">
    import { Calendar, Clock, Edit3, Check, X, Timer } from "lucide-svelte";

    interface Props {
        appointment: any;
        onSave: (dateStr: string, startTime: string, endTime?: string) => Promise<boolean>;
    }

    let { appointment, onSave }: Props = $props();

    let isEditing = $state(false);
    let isSaving = $state(false);
    let editDate = $state("");
    let editStartTime = $state("");
    let editEndTime = $state("");

    function parseFromAppointment() {
        if (!appointment?.appointment) return;
        const d = new Date(appointment.appointment);
        if (isNaN(d.getTime())) return;
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        editDate = `${year}-${month}-${day}`;
        editStartTime = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

        const rawEnd = appointment.appointment_end || appointment.expand?.time_record?.[0]?.end;
        if (rawEnd) {
            const endD = new Date(rawEnd);
            if (!isNaN(endD.getTime())) {
                editEndTime = endD.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            }
        } else {
            editEndTime = "";
        }
    }

    $effect(() => {
        if (appointment && !isEditing) {
            parseFromAppointment();
        }
    });

    function applyDuration(minutes: number) {
        if (!editStartTime) editStartTime = "08:00";
        const [h, m] = editStartTime.split(':').map(Number);
        const total = h * 60 + m + minutes;
        const newH = Math.floor(total / 60) % 24;
        const newM = total % 60;
        editEndTime = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    }

    let durationText = $derived.by(() => {
        const start = isEditing ? editStartTime : (appointment?.appointment ? new Date(appointment.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '');
        const rawEnd = appointment?.appointment_end || appointment?.expand?.time_record?.[0]?.end;
        const end = isEditing ? editEndTime : (rawEnd ? new Date(rawEnd).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '');
        if (!start || !end) return null;
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
        let diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff < 0) diff += 24 * 60;
        if (diff <= 0) return null;
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        if (hours > 0 && mins > 0) return `${hours} Std. ${mins} Min.`;
        if (hours > 0) return `${hours} Std.`;
        return `${mins} Min.`;
    });

    async function handleSave() {
        if (!editDate) return;
        isSaving = true;
        const ok = await onSave(editDate, editStartTime, editEndTime);
        isSaving = false;
        if (ok) isEditing = false;
    }

    function cancelEdit() {
        parseFromAppointment();
        isEditing = false;
    }
</script>

<div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-indigo-200/80 dark:border-indigo-900/60 shadow-xs space-y-3.5">
    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                <Calendar class="w-4 h-4" />
            </span>
            <h3 class="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Terminzeit & Datum
            </h3>
        </div>
        {#if !isEditing}
            <button
                type="button"
                onclick={() => { parseFromAppointment(); isEditing = true; }}
                class="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
                <Edit3 class="w-3.5 h-3.5" />
                <span>Bearbeiten</span>
            </button>
        {/if}
    </div>

    {#if !isEditing}
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="space-y-1">
                <p class="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar class="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>{appointment?.appointment ? new Date(appointment.appointment).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : 'Kein Datum festgelegt'}</span>
                </p>
                <p class="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Clock class="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                        {appointment?.appointment ? new Date(appointment.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '--:--'} Uhr
                        {#if appointment?.appointment_end}
                            bis {new Date(appointment.appointment_end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                        {:else if appointment?.expand?.time_record?.[0]?.end}
                            bis {new Date(appointment.expand.time_record[0].end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                        {/if}
                    </span>
                </p>
            </div>
            {#if durationText}
                <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold self-start sm:self-auto shrink-0 shadow-2xs">
                    <Timer class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Dauer: {durationText}</span>
                </div>
            {/if}
        </div>
    {:else}
        <div class="space-y-3 pt-1">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                    <label for="dt-date" class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Datum *</label>
                    <input id="dt-date" type="date" bind:value={editDate} class="orga-input-clear min-h-11 py-2 text-xs font-semibold w-full" disabled={isSaving} />
                </div>
                <div>
                    <label for="dt-start" class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Startzeit *</label>
                    <input id="dt-start" type="time" bind:value={editStartTime} class="orga-input-clear min-h-11 py-2 text-xs font-semibold w-full" disabled={isSaving} />
                </div>
                <div>
                    <label for="dt-end" class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Endzeit</label>
                    <input id="dt-end" type="time" bind:value={editEndTime} class="orga-input-clear min-h-11 py-2 text-xs font-semibold w-full" disabled={isSaving} />
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 mr-1">Dauer:</span>
                {#each [30, 45, 60, 90, 120] as mins}
                    <button
                        type="button"
                        onclick={() => applyDuration(mins)}
                        class="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                    >
                        +{mins}m
                    </button>
                {/each}
                {#if durationText}
                    <span class="text-xs font-black text-emerald-600 dark:text-emerald-400 ml-auto">({durationText})</span>
                {/if}
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                    type="button"
                    onclick={cancelEdit}
                    class="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                    disabled={isSaving}
                >
                    Abbrechen
                </button>
                <button
                    type="button"
                    onclick={handleSave}
                    class="orga-button-primary px-4 py-1.5 text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                    disabled={isSaving || !editDate}
                >
                    <Check class="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Speichert...' : 'Speichern'}</span>
                </button>
            </div>
        </div>
    {/if}
</div>
