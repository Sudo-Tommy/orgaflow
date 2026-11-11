<script lang="ts">
    import { autoGrow } from "$lib/actions/autoGrow";

    interface Props {
        linkedAppointments: any[];
        includeReports: boolean;
        isEmailSending: boolean;
        emailSuccessMsg: string;
        onSaveReport: (id: string, text: string) => void;
    }

    let { 
        linkedAppointments = $bindable(), 
        includeReports = $bindable(), 
        isEmailSending, 
        emailSuccessMsg, 
        onSaveReport 
    }: Props = $props();
</script>

{#if linkedAppointments.length > 0}
    <div>
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-neutral-900 dark:text-slate-100 flex items-center gap-2">
                <span>📝</span> Besuchsberichte
            </h3>
            <label class="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-slate-300 cursor-pointer">
                <input 
                    type="checkbox" 
                    bind:checked={includeReports} 
                    class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer" 
                    disabled={isEmailSending || !!emailSuccessMsg} 
                />
                Anhängen
            </label>
        </div>
        {#if includeReports}
            <div class="space-y-3 p-1">
                {#each linkedAppointments as app}
                    <div class="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 p-4 rounded-xl flex flex-col gap-2 transition-all shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                        <div class="flex items-center justify-between mb-1">
                            <div class="flex items-center gap-2">
                                <span class="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">📅</span>
                                <span class="text-sm font-bold text-neutral-900 dark:text-slate-100">{app.date ? new Date(app.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                                <span class="text-xs text-neutral-500 dark:text-slate-400 font-medium">{app.date ? new Date(app.date).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'}) : ''} Uhr</span>
                            </div>
                            <span class="text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 px-2 py-0.5 rounded truncate max-w-32 font-bold uppercase tracking-wider">{app.description || 'Termin'}</span>
                        </div>
                        <textarea 
                            bind:value={app.report} 
                            use:autoGrow 
                            rows="2" 
                            class="orga-input-clear text-sm auto-grow w-full border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors" 
                            placeholder="Kein Bericht vorhanden. Hier tippen, um einen hinzuzufügen..." 
                            disabled={isEmailSending || !!emailSuccessMsg}
                        ></textarea>
                        {#if app.report}
                            <div class="flex justify-end mt-1">
                                <button 
                                    type="button" 
                                    onclick={() => onSaveReport(app.id, app.report)} 
                                    class="text-[10px] flex items-center gap-1 uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold transition-colors cursor-pointer" 
                                    disabled={isEmailSending || !!emailSuccessMsg}
                                >
                                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> 
                                    Sichern
                                </button>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
{/if}
