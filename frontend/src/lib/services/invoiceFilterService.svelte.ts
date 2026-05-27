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
            const matchCompany = companyFilter === 'all' || inv.company === companyFilter || (Array.isArray(inv.company) && inv.company.includes(companyFilter));
            
            return matchQuery && matchStatus && matchCompany;
        });
    });

    // Rechnungen nach Rechnungsnummer sortieren (neueste oben)
    let sorted = $derived.by(() => {
        return [...filtered].sort((a, b) => {
            const nrA = a.invoice_nr || '';
            const nrB = b.invoice_nr || '';
            return nrB.localeCompare(nrA, undefined, { numeric: true });
        });
    });

    // Nach Firma gruppieren inkl. Gesamtsummen der Beträge
    let grouped = $derived.by(() => {
        const groups: Record<string, { invoices: any[], totalBrutto: number, totalNetto: number }> = {};
        for (const inv of sorted) {
            const companyName = inv.expand?.company?.name || 'Allgemein / Keine Firmenzuordnung';
            if (!groups[companyName]) {
                groups[companyName] = { invoices: [], totalBrutto: 0, totalNetto: 0 };
            }
            groups[companyName].invoices.push(inv);
            groups[companyName].totalBrutto += (inv.brutto || 0);
            groups[companyName].totalNetto += (inv.netto || 0);
        }
        // Alphabetisch nach Firmenname sortieren
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    });

    return {
        get searchQuery() { return searchQuery; },
        set searchQuery(v) { searchQuery = v; },
        get statusFilter() { return statusFilter; },
        set statusFilter(v) { statusFilter = v; },
        get companyFilter() { return companyFilter; },
        set companyFilter(v) { companyFilter = v; },
        get filtered() { return filtered; },
        get sorted() { return sorted; },
        get grouped() { return grouped; }
    };
}