import { pb } from '$lib/services/pocketbase';
import { rbacService } from '$lib/services/rbacService.svelte';

export function useChat() {
    // Svelte 5 Runes für reaktiven Zustand
    let messages = $state<any[]>([]);
    let users = $state<any[]>([]);
    let isSubscribed = false;

    async function init() {
        try {
            // Alle Kollegen für das Flüstern-Dropdown laden
            const userRecords = await pb.collection('users').getFullList({ sort: 'name_first', requestKey: null });
            users = userRecords;
        } catch (err) {
            console.error("Fehler beim Laden der Chat-Nutzer:", err);
        }

        try {
            // Die letzten 50 Nachrichten laden
            const history = await pb.collection('live_chat').getList(1, 50, {
                sort: '-created',
                expand: 'user,whispered_user',
                requestKey: null
            });
            
            // Relationen können Arrays sein. Wir entpacken sie für das Frontend, 
            // damit ChatWidget.svelte direkt auf m.expand.user.name_first zugreifen kann!
            const items = history.items.map(m => {
                if (m.expand?.user && Array.isArray(m.expand.user)) m.expand.user = m.expand.user[0];
                if (m.expand?.whispered_user && Array.isArray(m.expand.whispered_user)) m.expand.whispered_user = m.expand.whispered_user[0];
                return m;
            });
            
            // Klonen und umdrehen, um Svelte 5 Reaktivität sicherzustellen
            messages = Array.isArray(items) ? [...items].reverse() : [];
        } catch (err) {
            console.error("Fehler beim Laden der Chat-Historie:", err);
        }

        // Echtzeit-Abo (Realtime) starten, falls noch nicht aktiv
        if (!isSubscribed) {
            try {
                pb.collection('live_chat').subscribe('*', async (e) => {
                    if (e.action === 'create') {
                        try {
                            // Hole den vollen Datensatz inkl. expandierter Nutzerdaten
                            const record = await pb.collection('live_chat').getOne(e.record.id, { expand: 'user,whispered_user', requestKey: null });
                            if (record.expand?.user && Array.isArray(record.expand.user)) record.expand.user = record.expand.user[0];
                            if (record.expand?.whispered_user && Array.isArray(record.expand.whispered_user)) record.expand.whispered_user = record.expand.whispered_user[0];
                            messages.push(record);
                        } catch (err) {
                            messages.push(e.record); // Fallback falls getOne fehlschlägt
                        }
                    } else if (e.action === 'delete') {
                        messages = messages.filter(m => m.id !== e.record.id);
                    }
                }, { requestKey: null }); // Added requestKey: null
                isSubscribed = true;
            } catch (err) {
                console.error("Fehler beim Chat-Subscribe:", err);
            }
        }
    }

    function cleanup() {
        if (isSubscribed) {
            pb.collection('live_chat').unsubscribe('*');
            isSubscribed = false;
        }
    }

    async function sendMessage(text: string, file: File | null, whisperToId: string, isBug: boolean) {
        const formData = new FormData();
        
        const currentUser = pb.authStore.record || pb.authStore.model;

        // Wenn es ein Bug Report ist, formatieren wir den Text auffällig
        let finalMsg = text;
        if (isBug) finalMsg = `🚨 [BUG REPORT]\n\n${text}`;
        
        formData.append('text', finalMsg);
        if (currentUser?.id) formData.append('user', currentUser.id);

        // Bug-Reports werden systemseitig immer als "Geflüstert" markiert
        if (isBug) {
            formData.append('whispered', 'true');
        } else if (whisperToId) {
            formData.append('whispered', 'true');
            formData.append('whispered_user', whisperToId);
        }

        if (file) formData.append('file', file);

        await pb.collection('live_chat').create(formData);
    }

    async function deleteMessage(messageId: string) {
        await pb.collection('live_chat').delete(messageId);
    }

    // Abgeleiteter Zustand: Versteckt Flüstern-Nachrichten, die nicht für einen selbst bestimmt sind
    let visibleMessages = $derived.by(() => {
        const currentUser = pb.authStore.record || pb.authStore.model;
        const currentId = currentUser?.id;
        const isAdmin = pb.authStore.isSuperuser || currentUser?.role === 'superadmin' || currentUser?.role === 'developer' || currentUser?.role === 'admin' || rbacService.isAdmin;
        const isSuper = pb.authStore.isSuperuser || currentUser?.role === 'superadmin' || currentUser?.role === 'developer' || rbacService.isOwner;

        return messages.filter(m => {
        const senderId = Array.isArray(m.user) ? m.user[0] : m.user;
        const whisperId = Array.isArray(m.whispered_user) ? m.whispered_user[0] : m.whispered_user;

        // Bug-Reports nur für Sender und Admins sichtbar
        if (m.text?.includes('🚨 [BUG REPORT]')) {
            return isAdmin || senderId === currentId;
        }

        if (!m.whispered) return true; // Öffentliche Nachrichten immer zeigen
        if (isSuper) return true; // Superadmins sehen alles
        if (senderId === currentId || whisperId === currentId) return true; // Sender & Empfänger dürfen es sehen
        return false;
        });
    });

    return {
        get messages() { return visibleMessages; },
        get users() { return users; },
        get currentUserId() { return (pb.authStore.record || pb.authStore.model)?.id; },
        get isAdmin() { const u = pb.authStore.record || pb.authStore.model; return pb.authStore.isSuperuser || u?.role === 'superadmin' || u?.role === 'developer' || u?.role === 'admin' || rbacService.isAdmin; },
        init,
        cleanup,
        sendMessage,
        deleteMessage
    };
}