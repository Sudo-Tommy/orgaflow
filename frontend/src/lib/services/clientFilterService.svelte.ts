import { orgaStore } from "$lib/stores/orgaStore.svelte";

export function useClientFilter(clientsProvider: () => any[]) {
    let searchQuery = $state("");
    let statusFilter = $state("all");
    let companyFilter = $state("all");

    let filtered = $derived.by(() => {
        const list = clientsProvider();
        if (!list) return [];
        
        return list.filter(client => {
            const query = searchQuery.toLowerCase();
            const fullName = `${client?.name_first || ''} ${client?.name_last || ''}`.toLowerCase();
            const matchQuery = !query || fullName.includes(query) || (client?.email || '').toLowerCase().includes(query);
            
            // Case-Insensitive Abgleich für den Status, um Fehler zwischen 'Aktiv' und 'aktiv' zu vermeiden
            const matchStatus = statusFilter === 'all' || (client?.status || '').toLowerCase() === statusFilter.toLowerCase();
            
            let matchCompany = true;
            if (companyFilter !== 'all') {
                const clientHasCompany = client?.company === companyFilter || (Array.isArray(client?.company) && client.company.includes(companyFilter));
                
                const selectedComp = orgaStore.company?.data?.find((c: any) => c.id === companyFilter);
                const companyHasClient = selectedComp && Array.isArray(selectedComp.clients) && selectedComp.clients.includes(client.id);
                
                matchCompany = !!(clientHasCompany || companyHasClient);
            }
            
            return matchQuery && matchStatus && matchCompany;
        });
    });

    return {
        get searchQuery() { return searchQuery; },
        set searchQuery(v) { searchQuery = v; },
        get statusFilter() { return statusFilter; },
        set statusFilter(v) { statusFilter = v; },
        get companyFilter() { return companyFilter; },
        set companyFilter(v) { companyFilter = v; },
        get filtered() { return filtered; }
    };
}