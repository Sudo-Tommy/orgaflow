<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let availableAppointments = $state<any[]>([]);
    let selectedAppointmentIds = $state<string[]>([]);
    let targetVisibility = $state(true);
    let dateFrom = $state("");
    let dateTo = $state("");

    export function open(apps: any[]) {
        availableAppointments = apps.sort((a, b) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
        selectedAppointmentIds = [];
        targetVisibility = true;
        errorMsg = "";
        
        const now = new Date();
        dateFrom = now.toISOString().split('T')[0];
        
        const nextMonth = new Date(now);
        nextMonth.setMonth(now.getMonth() + 1);
        dateTo = nextMonth.toISOString().split('T')[0];
        
        filterAppointments();
        
        dialog?.showModal();
    }
    
    let filteredApps = $state<any[]>([]);
    
    function filterAppointments() {
        if (!dateFrom || !dateTo) {
            filteredApps = [];
            selectedAppointmentIds = [];
            return;
        }
        const from = new Date(dateFrom);
        from.setHours(0,0,0,0);
        const to = new Date(dateTo);
        to.setHours(23,59,59,999);
        
        const result = availableAppointments.filter(a => {
            const d = new Date(a.appointment);
            return d >= from && d <= to;
        });
        
        filteredApps = result;
        // Wählt standardmäßig alle gefundenen aus
        selectedAppointmentIds = result.map(a => a.id);
    }

    $effect(() => {
        if (dateFrom || dateTo) {
            filterAppointments();
        }
    });

    export function close() {
        dialog?.close();
    }

    function handleToggle(id: string) {
        if (selectedAppointmentIds.includes(id)) {
            selectedAppointmentIds = selectedAppointmentIds.filter(i => i !== id);
        } else {
            selectedAppointmentIds = [...selectedAppointmentIds, id];
        }
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        
        if (selectedAppointmentIds.length === 0) {
            errorMsg = "Bitte mindestens einen Termin auswählen.";
            return;
        }

        isLoading = true;
        errorMsg = "";

        try {
            const promises = [];
            for (const id of selectedAppointmentIds) {
                promises.push(pb.collection('appointments').update(id, { is_visible: targetVisibility }, { requestKey: null }));
            }

            // Um die API nicht zu überlasten, in Chunks senden
            const chunkSize = 20;
            for (let i = 0; i < promises.length; i += chunkSize) {
                await Promise.all(promises.slice(i, i + chunkSize));
            }

            toastStore.success(`${promises.length} Termine erfolgreich aktualisiert!`);
            
            if (orgaStore.appointments) {
                await orgaStore.appointments.init();
            }

            close();
        } catch(err: any) {
            console.error(err);
            errorMsg = "Fehler beim Aktualisieren. " + (err.message || "");
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-6 sm:my-10 rounded-3xl zero-inner-scroll-modal" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl p-6 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-2 flex items-center gap-2 pr-10">
            <span class="w-8 h-8 flex items-center justify-center bg-sky-100 text-sky-600 rounded-lg shadow-inner text-sm">👁️</span> Sichtbarkeit umschalten
        </h2>
        <p class="text-sm text-neutral-500 dark:text-slate-400 mb-6">Ändern Sie die Portal-Sichtbarkeit für mehrere Termine auf einmal.</p>

        {#if errorMsg}<div class="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 dark:border-red-900/60">{errorMsg}</div>{/if}
        
        <form onsubmit={onSubmit} class="space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="vis-start" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Zeitraum von</label>
                    <input id="vis-start" type="date" bind:value={dateFrom} class="orga-input-clear py-3 sm:py-2.5" disabled={isLoading} required />
                </div>
                <div>
                    <label for="vis-end" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Zeitraum bis</label>
                    <input id="vis-end" type="date" bind:value={dateTo} class="orga-input-clear py-3 sm:py-2.5" disabled={isLoading} required />
                </div>
            </div>

            <div class="p-4 bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 rounded-xl">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-bold text-sky-900 dark:text-sky-200 text-sm">Termine auswählen ({selectedAppointmentIds.length})</h3>
                    <div class="flex items-center gap-2">
                        <button type="button" onclick={() => selectedAppointmentIds = filteredApps.map(a => a.id)} class="text-xs font-bold text-sky-700 dark:text-sky-400 hover:text-sky-900 transition-colors">Alle</button>
                        <span class="text-sky-300 dark:text-sky-700">|</span>
                        <button type="button" onclick={() => selectedAppointmentIds = []} class="text-xs font-bold text-sky-700 dark:text-sky-400 hover:text-sky-900 transition-colors">Keine</button>
                    </div>
                </div>
                {#if filteredApps.length === 0}
                    <p class="text-xs text-sky-700 dark:text-sky-400 italic">Keine Termine im gewählten Zeitraum gefunden.</p>
                {:else}
                    <div class="flex flex-col gap-2">
                        {#each filteredApps as app}
                            <label class="flex items-center gap-3 p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-sky-100 dark:border-sky-900/50 cursor-pointer hover:border-sky-300 transition-colors">
                                <input type="checkbox" checked={selectedAppointmentIds.includes(app.id)} onchange={() => handleToggle(app.id)} class="text-sky-600 rounded focus:ring-sky-500 w-4 h-4 shrink-0" disabled={isLoading} />
                                <div class="flex-1 min-w-0 flex items-center justify-between gap-2">
                                    <div class="min-w-0">
                                        <p class="text-sm font-bold text-neutral-900 dark:text-slate-100">{new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                                        <p class="text-xs text-neutral-500 dark:text-slate-400 truncate">{app.description || 'Termin'}</p>
                                    </div>
                                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 {app.is_visible ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-500 dark:bg-slate-700 dark:text-slate-400'}">
                                        {app.is_visible ? '👁️ Sichtbar' : '🙈 Versteckt'}
                                    </span>
                                </div>
                            </label>
                        {/each}
                    </div>
                {/if}
            </div>

            <div>
                <label for="vis-target" class="block text-sm font-semibold text-neutral-700 mb-1.5">Neue Sichtbarkeit für ausgewählte Termine</label>
                <div class="flex gap-2 p-1 bg-neutral-100 rounded-lg">
                    <button type="button" onclick={() => targetVisibility = true} disabled={isLoading} class="flex-1 py-2.5 text-sm font-bold rounded-md transition-colors {targetVisibility ? 'bg-white shadow-sm text-sky-600' : 'text-neutral-500 hover:text-neutral-700'}">👁️ Öffentlich sichtbar</button>
                    <button type="button" onclick={() => targetVisibility = false} disabled={isLoading} class="flex-1 py-2.5 text-sm font-bold rounded-md transition-colors {!targetVisibility ? 'bg-white shadow-sm text-neutral-700' : 'text-neutral-500 hover:text-neutral-700'}">🙈 Verstecken</button>
                </div>
            </div>

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                <button type="submit" class="orga-button-primary bg-sky-600 hover:bg-sky-700 shadow-sky-600/30 w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading || selectedAppointmentIds.length === 0}>{isLoading ? "Aktualisiert..." : "Speichern"}</button>
            </div>
        </form>
    </div>
</dialog>