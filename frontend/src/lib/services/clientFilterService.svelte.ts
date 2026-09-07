import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { rbacService } from "$lib/services/rbacService.svelte";

export function useClientFilter(clientsProvider: () => any[]) {
    let searchQuery = $state("");
    let statusFilter = $state("all");
    let companyFilter = $state(rbacService.isFacilityAdmin && rbacService.userCompanyId ? rbacService.userCompanyId : "all");

    let filtered = $derived.by(() => {
        const list = clientsProvider();
        if (!list) return [];
        
        return list.filter(client => {
            // HRBAC Scoping: Facility Admin sees only their facility, Caregiver sees only assigned
            if (!rbacService.isRecordInScope(client)) return false;

            const query = searchQuery.toLowerCase();
            const fullName = `${client?.name_first || ''} ${client?.name_last || ''}`.toLowerCase();
            const matchQuery = !query || fullName.includes(query) || (client?.email || '').toLowerCase().includes(query);
            
            // Case-Insensitive Abgleich für den Status, um Fehler zwischen 'Aktiv' und 'aktiv' zu vermeiden
            const matchStatus = statusFilter === 'all' || (client?.status || '').toLowerCase() === statusFilter.toLowerCase();
            
            let effectiveCompanyFilter = rbacService.isFacilityAdmin && rbacService.userCompanyId ? rbacService.userCompanyId : companyFilter;

            let matchCompany = true;
            if (effectiveCompanyFilter !== 'all') {
                const clientHasCompany = client?.company === effectiveCompanyFilter || (Array.isArray(client?.company) && client.company.includes(effectiveCompanyFilter));
                
                const selectedComp = orgaStore.company?.data?.find((c: any) => c.id === effectiveCompanyFilter);
                const companyHasClient = selectedComp && Array.isArray(selectedComp.clients) && selectedComp.clients.includes(client.id);
                
                matchCompany = !!(clientHasCompany || companyHasClient);
            }
            
            return matchQuery && matchStatus && matchCompany;
        });
    });

    // Klienten alphabetisch nach Nachname, dann Vorname sortieren
    let sorted = $derived.by(() => {
        return [...filtered].sort((a, b) => {
            const nameA = `${a.name_last || ''} ${a.name_first || ''}`.trim();
            const nameB = `${b.name_last || ''} ${b.name_first || ''}`.trim();
            return nameA.localeCompare(nameB);
        });
    });

    return {
        get searchQuery() { return searchQuery; },
        set searchQuery(v) { searchQuery = v; },
        get statusFilter() { return statusFilter; },
        set statusFilter(v) { statusFilter = v; },
        get companyFilter() { return companyFilter; },
        set companyFilter(v) { companyFilter = v; },
        get filtered() { return filtered; },
        get sorted() { return sorted; }
    };
}