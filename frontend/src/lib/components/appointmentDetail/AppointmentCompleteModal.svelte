<script lang="ts">
    import { appointmentCompleteService as s } from "$lib/services/appointmentCompleteService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { sortPersons, sortAlphabetical } from "$lib/utils/sortHelper";
    import { Check, AlertTriangle, CheckCircle2 } from "lucide-svelte";
    import { autoGrow } from "$lib/actions/autoGrow";

    const BILLING_TYPES = [
        { value: '45a', label: '§45a (Entlastungsbetrag)' },
        { value: 'EL', label: 'EL (Entlastungsleistungen)' },
        { value: 'Kombi', label: 'Kombi (Kombinationsleistung)' },
        { value: 'Privat', label: 'Privat (Selbstzahler)' },
        { value: 'VHP', label: 'VHP (Verhinderungspflege)' }
    ];

    let sortedClients = $derived(sortPersons(orgaStore.clients?.data || []));
    let sortedTasks = $derived(sortAlphabetical(orgaStore.tasks?.data || [], (t: any) => t.title || ''));

    let dialog = $state<HTMLDialogElement>();

    $effect(() => {
        if (!dialog) return;
        if (s.isOpen) {
            if (dialog.open) dialog.close();
            dialog.showModal();
        } else if (dialog.open) {
            dialog.close();
        }
    });

    function toggleTask(id: string) {
        s.selectedTasks = s.selectedTasks.includes(id) ? s.selectedTasks.filter(t => t !== id) : [...s.selectedTasks, id];
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm w-[calc(100%-1.25rem)] sm:w-full max-w-xl mx-auto my-3 sm:my-8 landscape:my-2 rounded-3xl outline-none border-none shadow-2xl"
    onclick={(e) => { if (e.target === dialog) s.close(); }}
    oncancel={(e) => { e.preventDefault(); s.close(); }}
>
    {#if s.isOpen}
        <div class="relative w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-7 text-slate-900 dark:text-slate-100 my-auto animate-enter isolate">
            <!-- Header -->
            <div class="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl shrink-0 border border-emerald-200 dark:border-emerald-800">
                        🏁
                    </div>
                    <div>
                        <h2 id="complete-modal-title" class="text-lg font-black text-slate-900 dark:text-white leading-tight">
                            Termin abschließen
                        </h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {s.appointment?.title || s.appointment?.description || 'Einsatz beenden'} · {s.appDate}
                        </p>
                    </div>
                </div>
                <button 
                    type="button" 
                    onclick={() => s.close()}
                    class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer text-sm"
                    aria-label="Schließen"
                >✕</button>
            </div>

            {#if s.showFollowUp}
                <!-- Folgetermin Abfrage nach erfolgreichem Abschluss (Antwort A15) -->
                <div class="py-6 text-center space-y-4">
                    <div class="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-2xl mx-auto border border-emerald-200 dark:border-emerald-800">
                        ✓
                    </div>
                    <div>
                        <h3 class="text-lg font-black text-slate-900 dark:text-white">Termin erfolgreich abgeschlossen!</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">{rbacService.canAccessFinances ? 'Status ist nun „Beendet“ und der Einsatz ist abrechnungsbereit.' : 'Status ist nun „Beendet“ und der Einsatz ist vollständig dokumentiert.'}</p>
                    </div>
                    <div class="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-xs text-indigo-950 dark:text-indigo-200 space-y-1.5 text-left">
                        <p class="font-bold">Möchten Sie direkt den Folgetermin vereinbaren?</p>
                        <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">Vorauswahl: Gleicher Klient, gleiche Uhrzeit ({s.startTime} - {s.endTime} Uhr), 7 Tage später.</p>
                    </div>
                    <div class="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                        <button type="button" onclick={() => s.close()} class="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">Fertig / Schließen</button>
                        <button type="button" onclick={() => s.createFollowUp()} class="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2">
                            <span>⚡</span><span>Folgetermin für nächste Woche planen</span>
                        </button>
                    </div>
                </div>
            {:else}
                {#if s.isFuture}
                    <div class="mt-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                        <div class="flex items-center gap-2 font-bold text-sm">
                            <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Dieser Termin liegt in der Zukunft</span>
                        </div>
                        <p>Geplantes Datum ist der <strong>{s.appDate}</strong>. Möchten Sie diesen Termin wirklich schon jetzt vorzeitig als beendet markieren?</p>
                        <label class="flex items-center gap-2 font-bold cursor-pointer pt-1">
                            <input type="checkbox" bind:checked={s.confirmFuture} class="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                            <span>Ja, Termin vorzeitig als beendet markieren</span>
                        </label>
                    </div>
                {/if}

                {#if s.errorMsg}
                    <div class="mt-4 p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 text-xs font-semibold">{s.errorMsg}</div>
                {/if}

                <div class="mt-4 space-y-4 text-xs">
                    <div class="grid grid-cols-1 {rbacService.canAccessFinances ? 'sm:grid-cols-2' : ''} gap-3">
                        <div>
                            <label for="complete-client" class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                👤 Klient <span class="text-rose-500">*</span>
                            </label>
                            <select id="complete-client" bind:value={s.selectedClientId} class="w-full min-h-[44px] px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500">
                                <option value="">-- Klient wählen --</option>
                                {#each sortedClients as c}
                                    <option value={c.id}>{c.name_last || ''}, {c.name_first || ''}</option>
                                {/each}
                            </select>
                        </div>

                        {#if rbacService.canAccessFinances}
                            <div>
                                <label for="complete-billing" class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    💶 Abrechnungsart <span class="text-rose-500">*</span>
                                </label>
                                <select id="complete-billing" bind:value={s.billingType} class="w-full min-h-[44px] px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500">
                                    <option value="">-- Abrechnungsart wählen --</option>
                                    {#each BILLING_TYPES as bt}
                                        <option value={bt.value}>{bt.label}</option>
                                    {/each}
                                </select>
                            </div>
                        {/if}
                    </div>

                    <!-- 2. Arbeitszeit (15-Minuten gerundet) & Gefahrene Kilometer -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label for="complete-start" class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                ⏱️ Beginn <span class="text-rose-500">*</span>
                            </label>
                            <input id="complete-start" type="time" step="900" bind:value={s.startTime} class="w-full min-h-[44px] px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold" />
                        </div>

                        <div>
                            <label for="complete-end" class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                ⏱️ Ende (15m) <span class="text-rose-500">*</span>
                            </label>
                            <input id="complete-end" type="time" step="900" bind:value={s.endTime} class="w-full min-h-[44px] px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold" />
                        </div>

                        <div>
                            <label for="complete-km" class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                🚗 Gefahrene KM
                            </label>
                            <input id="complete-km" type="number" step="0.5" min="0" bind:value={s.driveKm} placeholder="0" class="w-full min-h-[44px] px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold" />
                        </div>
                    </div>

                    <!-- 3. Erbrachte Leistungen (mindestens 1 erforderlich) -->
                    <div>
                        <div class="flex items-center justify-between mb-1.5">
                            <span class="font-bold text-slate-700 dark:text-slate-300">
                                📋 Erbrachte Leistungen <span class="text-rose-500">*</span>
                            </span>
                            <span class="text-[11px] {s.selectedTasks.length > 0 ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}">
                                {s.selectedTasks.length > 0 ? `✓ ${s.selectedTasks.length} gewählt` : 'Bitte mind. 1 wählen'}
                            </span>
                        </div>
                        <div class="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                            {#each sortedTasks as t}
                                {@const isSelected = s.selectedTasks.includes(t.id)}
                                <button
                                    type="button"
                                    onclick={() => toggleTask(t.id)}
                                    class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation {
                                        isSelected 
                                            ? 'bg-indigo-600 text-white shadow-xs' 
                                             : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                    }"
                                >
                                    {#if isSelected}
                                        <Check class="w-3.5 h-3.5 stroke-[3]" />
                                    {/if}
                                    <span>{t.title}</span>
                                </button>
                            {/each}
                        </div>
                    </div>

                    <!-- 4. Besuchsbericht / Dokumentation -->
                    <div>
                        <label for="complete-report" class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            📝 Besuchsbericht / Bemerkungen
                        </label>
                        <textarea
                            id="complete-report"
                            bind:value={s.report}
                            rows="3"
                            placeholder="Notizen zu Besonderheiten, Zustand des Klienten oder erledigten Aufgaben..."
                            class="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 auto-grow resize-none overflow-hidden"
                            use:autoGrow
                        ></textarea>
                    </div>
                </div>

                <!-- Footer -->
                <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onclick={() => s.close()}
                        class="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer"
                    >
                        Abbrechen
                    </button>
                    <button
                        type="button"
                        onclick={() => s.submit()}
                        disabled={!s.canSubmit || s.isLoading}
                        class="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {#if s.isLoading}
                            <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            <span>Wird gespeichert...</span>
                        {:else}
                            <CheckCircle2 class="w-4 h-4" />
                            <span>Termin verbindlich abschließen</span>
                        {/if}
                    </button>
                </div>
            {/if}
        </div>
    {/if}
</dialog>
