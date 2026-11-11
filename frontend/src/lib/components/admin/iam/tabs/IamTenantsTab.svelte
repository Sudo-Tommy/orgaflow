<script lang="ts">
    import { Building2 } from "lucide-svelte";
    import { sortAlphabetical } from "$lib/utils/sortHelper";

    let {
        companies,
        users,
        clients
    } = $props<{
        companies: any[];
        users: any[];
        clients: any[];
    }>();

    let sortedCompanies = $derived.by(() => {
        return sortAlphabetical(companies || [], (c: any) => c.city || c.name || "");
    });
</script>

<div class="space-y-6 animate-enter">
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
            <div>
                <h3 class="text-base font-black text-slate-900 dark:text-white">Mandanten- &amp; Facility-Verzeichnis</h3>
                <p class="text-xs text-slate-500">Jeder Betrieb bildet eine logische Sicherheits- und Scope-Grenze.</p>
            </div>
            <span class="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-100 dark:border-indigo-900">
                {companies.length} Aktive Mandanten
            </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each sortedCompanies as comp}
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
