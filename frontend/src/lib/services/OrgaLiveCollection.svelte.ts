import { pb } from '$lib/services/pocketbase';
import type { BaseRecord } from '$lib/types/orgaTypes';

interface CollectionOptions {
    expand?: string;
    sort?: string;
    filter?: string;
}

export class OrgaLiveCollection<T extends BaseRecord> {
    // Reaktiver State für das Frontend
    data = $state<T[]>([]);
    isLoading = $state(true);
    error = $state<string | null>(null);

    private collectionName: string;
    private options: CollectionOptions;
    private isInitialized = false;

    constructor(collectionName: string, options: CollectionOptions = {}) {
        this.collectionName = collectionName;
        this.options = options;
    }

    async init() {
        if (this.isInitialized) return;
        this.isLoading = true;
        this.error = null;

        try {
            // 1. Initialer Datenabruf
            this.data = await pb.collection(this.collectionName).getFullList<T>({
                sort: this.options.sort,
                filter: this.options.filter,
                expand: this.options.expand
            });

            const subOptions: any = {};
            if (this.options.expand) subOptions.expand = this.options.expand;
            if (this.options.filter) subOptions.filter = this.options.filter;

            await pb.collection(this.collectionName).subscribe<T>('*', (e) => {
                if (e.action === 'create') {
                    this.data.push(e.record as T);
                } else if (e.action === 'update') {
                    const index = this.data.findIndex(item => item.id === e.record.id);
                    if (index !== -1) {
                        // Sofortiges Update mit intelligentem Fallback für das alte 'expand' Objekt.
                        // Verhindert Flackern/Verschwinden von Relationen, komplett ohne Server-Überlastung!
                        this.data[index] = { ...e.record, expand: e.record.expand || this.data[index].expand } as T;
                    }
                } else if (e.action === 'delete') {
                    this.data = this.data.filter(item => item.id !== e.record.id);
                }
            }, Object.keys(subOptions).length > 0 ? subOptions : undefined);

            this.isInitialized = true;
        } catch (err: any) {
            // 403-Fehler (Fehlende Berechtigung) als Warnung behandeln
            if (err.status === 403) {
                console.warn(`Zugriff verweigert (403) für Collection [${this.collectionName}]. Prüfe die API-Regeln in PocketBase.`);
            } else {
                console.error(`Fehler in OrgaLiveCollection [${this.collectionName}]:`, err);
            }
            this.error = err.message || 'Ein unbekannter Fehler ist aufgetreten.';
        } finally {
            this.isLoading = false;
        }
    }

    // Hilfsfunktion: Ein bestimmtes Item direkt finden
    getById(id: string): T | undefined {
        return this.data.find(item => item.id === id);
    }

    // Verbindung trennen (z.B. bei Logout)
    destroy() {
        pb.collection(this.collectionName).unsubscribe('*');
        this.isInitialized = false;
        this.data = [];
    }
}