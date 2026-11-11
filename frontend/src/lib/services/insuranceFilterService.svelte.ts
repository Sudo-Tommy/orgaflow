export type InsuranceSortOption = 'name-asc' | 'name-desc' | 'city-asc' | 'clients-desc' | 'created-desc';
export type InsuranceTypeOption = 'all' | 'GKV (Gesetzlich)' | 'PKV (Privat)' | 'Beihilfe' | 'Berufsgenossenschaft';
export type InsuranceClientFilterOption = 'all' | 'with_clients' | 'without_clients';

export function useInsuranceFilter(
    provider: () => any[],
    clientsProvider?: () => any[]
) {
    let searchQuery = $state("");
    let typeFilter = $state<string>("all");
    let clientFilter = $state<InsuranceClientFilterOption>("all");
    let sortBy = $state<InsuranceSortOption>("name-asc");

    // Map von Insurance-ID -> Array an Klienten
    let clientsByInsurance = $derived.by(() => {
        const clients = clientsProvider ? clientsProvider() : [];
        const map = new Map<string, any[]>();
        if (!clients || !Array.isArray(clients)) return map;

        for (const c of clients) {
            const insId = typeof c.insurance === 'string' 
                ? c.insurance 
                : (c.insurance?.id || c.expand?.insurance?.id);
            if (insId) {
                if (!map.has(insId)) {
                    map.set(insId, []);
                }
                map.get(insId)!.push(c);
            }
        }
        return map;
    });

    function getClientsForInsurance(insuranceId: string): any[] {
        return clientsByInsurance.get(insuranceId) || [];
    }

    function getClientCountForInsurance(insuranceId: string): number {
        return (clientsByInsurance.get(insuranceId) || []).length;
    }

    let filtered = $derived.by(() => {
        const list = provider();
        if (!list || !Array.isArray(list)) return [];
        
        const q = searchQuery.trim().toLowerCase();

        return list.filter(ins => {
            // 1. Suche in Name, Zusatz/Abteilung, PLZ, Stadt, E-Mail, Telefon & Notizen
            if (q) {
                const searchCorpus = [
                    ins.name,
                    ins.addition,
                    ins.zip,
                    ins.city,
                    ins.street,
                    ins.email,
                    ins.phone,
                    ins.notes
                ].filter(Boolean).join(" ").toLowerCase();

                if (!searchCorpus.includes(q)) {
                    return false;
                }
            }
            
            // 2. Versicherungsart-Filter
            if (typeFilter !== 'all') {
                const insType = (ins.type || '').toLowerCase();
                const targetType = typeFilter.toLowerCase();
                if (!insType.includes(targetType) && insType !== targetType) {
                    return false;
                }
            }

            // 3. Klienten-Filter
            if (clientFilter !== 'all') {
                const clientCount = getClientCountForInsurance(ins.id);
                if (clientFilter === 'with_clients' && clientCount === 0) return false;
                if (clientFilter === 'without_clients' && clientCount > 0) return false;
            }
            
            return true;
        });
    });

    // Sortierung nach gewählter Option
    let sorted = $derived.by(() => {
        const result = [...filtered];

        return result.sort((a, b) => {
            switch (sortBy) {
                case 'name-desc':
                    return (b.name || '').localeCompare(a.name || '', 'de', { sensitivity: 'base' });
                case 'city-asc': {
                    const cityA = (a.city || '').trim();
                    const cityB = (b.city || '').trim();
                    if (cityA && cityB) return cityA.localeCompare(cityB, 'de', { sensitivity: 'base' });
                    if (cityA) return -1;
                    if (cityB) return 1;
                    return (a.name || '').localeCompare(b.name || '', 'de', { sensitivity: 'base' });
                }
                case 'clients-desc': {
                    const countA = getClientCountForInsurance(a.id);
                    const countB = getClientCountForInsurance(b.id);
                    if (countA !== countB) return countB - countA;
                    return (a.name || '').localeCompare(b.name || '', 'de', { sensitivity: 'base' });
                }
                case 'created-desc': {
                    const dateA = a.created ? new Date(a.created).getTime() : 0;
                    const dateB = b.created ? new Date(b.created).getTime() : 0;
                    return dateB - dateA;
                }
                case 'name-asc':
                default:
                    return (a.name || '').localeCompare(b.name || '', 'de', { sensitivity: 'base' });
            }
        });
    });

    function resetFilters() {
        searchQuery = "";
        typeFilter = "all";
        clientFilter = "all";
        sortBy = "name-asc";
    }

    return {
        get searchQuery() { return searchQuery; },
        set searchQuery(v) { searchQuery = v; },
        get typeFilter() { return typeFilter; },
        set typeFilter(v) { typeFilter = v; },
        get clientFilter() { return clientFilter; },
        set clientFilter(v) { clientFilter = v; },
        get sortBy() { return sortBy; },
        set sortBy(v) { sortBy = v; },
        get filtered() { return filtered; },
        get sorted() { return sorted; },
        getClientsForInsurance,
        getClientCountForInsurance,
        resetFilters
    };
}