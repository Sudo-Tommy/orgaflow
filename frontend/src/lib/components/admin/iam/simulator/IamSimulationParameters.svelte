<script lang="ts">
    import { Play, User } from "lucide-svelte";

    interface Props {
        selectedUserId: string;
        resourceType: "client" | "appointment" | "invoice" | "company" | "bwa" | "admin" | "godmode";
        actionType: "view" | "create" | "update" | "delete";
        targetId: string;
        users: any[];
        availableTargets: { id: string; label: string }[];
        targetUser: any;
        onRunSimulation: () => void;
    }

    let {
        selectedUserId = $bindable(),
        resourceType = $bindable(),
        actionType = $bindable(),
        targetId = $bindable(),
        users,
        availableTargets,
        targetUser,
        onRunSimulation
    }: Props = $props();

    // Alphabetisch sortiert nach deutschem Anzeigetext gemäß alphabetical-select.md
    const RESOURCE_OPTIONS = [
        { value: "admin", label: "⚙️ Administration" },
        { value: "bwa", label: "📈 BWA & Finanzen" },
        { value: "godmode", label: "⚡ God Mode (Superadmin)" },
        { value: "client", label: "👥 Klienten (Clients)" },
        { value: "company", label: "🏢 Mandant / Firma" },
        { value: "invoice", label: "💶 Rechnungen (Invoices)" },
        { value: "appointment", label: "📅 Termine (Appointments)" }
    ];

    const ACTION_OPTIONS = [
        { value: "delete", label: "DELETE (Löschen)" },
        { value: "view", label: "GET / VIEW (Lesen)" },
        { value: "create", label: "POST / CREATE (Erstellen)" },
        { value: "update", label: "PUT / UPDATE (Ändern)" }
    ];

    let sortedUsers = $derived.by(() => {
        return [...users].sort((a: any, b: any) => {
            const nameA = `${a.name_last || ''} ${a.name_first || ''} ${a.email || ''}`.trim();
            const nameB = `${b.name_last || ''} ${b.name_first || ''} ${b.email || ''}`.trim();
            return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
        });
    });

    let sortedTargets = $derived.by(() => {
        return [...availableTargets].sort((a, b) => 
            a.label.localeCompare(b.label, 'de', { sensitivity: 'base' })
        );
    });
</script>

<div class="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5">
    <h4 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <span class="w-2 h-2 rounded-full bg-indigo-600"></span>
        Simulations-Parameter definieren
    </h4>

    <!-- 1. Benutzer wählen -->
    <div>
        <label for="sim-user-select" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
            1. Identität / Benutzer (Principal)
        </label>
        <select 
            id="sim-user-select"
            bind:value={selectedUserId}
            class="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer touch-manipulation"
        >
            <option value="">-- Benutzer auswählen ({sortedUsers.length} verfügbar) --</option>
            {#each sortedUsers as u}
                <option value={u.id}>
                    {u.name_last ? `${u.name_last}, ${u.name_first || ''}` : (u.name_first || u.email)} ({u.email}) — [{u.role || 'user'}]
                </option>
            {/each}
        </select>

        {#if targetUser}
            <div class="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                    <User class="w-4 h-4 text-slate-400" />
                    <span class="font-bold text-slate-800 dark:text-slate-200">{targetUser.name_first} {targetUser.name_last}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {targetUser.role || 'user'}
                    </span>
                    <span class="text-slate-400 text-[10px]">ID: {targetUser.id.substring(0, 8)}...</span>
                </div>
            </div>
        {/if}
    </div>

    <!-- 2. Ressource & Aktion -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
            <label for="sim-resource-select" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                2. Ressourcentyp
            </label>
            <select 
                id="sim-resource-select"
                bind:value={resourceType}
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer touch-manipulation"
            >
                {#each RESOURCE_OPTIONS as opt}
                    <option value={opt.value}>{opt.label}</option>
                {/each}
            </select>
        </div>

        <div>
            <label for="sim-action-select" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                3. Angefragte Aktion
            </label>
            <select 
                id="sim-action-select"
                bind:value={actionType}
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer touch-manipulation"
            >
                {#each ACTION_OPTIONS as opt}
                    <option value={opt.value}>{opt.label}</option>
                {/each}
            </select>
        </div>
    </div>

    <!-- 3. Konkretes Ziel -->
    {#if sortedTargets.length > 0}
        <div>
            <label for="sim-target-select" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                4. Ziel-Datensatz (Scope-Prüfung)
            </label>
            <select 
                id="sim-target-select"
                bind:value={targetId}
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer touch-manipulation"
            >
                <option value="any">Beliebiger Datensatz im Modul</option>
                {#each sortedTargets as t}
                    <option value={t.id}>{t.label}</option>
                {/each}
            </select>
        </div>
    {/if}

    <!-- Ausführen Button -->
    <button
        type="button"
        onclick={onRunSimulation}
        disabled={!selectedUserId}
        class="w-full min-h-11 py-3 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed touch-manipulation"
    >
        <Play class="w-4 h-4 fill-current" />
        <span>Zugriff simulieren & evaluieren</span>
    </button>
</div>
