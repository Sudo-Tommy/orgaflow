<script lang="ts">
    import { 
        Calendar, Clock, Lock, Repeat, Mail, Plus, CheckCircle2, 
        Car, ListTodo, Banknote 
    } from "lucide-svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";

    let {
        appointments = [],
        onNewAppointment,
        onSendReminders,
        onOpenDetail
    } = $props<{
        appointments: any[];
        onNewAppointment: () => void;
        onSendReminders: () => void;
        onOpenDetail: (appId: string) => void;
    }>();
</script>

<div class="bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col border-l-4 border-l-indigo-500">
    <div class="p-5 sm:p-6 border-b border-neutral-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50 dark:bg-slate-800/40">
        <h3 class="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2.5">
            <span class="w-9 h-9 flex items-center justify-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20 shadow-xs">
                <Calendar class="w-4 h-4" />
            </span>
            <span>Termine</span>
            {#if appointments.length > 0}
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {appointments.length}
                </span>
            {/if}
        </h3>
        <div class="flex items-center gap-2 shrink-0">
            <button onclick={onSendReminders} aria-label="Termine bestätigen" title="Terminübersicht versenden" class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors shadow-xs cursor-pointer min-h-[44px] min-w-[44px]">
                <Mail class="w-4 h-4" />
            </button>
            <button onclick={onNewAppointment} aria-label="Termin hinzufügen" title="Neuer Termin" class="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer min-h-[44px] min-w-[44px]">
                <Plus class="w-4 h-4" />
            </button>
        </div>
    </div>
    <div class="flex-1">
        {#if appointments.length === 0}
            <div class="text-center py-10 px-6">
                <Calendar class="w-10 h-10 text-neutral-300 dark:text-slate-600 mx-auto mb-2" />
                <p class="text-neutral-400 dark:text-slate-500 text-sm mb-3">Keine anstehenden Termine.</p>
                <button onclick={onNewAppointment} class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 text-sm font-bold transition-colors cursor-pointer min-h-[44px]">Jetzt planen &rarr;</button>
            </div>
        {:else}
        <div class="divide-y divide-neutral-100 dark:divide-slate-800">
            {#each appointments as app}
            {@const isCancelled = app.status === 'abgesagt'}
            <button type="button" onclick={() => onOpenDetail(app.id)} class="w-full text-left group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer min-h-[44px] {isCancelled ? 'opacity-60 bg-slate-100/50 dark:bg-slate-900/40' : ''}">
                <div class="flex items-start gap-3 min-w-0 flex-1">
                    <div class="w-2.5 h-2.5 mt-1.5 rounded-full {isCancelled ? 'bg-rose-400 ring-4 ring-rose-400/20' : (app.settled ? 'bg-emerald-400 ring-4 ring-emerald-400/20' : 'bg-amber-400 ring-4 ring-amber-400/20')} group-hover:scale-125 transition-transform shrink-0"></div>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-bold leading-snug truncate transition-colors {isCancelled ? 'line-through text-slate-400 dark:text-slate-500' : 'text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}">{app.description || 'Termin ohne Beschreibung'}</p>
                        {#if isCancelled && app.cancellation_reason}
                            <p class="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-1 truncate" title="Ausfallgrund: {app.cancellation_reason}">
                                <span class="shrink-0">⚠️</span>
                                <span class="truncate">Ausfallgrund: {app.cancellation_reason}</span>
                            </p>
                        {/if}
                        
                        <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-500 dark:text-slate-400 mt-1.5">
                            <div class="flex items-center gap-1.5 font-medium">
                                <Clock class="w-3.5 h-3.5 text-neutral-400 dark:text-slate-500" />
                                {#if app.appointment}
                                {new Date(app.appointment).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                {:else}
                                Kein Datum
                                {/if}
                            </div>
                            
                            {#if app.is_private}
                            <div class="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                                <Lock class="w-3 h-3" /> Privat
                            </div>
                            {/if}
                            {#if app.is_series}
                            <div class="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                                <Repeat class="w-3 h-3" /> Serie
                            </div>
                            {/if}
                        </div>

                        {#if app.expand?.time_record || app.expand?.drive_record || app.expand?.tasks || app.expand?.expenditures}
                        <div class="flex gap-1.5 mt-2 flex-wrap">
                            {#if app.expand?.time_record}
                            <span class="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                                <Clock class="w-3 h-3" /> Zeit
                            </span>
                            {/if}
                            {#if app.expand?.drive_record}
                            <span class="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                                <Car class="w-3 h-3" /> Fahrt
                            </span>
                            {/if}
                            {#if app.expand?.tasks}
                            <span class="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                                <ListTodo class="w-3 h-3" /> Tasks
                            </span>
                            {/if}
                            {#if app.expand?.expenditures && rbacService.canAccessFinances}
                            <span class="text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                                <Banknote class="w-3 h-3" /> Ausgaben
                            </span>
                            {/if}
                        </div>
                        {/if}
                    </div>
                </div>
                
                {#if isCancelled}
                    <div class="shrink-0 self-start sm:self-center pl-5 sm:pl-0">
                        <span class="text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                            🚫 Abgesagt
                        </span>
                    </div>
                {:else if app.settled && rbacService.canAccessFinances}
                    <div class="shrink-0 self-start sm:self-center pl-5 sm:pl-0">
                        <span class="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <CheckCircle2 class="w-3 h-3" /> Abgerechnet
                        </span>
                    </div>
                {/if}
            </button>
            {/each}
        </div>
        {/if}
    </div>
</div>
