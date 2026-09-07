<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { useCompanyService } from "$lib/services/companyService.svelte";
    import CompanyContactCard from "$lib/components/company/CompanyContactCard.svelte";
    import CompanyAddressCard from "$lib/components/company/CompanyAddressCard.svelte";
    import CompanyBankCard from "$lib/components/company/CompanyBankCard.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from "svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { goto } from "$app/navigation";

    const companyService = useCompanyService();

    $effect(() => {
        if (!rbacService.isAdmin) {
            toastStore.warning("Keine Berechtigung für Firmendaten.");
            goto('/dashboard');
        }
    });

    // pb.authStore ist nicht nativ reaktiv in Svelte. Wir zwingen Svelte zum Update!
    let user = $state(pb.authStore.record || pb.authStore.model);
    
    onMount(() => {
        return pb.authStore.onChange(() => {
            user = pb.authStore.record || pb.authStore.model;
        });
    });

    let isReadOnly = $derived(pb.authStore.isSuperuser ? false : (user?.role !== 'superadmin' && user?.role !== 'admin'));

    let availableCompanies = $derived.by(() => {
        let all = orgaStore.company?.data || [];
        
        // Sortiere alphabetisch nach Stadt für eine deterministische Reihenfolge
        all = [...all].sort((a, b) => (a.city || '').localeCompare(b.city || ''));
        
        if (pb.authStore.isSuperuser || user?.role === 'superadmin') return all;
        if (!user?.company) return [];
        
        let rawComp = user.company;
        if (typeof rawComp === 'string' && rawComp.startsWith('[')) { try { rawComp = JSON.parse(rawComp); } catch {} }
        const userCompIds = Array.isArray(rawComp) ? rawComp : (rawComp ? [rawComp] : []);
        return all.filter((c: any) => userCompIds.includes(c.id));
    });
    let selectedCompanyId = $state("");

    $effect(() => {
        if (!orgaStore.company?.isLoading && availableCompanies.length > 0 && !selectedCompanyId) {
            let initialId = '';
            
            let rawComp = user?.company;
            if (typeof rawComp === 'string' && rawComp.startsWith('[')) { try { rawComp = JSON.parse(rawComp); } catch {} }
            
            if (rawComp && rawComp.length > 0) {
                initialId = Array.isArray(rawComp) ? rawComp[0] : rawComp;
            } else if (user?.role === 'superadmin' || pb.authStore.isSuperuser) {
                initialId = availableCompanies[0].id;
            }
            
            if (initialId) {
                selectedCompanyId = initialId;
            }
        }
    });

    $effect(() => {
        if (selectedCompanyId) {
            const record = availableCompanies.find((c: any) => c.id === selectedCompanyId);
            if (record && record.id !== companyService.id) {
                companyService.load(record);
            }
        }
    });
</script>

<form onsubmit={(e) => { e.preventDefault(); companyService.save(); }} class="flex flex-col h-full relative">
    <div class="orga-page-header animate-enter">
        <div>
            <h1 class="orga-page-title">Firmendaten</h1>
            <p class="orga-page-subtitle">Verwalten Sie hier die Stammdaten, Adresse und Bankverbindung Ihres Unternehmens.</p>
        </div>
        <div class="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-4 sm:mt-0 w-full sm:w-auto">
            {#if availableCompanies.length > 1}
                <select bind:value={selectedCompanyId} class="orga-input-clear py-3 sm:py-2 text-sm font-bold text-indigo-700 cursor-pointer shadow-sm border-indigo-200 bg-indigo-50/50 w-full sm:w-auto">
                    {#each availableCompanies as comp}
                        <option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>
                    {/each}
                </select>
            {/if}
            {#if companyService.successMsg}
                <span class="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">{companyService.successMsg}</span>
            {/if}
            <button type="submit" disabled={companyService.isLoading || !companyService.isLoaded || isReadOnly} class="orga-button-primary shadow-indigo-600/20 w-full sm:w-auto justify-center py-3 sm:py-2.5">
                <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                {companyService.isLoading ? 'Speichert...' : 'Änderungen speichern'}
            </button>
        </div>
    </div>

    {#if !companyService.isLoaded}
        <div class="text-center py-12 text-neutral-500 font-medium animate-pulse animate-enter delay-100">Lade Firmendaten...</div>
    {:else}
        {#if companyService.errorMsg}
            <div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 animate-enter">{companyService.errorMsg}</div>
        {/if}
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-12 animate-enter delay-100">
            <div class="xl:col-span-1"><CompanyContactCard bind:logoFile={companyService.logoFile} bind:deleteLogo={companyService.deleteLogo} formData={companyService.formData} existingLogoUrl={companyService.existingLogoUrl} isLoading={companyService.isLoading || isReadOnly} /></div>
            <div class="xl:col-span-2 space-y-8"><CompanyAddressCard formData={companyService.formData} isLoading={companyService.isLoading || isReadOnly} /><CompanyBankCard formData={companyService.formData} isLoading={companyService.isLoading || isReadOnly} /></div>
        </div>
    {/if}
</form>