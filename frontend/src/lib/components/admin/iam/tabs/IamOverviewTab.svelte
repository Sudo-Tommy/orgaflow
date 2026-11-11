<script lang="ts">
    import { Users, Key, Building2, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-svelte";

    let {
        totalUsersCount,
        developerCount,
        superadminCount,
        adminCount,
        caregiverCount,
        guestCount,
        unverifiedCount,
        companiesCount,
        onNavigateTab
    } = $props<{
        totalUsersCount: number;
        developerCount: number;
        superadminCount: number;
        adminCount: number;
        caregiverCount: number;
        guestCount: number;
        unverifiedCount: number;
        companiesCount: number;
        onNavigateTab: (tab: "simulator" | "users" | "roles" | "tenants" | "security" | "audit") => void;
    }>();
</script>

<div class="space-y-6 animate-enter">
    <!-- Quick Metrics Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Gesamt-Identitäten</span>
                <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Users class="w-4 h-4" />
                </div>
            </div>
            <div class="text-3xl font-black text-slate-900 dark:text-white mt-2">{totalUsersCount}</div>
            <div class="text-xs text-slate-500 mt-1">
                Alle PB Identitäten &amp; Portal-Benutzer
            </div>
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Privilegierte Admins</span>
                <div class="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    <Key class="w-4 h-4" />
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
            <div class="text-3xl font-black text-slate-900 dark:text-white mt-2">{companiesCount}</div>
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
                        <span class="text-slate-700 dark:text-slate-300">💻 Developer (Entwickler)</span>
                        <span class="text-cyan-600 dark:text-cyan-400">{developerCount} Konten</span>
                    </div>
                    <div class="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div class="h-full bg-cyan-500 rounded-full" style="width: {(developerCount / Math.max(totalUsersCount, 1)) * 100}%"></div>
                    </div>
                </div>

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
                        <span class="text-slate-700 dark:text-slate-300">🧑‍⚕️ User / Caregiver (Betreuer &amp; Mitarbeiter)</span>
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
                    onclick={() => onNavigateTab('simulator')}
                    class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer min-h-[44px]"
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
                <span>Sicherheits-Status</span>
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
                    <div class="font-bold text-slate-800 dark:text-slate-200">Session &amp; Auth-Token</div>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400">
                        Gültigkeit: 1.209.600 s (14 Tage) • Automatische Verlängerung bei aktiver Nutzung.
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>
