import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";

export function useAdminService() {
    // Startet standardmäßig bei den Benutzern
    let activeCollection = $state("users");
    let searchQuery = $state("");

    // Holt sich dynamisch alle Tabellennamen, die im orgaStore definiert sind
    const collections = Object.keys(orgaStore);

    let activeData = $derived.by(() => {
        const store = (orgaStore as any)[activeCollection];
        if (!store || !store.data) return [];
        let list = [...store.data];
        
        // Leistungen (Tasks) immer alphabetisch sortieren, falls diese Collection aktiv ist
        if (activeCollection === 'tasks') {
            list.sort((a: any, b: any) => (a.title || "").localeCompare(b.title || ""));
        }
        
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            // Brute-Force Suche durch den gesamten JSON-String des Objekts
            list = list.filter((item: any) => JSON.stringify(item).toLowerCase().includes(q));
        }
        return list;
    });

    async function saveRecord(storeKey: string, id: string | null, payload: any) {
        // Mappe den Store-Key ggf. auf den echten PocketBase-Namen (z.B. superusers -> _superusers)
        const colName = storeKey === 'superusers' ? '_superusers' : storeKey;
        const data = { ...payload };
        
        // System-Felder strippen, damit PocketBase sie nicht fälschlicherweise als Änderung wertet
        delete data.id;
        delete data.created;
        delete data.updated;
        delete data.collectionId;
        delete data.collectionName;
        delete data.expand;

        if (id) await pb.collection(colName).update(id, data);
        else await pb.collection(colName).create(data);
    }

    async function deleteRecord(storeKey: string, id: string) {
        const colName = storeKey === 'superusers' ? '_superusers' : storeKey;
        await pb.collection(colName).delete(id);
    }

    return {
        get activeCollection() { return activeCollection; }, set activeCollection(v) { activeCollection = v; },
        get searchQuery() { return searchQuery; }, set searchQuery(v) { searchQuery = v; },
        get collections() { return collections; }, get activeData() { return activeData; },
        saveRecord, deleteRecord
    };
}