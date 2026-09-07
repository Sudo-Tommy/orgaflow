<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { 
        User, Calendar, Clock, CheckCircle2, AlertTriangle, Search, 
        ChevronDown, ChevronRight, Check, X, CheckCheck, Car, Sparkles
    } from "lucide-svelte";

    interface Props {
        unsettledAppointments: any[];
        onOpenDetail: (id: string) => void;
    }

    let { unsettledAppointments = [], onOpenDetail }: Props = $props();

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    
    let selectedIds = $state<string[]>([]);
    let isProcessing = $state(false);
    let searchQuery = $state("");
    let filterStatus = $state<"all" | "ready" | "incomplete">("all");
    let collapsedGroups = $state<Record<string, boolean>>({});

    // Hilfsfunktion: Berechne erfasste Stunden eines Termins
    function getAppHours(app: any): number {
        const totalMs = (app.expand?.time_record || []).reduce((sum: number, tr: any) => {
            return sum + (tr.start && tr.end ? new Date(tr.end).getTime() - new Date(tr.start).getTime() : 0);
        }, 0);
        return totalMs > 0 ? totalMs / 3600000 : 0;
    }

    // Hilfsfunktion: Berechne erfasste Kilometer eines Termins
    function getAppKm(app: any): number {
        return (app.expand?.drive_record || []).reduce((sum: number, dr: any) => sum + (dr.km || 0), 0);
    }

    // Hilfsfunktion: Prüfe ob Termin abrechnungsbereit ist (Zeiterfassung vorhanden)
    function isAppReady(app: any): boolean {
        const hasTime = app.expand?.time_record && app.expand.time_record.some((tr: any) => tr.start && tr.end);
        const hasTasks = app.expand?.tasks && app.expand.tasks.length > 0;
        return Boolean(hasTime && hasTasks);
    }

    // Gefilterte Termine basierend auf Suche und Filter
    let filteredAppointments = $derived.by(() => {
        const query = searchQuery.trim().toLowerCase();

        return unsettledAppointments.filter((app: any) => {
            // Status-Filter
            if (filterStatus === "ready" && !isAppReady(app)) return false;
            if (filterStatus === "incomplete" && isAppReady(app)) return false;

            // Such-Filter
            if (!query) return true;

            const client = app.expand?.client?.[0];
            const clientName = client ? `${client.name_first || ''} ${client.name_last || ''}`.toLowerCase() : '';
            const desc = (app.description || '').toLowerCase();
            const notes = (app.notes || '').toLowerCase();
            const dateStr = app.appointment ? new Date(app.appointment).toLocaleDateString('de-DE') : '';

            return clientName.includes(query) || desc.includes(query) || notes.includes(query) || dateStr.includes(query);
        });
    });

    // Gruppierung nach Klient
    let groupedAppointments = $derived.by(() => {
        const groups: { 
            clientName: string; 
            clientId?: string;
            totalHours: number;
            totalKm: number;
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
                group = { clientName, clientId, totalHours: 0, totalKm: 0, apps: [] };
                groups.push(group);
            }
            group.apps.push(app);
            group.totalHours += getAppHours(app);
            group.totalKm += getAppKm(app);
        }

        return groups.sort((a, b) => a.clientName.localeCompare(b.clientName));
    });

    // Gesamtmetriken
    let metrics = $derived.by(() => {
        let totalHours = 0;
        let totalKm = 0;
        let readyCount = 0;
        let incompleteCount = 0;

        for (const app of unsettledAppointments) {
            totalHours += getAppHours(app);
            totalKm += getAppKm(app);
            if (isAppReady(app)) {
                readyCount++;
            } else {
                incompleteCount++;
            }
        }

        // Metriken der ausgewählten Termine
        let selectedHours = 0;
        let selectedKm = 0;
        const selectedApps = unsettledAppointments.filter(a => selectedIds.includes(a.id));
        for (const app of selectedApps) {
            selectedHours += getAppHours(app);
            selectedKm += getAppKm(app);
        }

        return {
            totalCount: unsettledAppointments.length,
            readyCount,
            incompleteCount,
            totalHours,
            totalKm,
            selectedHours,
            selectedKm,
            clientCount: groupedAppointments.length
        };
    });

    export function open() {
        selectedIds = [];
        searchQuery = "";
        filterStatus = "all";
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

    // Einzelnen Termin direkt abrechnen
    async function markSingleAsSettled(app: any) {
        const clientName = app.expand?.client?.[0] 
            ? `${app.expand.client[0].name_first} ${app.expand.client[0].name_last}`.trim()
            : 'Termin';
        const dateStr = new Date(app.appointment).toLocaleDateString('de-DE');

        if (!(await confirmStore.ask(
            `Möchten Sie den Termin für "${clientName}" vom ${dateStr} als "abgerechnet" markieren?`,
            "Termin abrechnen?",
            "Abrechnen",
            "Abbrechen",
            false
        ))) return;

        isProcessing = true;
        try {
            await pb.collection('appointments').update(app.id, { settled: true });
            toastStore.success("Termin erfolgreich als abgerechnet markiert.");
            selectedIds = selectedIds.filter(id => id !== app.id);
            if (orgaStore.appointments) await orgaStore.appointments.init();
        } catch (err: any) {
            toastStore.error("Fehler beim Aktualisieren des Termins.");
        } finally {
            isProcessing = false;
        }
    }

    // Ausgewählte Termine als abgerechnet markieren
    async function markSelectedAsSettled() {
        if (selectedIds.length === 0) return;
        if (!(await confirmStore.ask(
            `Möchten Sie ${selectedIds.length} Termine (${metrics.selectedHours.toFixed(1)} Std. / ${metrics.selectedKm.toFixed(0)} km) als "abgerechnet" markieren?`,
            "Termine abrechnen?",
            "Jetzt abrechnen",
            "Abbrechen",
            false
        ))) return;

        isProcessing = true;
        try {
            const promises = selectedIds.map(id => pb.collection('appointments').update(id, { settled: true }));
            for (let i = 0; i < promises.length; i += 20) await Promise.all(promises.slice(i, i + 20));
            toastStore.success(`${selectedIds.length} Termine erfolgreich als abgerechnet markiert.`);
            selectedIds = [];
            if (orgaStore.appointments) await orgaStore.appointments.init();
        } catch (err: any) {
            toastStore.error("Fehler beim Aktualisieren der Termine.");
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
                <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold shadow-inner text-xl sm:text-2xl shrink-0 border border-cyan-100">
                    📄
                </div>
                <div class="min-w-0">
                    <h2 class="text-lg sm:text-xl font-black text-neutral-900 flex items-center gap-2 truncate tracking-tight">
                        Offene Abrechnungen
                    </h2>
                    <p class="text-xs sm:text-sm text-neutral-500 font-medium truncate mt-0.5">
                        Noch nicht in Rechnung gestellte Einsätze
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

        <!-- KPI SUMMARY BAR -->
        <div class="bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div class="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center gap-2.5">
                <span class="text-lg leading-none">📄</span>
                <div class="min-w-0">
                    <p class="text-[10px] font-bold uppercase text-neutral-400 truncate">Offen</p>
                    <p class="font-black text-neutral-900 text-sm">{metrics.totalCount} Termine</p>
                </div>
            </div>
            <div class="p-2.5 rounded-xl bg-cyan-50/60 border border-cyan-100 flex items-center gap-2.5">
                <span class="text-lg leading-none">⏱️</span>
                <div class="min-w-0">
                    <p class="text-[10px] font-bold uppercase text-cyan-700 truncate">Gesamtzeit</p>
                    <p class="font-black text-cyan-950 text-sm">{metrics.totalHours.toFixed(1)} h</p>
                </div>
            </div>
            <div class="p-2.5 rounded-xl bg-teal-50/60 border border-teal-100 flex items-center gap-2.5">
                <span class="text-lg leading-none">🚗</span>
                <div class="min-w-0">
                    <p class="text-[10px] font-bold uppercase text-teal-700 truncate">Fahrstrecke</p>
                    <p class="font-black text-teal-950 text-sm">{metrics.totalKm.toFixed(0)} km</p>
                </div>
            </div>
            <div class="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-2.5">
                <span class="text-lg leading-none">👥</span>
                <div class="min-w-0">
                    <p class="text-[10px] font-bold uppercase text-indigo-700 truncate">Klienten</p>
                    <p class="font-black text-indigo-950 text-sm">{metrics.clientCount} Klienten</p>
                </div>
            </div>
        </div>

        <!-- SEARCH & FILTER CONTROLS -->
        <div class="bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center shrink-0">
            <!-- Search Field -->
            <div class="relative flex-1">
                <Search class="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input 
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Klient, Datum oder Beschreibung suchen..."
                    class="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold bg-neutral-100/80 border border-neutral-200 focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
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
            <div class="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl shrink-0">
                <button 
                    type="button"
                    onclick={() => filterStatus = 'all'}
                    class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all {filterStatus === 'all' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}"
                >
                    Alle ({metrics.totalCount})
                </button>
                <button 
                    type="button"
                    onclick={() => filterStatus = 'ready'}
                    class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all {filterStatus === 'ready' ? 'bg-emerald-500 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'}"
                    title="Zeiten & Leistungen vollständig erfasst"
                >
                    ✓ Bereit ({metrics.readyCount})
                </button>
                <button 
                    type="button"
                    onclick={() => filterStatus = 'incomplete'}
                    class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all {filterStatus === 'incomplete' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'}"
                    title="Zeiten oder Leistungen fehlen noch"
                >
                    ⚠️ Prüfen ({metrics.incompleteCount})
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
                        class="w-4 h-4 text-cyan-600 rounded border-neutral-300 focus:ring-cyan-500 transition-colors cursor-pointer" 
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
                        <span class="text-[11px] font-bold text-neutral-500 hidden sm:inline">
                            Summe: {metrics.selectedHours.toFixed(1)} h • {metrics.selectedKm.toFixed(0)} km
                        </span>
                        <button 
                            type="button" 
                            onclick={markSelectedAsSettled} 
                            disabled={isProcessing} 
                            class="text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 px-3.5 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer min-h-[36px]"
                        >
                            <CheckCheck class="w-4 h-4" />
                            <span>{isProcessing ? 'Verarbeite...' : `${selectedIds.length} als abgerechnet markieren`}</span>
                        </button>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- CONTENT -->
        <div class="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-neutral-50/60">
            {#if filteredAppointments.length === 0}
                <div class="flex flex-col items-center justify-center py-16 sm:py-20 text-center animate-enter">
                    <div class="w-16 h-16 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center text-3xl mb-4 shadow-inner">
                        {unsettledAppointments.length === 0 ? '🙌' : '🔍'}
                    </div>
                    <p class="font-bold text-lg sm:text-xl text-neutral-900 mb-1">
                        {unsettledAppointments.length === 0 ? 'Alles abgerechnet!' : 'Keine Treffer für Ihre Filter'}
                    </p>
                    <p class="text-xs sm:text-sm text-neutral-500 max-w-sm">
                        {unsettledAppointments.length === 0 
                            ? 'Es gibt aktuell keine Termine mehr, für die noch eine Abrechnung aussteht.' 
                            : 'Passen Sie den Suchbegriff oder den Statusfilter oben an, um andere Termine anzuzeigen.'}
                    </p>
                    {#if searchQuery || filterStatus !== 'all'}
                        <button 
                            type="button" 
                            onclick={() => { searchQuery = ""; filterStatus = "all"; }}
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
                                        class="w-4 h-4 text-cyan-600 rounded border-neutral-300 focus:ring-cyan-500 cursor-pointer transition-colors shrink-0"
                                        title="Alle für diesen Klienten auswählen"
                                    />
                                    <button 
                                        type="button"
                                        onclick={() => toggleGroupCollapse(group.clientName)}
                                        class="flex items-center gap-2 text-left min-w-0 hover:text-cyan-700 transition-colors group cursor-pointer"
                                    >
                                        {#if isCollapsed}
                                            <ChevronRight class="w-4 h-4 text-neutral-400 group-hover:text-cyan-600 shrink-0" />
                                        {:else}
                                            <ChevronDown class="w-4 h-4 text-neutral-400 group-hover:text-cyan-600 shrink-0" />
                                        {/if}
                                        <div class="w-6 h-6 rounded-md bg-cyan-100 text-cyan-800 flex items-center justify-center text-xs font-bold shrink-0">
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

                                <!-- Group Totals -->
                                <div class="flex items-center gap-2 shrink-0">
                                    <span class="text-[11px] font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md">
                                        ⏱️ {group.totalHours.toFixed(1)} h
                                    </span>
                                    {#if group.totalKm > 0}
                                        <span class="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md hidden sm:inline">
                                            🚗 {group.totalKm.toFixed(0)} km
                                        </span>
                                    {/if}
                                </div>
                            </div>

                            <!-- Group Appointments -->
                            {#if !isCollapsed}
                                <div class="divide-y divide-neutral-100 p-2 sm:p-3 space-y-2">
                                    {#each group.apps as app}
                                        {@const appHours = getAppHours(app)}
                                        {@const appKm = getAppKm(app)}
                                        {@const taskCount = app.expand?.tasks?.length || 0}
                                        {@const ready = isAppReady(app)}
                                        {@const isSelected = selectedIds.includes(app.id)}

                                        <div class="rounded-xl border {isSelected ? 'border-cyan-400 bg-cyan-50/20' : 'border-neutral-200 hover:border-cyan-300 bg-white'} transition-all p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            
                                            <!-- Checkbox + Main Content -->
                                            <div class="flex items-start gap-3 min-w-0 flex-1">
                                                <div class="pt-0.5 shrink-0 flex items-center justify-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected} 
                                                        onchange={() => toggleSelection(app.id)} 
                                                        class="w-5 h-5 text-cyan-600 rounded border-neutral-300 focus:ring-cyan-500 cursor-pointer transition-colors" 
                                                        disabled={isProcessing} 
                                                    />
                                                </div>

                                                <div class="min-w-0 flex-1">
                                                    <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                                        <span class="text-xs font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200 shadow-2xs">
                                                            📅 {new Date(app.appointment).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                        </span>
                                                        <span class="text-xs font-bold {app.is_private ? 'text-rose-600' : 'text-cyan-700'}">
                                                            🕒 {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                                        </span>
                                                        {#if ready}
                                                            <span class="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                                                                ✓ Bereit
                                                            </span>
                                                        {:else}
                                                            <span class="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                                                                ⚠️ Unvollständig
                                                            </span>
                                                        {/if}
                                                    </div>

                                                    <p class="text-xs sm:text-sm font-bold text-neutral-900 line-clamp-1 mb-2">
                                                        {app.description || 'Regulärer Termin'}
                                                    </p>

                                                    <!-- Indicators -->
                                                    <div class="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                                                        {#if appHours > 0}
                                                            <span class="bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-md">
                                                                ⏱️ {appHours.toFixed(1)} h
                                                            </span>
                                                        {:else}
                                                            <span class="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                                                                ⚠️ Zeit fehlt
                                                            </span>
                                                        {/if}

                                                        {#if taskCount > 0}
                                                            <span class="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                                📋 {taskCount} Leistung{taskCount > 1 ? 'en' : ''}
                                                            </span>
                                                        {:else}
                                                            <span class="bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-md">
                                                                ⚠️ Leistung fehlt
                                                            </span>
                                                        {/if}

                                                        {#if appKm > 0}
                                                            <span class="bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md">
                                                                🚗 {appKm} km
                                                            </span>
                                                        {/if}

                                                        {#if app.report}
                                                            <span class="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md">
                                                                📝 Bericht vorh.
                                                            </span>
                                                        {/if}
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Actions per item -->
                                            <div class="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-neutral-100 justify-end">
                                                <button 
                                                    type="button" 
                                                    onclick={() => markSingleAsSettled(app)}
                                                    class="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1 active:scale-95 cursor-pointer min-h-[44px] touch-manipulation"
                                                    title="Diesen Termin als abgerechnet markieren"
                                                >
                                                    <Check class="w-3.5 h-3.5" />
                                                    <span>Abrechnen</span>
                                                </button>

                                                <button 
                                                    type="button" 
                                                    onclick={() => { close(); onOpenDetail(app.id); }}
                                                    class="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 active:scale-95 cursor-pointer min-h-[44px] touch-manipulation"
                                                    title="Termindetails & Abrechnung prüfen"
                                                >
                                                    <span>Details</span>
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
                    <span class="text-cyan-700 font-bold">{selectedIds.length}</span> Termine zur Abrechnung gewählt ({metrics.selectedHours.toFixed(1)} h)
                {:else}
                    Insgesamt {metrics.totalCount} Termine ausstehend
                {/if}
            </div>

            <div class="flex items-center gap-2 w-full sm:w-auto">
                {#if selectedIds.length > 0}
                    <button 
                        type="button"
                        onclick={markSelectedAsSettled}
                        disabled={isProcessing}
                        class="orga-button-primary bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/20 w-full sm:w-auto py-2.5 px-5 active:scale-95 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                        <CheckCheck class="w-4 h-4" />
                        <span>{selectedIds.length} abrechnen</span>
                    </button>
                {/if}
                <button 
                    type="button"
                    onclick={close} 
                    class="orga-button-ghost bg-neutral-100 hover:bg-neutral-200 text-neutral-700 w-full sm:w-auto py-2.5 px-6 active:scale-95 text-xs font-bold"
                >
                    Schließen
                </button>
            </div>
        </div>

    </div>
</dialog>