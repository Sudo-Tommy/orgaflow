<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { 
        AlertCircle, Calendar, Clock, FileText, CheckCircle2, 
        ChevronDown, ChevronRight, X, ExternalLink, Filter, Search,
        CheckSquare, Square, Sparkles, Check, Lock, Trash2, Edit3
    } from "lucide-svelte";
    import { isAppointmentOwner, sortAppointmentsPrioritizingOwner } from "./calendar/calendarUtils";

    interface Props {
        missingFollowUps?: any[];
        pastFollowUps?: any[];
        onOpenDetail: (id: string) => void;
    }

    let { missingFollowUps, pastFollowUps, onOpenDetail }: Props = $props();

    let items = $derived(missingFollowUps ?? pastFollowUps ?? []);

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    
    let selectedIds = $state<string[]>([]);
    let isProcessing = $state(false);
    let searchQuery = $state("");
    let filterType = $state<"all" | "missing_time" | "missing_tasks" | "missing_report">("all");
    let expandedGroups = $state<Record<string, boolean>>({});
    let expandedAppIds = $state<Record<string, boolean>>({});

    interface BillingFormInfo {
        label: string;
        short: string;
        bgClass: string;
        textClass: string;
        borderClass: string;
    }

    // Hilfsfunktion: Ermittle Abrechnungsform aus Klienten-Notizen / Stammdaten
    function getClientBillingForm(client: any): BillingFormInfo | null {
        if (!client) return null;
        
        const textSources = [
            client.billing_type,
            client.notes,
            client.internal_notes,
            client.payment_type,
            client.contract_type
        ].filter(Boolean).join(" ");

        if (!textSources.trim()) return null;

        const lower = textSources.toLowerCase();

        // Prüfung auf Kombi: Entlastungsleistungen (EL) + Verhinderungspflege (VP / VHP)
        const hasEL = lower.includes("entlastungsleistung") || 
                      lower.includes("entlastungsbetrag") || 
                      lower.includes("45b") || 
                      /\b(el)\b/i.test(textSources);

        const hasVP = lower.includes("verhinderungspflege") || 
                      lower.includes("vhp") || 
                      lower.includes("39") || 
                      /\b(vp)\b/i.test(textSources);

        const hasCareAdvice = lower.includes("pflegeberatung") || 
                              lower.includes("37.3") || 
                              lower.includes("beratungseinsatz");

        const hasPrivat = lower.includes("selbstzahler") || 
                          lower.includes("privatzahler") || 
                          /\b(privat)\b/i.test(textSources);

        if (hasEL && hasVP) {
            return {
                label: "Kombi: EL (§45b) & VHP (§39)",
                short: "EL / VHP",
                bgClass: "bg-purple-50",
                textClass: "text-purple-700",
                borderClass: "border-purple-200"
            };
        }

        if (hasEL) {
            return {
                label: "Entlastungsbetrag §45b SGB XI",
                short: "EL (§45b)",
                bgClass: "bg-emerald-50",
                textClass: "text-emerald-700",
                borderClass: "border-emerald-200"
            };
        }

        if (hasVP) {
            return {
                label: "Verhinderungspflege §39 SGB XI",
                short: "VHP (§39)",
                bgClass: "bg-blue-50",
                textClass: "text-blue-700",
                borderClass: "border-blue-200"
            };
        }

        if (hasCareAdvice) {
            return {
                label: "Pflegeberatung §37.3 SGB XI",
                short: "PB (§37.3)",
                bgClass: "bg-amber-50",
                textClass: "text-amber-700",
                borderClass: "border-amber-200"
            };
        }

        if (hasPrivat) {
            return {
                label: "Privatzahler / Selbstzahler",
                short: "Privat",
                bgClass: "bg-neutral-100",
                textClass: "text-neutral-700",
                borderClass: "border-neutral-200"
            };
        }

        return null;
    }

    // Hilfsfunktionen zur Ermittlung des Nachbereitungsstatus
    function checkMissingTime(app: any): boolean {
        if (!app.expand?.time_record || app.expand.time_record.length === 0) return true;
        return app.expand.time_record.some((tr: any) => !tr.start || !tr.end);
    }

    function checkMissingTasks(app: any): boolean {
        return !app.expand?.tasks || app.expand.tasks.length === 0;
    }

    function checkMissingReport(app: any): boolean {
        return !app.report || app.report.trim() === "";
    }

    function getAppHours(app: any): number {
        if (!app.expand?.time_record || !Array.isArray(app.expand.time_record)) return 0;
        let totalMinutes = 0;
        for (const tr of app.expand.time_record) {
            if (tr.start && tr.end) {
                const s = new Date(tr.start).getTime();
                const e = new Date(tr.end).getTime();
                const diffMin = Math.max(0, (e - s) / 60000) - (tr.break_minutes || 0);
                totalMinutes += Math.max(0, diffMin);
            }
        }
        return totalMinutes / 60;
    }

    function getAppKm(app: any): number {
        if (!app.expand?.drive_record || !Array.isArray(app.expand.drive_record)) return 0;
        return app.expand.drive_record.reduce((sum: number, dr: any) => sum + (Number(dr.km || dr.kilometers) || 0), 0);
    }

    // Gefilterte Termine basierend auf Suche und Filtertyp
    let filteredAppointments = $derived.by(() => {
        const query = searchQuery.trim().toLowerCase();

        return items.filter((app: any) => {
            // Filter nach Typ
            if (filterType === "missing_time" && !checkMissingTime(app)) return false;
            if (filterType === "missing_tasks" && !checkMissingTasks(app)) return false;
            if (filterType === "missing_report" && !checkMissingReport(app)) return false;

            // Such-Filter
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
            client?: any;
        }[] = [];

        for (const app of filteredAppointments) {
            let clientName = "Ohne Klient";
            let clientId: string | undefined = undefined;
            let clientObj: any = undefined;
            if (app.expand?.client?.[0]) {
                const c = app.expand.client[0];
                clientName = `${c.name_first || ''} ${c.name_last || ''}`.trim() || 'Klient ohne Namen';
                clientId = c.id;
                clientObj = c;
            }

            let group = groups.find(g => g.clientName === clientName);
            if (!group) {
                group = { clientName, clientId, apps: [], client: clientObj };
                groups.push(group);
            }
            group.apps.push(app);
        }

        const myId = pb.authStore.model?.id;
        for (const g of groups) {
            g.apps = sortAppointmentsPrioritizingOwner(g.apps, myId);
        }

        return groups.sort((a, b) => {
            const aHasMine = myId ? a.apps.some(app => isAppointmentOwner(app, myId)) : false;
            const bHasMine = myId ? b.apps.some(app => isAppointmentOwner(app, myId)) : false;
            if (aHasMine && !bHasMine) return -1;
            if (!aHasMine && bHasMine) return 1;
            return a.clientName.localeCompare(b.clientName);
        });
    });

    // Metriken
    let metrics = $derived.by(() => {
        let missingTimeCount = 0;
        let missingTasksCount = 0;
        let missingReportCount = 0;

        for (const app of items) {
            if (checkMissingTime(app)) missingTimeCount++;
            if (checkMissingTasks(app)) missingTasksCount++;
            if (checkMissingReport(app)) missingReportCount++;
        }

        return {
            totalCount: items.length,
            missingTimeCount,
            missingTasksCount,
            missingReportCount,
            clientCount: groupedAppointments.length
        };
    });

    export function open() {
        selectedIds = [];
        searchQuery = "";
        filterType = "all";
        expandedAppIds = {};
        expandedGroups = {};
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
        expandedGroups[clientName] = !expandedGroups[clientName];
    }

    function toggleAppExpand(id: string) {
        expandedAppIds[id] = !expandedAppIds[id];
    }

    // Termin als privat markieren (entfernt ihn aus der Nachbereitungsliste)
    async function markAsPrivate(app: any) {
        const clientName = app.expand?.client?.[0] 
            ? `${app.expand.client[0].name_first} ${app.expand.client[0].name_last}`.trim()
            : 'Termin';
        const dateStr = new Date(app.appointment).toLocaleDateString('de-DE');

        if (!(await confirmStore.ask(
            `Möchten Sie den Termin für "${clientName}" vom ${dateStr} als "privat" kennzeichnen? Dadurch wird er nicht mehr in der Nachbereitung angezeigt.`,
            "Termin als privat markieren?",
            "Als privat markieren",
            "Abbrechen",
            false
        ))) return;

        isProcessing = true;
        try {
            await pb.collection('appointments').update(app.id, { is_private: true });
            toastStore.success("Termin als privat markiert.");
            selectedIds = selectedIds.filter(id => id !== app.id);
            if (orgaStore.appointments) await orgaStore.appointments.init();
        } catch (err: any) {
            toastStore.error("Fehler beim Aktualisieren des Termins.");
        } finally {
            isProcessing = false;
        }
    }

    // Termin löschen
    async function deleteSingleAppointment(app: any) {
        const clientName = app.expand?.client?.[0] 
            ? `${app.expand.client[0].name_first} ${app.expand.client[0].name_last}`.trim()
            : 'Termin';
        const dateStr = new Date(app.appointment).toLocaleDateString('de-DE');

        if (!(await confirmStore.ask(
            `Möchten Sie den Termin für "${clientName}" vom ${dateStr} wirklich löschen? Dies kann nicht rückgängig gemacht werden.`,
            "Termin löschen?",
            "Löschen",
            "Abbrechen",
            true
        ))) return;

        isProcessing = true;
        try {
            await pb.collection('appointments').delete(app.id);
            toastStore.success("Termin erfolgreich gelöscht.");
            selectedIds = selectedIds.filter(id => id !== app.id);
            if (orgaStore.appointments) await orgaStore.appointments.init();
        } catch (err: any) {
            toastStore.error("Fehler beim Löschen des Termins.");
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
    class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-3xl m-0 sm:m-auto max-h-dvh sm:max-h-[90dvh] rounded-none sm:rounded-3xl outline-none border-none overflow-hidden" 
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <!-- MODAL CONTAINER (Scrollt komplett als eine Einheit durch, kein Element bleibt statisch) -->
    <div class="bg-neutral-50 sm:rounded-3xl w-full max-h-dvh sm:max-h-[90dvh] overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col shadow-2xl border border-neutral-200">
        
        <!-- KOPFBEREICH (Titel & große KPIs - scrollt natürlich mit) -->
        <div class="bg-white border-b border-neutral-200 shadow-xs w-full">
            <!-- Mobile Drag Indicator -->
            <div class="pt-3 pb-1 sm:hidden flex justify-center shrink-0 bg-white">
                <div class="w-12 h-1.5 bg-neutral-300 rounded-full"></div>
            </div>

            <!-- HEADER -->
            <div class="px-4 sm:px-6 md:px-8 py-3.5 sm:py-5 border-b border-neutral-200 flex items-center justify-between min-w-0">
                <div class="flex items-center gap-3 sm:gap-4 min-w-0 pr-10 sm:pr-0">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold shadow-inner text-xl sm:text-2xl shrink-0 border border-orange-100">
                        ⚠️
                    </div>
                    <div class="min-w-0">
                        <h2 class="text-base sm:text-xl font-black text-neutral-900 flex items-center gap-2 truncate tracking-tight">
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
                    class="absolute top-3.5 right-4 sm:relative sm:top-0 sm:right-0 w-9 h-9 sm:w-10 sm:h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors shadow-sm sm:shadow-none shrink-0 z-10 active:scale-95 touch-manipulation cursor-pointer"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- KPI BREAKDOWN PILLS (Scrollt mit) -->
            <div class="px-3 sm:px-6 py-2.5 sm:py-3 grid grid-cols-3 gap-1.5 sm:gap-2 text-xs min-w-0">
                <button
                    type="button"
                    onclick={() => filterType = filterType === 'missing_time' ? 'all' : 'missing_time'}
                    class="p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer min-w-0 {filterType === 'missing_time' ? 'bg-amber-100 border-amber-300 shadow-xs' : 'bg-amber-50/60 border-amber-100 hover:bg-amber-50'}"
                >
                    <div class="flex items-center justify-between gap-1">
                        <span class="text-sm sm:text-base leading-none">⏱️</span>
                        <span class="text-[11px] sm:text-xs font-black text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded-md shrink-0">{metrics.missingTimeCount}</span>
                    </div>
                    <p class="text-[9px] sm:text-[10px] font-bold uppercase text-amber-800 truncate mt-1">Zeit fehlt</p>
                </button>

                <button
                    type="button"
                    onclick={() => filterType = filterType === 'missing_tasks' ? 'all' : 'missing_tasks'}
                    class="p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer min-w-0 {filterType === 'missing_tasks' ? 'bg-orange-100 border-orange-300 shadow-xs' : 'bg-orange-50/60 border-orange-100 hover:bg-orange-50'}"
                >
                    <div class="flex items-center justify-between gap-1">
                        <span class="text-sm sm:text-base leading-none">📋</span>
                        <span class="text-[11px] sm:text-xs font-black text-orange-900 bg-orange-200/80 px-1.5 py-0.5 rounded-md shrink-0">{metrics.missingTasksCount}</span>
                    </div>
                    <p class="text-[9px] sm:text-[10px] font-bold uppercase text-orange-800 truncate mt-1">Leistung fehlt</p>
                </button>

                <button
                    type="button"
                    onclick={() => filterType = filterType === 'missing_report' ? 'all' : 'missing_report'}
                    class="p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer min-w-0 {filterType === 'missing_report' ? 'bg-rose-100 border-rose-300 shadow-xs' : 'bg-rose-50/60 border-rose-100 hover:bg-rose-50'}"
                >
                    <div class="flex items-center justify-between gap-1">
                        <span class="text-sm sm:text-base leading-none">📝</span>
                        <span class="text-[11px] sm:text-xs font-black text-rose-900 bg-rose-200/80 px-1.5 py-0.5 rounded-md shrink-0">{metrics.missingReportCount}</span>
                    </div>
                    <p class="text-[9px] sm:text-[10px] font-bold uppercase text-rose-800 truncate mt-1">Bericht fehlt</p>
                </button>
            </div>
        </div>

        <!-- STICKY FILTER- & SUCHE-LEISTE (Bleibt beim Scrollen oben angeheftet) -->
        <div class="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-xs">
            <!-- SEARCH & FILTER TOOLBAR -->
            <div class="px-3 sm:px-6 py-2 sm:py-2.5 flex flex-col sm:flex-row gap-2 sm:gap-2.5 justify-between items-stretch sm:items-center min-w-0">
                <!-- Search Field -->
                <div class="relative flex-1 min-w-0">
                    <Search class="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                        type="text"
                        bind:value={searchQuery}
                        placeholder="Klient, Datum oder Bezeichnung suchen..."
                        class="w-full pl-9 pr-8 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-neutral-100/80 border border-neutral-200 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
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
                <div class="flex flex-wrap items-center gap-1 bg-neutral-100 p-1 rounded-xl w-full sm:w-auto">
                    <button 
                        type="button"
                        onclick={() => filterType = 'all'}
                        class="flex-1 sm:flex-none px-2 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all text-center {filterType === 'all' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}"
                    >
                        Alle ({metrics.totalCount})
                    </button>
                    <button 
                        type="button"
                        onclick={() => filterType = 'missing_time'}
                        class="flex-1 sm:flex-none px-2 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all text-center {filterType === 'missing_time' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'}"
                    >
                        ⏱️ Zeit ({metrics.missingTimeCount})
                    </button>
                    <button 
                        type="button"
                        onclick={() => filterType = 'missing_tasks'}
                        class="flex-1 sm:flex-none px-2 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all text-center {filterType === 'missing_tasks' ? 'bg-orange-500 text-white shadow-xs' : 'text-orange-700 hover:bg-orange-50'}"
                    >
                        📋 Leistung ({metrics.missingTasksCount})
                    </button>
                    <button 
                        type="button"
                        onclick={() => filterType = 'missing_report'}
                        class="flex-1 sm:flex-none px-2 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all text-center {filterType === 'missing_report' ? 'bg-rose-500 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'}"
                    >
                        📝 Bericht ({metrics.missingReportCount})
                    </button>
                </div>
            </div>

            <!-- BATCH SELECTION BANNER -->
            {#if filteredAppointments.length > 0}
                <div class="bg-neutral-100/95 border-t border-neutral-200/80 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700 select-none min-w-0">
                        <input 
                            type="checkbox" 
                            checked={filteredAppointments.length > 0 && filteredAppointments.every(a => selectedIds.includes(a.id))} 
                            onchange={toggleAllFiltered} 
                            class="w-4 h-4 text-orange-600 rounded border-neutral-300 focus:ring-orange-500 transition-colors cursor-pointer shrink-0" 
                            disabled={isProcessing} 
                        />
                        <span class="truncate">
                            {#if selectedIds.length > 0}
                                {selectedIds.length} von {filteredAppointments.length} ausgewählt
                            {:else}
                                Alle {filteredAppointments.length} auswählen
                            {/if}
                        </span>
                    </label>

                    {#if selectedIds.length > 0}
                        <div class="flex items-center gap-2 flex-wrap">
                            <button 
                                type="button" 
                                onclick={markSelectedAsPrivate} 
                                disabled={isProcessing} 
                                class="text-xs font-bold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer min-h-[34px]"
                                title="Ausgewählte als privat markieren (entfernt sie aus der Nachbereitung)"
                            >
                                <Lock class="w-3.5 h-3.5 text-neutral-500" />
                                <span>Als privat</span>
                            </button>
                            <button 
                                type="button" 
                                onclick={deleteSelected} 
                                disabled={isProcessing} 
                                class="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer min-h-[34px]"
                                title="Nur bei Fehlbuchungen oder Duplikaten"
                            >
                                <Trash2 class="w-3.5 h-3.5" />
                                <span>{selectedIds.length} löschen</span>
                            </button>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <!-- CONTENT (Fließt im gesamten Modal mit) -->
        <div class="p-3 sm:p-6 bg-neutral-50/60 w-full flex-1">
            {#if filteredAppointments.length === 0}
                <div class="flex flex-col items-center justify-center py-12 sm:py-20 text-center animate-enter px-2">
                    <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-2xl sm:text-3xl mb-3 shadow-inner">
                        {items.length === 0 ? '🎉' : '🔍'}
                    </div>
                    <p class="font-bold text-base sm:text-xl text-neutral-900 mb-1">
                        {items.length === 0 ? 'Alles erledigt!' : 'Keine Treffer für Ihre Filter'}
                    </p>
                    <p class="text-xs sm:text-sm text-neutral-500 max-w-sm">
                        {items.length === 0 
                            ? 'Aktuell stehen keine Termine zur Nachbereitung aus. Großartige Arbeit!' 
                            : 'Passen Sie den Suchbegriff oder den Filter oben an, um andere Termine anzuzeigen.'}
                    </p>
                    {#if searchQuery || filterType !== 'all'}
                        <button 
                            type="button" 
                            onclick={() => { searchQuery = ""; filterType = "all"; }}
                            class="mt-4 px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                            Filter zurücksetzen
                        </button>
                    {/if}
                </div>
            {:else}
                <div class="flex flex-col gap-4 sm:gap-6 min-w-0">
                    {#each groupedAppointments as group}
                        {@const isCollapsed = !expandedGroups[group.clientName]}
                        {@const allGroupSelected = group.apps.every(a => selectedIds.includes(a.id))}
                        {@const someGroupSelected = group.apps.some(a => selectedIds.includes(a.id))}
                        {@const billingForm = getClientBillingForm(group.client || group.apps[0]?.expand?.client?.[0])}

                        <div class="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden transition-all min-w-0">
                            
                            <!-- Group Header -->
                            <div class="px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-50/80 border-b border-neutral-200/80 flex items-center justify-between gap-2 min-w-0">
                                <div class="flex items-center gap-2.5 min-w-0 flex-1">
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
                                        class="flex items-center gap-2 text-left min-w-0 hover:text-orange-700 transition-colors group cursor-pointer flex-1"
                                    >
                                        {#if isCollapsed}
                                            <ChevronRight class="w-4 h-4 text-neutral-400 group-hover:text-orange-600 shrink-0" />
                                        {:else}
                                            <ChevronDown class="w-4 h-4 text-neutral-400 group-hover:text-orange-600 shrink-0" />
                                        {/if}
                                        <div class="w-6 h-6 rounded-md bg-orange-100 text-orange-800 flex items-center justify-center text-xs font-bold shrink-0">
                                            👤
                                        </div>
                                        <span class="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                                            {group.clientName}
                                        </span>
                                        {#if billingForm}
                                            <span 
                                                class="text-[9px] sm:text-[10px] font-extrabold {billingForm.bgClass} {billingForm.textClass} border {billingForm.borderClass} px-1.5 py-0.5 rounded-md shrink-0 shadow-2xs" 
                                                title={`Abrechnungsform: ${billingForm.label}`} 
                                            >
                                                {billingForm.short}
                                            </span>
                                        {/if}
                                        <span class="text-[11px] font-semibold text-neutral-400 shrink-0">
                                            ({group.apps.length})
                                        </span>
                                    </button>
                                </div>

                                <span class="text-[10px] sm:text-[11px] font-bold text-orange-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md shrink-0">
                                    ⚠️ {group.apps.length} offen
                                </span>
                            </div>

                            <!-- Group Appointments -->
                            {#if !isCollapsed}
                                <div class="divide-y divide-neutral-100 p-2 sm:p-3 space-y-2 min-w-0">
                                    {#each group.apps as app (app.id)}
                                        {@const isMissingTime = checkMissingTime(app)}
                                        {@const isMissingTasks = checkMissingTasks(app)}
                                        {@const isMissingReport = checkMissingReport(app)}
                                        {@const appHours = getAppHours(app)}
                                        {@const appKm = getAppKm(app)}
                                        {@const taskCount = app.expand?.tasks?.length || 0}
                                        {@const isSelected = selectedIds.includes(app.id)}
                                        {@const isOwner = isAppointmentOwner(app, pb.authStore.model?.id)}
                                        {@const isAppExpanded = Boolean(expandedAppIds[app.id])}

                                        <div class="rounded-2xl border {isSelected ? 'border-orange-400 bg-orange-50/25 shadow-xs' : (isOwner ? 'border-l-4 border-l-indigo-600 border-neutral-200/90 bg-white hover:border-orange-300' : 'border-neutral-200/90 bg-white hover:border-orange-300')} transition-all p-3 sm:p-3.5 flex flex-col shadow-2xs hover:shadow-xs min-w-0">
                                            
                                            <!-- Main Card Header Row -->
                                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 min-w-0">
                                                <!-- Checkbox + Info Body -->
                                                <div class="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                                                    <div class="pt-0.5 shrink-0 flex items-center justify-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected} 
                                                            onchange={() => toggleSelection(app.id)} 
                                                            class="w-4 h-4 sm:w-4.5 sm:h-4.5 text-orange-600 rounded border-neutral-300 focus:ring-orange-500 cursor-pointer transition-colors" 
                                                            disabled={isProcessing} 
                                                        />
                                                    </div>

                                                    <div 
                                                        class="min-w-0 flex-1 cursor-pointer select-none" 
                                                        onclick={() => toggleAppExpand(app.id)}
                                                        role="button"
                                                        tabindex="0"
                                                        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAppExpand(app.id); } }}
                                                    >
                                                        <div class="flex flex-wrap items-center gap-1.5 mb-1 min-w-0">
                                                            {#if isOwner}
                                                                <span class="text-[9px] sm:text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-1.5 py-0.5 rounded-md">
                                                                    👤 Mein Termin
                                                                </span>
                                                            {/if}
                                                            <span class="text-[11px] sm:text-xs font-bold text-neutral-800 bg-neutral-100/90 px-2 py-0.5 rounded-md border border-neutral-200/80">
                                                                📅 {new Date(app.appointment).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                                            </span>
                                                            <span class="text-[11px] sm:text-xs font-bold {app.is_private ? 'text-rose-600' : 'text-orange-700'}">
                                                                🕒 {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            {#if app.is_private}
                                                                <span class="text-[9px] sm:text-[10px] font-extrabold bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-md border border-rose-200">
                                                                    🔒 Privat
                                                                </span>
                                                            {/if}
                                                        </div>

                                                        <div class="flex items-center gap-2 min-w-0">
                                                            <p class="text-xs sm:text-sm font-bold text-neutral-900 truncate hover:text-orange-700 transition-colors flex-1 min-w-0">
                                                                {app.description || 'Termin ohne Beschreibung'}
                                                            </p>
                                                            <ChevronDown class="w-4 h-4 text-neutral-400 transition-transform duration-300 shrink-0 {isAppExpanded ? 'rotate-180 text-orange-600' : ''}" />
                                                        </div>

                                                        <!-- Missing Warnings & Status Pills -->
                                                        <div class="flex flex-wrap gap-1.5 text-[10px] font-semibold mt-1.5 min-w-0">
                                                            {#if isMissingTime}
                                                                <span class="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                                                                    ⚠️ Zeit fehlt
                                                                </span>
                                                            {:else}
                                                                <span class="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                                    ✓ {appHours > 0 ? `${appHours.toFixed(1)} h` : 'Zeit erfasst'}
                                                                </span>
                                                            {/if}

                                                            {#if isMissingTasks}
                                                                <span class="bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-md">
                                                                    ⚠️ Leistung fehlt
                                                                </span>
                                                            {:else}
                                                                <span class="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                                    ✓ {taskCount} {taskCount === 1 ? 'Leistung' : 'Leistungen'}
                                                                </span>
                                                            {/if}

                                                            {#if isMissingReport}
                                                                <span class="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md">
                                                                    ⚠️ Bericht fehlt
                                                                </span>
                                                            {:else}
                                                                <span class="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                                    ✓ Bericht vorh.
                                                                </span>
                                                            {/if}

                                                            {#if appKm > 0}
                                                                <span class="bg-teal-50/80 text-teal-800 border border-teal-200/80 px-2 py-0.5 rounded-md">
                                                                    🚗 {appKm} km
                                                                </span>
                                                            {/if}
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Actions per item -->
                                                <div class="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-neutral-100 justify-end flex-wrap">
                                                    <button 
                                                        type="button" 
                                                        onclick={() => markAsPrivate(app)}
                                                        class="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 active:scale-95 cursor-pointer min-h-[36px] touch-manipulation"
                                                        title="Als privat markieren (entfernt ihn aus der Nachbereitung)"
                                                    >
                                                        <Lock class="w-3.5 h-3.5 text-neutral-500" />
                                                        <span class="hidden sm:inline">Privat</span>
                                                    </button>

                                                    <button 
                                                        type="button" 
                                                        onclick={() => { close(); onOpenDetail(app.id); }}
                                                        class="px-3 sm:px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm shadow-orange-600/20 min-h-[36px] touch-manipulation"
                                                        title="Termin öffnen & Zeiten/Bericht nachtragen"
                                                    >
                                                        <Edit3 class="w-3.5 h-3.5" />
                                                        <span>Nachbereiten</span>
                                                    </button>

                                                    <button 
                                                        type="button" 
                                                        onclick={() => toggleAppExpand(app.id)}
                                                        class="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer min-h-[36px] flex items-center justify-center"
                                                        title={isAppExpanded ? "Details zuklappen" : "Details aufklappen"}
                                                    >
                                                        <ChevronDown class="w-4 h-4 transition-transform duration-300 {isAppExpanded ? 'rotate-180 text-orange-600' : ''}" />
                                                    </button>
                                                </div>
                                            </div>

                                            <!-- AUFKLAPPBARER DETAILBEREICH (Elegantes Accordion) -->
                                            {#if isAppExpanded}
                                                <div class="mt-3 pt-3 border-t border-neutral-100 text-xs flex flex-col gap-2.5 min-w-0">
                                                    <!-- Vollständige Beschreibung falls vorhanden -->
                                                    {#if app.description}
                                                        <div class="bg-neutral-50/80 p-3 rounded-xl border border-neutral-200/80 min-w-0">
                                                            <span class="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Beschreibung:</span>
                                                            <p class="text-xs text-neutral-900 font-medium whitespace-pre-wrap break-words">{app.description}</p>
                                                        </div>
                                                    {/if}

                                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 min-w-0">
                                                        <!-- Zeiterfassung Status -->
                                                        <div class="p-3 rounded-xl border min-w-0 {isMissingTime ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-emerald-50/50 border-emerald-200 text-emerald-900'}">
                                                            <div class="flex items-center justify-between font-bold mb-1.5 pb-1 border-b border-current/10">
                                                                <span class="flex items-center gap-1.5">⏱️ Arbeitszeit:</span>
                                                                <span class="text-[10px] uppercase font-black">{isMissingTime ? 'Fehlt' : `${appHours > 0 ? `${appHours.toFixed(1)} Std.` : 'Erfasst'}`}</span>
                                                            </div>
                                                            {#if app.expand?.time_record && app.expand.time_record.length > 0}
                                                                <ul class="space-y-1 text-[11px] min-w-0">
                                                                    {#each app.expand.time_record as tr}
                                                                        <li class="flex items-center justify-between gap-1 py-0.5">
                                                                            <span class="font-medium">{new Date(tr.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} - {tr.end ? new Date(tr.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Offen'} Uhr</span>
                                                                            {#if tr.break_minutes}
                                                                                <span class="text-neutral-500 text-[10px] shrink-0 font-normal">({tr.break_minutes} Min. Pause)</span>
                                                                            {/if}
                                                                        </li>
                                                                    {/each}
                                                                </ul>
                                                            {:else}
                                                                <p class="text-[11px] text-amber-800 font-medium">Für diesen Termin wurde noch keine Zeit gestoppt oder erfasst.</p>
                                                            {/if}
                                                        </div>

                                                        <!-- Leistungen Status -->
                                                        <div class="p-3 rounded-xl border min-w-0 {isMissingTasks ? 'bg-orange-50/70 border-orange-200 text-orange-900' : 'bg-emerald-50/50 border-emerald-200 text-emerald-900'}">
                                                            <div class="flex items-center justify-between font-bold mb-1.5 pb-1 border-b border-current/10">
                                                                <span class="flex items-center gap-1.5">📋 Leistungen:</span>
                                                                <span class="text-[10px] uppercase font-black">{isMissingTasks ? 'Fehlt' : `${taskCount} erfasst`}</span>
                                                            </div>
                                                            {#if app.expand?.tasks && app.expand.tasks.length > 0}
                                                                <ul class="space-y-1 text-[11px] min-w-0">
                                                                    {#each app.expand.tasks as t}
                                                                        <li class="flex items-center gap-1.5 break-words py-0.5 font-medium">
                                                                            <span class="text-emerald-600 font-bold">✓</span>
                                                                            <span>{t.title || t.name || 'Leistung'}</span>
                                                                        </li>
                                                                    {/each}
                                                                </ul>
                                                            {:else}
                                                                <p class="text-[11px] text-orange-800 font-medium">Es sind noch keine erbrachten Einzelleistungen zugewiesen.</p>
                                                            {/if}
                                                        </div>
                                                    </div>

                                                    <!-- Fahrten falls vorhanden -->
                                                    {#if app.expand?.drive_record && app.expand.drive_record.length > 0}
                                                        <div class="p-3 rounded-xl bg-teal-50/60 border border-teal-200 text-teal-950 min-w-0">
                                                            <div class="flex items-center justify-between font-bold mb-1 pb-1 border-b border-teal-200/60">
                                                                <span class="text-[10px] font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1">🚗 Fahrtkilometer:</span>
                                                                <span class="text-[10px] font-extrabold text-teal-900">{appKm} km gesamt</span>
                                                            </div>
                                                            <ul class="space-y-1 text-[11px] min-w-0">
                                                                {#each app.expand.drive_record as dr}
                                                                    <li class="flex items-center justify-between gap-1 break-words py-0.5">
                                                                        <span class="font-semibold text-teal-900">{dr.km || dr.kilometers || 0} km</span>
                                                                        {#if dr.start_location}
                                                                            <span class="text-neutral-500 text-[10px]">({dr.start_location} ➔ {dr.end_location || 'Ziel'})</span>
                                                                        {/if}
                                                                    </li>
                                                                {/each}
                                                            </ul>
                                                        </div>
                                                    {/if}

                                                    <!-- Dokumentation / Bericht falls vorhanden -->
                                                    {#if app.report || app.notes || app.internal_notes}
                                                        <div class="p-3 rounded-xl bg-indigo-50/40 border border-indigo-200 text-indigo-950 min-w-0">
                                                            <span class="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">📝 Notizen & Dokumentation:</span>
                                                            <p class="text-[11px] text-neutral-800 whitespace-pre-wrap break-words italic leading-relaxed">{app.report || app.notes || app.internal_notes}</p>
                                                        </div>
                                                    {/if}

                                                    <!-- Klienten-Informationen (responsiv umbrechend) -->
                                                    {#if app.expand?.client?.[0]}
                                                        {@const cl = app.expand.client[0]}
                                                        <div class="p-2.5 rounded-xl bg-neutral-100/80 border border-neutral-200/80 text-neutral-700 flex flex-wrap items-center justify-between gap-1.5 text-[11px] min-w-0">
                                                            <div class="min-w-0">
                                                                <span class="font-bold text-neutral-900">👤 {cl.name_first || ''} {cl.name_last || ''}</span>
                                                                {#if cl.care_level}
                                                                    <span class="ml-2 font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.2 rounded">PG {cl.care_level}</span>
                                                                {/if}
                                                                {#if cl.insurance_carrier}
                                                                    <span class="ml-1.5 text-neutral-500">({cl.insurance_carrier})</span>
                                                                {/if}
                                                            </div>
                                                            {#if cl.street || cl.city}
                                                                <div class="text-neutral-500 break-words min-w-0">
                                                                    📍 {cl.street || ''} {cl.housenr || ''}, {cl.zip || ''} {cl.city || ''}
                                                                </div>
                                                            {/if}
                                                            {#if cl.phone || cl.handy}
                                                                <div class="font-semibold text-neutral-600 shrink-0">
                                                                    📞 {cl.phone || cl.handy}
                                                                </div>
                                                            {/if}
                                                        </div>
                                                    {/if}
                                                </div>
                                            {/if}

                                        </div>
                                    {/each}
                                </div>
                            {/if}

                        </div>
                    {/each}
                </div>
            {/if}
        </div>
        
        <!-- FOOTER (Am Ende der Liste, scrollt mit) -->
        <div class="p-3.5 sm:p-5 bg-white border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] w-full mt-auto shrink-0">
            <div class="text-xs font-semibold text-neutral-500 text-center sm:text-left truncate min-w-0">
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
                    class="orga-button-primary bg-neutral-900 hover:bg-neutral-800 text-white w-full sm:w-auto py-2.5 px-6 active:scale-95 text-xs font-bold cursor-pointer"
                >
                    Schließen
                </button>
            </div>
        </div>

    </div>
</dialog>