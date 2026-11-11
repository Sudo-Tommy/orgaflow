import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { employeeService } from "$lib/services/employeeService.svelte";
import { calculateBudgets, calculateClientAge } from "$lib/services/clientDetailHelper";
import { updateClientField } from "$lib/services/clientDetailActions";
import { getClientCompletionStatus } from "$lib/services/clientCompletionService";

export class ClientDetailState {
    clientId = $state<string | null>(null);
    currentYear = new Date().getFullYear();

    appointmentFilter = $state<'all' | 'upcoming' | 'open' | 'settled' | 'cancelled'>('all');
    appointmentSearch = $state("");
    invoiceFilter = $state<'all' | 'Abgeschlossen' | 'Eingereicht'>('all');

    notes = $state("");
    isNotesSaving = $state(false);
    mailingList = $state<string[]>([]);
    isMailingListSaving = $state(false);

    client = $derived(this.clientId ? orgaStore.clients?.getById(this.clientId) : null);
    clientCompletion = $derived(this.client ? getClientCompletionStatus(this.client) : null);
    clientAge = $derived(calculateClientAge(this.client?.birthdate));
    bData = $derived(calculateBudgets(this.client, orgaStore.invoices?.data || [], orgaStore.appointments?.data || [], this.currentYear));

    appointments = $derived.by(() => {
        const id = this.clientId;
        if (!id) return [];
        return (orgaStore.appointments?.data || [])
            .filter((a: any) => Array.isArray(a.client) ? a.client.includes(id) : a.client === id)
            .sort((a: any, b: any) => new Date(b.appointment || 0).getTime() - new Date(a.appointment || 0).getTime());
    });
    upcomingAppointments = $derived(this.appointments.filter((a: any) => a.appointment && new Date(a.appointment).getTime() >= Date.now()).reverse());
    nextAppointment = $derived(this.upcomingAppointments[0] || null);

    filteredAppointments = $derived.by(() => {
        let list = this.appointments;
        const now = Date.now();
        if (this.appointmentFilter === 'upcoming') list = list.filter((a: any) => a.appointment && new Date(a.appointment).getTime() >= now);
        else if (this.appointmentFilter === 'open') list = list.filter((a: any) => !a.settled && a.status !== 'abgesagt');
        else if (this.appointmentFilter === 'settled') list = list.filter((a: any) => a.settled);
        else if (this.appointmentFilter === 'cancelled') list = list.filter((a: any) => a.status === 'abgesagt');
        if (this.appointmentSearch.trim()) {
            const q = this.appointmentSearch.toLowerCase().trim();
            list = list.filter((a: any) => (a.description || '').toLowerCase().includes(q) || (a.notes || '').toLowerCase().includes(q));
        }
        return list;
    });

    contacts = $derived.by(() => {
        const c = this.client;
        if (!c) return [];
        const ids = Array.isArray(c.contacts) ? c.contacts : (c.contacts ? [c.contacts] : []);
        return (orgaStore.contacts?.data || []).filter((item: any) => ids.includes(item.id));
    });
    retirementHomes = $derived.by(() => {
        const c = this.client;
        if (!c) return [];
        const ids = Array.isArray(c.retirement_homes) ? c.retirement_homes : (c.retirement_homes ? [c.retirement_homes] : []);
        return (orgaStore.retirement_homes?.data || []).filter((h: any) => ids.includes(h.id));
    });
    systemDocuments = $derived((orgaStore.document_templates?.data || []).filter((d: any) => d.client === this.clientId));
    uploadedDocuments = $derived(Array.isArray(this.client?.documents) ? this.client.documents : []);
    totalDocumentsCount = $derived(this.uploadedDocuments.length + this.systemDocuments.length);

    clientInvoices = $derived.by(() => {
        const c = this.client;
        if (!c || !orgaStore.invoices?.data) return [];
        const cid = c.id;
        return orgaStore.invoices.data.filter((inv: any) =>
            (Array.isArray(inv.client) ? inv.client.includes(cid) : inv.client === cid) && inv.issue_date !== undefined
        ).sort((a: any, b: any) => new Date(b.issue_date || 0).getTime() - new Date(a.issue_date || 0).getTime());
    });
    filteredInvoices = $derived(this.invoiceFilter === 'all' ? this.clientInvoices : this.clientInvoices.filter((i: any) => (i.status || 'Entwurf') === this.invoiceFilter));
    openInvoices = $derived(this.clientInvoices.filter((i: any) => i.status !== 'Abgeschlossen' && i.status !== 'Storniert'));
    openInvoicesTotal = $derived(this.openInvoices.reduce((sum: number, i: any) => sum + (i.brutto || 0), 0));

    availableEmployees = $derived((orgaStore.users?.data || []).filter((u: any) => u.role !== 'client'));
    assignedEmployee = $derived(this.clientId ? employeeService.getAssignedEmployeeForClient(this.clientId) : null);

    primaryContactInfo = $derived.by(() => {
        if (!this.contacts.length) return null;
        const primaryRel = Object.entries(this.client?.contact_relations || {}).find(([_, r]: [string, any]) => r.is_primary);
        if (primaryRel) {
            const found = this.contacts.find((c: any) => c.id === primaryRel[0]);
            if (found) return { contact: found, relation: primaryRel[1] };
        }
        return { contact: this.contacts[0], relation: this.client?.contact_relations?.[this.contacts[0].id] || null };
    });

    init(id: string) {
        this.clientId = id;
        if (this.client) {
            this.notes = this.client.notes || "";
            this.mailingList = Array.isArray(this.client.mailing_list) ? [...this.client.mailing_list] : [];
        }
    }

    async saveNotes() {
        if (!this.client) return;
        this.isNotesSaving = true;
        await updateClientField(this.client.id, 'notes', this.notes);
        this.isNotesSaving = false;
    }

    async addEmail(email: string) {
        if (!this.client || !email.trim() || this.mailingList.includes(email.trim())) return;
        this.isMailingListSaving = true;
        const updated = [...this.mailingList, email.trim()];
        if (await updateClientField(this.client.id, 'mailing_list', updated)) this.mailingList = updated;
        this.isMailingListSaving = false;
    }

    async removeEmail(email: string) {
        if (!this.client) return;
        this.isMailingListSaving = true;
        const updated = this.mailingList.filter(e => e !== email);
        if (await updateClientField(this.client.id, 'mailing_list', updated)) this.mailingList = updated;
        this.isMailingListSaving = false;
    }
}
