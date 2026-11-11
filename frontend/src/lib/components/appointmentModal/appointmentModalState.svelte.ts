import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { sortPersons } from "$lib/utils/sortHelper";

export type AppointmentModalTab = 'time' | 'location' | 'tasks' | 'client';

function getLocalDateString(date: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getLocalTimeString(date: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export class AppointmentModalState {
    isLoading = $state(false);
    errorMsg = $state("");
    isDeleted = $state(false);
    isSaved = $state(false);

    editId = $state<string | null>(null);
    appDate = $state("");
    appStartTime = $state("");
    appEndTime = $state("");
    description = $state("");
    location_address = $state("");
    internalNotes = $state("");
    selectedTasks = $state<string[]>([]);
    is_private = $state(false);
    is_blocked = $state(false);
    settled = $state(false);
    status = $state<'geplant' | 'beendet' | 'abgesagt'>('geplant');
    billing_type = $state<'EL' | 'VHP' | 'Kombi' | '45a' | 'Privat' | ''>('');
    billing_user = $state<string | null>(null);
    is_series = $state(false);
    seriesInterval = $state<'weekly' | 'biweekly' | 'monthly'>('weekly');
    seriesEndDate = $state("");
    series_id = $state("");
    useClientAddress = $state(false);
    is_visible = $state(false);
    selectedClientId = $state("");
    selectedContactId = $state("");
    selectedUserId = $state("");

    clientSearchQuery = $state("");
    isClientSearchOpen = $state(false);
    contactSearchQuery = $state("");
    isContactSearchOpen = $state(false);
    activeTab = $state<AppointmentModalTab>('time');

    users = $state<any[]>([]);
    initialDataHash = $state("");

    selectedClientRecord = $derived(orgaStore.clients?.data?.find((c: any) => c.id === this.selectedClientId));
    selectedContactRecord = $derived(orgaStore.contacts?.data?.find((c: any) => c.id === this.selectedContactId));
    selectedTaskRecords = $derived(orgaStore.tasks?.data?.filter((t: any) => this.selectedTasks.includes(t.id)) || []);
    isSuperAdmin = $derived(pb.authStore.isSuperuser || ['developer', 'superadmin', 'admin'].includes(pb.authStore.model?.role));

    durationBadge = $derived.by(() => {
        if (!this.appStartTime || !this.appEndTime || this.is_blocked) return null;
        const [sh, sm] = this.appStartTime.split(':').map(Number);
        const [eh, em] = this.appEndTime.split(':').map(Number);
        if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
        let startMin = sh * 60 + sm;
        let endMin = eh * 60 + em;
        if (endMin < startMin) endMin += 24 * 60;
        const diff = endMin - startMin;
        if (diff <= 0) return null;
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        return hours > 0 && mins > 0 ? `${hours} Std. ${mins} Min.` : hours > 0 ? `${hours} Std.` : `${mins} Min.`;
    });

    calculatedSeriesCount = $derived.by(() => {
        if (!this.is_series || !this.appDate || !this.seriesEndDate) return 0;
        const start = new Date(this.appDate), end = new Date(this.seriesEndDate);
        if (end < start) return 0;
        let count = 0, curr = new Date(start);
        while (curr <= end) {
            count++;
            if (this.seriesInterval === 'weekly') curr.setDate(curr.getDate() + 7);
            else if (this.seriesInterval === 'biweekly') curr.setDate(curr.getDate() + 14);
            else if (this.seriesInterval === 'monthly') curr.setMonth(curr.getMonth() + 1);
        }
        return count;
    });

    filteredClients = $derived.by(() => {
        let list = orgaStore.clients?.data || [];
        if (!this.clientSearchQuery.trim()) return list.slice(0, 50);
        const q = this.clientSearchQuery.toLowerCase().trim();
        return list.filter((c: any) => 
            (c.name_first || '').toLowerCase().includes(q) ||
            (c.name_last || '').toLowerCase().includes(q) ||
            (c.city || '').toLowerCase().includes(q) ||
            (c.care_level || '').toLowerCase().includes(q)
        ).slice(0, 30);
    });

    filteredContacts = $derived.by(() => {
        let list = orgaStore.contacts?.data || [];
        if (!this.contactSearchQuery.trim()) return list.slice(0, 50);
        const q = this.contactSearchQuery.toLowerCase().trim();
        return list.filter((c: any) =>
            (c.name_first || '').toLowerCase().includes(q) ||
            (c.name_last || '').toLowerCase().includes(q) ||
            (c.company_name || '').toLowerCase().includes(q) ||
            (c.role || '').toLowerCase().includes(q) ||
            (c.city || '').toLowerCase().includes(q)
        ).slice(0, 30);
    });

    applyDuration(minutes: number) {
        if (!this.appStartTime) {
            const now = new Date();
            now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
            this.appStartTime = getLocalTimeString(now);
        }
        const [h, m] = this.appStartTime.split(':').map(Number);
        const totalMin = h * 60 + m + minutes;
        const endH = Math.floor(totalMin / 60) % 24;
        const endM = totalMin % 60;
        this.appEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    }

    selectClient(c: any) {
        this.selectedClientId = c.id;
        this.isClientSearchOpen = false;
        this.clientSearchQuery = "";
        if (!this.billing_type && c.billing_type) this.billing_type = c.billing_type;
        if (this.useClientAddress) this.updateLocationFromClient(c);
    }

    updateLocationFromClient(c: any) {
        const line1 = ((c.street || '') + ' ' + (c.housenr || '')).trim();
        const line2 = ((c.zip || '') + ' ' + (c.city || '')).trim();
        const full = [line1, line2].filter(Boolean).join(', ');
        if (full) this.location_address = full;
    }

    selectContact(contact: any) {
        this.selectedContactId = contact.id;
        this.useClientAddress = false;
        this.isContactSearchOpen = false;
        this.contactSearchQuery = "";
        const namePart = [contact.company_name, `${contact.name_first || ''} ${contact.name_last || ''}`.trim()].filter(Boolean).join(' - ');
        const addressPart = `${contact.street || ''} ${contact.housenr || ''}`.trim();
        const cityPart = `${contact.zip || ''} ${contact.city || ''}`.trim();
        this.location_address = [namePart, addressPart, cityPart].filter(Boolean).join(', ');
    }

    toggleTask(id: string) {
        if (this.selectedTasks.includes(id)) {
            this.selectedTasks = this.selectedTasks.filter(t => t !== id);
        } else {
            this.selectedTasks = [...this.selectedTasks, id];
        }
    }

    isDirty(): boolean {
        return this.getHash() !== this.initialDataHash;
    }

    getHash(): string {
        return JSON.stringify({
            appDate: this.appDate, appStartTime: this.appStartTime, appEndTime: this.appEndTime,
            description: this.description, location_address: this.location_address,
            is_private: this.is_private, settled: this.settled, status: this.status, billing_type: this.billing_type,
            is_series: this.is_series, is_visible: this.is_visible, seriesEndDate: this.seriesEndDate,
            seriesInterval: this.seriesInterval, is_blocked: this.is_blocked, selectedClientId: this.selectedClientId,
            selectedUserId: this.selectedUserId, internalNotes: this.internalNotes, selectedTasks: this.selectedTasks,
            selectedContactId: this.selectedContactId, useClientAddress: this.useClientAddress
        });
    }

    open(data?: any) {
        if (this.isSuperAdmin && this.users.length === 0) {
            pb.collection('users').getFullList({ sort: 'name_first', requestKey: null })
                .then(res => this.users = sortPersons(res)).catch(() => {});
        }
        this.isClientSearchOpen = false;
        this.isContactSearchOpen = false;
        this.clientSearchQuery = "";
        this.contactSearchQuery = "";
        this.seriesInterval = 'weekly';
        this.activeTab = 'time';

        if (data && !(data instanceof Date) && data.id) {
            this.editId = data.id;
            const d = data.appointment ? new Date(data.appointment) : new Date();
            this.appDate = getLocalDateString(d);
            this.appStartTime = data.appointment ? getLocalTimeString(d) : "";
            this.appEndTime = data.appointment_end ? getLocalTimeString(new Date(data.appointment_end)) : (data.expand?.time_record?.[0]?.end ? getLocalTimeString(new Date(data.expand.time_record[0].end)) : "");
            this.description = data.description || "";
            this.location_address = data.location_address || "";
            this.is_blocked = this.description.includes('[BLOCK]');
            if (this.is_blocked) this.description = this.description.replace('[BLOCK]', '').trim();
            this.is_private = data.is_private || false;
            this.settled = data.settled || false;
            this.status = (data.status as any) || 'geplant';
            this.billing_type = data.billing_type || '';
            this.billing_user = data.billing_user || null;
            this.is_series = data.is_series || false;
            this.is_visible = data.is_visible || false;
            this.series_id = data.series_id || "";
            this.useClientAddress = data.use_client_address || false;
            this.selectedClientId = Array.isArray(data.client) && data.client[0] ? data.client[0] : (typeof data.client === "string" ? data.client : "");
            this.selectedContactId = Array.isArray(data.appointment_at) && data.appointment_at[0] ? (typeof data.appointment_at[0] === 'object' ? data.appointment_at[0].id : data.appointment_at[0]) : (data.expand?.appointment_at?.[0]?.id || "");
            this.selectedUserId = data.user || (pb.authStore.model?.collectionName === '_superusers' ? "" : pb.authStore.model?.id) || "";
            this.internalNotes = data.notes || data.internal_notes || "";
            this.selectedTasks = Array.isArray(data.tasks) ? [...data.tasks] : (data.tasks ? [data.tasks] : []);
        } else {
            this.editId = null;
            const d = (data && data.date) ? new Date(data.date) : (data instanceof Date ? new Date(data) : new Date());
            if (data instanceof Date || !data || data.preselectedClient) d.setHours(new Date().getHours() + 1, 0, 0, 0);
            this.appDate = getLocalDateString(d);
            this.appStartTime = getLocalTimeString(d);
            this.appEndTime = "";
            this.description = "";
            this.location_address = "";
            this.is_private = false;
            this.settled = false;
            this.status = 'geplant';
            this.billing_type = '';
            this.billing_user = null;
            this.is_series = false;
            this.is_visible = true;
            this.seriesEndDate = "";
            this.series_id = "";
            this.is_blocked = data?.is_blocked || false;
            this.selectedClientId = data?.preselectedClient || "";
            this.useClientAddress = !!data?.preselectedClient;
            if (this.selectedClientId) {
                const preClient = orgaStore.clients?.data?.find((c: any) => c.id === this.selectedClientId);
                if (preClient?.billing_type) this.billing_type = preClient.billing_type as any;
            }
            this.selectedUserId = pb.authStore.model?.collectionName === '_superusers' ? "" : (pb.authStore.model?.id || "");
            this.internalNotes = "";
            this.selectedTasks = [];
        }
        this.errorMsg = "";
        this.initialDataHash = this.getHash();
    }
}
