<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { isAppReady, groupAppointmentsByClient, calculateUnsettledMetrics } from "./unsettled/unsettledHelper";
    import { getDistinctServiceMonths } from "./unsettled/unsettledPayerHelper";
    import { isDeveloperUser } from "$lib/services/appointmentStatusHelper";
    import {
        getBillingUserOptions,
        getAppointmentBillingUserId,
        calculateStatusCounts,
        type BillingUserFilter
    } from "./unsettled/unsettledBillingUserHelper";
    import {
        markSingleAsSettled,
        markSelectedAsSettled,
        updateAppBillingType,
        updateAppBillingUser,
        updateBatchBillingUser,
        updateGroupBillingUser
    } from "./unsettled/unsettledActions";
    import UnsettledHeader from "./unsettled/UnsettledHeader.svelte";
    import UnsettledFilterBar from "./unsettled/UnsettledFilterBar.svelte";
    import UnsettledGroupCard from "./unsettled/UnsettledGroupCard.svelte";
    import UnsettledEmptyState from "./unsettled/UnsettledEmptyState.svelte";
    import UnsettledFooter from "./unsettled/UnsettledFooter.svelte";

    interface Props {
        unsettledAppointments: any[];
        onOpenDetail: (id: string) => void;
        onOpenInvoiceGenerator?: (clientId: string, appointmentIds: string[]) => void;
    }

    let { unsettledAppointments = [], onOpenDetail, onOpenInvoiceGenerator }: Props = $props();

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let selectedIds = $state<string[]>([]);
    let isProcessing = $state(false);
    let searchQuery = $state("");
    let filterStatus = $state<"all" | "ready" | "incomplete">("ready");
    let expandedGroups = $state<Record<string, boolean>>({});
    let expandedAppIds = $state<Record<string, boolean>>({});
    let mutationVersion = $state(0);

    const currentUserId = pb.authStore.model?.id;
    const isDeveloper = isDeveloperUser(pb.authStore.model);
    const isAdmin = isDeveloper || pb.authStore.model?.role === "admin" || pb.authStore.model?.role === "owner";

    const defaultUserFilter: BillingUserFilter = isDeveloper ? "all" : (currentUserId || "all");
    const savedUserFilter = isDeveloper && typeof localStorage !== "undefined"
        ? (localStorage.getItem("orgaflow_unsettled_filter_user") as BillingUserFilter | null)
        : null;

    let billingUserFilter = $state<BillingUserFilter>(savedUserFilter || defaultUserFilter);
    let monthFilter = $state<string>("all");

    $effect(() => {
        if (isDeveloper && typeof localStorage !== "undefined" && billingUserFilter) {
            localStorage.setItem("orgaflow_unsettled_filter_user", billingUserFilter);
        }
    });

    let allUsers = $derived(orgaStore.users?.data || []);
    let monthOptions = $derived(getDistinctServiceMonths(unsettledAppointments));
    let billingUserData = $derived(getBillingUserOptions(unsettledAppointments, allUsers, filterStatus, monthFilter));
    let statusCounts = $derived(calculateStatusCounts(unsettledAppointments, billingUserFilter, monthFilter, allUsers));
    let allClientGroups = $derived.by(() => groupAppointmentsByClient(unsettledAppointments));
    let overviewMetrics = $derived.by(() => calculateUnsettledMetrics(unsettledAppointments, [], allClientGroups.length));

    let filteredAppointments = $derived.by(() => {
        mutationVersion;
        const query = searchQuery.trim().toLowerCase();
        return unsettledAppointments.filter((app: any) => {
            const assigned = getAppointmentBillingUserId(app, undefined, allUsers);
            if (!isDeveloper && assigned !== currentUserId) return false;

            if (filterStatus === "ready" && !isAppReady(app)) return false;
            if (filterStatus === "incomplete" && isAppReady(app)) return false;
            if (monthFilter !== "all" && (!app.appointment || !app.appointment.startsWith(monthFilter))) return false;

            if (isDeveloper) {
                if (billingUserFilter === "unassigned") {
                    if (assigned) return false;
                } else if (billingUserFilter !== "all") {
                    if (assigned !== billingUserFilter) return false;
                }
            }

            if (!query) return true;
            const client = app.expand?.client?.[0];
            const name = client ? `${client.name_first || ''} ${client.name_last || ''}`.toLowerCase() : '';
            const desc = (app.description || '').toLowerCase();
            const notes = (app.notes || '').toLowerCase();
            const dateStr = app.appointment ? new Date(app.appointment).toLocaleDateString('de-DE') : '';
            return name.includes(query) || desc.includes(query) || notes.includes(query) || dateStr.includes(query);
        });
    });

    let groupedAppointments = $derived.by(() => groupAppointmentsByClient(filteredAppointments));
    let metrics = $derived.by(() => calculateUnsettledMetrics(filteredAppointments, selectedIds, groupedAppointments.length));

    export function open(tab: "all" | "ready" | "incomplete" = "ready") {
        selectedIds = []; searchQuery = ""; filterStatus = tab;
        expandedAppIds = {}; expandedGroups = {}; dialog?.showModal();
    }
    export function close() { selectedIds = []; dialog?.close(); }

    function toggleSelection(id: string) {
        selectedIds = selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id];
    }
    function toggleGroupSelection(groupApps: any[]) {
        const groupReadyIds = groupApps.filter(a => isAppReady(a)).map(a => a.id);
        const allGroupSelected = groupReadyIds.length > 0 && groupReadyIds.every(id => selectedIds.includes(id));
        selectedIds = allGroupSelected ? selectedIds.filter(id => !groupReadyIds.includes(id)) : Array.from(new Set([...selectedIds, ...groupReadyIds]));
    }
    function toggleAllFiltered() {
        const readyIds = filteredAppointments.filter(a => isAppReady(a)).map(a => a.id);
        const allSelected = readyIds.length > 0 && readyIds.every(id => selectedIds.includes(id));
        selectedIds = allSelected ? selectedIds.filter(id => !readyIds.includes(id)) : Array.from(new Set([...selectedIds, ...readyIds]));
    }

    async function handleMarkSingleSettled(app: any) {
        isProcessing = true;
        const ok = await markSingleAsSettled(app, confirmStore, toastStore, orgaStore);
        if (ok) selectedIds = selectedIds.filter(id => id !== app.id);
        isProcessing = false;
    }
    async function handleMarkSelectedSettled() {
        isProcessing = true;
        const ok = await markSelectedAsSettled(selectedIds, metrics, confirmStore, toastStore, orgaStore);
        if (ok) selectedIds = [];
        isProcessing = false;
    }
    async function handleUpdateBillingType(app: any, newType: string) {
        await updateAppBillingType(app, newType, toastStore, orgaStore);
    }

    async function handleUpdateBillingUser(app: any, newUserId: string | null) {
        isProcessing = true;
        await updateAppBillingUser(app, newUserId, allUsers, confirmStore, toastStore, orgaStore);
        mutationVersion++;
        isProcessing = false;
    }

    async function handleBatchAssignBillingUser(newUserId: string | null) {
        isProcessing = true;
        await updateBatchBillingUser(selectedIds, newUserId, allUsers, toastStore, orgaStore);
        mutationVersion++;
        isProcessing = false;
    }

    async function handleUpdateGroupBillingUser(groupApps: any[], clientId: string | undefined, newUserId: string | null) {
        isProcessing = true;
        await updateGroupBillingUser(groupApps, clientId, newUserId, allUsers, toastStore, orgaStore);
        mutationVersion++;
        isProcessing = false;
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-md w-full sm:max-w-3xl sm:mx-auto sm:my-8 m-0 rounded-none sm:rounded-3xl outline-none border-none"
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-slate-50 dark:bg-slate-950 rounded-none sm:rounded-3xl w-full flex flex-col shadow-2xl border-0 sm:border border-slate-200/80 dark:border-slate-800 min-h-dvh sm:min-h-0">
        <UnsettledHeader metrics={overviewMetrics} filteredReadyCount={metrics.readyCount} isFiltered={billingUserFilter !== 'all' || monthFilter !== 'all'} onClose={close} />

        <UnsettledFilterBar
            bind:searchQuery
            bind:filterStatus
            bind:billingUserFilter
            bind:monthFilter
            userOptions={billingUserData.options}
            unassignedCount={billingUserData.unassignedCount}
            totalAppointmentsCount={billingUserData.totalCount}
            {statusCounts}
            {monthOptions}
            {metrics}
            filteredAppointmentsCount={filteredAppointments.length}
            {selectedIds}
            {isProcessing}
            allSelected={filteredAppointments.length > 0 && filteredAppointments.filter(a => isAppReady(a)).every(a => selectedIds.includes(a.id))}
            canReassign={isAdmin || Boolean(currentUserId)}
            canViewAll={isDeveloper}
            onToggleAll={toggleAllFiltered}
            onMarkSelectedSettled={handleMarkSelectedSettled}
            onBatchAssignBillingUser={handleBatchAssignBillingUser}
        />

        <div class="p-2 sm:p-5 bg-slate-50 dark:bg-slate-950 w-full flex-1">
            {#if filteredAppointments.length === 0}
                <UnsettledEmptyState
                    unsettledCount={unsettledAppointments.length}
                    {filterStatus}
                    incompleteCount={metrics.incompleteCount}
                    hasSearchOrFilter={Boolean(searchQuery || filterStatus !== 'ready' || billingUserFilter !== 'all' || monthFilter !== 'all')}
                    onSelectIncomplete={() => filterStatus = 'incomplete'}
                    onResetFilter={() => { searchQuery = ""; filterStatus = "ready"; billingUserFilter = isDeveloper ? "all" : (currentUserId || "all"); monthFilter = "all"; }}
                />
            {:else}
                <div class="flex flex-col gap-2.5 sm:gap-4 min-w-0">
                    {#each groupedAppointments as group (group.clientName)}
                        <UnsettledGroupCard
                            {group}
                            isCollapsed={!expandedGroups[group.clientName]}
                            {selectedIds}
                            {expandedAppIds}
                            {isProcessing}
                            activeMonthKey={monthFilter !== 'all' ? monthFilter : ''}
                            {allUsers}
                            userOptions={billingUserData.options}
                            canReassign={isAdmin || Boolean(currentUserId)}
                            onToggleGroupCollapse={(name) => expandedGroups[name] = !expandedGroups[name]}
                            onToggleGroupSelection={toggleGroupSelection}
                            onToggleSelection={toggleSelection}
                            onToggleAppExpand={(id) => expandedAppIds[id] = !expandedAppIds[id]}
                            onMarkSettled={handleMarkSingleSettled}
                            onOpenDetail={(id) => { close(); onOpenDetail(id); }}
                            onUpdateBillingType={handleUpdateBillingType}
                            onUpdateBillingUser={handleUpdateBillingUser}
                            onUpdateGroupBillingUser={handleUpdateGroupBillingUser}
                            onOpenInvoiceGenerator={(clientId, appIds) => {
                                close();
                                onOpenInvoiceGenerator?.(clientId, appIds);
                            }}
                        />
                    {/each}
                </div>
            {/if}
        </div>

        <UnsettledFooter
            selectedCount={selectedIds.length}
            readyCount={metrics.readyCount}
            incompleteCount={metrics.incompleteCount}
            selectedHours={metrics.selectedHours}
            {isProcessing}
            onMarkSelectedSettled={handleMarkSelectedSettled}
            onClose={close}
        />
    </div>
</dialog>
