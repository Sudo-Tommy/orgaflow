<script lang="ts">
    import { Search, Plus } from "lucide-svelte";
    import AdminDataTable from "$lib/components/admin/AdminDataTable.svelte";

    let {
        adminService,
        popularCollections = [],
        onCreate,
        onEdit,
        onDelete
    }: {
        adminService: any;
        popularCollections: string[];
        onCreate: () => void;
        onEdit: (record: any) => void;
        onDelete: (id: string) => void;
    } = $props();
</script>

<div class="space-y-4 animate-enter">
    <!-- Sammlungs-Leiste (Collections Chips & Dropdown) -->
    <div class="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col gap-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
                <h3 class="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <span>🗄️</span>
                    <span>Datenbank-Sammlung: <strong class="text-indigo-600 dark:text-indigo-400">{adminService.activeCollection}</strong></span>
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">Wählen Sie eine Tabelle aus, um Einträge einzusehen, zu erstellen oder zu pflegen.</p>
            </div>

            <!-- Dropdown für alle Sammlungen -->
            <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">Tabelle:</span>
                <select
                    bind:value={adminService.activeCollection}
                    class="orga-input-clear py-2 px-3 text-xs sm:text-sm font-bold bg-indigo-50/70 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 cursor-pointer min-h-[40px] rounded-xl"
                >
                    {#each adminService.collections as col}
                        <option value={col}>{col}</option>
                    {/each}
                </select>
            </div>
        </div>

        <!-- Beliebte Sammlungen Chips -->
        <div class="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
            <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 mr-1 uppercase tracking-wider">Häufig genutzt:</span>
            {#each popularCollections as col}
                {#if adminService.collections.includes(col)}
                    <button
                        type="button"
                        onclick={() => adminService.activeCollection = col}
                        class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[32px]
                        {adminService.activeCollection === col ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}"
                    >
                        {col}
                    </button>
                {/if}
            {/each}
        </div>

        <!-- Suchleiste & Neuer Datensatz Button -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div class="w-full sm:max-w-md relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search class="w-4 h-4" />
                </div>
                <input
                    type="text"
                    bind:value={adminService.searchQuery}
                    placeholder="Datensätze durchsuchen..."
                    class="orga-input-clear pl-10 py-2.5 text-sm w-full min-h-[44px]"
                />
            </div>

            <button
                type="button"
                onclick={onCreate}
                class="orga-button-primary py-2.5 px-5 w-full sm:w-auto text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shrink-0 min-h-[44px]"
            >
                <Plus class="w-4 h-4" />
                <span>Neuen Datensatz anlegen</span>
            </button>
        </div>
    </div>

    <!-- Tabelle im Vollbild -->
    <div class="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <AdminDataTable data={adminService.activeData} onEdit={onEdit} onDelete={onDelete} />
    </div>
</div>
