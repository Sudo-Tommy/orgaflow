<script lang="ts">
    import type { AppointmentRecord } from '$lib/types/orgaTypes';

    let {
        employeeAppointments = []
    }: {
        employeeAppointments: AppointmentRecord[];
    } = $props();
</script>

<div class="space-y-4">
    <div class="flex items-center justify-between">
        <p class="text-xs text-slate-500 font-medium">
            Alle diesem Mitarbeiter zugewiesenen Einsätze ({employeeAppointments.length})
        </p>
    </div>

    {#if employeeAppointments.length === 0}
        <div class="p-8 text-center text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            Derzeit sind keine Einsätze für diesen Mitarbeiter hinterlegt.
        </div>
    {:else}
        <div class="space-y-2.5">
            {#each employeeAppointments as appt (appt.id)}
                <div class="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-center justify-between gap-3">
                    <div class="min-w-0">
                        <p class="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {appt.description || 'Pflege- & Betreuungseinsatz'}
                        </p>
                        <p class="text-xs text-slate-500">
                            📅 {new Date(appt.appointment || '').toLocaleString('de-DE')}
                            {#if appt.location_address}
                                • 📍 {appt.location_address}
                            {/if}
                        </p>
                    </div>
                    <span class="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
                        Zugewiesen
                    </span>
                </div>
            {/each}
        </div>
    {/if}
</div>
