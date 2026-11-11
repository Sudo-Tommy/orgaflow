<script lang="ts">
    import type { ClientFormData } from "../types";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { sortAlphabetical, sortPersons } from "$lib/utils/sortHelper";
    import { Stethoscope, Users } from "lucide-svelte";

    interface Props {
        formData: ClientFormData;
        assignedUserId: string;
        availableCaregivers: any[];
        isLoading: boolean;
    }

    let { 
        formData = $bindable(), 
        assignedUserId = $bindable(), 
        availableCaregivers, 
        isLoading 
    }: Props = $props();

    let sortedInsurances = $derived(sortAlphabetical(orgaStore.insurancies?.data || [], (i: any) => i.name || ''));
    let sortedCaregivers = $derived(sortPersons(availableCaregivers));
    let sortedHomes = $derived(sortAlphabetical(orgaStore.retirement_homes?.data || [], (h: any) => h.name || ''));
</script>

<div class="space-y-6 animate-enter">
    <!-- EINSTUFUNG & KRANKENKASSE -->
    <div>
        <h3 class="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Stethoscope class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Pflegeeinstufung & Krankenkasse</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label for="new-status" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Betreuungs-Status</label>
                <select id="new-status" bind:value={formData.status} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading}>
                    <option value="Aktiv">Aktiv</option>
                    <option value="Inaktiv">Inaktiv</option>
                    <option value="Verstorben">Verstorben</option>
                </select>
            </div>
            <div>
                <label for="new-carelevel" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Pflegegrad</label>
                <select id="new-carelevel" bind:value={formData.level_of_care} class="orga-input-clear min-h-[44px] py-2 text-sm font-semibold" disabled={isLoading}>
                    <option value="">Keiner / Noch nicht eingestuft</option>
                    <option value="0">Pflegegrad 0</option>
                    <option value="1">Pflegegrad 1 (125 € Entlastungsbetrag)</option>
                    <option value="2">Pflegegrad 2</option>
                    <option value="3">Pflegegrad 3</option>
                    <option value="4">Pflegegrad 4</option>
                    <option value="5">Pflegegrad 5</option>
                </select>
            </div>

            <div>
                <label for="new-insurance" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Kranken- / Pflegekasse</label>
                <select id="new-insurance" bind:value={formData.insurance} class="orga-input-clear min-h-[44px] py-2 text-sm cursor-pointer" disabled={isLoading}>
                    <option value="">Keine / Unbekannt</option>
                    <option value="other" class="font-bold text-indigo-700 dark:text-indigo-400">➕ Andere / Neue Krankenkasse erfassen...</option>
                    {#each sortedInsurances as ins (ins.id)}
                        <option value={ins.id}>{ins.name}</option>
                    {/each}
                </select>
            </div>
            <div>
                <label for="new-ins-nr" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Versichertennummer (KV-Nr.)</label>
                <input id="new-ins-nr" type="text" bind:value={formData.insurance_nr} placeholder="z. B. Z123456789" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
            </div>

            {#if formData.insurance === "other"}
                <div class="sm:col-span-2 bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 animate-enter">
                    <label for="new-other-ins-name" class="block text-xs font-bold text-indigo-950 dark:text-indigo-200 mb-1">Name der neuen Krankenkasse</label>
                    <input id="new-other-ins-name" type="text" bind:value={formData.other_insurance_name} placeholder="z. B. Barmer, DAK, AOK PLUS..." class="orga-input-clear bg-white dark:bg-slate-900 min-h-[44px] py-2 text-sm" disabled={isLoading} />
                    <p class="text-[11px] text-indigo-700 dark:text-indigo-300 mt-1.5">Wird automatisch in das Kassenverzeichnis übernommen und steht künftig allen Klienten zur Verfügung.</p>
                </div>
            {/if}
        </div>
    </div>

    <!-- BETREUUNG & EINRICHTUNG -->
    <div class="pt-5 border-t border-slate-100 dark:border-slate-800">
        <h3 class="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Users class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Organisation & Einrichtung</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label for="new-assigned-user" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Feste Bezugspflegekraft (Mitarbeiter)</label>
                <select id="new-assigned-user" bind:value={assignedUserId} class="orga-input-clear min-h-[44px] py-2 text-sm cursor-pointer" disabled={isLoading}>
                    <option value="">Keine feste Zuweisung</option>
                    {#each sortedCaregivers as user (user.id)}
                        <option value={user.id}>{user.name_first} {user.name_last}</option>
                    {/each}
                </select>
            </div>
            <div>
                <label for="new-home" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Seniorenheim / Einrichtung</label>
                <select id="new-home" bind:value={formData.retirement_homes} class="orga-input-clear min-h-[44px] py-2 text-sm cursor-pointer" disabled={isLoading}>
                    <option value="">Eigener Haushalt (kein Heim)</option>
                    {#each sortedHomes as home (home.id)}
                        <option value={home.id}>{home.name} ({home.city})</option>
                    {/each}
                </select>
            </div>
        </div>
    </div>
</div>
