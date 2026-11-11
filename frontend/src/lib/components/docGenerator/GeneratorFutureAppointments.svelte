<script lang="ts">
    interface Props {
        futureAppointments: any[];
        selectedFutureAppIds: string[];
        includeFutureApps: boolean;
        isEmailSending: boolean;
        emailSuccessMsg: string;
        onToggleApp: (id: string) => void;
    }

    let { 
        futureAppointments, 
        selectedFutureAppIds, 
        includeFutureApps = $bindable(), 
        isEmailSending, 
        emailSuccessMsg, 
        onToggleApp 
    }: Props = $props();
</script>

{#if futureAppointments.length > 0}
    <div>
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-neutral-900 dark:text-slate-100 flex items-center gap-2">
                <span>📅</span> Folgetermine
            </h3>
            <label class="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-slate-300 cursor-pointer">
                <input 
                    type="checkbox" 
                    bind:checked={includeFutureApps} 
                    class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer" 
                    disabled={isEmailSending || !!emailSuccessMsg} 
                />
                Anhängen
            </label>
        </div>
        
        {#if includeFutureApps}
            <div class="space-y-2 p-1">
                {#each futureAppointments as app}
                    <label class="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                        <input 
                            type="checkbox" 
                            checked={selectedFutureAppIds.includes(app.id)} 
                            onchange={() => onToggleApp(app.id)} 
                            class="w-5 h-5 mt-0.5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer" 
                            disabled={isEmailSending || !!emailSuccessMsg} 
                        />
                        <div class="min-w-0 flex-1">
                            <p class="text-sm font-bold text-neutral-900 dark:text-slate-100">
                                {new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                            </p>
                            <p class="text-xs text-neutral-500 dark:text-slate-400 truncate">{app.description || 'Termin'}</p>
                        </div>
                    </label>
                {/each}
            </div>
        {/if}
    </div>
{/if}
