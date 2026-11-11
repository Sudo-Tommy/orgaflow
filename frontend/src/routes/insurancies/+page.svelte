<script lang="ts">
    import { onMount } from "svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { useInsuranceFilter } from "$lib/services/insuranceFilterService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { pb } from "$lib/services/pocketbase";

    import InsuranceModal from "$lib/components/InsuranceModal.svelte";
    import InsuranceClientsModal from "$lib/components/insurancies/InsuranceClientsModal.svelte";
    import ClientDetailModal from "$lib/components/clients/ClientDetailModal.svelte";
    import InsuranceStatsCards from "$lib/components/insurancies/InsuranceStatsCards.svelte";
    import InsuranceFilterBar from "$lib/components/insurancies/InsuranceFilterBar.svelte";
    import InsuranceGridCard from "$lib/components/insurancies/InsuranceGridCard.svelte";
    import InsuranceTable from "$lib/components/insurancies/InsuranceTable.svelte";
    import { exportInsurancesCsv, copyToClipboard } from "$lib/components/insurancies/insuranceHelper";

    import { Plus, LayoutGrid, List, Download } from "lucide-svelte";

    const insuranciesStore = orgaStore.insurancies;
    const clientsStore = orgaStore.clients;

    const filterService = useInsuranceFilter(
        () => insuranciesStore?.data || [],
        () => clientsStore?.data || []
    );

    // svelte-ignore non_reactive_update
    let modal: ReturnType<typeof InsuranceModal>;
    // svelte-ignore non_reactive_update
    let clientsModal: ReturnType<typeof InsuranceClientsModal>;
    // svelte-ignore non_reactive_update
    let clientDetailModal: ReturnType<typeof ClientDetailModal>;

    let viewMode = $state<"grid" | "table">("grid");
    let copiedId = $state<string | null>(null);

    onMount(async () => {
        if (typeof localStorage !== "undefined") {
            const savedView = localStorage.getItem("insurancies_view_mode");
            if (savedView === "grid" || savedView === "table") {
                viewMode = savedView;
            }
        }
        await Promise.allSettled([
            orgaStore.insurancies.init(),
            orgaStore.clients.init()
        ]);
    });

    function setView(mode: "grid" | "table") {
        viewMode = mode;
        if (typeof localStorage !== "undefined") {
            localStorage.setItem("insurancies_view_mode", mode);
        }
    }

    let stats = $derived.by(() => {
        const list = insuranciesStore?.data || [];
        const allClients = clientsStore?.data || [];
        let gkvCount = 0;
        let pkvCount = 0;
        let beihilfeCount = 0;
        let bgCount = 0;

        for (const item of list) {
            const t = (item.type || "").toLowerCase();
            if (t.includes("gkv") || t.includes("gesetzlich")) gkvCount++;
            else if (t.includes("pkv") || t.includes("privat")) pkvCount++;
            else if (t.includes("beihilfe")) beihilfeCount++;
            else if (t.includes("berufsgenossenschaft")) bgCount++;
        }

        const clientsWithInsurance = allClients.filter((c: any) => {
            const insId = typeof c.insurance === "string" ? c.insurance : (c.insurance?.id || c.expand?.insurance?.id);
            return !!insId;
        }).length;

        return {
            total: list.length,
            gkv: gkvCount,
            pkv: pkvCount,
            beihilfeAndBg: beihilfeCount + bgCount,
            clientsWithInsurance
        };
    });

    async function handleCopy(text: string, label: string, event?: Event) {
        const ok = await copyToClipboard(text, label, event);
        if (ok) {
            copiedId = text;
            setTimeout(() => { if (copiedId === text) copiedId = null; }, 2000);
        }
    }

    async function deleteInsurance(ins: any, event?: Event) {
        event?.stopPropagation();
        const clientCount = filterService.getClientCountForInsurance(ins.id);
        const warning = clientCount > 0 
            ? `Achtung: Es sind aktuell ${clientCount} Klient(en) dieser Kasse zugeordnet. Wirklich löschen?`
            : `Möchten Sie „${ins.name}“ wirklich löschen?`;

        if (!(await confirmStore.ask(warning, "Krankenkasse löschen?", "Löschen", "Abbrechen", true))) return;

        try {
            await pb.collection("insurancies").delete(ins.id);
            if (orgaStore.insurancies) await orgaStore.insurancies.init();
            toastStore.info(`Krankenkasse „${ins.name}“ gelöscht.`);
        } catch (err: any) {
            toastStore.error(err.message || "Fehler beim Löschen.");
        }
    }

    function openClientsModal(ins: any, event?: Event) {
        event?.stopPropagation();
        const list = filterService.getClientsForInsurance(ins.id);
        clientsModal?.open(ins, list, (clientId) => {
            clientDetailModal?.open(clientId);
        });
    }
</script>

<!-- PAGE HEADER -->
<div class="orga-page-header animate-enter">
    <div>
        <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-teal-500/10 dark:bg-teal-400/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-lg border border-teal-500/20">
                🛡️
            </div>
            <h1 class="orga-page-title">Kranken- &amp; Pflegekassen</h1>
        </div>
        <p class="orga-page-subtitle">
            Zentrale Verwaltung aller Kostenträger, Kontaktdaten und Klientenzuordnungen.
        </p>
    </div>

    <div class="flex flex-wrap items-center gap-2.5 mt-4 md:mt-0">
        <!-- View Toggle (Grid / Table) -->
        <div class="inline-flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-inner shrink-0">
            <button
                type="button"
                onclick={() => setView("grid")}
                class="p-2.5 rounded-lg transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center {viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}"
                title="Kartenansicht"
            >
                <LayoutGrid class="w-4 h-4" />
            </button>
            <button
                type="button"
                onclick={() => setView("table")}
                class="p-2.5 rounded-lg transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center {viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}"
                title="Tabellenansicht"
            >
                <List class="w-4 h-4" />
            </button>
        </div>

        <button
            type="button"
            onclick={() => exportInsurancesCsv(filterService.sorted, (id) => filterService.getClientCountForInsurance(id))}
            class="orga-button-ghost py-2.5 px-3.5 text-xs font-semibold inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 min-h-[44px]"
            title="Kassenliste als CSV herunterladen"
        >
            <Download class="w-4 h-4" />
            <span class="hidden sm:inline">Export</span>
        </button>

        <button
            type="button"
            onclick={() => modal?.open()}
            class="orga-button-primary py-2.5 px-4 text-xs font-semibold inline-flex items-center gap-2 shadow-sm cursor-pointer min-h-[44px]"
        >
            <Plus class="w-4 h-4 shrink-0" />
            <span>Neue Krankenkasse</span>
        </button>
    </div>
</div>

<!-- KPI STATS CARDS -->
<InsuranceStatsCards 
    {stats} 
    typeFilter={filterService.typeFilter} 
    clientFilter={filterService.clientFilter}
    onSelectType={(t) => filterService.typeFilter = t}
    onToggleClients={() => filterService.clientFilter = filterService.clientFilter === 'with_clients' ? 'all' : 'with_clients'}
/>

<!-- FILTER & TOOLBAR -->
<InsuranceFilterBar {filterService} {stats} />

<!-- CONTENT AREA -->
<div class="animate-enter delay-200">
    {#if insuranciesStore?.isLoading}
        <div class="text-center py-16 text-slate-500 dark:text-slate-400 font-medium animate-pulse flex flex-col items-center justify-center gap-3">
            <div class="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Lade Krankenkassen &amp; Kostenträger...</span>
        </div>
    {:else if filterService.sorted.length === 0}
        <div class="orga-card-white p-12 text-center text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center">
            <div class="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl mb-4 text-slate-400">
                🔍
            </div>
            <p class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Keine Krankenkassen gefunden</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-5">
                Passen Sie Ihre Suchbegriffe oder Filter an oder legen Sie direkt eine neue Krankenkasse an.
            </p>
            <div class="flex items-center gap-3">
                <button type="button" onclick={() => filterService.resetFilters()} class="orga-button-ghost text-xs py-2 px-4 min-h-[44px]">
                    Filter zurücksetzen
                </button>
                <button type="button" onclick={() => modal?.open()} class="orga-button-primary text-xs py-2 px-4 min-h-[44px]">
                    + Neue Kasse erfassen
                </button>
            </div>
        </div>
    {:else if viewMode === "grid"}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {#each filterService.sorted as ins (ins.id)}
                <InsuranceGridCard 
                    {ins} 
                    clientCount={filterService.getClientCountForInsurance(ins.id)}
                    {copiedId}
                    onOpenDetail={() => modal?.open(ins)}
                    onOpenClients={(e) => openClientsModal(ins, e)}
                    onDelete={(e) => deleteInsurance(ins, e)}
                    onCopy={handleCopy}
                />
            {/each}
        </div>
    {:else}
        <InsuranceTable 
            insurancies={filterService.sorted}
            getClientCount={(id) => filterService.getClientCountForInsurance(id)}
            onOpenDetail={(ins) => modal?.open(ins)}
            onOpenClients={openClientsModal}
            onDelete={deleteInsurance}
        />
    {/if}
</div>

<!-- MODALE -->
<InsuranceModal bind:this={modal} />
<InsuranceClientsModal bind:this={clientsModal} />
<ClientDetailModal bind:this={clientDetailModal} />