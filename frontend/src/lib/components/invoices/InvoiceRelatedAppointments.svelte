<script lang="ts">
    import { Calendar, Edit } from "lucide-svelte";

    interface Props {
        appointments?: any[];
        onSelectAppointment: (id: string) => void;
    }

    let { appointments = [], onSelectAppointment }: Props = $props();

    function formatAppointmentDate(dateStr: string | undefined) {
        if (!dateStr) return 'Datum unbekannt';
        return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function formatTime(dateStr: string | undefined) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
</script>

<div class="orga-card-white p-4 sm:p-6">
    <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <Calendar class="w-5 h-5 text-slate-400 dark:text-slate-500" />
        Zugehörige Termine
    </h3>
    {#if appointments.length === 0}
        <div class="text-center py-8 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Für diese Rechnung wurden keine Termine verknüpft.</p>
        </div>
    {:else}
        <div class="space-y-3">
            {#each appointments as app (app.id)}
                <div class="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-violet-300 dark:hover:border-violet-700 transition-all shadow-sm group">
                    <div class="min-w-0">
                        <p class="text-xs font-bold text-violet-600 dark:text-violet-400">
                            {formatAppointmentDate(app.appointment)} - {formatTime(app.appointment)} Uhr
                        </p>
                        <p class="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                            {app.description?.replace('[BLOCK]', '').trim() || 'Termin ohne Beschreibung'}
                        </p>
                    </div>
                    <button 
                        type="button"
                        onclick={() => onSelectAppointment(app.id)} 
                        class="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/50 rounded-lg transition-all active:scale-95 touch-manipulation cursor-pointer" 
                        title="Termin-Details ansehen"
                        aria-label="Termin-Details ansehen"
                    >
                        <Edit class="w-4 h-4" />
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</div>
