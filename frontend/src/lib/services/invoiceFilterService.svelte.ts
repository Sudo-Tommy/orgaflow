import { rbacService } from "$lib/services/rbacService.svelte";
import { compareInvoicesByDateDesc } from "$lib/utils/invoice";

export function isOpenInvoice(inv: any): boolean {
    if (!inv) return false;
    const s = inv.status || '';
    return s !== 'Abgeschlossen' && s !== 'Storniert' && s !== 'Abgelehnt';
}

export function useInvoiceFilter(invoicesProvider: () => any[], initialStatus = "all") {
    let searchQuery = $state("");
    let statusFilter = $state(initialStatus);
    let companyFilter = $state(rbacService.isFacilityAdmin && rbacService.userCompanyId ? rbacService.userCompanyId : "all");

    let scopedList = $derived.by(() => {
        if (!rbacService.canAccessFinances) return [];
        const list = invoicesProvider();
        if (!list) return [];
        return list.filter(inv => rbacService.isRecordInScope(inv));
    });

    let filtered = $derived.by(() => {
        return scopedList.filter(inv => {
            const query = searchQuery.toLowerCase().trim();
            const c = Array.isArray(inv.expand?.client) ? inv.expand.client[0] : inv.expand?.client;
            const clientName = c ? `${c.name_first || ''} ${c.name_last || ''}`.toLowerCase() : '';
            
            const matchQuery = !query || 
                (inv.invoice_nr || '').toLowerCase().includes(query) || 
                clientName.includes(query) ||
                (inv.notes || '').toLowerCase().includes(query);
            
            let matchStatus = true;
            if (statusFilter === 'offen' || statusFilter === 'open') {
                matchStatus = isOpenInvoice(inv);
            } else if (statusFilter === 'bezahlt') {
                matchStatus = (inv.status || '').toLowerCase() === 'abgeschlossen';
            } else if (statusFilter !== 'all') {
                matchStatus = (inv.status || '') === statusFilter;
            }

            const effectiveCompanyFilter = rbacService.isFacilityAdmin && rbacService.userCompanyId ? rbacService.userCompanyId : companyFilter;
            const matchCompany = effectiveCompanyFilter === 'all' || inv.company === effectiveCompanyFilter || (Array.isArray(inv.company) && inv.company.includes(effectiveCompanyFilter));
            
            return matchQuery && matchStatus && matchCompany;
        });
    });

    let sorted = $derived.by(() => {
        return [...filtered].sort(compareInvoicesByDateDesc);
    });

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
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    });

    let filteredSum = $derived(filtered.reduce((sum, inv) => sum + (inv.brutto || 0), 0));
    let openCount = $derived(scopedList.filter(isOpenInvoice).length);
    let openSum = $derived(scopedList.filter(isOpenInvoice).reduce((sum, inv) => sum + (inv.brutto || 0), 0));
    let paidCount = $derived(scopedList.filter(inv => (inv.status || '').toLowerCase() === 'abgeschlossen').length);

    return {
        get searchQuery() { return searchQuery; },
        set searchQuery(v) { searchQuery = v; },
        get statusFilter() { return statusFilter; },
        set statusFilter(v) { statusFilter = v; },
        get companyFilter() { return companyFilter; },
        set companyFilter(v) { companyFilter = v; },
        get filtered() { return filtered; },
        get sorted() { return sorted; },
        get grouped() { return grouped; },
        get filteredSum() { return filteredSum; },
        get openCount() { return openCount; },
        get openSum() { return openSum; },
        get paidCount() { return paidCount; }
    };
}
