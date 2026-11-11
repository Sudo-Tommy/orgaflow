import { pb } from '$lib/services/pocketbase';
import type { BaseRecord } from '$lib/types/orgaTypes';
import { 
    getCachedCollection, setCachedCollection, updateCachedRecord, 
    removeCachedRecord, queueOfflineMutation 
} from '$lib/services/offlineDb';

export interface CollectionOptions {
    expand?: string;
    sort?: string;
    filter?: string;
    fields?: string;
    pageSize?: number;
    usePagination?: boolean;
}

export interface PaginationState {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
}

export class OrgaLiveCollection<T extends BaseRecord> {
    data = $state<T[]>([]);
    isLoading = $state(true);
    isSyncing = $state(false);
    error = $state<string | null>(null);
    pagination = $state<PaginationState>({
        page: 1,
        perPage: 50,
        totalItems: 0,
        totalPages: 1,
        hasMore: false
    });

    private collectionName: string;
    private options: CollectionOptions;
    private isInitialized = false;

    constructor(collectionName: string, options: CollectionOptions = {}) {
        this.collectionName = collectionName;
        this.options = { pageSize: 50, ...options };
        this.pagination.perPage = this.options.pageSize || 50;
    }

    async init(forceRefresh = false) {
        if (this.isInitialized && !forceRefresh) return;

        // '_superusers' ist eine interne PB-System-Collection. Ohne Superuser-Token
        // fuehrt ein API-Aufruf zu 403 Forbidden. Fuer regulaere Accounts (inkl. Entwickler)
        // ueberspringen wir den Aufruf lautlos.
        if (this.collectionName === '_superusers' && !pb.authStore.isSuperuser) {
            this.isLoading = false;
            this.isSyncing = false;
            this.data = [];
            this.isInitialized = true;
            return;
        }

        this.isLoading = true;
        this.error = null;

        // 1. Sofortiges Laden aus dem Offline-Cache (0 ms Ladezeit)
        const cached = await getCachedCollection<T>(this.collectionName);
        if (cached.length > 0) {
            this.data = cached;
            this.pagination.totalItems = cached.length;
            this.isLoading = false;
        }

        // 2. Netzwerk-Sync im Hintergrund (Stale-While-Revalidate)
        try {
            this.isSyncing = true;
            if (this.options.usePagination) {
                await this.loadPage(1, this.options.pageSize);
            } else {
                const fresh = await pb.collection(this.collectionName).getFullList<T>({
                    sort: this.options.sort,
                    filter: this.options.filter,
                    expand: this.options.expand,
                    fields: this.options.fields,
                    requestKey: null
                });
                this.data = fresh;
                this.pagination.totalItems = fresh.length;
                this.pagination.hasMore = false;
                await setCachedCollection(this.collectionName, fresh);
            }

            // 3. Realtime-Abonnement
            await this.subscribeToChanges();
            this.isInitialized = true;
        } catch (err: any) {
            if (err.status === 403) {
                console.warn(`Zugriff verweigert (403) für [${this.collectionName}].`);
            } else if (!cached.length) {
                this.error = err.message || 'Ladefehler.';
            }
        } finally {
            this.isLoading = false;
            this.isSyncing = false;
        }
    }

    async loadPage(page = 1, perPage = this.pagination.perPage, filter = this.options.filter) {
        if (this.collectionName === '_superusers' && !pb.authStore.isSuperuser) return;
        this.isSyncing = true;
        try {
            const res = await pb.collection(this.collectionName).getList<T>(page, perPage, {
                sort: this.options.sort,
                filter: filter || this.options.filter,
                expand: this.options.expand,
                fields: this.options.fields,
                requestKey: null
            });
            this.data = page === 1 ? res.items : [...this.data, ...res.items];
            this.pagination = {
                page: res.page,
                perPage: res.perPage,
                totalItems: res.totalItems,
                totalPages: res.totalPages,
                hasMore: res.page < res.totalPages
            };
            if (page === 1) await setCachedCollection(this.collectionName, res.items);
        } finally {
            this.isSyncing = false;
        }
    }

    async loadMore() {
        if (!this.pagination.hasMore || this.isSyncing) return;
        await this.loadPage(this.pagination.page + 1);
    }

    private async subscribeToChanges() {
        const subOptions: any = {};
        if (this.options.expand) subOptions.expand = this.options.expand;
        if (this.options.filter) subOptions.filter = this.options.filter;
        if (this.options.fields) subOptions.fields = this.options.fields;

        await pb.collection(this.collectionName).subscribe<T>('*', (e) => {
            if (e.action === 'create') {
                const item = { ...e.record, expand: e.record.expand } as T;
                if (this.options.sort?.startsWith('-')) {
                    this.data.unshift(item);
                } else {
                    this.data.push(item);
                }
                this.pagination.totalItems++;
                updateCachedRecord(this.collectionName, item).catch(() => {});
            } else if (e.action === 'update') {
                const idx = this.data.findIndex(i => i.id === e.record.id);
                const updated = { ...e.record, expand: e.record.expand || (idx !== -1 ? this.data[idx].expand : undefined) } as T;
                if (idx !== -1) this.data[idx] = updated;
                else this.data.push(updated);
                updateCachedRecord(this.collectionName, updated).catch(() => {});
            } else if (e.action === 'delete') {
                this.data = this.data.filter(i => i.id !== e.record.id);
                this.pagination.totalItems = Math.max(0, this.pagination.totalItems - 1);
                removeCachedRecord(this.collectionName, e.record.id).catch(() => {});
            }
        }, Object.keys(subOptions).length ? subOptions : undefined);
    }

    getById(id: string): T | undefined {
        return this.data.find(item => item.id === id);
    }

    async getFullRecord(id: string, expand?: string): Promise<T | null> {
        try {
            return await pb.collection(this.collectionName).getOne<T>(id, {
                expand: expand || this.options.expand,
                requestKey: null
            });
        } catch {
            return null;
        }
    }

    optimisticCreate(record: T) {
        if (this.options.sort?.startsWith('-')) this.data.unshift(record);
        else this.data.push(record);
        updateCachedRecord(this.collectionName, record);
    }

    optimisticUpdate(id: string, partial: Partial<T>) {
        const idx = this.data.findIndex(i => i.id === id);
        if (idx !== -1) {
            this.data[idx] = { ...this.data[idx], ...partial };
            this.data = [...this.data];
            updateCachedRecord(this.collectionName, this.data[idx]);
        }
    }

    optimisticDelete(id: string) {
        this.data = this.data.filter(i => i.id !== id);
        removeCachedRecord(this.collectionName, id);
    }

    replaceItem(id: string, record: T) {
        const idx = this.data.findIndex(item => item.id === id);
        if (idx !== -1) {
            this.data[idx] = record;
            this.data = [...this.data];
        } else {
            this.data = [...this.data, record];
        }
        updateCachedRecord(this.collectionName, record);
    }

    async saveOfflineAware(action: 'create' | 'update' | 'delete', recordId?: string, payload?: any): Promise<boolean> {
        const isOnline = typeof navigator === 'undefined' || navigator.onLine;
        if (!isOnline) {
            await queueOfflineMutation(this.collectionName, action, recordId, payload);
            return true;
        }
        try {
            if (action === 'create') await pb.collection(this.collectionName).create(payload);
            else if (action === 'update' && recordId) await pb.collection(this.collectionName).update(recordId, payload);
            else if (action === 'delete' && recordId) await pb.collection(this.collectionName).delete(recordId);
            return true;
        } catch {
            await queueOfflineMutation(this.collectionName, action, recordId, payload);
            return true;
        }
    }

    async refresh() {
        return this.init(true);
    }

    destroy() {
        pb.collection(this.collectionName).unsubscribe('*');
        this.isInitialized = false;
        this.data = [];
    }
}