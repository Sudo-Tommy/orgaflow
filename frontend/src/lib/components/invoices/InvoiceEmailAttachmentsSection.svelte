<script lang="ts">
    import { autoGrow } from "$lib/actions/autoGrow";

    interface Props {
        linkedAppointments: any[];
        includeReports: boolean;
        futureAppointments: any[];
        selectedFutureAppIds: string[];
        includeFutureApps: boolean;
        isEmailSending: boolean;
        successMsg: string;
        onSaveReport: (id: string, text: string) => void;
    }

    let {
        linkedAppointments,
        includeReports = $bindable(),
        futureAppointments,
        selectedFutureAppIds = $bindable(),
        includeFutureApps = $bindable(),
        isEmailSending,
        successMsg,
        onSaveReport
    }: Props = $props();
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 mt-2 border-t border-neutral-100">
    <!-- Besuchsberichte -->
    {#if linkedAppointments.length > 0}
        <div>
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span>📝</span> Besuchsberichte</h3>
                <label class="flex items-center gap-2 text-sm font-semibold text-neutral-700 cursor-pointer">
                    <input type="checkbox" bind:checked={includeReports} class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" disabled={isEmailSending || !!successMsg} />
                    Anhängen
                </label>
            </div>
            
            {#if includeReports}
                <div class="space-y-3 p-1">
                    {#each linkedAppointments as app}
                        <div class="bg-white border border-indigo-100 p-4 rounded-xl flex flex-col gap-2 transition-all shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                            <div class="flex items-center justify-between mb-1">
                                <div class="flex items-center gap-2">
                                    <span class="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">📅</span>
                                    <span class="text-sm font-bold text-neutral-900">{app.date ? new Date(app.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                                    <span class="text-xs text-neutral-500 font-medium">{app.date ? new Date(app.date).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'}) : ''} Uhr</span>
                                </div>
                                <span class="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded truncate max-w-32 font-bold uppercase tracking-wider">{app.description || 'Termin'}</span>
                            </div>
                            <textarea 
                                use:autoGrow 
                                bind:value={app.report} 
                                rows="2" 
                                class="auto-grow orga-input-clear text-sm resize-none overflow-hidden min-h-16 w-full border-neutral-200 bg-neutral-50 focus:bg-white transition-colors" 
                                placeholder="Kein Bericht vorhanden. Hier tippen, um einen hinzuzufügen..." 
                                disabled={isEmailSending || !!successMsg}
                            ></textarea>
                            {#if app.report}
                                <div class="flex justify-end mt-1">
                                    <button type="button" onclick={() => onSaveReport(app.id, app.report)} class="text-[10px] flex items-center gap-1 uppercase tracking-wider text-indigo-600 hover:text-indigo-800 font-bold transition-colors cursor-pointer" disabled={isEmailSending || !!successMsg}>
                                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> Sichern
                                    </button>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}

    <!-- Folgetermine -->
    {#if futureAppointments.length > 0}
        <div>
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span>📅</span> Folgetermine</h3>
                <label class="flex items-center gap-2 text-sm font-semibold text-neutral-700 cursor-pointer">
                    <input type="checkbox" bind:checked={includeFutureApps} class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" disabled={isEmailSending || !!successMsg} />
                    Anhängen
                </label>
            </div>
            
            {#if includeFutureApps}
                <div class="space-y-2 p-1">
                    {#each futureAppointments as app}
                        <label class="flex items-start gap-3 p-3 bg-white rounded-xl border border-neutral-200 cursor-pointer hover:border-indigo-300 transition-colors shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                            <input type="checkbox" checked={selectedFutureAppIds.includes(app.id)} onchange={() => {
                                if(selectedFutureAppIds.includes(app.id)) selectedFutureAppIds = selectedFutureAppIds.filter(id => id !== app.id);
                                else selectedFutureAppIds = [...selectedFutureAppIds, app.id];
                            }} class="w-5 h-5 mt-0.5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer" disabled={isEmailSending || !!successMsg} />
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-bold text-neutral-900">{new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                                <p class="text-xs text-neutral-500 truncate">{app.description || 'Termin'}</p>
                            </div>
                        </label>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>
