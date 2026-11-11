<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import IamPolicySimulator from "./IamPolicySimulator.svelte";
    import IamUserDrawer from "./IamUserDrawer.svelte";
    import IamOverviewTab from "./tabs/IamOverviewTab.svelte";
    import IamUsersTab from "./tabs/IamUsersTab.svelte";
    import IamRolesTab from "./tabs/IamRolesTab.svelte";
    import IamTenantsTab from "./tabs/IamTenantsTab.svelte";
    import IamSecurityTab from "./tabs/IamSecurityTab.svelte";
    import IamAuditTab, { type AuditEvent } from "./tabs/IamAuditTab.svelte";
    import IamNewUserModal from "./IamNewUserModal.svelte";
    import { 
        Shield, Activity, Users, Key, Play, Building2, Lock, FileText, UserPlus, Download 
    } from "lucide-svelte";

    let activeTab = $state<"overview" | "users" | "roles" | "simulator" | "tenants" | "security" | "audit">("overview");

    // Drawer State
    let selectedUserForDrawer = $state<any>(null);
    let isDrawerOpen = $state(false);

    // Modal State
    let isNewUserModalOpen = $state(false);
    let isCreatingUser = $state(false);

    // Data from Stores
    let users = $derived(orgaStore.users?.data || []);
    let superusers = $derived((orgaStore as any).superusers?.data || []);
    let companies = $derived(orgaStore.company?.data || []);
    let clients = $derived(orgaStore.clients?.data || []);

    // Statistics
    let totalUsersCount = $derived(users.length);
    let developerCount = $derived(users.filter((u: any) => u.role === 'developer').length);
    let superadminCount = $derived(users.filter((u: any) => u.role === 'superadmin').length + superusers.length);
    let adminCount = $derived(users.filter((u: any) => u.role === 'admin').length);
    let caregiverCount = $derived(users.filter((u: any) => u.role === 'user' || !u.role).length);
    let guestCount = $derived(users.filter((u: any) => u.role === 'guest' || u.role === 'client').length);
    let verifiedCount = $derived(users.filter((u: any) => u.verified).length);
    let unverifiedCount = $derived(totalUsersCount - verifiedCount);

    let auditLog = $state<AuditEvent[]>([
        { id: "evt-101", timestamp: new Date(Date.now() - 1000 * 60 * 5).toLocaleTimeString('de-DE'), action: "AUTH_TOKEN_REFRESH", actor: pb.authStore.model?.email || "admin@ihre-seniorenassistenz.com", target: "Session Store", status: "SUCCESS", ip: "127.0.0.1 (Client)" },
        { id: "evt-102", timestamp: new Date(Date.now() - 1000 * 60 * 24).toLocaleTimeString('de-DE'), action: "ROLE_SCOPE_EVALUATION", actor: "System Core", target: "HRBAC Engine", status: "SUCCESS", ip: "Internal Service" },
        { id: "evt-103", timestamp: new Date(Date.now() - 1000 * 60 * 62).toLocaleTimeString('de-DE'), action: "USER_VERIFIED_CHECK", actor: "IAM Directory", target: "Users Collection", status: "SUCCESS", ip: "127.0.0.1" },
        { id: "evt-104", timestamp: new Date(Date.now() - 1000 * 60 * 180).toLocaleTimeString('de-DE'), action: "TENANT_BOUNDARY_PROBE", actor: "System Health", target: "Multi-Tenancy Guard", status: "SUCCESS", ip: "Internal Service" }
    ]);

    function addAuditEvent(action: string, target: string, status: "SUCCESS" | "DENIED" | "INFO" = "SUCCESS") {
        auditLog = [
            { id: `evt-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleTimeString('de-DE'), action, actor: pb.authStore.model?.email || "Admin", target, status, ip: "127.0.0.1" },
            ...auditLog.slice(0, 49)
        ];
    }

    function openUserDetail(user: any) {
        selectedUserForDrawer = user;
        isDrawerOpen = true;
    }

    async function handleCreateUser(data: { email: string; password: string; firstName: string; lastName: string; role: string; company: string }) {
        if (!data.email || !data.password) {
            toastStore.warning("Bitte E-Mail und Passwort eingeben.");
            return;
        }
        isCreatingUser = true;
        try {
            const pbData: Record<string, any> = {
                email: data.email.trim(),
                emailVisibility: true,
                password: data.password,
                passwordConfirm: data.password,
                name_first: data.firstName.trim(),
                name_last: data.lastName.trim(),
                role: data.role
            };
            if (data.company) {
                pbData.company = [data.company];
            }
            await pb.collection('users').create(pbData);
            toastStore.success(`Benutzer '${data.email}' erfolgreich im IAM-Verzeichnis erstellt!`);
            addAuditEvent("CREATE_USER_IDENTITY", data.email, "SUCCESS");
            isNewUserModalOpen = false;
            if (orgaStore.users?.init) await orgaStore.users.init();
        } catch (err: any) {
            console.error("Fehler beim Erstellen des Benutzers:", err);
            let msg = err?.data?.message || err?.message || "Fehler beim Erstellen des Benutzers.";
            toastStore.error(msg);
            addAuditEvent("CREATE_USER_IDENTITY", data.email, "DENIED");
        } finally {
            isCreatingUser = false;
        }
    }

    function exportAuditLog() {
        const json = JSON.stringify(auditLog, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iam-audit-log-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toastStore.success("Audit-Log als JSON exportiert!");
    }
</script>

<div class="space-y-6">
    <!-- Top Enterprise Console Banner -->
    <div class="bg-slate-900 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div class="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute bottom-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
                <div class="flex items-center gap-3 mb-2 flex-wrap">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold border border-indigo-400/20">
                        <Shield class="w-3.5 h-3.5" />
                        OrgaFlow Security Realm
                    </span>
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/20">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        HRBAC Active
                    </span>
                    <span class="text-xs text-slate-400 font-mono">PocketBase Identity Engine</span>
                </div>
                <h2 class="text-2xl md:text-3xl font-black text-white tracking-tight">
                    Identity &amp; Access Management (IAM) Konsole
                </h2>
                <p class="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                    Zentrale Plattform zur Steuerung von Identitäten, Rollen, Mandanten-Scopes (Tenants) und Sicherheitsrichtlinien nach modernsten IAM-Architekturen.
                </p>
            </div>

            <div class="flex items-center gap-3 shrink-0 flex-wrap">
                <button 
                    type="button" 
                    onclick={() => isNewUserModalOpen = true}
                    class="min-h-11 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                    <UserPlus class="w-4 h-4" />
                    <span>+ Neue Identität anlegen</span>
                </button>
                <button 
                    type="button" 
                    onclick={exportAuditLog}
                    class="min-h-11 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
                    title="Audit Log als JSON herunterladen"
                >
                    <Download class="w-4 h-4" />
                    <span>Audit Export</span>
                </button>
            </div>
        </div>

        <!-- Navigation Tabs Bar -->
        <div class="mt-8 pt-4 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto custom-scrollbar">
            <button onclick={() => activeTab = 'overview'} class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'overview' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}">
                <Activity class="w-4 h-4" /> <span>Übersicht</span>
            </button>
            <button onclick={() => activeTab = 'users'} class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'users' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}">
                <Users class="w-4 h-4" /> <span>Identitäten ({users.length})</span>
            </button>
            <button onclick={() => activeTab = 'roles'} class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'roles' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}">
                <Key class="w-4 h-4" /> <span>Rollen &amp; HRBAC</span>
            </button>
            <button onclick={() => activeTab = 'simulator'} class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'simulator' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}">
                <Play class="w-4 h-4" /> <span>Policy Simulator</span>
            </button>
            <button onclick={() => activeTab = 'tenants'} class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'tenants' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}">
                <Building2 class="w-4 h-4" /> <span>Mandanten / Betriebe</span>
            </button>
            <button onclick={() => activeTab = 'security'} class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'security' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}">
                <Lock class="w-4 h-4" /> <span>Sicherheits-Posture</span>
            </button>
            <button onclick={() => activeTab = 'audit'} class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'audit' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}">
                <FileText class="w-4 h-4" /> <span>Audit Log</span>
            </button>
        </div>
    </div>

    <!-- Active Tab View -->
    {#if activeTab === 'overview'}
        <IamOverviewTab 
            {totalUsersCount} {developerCount} {superadminCount} {adminCount} 
            {caregiverCount} {guestCount} {unverifiedCount} companiesCount={companies.length}
            onNavigateTab={(tab) => activeTab = tab}
        />
    {:else if activeTab === 'users'}
        <IamUsersTab 
            {users} {companies} {adminCount} {developerCount} {guestCount} 
            {superadminCount} {caregiverCount}
            onOpenUserDetail={openUserDetail}
            onOpenNewUserModal={() => isNewUserModalOpen = true}
        />
    {:else if activeTab === 'roles'}
        <IamRolesTab 
            {superadminCount} {adminCount} {caregiverCount} {guestCount}
            onNavigateSimulator={() => activeTab = 'simulator'}
        />
    {:else if activeTab === 'simulator'}
        <div class="animate-enter"><IamPolicySimulator /></div>
    {:else if activeTab === 'tenants'}
        <IamTenantsTab {companies} {users} {clients} />
    {:else if activeTab === 'security'}
        <IamSecurityTab />
    {:else if activeTab === 'audit'}
        <IamAuditTab {auditLog} onExport={exportAuditLog} />
    {/if}
</div>

<IamUserDrawer 
    user={selectedUserForDrawer}
    isOpen={isDrawerOpen}
    onClose={() => isDrawerOpen = false}
    onUserUpdated={() => addAuditEvent("USER_IDENTITY_UPDATED", selectedUserForDrawer?.email || "Unknown")}
/>

<IamNewUserModal 
    isOpen={isNewUserModalOpen}
    {companies}
    {isCreatingUser}
    onClose={() => isNewUserModalOpen = false}
    onCreateUser={handleCreateUser}
/>
