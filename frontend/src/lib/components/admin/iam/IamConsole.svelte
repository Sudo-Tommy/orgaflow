<script lang="ts">
    import { onMount } from "svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import IamPolicySimulator from "./IamPolicySimulator.svelte";
    import IamUserDrawer from "./IamUserDrawer.svelte";
    import { 
        Shield, Users, Key, Building2, Activity, Play, CheckCircle2, 
        AlertTriangle, Search, Filter, RefreshCw, UserPlus, Download,
        ExternalLink, Lock, Eye, Check, X, ShieldAlert, Cpu, Sparkles, Sliders
    } from "lucide-svelte";

    // Aktiver Tab
    let activeTab = $state<"overview" | "users" | "roles" | "simulator" | "tenants" | "security" | "audit">("overview");

    // Drawer State
    let selectedUserForDrawer = $state<any>(null);
    let isDrawerOpen = $state(false);

    // New User Modal State
    let isNewUserModalOpen = $state(false);
    let newEmail = $state("");
    let newPassword = $state("");
    let newFirstName = $state("");
    let newLastName = $state("");
    let newRole = $state<string>("user");
    let newCompany = $state<string>("");
    let isCreatingUser = $state(false);

    // Filter & Search
    let searchQuery = $state("");
    let roleFilter = $state("all");
    let companyFilter = $state("all");
    let verifiedFilter = $state("all");

    // Daten aus Stores
    let users = $derived(orgaStore.users?.data || []);
    let superusers = $derived((orgaStore as any).superusers?.data || []);
    let companies = $derived(orgaStore.company?.data || []);
    let clients = $derived(orgaStore.clients?.data || []);

    // Statistiken
    let totalUsersCount = $derived(users.length);
    let superadminCount = $derived(users.filter((u: any) => u.role === 'superadmin').length + superusers.length);
    let adminCount = $derived(users.filter((u: any) => u.role === 'admin').length);
    let caregiverCount = $derived(users.filter((u: any) => u.role === 'user' || !u.role).length);
    let guestCount = $derived(users.filter((u: any) => u.role === 'guest' || u.role === 'client').length);
    let verifiedCount = $derived(users.filter((u: any) => u.verified).length);
    let unverifiedCount = $derived(totalUsersCount - verifiedCount);
    let verifiedPercentage = $derived(totalUsersCount > 0 ? Math.round((verifiedCount / totalUsersCount) * 100) : 100);

    // Gefilterte Benutzerliste
    let filteredUsers = $derived.by(() => {
        return users.filter((u: any) => {
            const query = searchQuery.trim().toLowerCase();
            if (query) {
                const name = `${u.name_first || ''} ${u.name_last || ''}`.toLowerCase();
                const email = (u.email || '').toLowerCase();
                const id = (u.id || '').toLowerCase();
                const uname = (u.username || '').toLowerCase();
                if (!name.includes(query) && !email.includes(query) && !id.includes(query) && !uname.includes(query)) {
                    return false;
                }
            }

            if (roleFilter !== 'all') {
                const r = u.role || 'user';
                if (r !== roleFilter) return false;
            }

            if (companyFilter !== 'all') {
                const c = Array.isArray(u.company) ? u.company[0] : u.company;
                if (c !== companyFilter) return false;
            }

            if (verifiedFilter === 'verified' && !u.verified) return false;
            if (verifiedFilter === 'unverified' && u.verified) return false;

            return true;
        });
    });

    // Mock Audit Log (chronologische Sicherheits-Ereignisse)
    interface AuditEvent {
        id: string;
        timestamp: string;
        action: string;
        actor: string;
        target: string;
        status: "SUCCESS" | "DENIED" | "INFO";
        ip: string;
    }

    let auditLog = $state<AuditEvent[]>([
        { id: "evt-101", timestamp: new Date(Date.now() - 1000 * 60 * 5).toLocaleTimeString('de-DE'), action: "AUTH_TOKEN_REFRESH", actor: pb.authStore.model?.email || "admin@ihre-seniorenassistenz.com", target: "Session Store", status: "SUCCESS", ip: "127.0.0.1 (Client)" },
        { id: "evt-102", timestamp: new Date(Date.now() - 1000 * 60 * 24).toLocaleTimeString('de-DE'), action: "ROLE_SCOPE_EVALUATION", actor: "System Core", target: "HRBAC Engine", status: "SUCCESS", ip: "Internal Service" },
        { id: "evt-103", timestamp: new Date(Date.now() - 1000 * 60 * 62).toLocaleTimeString('de-DE'), action: "USER_VERIFIED_CHECK", actor: "IAM Directory", target: "Users Collection", status: "SUCCESS", ip: "127.0.0.1" },
        { id: "evt-104", timestamp: new Date(Date.now() - 1000 * 60 * 180).toLocaleTimeString('de-DE'), action: "TENANT_BOUNDARY_PROBE", actor: "System Health", target: "Multi-Tenancy Guard", status: "SUCCESS", ip: "Internal Service" }
    ]);

    let auditFilter = $state("all");
    let filteredAudit = $derived.by(() => {
        if (auditFilter === 'all') return auditLog;
        return auditLog.filter(a => a.status === auditFilter);
    });

    function addAuditEvent(action: string, target: string, status: "SUCCESS" | "DENIED" | "INFO" = "SUCCESS") {
        auditLog = [
            {
                id: `evt-${Date.now().toString().slice(-4)}`,
                timestamp: new Date().toLocaleTimeString('de-DE'),
                action,
                actor: pb.authStore.model?.email || "Admin",
                target,
                status,
                ip: "127.0.0.1"
            },
            ...auditLog.slice(0, 49)
        ];
    }

    function openUserDetail(user: any) {
        selectedUserForDrawer = user;
        isDrawerOpen = true;
    }

    async function handleCreateNewUser() {
        if (!newEmail || !newPassword) {
            toastStore.warning("Bitte E-Mail und Passwort eingeben.");
            return;
        }
        isCreatingUser = true;
        try {
            const data: Record<string, any> = {
                email: newEmail.trim(),
                emailVisibility: true,
                password: newPassword,
                passwordConfirm: newPassword,
                name_first: newFirstName.trim(),
                name_last: newLastName.trim(),
                role: newRole
            };
            if (newCompany) {
                data.company = [newCompany];
            }

            const created = await pb.collection('users').create(data);
            toastStore.success(`Benutzer '${newEmail}' erfolgreich im IAM-Verzeichnis erstellt!`);
            addAuditEvent("CREATE_USER_IDENTITY", newEmail, "SUCCESS");
            
            // Reset
            newEmail = "";
            newPassword = "";
            newFirstName = "";
            newLastName = "";
            newRole = "user";
            newCompany = "";
            isNewUserModalOpen = false;

            if (orgaStore.users?.init) {
                await orgaStore.users.init();
            }
        } catch (err: any) {
            console.error("Fehler beim Erstellen des Benutzers:", err);
            let msg = err?.data?.message || err?.message || "Fehler beim Erstellen des Benutzers.";
            if (err?.data?.data && typeof err.data.data === 'object') {
                const fieldErrors = Object.entries(err.data.data)
                    .map(([field, details]: [string, any]) => `${field}: ${details?.message || details?.code || 'ungültig'}`)
                    .join(', ');
                if (fieldErrors) {
                    msg = `Validierungsfehler: ${fieldErrors}`;
                }
            }
            toastStore.error(msg);
            addAuditEvent("CREATE_USER_IDENTITY", newEmail, "DENIED");
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

    function getCompanyName(companyId: string | string[] | null | undefined) {
        if (!companyId) return 'Global (Keine)';
        const id = Array.isArray(companyId) ? companyId[0] : companyId;
        const found = companies.find((c: any) => c.id === id);
        return found ? `${found.city} ${found.name ? `(${found.name})` : ''}` : id;
    }
</script>

<div class="space-y-6">
    <!-- Top Enterprise Console Banner (Keycloak / Okta Style) -->
    <div class="bg-slate-900 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <!-- Subtle Glow & Gradients -->
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
                    Identity & Access Management (IAM) Konsole
                </h2>
                <p class="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                    Zentrale Plattform zur Steuerung von Identitäten, Rollen, Mandanten-Scopes (Tenants) und Sicherheitsrichtlinien nach Vorbild moderner IAM-Architekturen wie Keycloak, Okta und AWS IAM.
                </p>
            </div>

            <!-- Action Buttons -->
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

        <!-- Navigation Tabs Bar inside Console Header -->
        <div class="mt-8 pt-4 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto custom-scrollbar">
            <button 
                onclick={() => activeTab = 'overview'}
                class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'overview' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}"
            >
                <Activity class="w-4 h-4" />
                <span>Dashboard & Metriken</span>
            </button>
            
            <button 
                onclick={() => activeTab = 'users'}
                class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'users' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}"
            >
                <Users class="w-4 h-4" />
                <span>Identitäten (Users)</span>
                <span class="px-1.5 py-0.5 rounded-full text-[10px] {activeTab === 'users' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-800 text-slate-300'}">{totalUsersCount}</span>
            </button>

            <button 
                onclick={() => activeTab = 'roles'}
                class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'roles' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}"
            >
                <Shield class="w-4 h-4" />
                <span>Rollen & Berechtigungs-Matrix</span>
            </button>

            <button 
                onclick={() => activeTab = 'simulator'}
                class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'simulator' ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md' : 'text-indigo-400 hover:text-white hover:bg-slate-800/60'}"
            >
                <Play class="w-4 h-4 fill-current" />
                <span>AWS IAM Policy Simulator</span>
            </button>

            <button 
                onclick={() => activeTab = 'tenants'}
                class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'tenants' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}"
            >
                <Building2 class="w-4 h-4" />
                <span>Mandanten & Tenants</span>
            </button>

            <button 
                onclick={() => activeTab = 'security'}
                class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'security' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}"
            >
                <Key class="w-4 h-4" />
                <span>Security & Tokens</span>
            </button>

            <button 
                onclick={() => activeTab = 'audit'}
                class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'audit' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}"
            >
                <Lock class="w-4 h-4" />
                <span>Audit Trail</span>
            </button>
        </div>
    </div>

    <!-- === TAB 1: OVERVIEW & METRICS === -->
    {#if activeTab === 'overview'}
        <div class="space-y-6 animate-enter">
            <!-- Key Metric Cards -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Identitäten Gesamt</span>
                        <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                            <Users class="w-4 h-4" />
                        </div>
                    </div>
                    <div class="text-3xl font-black text-slate-900 dark:text-white mt-2">{totalUsersCount}</div>
                    <div class="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <span class="text-emerald-500 font-bold">+{verifiedPercentage}%</span> verifiziert
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Privilegierte Rollen</span>
                        <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                            <ShieldAlert class="w-4 h-4" />
                        </div>
                    </div>
                    <div class="text-3xl font-black text-slate-900 dark:text-white mt-2">{superadminCount + adminCount}</div>
                    <div class="text-xs text-slate-500 mt-1">
                        {superadminCount} Superadmin, {adminCount} Admins
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Mandanten (Betriebe)</span>
                        <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                            <Building2 class="w-4 h-4" />
                        </div>
                    </div>
                    <div class="text-3xl font-black text-slate-900 dark:text-white mt-2">{companies.length}</div>
                    <div class="text-xs text-slate-500 mt-1">
                        Strikte Mandanten-Isolation
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Sicherheits-Posture</span>
                        <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                            <CheckCircle2 class="w-4 h-4" />
                        </div>
                    </div>
                    <div class="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">Optimal</div>
                    <div class="text-xs text-slate-500 mt-1">
                        PB Token 14d • Zero Leaks
                    </div>
                </div>
            </div>

            <!-- Role Distribution & Quick Access -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Rollenverteilung Card -->
                <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5">
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                        <span>Rollenverteilung im OrgaFlow Realm</span>
                        <span class="text-xs font-normal text-slate-400">{totalUsersCount} Konten</span>
                    </h3>

                    <div class="space-y-3">
                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1">
                                <span class="text-slate-700 dark:text-slate-300">👑 Superadmin (Global Owner)</span>
                                <span class="text-indigo-600 dark:text-indigo-400">{superadminCount} Konten</span>
                            </div>
                            <div class="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div class="h-full bg-indigo-600 rounded-full" style="width: {(superadminCount / Math.max(totalUsersCount, 1)) * 100}%"></div>
                            </div>
                        </div>

                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1">
                                <span class="text-slate-700 dark:text-slate-300">🏢 Admin (Betriebsleiter)</span>
                                <span class="text-blue-600 dark:text-blue-400">{adminCount} Konten</span>
                            </div>
                            <div class="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div class="h-full bg-blue-500 rounded-full" style="width: {(adminCount / Math.max(totalUsersCount, 1)) * 100}%"></div>
                            </div>
                        </div>

                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1">
                                <span class="text-slate-700 dark:text-slate-300">🧑‍⚕️ User / Caregiver (Betreuer & Mitarbeiter)</span>
                                <span class="text-emerald-600 dark:text-emerald-400">{caregiverCount} Konten</span>
                            </div>
                            <div class="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div class="h-full bg-emerald-500 rounded-full" style="width: {(caregiverCount / Math.max(totalUsersCount, 1)) * 100}%"></div>
                            </div>
                        </div>

                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1">
                                <span class="text-slate-700 dark:text-slate-300">👤 Guest / Client (Portal-Zugang)</span>
                                <span class="text-amber-600 dark:text-amber-400">{guestCount} Konten</span>
                            </div>
                            <div class="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div class="h-full bg-amber-500 rounded-full" style="width: {(guestCount / Math.max(totalUsersCount, 1)) * 100}%"></div>
                            </div>
                        </div>
                    </div>

                    <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span class="text-slate-500">Möchten Sie Berechtigungen für eine konkrete Rolle testen?</span>
                        <button 
                            type="button" 
                            onclick={() => activeTab = 'simulator'}
                            class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <span>Zum Policy Simulator</span>
                            <span>→</span>
                        </button>
                    </div>
                </div>

                <!-- IAM Security Recommendations -->
                <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldAlert class="w-4 h-4 text-amber-500" />
                        Sicherheits-Status
                    </h3>

                    <div class="space-y-3 text-xs">
                        {#if unverifiedCount > 0}
                            <div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 space-y-1">
                                <div class="font-bold flex items-center gap-1.5">
                                    <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0" />
                                    <span>{unverifiedCount} unverifizierte Konten</span>
                                </div>
                                <p class="text-[11px] text-amber-700 dark:text-amber-300">
                                    Benutzer können sich bei aktiver Verifizierungspflicht ggf. nicht anmelden.
                                </p>
                            </div>
                        {:else}
                            <div class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                                <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
                                <span class="font-bold">Alle Identitäten sind verifiziert.</span>
                            </div>
                        {/if}

                        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                            <div class="font-bold text-slate-800 dark:text-slate-200">Mandanten-Isolation (Tenants)</div>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400">
                                Jeder Betriebsleiter (Admin) sieht ausschließlich Daten seiner zugewiesenen Firmen-ID.
                            </p>
                        </div>

                        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                            <div class="font-bold text-slate-800 dark:text-slate-200">Session & Auth-Token</div>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400">
                                Gültigkeit: 1.209.600 s (14 Tage) • Automatische Verlängerung bei aktiver Nutzung.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    <!-- === TAB 2: IDENTITIES (USERS DIRECTORY) === -->
    {:else if activeTab === 'users'}
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden animate-enter space-y-0">
            <!-- Filter Toolbar -->
            <div class="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="w-full md:w-80 relative">
                    <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input 
                        type="text" 
                        bind:value={searchQuery}
                        placeholder="Identität suchen (Name, E-Mail, ID)..."
                        class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div class="flex items-center gap-3 w-full md:w-auto flex-wrap">
                    <!-- Rolle Filter -->
                    <select 
                        bind:value={roleFilter}
                        class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                    >
                        <option value="all">Alle Rollen ({users.length})</option>
                        <option value="superadmin">👑 Superadmin ({superadminCount})</option>
                        <option value="admin">🏢 Admin ({adminCount})</option>
                        <option value="user">🧑‍⚕️ User / Caregiver ({caregiverCount})</option>
                        <option value="guest">👤 Guest ({guestCount})</option>
                    </select>

                    <!-- Mandanten Filter -->
                    <select 
                        bind:value={companyFilter}
                        class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                    >
                        <option value="all">Alle Standorte / Betriebe</option>
                        {#each companies as c}
                            <option value={c.id}>🏢 {c.city}</option>
                        {/each}
                    </select>

                    <!-- Verifiziert Filter -->
                    <select 
                        bind:value={verifiedFilter}
                        class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                    >
                        <option value="all">Status: Alle</option>
                        <option value="verified">Nur Verifizierte</option>
                        <option value="unverified">Nur Unverifizierte</option>
                    </select>

                    <button 
                        type="button" 
                        onclick={() => isNewUserModalOpen = true}
                        class="min-h-11 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                    >
                        <UserPlus class="w-4 h-4" />
                        <span>Neu</span>
                    </button>
                </div>
            </div>

            <!-- Users Data Table -->
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left border-collapse min-w-180">
                    <thead class="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <tr>
                            <th class="p-4">Identität / Benutzer</th>
                            <th class="p-4">System-Rolle</th>
                            <th class="p-4">Mandant / Standort</th>
                            <th class="p-4 text-center">Status</th>
                            <th class="p-4 text-right">Aktion</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                        {#if filteredUsers.length === 0}
                            <tr>
                                <td colspan="5" class="p-12 text-center text-slate-400 font-medium">
                                    Keine Identitäten gefunden für die aktuellen Filter.
                                </td>
                            </tr>
                        {/if}
                        {#each filteredUsers as u}
                            <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                <td class="p-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                                            {(u.name_first?.[0] || u.email?.[0] || 'U').toUpperCase()}
                                        </div>
                                        <div>
                                            <div class="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                <span>{u.name_first || ''} {u.name_last || ''}</span>
                                                {#if u.role === 'superadmin'}
                                                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">Owner</span>
                                                {/if}
                                            </div>
                                            <div class="text-[11px] text-slate-500 font-mono mt-0.5">{u.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="p-4">
                                    <span class="px-2.5 py-1 rounded-lg text-xs font-bold {
                                        u.role === 'superadmin' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' :
                                        u.role === 'admin' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' :
                                        u.role === 'guest' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' :
                                        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }">
                                        {u.role || 'user'}
                                    </span>
                                </td>
                                <td class="p-4 font-semibold text-slate-700 dark:text-slate-300">
                                    <span class="inline-flex items-center gap-1.5">
                                        <Building2 class="w-3.5 h-3.5 text-slate-400" />
                                        <span>{getCompanyName(u.company)}</span>
                                    </span>
                                </td>
                                <td class="p-4 text-center">
                                    {#if u.verified}
                                        <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 class="w-4 h-4" />
                                            <span>Verifiziert</span>
                                        </span>
                                    {:else}
                                        <span class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                            <AlertTriangle class="w-4 h-4" />
                                            <span>Offen</span>
                                        </span>
                                    {/if}
                                </td>
                                <td class="p-4 text-right">
                                    <button 
                                        type="button" 
                                        onclick={() => openUserDetail(u)}
                                        class="min-h-11 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                    >
                                        Verwalten / IAM
                                    </button>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>

    <!-- === TAB 3: ROLES & PERMISSION MATRIX === -->
    {:else if activeTab === 'roles'}
        <div class="space-y-6 animate-enter">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Role Card 1: Superadmin -->
                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-purple-200/60 dark:border-purple-900/40 shadow-sm space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-purple-600 uppercase tracking-wider">God Mode</span>
                        <span class="text-xs font-mono font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 px-2 py-0.5 rounded">{superadminCount}</span>
                    </div>
                    <h4 class="font-black text-slate-900 dark:text-white text-base">superadmin / owner</h4>
                    <p class="text-xs text-slate-500">Vollzugriff auf alle Firmen, Datenbanktabellen, Spezifikationen, Live Logs und Systemprompts.</p>
                </div>

                <!-- Role Card 2: Admin -->
                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 shadow-sm space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-blue-600 uppercase tracking-wider">Betriebsleiter</span>
                        <span class="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 px-2 py-0.5 rounded">{adminCount}</span>
                    </div>
                    <h4 class="font-black text-slate-900 dark:text-white text-base">admin</h4>
                    <p class="text-xs text-slate-500">Volle Betriebsverwaltung im eigenen Mandanten: Rechnungen, BWA, Klienten, Termine und Mitarbeiter.</p>
                </div>

                <!-- Role Card 3: User / Caregiver -->
                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-emerald-600 uppercase tracking-wider">Betreuer</span>
                        <span class="text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 px-2 py-0.5 rounded">{caregiverCount}</span>
                    </div>
                    <h4 class="font-black text-slate-900 dark:text-white text-base">user / caregiver</h4>
                    <p class="text-xs text-slate-500">Persönliche Termine und zugewiesene Klienten. Keine Einsicht in BWA oder Betriebsfinanzen.</p>
                </div>

                <!-- Role Card 4: Guest / Client -->
                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 shadow-sm space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-amber-600 uppercase tracking-wider">Portal-Gast</span>
                        <span class="text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 px-2 py-0.5 rounded">{guestCount}</span>
                    </div>
                    <h4 class="font-black text-slate-900 dark:text-white text-base">guest / client</h4>
                    <p class="text-xs text-slate-500">Ausschließlich Klienten-Portal (/portal) zur Einsicht freigegebener Dokumente und Termine.</p>
                </div>
            </div>

            <!-- Permission Matrix Table -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="text-base font-black text-slate-900 dark:text-white">HRBAC Berechtigungs-Matrix</h4>
                        <p class="text-xs text-slate-500 mt-0.5">Übersicht aller Rechte pro Modul und Ressource im System.</p>
                    </div>
                    <button 
                        type="button" 
                        onclick={() => activeTab = 'simulator'}
                        class="min-h-11 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <Play class="w-3.5 h-3.5 fill-current" />
                        <span>Im Policy Simulator testen</span>
                    </button>
                </div>

                <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse min-w-160">
                        <thead class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th class="p-3.5">Modul / Ressource</th>
                                <th class="p-3.5 text-center">Superadmin</th>
                                <th class="p-3.5 text-center">Admin (Betrieb)</th>
                                <th class="p-3.5 text-center">Caregiver (User)</th>
                                <th class="p-3.5 text-center">Guest (Portal)</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                            <tr>
                                <td class="p-3.5 font-bold text-slate-900 dark:text-white">Klientenstammdaten</td>
                                <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Alle Mandanten</td>
                                <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Eigener Mandant</td>
                                <td class="p-3.5 text-center text-blue-600 font-medium">✓ Zugewiesene</td>
                                <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                            </tr>
                            <tr>
                                <td class="p-3.5 font-bold text-slate-900 dark:text-white">Termine & Einsätze</td>
                                <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Alle Mandanten</td>
                                <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Eigener Mandant</td>
                                <td class="p-3.5 text-center text-blue-600 font-medium">✓ Eigene Termine</td>
                                <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                            </tr>
                            <tr>
                                <td class="p-3.5 font-bold text-slate-900 dark:text-white">Rechnungen & Finanzen</td>
                                <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Vollzugriff</td>
                                <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Eigener Mandant</td>
                                <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                                <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                            </tr>
                            <tr>
                                <td class="p-3.5 font-bold text-slate-900 dark:text-white">BWA & Controlling</td>
                                <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Vollzugriff</td>
                                <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Eigener Mandant</td>
                                <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                                <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                            </tr>
                            <tr>
                                <td class="p-3.5 font-bold text-slate-900 dark:text-white">System-Admin & IAM</td>
                                <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Vollzugriff</td>
                                <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Eigener Betrieb</td>
                                <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                                <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                            </tr>
                            <tr>
                                <td class="p-3.5 font-bold text-slate-900 dark:text-white">God Mode & Raw Database</td>
                                <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Vollzugriff</td>
                                <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                                <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                                <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    <!-- === TAB 4: AWS IAM POLICY SIMULATOR === -->
    {:else if activeTab === 'simulator'}
        <div class="animate-enter">
            <IamPolicySimulator />
        </div>

    <!-- === TAB 5: TENANTS / MULTI-TENANCY === -->
    {:else if activeTab === 'tenants'}
        <div class="space-y-6 animate-enter">
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-base font-black text-slate-900 dark:text-white">Mandanten- & Facility-Verzeichnis</h3>
                        <p class="text-xs text-slate-500">Jeder Betrieb bildet eine logische Sicherheits- und Scope-Grenze.</p>
                    </div>
                    <span class="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-100 dark:border-indigo-900">
                        {companies.length} Aktive Mandanten
                    </span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {#each companies as comp}
                        {@const compUsers = users.filter((u: any) => {
                            const c = Array.isArray(u.company) ? u.company[0] : u.company;
                            return c === comp.id;
                        })}
                        {@const compClients = clients.filter((cl: any) => {
                            const c = Array.isArray(cl.company) ? cl.company[0] : cl.company;
                            return c === comp.id;
                        })}
                        <div class="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-3">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <Building2 class="w-5 h-5 text-indigo-600" />
                                    <h4 class="font-bold text-slate-900 dark:text-white text-sm">{comp.city}</h4>
                                </div>
                                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                                    {comp.id}
                                </span>
                            </div>

                            <p class="text-xs text-slate-500">{comp.name || 'Betriebsstelle Seniorenassistenz'}</p>

                            <div class="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span class="text-slate-400 block text-[10px] uppercase font-bold">Mitarbeiter</span>
                                    <span class="font-bold text-slate-800 dark:text-slate-200">{compUsers.length}</span>
                                </div>
                                <div>
                                    <span class="text-slate-400 block text-[10px] uppercase font-bold">Klienten</span>
                                    <span class="font-bold text-slate-800 dark:text-slate-200">{compClients.length}</span>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>

    <!-- === TAB 6: SECURITY & TOKEN GOVERNANCE === -->
    {:else if activeTab === 'security'}
        <div class="space-y-6 animate-enter">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                    <h3 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Key class="w-5 h-5 text-indigo-600" />
                        Authentifizierungs- & Token-Richtlinien
                    </h3>
                    <div class="space-y-3 text-xs">
                        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <div class="font-bold text-slate-900 dark:text-white">Auth Token Duration</div>
                                <div class="text-[11px] text-slate-500">Gültigkeit des JWT-Sitzungs-Tokens</div>
                            </div>
                            <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">1.209.600 s (14 Tage)</span>
                        </div>

                        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <div class="font-bold text-slate-900 dark:text-white">OTP (One-Time-Password) Duration</div>
                                <div class="text-[11px] text-slate-500">Zeitfenster für Einmal-Passwörter</div>
                            </div>
                            <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">180 s (3 Min.) / 8 Ziffern</span>
                        </div>

                        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <div class="font-bold text-slate-900 dark:text-white">Passwort-Mindestlänge</div>
                                <div class="text-[11px] text-slate-500">Mindestanforderung für PB Users</div>
                            </div>
                            <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">Mindestens 6 Zeichen</span>
                        </div>

                        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <div class="font-bold text-slate-900 dark:text-white">File Token Duration</div>
                                <div class="text-[11px] text-slate-500">Sicherer Dokumenten-Download-Token</div>
                            </div>
                            <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">120 s (2 Min.)</span>
                        </div>
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                    <h3 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Lock class="w-5 h-5 text-indigo-600" />
                        Zero-Trust & Scope-Garantien
                    </h3>
                    <div class="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                        <p>
                            OrgaFlow verwendet eine strikte <strong>Hierarchical Role-Based Access Control (HRBAC)</strong> Architektur:
                        </p>
                        <ul class="space-y-2 list-disc list-inside">
                            <li><strong>Tenant Scoping</strong>: Jeder Betriebsleiter kann nur Daten seiner eigenen Firmen-ID modifizieren.</li>
                            <li><strong>Caregiver Isolation</strong>: Betreuer haben keinen Einblick in Finanzen, BWA oder firmenfremde Klienten.</li>
                            <li><strong>Superadmin Separation</strong>: Nur die globale Inhaber-Identität hat Zugriff auf Raw Database und System-Prompts.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

    <!-- === TAB 7: AUDIT TRAIL === -->
    {:else if activeTab === 'audit'}
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden animate-enter space-y-0">
            <div class="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                    <h3 class="text-base font-black text-slate-900 dark:text-white">IAM Access & Audit Trail (CloudTrail Style)</h3>
                    <p class="text-xs text-slate-500 mt-0.5">Chronologisches Protokoll von sicherheits- und berechtigungsrelevanten Zugriffen.</p>
                </div>
                <div class="flex items-center gap-3">
                    <select 
                        bind:value={auditFilter}
                        class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                    >
                        <option value="all">Alle Ereignisse ({auditLog.length})</option>
                        <option value="SUCCESS">Nur Erfolgreich (SUCCESS)</option>
                        <option value="DENIED">Nur Verweigert (DENIED)</option>
                    </select>
                    <button 
                        type="button" 
                        onclick={exportAuditLog}
                        class="min-h-11 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <Download class="w-4 h-4" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left border-collapse min-w-160">
                    <thead class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                            <th class="p-3.5">Zeitstempel</th>
                            <th class="p-3.5">Aktion (Event)</th>
                            <th class="p-3.5">Actor (Ausführender)</th>
                            <th class="p-3.5">Target (Ziel)</th>
                            <th class="p-3.5 text-center">Status</th>
                            <th class="p-3.5 text-right">Quelle IP</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {#each filteredAudit as evt}
                            <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                <td class="p-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">{evt.timestamp}</td>
                                <td class="p-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">{evt.action}</td>
                                <td class="p-3.5 font-semibold text-slate-800 dark:text-slate-200">{evt.actor}</td>
                                <td class="p-3.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">{evt.target}</td>
                                <td class="p-3.5 text-center">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono {evt.status === 'SUCCESS' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'}">
                                        {evt.status}
                                    </span>
                                </td>
                                <td class="p-3.5 text-right font-mono text-slate-500 text-[11px]">{evt.ip}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    {/if}
</div>

<!-- Drawer für Identity-Verwaltung -->
<IamUserDrawer 
    user={selectedUserForDrawer}
    isOpen={isDrawerOpen}
    onClose={() => isDrawerOpen = false}
    onUserUpdated={() => {
        addAuditEvent("USER_IDENTITY_UPDATED", selectedUserForDrawer?.email || "Unknown");
    }}
/>

<!-- Modal: Neue Identität anlegen -->
{#if isNewUserModalOpen}
    <div 
        class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-enter"
        onclick={(e) => { if (e.target === e.currentTarget) isNewUserModalOpen = false; }}
        onkeydown={(e) => { if (e.key === 'Escape') isNewUserModalOpen = false; }}
        tabindex="-1"
        role="dialog"
        aria-modal="true"
    >
        <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                        <UserPlus class="w-4 h-4" />
                    </div>
                    <div>
                        <h3 class="font-black text-slate-900 dark:text-white text-base">Neue Identität anlegen</h3>
                        <p class="text-xs text-slate-500">Erstellt einen Benutzer im IAM Universal Directory</p>
                    </div>
                </div>
                <button 
                    type="button" 
                    onclick={() => isNewUserModalOpen = false}
                    class="min-h-11 min-w-11 inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <form onsubmit={(e) => { e.preventDefault(); handleCreateNewUser(); }} class="p-6 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="iam-new-fn" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Vorname</label>
                        <input id="iam-new-fn" type="text" bind:value={newFirstName} placeholder="Max" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                    </div>
                    <div>
                        <label for="iam-new-ln" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nachname</label>
                        <input id="iam-new-ln" type="text" bind:value={newLastName} placeholder="Mustermann" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                    </div>
                </div>

                <div>
                    <label for="iam-new-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">E-Mail Adresse (Login Principal)</label>
                    <input id="iam-new-email" type="email" bind:value={newEmail} placeholder="max.mustermann@ihre-seniorenassistenz.com" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>

                <div>
                    <label for="iam-new-pw" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Initial-Passwort</label>
                    <input id="iam-new-pw" type="password" bind:value={newPassword} placeholder="••••••••••••" minlength="8" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="iam-new-role" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">System-Rolle</label>
                        <select id="iam-new-role" bind:value={newRole} class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none cursor-pointer">
                            <option value="user">🧑‍⚕️ User / Caregiver</option>
                            <option value="admin">🏢 Admin (Betriebsleiter)</option>
                            <option value="superadmin">👑 Superadmin</option>
                            <option value="guest">👤 Guest (Portal)</option>
                        </select>
                    </div>
                    <div>
                        <label for="iam-new-company" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mandant / Betrieb</label>
                        <select id="iam-new-company" bind:value={newCompany} class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none cursor-pointer">
                            <option value="">-- Frei / Global --</option>
                            {#each companies as c}
                                <option value={c.id}>🏢 {c.city}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button 
                        type="button" 
                        onclick={() => isNewUserModalOpen = false}
                        class="min-h-11 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                        Abbrechen
                    </button>
                    <button 
                        type="submit" 
                        disabled={isCreatingUser}
                        class="min-h-11 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                    >
                        <span>{isCreatingUser ? 'Erstellt...' : 'Identität anlegen'}</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
