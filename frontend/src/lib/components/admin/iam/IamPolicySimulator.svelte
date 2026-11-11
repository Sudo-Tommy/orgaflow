<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { evaluateAccess, type SimulationResult } from "./simulator/iamSimulationEngine";
    import IamSimulationParameters from "./simulator/IamSimulationParameters.svelte";
    import IamSimulationResultView from "./simulator/IamSimulationResultView.svelte";

    // Ausgewählte Parameter
    let selectedUserId = $state<string>("");
    let resourceType = $state<"client" | "appointment" | "invoice" | "company" | "bwa" | "admin" | "godmode">("client");
    let actionType = $state<"view" | "create" | "update" | "delete">("view");
    let targetId = $state<string>("any");

    let simulationResult = $state<SimulationResult | null>(null);

    // Store Collections
    let users = $derived(orgaStore.users?.data || []);
    let companies = $derived(orgaStore.company?.data || []);
    let clients = $derived(orgaStore.clients?.data || []);
    let appointments = $derived(orgaStore.appointments?.data || []);
    let invoices = $derived(orgaStore.invoices?.data || []);

    let targetUser = $derived(users.find((u: any) => u.id === selectedUserId) || null);

    let availableTargets = $derived.by(() => {
        if (resourceType === 'client') {
            return clients.map((c: any) => ({ id: c.id, label: `${c.name_first || ''} ${c.name_last || ''} (Firma: ${c.company || 'Keine'})` }));
        }
        if (resourceType === 'appointment') {
            return appointments.slice(0, 30).map((a: any) => ({ id: a.id, label: `${a.title || 'Termin'} (${a.appointment?.substring(0, 10) || 'Datum'})` }));
        }
        if (resourceType === 'company') {
            return companies.map((comp: any) => ({ id: comp.id, label: `${comp.city || 'Standort'} ${comp.name ? `(${comp.name})` : ''}` }));
        }
        return [];
    });

    function runSimulation() {
        if (!targetUser) return;
        simulationResult = evaluateAccess({
            targetUser,
            resourceType,
            actionType,
            targetId,
            companies,
            clients,
            appointments,
            invoices
        });
    }
</script>

<div class="space-y-6">
    <!-- Header Card -->
    <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div class="absolute -right-8 -bottom-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
                <div class="flex items-center gap-2 text-indigo-400 text-xs font-mono uppercase tracking-wider mb-1">
                    <span>AWS IAM / Keycloak Engine</span>
                    <span>•</span>
                    <span>Live Policy Evaluator</span>
                </div>
                <h3 class="text-xl font-black text-white">IAM Access & Policy Simulator</h3>
                <p class="text-xs text-slate-300 mt-1 max-w-2xl">
                    Prüfen Sie in Echtzeit, ob eine Identität (Benutzer) auf eine Ziel-Ressource unter Berücksichtigung von Rollen, Mandantengrenzen (Tenants) und Datensatz-Scopes zugreifen darf.
                </p>
            </div>
            <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Policy Engine Aktiv
                </span>
            </div>
        </div>
    </div>

    <!-- Parameter Form & Auswertungs-Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <IamSimulationParameters
            bind:selectedUserId
            bind:resourceType
            bind:actionType
            bind:targetId
            {users}
            {availableTargets}
            {targetUser}
            onRunSimulation={runSimulation}
        />

        <IamSimulationResultView result={simulationResult} />
    </div>
</div>
