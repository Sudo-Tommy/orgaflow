<script lang="ts">
    import { employeeService } from '$lib/services/employeeService.svelte';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { 
        X, CheckCircle2, Circle, Clock, Calendar, MapPin, 
        FileText, AlertCircle, Plus, Trash2, CheckSquare, Save
    } from 'lucide-svelte';
    import type { AppointmentRecord, ClientRecord } from '$lib/types/orgaTypes';

    let isOpen = $state(false);
    let currentAppointment = $state<AppointmentRecord | null>(null);

    let status = $state<string>('Offen');
    let report = $state<string>('');
    let notes = $state<string>('');
    let checklist = $state<Array<{ text: string; done: boolean }>>([]);
    let newChecklistText = $state<string>('');
    let isSaving = $state(false);

    export function open(appointment: AppointmentRecord) {
        currentAppointment = appointment;
        isOpen = true;
        status = appointment.status || (appointment.settled ? 'Erledigt' : 'Offen');
        report = appointment.report || '';
        notes = appointment.notes || '';

        // Checkliste normalisieren
        if (Array.isArray(appointment.checklist)) {
            checklist = appointment.checklist.map(item => {
                if (typeof item === 'string') {
                    return { text: item, done: false };
                }
                return {
                    text: item.text || item.title || item.name || '',
                    done: !!item.done
                };
            });
        } else {
            checklist = [];
        }

        newChecklistText = '';
    }

    export function close() {
        isOpen = false;
        currentAppointment = null;
    }

    function toggleChecklistItem(index: number) {
        if (checklist[index]) {
            checklist[index].done = !checklist[index].done;
        }
    }

    function addChecklistItem() {
        const text = newChecklistText.trim();
        if (!text) return;
        checklist = [...checklist, { text, done: false }];
        newChecklistText = '';
    }

    function removeChecklistItem(index: number) {
        checklist = checklist.filter((_, i) => i !== index);
    }

    async function handleSave(newStatus?: string) {
        if (!currentAppointment) return;
        isSaving = true;
        try {
            const finalStatus = newStatus || status;
            const success = await employeeService.completeAppointment(currentAppointment.id, {
                status: finalStatus,
                report: report.trim(),
                notes: notes.trim(),
                checklist: checklist
            });

            if (success) {
                // Lokales Objekt aktualisieren
                currentAppointment.status = finalStatus;
                currentAppointment.report = report.trim();
                currentAppointment.notes = notes.trim();
                currentAppointment.checklist = checklist;
                close();
            }
        } finally {
            isSaving = false;
        }
    }

    // Abgeleitete Klienten-Informationen
    let clientInfo = $derived.by(() => {
        if (!currentAppointment) return null;
        const expClient = (currentAppointment as any).expand?.client?.[0] || 
                          (Array.isArray((currentAppointment as any).expand?.client) ? (currentAppointment as any).expand.client[0] : (currentAppointment as any).expand?.client);
        if (expClient) return expClient as ClientRecord;

        const rawClient = currentAppointment.client;
        const cId = Array.isArray(rawClient) ? rawClient[0] : rawClient;
        if (cId && typeof cId === 'string') {
            return orgaStore.clients.getById(cId) || null;
        }
        return null;
    });

    let dateFormatted = $derived.by(() => {
        if (!currentAppointment?.appointment) return 'Kein Datum hinterlegt';
        const d = new Date(currentAppointment.appointment);
        return `${d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
    });
</script>

{#if isOpen && currentAppointment}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[94vh]">
            
            <!-- Modal Header -->
            <div class="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
                <div class="min-w-0 pr-3">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full {
                            status === 'Erledigt' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                            status === 'In Bearbeitung' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }">
                            {status}
                        </span>
                        <span class="text-xs text-slate-500 dark:text-slate-400">📅 {dateFormatted}</span>
                    </div>

                    <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                        {#if clientInfo}
                            {clientInfo.name_last}, {clientInfo.name_first}
                        {:else}
                            Pflegeeinsatz
                        {/if}
                    </h2>
                    <p class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold truncate mt-0.5">
                        {currentAppointment.description || 'Betreuungstermin'}
                    </p>
                </div>

                <button 
                    type="button" 
                    onclick={close} 
                    aria-label="Schließen"
                    class="min-h-11 min-w-11 flex items-center justify-center rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Modal Body (Scrollbar) -->
            <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">

                <!-- 1. Status-Wähler -->
                <div class="space-y-2">
                    <span class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Einsatz-Status
                    </span>
                    <div class="grid grid-cols-3 gap-2">
                        {#each [
                            { id: 'Offen', label: 'Offen', activeClass: 'bg-amber-500 text-white shadow-xs' },
                            { id: 'In Bearbeitung', label: 'In Bearbeitung', activeClass: 'bg-indigo-600 text-white shadow-xs' },
                            { id: 'Erledigt', label: 'Erledigt', activeClass: 'bg-emerald-600 text-white shadow-xs' }
                        ] as s}
                            <button
                                type="button"
                                onclick={() => status = s.id}
                                class="min-h-11 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 {
                                    status === s.id 
                                        ? s.activeClass 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }"
                            >
                                {#if status === s.id && s.id === 'Erledigt'}
                                    <CheckCircle2 class="w-4 h-4" />
                                {/if}
                                <span>{s.label}</span>
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- 2. Aufgaben-Checkliste -->
                <div class="space-y-2.5">
                    <div class="flex items-center justify-between">
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckSquare class="w-4 h-4 text-indigo-500" />
                            <span>Aufgaben & Tätigkeiten</span>
                        </label>
                        <span class="text-xs text-slate-400">
                            {checklist.filter(c => c.done).length} von {checklist.length} erledigt
                        </span>
                    </div>

                    <!-- Vorhandene Punkte -->
                    {#if checklist.length > 0}
                        <div class="space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-900/50">
                            {#each checklist as item, idx}
                                <div class="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-800/80 transition-colors">
                                    <button 
                                        type="button"
                                        onclick={() => toggleChecklistItem(idx)}
                                        class="flex-1 min-h-11 px-2 flex items-center gap-3 text-left min-w-0 {item.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}"
                                    >
                                        {#if item.done}
                                            <CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" />
                                        {:else}
                                            <Circle class="w-5 h-5 text-slate-400 shrink-0" />
                                        {/if}
                                        <span class="text-xs sm:text-sm font-semibold truncate">{item.text}</span>
                                    </button>

                                    <button 
                                        type="button"
                                        onclick={() => removeChecklistItem(idx)}
                                        aria-label="Aufgabe löschen"
                                        class="min-h-11 min-w-11 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0"
                                    >
                                        <Trash2 class="w-4 h-4" />
                                    </button>
                                </div>
                            {/each}
                        </div>
                    {/if}

                    <!-- Neuen Punkt hinzufügen -->
                    <form 
                        onsubmit={(e) => { e.preventDefault(); addChecklistItem(); }}
                        class="flex gap-2"
                    >
                        <input 
                            type="text"
                            bind:value={newChecklistText}
                            placeholder="Neue Tätigkeit hinzufügen (z.B. Medikation verabreicht)..."
                            class="flex-1 min-h-11 px-3.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                        />
                        <button
                            type="submit"
                            disabled={!newChecklistText.trim()}
                            class="min-h-11 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
                        >
                            <Plus class="w-4 h-4" />
                            <span>Hinzufügen</span>
                        </button>
                    </form>
                </div>

                <!-- 3. Pflegebericht & Tätigkeitsnachweis -->
                <div class="space-y-1.5">
                    <label for="caregiver-report" class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText class="w-4 h-4 text-indigo-500" />
                        <span>Pflege- & Einsatzbericht (Leistungsnachweis)</span>
                    </label>
                    <textarea 
                        id="caregiver-report"
                        bind:value={report}
                        rows="4"
                        placeholder="Dokumentieren Sie hier die geleisteten Tätigkeiten, das Wohlbefinden des Klienten sowie besondere Vorkommnisse für den Leistungsnachweis..."
                        class="w-full p-3.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
                    ></textarea>
                </div>

                <!-- 4. Interne Notizen / Übergabe -->
                <div class="space-y-1.5">
                    <label for="caregiver-notes" class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Interne Notizen / Übergabehinweise
                    </label>
                    <textarea 
                        id="caregiver-notes"
                        bind:value={notes}
                        rows="2"
                        placeholder="Hinweise für die nächste Betreuungskraft oder das Büro..."
                        class="w-full p-3.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
                    ></textarea>
                </div>

            </div>

            <!-- Modal Footer (Ergonomische Touch-Buttons) -->
            <div class="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
                <button
                    type="button"
                    onclick={close}
                    disabled={isSaving}
                    class="w-full sm:w-auto min-h-12 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-100 transition-colors"
                >
                    Abbrechen
                </button>

                <button
                    type="button"
                    onclick={() => handleSave()}
                    disabled={isSaving}
                    class="w-full sm:w-auto min-h-12 px-5 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                    <Save class="w-4 h-4" />
                    <span>Zwischenspeichern</span>
                </button>

                <button
                    type="button"
                    onclick={() => handleSave('Erledigt')}
                    disabled={isSaving}
                    class="w-full sm:w-auto min-h-12 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-[0.98] flex items-center justify-center gap-2 shrink-0"
                >
                    <CheckCircle2 class="w-4 h-4" />
                    <span>Einsatz abschließen</span>
                </button>
            </div>

        </div>
    </div>
{/if}
