import { pb } from "$lib/services/pocketbase";

export function useRequestAdmin() {
    let requests = $state<any[]>([]);
    let isLoading = $state(false);
    let subscriptionCallback: ((e: any) => void) | null = null;

    async function init() {
        isLoading = true;
        try {
            // Nutzer-Rechte und zugehörige Firma prüfen
            const user = pb.authStore.model;
            const isSuper = pb.authStore.isSuperuser || user?.role === 'superadmin';
            
            let userCompanyId = '';
            if (user?.company) {
                userCompanyId = Array.isArray(user.company) ? user.company[0] : user.company;
            }

            // Filter String bauen (Superadmins sehen alles, andere nur ihre Firma)
            let filterStr = (!isSuper && userCompanyId) ? `company ~ "${userCompanyId}"` : '';

            const res = await pb.collection('appointment_requests').getList(1, 50, {
                sort: '-created',
                filter: filterStr,
                requestKey: null
            });
            requests = res.items;

            subscriptionCallback = (e: any) => {
                if (e.action === 'create') {
                    requests = [e.record, ...requests];
                } else if (e.action === 'update') {
                    const idx = requests.findIndex(r => r.id === e.record.id);
                    if (idx !== -1) requests[idx] = e.record;
                } else if (e.action === 'delete') {
                    requests = requests.filter(r => r.id !== e.record.id);
                }
            };

            pb.collection('appointment_requests').subscribe('*', subscriptionCallback, {
                filter: filterStr, requestKey: null // Realtime-Updates auch filtern und nicht auto-cancelln!
            });
        } catch(e) {
            console.error("Fehler beim Laden der Anfragen:", e);
        } finally {
            isLoading = false;
        }
    }

    function cleanup() {
        if (subscriptionCallback) {
            pb.collection('appointment_requests').unsubscribe('*');
        }
    }

    async function updateStatus(id: string, status: 'requested' | 'accepted' | 'denied') {
        await pb.collection('appointment_requests').update(id, { status });
    }

    async function deleteReq(id: string) {
        await pb.collection('appointment_requests').delete(id);
    }

    return {
        get requests() { return requests; },
        get isLoading() { return isLoading; },
        init,
        cleanup,
        updateStatus,
        deleteReq
    };
}