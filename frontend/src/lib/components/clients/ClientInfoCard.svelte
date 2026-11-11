<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import ClientLinkInsuranceModal from "./ClientLinkInsuranceModal.svelte";
    import ClientBudgetModal from "./ClientBudgetModal.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import {
        getCareLevel,
        getAnnualMaxVHP,
        getAnnualMaxEntlastung,
        calculateUsedBudgets,
        calculateAge
    } from "./info/clientBudgetCalculations";
    import ClientPersonalDetails from "./info/ClientPersonalDetails.svelte";
    import ClientRelationsCards from "./info/ClientRelationsCards.svelte";
    import ClientFinancialSummary from "./info/ClientFinancialSummary.svelte";

    let { client } = $props<{ client: any }>();

    let linkInsuranceModal = $state<ReturnType<typeof ClientLinkInsuranceModal>>();
    let budgetModal = $state<ReturnType<typeof ClientBudgetModal>>();

    let currentYear = new Date().getFullYear();
    let careLevel = $derived(getCareLevel(client.level_of_care));
    let annualMaxVHP = $derived(getAnnualMaxVHP(careLevel));
    let annualMaxEntlastung = $derived(getAnnualMaxEntlastung(careLevel));

    let usedBudgets = $derived.by(() => {
        return calculateUsedBudgets(client, orgaStore.invoices?.data || [], orgaStore.appointments?.data || [], currentYear);
    });

    let usedGemeinsamerJahresbetrag = $derived(usedBudgets.usedGemeinsamerJahresbetrag);
    let usedEntlastungsleistungen = $derived(usedBudgets.usedEntlastungsleistungen);

    let hasBudgetWarning = $derived(usedGemeinsamerJahresbetrag > 0 && annualMaxVHP === 0);
    let warningText = $derived(`Für Pflegegrad ${careLevel} besteht kein Anspruch auf den Gemeinsamen Jahresbetrag. Die Kosten müssen ggf. privat getragen werden.`);

    let previousYearRemainingBudget = $derived.by(() => {
        const today = new Date();
        const isAfterJune30 = today.getMonth() > 5 || (today.getMonth() === 5 && today.getDate() > 30);
        return isAfterJune30 ? 0 : (client.restbudget_vorjahr ?? 0);
    });

    let age = $derived(calculateAge(client.birthdate));
    let remainingVHP = $derived(Math.max(0, annualMaxVHP - usedGemeinsamerJahresbetrag));
    let remainingEntlastung = $derived(Math.max(0, annualMaxEntlastung - usedEntlastungsleistungen));
    let totalAvailableBudget = $derived(remainingVHP + remainingEntlastung + previousYearRemainingBudget);

    async function unlinkInsurance() {
        const insName = client.expand?.insurance?.name || "Krankenkasse";
        if (!(await confirmStore.ask(
            `Möchten Sie die Verknüpfung zu "${insName}" wirklich aufheben?`,
            "Krankenkasse trennen?",
            "Verknüpfung aufheben",
            "Abbrechen",
            true
        ))) return;

        try {
            await pb.collection('clients').update(client.id, { insurance: null });
            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(client.id, { 
                    expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', 
                    requestKey: null 
                }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 300);
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try { navigator.vibrate(40); } catch {}
            }
            toastStore.success("Verknüpfung zur Krankenkasse aufgehoben.");
        } catch (err: any) {
            console.error(err);
            toastStore.error("Fehler beim Aufheben der Krankenkassen-Verknüpfung.");
        }
    }

    async function unlinkCaregiver() {
        const cgName = `${client.expand?.caregiver?.name_first || ''} ${client.expand?.caregiver?.name_last || ''}`.trim() || "gesetzliche Betreuung";
        if (!(await confirmStore.ask(
            `Möchten Sie die Verknüpfung zur gesetzlichen Betreuung ("${cgName}") von diesem Klienten trennen?`,
            "Betreuung trennen?",
            "Verknüpfung aufheben",
            "Abbrechen",
            true
        ))) return;

        try {
            await pb.collection('clients').update(client.id, { caregiver: null });
            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(client.id, { 
                    expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', 
                    requestKey: null 
                }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 300);
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try { navigator.vibrate(40); } catch {}
            }
            toastStore.success("Verknüpfung zur gesetzlichen Betreuung aufgehoben.");
        } catch (err: any) {
            console.error(err);
            toastStore.error("Fehler beim Aufheben der Betreuungs-Verknüpfung.");
        }
    }
</script>

<div class="orga-card-white relative overflow-hidden group bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 rounded-3xl shadow-sm">
    <div class="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150 pointer-events-none z-0"></div>
    
    <div class="p-6 md:p-8 relative z-10">
        <div class="flex items-center gap-4 mb-8 border-b border-neutral-100 dark:border-slate-800/80 pb-6">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-2xl shrink-0 shadow-lg shadow-indigo-500/20 ring-2 ring-white/20">
                {(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}
            </div>
            <div class="min-w-0 flex-1">
                <h2 class="text-xl font-black text-neutral-900 dark:text-white truncate">{client.name_first} {client.name_last}</h2>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border border-neutral-200/60 dark:border-slate-700">ID: {client.id}</span>
                    {#if client.status}
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full {client.status === 'Aktiv' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-neutral-100 dark:bg-slate-800 text-neutral-500 dark:text-slate-400'}">
                            {client.status}
                        </span>
                    {/if}
                </div>
            </div>
        </div>

        <ClientPersonalDetails {client} {age} />
        
        <ClientRelationsCards
            {client}
            onUnlinkInsurance={unlinkInsurance}
            onOpenLinkInsurance={() => linkInsuranceModal?.open()}
            onUnlinkCaregiver={unlinkCaregiver}
        />

        <ClientFinancialSummary
            {currentYear}
            {careLevel}
            {annualMaxVHP}
            {annualMaxEntlastung}
            {usedGemeinsamerJahresbetrag}
            {usedEntlastungsleistungen}
            {remainingVHP}
            {remainingEntlastung}
            {previousYearRemainingBudget}
            {totalAvailableBudget}
            {hasBudgetWarning}
            {warningText}
            onOpenBudget={() => budgetModal?.open(client)}
        />
    </div>
</div>

<ClientLinkInsuranceModal bind:this={linkInsuranceModal} {client} />
<ClientBudgetModal bind:this={budgetModal} {usedGemeinsamerJahresbetrag} {usedEntlastungsleistungen} />