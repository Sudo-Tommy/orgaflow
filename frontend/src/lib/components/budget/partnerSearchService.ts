import { pb } from '$lib/services/pocketbase';
import { sortAlphabetical } from '$lib/utils/sortHelper';
import type { PartnerSuggestion } from './partnerSearchTypes';

export async function searchPartnerSuggestions(query: string): Promise<PartnerSuggestion[]> {
    const q = query.trim();
    if (q.length < 1) return [];

    const results: PartnerSuggestion[] = [];
    const seen = new Set<string>();

    const add = (item: PartnerSuggestion) => {
        const key = item.name.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            results.push(item);
        }
    };

    try {
        // 1. Dedizierte Partner-Datenbank
        try {
            const partners = await pb.collection('budget_partners').getList(1, 10, {
                filter: `name ~ "${q.replace(/"/g, '')}"`,
                sort: 'name'
            });
            for (const p of partners.items) {
                add({ id: p.id, name: p.name, type: 'partner', subtitle: p.company || p.type || '' });
            }
        } catch {}

        // 1b. Bisherige Empfänger / Zahler aus personal_transactions
        try {
            const prevTxs = await pb.collection('personal_transactions').getList(1, 10, {
                filter: `recipient_or_payer ~ "${q.replace(/"/g, '')}"`,
                fields: 'id,recipient_or_payer',
                sort: '-date'
            });
            for (const tx of prevTxs.items) {
                if (tx.recipient_or_payer) {
                    add({ id: tx.id, name: tx.recipient_or_payer, type: 'partner', subtitle: 'Bisheriger Empfänger' });
                }
            }
        } catch {}

        // 2. Klienten (besonders relevant für Einnahmen)
        try {
            const clients = await pb.collection('clients').getList(1, 8, {
                filter: `name_first ~ "${q.replace(/"/g, '')}" || name_last ~ "${q.replace(/"/g, '')}"`,
                sort: 'name_last'
            });
            for (const c of clients.items) {
                const name = `${c.name_first || ''} ${c.name_last || ''}`.trim();
                if (name) add({ id: c.id, name, type: 'client', subtitle: 'Klient' });
            }
        } catch {}

        // 3. Vertragspartner aus personal_contracts
        try {
            const contracts = await pb.collection('personal_contracts').getList(1, 8, {
                filter: `partner ~ "${q.replace(/"/g, '')}"`,
                fields: 'id,partner,title',
                sort: 'partner'
            });
            for (const c of contracts.items) {
                const name = c.partner || c.title;
                if (name) add({ id: c.id, name, type: 'contract', subtitle: 'Vertragspartner' });
            }
        } catch {}

        // 4. Kontakte (Unternehmen / Ärzte etc.)
        try {
            const contacts = await pb.collection('contacts').getList(1, 6, {
                filter: `name_first ~ "${q.replace(/"/g, '')}" || name_last ~ "${q.replace(/"/g, '')}" || company_name ~ "${q.replace(/"/g, '')}"`,
                sort: 'name_last'
            });
            for (const c of contacts.items) {
                const name = c.company_name || `${c.name_first || ''} ${c.name_last || ''}`.trim();
                if (name) add({ id: c.id, name, type: 'contact', subtitle: c.company_name ? 'Unternehmen' : 'Kontakt' });
            }
        } catch {}

    } catch (err) {
        console.error('[partnerSearchService] Suchfehler:', err);
    }

    const sorted = sortAlphabetical(results, r => r.name);
    return sorted.slice(0, 10);
}

export async function saveNewBudgetPartner(name: string, type: 'person' | 'company'): Promise<any> {
    const payload: any = {
        name: name.trim(),
        type
    };
    if (pb.authStore.model?.id) {
        payload.user = pb.authStore.model.id;
    }
    return await pb.collection('budget_partners').create(payload);
}
