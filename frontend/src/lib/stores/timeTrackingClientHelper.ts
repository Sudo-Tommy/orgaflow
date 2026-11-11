import { orgaStore } from "$lib/stores/orgaStore.svelte";

export function extractClientFromAppointment(app: any): { id: string; name: string } {
    if (!app) return { id: '', name: '' };

    // 1. Expandierte Client-Relation prüfen (Array oder Objekt)
    let expClient = app.expand?.client;
    if (Array.isArray(expClient) && expClient.length > 0) {
        expClient = expClient[0];
    }
    if (expClient && typeof expClient === 'object') {
        const name = `${expClient.name_first || ''} ${expClient.name_last || ''}`.trim() || expClient.company_name || '';
        if (name) return { id: expClient.id || '', name };
    }

    // 2. app.client Relation-ID ermitteln
    let cId = '';
    const raw: any = app.client;
    if (Array.isArray(raw) && raw.length > 0) {
        cId = typeof raw[0] === 'string' ? raw[0] : raw[0]?.id;
    } else if (typeof raw === 'string' && raw.trim() !== '' && raw !== '[]') {
        if (raw.startsWith('[')) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    cId = typeof parsed[0] === 'string' ? parsed[0] : parsed[0]?.id;
                }
            } catch {}
        } else {
            cId = raw;
        }
    } else if (raw && typeof raw === 'object' && raw.id) {
        cId = raw.id;
    }

    // Falls cId gefunden, im orgaStore.clients suchen
    if (cId && orgaStore.clients) {
        const found = orgaStore.clients.getById(cId) || orgaStore.clients.data?.find((c: any) => c.id === cId);
        if (found) {
            const name = `${found.name_first || ''} ${found.name_last || ''}`.trim() || found.company_name || '';
            if (name) return { id: cId, name };
        }
    }

    // 3. Fallback: app.expand?.appointment_at
    let expAt = app.expand?.appointment_at;
    if (Array.isArray(expAt) && expAt.length > 0) expAt = expAt[0];
    if (expAt && typeof expAt === 'object') {
        const atName = expAt.company_name || `${expAt.name_first || ''} ${expAt.name_last || ''}`.trim();
        if (atName) return { id: expAt.id || cId || '', name: atName };
    }

    // 4. Fallback: app.title
    return { id: cId || '', name: app.title || '' };
}
