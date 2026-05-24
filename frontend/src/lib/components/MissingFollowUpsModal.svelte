<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";

    let { missingFollowUps, onOpenDetail } = $props<{
        missingFollowUps: any[];
        onOpenDetail: (id: string) => void;
    }>();

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    
    let selectedIds = $state<string[]>([]);
    let isDeleting = $state(false);

    // Filtert strikt: Nur Termine, deren Start in der Vergangenheit liegt UND die nicht mehr aktiv laufen
    let pastFollowUps = $derived.by(() => {
        const now = Date.now();
        return missingFollowUps.filter((app: any) => {
            if (app.is_private) return false; // Private Termine komplett ignorieren
            if (!app.appointment) return false;
            const startTime = new Date(app.appointment).getTime();
            if (startTime > now) return false; // Termin liegt in der Zukunft
            // Wenn die Zeiterfassung noch aktiv läuft (Gestartet, aber noch kein Stopp gedrückt), ist er noch nicht beendet
            if (app.expand?.time_record && app.expand.time_record.some((tr: any) => tr.start && !tr.end)) return false;
            return true;
        });
    });

    export function open() {
        selectedIds = [];
        dialog?.showModal();
    }

    export function close() {
        selectedIds = [];
        dialog?.close();
    }

    function toggleSelection(id: string) {
        if (selectedIds.includes(id)) {
            selectedIds = selectedIds.filter(i => i !== id);
        } else {
            selectedIds = [...selectedIds, id];
        }
    }

    function toggleAll() {
        if (selectedIds.length === pastFollowUps.length) {
            selectedIds = [];
        } else {
            selectedIds = pastFollowUps.map((a: any) => a.id);
        }
    }

    async function deleteSelected() {
        if (selectedIds.length === 0) return;
        if (!(await confirmStore.ask(`Möchten Sie ${selectedIds.length} Termine wirklich unwiderruflich aus dem System löschen?`, "Termine löschen?", "Löschen", "Abbrechen", true))) return;

        isDeleting = true;
        try {
            const promises = selectedIds.map(id => pb.collection('appointments').delete(id));
            
            // Zur Schonung der Datenbankverbindung in 20er-Blöcken löschen
            for (let i = 0; i < promises.length; i += 20) await Promise.all(promises.slice(i, i + 20));

            toastStore.success(`${selectedIds.length} Termine erfolgreich gelöscht.`);
            selectedIds = [];
            
            // Aktualisiert den Kalender/Dashboard im Hintergrund
            if (orgaStore.appointments) await orgaStore.appointments.init();
        } catch (err: any) {
            console.error("Fehler beim Löschen:", err);
            toastStore.error("Fehler beim Löschen der Termine.");
        } finally {
            isDeleting = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-neutral-50 sm:rounded-3xl w-full h-dvh sm:h-auto sm:max-h-[90dvh] flex flex-col relative overflow-hidden shadow-2xl border border-neutral-100">
        
        <!-- HEADER -->
        <div class="bg-white px-4 sm:px-6 md:px-8 py-4 sm:py-5 border-b border-neutral-200 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-sm">
            <div class="flex items-center gap-3 sm:gap-4 min-w-0 pr-12 sm:pr-0">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold shadow-inner text-xl sm:text-2xl shrink-0">⚠️</div>
                <div class="min-w-0">
                    <h2 class="text-lg sm:text-xl font-bold text-neutral-900 flex items-center gap-2 truncate">
                        Nachbereitungen
                    </h2>
                    <p class="text-[10px] sm:text-sm text-neutral-500 font-medium truncate">Fehlende Zeiten, Leistungen oder Berichte</p>
                </div>
            </div>
            <button aria-label="Schließen" onclick={close} class="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors shadow-sm sm:shadow-none shrink-0 z-10 active:scale-95">
                <span class="text-xl leading-none">✕</span>
            </button>
        </div>

        <!-- TOOLBAR (Massenverarbeitung) -->
        {#if pastFollowUps.length > 0}
            <div class="bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 z-10 shadow-sm">
                <label class="flex items-center gap-3 cursor-pointer text-sm font-semibold text-neutral-700">
                    <input type="checkbox" checked={selectedIds.length === pastFollowUps.length && pastFollowUps.length > 0} onchange={toggleAll} class="w-5 h-5 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500 transition-colors cursor-pointer" disabled={isDeleting} />
                    Alle {pastFollowUps.length} auswählen
                </label>
                {#if selectedIds.length > 0}
                    <button type="button" onclick={deleteSelected} disabled={isDeleting} class="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 active:scale-95">
                        <span>🗑️</span> {isDeleting ? 'Löscht...' : `${selectedIds.length} löschen`}
                    </button>
                {/if}
            </div>
        {/if}

        <!-- CONTENT -->
        <div class="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-neutral-50">
            {#if pastFollowUps.length === 0}
                <div class="flex flex-col items-center justify-center py-20 animate-enter delay-100">
                    <span class="text-5xl mb-4 opacity-80">🎉</span>
                    <p class="font-bold text-xl text-neutral-900 mb-2">Alles erledigt!</p>
                    <p class="text-sm text-neutral-500 text-center max-w-sm">Sie haben alle vergangenen Termine vollständig nachbereitet.</p>
                </div>
            {:else}
                <div class="space-y-3">
                    {#each pastFollowUps as app}
                        {@const isMissingReport = !app.report && !app.notes && !app.internal_notes}
                        {@const isMissingTime = !app.expand?.time_record || app.expand.time_record.length === 0}
                        {@const isMissingTasks = !app.expand?.tasks || app.expand.tasks.length === 0}
                        {@const clientObj = Array.isArray(app.expand?.client) ? app.expand.client[0] : app.expand?.client}
                        
                        <div class="w-full bg-white rounded-2xl border border-neutral-200 hover:border-indigo-300 transition-all group shadow-sm hover:shadow-md flex flex-col sm:flex-row sm:items-center gap-2 p-2 pr-4">
                            
                            <!-- Checkbox Wrapper -->
                            <div class="pl-3 pt-3 sm:pt-0 shrink-0 flex items-center justify-center">
                                <input type="checkbox" checked={selectedIds.includes(app.id)} onchange={() => toggleSelection(app.id)} class="w-5 h-5 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500 cursor-pointer transition-colors" disabled={isDeleting} />
                            </div>
                            
                            <!-- Main Card & Bearbeiten Button -->
                            <button type="button" onclick={() => onOpenDetail(app.id)} class="min-w-0 flex-1 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 rounded-xl hover:bg-indigo-50/50 transition-colors cursor-pointer">
                                <div class="min-w-0 flex-1">
                                <div class="flex flex-wrap items-center gap-2 mb-2">
                                    <span class="text-xs font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200 shadow-sm shrink-0">
                                        {new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </span>
                                    <span class="text-xs font-bold {app.is_private ? 'text-rose-600' : 'text-indigo-600'} shrink-0">
                                        {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                    </span>
                                    {#if clientObj}
                                        <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shadow-sm shrink-0 truncate max-w-37.5 sm:max-w-xs" title="Klient: {clientObj.name_first} {clientObj.name_last}">
                                            👤 {clientObj.name_first} {clientObj.name_last}
                                        </span>
                                    {/if}
                                </div>
                                <p class="text-sm font-bold text-neutral-900 line-clamp-1 mb-2.5 pr-2">{app.description || 'Termin ohne Beschreibung'}</p>
                                
                                <div class="flex flex-wrap gap-2">
                                    {#if isMissingTime}<span class="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 rounded-lg shadow-sm">⚠️ Zeit fehlt</span>{/if}
                                    {#if isMissingTasks}<span class="text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200 px-2 py-1 rounded-lg shadow-sm">⚠️ Leistung fehlt</span>{/if}
                                    {#if isMissingReport}<span class="text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 rounded-lg shadow-sm">⚠️ Bericht fehlt</span>{/if}
                                </div>
                            </div>
                            
                            <div class="shrink-0 flex items-center justify-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-neutral-100">
                                <span class="text-xs font-bold text-indigo-700 bg-indigo-50 px-4 py-2.5 rounded-xl border border-indigo-200 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center gap-2 w-full sm:w-auto active:scale-95"><span class="text-base leading-none">✏️</span> Bearbeiten</span>
                            </div>
                            </button>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
        
        <div class="p-4 sm:p-6 bg-white border-t border-neutral-200 shrink-0 flex justify-end sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
            <button onclick={close} class="orga-button-primary w-full sm:w-auto shadow-indigo-600/20 py-3 sm:py-2.5 px-8 active:scale-95">Schließen</button>
        </div>
    </div>
</dialog>