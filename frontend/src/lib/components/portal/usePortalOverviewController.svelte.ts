import { goto } from "$app/navigation";
import { pb } from "$lib/services/pocketbase";
import { rbacService } from "$lib/services/rbacService.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { getPortalAuthToken, performPortalLogout, fetchPortalData, formatClientSalutation, formatClientFullName } from "./portalDataService";

export function usePortalOverviewController() {
    let appointments = $state<any[]>([]);
    let invoices = $state<any[]>([]);
    let documents = $state<any[]>([]);
    let myClients = $state<any[]>([]);
    let companyInfo = $state<any>(null);
    let isLoading = $state(true);
    let errorMsg = $state("");
    let selectedAppointment = $state<any>(null);
    let activeTab = $state<'overview' | 'calendar' | 'invoices' | 'documents' | 'clients'>('overview');
    let selectedContactClientId = $state("");
    let clientSearchQuery = $state("");
    let historySearchQuery = $state("");
    let userName = $state("Gast");
    let userSalutation = $state("");
    let userFirstName = $state("");
    let userLastName = $state("");
    let userEmail = $state("");
    let userType = $state("client");

    const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) 
        ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';

    async function loadData() {
        isLoading = true;
        errorMsg = "";
        try {
            const token = getPortalAuthToken();
            if (!token) return goto('/portal');
            const data = await fetchPortalData(apiBaseUrl, token);
            if (!data) return;
            appointments = data.appointments;
            invoices = data.invoices;
            companyInfo = data.companyInfo;
            documents = data.documents;
            myClients = data.clients;
            if (myClients.length > 0) {
                if (!selectedContactClientId) selectedContactClientId = myClients[0].id;
                if (userType === 'client') {
                    const c = myClients[0];
                    if (c.salutation) userSalutation = c.salutation;
                    if (c.name_first) userFirstName = c.name_first;
                    if (c.name_last) userLastName = c.name_last;
                }
            }
        } catch (err: any) {
            errorMsg = err.message;
        } finally {
            isLoading = false;
        }
    }

    async function deletePortalContact(targetClientId: string, contactId: string) {
        if (!confirm("Möchten Sie diesen Kontakt wirklich entfernen?")) return;
        try {
            const token = getPortalAuthToken();
            const res = await fetch(`${apiBaseUrl}/clients/${targetClientId}/contacts/${contactId}`, {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Fehler beim Entfernen des Kontakts.");
            toastStore.success("Kontakt erfolgreich entfernt.");
            await loadData();
        } catch (err: any) {
            toastStore.error(err.message || "Fehler beim Löschen.");
        }
    }

    function parseUserFromAuth() {
        const token = getPortalAuthToken();
        if (!token) return goto('/portal');
        if (pb.authStore.isValid && pb.authStore.model) {
            userFirstName = pb.authStore.model.name_first || "";
            userLastName = pb.authStore.model.name_last || "";
            userSalutation = pb.authStore.model.salutation || "";
            userEmail = pb.authStore.model.email || "";
            userName = userFirstName || pb.authStore.model.username || "Gast";
            userType = (pb.authStore.isSuperuser || pb.authStore.model.role === 'admin' || pb.authStore.model.role === 'superadmin' || pb.authStore.model.role === 'developer' || rbacService.isAdmin) ? 'admin' : (pb.authStore.model.role || 'client');
        } else if (token) {
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const p = JSON.parse(atob(parts[1]));
                    userFirstName = p.name_first || ""; userLastName = p.name_last || "";
                    userSalutation = p.salutation || ""; userEmail = p.email || "";
                    userName = userFirstName || p.name || "Gast"; userType = p.type || 'client';
                }
            } catch {}
        }
        loadData();
    }

    let now = new Date();
    let upcomingAppointments = $derived(appointments.filter(a => new Date(a.appointment) >= now).sort((a, b) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime()));
    let pastAppointments = $derived(appointments.filter(a => new Date(a.appointment) < now).sort((a, b) => new Date(b.appointment).getTime() - new Date(a.appointment).getTime()));
    let nextAppointment = $derived(upcomingAppointments.length > 0 ? upcomingAppointments[0] : null);
    let nextClientName = $derived.by(() => {
        if (!nextAppointment) return '';
        const cl = nextAppointment.expand?.client || nextAppointment.expand?.client_id;
        const c = Array.isArray(cl) ? cl[0] : cl;
        return c ? formatClientFullName(c) : '';
    });

    let overdueInvoices = $derived(invoices.filter(inv => !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(inv.status) && inv.due_date && new Date(inv.due_date).getTime() < new Date().setHours(0,0,0,0)));
    let activeClientRecord = $derived(myClients.find(c => c.id === selectedContactClientId) || myClients[0] || null);
    let filteredMyClients = $derived(clientSearchQuery.trim() ? myClients.filter(c => (c.name || '').toLowerCase().includes(clientSearchQuery.toLowerCase().trim()) || (c.city || '').toLowerCase().includes(clientSearchQuery.toLowerCase().trim())) : myClients);
    let formalGreeting = $derived(formatClientSalutation({
        salutation: userSalutation,
        name_first: userFirstName,
        name_last: userLastName,
        name: userName
    }, { withEmoji: true }));

    return {
        get appointments() { return appointments; }, get invoices() { return invoices; }, get documents() { return documents; },
        get myClients() { return myClients; }, get companyInfo() { return companyInfo; }, get isLoading() { return isLoading; },
        get errorMsg() { return errorMsg; }, get selectedAppointment() { return selectedAppointment; }, set selectedAppointment(v) { selectedAppointment = v; },
        get activeTab() { return activeTab; }, set activeTab(v) { activeTab = v; },
        get selectedContactClientId() { return selectedContactClientId; }, set selectedContactClientId(v) { selectedContactClientId = v; },
        get clientSearchQuery() { return clientSearchQuery; }, set clientSearchQuery(v) { clientSearchQuery = v; },
        get historySearchQuery() { return historySearchQuery; }, set historySearchQuery(v) { historySearchQuery = v; },
        get userName() { return userName; }, get userFirstName() { return userFirstName; }, get userLastName() { return userLastName; },
        get userEmail() { return userEmail; }, set userEmail(v) { userEmail = v; }, get userType() { return userType; },
        get apiBaseUrl() { return apiBaseUrl; }, getAuthToken: getPortalAuthToken, handleLogout: performPortalLogout, loadData, deletePortalContact, parseUserFromAuth,
        get upcomingAppointments() { return upcomingAppointments; }, get pastAppointments() { return pastAppointments; },
        get nextAppointment() { return nextAppointment; }, get nextClientName() { return nextClientName; },
        get overdueInvoices() { return overdueInvoices; }, get activeClientRecord() { return activeClientRecord; },
        get filteredMyClients() { return filteredMyClients; }, get formalGreeting() { return formalGreeting; }
    };
}
