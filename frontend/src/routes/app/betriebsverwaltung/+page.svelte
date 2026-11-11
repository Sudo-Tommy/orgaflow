<script lang="ts">
    import { onMount } from "svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { CheckCircle2 } from "lucide-svelte";
    import BetriebsverwaltungCompanyCard from "$lib/components/betriebsverwaltung/BetriebsverwaltungCompanyCard.svelte";
    import BetriebsverwaltungClientsCard from "$lib/components/betriebsverwaltung/BetriebsverwaltungClientsCard.svelte";
    import BetriebsverwaltungFeaturesCard from "$lib/components/betriebsverwaltung/BetriebsverwaltungFeaturesCard.svelte";
    import BetriebsverwaltungRbacCard from "$lib/components/betriebsverwaltung/BetriebsverwaltungRbacCard.svelte";
    import BetriebsverwaltungAuditCard from "$lib/components/betriebsverwaltung/BetriebsverwaltungAuditCard.svelte";
    import BetriebsverwaltungLicenseCard from "$lib/components/betriebsverwaltung/BetriebsverwaltungLicenseCard.svelte";

    // Feature Flags State
    let featureFlags = $state({
        googleCalendarSync: true,
        clientPortalOnboarding: true,
        vmaSettlement: true,
        digitalSignatureCapture: true,
        autoInvoicingNotice: true,
        strictGoBdAudit: true
    });

    let companies = $derived(orgaStore.company?.data || []);
    let clients = $derived(orgaStore.clients?.data || []);
    let activeClients = $derived(clients.filter((c: any) => c.status === 'Aktiv').length);
    let pendingAdmissions = $derived(clients.filter((c: any) => c.status === 'Inaktiv' && (c.notes || '').includes('NEUAUFNAHME')).length);
    let users = $derived(orgaStore.users?.data || []);

    onMount(async () => {
        if (orgaStore.company) orgaStore.company.init().catch(() => {});
        if (orgaStore.clients) orgaStore.clients.init().catch(() => {});
        if (orgaStore.users) orgaStore.users.init().catch(() => {});
    });

    function toggleFeature(key: keyof typeof featureFlags, title: string) {
        featureFlags[key] = !featureFlags[key];
        const statusText = featureFlags[key] ? "aktiviert" : "deaktiviert";
        toastStore.success(`Funktion „${title}“ wurde ${statusText}.`);
    }
</script>

<svelte:head>
    <title>Betriebsverwaltung | OrgaFlow</title>
</svelte:head>

<div class="space-y-6 animate-enter pb-16">
    <!-- Header -->
    <div class="orga-page-header">
        <div>
            <h1 class="orga-page-title flex items-center gap-3">
                <span class="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xl shadow-inner shrink-0">
                    🏢
                </span>
                Betriebsverwaltung
            </h1>
            <p class="orga-page-subtitle">
                Zentrale Steuerung für Mandanten, Klienten-Aktivierungen, Berechtigungsmatrizen und System-Audits.
            </p>
        </div>

        <div class="flex items-center gap-3">
            <span class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs min-h-[44px]">
                <CheckCircle2 class="w-4 h-4" />
                GoBD &amp; DSGVO konform
            </span>
        </div>
    </div>

    <!-- 6 Strukturierte Verwaltungs-Module -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        <BetriebsverwaltungCompanyCard {companies} />
        <BetriebsverwaltungClientsCard {activeClients} {pendingAdmissions} />
        <BetriebsverwaltungFeaturesCard {featureFlags} onToggle={toggleFeature} />
        <BetriebsverwaltungRbacCard />
        <BetriebsverwaltungAuditCard />
        <BetriebsverwaltungLicenseCard usersCount={users.length} />
    </div>
</div>
