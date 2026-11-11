<script lang="ts">
    interface Props {
        service: any;
        allUsers: any[];
    }

    let { service, allUsers }: Props = $props();
</script>

<div class="space-y-4">
    <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200">1. Klient &amp; Empfänger</h3>

    {#if service.onBehalfOfUserId}
        <div class="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
            <span>ℹ️</span>
            <span>Mitarbeiter-Daten, Unterschrift und Termine werden von <strong>{allUsers.find(u => u.id === service.onBehalfOfUserId)?.name_first} {allUsers.find(u => u.id === service.onBehalfOfUserId)?.name_last}</strong> übernommen.</span>
        </div>
    {/if}

    <div>
        <label for="generator-client" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Basis-Klient</label>
        <select
            id="generator-client"
            bind:value={service.selectedClientId}
            class="orga-input-clear mb-4"
        >
            <option value="">Klienten wählen...</option>
            {#each service.availableClients as c}
                <option value={c.id}>{c.name_first} {c.name_last}</option>
            {/each}
            {#if service.availableClients.length === 0 && service.onBehalfOfUserId}
                <option disabled value="">Keine Klienten für diesen Mitarbeiter gefunden</option>
            {/if}
        </select>
    </div>

    {#if service.selectedClientId}
        <div class="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl space-y-2">
            <div class="flex items-center justify-between">
                <label for="generator-assistant" class="block text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    Zuständiger Assistent (für dieses Dokument)
                </label>
                {#if service.assistantUser}
                    <span class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span>✓</span> <span>Hinterlegt</span>
                    </span>
                {/if}
            </div>
            <select
                id="generator-assistant"
                bind:value={service.selectedAssistantId}
                class="orga-input-clear text-sm bg-white dark:bg-slate-900 cursor-pointer"
            >
                <option value="">-- Kein Assistent zugewiesen (Platzhalter bleiben leer) --</option>
                {#each allUsers.filter(u => u.role !== 'client') as emp}
                    <option value={emp.id}>{emp.name_last}, {emp.name_first} ({emp.role === 'employee' ? 'Assistent' : emp.role})</option>
                {/each}
            </select>
            {#if !service.assistantUser}
                <p class="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    ⚠️ Diesem Klienten ist noch kein Assistent zugewiesen. Platzhalter wie <code>&#123;&#123;assistant.name&#125;&#125;</code> bleiben leer, sofern hier kein Mitarbeiter gewählt wird.
                </p>
            {/if}
        </div>
    {/if}
</div>
