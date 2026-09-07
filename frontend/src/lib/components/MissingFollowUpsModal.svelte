<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { 
        User, Calendar, Clock, AlertTriangle, Search, ChevronDown, ChevronRight, 
        X, Lock, Trash2, Edit3, CheckCircle2, CheckCheck
    } from "lucide-svelte";

    interface Props {
        missingFollowUps: any[];
        onOpenDetail: (id: string) => void;
    }

    let { missingFollowUps = [], onOpenDetail }: Props = $props();

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    
    let selectedIds = $state<string[]>([]);
    let isProcessing = $state(false);
    let searchQuery = $state("");
    let filterType = $state<"all" | "missing_time" | "missing_tasks" | "missing_report">("all");
    let collapsedGroups = $state<Record<string, boolean>>({});

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

    // Diagnostik-Funktionen
    function checkMissingTime(app: any): boolean {
        return !app.expand?.time_record || app.expand.time_record.length === 0;
    }

    function checkMissingTasks(app: any): boolean {
        return !app.expand?.tasks || app.expand.tasks.length === 0;
    }

    function checkMissingReport(app: any): boolean {
        return !app.report && !app.notes && !app.internal_notes;
    }

    // Kennzahlen
    let metrics = $derived.by(() => {
        let missingTimeCount = 0;
        let missingTasksCount = 0;
        let missingReportCount = 0;

        for (const app of pastFollowUps) {
            if (checkMissingTime(app)) missingTimeCount++;
            if (checkMissingTasks(app)) missingTasksCount++;
            if (checkMissingReport(app)) missingReportCount++;
        }

        return {
            totalCount: pastFollowUps.length,
            missingTimeCount,
            missingTasksCount,
            missingReportCount
        };
    });

    // Gefilterte Termine
    let filteredAppointments = $derived.by(() => {
        const query = searchQuery.trim().toLowerCase();

        return pastFollowUps.filter((app: any) => {
            // Fehlertyp-Filter
            if (filterType === "missing_time" && !checkMissingTime(app)) return false;
            if (filterType === "missing_tasks" && !checkMissingTasks(app)) return false;
            if (filterType === "missing_report" && !checkMissingReport(app)) return false;

            // Text-Filter
            if (!query) return true;

            const client = app.expand?.client?.[0];
            const clientName = client ? `${client.name_first || ''} ${client.name_last || ''}`.toLowerCase() : '';
            const desc = (app.description || '').toLowerCase();
            const dateStr = app.appointment ? new Date(app.appointment).toLocaleDateString('de-DE') : '';

            return clientName.includes(query) || desc.includes(query) || dateStr.includes(query);
        });
    });

    // Gruppierung nach Klient
    let groupedAppointments = $derived.by(() => {
        const groups: { 
            clientName: string; 
            clientId?: string;
            apps: any[];
        }[] = [];

        for (const app of filteredAppointments) {
            let clientName = "Ohne Klient";
            let clientId: string | undefined = undefined;
            if (app.expand?.client?.[0]) {
                const c = app.expand.client[0];
                clientName = `${c.name_first || ''} ${c.name_last || ''}`.trim() || 'Klient ohne Namen';
                clientId = c.id;
            }

            let group = groups.find(g => g.clientName === clientName);
            if (!group) {
                group = { clientName, clientId, apps: [] };
                groups.push(group);
            }
            group.apps.push(app);
        }

        return groups.sort((a, b) => a.clientName.localeCompare(b.clientName));
    });

    export function open() {
        selectedIds = [];
        searchQuery = "";
        filterType = "all";
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

    function toggleGroupSelection(groupApps: any[]) {
        const groupIds = groupApps.map(a => a.id);
        const allGroupSelected = groupIds.every(id => selectedIds.includes(id));

        if (allGroupSelected) {
            selectedIds = selectedIds.filter(id => !groupIds.includes(id));
        } else {
            const newIds = new Set([...selectedIds, ...groupIds]);
            selectedIds = Array.from(newIds);
        }
    }

    function toggleAllFiltered() {
        const filteredIds = filteredAppointments.map(a => a.id);
        const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));

        if (allSelected) {
            selectedIds = selectedIds.filter(id => !filteredIds.includes(id));
        } else {
            const newIds = new Set([...selectedIds, ...filteredIds]);
            selectedIds = Array.from(newIds);
        }
    }

    function toggleGroupCollapse(clientName: string) {
        collapsedGroups[clientName] = !collapsedGroups[clientName];
    }

    // Termin als privat markieren (entfernt ihn aus der geschäftlichen Nachbereitung)
    async function markAsPrivate(app: any) {
        if (!(await confirmStore.ask(
            `Möchten Sie diesen Termin als "privat" kennzeichnen? Er wird dadurch aus der Liste der Nachbereitungen entfernt.`,
            "Als privat markieren?",
            "Privat markieren",
            "Abbrechen",
            false
        ))) return;

        isProcessing = true;
        try {
            await pb.collection('appointments').update(app.id, { is_private: true });
            toastStore.success("Termin als privat gekennzeichnet.");
            selectedIds = selectedIds.filter(id => id !== app.id);
            if (orgaStore.appointments) await orgaStore.appointments.init();
        } catch (err: any) {
            toastStore.error("Fehler beim Aktualisieren des Termins.");
        } finally {
            isProcessing = false;
        }
    }

    // Ausgewählte als privat markieren (Batch)
    async function markSelectedAsPrivate() {
        if (selectedIds.length === 0) return;
        if (!(await confirmStore.ask(
            `Möchten Sie ${selectedIds.length} Termine als "privat" kennzeichnen? Diese werden aus der Nachbereitungsliste entfernt.`,
            "Termine privat markieren?",
            "Als privat markieren",
            "Abbrechen",
            false
        ))) return;

        isProcessing = true;
        try {
            const promises = selectedIds.map(id => pb.collection('appointments').update(id, { is_private: true }));
            for (let i = 0; i < promises.length; i += 20) await Promise.all(promises.slice(i, i + 20));
            toastStore.success(`${selectedIds.length} Termine als privat markiert.`);
            selectedIds = [];
            if (orgaStore.appointments) await orgaStore.appointments.init();
        } catch (err: any) {
            toastStore.error("Fehler beim Aktualisieren der Termine.");
        } finally {
            isProcessing = false;
        }
    }

    // Ausgewählte Termine löschen (Batch mit Sicherheitsabfrage)
    async function deleteSelected() {
        if (selectedIds.length === 0) return;
        if (!(await confirmStore.ask(
            `Möchten Sie ${selectedIds.length} Termine wirklich unwiderruflich aus dem System löschen? Dies sollte nur bei Duplikaten oder Fehlbuchungen erfolgen.`,
            "Termine unwiderruflich löschen?",
            "Unwiderruflich Löschen",
            "Abbrechen",
            true
        ))) return;

        isProcessing = true;
        try {
            const promises = selectedIds.map(id => pb.collection('appointments').delete(id));
            for (let i = 0; i < promises.length; i += 20) await Promise.all(promises.slice(i, i + 20));
            toastStore.success(`${selectedIds.length} Termine erfolgreich gelöscht.`);
            selectedIds = [];
            if (orgaStore.appointments) await orgaStore.appointments.init();
        } catch (err: any) {
            console.error("Fehler beim Löschen:", err);
            toastStore.error("Fehler beim Löschen der Termine.");
        } finally {
            isProcessing = false;
        }
    }
</script>

<dialog 
    bind:this={dialog} 
    class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-3xl m-0 sm:m-auto max-h-none sm:max-h-fit rounded-none sm:rounded-3xl outline-none" 
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-neutral-50 sm:rounded-3xl w-full h-dvh sm:h-auto sm:max-h-[90dvh] flex flex-col relative overflow-hidden shadow-2xl border border-neutral-200">
        
        <!-- Mobile Drag Indicator -->
        <div class="pt-3 pb-1 sm:hidden flex justify-center shrink-0 bg-white">
            <div class="w-12 h-1.5 bg-neutral-300 rounded-full"></div>
        </div>

        <!-- HEADER -->
        <div class="bg-white px-4 sm:px-6 md:px-8 py-4 sm:py-5 border-b border-neutral-200 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-xs">
            <div class="flex items-center gap-3 sm:gap-4 min-w-0 pr-12 sm:pr-0">
                <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold shadow-inner text-xl sm:text-2xl shrink-0 border border-orange-100">
                    ⚠️
                </div>
                <div class="min-w-0">
                    <h2 class="text-lg sm:text-xl font-black text-neutral-900 flex items-center gap-2 truncate tracking-tight">
                        Nachbereitungen
                    </h2>
                    <p class="text-xs sm:text-sm text-neutral-500 font-medium truncate mt-0.5">
                        Fehlende Zeiten, Leistungen oder Berichte
                    </p>
                </div>
            </div>
            <button 
                type="button"
                aria-label="Schließen" 
                onclick={close} 
                class="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors shadow-sm sm:shadow-none shrink-0 z-10 active:scale-95 touch-manipulation cursor-pointer"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- KPI BREAKDOWN PILLS -->
        <div class="bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 shrink-0 grid grid-cols-3 gap-2 text-xs">
            <button
                type="button"
                onclick={() => filterType = filterType === 'missing_time' ? 'all' : 'missing_time'}
                class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {filterType === 'missing_time' ? 'bg-amber-100 border-amber-300 shadow-xs' : 'bg-amber-50/60 border-amber-100 hover:bg-amber-50'}"
            >
                <div class="flex items-center justify-between">
                    <span class="text-base leading-none">⏱️</span>
                    <span class="text-xs font-black text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded-md">{metrics.missingTimeCount}</span>
                </div>
                <p class="text-[10px] font-bold uppercase text-amber-800 truncate mt-1">Zeit fehlt</p>
            </button>

            <button
                type="button"
                onclick={() => filterType = filterType === 'missing_tasks' ? 'all' : 'missing_tasks'}
                class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {filterType === 'missing_tasks' ? 'bg-orange-100 border-orange-300 shadow-xs' : 'bg-orange-50/60 border-orange-100 hover:bg-orange-50'}"
            >
                <div class="flex items-center justify-between">
                    <span class="text-base leading-none">📋</span>
                    <span class="text-xs font-black text-orange-900 bg-orange-200/80 px-1.5 py-0.5 rounded-md">{metrics.missingTasksCount}</span>
                </div>
                <p class="text-[10px] font-bold uppercase text-orange-800 truncate mt-1">Leistung fehlt</p>
            </button>

            <button
                type="button"
                onclick={() => filterType = filterType === 'missing_report' ? 'all' : 'missing_report'}
                class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {filterType === 'missing_report' ? 'bg-rose-100 border-rose-300 shadow-xs' : 'bg-rose-50/60 border-rose-100 hover:bg-rose-50'}"
            >
                <div class="flex items-center justify-between">
                    <span class="text-base leading-none">📝</span>
                    <span class="text-xs font-black text-rose-900 bg-rose-200/80 px-1.5 py-0.5 rounded-md">{metrics.missingReportCount}</span>
                </div>
                <p class="text-[10px] font-bold uppercase text-rose-800 truncate mt-1">Bericht fehlt</p>
            </button>
        </div>

        <!-- SEARCH & FILTER TOOLBAR -->
        <div class="bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center shrink-0">
            <!-- Search Field -->
            <div class="relative flex-1">
                <Search class="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input 
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Klient, Datum oder Bezeichnung suchen..."
                    class="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold bg-neutral-100/80 border border-neutral-200 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                />
                {#if searchQuery}
                    <button 
                        type="button" 
                        onclick={() => searchQuery = ""}
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                    >
                        <X class="w-3.5 h-3.5" />
                    </button>
                {/if}
            </div>

            <!-- Filter Status Chips -->
            <div class="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl shrink-0 overflow-x-auto">
                <button 
                    type="button"
                    onclick={() => filterType = 'all'}
                    class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap {filterType === 'all' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}"
                >
                    Alle ({metrics.totalCount})
                </button>
                <button 
                    type="button"
                    onclick={() => filterType = 'missing_time'}
                    class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap {filterType === 'missing_time' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'}"
                >
                    ⏱️ Zeit ({metrics.missingTimeCount})
                </button>
                <button 
                    type="button"
                    onclick={() => filterType = 'missing_tasks'}
                    class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap {filterType === 'missing_tasks' ? 'bg-orange-500 text-white shadow-xs' : 'text-orange-700 hover:bg-orange-50'}"
                >
                    📋 Leistung ({metrics.missingTasksCount})
                </button>
                <button 
                    type="button"
                    onclick={() => filterType = 'missing_report'}
                    class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap {filterType === 'missing_report' ? 'bg-rose-500 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'}"
                >
                    📝 Bericht ({metrics.missingReportCount})
                </button>
            </div>
        </div>

        <!-- BATCH SELECTION BANNER -->
        {#if filteredAppointments.length > 0}
            <div class="bg-neutral-100/90 border-b border-neutral-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <label class="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-neutral-700 select-none">
                    <input 
                        type="checkbox" 
                        checked={filteredAppointments.length > 0 && filteredAppointments.every(a => selectedIds.includes(a.id))} 
                        onchange={toggleAllFiltered} 
                        class="w-4 h-4 text-orange-600 rounded border-neutral-300 focus:ring-orange-500 transition-colors cursor-pointer" 
                        disabled={isProcessing} 
                    />
                    <span>
                        {#if selectedIds.length > 0}
                            {selectedIds.length} von {filteredAppointments.length} ausgewählt
                        {:else}
                            Alle {filteredAppointments.length} gefilterten auswählen
                        {/if}
                    </span>
                </label>

                {#if selectedIds.length > 0}
                    <div class="flex items-center gap-2">
                        <button 
                            type="button" 
                            onclick={markSelectedAsPrivate} 
                            disabled={isProcessing} 
                            class="text-xs font-bold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer min-h-[36px]"
                            title="Ausgewählte als privat markieren (entfernt sie aus der Nachbereitung)"
                        >
                            <Lock class="w-3.5 h-3.5 text-neutral-500" />
                            <span>Als privat markieren</span>
                        </button>
                        <button 
                            type="button" 
                            onclick={deleteSelected} 
                            disabled={isProcessing} 
                            class="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer min-h-[36px]"
                            title="Nur bei Fehlbuchungen oder Duplikaten"
                        >
                            <Trash2 class="w-3.5 h-3.5" />
                            <span>{selectedIds.length} löschen</span>
                        </button>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- CONTENT -->
        <div class="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-neutral-50/60">
            {#if filteredAppointments.length === 0}
                <div class="flex flex-col items-center justify-center py-16 sm:py-20 text-center animate-enter">
                    <div class="w-16 h-16 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-3xl mb-4 shadow-inner">
                        {pastFollowUps.length === 0 ? '🎉' : '🔍'}
                    </div>
                    <p class="font-bold text-lg sm:text-xl text-neutral-900 mb-1">
                        {pastFollowUps.length === 0 ? 'Alles erledigt!' : 'Keine Treffer für Ihre Filter'}
                    </p>
                    <p class="text-xs sm:text-sm text-neutral-500 max-w-sm">
                        {pastFollowUps.length === 0 
                            ? 'Sie haben alle vergangenen Termine vollständig nachbereitet. Zeiten, Leistungen und Berichte liegen vor.' 
                            : 'Passen Sie den Suchbegriff oder den Filter oben an, um andere Termine anzuzeigen.'}
                    </p>
                    {#if searchQuery || filterType !== 'all'}
                        <button 
                            type="button" 
                            onclick={() => { searchQuery = ""; filterType = "all"; }}
                            class="mt-4 px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold rounded-xl transition-colors"
                        >
                            Filter zurücksetzen
                        </button>
                    {/if}
                </div>
            {:else}
                <div class="flex flex-col gap-6">
                    {#each groupedAppointments as group}
                        {@const isCollapsed = collapsedGroups[group.clientName]}
                        {@const allGroupSelected = group.apps.every(a => selectedIds.includes(a.id))}
                        {@const someGroupSelected = group.apps.some(a => selectedIds.includes(a.id))}

                        <div class="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden transition-all">
                            
                            <!-- Group Header -->
                            <div class="px-4 py-3 bg-neutral-50/80 border-b border-neutral-200/80 flex items-center justify-between gap-3">
                                <div class="flex items-center gap-3 min-w-0">
                                    <input 
                                        type="checkbox"
                                        checked={allGroupSelected}
                                        indeterminate={someGroupSelected && !allGroupSelected}
                                        onchange={() => toggleGroupSelection(group.apps)}
                                        class="w-4 h-4 text-orange-600 rounded border-neutral-300 focus:ring-orange-500 cursor-pointer transition-colors shrink-0"
                                        title="Alle für diesen Klienten auswählen"
                                    />
                                    <button 
                                        type="button"
                                        onclick={() => toggleGroupCollapse(group.clientName)}
                                        class="flex items-center gap-2 text-left min-w-0 hover:text-orange-700 transition-colors group cursor-pointer"
                                    >
                                        {#if isCollapsed}
                                            <ChevronRight class="w-4 h-4 text-neutral-400 group-hover:text-orange-600 shrink-0" />
                                        {:else}
                                            <ChevronDown class="w-4 h-4 text-neutral-400 group-hover:text-orange-600 shrink-0" />
                                        {/if}
                                        <div class="w-6 h-6 rounded-md bg-orange-100 text-orange-800 flex items-center justify-center text-xs font-bold shrink-0">
                                            👤
                                        </div>
                                        <span class="text-sm font-bold text-neutral-900 truncate">
                                            {group.clientName}
                                        </span>
                                        <span class="text-xs font-semibold text-neutral-400 shrink-0">
                                            ({group.apps.length})
                                        </span>
                                    </button>
                                </div>

                                <span class="text-[11px] font-bold text-orange-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md shrink-0">
                                    ⚠️ {group.apps.length} offen
                                </span>
                            </div>

                            <!-- Group Appointments -->
                            {#if !isCollapsed}
                                <div class="divide-y divide-neutral-100 p-2 sm:p-3 space-y-2">
                                    {#each group.apps as app}
                                        {@const isMissingTime = checkMissingTime(app)}
                                        {@const isMissingTasks = checkMissingTasks(app)}
                                        {@const isMissingReport = checkMissingReport(app)}
                                        {@const isSelected = selectedIds.includes(app.id)}

                                        <div class="rounded-xl border {isSelected ? 'border-orange-400 bg-orange-50/20' : 'border-neutral-200 hover:border-orange-300 bg-white'} transition-all p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            
                                            <!-- Checkbox + Main Info -->
                                            <div class="flex items-start gap-3 min-w-0 flex-1">
                                                <div class="pt-0.5 shrink-0 flex items-center justify-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected} 
                                                        onchange={() => toggleSelection(app.id)} 
                                                        class="w-5 h-5 text-orange-600 rounded border-neutral-300 focus:ring-orange-500 cursor-pointer transition-colors" 
                                                        disabled={isProcessing} 
                                                    />
                                                </div>

                                                <div class="min-w-0 flex-1">
                                                    <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                                        <span class="text-xs font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200 shadow-2xs">
                                                            📅 {new Date(app.appointment).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                        </span>
                                                        <span class="text-xs font-bold {app.is_private ? 'text-rose-600' : 'text-orange-700'}">
                                                            🕒 {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                                        </span>
                                                    </div>

                                                    <p class="text-xs sm:text-sm font-bold text-neutral-900 line-clamp-1 mb-2">
                                                        {app.description || 'Termin ohne Beschreibung'}
                                                    </p>

                                                    <!-- Missing Warnings -->
                                                    <div class="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                                                        {#if isMissingTime}
                                                            <span class="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md shadow-2xs">
                                                                ⚠️ Zeit fehlt
                                                            </span>
                                                        {:else}
                                                            <span class="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                                ✓ Zeit erfasst
                                                            </span>
                                                        {/if}

                                                        {#if isMissingTasks}
                                                            <span class="bg-orange-100 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-md shadow-2xs">
                                                                ⚠️ Leistung fehlt
                                                            </span>
                                                        {:else}
                                                            <span class="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                                ✓ Leistung erfasst
                                                            </span>
                                                        {/if}

                                                        {#if isMissingReport}
                                                            <span class="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md shadow-2xs">
                                                                ⚠️ Bericht fehlt
                                                            </span>
                                                        {:else}
                                                            <span class="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                                ✓ Bericht vorh.
                                                            </span>
                                                        {/if}
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Actions per item -->
                                            <div class="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-neutral-100 justify-end">
                                                <button 
                                                    type="button" 
                                                    onclick={() => markAsPrivate(app)}
                                                    class="px-2.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl border border-neutral-200 transition-colors flex items-center gap-1 active:scale-95 cursor-pointer min-h-[44px] touch-manipulation"
                                                    title="Als privat markieren (falls kein Klienten-Einsatz)"
                                                >
                                                    <Lock class="w-3.5 h-3.5 text-neutral-500" />
                                                    <span class="hidden sm:inline">Privat</span>
                                                </button>

                                                <button 
                                                    type="button" 
                                                    onclick={() => { close(); onOpenDetail(app.id); }}
                                                    class="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm shadow-orange-600/20 min-h-[44px] touch-manipulation"
                                                    title="Termin öffnen & Zeiten/Bericht nachtragen"
                                                >
                                                    <Edit3 class="w-3.5 h-3.5" />
                                                    <span>Nachbereiten</span>
                                                </button>
                                            </div>

                                        </div>
                                    {/each}
                                </div>
                            {/if}

                        </div>
                    {/each}
                </div>
            {/if}
        </div>
        
        <!-- FOOTER -->
        <div class="p-4 sm:p-5 bg-white border-t border-neutral-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
            <div class="text-xs font-semibold text-neutral-500 text-center sm:text-left">
                {#if selectedIds.length > 0}
                    <span class="text-orange-700 font-bold">{selectedIds.length}</span> Termine ausgewählt
                {:else}
                    {metrics.totalCount} Termine erfordern Nachbereitung
                {/if}
            </div>

            <div class="flex items-center gap-2 w-full sm:w-auto">
                <button 
                    type="button"
                    onclick={close} 
                    class="orga-button-primary bg-neutral-900 hover:bg-neutral-800 text-white w-full sm:w-auto py-2.5 px-6 active:scale-95 text-xs font-bold"
                >
                    Schließen
                </button>
            </div>
        </div>

    </div>
</dialog>