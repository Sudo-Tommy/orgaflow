<script lang="ts">
    import { hapticFeedback } from "$lib/services/hapticFeedback";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { 
        CheckCircle2, ChevronDown, ChevronRight, X, Search,
        CheckSquare, Lock, Trash2, TriangleAlert, User, Clock
    } from "lucide-svelte";
    import MissingFollowUpCard from "./missingFollowUps/MissingFollowUpCard.svelte";
    import { 
        getClientBillingForm, 
        checkMissingTime, 
        checkMissingTasks, 
        checkMissingReport, 
        groupAppointmentsByClient 
    } from "./missingFollowUps/missingFollowUpsHelper";
    import {
        markAppointmentAsPrivate,
        batchMarkAsPrivate,
        batchDeleteAppointments,
        updateAppointmentBillingType
    } from "./missingFollowUps/missingFollowUpsActions";

    interface Props {
        missingFollowUps?: any[];
        pastFollowUps?: any[];
        onOpenDetail: (id: string) => void;
    }

    let { missingFollowUps, pastFollowUps, onOpenDetail }: Props = $props();
    let items = $derived(missingFollowUps ?? pastFollowUps ?? []);

    let dialog: HTMLDialogElement;
    let selectedIds = $state<string[]>([]);
    let isProcessing = $state(false);
    let searchQuery = $state("");
    let filterType = $state<"all" | "missing_time" | "missing_tasks" | "missing_report">("all");
    let expandedGroups = $state<Record<string, boolean>>({});

    let filteredAppointments = $derived.by(() => {
        const query = searchQuery.trim().toLowerCase();
        return items.filter((app: any) => {
            if (filterType === "missing_time" && !checkMissingTime(app)) return false;
            if (filterType === "missing_tasks" && !checkMissingTasks(app)) return false;
            if (filterType === "missing_report" && !checkMissingReport(app)) return false;
            if (!query) return true;
            const client = app.expand?.client?.[0];
            const clientName = client ? `${client.name_first || ''} ${client.name_last || ''}`.toLowerCase() : '';
            return clientName.includes(query) || (app.description || '').toLowerCase().includes(query);
        });
    });

    let groupedAppointments = $derived(groupAppointmentsByClient(filteredAppointments));

    let metrics = $derived.by(() => {
        let missingTimeCount = 0, missingTasksCount = 0, missingReportCount = 0;
        for (const app of items) {
            if (checkMissingTime(app)) missingTimeCount++;
            if (checkMissingTasks(app)) missingTasksCount++;
            if (checkMissingReport(app)) missingReportCount++;
        }
        return { totalCount: items.length, missingTimeCount, missingTasksCount, missingReportCount };
    });

    export function open() {
        selectedIds = [];
        searchQuery = "";
        filterType = "all";
        expandedGroups = {};
        dialog?.showModal();
    }

    export function close() {
        selectedIds = [];
        dialog?.close();
    }

    function toggleSelection(id: string) {
        selectedIds = selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id];
    }

    function toggleGroupSelection(groupApps: any[]) {
        hapticFeedback.tap();
        const groupIds = groupApps.map(a => a.id);
        const allSelected = groupIds.every(id => selectedIds.includes(id));
        selectedIds = allSelected ? selectedIds.filter(id => !groupIds.includes(id)) : Array.from(new Set([...selectedIds, ...groupIds]));
    }

    function toggleAllFiltered() {
        hapticFeedback.tap();
        const filteredIds = filteredAppointments.map(a => a.id);
        const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
        selectedIds = allSelected ? selectedIds.filter(id => !filteredIds.includes(id)) : Array.from(new Set([...selectedIds, ...filteredIds]));
    }

    async function handleBatchPrivate() {
        isProcessing = true;
        hapticFeedback.tap();
        if (await batchMarkAsPrivate(selectedIds)) selectedIds = [];
        isProcessing = false;
    }

    async function handleBatchDelete() {
        isProcessing = true;
        hapticFeedback.warning();
        if (await batchDeleteAppointments(selectedIds)) selectedIds = [];
        isProcessing = false;
    }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-md w-full max-w-3xl mx-auto my-6 sm:my-10 rounded-3xl outline-none border-none" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-slate-50 dark:bg-slate-950 sm:rounded-3xl w-full flex flex-col shadow-2xl border border-slate-200/80 dark:border-slate-800">
        <div class="bg-gradient-to-br from-amber-600 to-orange-600 px-4 sm:px-6 py-4 flex items-center justify-between relative">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
                    <TriangleAlert class="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 class="text-base sm:text-xl font-black text-white">Nachbereitungen</h2>
                    <p class="text-xs sm:text-sm text-orange-100 font-medium">Offene Zeiten, Leistungen oder Berichte</p>
                </div>
            </div>
            <button type="button" aria-label="Schließen" onclick={close} class="w-11 h-11 bg-white/15 hover:bg-white/25 text-white rounded-xl flex items-center justify-center transition-all touch-manipulation">
                <X class="w-5 h-5" />
            </button>
        </div>

        <div class="px-3 sm:px-6 py-3 grid grid-cols-3 gap-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <button type="button" onclick={() => { hapticFeedback.selection(); filterType = filterType === 'missing_time' ? 'all' : 'missing_time'; }} class="p-3 rounded-2xl border-2 text-left min-h-12 touch-manipulation {filterType === 'missing_time' ? 'bg-amber-50 border-amber-400 dark:bg-amber-950/40' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}">
                <div class="flex items-center justify-between mb-1"><Clock class="w-4 h-4 text-amber-600" /><span class="text-lg font-black text-amber-700">{metrics.missingTimeCount}</span></div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-amber-800 truncate">Zeit fehlt</p>
            </button>
            <button type="button" onclick={() => { hapticFeedback.selection(); filterType = filterType === 'missing_tasks' ? 'all' : 'missing_tasks'; }} class="p-3 rounded-2xl border-2 text-left min-h-12 touch-manipulation {filterType === 'missing_tasks' ? 'bg-orange-50 border-orange-400 dark:bg-orange-950/40' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}">
                <div class="flex items-center justify-between mb-1"><CheckSquare class="w-4 h-4 text-orange-600" /><span class="text-lg font-black text-orange-700">{metrics.missingTasksCount}</span></div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-orange-800 truncate">Leistung fehlt</p>
            </button>
            <button type="button" onclick={() => { hapticFeedback.selection(); filterType = filterType === 'missing_report' ? 'all' : 'missing_report'; }} class="p-3 rounded-2xl border-2 text-left min-h-12 touch-manipulation {filterType === 'missing_report' ? 'bg-rose-50 border-rose-400 dark:bg-rose-950/40' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}">
                <div class="flex items-center justify-between mb-1"><TriangleAlert class="w-4 h-4 text-rose-600" /><span class="text-lg font-black text-rose-700">{metrics.missingReportCount}</span></div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-rose-800 truncate">Bericht fehlt</p>
            </button>
        </div>

        <div class="p-3 sm:p-5 bg-slate-50 dark:bg-slate-950 w-full flex-1">
            {#if filteredAppointments.length === 0}
                <div class="flex flex-col items-center justify-center py-16 text-center">
                    <CheckCircle2 class="w-12 h-12 text-emerald-500 mb-3" />
                    <p class="font-black text-lg text-slate-900 dark:text-slate-100">Alles erledigt!</p>
                    <p class="text-xs text-slate-500 max-w-xs mt-1">Keine Termine zur Nachbereitung offen.</p>
                </div>
            {:else}
                <div class="flex flex-col gap-3 min-w-0">
                    <div class="flex items-center justify-between gap-2 px-1">
                        <label class="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer min-h-11">
                            <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === filteredAppointments.length} onchange={toggleAllFiltered} class="w-5 h-5 text-amber-600 rounded" />
                            <span>{selectedIds.length > 0 ? `${selectedIds.length} ausgewählt` : `Alle (${filteredAppointments.length}) auswählen`}</span>
                        </label>
                        {#if selectedIds.length > 0}
                            <div class="flex items-center gap-2">
                                <button type="button" onclick={handleBatchPrivate} disabled={isProcessing} class="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl min-h-11 touch-manipulation flex items-center gap-1.5"><Lock class="w-3.5 h-3.5" /> Als privat</button>
                                <button type="button" onclick={handleBatchDelete} disabled={isProcessing} class="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl min-h-11 touch-manipulation flex items-center gap-1.5"><Trash2 class="w-3.5 h-3.5" /> Löschen</button>
                            </div>
                        {/if}
                    </div>

                    {#each groupedAppointments as group}
                        {@const isCollapsed = !expandedGroups[group.clientName]}
                        {@const billingForm = getClientBillingForm(group.client || group.apps[0]?.expand?.client?.[0])}
                        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-w-0">
                            <div class="px-3 sm:px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 min-h-12">
                                <div class="flex items-center gap-2 min-w-0 flex-1">
                                    <input type="checkbox" checked={group.apps.every((a: any) => selectedIds.includes(a.id))} onchange={() => toggleGroupSelection(group.apps)} class="w-5 h-5 text-amber-600 rounded cursor-pointer shrink-0" />
                                    <button type="button" onclick={() => { hapticFeedback.tap(); expandedGroups[group.clientName] = !expandedGroups[group.clientName]; }} class="flex items-center gap-2 text-left min-w-0 flex-1 min-h-11 touch-manipulation">
                                        {#if isCollapsed}<ChevronRight class="w-4 h-4 text-slate-400 shrink-0" />{:else}<ChevronDown class="w-4 h-4 text-slate-400 shrink-0" />{/if}
                                        <span class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{group.clientName}</span>
                                        {#if billingForm && rbacService.canAccessFinances}<span class="text-[10px] font-extrabold {billingForm.bgClass} {billingForm.textClass} border {billingForm.borderClass} px-1.5 py-0.5 rounded-md shrink-0">{billingForm.short}</span>{/if}
                                        <span class="text-[11px] font-semibold text-slate-400 shrink-0">({group.apps.length})</span>
                                    </button>
                                </div>
                            </div>
                            {#if !isCollapsed}
                                <div class="p-2 sm:p-3 space-y-2 min-w-0">
                                    {#each group.apps as app (app.id)}
                                        <MissingFollowUpCard
                                            {app}
                                            isSelected={selectedIds.includes(app.id)}
                                            {isProcessing}
                                            onToggleSelect={toggleSelection}
                                            onMarkPrivate={(a) => markAppointmentAsPrivate(a)}
                                            onOpenDetail={(id) => { close(); onOpenDetail(id); }}
                                            onUpdateBillingType={(a, t) => updateAppointmentBillingType(a, t)}
                                        />
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <div class="p-3.5 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500">{metrics.totalCount} Termine zur Nachbereitung</span>
            <button type="button" onclick={close} class="px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-xl min-h-11 touch-manipulation">Schließen</button>
        </div>
    </div>
</dialog>