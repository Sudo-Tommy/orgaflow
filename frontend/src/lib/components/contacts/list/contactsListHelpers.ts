import type { ClientRecord } from "$lib/types/orgaTypes";
import { getContactType } from "$lib/components/contacts/contactDetailHelpers";

export function getLinkedContactIds(clients: any[], homes: any[]): Set<string> {
    const ids = new Set<string>();
    clients.forEach((c: any) => {
        const list = Array.isArray(c.contacts) ? c.contacts : (c.contacts ? [c.contacts] : []);
        list.forEach((id: string) => ids.add(id));
        if (c.caregiver) ids.add(c.caregiver);
    });
    homes.forEach((h: any) => {
        const list = Array.isArray(h.contacts) ? h.contacts : (h.contacts ? [h.contacts] : []);
        list.forEach((id: string) => ids.add(id));
    });
    return ids;
}

export function filterAndSortContacts(
    rawList: any[],
    filterChip: string,
    searchQuery: string,
    sortBy: string,
    clientsList: ClientRecord[],
    linkedContactIds: Set<string>
): any[] {
    let list = rawList || [];
    if (filterChip === 'caregiver') list = list.filter((c: any) => getContactType(c, clientsList) === 'caregiver');
    else if (filterChip === 'relative') list = list.filter((c: any) => getContactType(c, clientsList) === 'relative');
    else if (filterChip === 'other') list = list.filter((c: any) => getContactType(c, clientsList) === 'other');
    else if (filterChip === 'unassigned') list = list.filter((c: any) => getContactType(c, clientsList) === 'unassigned');
    else if (filterChip === 'linked') list = list.filter((c: any) => linkedContactIds.has(c.id));
    else if (filterChip === 'unlinked') list = list.filter((c: any) => !linkedContactIds.has(c.id));
    else if (filterChip === 'portal') list = list.filter((c: any) => !!c.portal_active);
    else if (filterChip === 'phone') list = list.filter((c: any) => !!c.phone);
    else if (filterChip === 'email') list = list.filter((c: any) => !!c.email);

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        list = list.filter((c: any) => 
            (c.name_first || '').toLowerCase().includes(q) ||
            (c.name_last || '').toLowerCase().includes(q) ||
            (c.company_name || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q) ||
            (c.city || '').toLowerCase().includes(q) ||
            (c.street || '').toLowerCase().includes(q) ||
            (c.zip || '').toLowerCase().includes(q)
        );
    }

    const sorted = [...list];
    if (sortBy === 'name_asc') sorted.sort((a, b) => (a.name_last || a.company_name || '').localeCompare(b.name_last || b.company_name || '', 'de'));
    else if (sortBy === 'name_desc') sorted.sort((a, b) => (b.name_last || b.company_name || '').localeCompare(a.name_last || a.company_name || '', 'de'));
    else if (sortBy === 'company') sorted.sort((a, b) => (a.company_name || '').localeCompare(b.company_name || '', 'de'));
    else if (sortBy === 'city') sorted.sort((a, b) => (a.city || '').localeCompare(b.city || '', 'de'));
    else if (sortBy === 'updated') sorted.sort((a, b) => new Date(b.updated || 0).getTime() - new Date(a.updated || 0).getTime());
    return sorted;
}

export function filterHomes(rawList: any[], filterChip: string, searchQuery: string): any[] {
    let list = rawList || [];
    if (filterChip === 'unverified') list = list.filter((h: any) => !h.is_verified);
    else if (filterChip === 'verified') list = list.filter((h: any) => !!h.is_verified);
    else if (filterChip === 'portal') list = list.filter((h: any) => h.source === 'portal');

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        list = list.filter((h: any) => 
            (h.name || '').toLowerCase().includes(q) ||
            (h.address || '').toLowerCase().includes(q) ||
            (h.address_addition || '').toLowerCase().includes(q) ||
            (h.city || '').toLowerCase().includes(q) ||
            (h.phone || '').toLowerCase().includes(q)
        );
    }
    return list;
}
