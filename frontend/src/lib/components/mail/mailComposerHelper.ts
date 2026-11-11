import { pb } from '$lib/services/pocketbase';
import { googleCalendarService } from '$lib/services/googleCalendarService';

export interface MailSenderOption {
    id: 'ionos' | 'google';
    label: string;
    email: string;
    badge: string;
}

export async function loadSystemContacts(): Promise<{ name: string; email: string }[]> {
    try {
        const [clients, contacts, users] = await Promise.all([
            pb.collection('clients').getFullList({ fields: 'name_first,name_last,email', requestKey: null }).catch(() => []),
            pb.collection('contacts').getFullList({ fields: 'name_first,name_last,email', requestKey: null }).catch(() => []),
            pb.collection('users').getFullList({ fields: 'name_first,name_last,email', requestKey: null }).catch(() => [])
        ]);

        const all = [...clients, ...contacts, ...users]
            .filter(record => record.email)
            .map(record => ({
                name: `${record.name_first || ''} ${record.name_last || ''}`.trim() || 'Unbekannt',
                email: record.email
            }));

        return Array.from(new Map(all.map(item => [item.email, item])).values());
    } catch (err) {
        console.error('[mailComposerHelper] Fehler beim Laden der Kontakte:', err);
        return [];
    }
}

export async function loadAvailableSenders(currentUserId?: string): Promise<MailSenderOption[]> {
    const senders: MailSenderOption[] = [];
    const authModel = pb.authStore.model;
    const uid = currentUserId || authModel?.id;

    // 1. IONOS Firmen- / Nutzerkonto auflösen
    let ionosEmail = authModel?.email || '';
    try {
        if (uid) {
            let mailConf = await pb.collection('userMailConfigs').getFirstListItem(`user = "${uid}"`, { requestKey: null }).catch(() => null);
            if (!mailConf && authModel?.company) {
                const compId = Array.isArray(authModel.company) ? authModel.company[0] : authModel.company;
                mailConf = await pb.collection('userMailConfigs').getFirstListItem(`company = "${compId}"`, { requestKey: null }).catch(() => null);
            }
            if (mailConf?.email_address) {
                ionosEmail = mailConf.email_address;
            }
        }
    } catch {}

    senders.push({
        id: 'ionos',
        label: `IONOS (${ionosEmail || 'Standard'})`,
        email: ionosEmail,
        badge: 'IONOS'
    });

    // 2. Google Mail prüfen
    try {
        const gStatus = await googleCalendarService.getStatus();
        if (gStatus?.connected && gStatus.googleEmail) {
            senders.push({
                id: 'google',
                label: `Google Mail (${gStatus.googleEmail})`,
                email: gStatus.googleEmail,
                badge: 'Google'
            });
        }
    } catch {}

    return senders;
}
