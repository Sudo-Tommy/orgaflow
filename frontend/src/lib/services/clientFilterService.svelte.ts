import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { rbacService } from "$lib/services/rbacService.svelte";
import { getClientCompletionStatus } from "$lib/services/clientCompletionService";
import { sortPersons } from "$lib/utils/sortHelper";

export function useClientFilter(clientsProvider: () => any[]) {
    let searchQuery = $state("");
    let statusFilter = $state("all");
    let companyFilter = $state(rbacService.isFacilityAdmin && rbacService.userCompanyId ? rbacService.userCompanyId : "all");
    let scopeFilter = $state<'all' | 'mine'>('all');

    let filtered = $derived.by(() => {
        const list = clientsProvider();
        if (!list || !list.length) return [];
        
        const seen = new Set<string>();
        const uniqueList = list.filter(item => {
            if (!item?.id) return true;
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });

        const result = uniqueList.filter(client => {
            const isAssignedToMe = rbacService.isDirectlyAssignedClient(client);

            if (!isAssignedToMe && !rbacService.isRecordInScope(client)) return false;
            if (scopeFilter === 'mine' && !isAssignedToMe) return false;

            const query = searchQuery.toLowerCase();
            const fullName = `${client?.name_first || ''} ${client?.name_last || ''}`.toLowerCase();
            const matchQuery = !query || fullName.includes(query) || (client?.email || '').toLowerCase().includes(query);
            
            let matchStatus = true;
            if (statusFilter === 'all') {
                matchStatus = true;
            } else if (statusFilter === 'incomplete') {
                matchStatus = !getClientCompletionStatus(client).isComplete;
            } else if (statusFilter === 'complete') {
                matchStatus = getClientCompletionStatus(client).isComplete;
            } else {
                matchStatus = (client?.status || '').toLowerCase() === statusFilter.toLowerCase();
            }
            
            // Assistenten (Caregiver) haben keinen globalen Standort-Umschalter;
            // ihre zugewiesenen Klienten dürfen niemals durch einen alten Company-Filter ausgeblendet werden.
            let effectiveCompanyFilter = 'all';
            if (rbacService.isFacilityAdmin && rbacService.userCompanyId) {
                effectiveCompanyFilter = rbacService.userCompanyId;
            } else if (rbacService.canSwitchCompanyFilter) {
                effectiveCompanyFilter = companyFilter;
            }

            let matchCompany = true;
            if (effectiveCompanyFilter !== 'all' && !isAssignedToMe) {
                const clientHasCompany = client?.company === effectiveCompanyFilter || (Array.isArray(client?.company) && client.company.includes(effectiveCompanyFilter));
                const selectedComp = orgaStore.company?.data?.find((c: any) => c.id === effectiveCompanyFilter);
                const companyHasClient = selectedComp && Array.isArray(selectedComp.clients) && selectedComp.clients.includes(client.id);
                matchCompany = !!(clientHasCompany || companyHasClient);
            }
            
            return matchQuery && matchStatus && matchCompany;
        });

        return sortPersons(result);
    });

    return {
        get searchQuery() { return searchQuery; },
        set searchQuery(v) { searchQuery = v; },
        get statusFilter() { return statusFilter; },
        set statusFilter(v) { statusFilter = v; },
        get companyFilter() { return companyFilter; },
        set companyFilter(v) { companyFilter = v; },
        get scopeFilter() { return scopeFilter; },
        set scopeFilter(v) { scopeFilter = v; },
        get filtered() { return filtered; },
        get sorted() { return filtered; }
    };
}
