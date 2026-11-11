<script lang="ts">
    import { Search, Building2, CheckCircle2, AlertTriangle, UserPlus } from "lucide-svelte";
    import { sortAlphabetical } from "$lib/utils/sortHelper";

    let {
        users,
        companies,
        adminCount,
        developerCount,
        guestCount,
        superadminCount,
        caregiverCount,
        onOpenUserDetail,
        onOpenNewUserModal
    } = $props<{
        users: any[];
        companies: any[];
        adminCount: number;
        developerCount: number;
        guestCount: number;
        superadminCount: number;
        caregiverCount: number;
        onOpenUserDetail: (user: any) => void;
        onOpenNewUserModal: () => void;
    }>();

    let searchQuery = $state("");
    let roleFilter = $state("all");
    let companyFilter = $state("all");
    let verifiedFilter = $state("all");

    let sortedCompanies = $derived.by(() => {
        return sortAlphabetical(companies || [], (c: any) => c.city || c.name || "");
    });

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

    function getCompanyName(companyId: string | string[] | null | undefined) {
        if (!companyId) return 'Global (Keine)';
        const id = Array.isArray(companyId) ? companyId[0] : companyId;
        const found = companies.find((c: any) => c.id === id);
        return found ? `${found.city} ${found.name ? `(${found.name})` : ''}` : id;
    }
</script>

<div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden animate-enter space-y-0">
    <!-- Filter Toolbar -->
    <div class="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="w-full md:w-80 relative">
            <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input 
                type="text" 
                bind:value={searchQuery}
                placeholder="Identität suchen (Name, E-Mail, ID)..."
                class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            />
        </div>

        <div class="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <!-- Rolle Filter Alphabetisch -->
            <select 
                bind:value={roleFilter}
                class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer min-h-[44px]"
            >
                <option value="all">Alle Rollen ({users.length})</option>
                <option value="admin">🏢 Admin ({adminCount})</option>
                <option value="developer">💻 Developer ({developerCount})</option>
                <option value="guest">👤 Guest ({guestCount})</option>
                <option value="superadmin">👑 Superadmin ({superadminCount})</option>
                <option value="user">🧑‍⚕️ User / Caregiver ({caregiverCount})</option>
            </select>

            <!-- Mandanten Filter Alphabetisch -->
            <select 
                bind:value={companyFilter}
                class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer min-h-[44px]"
            >
                <option value="all">Alle Standorte / Betriebe</option>
                {#each sortedCompanies as c}
                    <option value={c.id}>🏢 {c.city}</option>
                {/each}
            </select>

            <!-- Verifiziert Filter -->
            <select 
                bind:value={verifiedFilter}
                class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer min-h-[44px]"
            >
                <option value="all">Status: Alle</option>
                <option value="verified">Nur Verifizierte</option>
                <option value="unverified">Nur Unverifizierte</option>
            </select>

            <button 
                type="button" 
                onclick={onOpenNewUserModal}
                class="min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
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
                                        {#if u.role === 'developer'}
                                            <span class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30 flex items-center gap-1">💻 Dev</span>
                                        {:else if u.role === 'superadmin'}
                                            <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">Owner</span>
                                        {/if}
                                    </div>
                                    <div class="text-[11px] text-slate-500 font-mono mt-0.5">{u.email}</div>
                                </div>
                            </div>
                        </td>
                        <td class="p-4">
                            <span class="px-2.5 py-1 rounded-lg text-xs font-bold {
                                u.role === 'developer' ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30' :
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
                                onclick={() => onOpenUserDetail(u)}
                                class="min-h-[44px] px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
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
