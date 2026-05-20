export function useInvoiceFilter(invoicesProvider: () => any[]) {
    let searchQuery = $state("");
    let statusFilter = $state("all");
    let companyFilter = $state("all");

    let filtered = $derived.by(() => {
        const list = invoicesProvider();
        if (!list) return [];
        
        return list.filter(inv => {
            const query = searchQuery.toLowerCase();
            
            // Klienten sicher entpacken (kann in PocketBase Array oder Einzelobjekt sein)
            const c = Array.isArray(inv.expand?.client) ? inv.expand.client[0] : inv.expand?.client;
            const clientName = c ? `${c.name_first || ''} ${c.name_last || ''}`.toLowerCase() : '';
            
            // Suche in Rechnungsnummer, Klientenname oder Notizen
            const matchQuery = !query || 
                (inv.invoice_nr || '').toLowerCase().includes(query) || 
                clientName.includes(query) ||
                (inv.notes || '').toLowerCase().includes(query);
            
            // Filter nach Status
            const matchStatus = statusFilter === 'all' || (inv.status || '') === statusFilter;
            const matchCompany = companyFilter === 'all' || inv.company === companyFilter;
            
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