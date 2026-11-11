<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { BILLING_TYPE_OPTIONS } from "$lib/services/clientBillingService";
    import { sortAlphabetical, sortPersons } from "$lib/utils/sortHelper";

    let { editState } = $props<{ editState: any }>();

    let sortedInsurances = $derived.by(() => {
        return sortAlphabetical(orgaStore.insurancies?.data || [], (i: any) => i.name);
    });

    let sortedEmployees = $derived.by(() => {
        const emps = (orgaStore.users?.data || []).filter((u: any) => u.role !== 'client');
        return sortPersons(emps);
    });

    let sortedCompanies = $derived.by(() => {
        return sortAlphabetical(orgaStore.company?.data || [], (c: any) => c.name || c.city);
    });
</script>

<div class="space-y-6 animate-enter">
    <div>
        <h3 class="text-xs font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider mb-3">1. Einstufung & Krankenkasse</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
                <label for="edit-carelevel" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Pflegegrad</label>
                <select id="edit-carelevel" bind:value={editState.formData.level_of_care} class="orga-input-clear text-base font-bold min-h-[44px]" disabled={editState.isLoading}>
                    <option value="">Keiner / Nicht beantragt</option>
                    <option value="0">Pflegegrad 0</option>
                    <option value="1">Pflegegrad 1</option>
                    <option value="2">Pflegegrad 2</option>
                    <option value="3">Pflegegrad 3</option>
                    <option value="4">Pflegegrad 4</option>
                    <option value="5">Pflegegrad 5</option>
                </select>
            </div>
            <div>
                <label for="edit-insurance" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Kranken- / Pflegekasse</label>
                <select id="edit-insurance" bind:value={editState.formData.insurance} class="orga-input-clear text-base cursor-pointer min-h-[44px]" disabled={editState.isLoading}>
                    <option value="">Keine / Selbstzahler</option>
                    {#each sortedInsurances as ins (ins.id)}
                        <option value={ins.id}>{ins.name}</option>
                    {/each}
                </select>
            </div>
            <div>
                <label for="edit-ins-nr" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Versichertennummer</label>
                <input id="edit-ins-nr" type="text" bind:value={editState.formData.insurance_nr} placeholder="z. B. A123456789" class="orga-input-clear text-base uppercase min-h-[44px]" disabled={editState.isLoading} />
            </div>
        </div>
    </div>

    <!-- Zuständige Personen & Firmen -->
    <div class="pt-5 border-t border-neutral-200 dark:border-slate-800">
        <h3 class="text-xs font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider mb-3">2. Interne Zuordnung</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label for="edit-assigned-employee" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Zuständiger Assistent (Intern)</label>
                <select id="edit-assigned-employee" bind:value={editState.formData.assigned_employee} class="orga-input-clear text-base cursor-pointer min-h-[44px]" disabled={editState.isLoading}>
                    <option value="">Kein Assistent zugewiesen</option>
                    {#each sortedEmployees as emp (emp.id)}
                        <option value={emp.id}>{emp.name_last}, {emp.name_first} ({emp.role === 'employee' ? 'Assistent' : emp.role})</option>
                    {/each}
                </select>
            </div>
            <div>
                <label for="edit-company" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Zuständiger Standort / Firma</label>
                <select id="edit-company" bind:value={editState.formData.company} class="orga-input-clear text-base cursor-pointer min-h-[44px]" disabled={editState.isLoading}>
                    <option value="">Keine Firma zugewiesen</option>
                    {#each sortedCompanies as comp (comp.id)}
                        <option value={comp.id}>{comp.name || comp.city}</option>
                    {/each}
                </select>
            </div>
        </div>
    </div>

    <!-- Abrechnungskonditionen (nur für Finanzen/Admins) -->
    {#if rbacService.canAccessFinances}
        <div class="pt-5 border-t border-neutral-200 dark:border-slate-800">
            <h3 class="text-xs font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider mb-3">3. Abrechnungssätze & Konditionen</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div class="sm:col-span-2 md:col-span-1">
                    <label for="edit-billing-type" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Standard-Abrechnungsart</label>
                    <select 
                        id="edit-billing-type" 
                        value={editState.formData.billing_type} 
                        onchange={(e) => editState.handleBillingTypeChanged((e.target as HTMLSelectElement).value)}
                        class="orga-input-clear text-base font-bold cursor-pointer min-h-[44px]" 
                        disabled={editState.isLoading}
                    >
                        <option value="">Keine festgelegt</option>
                        {#each BILLING_TYPE_OPTIONS as opt (opt.id)}
                            <option value={opt.id}>{opt.label}</option>
                        {/each}
                    </select>
                </div>
                <div>
                    <label for="edit-wage" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Stundensatz (€)</label>
                    <input id="edit-wage" type="number" step="0.5" bind:value={editState.formData.hourly_wage} class="orga-input-clear text-base min-h-[44px]" disabled={editState.isLoading} />
                </div>
                <div>
                    <label for="edit-km" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Fahrtkosten (€/km)</label>
                    <input id="edit-km" type="number" step="0.05" bind:value={editState.formData.km_rate} class="orga-input-clear text-base min-h-[44px]" disabled={editState.isLoading} />
                </div>
                <div>
                    <label for="edit-tax" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Umsatzsteuer-Satz (%)</label>
                    <select id="edit-tax" bind:value={editState.formData.tax_rate} class="orga-input-clear text-base font-semibold min-h-[44px]" disabled={editState.isLoading}>
                        <option value="0">0% (Umsatzsteuerbefreit)</option>
                        <option value="7">7% (Ermäßigter Steuersatz)</option>
                        <option value="19">19% (Regulärer Steuersatz)</option>
                    </select>
                </div>
            </div>
        </div>
    {/if}
</div>
