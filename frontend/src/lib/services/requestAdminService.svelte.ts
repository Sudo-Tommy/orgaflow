import { pb } from "$lib/services/pocketbase";

export function useRequestAdmin() {
    let requests = $state<any[]>([]);
    let isLoading = $state(false);
    let subAppReqCallback: ((e: any) => void) | null = null;
    let subInqCallback: ((e: any) => void) | null = null;

    function normalizeInquiry(i: any) {
        const isConverted = i.status === 'converted';
        const isRejected = i.status === 'rejected';
        return {
            ...i,
            _collection: 'inquiries',
            sender_name: i.sender_name || 'Online-Anfrage',
            email: i.sender_email || i.email || '',
            phone: i.sender_phone || i.phone || '',
            street: i.sender_address || i.street || '',
            request_text: i.raw_text || i.request_text || '',
            ai_summary: i.summary || i.ai_summary || '',
            contact_method: 'Web-Anfrage',
            status: isConverted ? 'accepted' : (isRejected ? 'denied' : 'requested'),
            rawStatus: i.status
        };
    }

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

            // Beide Quellen parallel abrufen: appointment_requests und inquiries
            const [appReqRes, inqRes] = await Promise.allSettled([
                pb.collection('appointment_requests').getList(1, 50, {
                    sort: '-created',
                    filter: filterStr,
                    requestKey: null
                }),
                pb.collection('inquiries').getList(1, 50, {
                    sort: '-created',
                    requestKey: null
                })
            ]);

            const appItems = appReqRes.status === 'fulfilled' ? appReqRes.value.items.map(r => ({ ...r, _collection: 'appointment_requests' })) : [];
            const inqItems = inqRes.status === 'fulfilled' ? inqRes.value.items.map(normalizeInquiry) : [];

            // Zusammenführen und absteigend nach Erstellungsdatum sortieren
            requests = [...appItems, ...inqItems].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

            // 1. Realtime-Abo für appointment_requests
            subAppReqCallback = (e: any) => {
                const rec = { ...e.record, _collection: 'appointment_requests' };
                if (e.action === 'create') {
                    requests = [rec, ...requests];
                } else if (e.action === 'update') {
                    const idx = requests.findIndex(r => r.id === e.record.id);
                    if (idx !== -1) requests[idx] = rec;
                } else if (e.action === 'delete') {
                    requests = requests.filter(r => r.id !== e.record.id);
                }
            };
            pb.collection('appointment_requests').subscribe('*', subAppReqCallback, {
                filter: filterStr, requestKey: null
            });

            // 2. Realtime-Abo für inquiries
            subInqCallback = (e: any) => {
                const rec = normalizeInquiry(e.record);
                if (e.action === 'create') {
                    requests = [rec, ...requests];
                } else if (e.action === 'update') {
                    const idx = requests.findIndex(r => r.id === e.record.id);
                    if (idx !== -1) requests[idx] = rec;
                } else if (e.action === 'delete') {
                    requests = requests.filter(r => r.id !== e.record.id);
                }
            };
            pb.collection('inquiries').subscribe('*', subInqCallback, { requestKey: null });

        } catch(e) {
            console.error("Fehler beim Laden der Anfragen:", e);
        } finally {
            isLoading = false;
        }
    }

    function cleanup() {
        if (subAppReqCallback) {
            pb.collection('appointment_requests').unsubscribe('*');
            subAppReqCallback = null;
        }
        if (subInqCallback) {
            pb.collection('inquiries').unsubscribe('*');
            subInqCallback = null;
        }
    }

    async function updateStatus(id: string, status: 'requested' | 'accepted' | 'denied') {
        const item = requests.find(r => r.id === id);
        if (item?._collection === 'inquiries') {
            const mapped = status === 'accepted' ? 'converted' : (status === 'denied' ? 'rejected' : 'new');
            await pb.collection('inquiries').update(id, { status: mapped }, { requestKey: null });
            item.status = status;
            item.rawStatus = mapped;
        } else {
            await pb.collection('appointment_requests').update(id, { status }, { requestKey: null });
            if (item) item.status = status;
        }
    }

    async function deleteReq(id: string) {
        const item = requests.find(r => r.id === id);
        if (item?._collection === 'inquiries') {
            await pb.collection('inquiries').delete(id);
        } else {
            await pb.collection('appointment_requests').delete(id);
        }
        requests = requests.filter(r => r.id !== id);
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