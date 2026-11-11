import type { ContactRecord } from '$lib/types/orgaTypes';

export const isAuthority = (c: ContactRecord): boolean =>
    /behörd|amt|bürger|rathaus|jobcenter|kasse|versicherung|gericht|polizei|notar|kanzlei|rechtsanw|sozial/i.test(
        `${c.company_name || ''} ${c.notes || ''}`
    );

export const isDoctor = (c: ContactRecord): boolean =>
    /arzt|praxis|klinik|doktor|dr\.|therapie|physio|mvz|med\.|nephrolog|kardiolog|radiolog|diabetolog|urolog|zahn|pflege/i.test(
        `${c.company_name || ''} ${c.name_first || ''} ${c.name_last || ''} ${c.notes || ''}`
    ) || !isAuthority(c);

export function filterAndSortDoctorAuthorityList(
    baseList: ContactRecord[],
    searchFilter: string,
    activeCategory: 'all' | 'doctor' | 'authority',
    clientContacts: ContactRecord[]
): ContactRecord[] {
    const query = searchFilter.trim().toLowerCase();
    const clientIds = new Set(clientContacts.map(c => c.id));

    return baseList
        .filter(c => {
            if (activeCategory === 'doctor' && !isDoctor(c)) return false;
            if (activeCategory === 'authority' && !isAuthority(c)) return false;
            if (!query) return true;
            const pool = `${c.company_name || ''} ${c.name_first || ''} ${c.name_last || ''} ${c.city || ''} ${c.street || ''}`.toLowerCase();
            return pool.includes(query);
        })
        .sort((a, b) => {
            const aIsClient = clientIds.has(a.id) ? 1 : 0;
            const bIsClient = clientIds.has(b.id) ? 1 : 0;
            if (aIsClient !== bIsClient) return bIsClient - aIsClient;
            const nameA = a.company_name || `${a.name_last || ''} ${a.name_first || ''}`.trim();
            const nameB = b.company_name || `${b.name_last || ''} ${b.name_first || ''}`.trim();
            return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
        });
}
