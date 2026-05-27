export function useInsuranceFilter(provider: () => any[]) {
    let searchQuery = $state("");
    let typeFilter = $state("all");

    let filtered = $derived.by(() => {
        const list = provider();
        if (!list) return [];
        
        return list.filter(ins => {
            const query = searchQuery.toLowerCase();
            
            // Suche in Name, Stadt oder E-Mail
            const matchQuery = !query || 
                (ins.name || '').toLowerCase().includes(query) || 
                (ins.city || '').toLowerCase().includes(query) ||
                (ins.email || '').toLowerCase().includes(query);
            
            const matchType = typeFilter === 'all' || (ins.type || '') === typeFilter;
            
            return matchQuery && matchType;
        });
    });

    // Krankenkassen alphabetisch nach Name sortieren
    let sorted = $derived.by(() => {
        return [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });

    return {
        get searchQuery() { return searchQuery; },
        set searchQuery(v) { searchQuery = v; },
        get typeFilter() { return typeFilter; },
        set typeFilter(v) { typeFilter = v; },
        get filtered() { return filtered; },
        get sorted() { return sorted; }
    };
}