<script lang="ts">
    import type { AppointmentMessageType } from "./multiAppointmentReminderHelper";

    interface Props {
        availableAppointments: any[];
        selectedAppointmentIds: string[];
        onToggle: (id: string) => void;
        messageType?: AppointmentMessageType;
    }

    let { availableAppointments, selectedAppointmentIds, onToggle, messageType = 'reminder' }: Props = $props();

    const title = $derived(
        messageType === 'report' ? 'Termine für den Besuchsbericht' :
        messageType === 'change' ? 'Betroffene Termine für die Änderung' :
        messageType === 'info' ? 'Termine für die Information wählen' :
        'Zu bestätigende Termine wählen'
    );
</script>

<div class="p-3.5 bg-neutral-50 dark:bg-slate-800/60 border border-neutral-200 dark:border-slate-700 rounded-2xl">
    <div class="flex items-center justify-between mb-2">
        <h3 class="font-bold text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm">{title}</h3>
        <span class="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            {selectedAppointmentIds.length} von {availableAppointments.length} gewählt
        </span>
    </div>

    {#if availableAppointments.length === 0}
        <p class="text-xs text-neutral-500 dark:text-neutral-400 italic py-1">Keine Termine zur Auswahl gefunden.</p>
    {:else}
        <div class="flex flex-col gap-2">
            {#each availableAppointments as app}
                {@const isSelected = selectedAppointmentIds.includes(app.id)}
                <label class="flex items-center gap-3 p-2.5 sm:p-3 bg-white dark:bg-slate-900 rounded-xl border transition-colors cursor-pointer {isSelected ? 'border-brand-500 dark:border-brand-500 ring-1 ring-brand-500/20 shadow-sm' : 'border-neutral-200 dark:border-slate-700/80 hover:border-neutral-300 dark:hover:border-slate-600'}">
                    <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onchange={() => onToggle(app.id)} 
                        class="text-brand-600 rounded border-neutral-300 dark:border-slate-600 focus:ring-brand-500 w-4 h-4 cursor-pointer" 
                    />
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-2">
                            <p class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                                {new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                            </p>
                            {#if app.report && messageType === 'report'}
                                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    Bericht vorhanden
                                </span>
                            {/if}
                        </div>
                        <p class="text-xs text-neutral-500 dark:text-neutral-400 truncate">{app.description || 'Termin'}</p>
                    </div>
                </label>
            {/each}
        </div>
    {/if}
</div>
