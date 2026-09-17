<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { 
        User, Calendar, Clock, CheckCircle2, AlertTriangle, Search, 
        ChevronDown, ChevronRight, Check, X, CheckCheck, Car, Sparkles,
        FileText, ExternalLink
    } from "lucide-svelte";
    import { isAppointmentOwner, sortAppointmentsPrioritizingOwner } from "./calendar/calendarUtils";

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

    // Hilfsfunktion: Berechne erfasste Stunden eines Termins
    function getAppHours(app: any): number {
        const totalMs = (app.expand?.time_record || []).reduce((sum: number, tr: any) => {
            return sum + (tr.start && tr.end ? new Date(tr.end).getTime() - new Date(tr.start).getTime() : 0);
        }, 0);
        return totalMs > 0 ? totalMs / 3600000 : 0;
    }

    // Hilfsfunktion: Berechne erfasste Kilometer eines Termins
    function getAppKm(app: any): number {
        return (app.expand?.drive_record || []).reduce((sum: number, dr: any) => sum + (dr.km || dr.kilometers || 0), 0);
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
                group = { clientName, clientId, totalHours: 0, totalKm: 0, apps: [], client: clientObj };
                groups.push(group);
            }
            group.apps.push(app);
            group.totalHours += getAppHours(app);
            group.totalKm += getAppKm(app);
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
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold shadow-inner text-xl sm:text-2xl shrink-0 border border-cyan-100">
                        📄
                    </div>
                    <div class="min-w-0">
                        <h2 class="text-base sm:text-xl font-black text-neutral-900 flex items-center gap-2 truncate tracking-tight">
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
                    class="absolute top-3.5 right-4 sm:relative sm:top-0 sm:right-0 w-9 h-9 sm:w-10 sm:h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors shadow-sm sm:shadow-none shrink-0 z-10 active:scale-95 touch-manipulation cursor-pointer"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- KPI SUMMARY BAR (Scrollt mit) -->
            <div class="px-3 sm:px-6 py-2.5 sm:py-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-xs min-w-0">
                <div class="p-2 sm:p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center gap-2 min-w-0">
                    <span class="text-base sm:text-lg leading-none shrink-0">📄</span>
                    <div class="min-w-0">
                        <p class="text-[9px] sm:text-[10px] font-bold uppercase text-neutral-400 truncate">Offen</p>
                        <p class="font-black text-neutral-900 text-xs sm:text-sm truncate">{metrics.totalCount} Termine</p>
                    </div>
                </div>
                <div class="p-2 sm:p-2.5 rounded-xl bg-cyan-50/60 border border-cyan-100 flex items-center gap-2 min-w-0">
                    <span class="text-base sm:text-lg leading-none shrink-0">⏱️</span>
                    <div class="min-w-0">
                        <p class="text-[9px] sm:text-[10px] font-bold uppercase text-cyan-700 truncate">Gesamtzeit</p>
                        <p class="font-black text-cyan-950 text-xs sm:text-sm truncate">{metrics.totalHours.toFixed(1)} h</p>
                    </div>
                </div>
                <div class="p-2 sm:p-2.5 rounded-xl bg-teal-50/60 border border-teal-100 flex items-center gap-2 min-w-0">
                    <span class="text-base sm:text-lg leading-none shrink-0">🚗</span>
                    <div class="min-w-0">
                        <p class="text-[9px] sm:text-[10px] font-bold uppercase text-teal-700 truncate">Fahrstrecke</p>
                        <p class="font-black text-teal-950 text-xs sm:text-sm truncate">{metrics.totalKm.toFixed(0)} km</p>
                    </div>
                </div>
                <div class="p-2 sm:p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-2 min-w-0">
                    <span class="text-base sm:text-lg leading-none shrink-0">👥</span>
                    <div class="min-w-0">
                        <p class="text-[9px] sm:text-[10px] font-bold uppercase text-indigo-700 truncate">Klienten</p>
                        <p class="font-black text-indigo-950 text-xs sm:text-sm truncate">{metrics.clientCount} Klienten</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- STICKY FILTER- & SUCHE-LEISTE (Bleibt beim Scrollen oben angeheftet) -->
        <div class="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-xs">
            <!-- SEARCH & FILTER CONTROLS -->
            <div class="px-3 sm:px-6 py-2 sm:py-2.5 flex flex-col sm:flex-row gap-2 sm:gap-2.5 justify-between items-stretch sm:items-center min-w-0">
                <!-- Search Field -->
                <div class="relative flex-1 min-w-0">
                    <Search class="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                        type="text" 
                        bind:value={searchQuery}
                        placeholder="Klient, Datum oder Beschreibung suchen..."
                        class="w-full pl-9 pr-8 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-neutral-100/80 border border-neutral-200 focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
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
                        onclick={() => filterStatus = 'all'}
                        class="flex-1 sm:flex-none px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all text-center {filterStatus === 'all' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}"
                    >
                        Alle ({metrics.totalCount})
                    </button>
                    <button 
                        type="button"
                        onclick={() => filterStatus = 'ready'}
                        class="flex-1 sm:flex-none px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all text-center {filterStatus === 'ready' ? 'bg-emerald-500 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'}"
                        title="Zeiten & Leistungen vollständig erfasst"
                    >
                        ✓ Bereit ({metrics.readyCount})
                    </button>
                    <button 
                        type="button"
                        onclick={() => filterStatus = 'incomplete'}
                        class="flex-1 sm:flex-none px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all text-center {filterStatus === 'incomplete' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'}"
                        title="Zeiten oder Leistungen fehlen noch"
                    >
                        ⚠️ Prüfen ({metrics.incompleteCount})
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
                            class="w-4 h-4 text-cyan-600 rounded border-neutral-300 focus:ring-cyan-500 transition-colors cursor-pointer shrink-0" 
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
                            <span class="text-[11px] font-bold text-neutral-500 hidden sm:inline">
                                Summe: {metrics.selectedHours.toFixed(1)} h • {metrics.selectedKm.toFixed(0)} km
                            </span>
                            <button 
                                type="button" 
                                onclick={markSelectedAsSettled} 
                                disabled={isProcessing} 
                                class="text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 px-3 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer min-h-[34px]"
                            >
                                <CheckCheck class="w-4 h-4" />
                                <span>{isProcessing ? 'Verarbeite...' : `${selectedIds.length} abrechnen`}</span>
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
                    <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center text-2xl sm:text-3xl mb-3 shadow-inner">
                        {unsettledAppointments.length === 0 ? '🙌' : '🔍'}
                    </div>
                    <p class="font-bold text-base sm:text-xl text-neutral-900 mb-1">
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
                                        class="w-4 h-4 text-cyan-600 rounded border-neutral-300 focus:ring-cyan-500 cursor-pointer transition-colors shrink-0" 
                                        title="Alle für diesen Klienten auswählen" 
                                    />
                                    <button 
                                        type="button" 
                                        onclick={() => toggleGroupCollapse(group.clientName)} 
                                        class="flex items-center gap-2 text-left min-w-0 hover:text-cyan-700 transition-colors group cursor-pointer flex-1"
                                    >
                                        {#if isCollapsed}
                                            <ChevronRight class="w-4 h-4 text-neutral-400 group-hover:text-cyan-600 shrink-0" />
                                        {:else}
                                            <ChevronDown class="w-4 h-4 text-neutral-400 group-hover:text-cyan-600 shrink-0" />
                                        {/if}
                                        <div class="w-6 h-6 rounded-md bg-cyan-100 text-cyan-800 flex items-center justify-center text-xs font-bold shrink-0">
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

                                <!-- Group Totals -->
                                <div class="flex items-center gap-1.5 shrink-0">
                                    <span class="text-[10px] sm:text-[11px] font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md">
                                        ⏱️ {group.totalHours.toFixed(1)} h
                                    </span>
                                    {#if group.totalKm > 0}
                                        <span class="text-[10px] sm:text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md hidden sm:inline">
                                            🚗 {group.totalKm.toFixed(0)} km
                                        </span>
                                    {/if}
                                </div>
                            </div>

                            <!-- Group Appointments -->
                            {#if !isCollapsed}
                                <div class="divide-y divide-neutral-100 p-2 sm:p-3 space-y-2 min-w-0">
                                    {#each group.apps as app}
                                        {@const appHours = getAppHours(app)}
                                        {@const appKm = getAppKm(app)}
                                        {@const taskCount = app.expand?.tasks?.length || 0}
                                        {@const ready = isAppReady(app)}
                                        {@const isSelected = selectedIds.includes(app.id)}
                                        {@const isOwner = isAppointmentOwner(app, pb.authStore.model?.id)}
                                        {@const isAppExpanded = Boolean(expandedAppIds[app.id])}

                                        <div class="rounded-2xl border {isSelected ? 'border-cyan-400 bg-cyan-50/25 shadow-xs' : (isOwner ? 'border-l-4 border-l-indigo-600 border-neutral-200/90 bg-white hover:border-cyan-300' : 'border-neutral-200/90 bg-white hover:border-cyan-300')} transition-all p-3 sm:p-3.5 flex flex-col shadow-2xs hover:shadow-xs min-w-0">
                                            
                                            <!-- Main Card Header Row -->
                                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 min-w-0">
                                                <!-- Checkbox + Info Body -->
                                                <div class="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                                                    <div class="pt-0.5 shrink-0 flex items-center justify-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected} 
                                                            onchange={() => toggleSelection(app.id)} 
                                                            class="w-4 h-4 sm:w-4.5 sm:h-4.5 text-cyan-600 rounded border-neutral-300 focus:ring-cyan-500 cursor-pointer transition-colors" 
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
                                                            <span class="text-[11px] sm:text-xs font-bold {app.is_private ? 'text-rose-600' : 'text-cyan-700'}">
                                                                🕒 {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            {#if ready}
                                                                <span class="text-[9px] sm:text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md border border-emerald-200">
                                                                    ✓ Bereit
                                                                </span>
                                                            {:else}
                                                                <span class="text-[9px] sm:text-[10px] font-extrabold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md border border-amber-200">
                                                                    ⚠️ Prüfen
                                                                </span>
                                                            {/if}
                                                        </div>

                                                        <div class="flex items-center gap-2 min-w-0">
                                                            <p class="text-xs sm:text-sm font-bold text-neutral-900 truncate hover:text-cyan-700 transition-colors flex-1 min-w-0">
                                                                {app.description || 'Regulärer Einsatz'}
                                                            </p>
                                                            <ChevronDown class="w-4 h-4 text-neutral-400 transition-transform duration-300 shrink-0 {isAppExpanded ? 'rotate-180 text-cyan-600' : ''}" />
                                                        </div>

                                                        <!-- Status Indicators (Pills) -->
                                                        <div class="flex flex-wrap gap-1.5 text-[10px] font-semibold mt-1.5 min-w-0">
                                                            {#if appHours > 0}
                                                                <span class="bg-cyan-50/80 text-cyan-800 border border-cyan-200/80 px-2 py-0.5 rounded-md">
                                                                    ⏱️ {appHours.toFixed(1)} h
                                                                </span>
                                                            {:else}
                                                                <span class="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                                                                    ⚠️ Zeit fehlt
                                                                </span>
                                                            {/if}

                                                            {#if taskCount > 0}
                                                                <span class="bg-emerald-50/80 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                                                                    📋 {taskCount} {taskCount === 1 ? 'Leistung' : 'Leistungen'}
                                                                </span>
                                                            {:else}
                                                                <span class="bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-md">
                                                                    ⚠️ Leistung fehlt
                                                                </span>
                                                            {/if}

                                                            {#if appKm > 0}
                                                                <span class="bg-teal-50/80 text-teal-800 border border-teal-200/80 px-2 py-0.5 rounded-md">
                                                                    🚗 {appKm} km
                                                                </span>
                                                            {/if}

                                                            {#if app.report}
                                                                <span class="bg-indigo-50/80 text-indigo-800 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                                                                    📝 Bericht
                                                                </span>
                                                            {/if}
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Actions per item -->
                                                <div class="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-neutral-100 justify-end flex-wrap">
                                                    <button 
                                                        type="button" 
                                                        onclick={() => markSingleAsSettled(app)} 
                                                        class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200/80 transition-all flex items-center gap-1 active:scale-95 cursor-pointer min-h-[36px] touch-manipulation shadow-2xs" 
                                                        title="Diesen Termin direkt als abgerechnet markieren"
                                                    >
                                                        <Check class="w-3.5 h-3.5" />
                                                        <span>Abrechnen</span>
                                                    </button>

                                                    <button 
                                                        type="button" 
                                                        onclick={() => { close(); onOpenDetail(app.id); }} 
                                                        class="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 active:scale-95 cursor-pointer min-h-[36px] touch-manipulation" 
                                                        title="Termindetails & Abrechnung prüfen"
                                                    >
                                                        <span>Details</span>
                                                    </button>

                                                    <button 
                                                        type="button" 
                                                        onclick={() => toggleAppExpand(app.id)}
                                                        class="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer min-h-[36px] flex items-center justify-center"
                                                        title={isAppExpanded ? "Details zuklappen" : "Details aufklappen"}
                                                    >
                                                        <ChevronDown class="w-4 h-4 transition-transform duration-300 {isAppExpanded ? 'rotate-180 text-cyan-600' : ''}" />
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
                                                        <!-- Zeiterfassung Abrechnungsdaten -->
                                                        <div class="p-3 rounded-xl border min-w-0 {appHours === 0 ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-cyan-50/50 border-cyan-200 text-cyan-950'}">
                                                            <div class="flex items-center justify-between font-bold mb-1.5 pb-1 border-b border-current/10">
                                                                <span class="flex items-center gap-1.5">⏱️ Arbeitszeit:</span>
                                                                <span class="text-[10px] uppercase font-black">{appHours > 0 ? `${appHours.toFixed(1)} Std.` : 'Fehlt'}</span>
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
                                                                <p class="text-[11px] text-amber-800 font-medium">Für diesen Termin wurde noch keine Zeit erfasst.</p>
                                                            {/if}
                                                        </div>

                                                        <!-- Leistungen Abrechnungsdaten -->
                                                        <div class="p-3 rounded-xl border min-w-0 {taskCount === 0 ? 'bg-orange-50/70 border-orange-200 text-orange-900' : 'bg-emerald-50/50 border-emerald-200 text-emerald-900'}">
                                                            <div class="flex items-center justify-between font-bold mb-1.5 pb-1 border-b border-current/10">
                                                                <span class="flex items-center gap-1.5">📋 Leistungen:</span>
                                                                <span class="text-[10px] uppercase font-black">{taskCount > 0 ? `${taskCount} erfasst` : 'Fehlt'}</span>
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
                                                                <p class="text-[11px] text-orange-800 font-medium">Es sind noch keine Einzelleistungen zugeordnet.</p>
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
                                                                    <span class="ml-2 font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">PG {cl.care_level}</span>
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
                        class="orga-button-primary bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/20 w-full sm:w-auto py-2.5 px-5 active:scale-95 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <CheckCheck class="w-4 h-4" />
                        <span>{selectedIds.length} abrechnen</span>
                    </button>
                {/if}
                <button 
                    type="button"
                    onclick={close} 
                    class="orga-button-ghost bg-neutral-100 hover:bg-neutral-200 text-neutral-700 w-full sm:w-auto py-2.5 px-6 active:scale-95 text-xs font-bold cursor-pointer"
                >
                    Schließen
                </button>
            </div>
        </div>

    </div>
</dialog>