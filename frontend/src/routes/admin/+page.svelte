<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { useAdminService } from "$lib/services/adminService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";

    import AdminHeaderHero from "./components/AdminHeaderHero.svelte";
    import AdminTabBar from "./components/AdminTabBar.svelte";
    import AdminOverviewTab from "./components/AdminOverviewTab.svelte";
    import AdminDatabaseTab from "./components/AdminDatabaseTab.svelte";
    import AdminSystemMailsTab from "./components/AdminSystemMailsTab.svelte";
    import AdminFeedbackHubTab from "./components/AdminFeedbackHubTab.svelte";

    import AdminRecordModal from "$lib/components/admin/AdminRecordModal.svelte";
    import AdminControlModal from "$lib/components/admin/AdminControlModal.svelte";
    import AdminLogsModal from "$lib/components/admin/AdminLogsModal.svelte";
    import AdminUnifiedFinanceModal from "$lib/components/admin/AdminUnifiedFinanceModal.svelte";
    import SystemConfigForm, { type SystemConfigData } from "$lib/components/admin/SystemConfigForm.svelte";
    import MarketingGeneratorTab from "$lib/components/admin/MarketingGeneratorTab.svelte";
    import LandingCmsTab from "$lib/components/admin/LandingCmsTab.svelte";

    const adminService = useAdminService();
    let modal: ReturnType<typeof AdminRecordModal>;
    let controlModal: ReturnType<typeof AdminControlModal>;
    let logsModal: ReturnType<typeof AdminLogsModal>;
    let unifiedFinanceModal: ReturnType<typeof AdminUnifiedFinanceModal>;

    let activeTab = $state<"dashboard" | "database" | "system_mails" | "config" | "marketing" | "cms" | "feedback_hub">("dashboard");

    $effect(() => {
        if (!rbacService.canAccessAdmin) {
            toastStore.warning("Keine Berechtigung für den Administrationsbereich.");
            goto('/dashboard');
        }
    });

    // Metriken (Scope-basiert)
    let totalUsers = $derived((orgaStore.users?.data || []).filter((u: any) => rbacService.isRecordInScope(u)).length);
    let totalClients = $derived((orgaStore.clients?.data || []).filter((c: any) => rbacService.isRecordInScope(c)).length);
    let totalAppointments = $derived((orgaStore.appointments?.data || []).filter((a: any) => rbacService.isRecordInScope(a)).length);
    let totalInvoices = $derived((orgaStore.invoices?.data || []).filter((i: any) => rbacService.isRecordInScope(i)).length);

    let systemMails = $derived.by(() => {
        return (orgaStore.mailbox_messages?.data || [])
            .filter(mail => mail.folder === 'System' && rbacService.isRecordInScope(mail));
    });

    let systemPrompts = $derived((orgaStore.system_prompts?.data || []).filter((p: any) => p.category !== 'system_settings'));
    let openSystemPrompts = $derived(systemPrompts.filter((p: any) => p.status === 'open' || !p.status));

    // Support-Tickets Zähler
    let supportTicketsCount = $state(0);

    const STORAGE_KEY = 'orgaflow_system_config';
    let configData = $state<SystemConfigData>({
        instanceName: 'OrgaFlow Produktivinstanz',
        systemInstruction: 'Standard-Richtlinien für automatisierte Text-Optimierung und Berichterstellung gemäß DIN 5008 und GoBD.',
        contactEmail: 'admin@ihre-seniorenassistenz.com',
        enableAutoAudit: true,
        maintenanceMode: false,
        autoSyncIntervalMinutes: 15
    });

    onMount(async () => {
        const paramTab = $page.url.searchParams.get('tab');
        if (paramTab === 'feedback' || paramTab === 'tickets' || paramTab === 'proposals') {
            activeTab = 'feedback_hub';
        }

        try {
            const ticketRecords = await pb.collection("support_tickets").getFullList({
                filter: 'status != "Gelöst" && status != "Geschlossen" && status != "resolved"',
                requestKey: null
            }).catch(() => []);
            supportTicketsCount = ticketRecords.filter((t: any) => {
                const s = (t.status || '').toLowerCase();
                return !s.includes('gelöst') && !s.includes('geschlossen') && s !== 'resolved';
            }).length;
        } catch {}

        try {
            if (typeof window !== 'undefined') {
                const cached = localStorage.getItem(STORAGE_KEY);
                if (cached) configData = { ...configData, ...JSON.parse(cached) };
            }
            const record = await pb.collection('system_prompts').getFirstListItem('title = "System-Konfiguration"', { requestKey: null }).catch(() => null);
            if (record && record.metadata) {
                configData = {
                    ...configData,
                    instanceName: record.metadata.instanceName || configData.instanceName,
                    systemInstruction: record.prompt_content || configData.systemInstruction,
                    contactEmail: record.metadata.contactEmail || configData.contactEmail,
                    enableAutoAudit: record.metadata.enableAutoAudit ?? configData.enableAutoAudit,
                    maintenanceMode: record.metadata.maintenanceMode ?? configData.maintenanceMode,
                    autoSyncIntervalMinutes: record.metadata.autoSyncIntervalMinutes ?? configData.autoSyncIntervalMinutes
                };
            }
        } catch {}
    });

    async function handleSaveConfig(payload: SystemConfigData) {
        configData = payload;
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        try {
            const existing = await pb.collection('system_prompts').getFirstListItem('title = "System-Konfiguration"', { requestKey: null }).catch(() => null);
            const dataToSave = {
                title: 'System-Konfiguration',
                prompt_content: payload.systemInstruction,
                status: 'applied' as const,
                metadata: {
                    is_system_config: true,
                    instanceName: payload.instanceName,
                    contactEmail: payload.contactEmail,
                    enableAutoAudit: payload.enableAutoAudit,
                    maintenanceMode: payload.maintenanceMode,
                    autoSyncIntervalMinutes: payload.autoSyncIntervalMinutes,
                    updatedAt: new Date().toISOString()
                }
            };
            if (existing) await pb.collection('system_prompts').update(existing.id, dataToSave);
            else await pb.collection('system_prompts').create(dataToSave);
            toastStore.success("System-Konfiguration erfolgreich gespeichert und aktiviert! ✅");
        } catch (err: any) {
            toastStore.error("Fehler beim Synchronisieren der Konfiguration: " + err.message);
            throw err;
        }
    }

    async function handleDeleteRecord(id: string) {
        if (await confirmStore.ask(`Möchten Sie diesen Datensatz unwiderruflich aus '${adminService.activeCollection}' löschen?`, "Datensatz löschen?", "Unwiderruflich Löschen", "Abbrechen", true)) {
            await adminService.deleteRecord(adminService.activeCollection, id);
        }
    }

    const popularCollections = ['users', 'clients', 'appointments', 'invoices', 'accounting', 'mailbox_messages', 'contacts', 'company'];
</script>

<svelte:head>
    <title>System-Administration | OrgaFlow</title>
</svelte:head>

<div class="w-full max-w-7xl mx-auto space-y-6 pb-12 animate-enter">
    <AdminHeaderHero 
        canAccessGodMode={rbacService.canAccessGodMode}
        onOpenLogs={() => logsModal?.open()}
        onOpenFinance={() => unifiedFinanceModal?.open()}
        onOpenControl={() => controlModal?.open()}
    />

    <AdminTabBar 
        bind:activeTab 
        systemMailsCount={systemMails.length}
        {supportTicketsCount}
        canAccessGodMode={rbacService.canAccessGodMode}
        canAccessSystemPrompts={rbacService.canAccessSystemPrompts}
    />

    {#if activeTab === 'dashboard'}
        <AdminOverviewTab 
            {totalUsers}
            {totalClients}
            {totalAppointments}
            {totalInvoices}
            openSystemPromptsCount={openSystemPrompts.length}
            isOwner={rbacService.isOwner}
            canAccessSystemPrompts={rbacService.canAccessSystemPrompts}
            onSelectFeedbackTab={() => activeTab = 'feedback_hub'}
        />
    {:else if activeTab === 'database'}
        <AdminDatabaseTab 
            {adminService}
            {popularCollections}
            onCreate={() => modal?.open(adminService.activeCollection)}
            onEdit={(record) => modal?.open(adminService.activeCollection, record)}
            onDelete={handleDeleteRecord}
        />
    {:else if activeTab === 'system_mails'}
        <AdminSystemMailsTab {systemMails} />
    {:else if activeTab === 'config'}
        <div class="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 sm:p-8 animate-enter">
            <SystemConfigForm data={configData} onSave={handleSaveConfig} onCancel={() => activeTab = 'dashboard'} />
        </div>
    {:else if activeTab === 'marketing'}
        <div class="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 sm:p-8 animate-enter">
            <MarketingGeneratorTab />
        </div>
    {:else if activeTab === 'cms'}
        <div class="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 sm:p-8 animate-enter">
            <LandingCmsTab />
        </div>
    {:else if activeTab === 'feedback_hub'}
        <AdminFeedbackHubTab />
    {/if}
</div>

<AdminRecordModal bind:this={modal} onSave={adminService.saveRecord} />
<AdminControlModal bind:this={controlModal} />
<AdminLogsModal bind:this={logsModal} />
<AdminUnifiedFinanceModal bind:this={unifiedFinanceModal} />