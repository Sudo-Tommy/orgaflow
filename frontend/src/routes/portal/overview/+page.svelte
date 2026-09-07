<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { pb } from "$lib/services/pocketbase";
    import { fade } from "svelte/transition";
    import PortalAppointmentDetail from "$lib/components/portal/PortalAppointmentDetail.svelte";
    import PortalCalendarGrid from "$lib/components/portal/PortalCalendarGrid.svelte";
    import PortalInvoiceList from "$lib/components/portal/PortalInvoiceList.svelte";
    import PortalDocumentList from "$lib/components/portal/PortalDocumentList.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import { 
        Calendar, Clock, MapPin, ArrowRight, FileText, Inbox, CreditCard, Star, 
        LogOut, Home, Mail, X, User, UserPlus, Search, Folder, Phone, Building, 
        ShieldCheck, HeartHandshake, UserCheck, Plus, Trash2, Edit2, AlertCircle, 
        PhoneCall, Sparkles, Stethoscope, Users
    } from "lucide-svelte";
    import LandingAppointmentModal from "$lib/components/LandingAppointmentModal.svelte";
    import FeedbackModal from "$lib/components/feedback/FeedbackModal.svelte";
    import PortalProfileModal from "$lib/components/portal/PortalProfileModal.svelte";
    import PortalNewClientModal from "$lib/components/portal/PortalNewClientModal.svelte";
    import PortalClientEditModal from "$lib/components/portal/PortalClientEditModal.svelte";
    import PortalContactModal from "$lib/components/portal/PortalContactModal.svelte";
    import NextAppointmentCard from "$lib/components/portal/NextAppointmentCard.svelte";
    import SecureActionForm from "$lib/components/portal/SecureActionForm.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import type LandingAppointmentModalType from "$lib/components/LandingAppointmentModal.svelte";
    import { resolveDocumentUrl } from "$lib/utils/documentUrl";

    let appointments = $state<any[]>([]);
    let invoices = $state<any[]>([]);
    let documents = $state<any[]>([]);
    let myClients = $state<any[]>([]);
    let companyInfo = $state<any>(null);
    let isLoading = $state(true);
    let errorMsg = $state("");
    let selectedAppointment = $state<any>(null);
    
    // Tab Navigation: overview | calendar | invoices | documents | clients
    let activeTab = $state<'overview' | 'calendar' | 'invoices' | 'documents' | 'clients'>('overview');

    let selectedContactClientId = $state("");
    let clientSearchQuery = $state("");

    let pdfPreviewModal: ReturnType<typeof PdfPreviewModal>;
    let appointmentModal: LandingAppointmentModalType;
    let feedbackModal: ReturnType<typeof FeedbackModal>;
    let profileModal: ReturnType<typeof PortalProfileModal>;
    let newClientModal: ReturnType<typeof PortalNewClientModal>;
    // svelte-ignore non_reactive_update
    let clientEditModal: ReturnType<typeof PortalClientEditModal>;
    let contactModal: ReturnType<typeof PortalContactModal>;

    let mailingListDialog: HTMLDialogElement | undefined = $state();
    let historyDialog: HTMLDialogElement | undefined = $state();
    let isSubscribed = $state(false);
    let isMailingLoading = $state(false);
    let mailingMsg = $state("");
    let userEmail = $state("");

    const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) 
        ? `http://${window.location.hostname}:3000/portal` 
        : '/api/emails/portal';

    function getAuthToken(): string {
        if (typeof window !== 'undefined') {
            const portalToken = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            if (portalToken) return portalToken;
        }
        return pb.authStore.token || "";
    }

    function handleLogout() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('portal_token');
            localStorage.removeItem('portal_admin_mode');
            localStorage.removeItem('portal_stay_logged_in');
            sessionStorage.removeItem('portal_token');
        }
        pb.authStore.clear();
        goto('/portal');
    }

    async function loadData() {
        isLoading = true;
        errorMsg = "";
        try {
            const token = getAuthToken();
            if (!token) {
                goto('/portal');
                return;
            }
            
            const [appRes, invRes, clientRes, docRes] = await Promise.all([
                fetch(`${apiBaseUrl}/appointments`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiBaseUrl}/invoices`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiBaseUrl}/clients`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiBaseUrl}/documents`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            if (!appRes.ok) {
                if (appRes.status === 401 || appRes.status === 403) {
                    handleLogout();
                    return;
                }
                throw new Error("Fehler beim Laden der Termine.");
            }

            const invData = invRes.ok ? await invRes.json() : { invoices: [] };
            const clientData = clientRes.ok ? await clientRes.json() : { clients: [] };
            const docData = docRes.ok ? await docRes.json() : { documents: [] };
            const appData = await appRes.json();
            
            // Private und ausgeblendete Termine im Portal grundsätzlich ausschließen
            appointments = (appData.appointments || []).filter((a: any) => a.is_private !== true && a.is_visible !== false);
            invoices = (invData.invoices || []).map((inv: any) => ({
                ...inv,
                files: (inv.files || []).map((f: any) => ({
                    ...f,
                    url: resolveDocumentUrl(f.url)
                }))
            }));
            companyInfo = invData.companyInfo || null;
            documents = (docData.documents || []).map((d: any) => ({
                ...d,
                url: resolveDocumentUrl(d.url)
            }));
            myClients = clientData.clients || [];

            if (myClients.length > 0 && !selectedContactClientId) {
                selectedContactClientId = myClients[0].id;
            }
        } catch (err: any) {
            errorMsg = err.message;
        } finally {
            isLoading = false;
        }
    }

    let now = new Date();
    let upcomingAppointments = $derived(appointments.filter(a => new Date(a.appointment) >= now).sort((a, b) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime()));
    let pastAppointments = $derived(appointments.filter(a => new Date(a.appointment) < now).sort((a, b) => new Date(b.appointment).getTime() - new Date(a.appointment).getTime()));
    
    let historySearchQuery = $state("");
    let filteredPastAppointments = $derived.by(() => {
        const query = historySearchQuery.toLowerCase().trim();
        if (!query) return pastAppointments;
        
        return pastAppointments.filter((app: any) => {
            const desc = (app.description || '').toLowerCase();
            const dateStr = new Date(app.appointment).toLocaleDateString('de-DE');
            
            let clientName = "";
            if (app.expand?.client?.[0]) {
                clientName = `${app.expand.client[0].name_first} ${app.expand.client[0].name_last}`.toLowerCase();
            }
            
            let userName = "";
            if (app.expand?.user) {
                userName = `${app.expand.user.name_first} ${app.expand.user.name_last}`.toLowerCase();
            }

            return desc.includes(query) || dateStr.includes(query) || clientName.includes(query) || userName.includes(query);
        });
    });

    let groupedPastAppointments = $derived.by(() => {
        const groups: { monthYear: string, apps: any[] }[] = [];
        for (const app of filteredPastAppointments) {
            const monthYear = new Date(app.appointment).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
            let group = groups.find(g => g.monthYear === monthYear);
            if (!group) {
                group = { monthYear, apps: [] };
                groups.push(group);
            }
            group.apps.push(app);
        }
        return groups;
    });

    let nextAppointment = $derived(upcomingAppointments.length > 0 ? upcomingAppointments[0] : null);

    let nextClientName = $derived.by(() => {
        if (!nextAppointment) return '';
        const cl = nextAppointment.expand?.client || nextAppointment.expand?.client_id;
        const clientRecord = Array.isArray(cl) ? cl[0] : cl;
        if (!clientRecord) return '';
        const sal = clientRecord.salutation ? `${clientRecord.salutation} ` : '';
        return `${sal}${clientRecord.name_first || ''} ${clientRecord.name_last || ''}`.trim();
    });

    let overdueInvoices = $derived(invoices.filter(inv => {
        if (['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(inv.status)) return false;
        if (!inv.due_date) return false;
        return new Date(inv.due_date).getTime() < new Date().setHours(0,0,0,0);
    }));
    
    let userName = $state("");
    let userSalutation = $state("");
    let userFirstName = $state("");
    let userLastName = $state("");
    let userType = $state("client");

    let activeClientRecord = $derived.by(() => {
        if (!myClients || myClients.length === 0) return null;
        if (!selectedContactClientId) return myClients[0];
        return myClients.find(c => c.id === selectedContactClientId) || myClients[0];
    });

    let filteredMyClients = $derived.by(() => {
        const q = clientSearchQuery.toLowerCase().trim();
        if (!q) return myClients;
        return myClients.filter(c => 
            (c.name || '').toLowerCase().includes(q) ||
            (c.city || '').toLowerCase().includes(q) ||
            (c.street || '').toLowerCase().includes(q)
        );
    });

    let formalGreeting = $derived.by(() => {
        const sal = (userSalutation || '').trim();
        const last = (userLastName || '').trim();
        const first = (userFirstName || '').trim();

        if (sal === 'Herr' && last) return `Guten Tag, Herr ${last}! 👋`;
        if (sal === 'Frau' && last) return `Guten Tag, Frau ${last}! 👋`;
        if (sal === 'Familie' && last) return `Guten Tag, Familie ${last}! 👋`;
        if (sal === 'Firma' && (last || userName)) return `Guten Tag, Firma ${last || userName}! 👋`;

        if (last && first) return `Guten Tag, ${first} ${last}! 👋`;
        if (last) return `Guten Tag, ${last}! 👋`;
        if (first) return `Guten Tag, ${first}! 👋`;
        if (userName && userName !== 'Gast') return `Guten Tag, ${userName}! 👋`;

        return 'Guten Tag! 👋';
    });

    onMount(() => {
        const token = getAuthToken();
        if (!token) {
            goto('/portal');
            return;
        }

        if (pb.authStore.isValid && pb.authStore.model) {
            userFirstName = pb.authStore.model.name_first || "";
            userLastName = pb.authStore.model.name_last || "";
            userSalutation = pb.authStore.model.salutation || "";
            userEmail = pb.authStore.model.email || "";
            userName = userFirstName || pb.authStore.model.username || "Gast";
            userType = (pb.authStore.isAdmin || pb.authStore.model.role === 'admin' || pb.authStore.model.role === 'superadmin') ? 'admin' : (pb.authStore.model.role || 'client');
        } else if (token) {
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    userFirstName = payload.name_first || "";
                    userLastName = payload.name_last || "";
                    userSalutation = payload.salutation || "";
                    userEmail = payload.email || "";
                    userName = userFirstName || payload.name || "Gast";
                    userType = payload.type || 'client';
                }
            } catch (e) {
                console.warn("[PORTAL] Konnte JWT nicht parsen:", e);
            }
        }

        loadData();
    });

    function openAppointmentModal() {
        const cl = activeClientRecord || (myClients.length > 0 ? myClients[0] : null);
        const effectiveRole = userType === 'contact' ? 'contact' : (myClients.length > 1 ? 'caregiver' : 'client');
        appointmentModal?.open({
            clientId: cl?.id,
            clientName: cl ? `${cl.name_first || ''} ${cl.name_last || ''}`.trim() || cl.name : undefined,
            companyId: cl?.company,
            role: effectiveRole as any,
            senderName: `${userFirstName} ${userLastName}`.trim() || userName,
            email: userEmail,
            availableClients: myClients.map(c => ({
                id: c.id,
                name: `${c.name_first || ''} ${c.name_last || ''}`.trim() || c.name,
                company: c.company
            }))
        });
    }

    async function openMailingList() {
        mailingMsg = "";
        isMailingLoading = true;
        mailingListDialog?.showModal();
        try {
            const token = getAuthToken();
            const res = await fetch(`${apiBaseUrl}/mailing-list`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                isSubscribed = data.subscribed;
                userEmail = data.email || "";
            }
        } catch (e) {
            console.error("Fehler beim Laden des Verteiler-Status", e);
        } finally {
            isMailingLoading = false;
        }
    }

    async function updateSubscription() {
        isMailingLoading = true;
        mailingMsg = "";
        try {
            const token = getAuthToken();
            const res = await fetch(`${apiBaseUrl}/mailing-list`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscribed: isSubscribed })
            });
            if (!res.ok) throw new Error("Fehler beim Speichern");
            mailingMsg = isSubscribed ? "Erfolgreich in den Verteiler eingetragen!" : "Erfolgreich ausgetragen.";
        } catch (e) {
            mailingMsg = "Fehler bei der Aktualisierung.";
            isSubscribed = !isSubscribed;
        } finally {
            isMailingLoading = false;
        }
    }

    async function deletePortalContact(targetClientId: string, contactId: string) {
        if (!confirm("Möchten Sie diesen Kontakt wirklich entfernen?")) return;
        try {
            const token = getAuthToken();
            const res = await fetch(`${apiBaseUrl}/clients/${targetClientId}/contacts/${contactId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Fehler beim Entfernen des Kontakts.");
            }
            toastStore.success("Kontakt erfolgreich entfernt.");
            await loadData();
        } catch (err: any) {
            toastStore.error(err.message || "Fehler beim Löschen.");
        }
    }

    function getContactRole(contact: any): string {
        if (typeof contact?.notes === 'object' && contact.notes !== null) {
            return contact.notes.role || contact.notes.relationship || 'Kontakt';
        }
        if (typeof contact?.notes === 'string' && contact.notes.trim()) {
            return contact.notes;
        }
        return 'Bezugsperson';
    }

    function getContactDetails(contact: any): string {
        if (typeof contact?.notes === 'object' && contact.notes !== null) {
            return contact.notes.details || contact.notes.note || '';
        }
        return '';
    }
</script>

<svelte:head><title>Übersicht - Klienten-Portal</title></svelte:head>

<div class="w-full max-w-5xl mx-auto animate-enter pb-10">
    <!-- Header / Greeting Card -->
    <div class="mb-6 sm:mb-8 bg-white dark:bg-slate-900 p-5 sm:p-8 md:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col gap-4 sm:gap-6 transition-colors">
        <div class="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 z-0 pointer-events-none"></div>
        
        <!-- Action Toolbar -->
        <div class="flex flex-wrap items-center justify-end gap-2 z-20 w-full">
            {#if overdueInvoices.length > 0}
                <button onclick={() => activeTab = 'invoices'} class="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-500 text-rose-700 dark:text-rose-300 hover:text-white text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-xs backdrop-blur-md transition-all active:scale-95 cursor-pointer" title="{overdueInvoices.length} unbezahlte Rechnung(en)">
                    <span class="text-sm leading-none">⚠️</span> <span>{overdueInvoices.length} unbezahlt</span>
                </button>
            {/if}
            <a href="/" class="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs backdrop-blur-md transition-all active:scale-95 cursor-pointer">
                <Home class="w-3.5 h-3.5" /> <span class="hidden sm:inline">Startseite</span>
            </a>
            <button onclick={() => profileModal?.open()} class="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs backdrop-blur-md transition-all active:scale-95 cursor-pointer" title="Ihr Profil">
                <User class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> <span class="hidden sm:inline">Ihr Profil</span>
            </button>
            <button onclick={openMailingList} class="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs backdrop-blur-md transition-all active:scale-95 cursor-pointer" title="Info-Verteiler">
                <Mail class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> <span class="hidden sm:inline">Info-Verteiler</span>
            </button>
            <button onclick={handleLogout} class="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs backdrop-blur-md transition-all active:scale-95 cursor-pointer" title="Abmelden">
                <LogOut class="w-3.5 h-3.5 text-rose-500" /> <span class="hidden sm:inline">Abmelden</span>
            </button>
        </div>

        <div class="relative z-10 w-full">
            <p class="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1.5">Willkommen im Portal</p>
            <h1 class="text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2 sm:mb-3">{formalGreeting}</h1>
            <p class="text-slate-600 dark:text-slate-400 font-medium max-w-lg leading-relaxed text-sm md:text-base">
                Hier haben Sie alle {userType === 'client' ? 'Ihre' : 'die'} Termine, Betreuer, Notfallkontakte, Rechnungen und Dokumente sicher und übersichtlich im Blick.
            </p>
            
            <!-- Segmentierte Tab-Navigation -->
            <div class="overflow-x-auto custom-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
                <div class="flex items-center gap-1 sm:gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-2xl shadow-inner mt-5 sm:mt-8 w-max min-w-full sm:min-w-0 border border-slate-200 dark:border-slate-700">
                    <button onclick={() => activeTab = 'overview'} class="flex-1 sm:flex-none px-3.5 sm:px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 whitespace-nowrap cursor-pointer {activeTab === 'overview' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/60 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}">Übersicht</button>
                    <button onclick={() => activeTab = 'calendar'} class="flex-1 sm:flex-none px-3.5 sm:px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 whitespace-nowrap cursor-pointer {activeTab === 'calendar' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/60 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}">Kalender</button>
                    <button onclick={() => activeTab = 'invoices'} class="relative flex-1 sm:flex-none px-3.5 sm:px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 whitespace-nowrap cursor-pointer {activeTab === 'invoices' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/60 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}">
                        Rechnungen
                        {#if overdueInvoices.length > 0}
                            <span class="absolute top-1.5 right-1.5 sm:top-1 sm:right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full" title="{overdueInvoices.length} überfällige Rechnung(en)"></span>
                        {/if}
                    </button>
                    <button onclick={() => activeTab = 'documents'} class="relative flex-1 sm:flex-none px-3.5 sm:px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 whitespace-nowrap cursor-pointer {activeTab === 'documents' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/60 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}">
                        Dokumente
                        {#if documents.length > 0}
                            <span class="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] {activeTab === 'documents' ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}">{documents.length}</span>
                        {/if}
                    </button>
                    <button onclick={() => activeTab = 'clients'} class="flex-1 sm:flex-none px-3.5 sm:px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 whitespace-nowrap cursor-pointer {activeTab === 'clients' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/60 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}">
                        {userType === 'contact' ? 'Klienten & Kontakte' : 'Betreuer & Kontakte'}
                    </button>
                </div>
            </div>
        </div>
    </div>

    {#if errorMsg}
        <div class="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 p-5 rounded-2xl mb-8 text-sm font-bold border border-rose-200 dark:border-rose-900/60 flex items-center gap-3 shadow-sm animate-enter">
            <span class="text-xl">⚠️</span> {errorMsg}
        </div>
    {/if}

    {#if isLoading}
        <div class="flex flex-col items-center justify-center py-24 animate-pulse">
            <div class="w-14 h-14 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 rounded-full animate-spin mb-5"></div>
            <p class="text-slate-600 dark:text-slate-400 font-medium">Lade Ihre persönliche Übersicht...</p>
        </div>
    {:else}
        {#if activeTab === 'overview'}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8" transition:fade={{ duration: 200 }}>
            
            <div class="lg:col-span-2 flex flex-col gap-6 lg:gap-8">
                <!-- Nächster Termin -->
                <NextAppointmentCard 
                    appointment={nextAppointment}
                    clientName={nextClientName}
                    {userType}
                    onSelectDetails={(app) => selectedAppointment = app}
                    onRequestAppointment={openAppointmentModal}
                />

                <!-- Quick Actions Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <!-- Betreuer & Kontakte Quick Action -->
                    <button onclick={() => activeTab = 'clients'} class="text-left bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-start gap-5 cursor-pointer w-full">
                        <div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner border border-indigo-100 dark:border-indigo-900/60 group-hover:scale-110 transition-transform">
                            <HeartHandshake class="w-7 h-7" />
                        </div>
                        <div>
                            <h3 class="font-black text-slate-900 dark:text-slate-100 text-xl mb-1.5">{userType === 'contact' ? 'Klienten & Kontakte' : 'Betreuer & Kontakte'}</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                {userType === 'contact' ? 'Klientenakten, Bezugspersonen und Notfallnummern einsehen.' : 'Ihre Assistenz, gesetzliche Betreuer und Notfallkontakte direkt anrufen.'}
                            </p>
                        </div>
                    </button>

                    <!-- Rechnungen einsehen -->
                    <button onclick={() => activeTab = 'invoices'} class="text-left bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-start gap-5 cursor-pointer w-full">
                        <div class="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner border border-emerald-100 dark:border-emerald-900/60 group-hover:scale-110 transition-transform">
                            <CreditCard class="w-7 h-7" />
                        </div>
                        <div>
                            <h3 class="font-black text-slate-900 dark:text-slate-100 text-xl mb-1.5">{userType === 'client' ? 'Ihre Rechnungen' : 'Rechnungen der Klienten'}</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Zahlungsstatus prüfen, Rechnungen und Zeitnachweise sicher einsehen.</p>
                        </div>
                    </button>

                    <!-- Dokumente & Akten -->
                    <button onclick={() => activeTab = 'documents'} class="text-left bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-start gap-5 cursor-pointer w-full">
                        <div class="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner border border-blue-100 dark:border-blue-900/60 group-hover:scale-110 transition-transform">
                            <Folder class="w-7 h-7" />
                        </div>
                        <div>
                            <h3 class="font-black text-slate-900 dark:text-slate-100 text-xl mb-1.5">{userType === 'client' ? 'Ihre Dokumente' : 'Dokumenten-Ablage'}</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Pflegeverträge, Bescheide und Vollmachten digital verwalten und hochladen.</p>
                        </div>
                    </button>

                    <button onclick={openAppointmentModal} class="text-left bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-start gap-5 cursor-pointer w-full">
                        <div class="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner border border-amber-100 dark:border-amber-900/60 group-hover:scale-110 transition-transform">
                            <Inbox class="w-7 h-7" />
                        </div>
                        <div>
                            <h3 class="font-black text-slate-900 dark:text-slate-100 text-xl mb-1.5">Termin anfragen</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Buchen Sie bequem neue Einsätze oder senden Sie uns eine Nachricht.</p>
                        </div>
                    </button>

                    {#if userType === 'contact' || userType === 'admin'}
                        <button onclick={() => newClientModal?.open()} class="text-left bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-start gap-5 cursor-pointer w-full sm:col-span-2">
                            <div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner border border-indigo-100 dark:border-indigo-900/60 group-hover:scale-110 transition-transform">
                                <UserPlus class="w-7 h-7" />
                            </div>
                            <div>
                                <h3 class="font-black text-slate-900 dark:text-slate-100 text-xl mb-1.5">Weiteren Klienten anmelden</h3>
                                <p class="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Beantragen Sie die Neuaufnahme eines weiteren Klienten oder Angehörigen.</p>
                            </div>
                        </button>
                    {/if}
                </div>

                <!-- Formular für automatische Text-Optimierung mit Double-Submission-Schutz -->
                <SecureActionForm />
            </div>

            <!-- Rechts: Letzte Termine (Historie) -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-full max-h-175">
                <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between sticky top-0 z-10 shrink-0">
                    <h2 class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Vergangene Termine</h2>
                    <button onclick={() => activeTab = 'calendar'} class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors cursor-pointer px-1">Alle ansehen</button>
                </div>
                
                <div class="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-3.5">
                    {#if pastAppointments.length > 0}
                        {#each pastAppointments.slice(0, 5) as app}
                            <button type="button" onclick={() => selectedAppointment = app} class="w-full text-left bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/60 dark:hover:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all flex flex-col gap-2.5 group active:scale-95 shadow-2xs hover:shadow-md cursor-pointer">
                                <div class="flex items-center justify-between w-full">
                                    <span class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                    <div class="flex gap-1.5">
                                        {#if app.report}<span class="w-5 h-5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[10px] shadow-xs" title="Bericht vorhanden">📝</span>{/if}
                                        {#if app.settled}<span class="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] shadow-xs" title="Abgerechnet">✓</span>{/if}
                                    </div>
                                </div>
                                <p class="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">{app.description || 'Termin ohne Beschreibung'}</p>
                                <div class="mt-1 flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                    Details ansehen <ArrowRight class="w-3 h-3" />
                                </div>
                            </button>
                        {/each}
                        {#if pastAppointments.length > 5}
                            <button type="button" onclick={() => { historySearchQuery = ""; historyDialog?.showModal(); }} class="w-full mt-2 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
                                Alle {pastAppointments.length} Historien ansehen <ArrowRight class="w-3.5 h-3.5" />
                            </button>
                        {/if}
                    {:else}
                        <div class="flex flex-col items-center justify-center h-full opacity-60 py-12">
                            <span class="text-4xl mb-4">🕰️</span>
                            <p class="text-sm text-slate-500 dark:text-slate-400 font-bold text-center">Noch keine Historie vorhanden.</p>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    {:else if activeTab === 'calendar'}
        <PortalCalendarGrid 
            visibleAppointments={appointments} 
            onSelectAppointment={(app) => selectedAppointment = app} 
        />
        
    {:else if activeTab === 'invoices'}
        <PortalInvoiceList 
            {invoices} 
            {companyInfo}
            onPreview={(url, title, file) => pdfPreviewModal?.open(url, title, file)} 
        />
        
    {:else if activeTab === 'documents'}
        <PortalDocumentList 
            {documents}
            {myClients}
            {userType}
            onPreview={(url, title, file) => pdfPreviewModal?.open(url, title, file)}
            onRefresh={loadData}
        />
        
    {:else if activeTab === 'clients'}
        <!-- === REITER: BETREUER / KLIENTEN & KONTAKTE === -->
        <div class="space-y-6 animate-enter">
            
            <!-- Klienten-Auswahl & Suche (falls Betreuer mehrere Klienten betreut) -->
            {#if myClients.length > 1}
                <div class="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Users class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                Klient auswählen ({myClients.length} Klienten)
                            </h2>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Wählen Sie den Klienten aus, dessen Betreuer und Kontakte Sie verwalten möchten.</p>
                        </div>

                        <div class="w-full md:w-72">
                            <input
                                type="text"
                                bind:value={clientSearchQuery}
                                placeholder="Klient suchen..."
                                class="orga-input-clear py-2 text-xs"
                            />
                        </div>
                    </div>

                    <div class="flex items-center gap-2 overflow-x-auto custom-scrollbar mt-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {#each filteredMyClients as c}
                            <button
                                type="button"
                                onclick={() => selectedContactClientId = c.id}
                                class="px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border {selectedContactClientId === c.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'}"
                            >
                                <span class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                                    {(c.name_first?.charAt(0) || '')}{(c.name_last?.charAt(0) || '')}
                                </span>
                                <span>{c.name_first} {c.name_last}</span>
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}

            {#if !activeClientRecord}
                <div class="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center text-slate-500">
                    <User class="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
                    <p class="font-bold text-base text-slate-700 dark:text-slate-300">Keine Klientendaten gefunden.</p>
                </div>
            {:else}
                {@const currentClient = activeClientRecord}
                {@const insuranceObj = Array.isArray(currentClient.expand?.insurance) ? currentClient.expand.insurance[0] : currentClient.expand?.insurance}
                {@const caregiverObj = Array.isArray(currentClient.expand?.caregiver) ? currentClient.expand.caregiver[0] : currentClient.expand?.caregiver}
                {@const contactsList = Array.isArray(currentClient.expand?.contacts) ? currentClient.expand.contacts : (currentClient.expand?.contacts ? [currentClient.expand.contacts] : [])}
                {@const retirementHomeObj = Array.isArray(currentClient.expand?.retirement_homes) ? currentClient.expand.retirement_homes[0] : currentClient.expand?.retirement_homes}

                <!-- Sektion 1: Klienten-Hauptkarte (Stammdaten & Pflegegrad) -->
                <div class="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden">
                    <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div class="flex items-start gap-4">
                            <div class="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-black text-2xl shrink-0 shadow-inner border border-indigo-200 dark:border-indigo-800">
                                {(currentClient.name_first?.charAt(0) || '')}{(currentClient.name_last?.charAt(0) || '')}
                            </div>
                            <div class="min-w-0">
                                <div class="flex flex-wrap items-center gap-2 mb-1">
                                    <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                                        {currentClient.name_first} {currentClient.name_last}
                                    </h2>
                                    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold border {currentClient.level_of_care && currentClient.level_of_care !== '0' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}">
                                        {currentClient.level_of_care && currentClient.level_of_care !== '0' ? `Pflegegrad ${currentClient.level_of_care}` : 'Kein Pflegegrad'}
                                    </span>
                                </div>
                                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {currentClient.birthdate ? `Geboren am ${new Date(currentClient.birthdate).toLocaleDateString('de-DE')}` : 'Klienten-Akte'}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onclick={() => clientEditModal?.open(currentClient)}
                            class="self-start min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                            <Edit2 class="w-3.5 h-3.5" /> Stammdaten bearbeiten
                        </button>
                    </div>

                    <!-- Klienten-Stammdaten Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Wohnort / Anschrift</span>
                            <p class="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                {currentClient.street || ''} {currentClient.housenr || ''}
                            </p>
                            <p class="text-slate-600 dark:text-slate-400">{currentClient.zip || ''} {currentClient.city || 'Keine Adresse hinterlegt'}</p>
                        </div>

                        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Krankenkasse & Pflegekasse</span>
                            <p class="font-bold text-slate-900 dark:text-slate-100 text-sm">{insuranceObj?.name || 'Keine Angabe'}</p>
                            <p class="text-slate-600 dark:text-slate-400 font-mono text-[11px]">Vers.-Nr: {currentClient.insurance_nr || '-'}</p>
                        </div>

                        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Direkter Klientenkontakt</span>
                            {#if currentClient.phone || currentClient.handy}
                                <a href="tel:{currentClient.phone || currentClient.handy}" class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                    <Phone class="w-3 h-3" /> {currentClient.phone || currentClient.handy}
                                </a>
                            {:else}
                                <p class="text-slate-400 italic">Keine Rufnummer</p>
                            {/if}
                            {#if currentClient.email}
                                <a href="mailto:{currentClient.email}" class="text-slate-600 dark:text-slate-300 hover:underline flex items-center gap-1 truncate">
                                    <Mail class="w-3 h-3 text-slate-400" /> {currentClient.email}
                                </a>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- Sektion 2 & 3 im 2-Spalten-Layout: Zuständige Seniorenassistenz & Gesetzlicher Betreuer -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Zuständige Seniorenassistenz -->
                    <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md flex flex-col justify-between">
                        <div>
                            <div class="flex items-center justify-between mb-4">
                                <span class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                    <UserCheck class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    Zuständige Seniorenassistenz
                                </span>
                                <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                                    Aktiv zugeteilt
                                </span>
                            </div>

                            {#if currentClient.assigned_employee}
                                <div class="flex items-start gap-3.5 mb-4">
                                    <div class="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-base shrink-0 border border-emerald-200 dark:border-emerald-800">
                                        {(currentClient.assigned_employee.name_first?.charAt(0) || '')}{(currentClient.assigned_employee.name_last?.charAt(0) || '')}
                                    </div>
                                    <div class="min-w-0">
                                        <h4 class="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">
                                            {currentClient.assigned_employee.name_first} {currentClient.assigned_employee.name_last}
                                        </h4>
                                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ihre persönliche Ansprechperson im Alltag</p>
                                    </div>
                                </div>

                                <div class="space-y-2 text-xs">
                                    {#if currentClient.assigned_employee.phone}
                                        <a 
                                            href="tel:{currentClient.assigned_employee.phone}" 
                                            class="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors font-semibold"
                                        >
                                            <span class="flex items-center gap-2"><Phone class="w-4 h-4 text-emerald-600" /> {currentClient.assigned_employee.phone}</span>
                                            <span class="text-[11px] font-bold text-emerald-600">Anrufen</span>
                                        </a>
                                    {/if}
                                    {#if currentClient.assigned_employee.email}
                                        <a 
                                            href="mailto:{currentClient.assigned_employee.email}" 
                                            class="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-800 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors font-semibold"
                                        >
                                            <span class="flex items-center gap-2 truncate"><Mail class="w-4 h-4 text-indigo-600" /> {currentClient.assigned_employee.email}</span>
                                            <span class="text-[11px] font-bold text-indigo-600 shrink-0 ml-2">E-Mail</span>
                                        </a>
                                    {/if}
                                </div>
                            {:else}
                                <div class="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                                    <p>Ihr Team der Seniorenassistenz ist für Sie da.</p>
                                    <p class="mt-1">Kontaktieren Sie uns gern über die Startseite oder per Termin-Anfrage.</p>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Gesetzliche(r) Betreuer(in) / Bevollmächtigte(r) -->
                    <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md flex flex-col justify-between">
                        <div>
                            <div class="flex items-center justify-between mb-4">
                                <span class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                    <ShieldCheck class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    Gesetzliche(r) Betreuer(in)
                                </span>
                                {#if caregiverObj}
                                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
                                        Hinterlegt
                                    </span>
                                {/if}
                            </div>

                            {#if caregiverObj}
                                <div class="flex items-start gap-3.5 mb-4">
                                    <div class="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-base shrink-0 border border-indigo-200 dark:border-indigo-800">
                                        {(caregiverObj.name_first?.charAt(0) || '')}{(caregiverObj.name_last?.charAt(0) || '')}
                                    </div>
                                    <div class="min-w-0">
                                        <h4 class="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">
                                            {caregiverObj.name_first} {caregiverObj.name_last}
                                        </h4>
                                        {#if caregiverObj.company_name}
                                            <p class="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">{caregiverObj.company_name}</p>
                                        {:else}
                                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gesetzliche Vertretung / Bevollmächtigung</p>
                                        {/if}
                                    </div>
                                </div>

                                <div class="space-y-2 text-xs">
                                    {#if caregiverObj.phone || caregiverObj.handy}
                                        <a 
                                            href="tel:{caregiverObj.phone || caregiverObj.handy}" 
                                            class="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-800 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors font-semibold"
                                        >
                                            <span class="flex items-center gap-2"><Phone class="w-4 h-4 text-indigo-600" /> {caregiverObj.phone || caregiverObj.handy}</span>
                                            <span class="text-[11px] font-bold text-indigo-600">Anrufen</span>
                                        </a>
                                    {/if}
                                    {#if caregiverObj.email}
                                        <a 
                                            href="mailto:{caregiverObj.email}" 
                                            class="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-800 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors font-semibold"
                                        >
                                            <span class="flex items-center gap-2 truncate"><Mail class="w-4 h-4 text-indigo-600" /> {caregiverObj.email}</span>
                                            <span class="text-[11px] font-bold text-indigo-600 shrink-0 ml-2">E-Mail</span>
                                        </a>
                                    {/if}
                                    {#if caregiverObj.city}
                                        <p class="text-slate-500 dark:text-slate-400 text-xs px-2 pt-1 flex items-center gap-1.5">
                                            <MapPin class="w-3.5 h-3.5" /> {caregiverObj.street} {caregiverObj.housenr}, {caregiverObj.zip} {caregiverObj.city}
                                        </p>
                                    {/if}
                                </div>
                            {:else}
                                <div class="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                                    <p>Kein gesetzlicher Betreuer hinterlegt.</p>
                                    <p class="mt-1">Der Klient verwaltet seine Belange eigenständig oder durch Bevollmächtigte.</p>
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- Sektion 4: Wichtige & Notfall-Kontakte -->
                <div class="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 class="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <PhoneCall class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                Wichtige Kontakte & Notfallpersonen
                            </h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Angehörige, Notfallkontakte, Hausärzte und Pflegedienste für den Not- oder Abstimmungsfall
                            </p>
                        </div>

                        <button
                            type="button"
                            onclick={() => contactModal?.open(currentClient.id)}
                            class="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                        >
                            <Plus class="w-4 h-4" /> Kontakt hinterlegen
                        </button>
                    </div>

                    {#if contactsList.length === 0}
                        <div class="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-sm">
                            <HeartHandshake class="w-10 h-10 mx-auto mb-2 opacity-50 text-indigo-500" />
                            <p class="font-bold text-slate-700 dark:text-slate-300">Noch keine Kontakte eingetragen.</p>
                            <p class="text-xs mt-1">Legen Sie Notfallpersonen, Angehörige oder Ärzte an, damit diese im Bedarfsfall direkt erreichbar sind.</p>
                            <button
                                type="button"
                                onclick={() => contactModal?.open(currentClient.id)}
                                class="mt-4 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-indigo-100"
                            >
                                <Plus class="w-3.5 h-3.5" /> Ersten Kontakt eintragen
                            </button>
                        </div>
                    {:else}
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {#each contactsList as contact}
                                {@const role = getContactRole(contact)}
                                {@const details = getContactDetails(contact)}
                                <div class="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group">
                                    <div>
                                        <div class="flex items-start justify-between gap-3">
                                            <div class="flex items-start gap-3 min-w-0">
                                                <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-200 dark:border-indigo-800">
                                                    {(contact.name_first?.charAt(0) || '')}{(contact.name_last?.charAt(0) || '')}
                                                </div>
                                                <div class="min-w-0">
                                                    <h4 class="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                                                        {contact.name_first} {contact.name_last}
                                                    </h4>
                                                    {#if contact.company_name}
                                                        <p class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{contact.company_name}</p>
                                                    {/if}
                                                </div>
                                            </div>

                                            <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                                                {role}
                                            </span>
                                        </div>

                                        {#if details}
                                            <p class="text-xs text-slate-600 dark:text-slate-400 mt-2.5 p-2 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                                                {details}
                                            </p>
                                        {/if}
                                    </div>

                                    <div class="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                                        <div class="flex items-center gap-1.5 flex-wrap">
                                            {#if contact.phone || contact.handy}
                                                <a 
                                                    href="tel:{contact.phone || contact.handy}" 
                                                    class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                                                    title="Jetzt anrufen"
                                                >
                                                    <Phone class="w-3 h-3" /> Anrufen
                                                </a>
                                            {/if}
                                            {#if contact.email}
                                                <a 
                                                    href="mailto:{contact.email}" 
                                                    class="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors"
                                                    title="E-Mail senden"
                                                >
                                                    <Mail class="w-3 h-3" /> Mail
                                                </a>
                                            {/if}
                                        </div>

                                        <div class="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onclick={() => contactModal?.open(currentClient.id, contact)}
                                                class="w-8 h-8 rounded-lg bg-slate-200/70 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                                                title="Kontakt bearbeiten"
                                            >
                                                <Edit2 class="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onclick={() => deletePortalContact(currentClient.id, contact.id)}
                                                class="w-8 h-8 rounded-lg bg-slate-200/70 dark:bg-slate-700 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/60 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                                                title="Kontakt entfernen"
                                            >
                                                <Trash2 class="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>

                <!-- Sektion 5: Pflegeheim / Einrichtung (falls zugeordnet) -->
                {#if retirementHomeObj}
                    <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-lg shrink-0 border border-amber-200 dark:border-amber-800">
                                <Building class="w-6 h-6" />
                            </div>
                            <div>
                                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Pflegeheim / Einrichtung</span>
                                <h4 class="font-bold text-slate-900 dark:text-slate-100 text-base">{retirementHomeObj.name}</h4>
                                <p class="text-xs text-slate-600 dark:text-slate-400">{retirementHomeObj.address || ''} {retirementHomeObj.address_addition || ''}</p>
                            </div>
                        </div>

                        {#if retirementHomeObj.phone}
                            <a 
                                href="tel:{retirementHomeObj.phone}" 
                                class="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 text-xs font-bold transition-colors shrink-0"
                            >
                                <Phone class="w-3.5 h-3.5 text-amber-600" /> {retirementHomeObj.phone}
                            </a>
                        {/if}
                    </div>
                {/if}
            {/if}
        </div>
    {/if}
    {/if}
</div>

{#if selectedAppointment}
    <PortalAppointmentDetail 
        appointment={selectedAppointment} 
        onClose={() => selectedAppointment = null} 
        isContactMode={true} 
    />
{/if}

<PdfPreviewModal bind:this={pdfPreviewModal} />
<LandingAppointmentModal bind:this={appointmentModal} />
<FeedbackModal bind:this={feedbackModal} />
<PortalProfileModal bind:this={profileModal} />
<PortalNewClientModal bind:this={newClientModal} />
<PortalClientEditModal bind:this={clientEditModal} onSave={loadData} />
<PortalContactModal bind:this={contactModal} onSave={loadData} />

<!-- Info-Verteiler Dialog -->
<dialog 
    bind:this={mailingListDialog} 
    class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-md mx-auto my-auto rounded-3xl border-none shadow-2xl outline-none" 
    onclick={(e) => { if (e.target === mailingListDialog) mailingListDialog?.close(); }}
>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 w-full relative shadow-2xl animate-enter">
        <button 
            type="button"
            aria-label="Schließen" 
            onclick={() => mailingListDialog?.close()} 
            class="absolute top-5 right-5 min-w-[44px] min-h-[44px] w-11 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors cursor-pointer"
        >
            <X class="w-5 h-5" />
        </button>
        
        <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <span>📧</span> Info-Verteiler
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Erhalten Sie wichtige Updates und Terminkopien per E-Mail.</p>

        {#if isMailingLoading}
            <div class="flex justify-center my-4"><div class="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
        {:else}
            {#if mailingMsg}
                <div class="mb-4 p-3 rounded-xl text-sm font-semibold {mailingMsg.includes('Fehler') ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60' : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'} border animate-enter">
                    {mailingMsg}
                </div>
            {/if}

            <div class="flex flex-col gap-4">
                <label class="flex items-start gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-indigo-400 transition-colors bg-slate-50 dark:bg-slate-800/60">
                    <input type="checkbox" bind:checked={isSubscribed} onchange={updateSubscription} class="w-5 h-5 mt-0.5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer" disabled={isMailingLoading} />
                    <div>
                        <span class="font-bold text-slate-900 dark:text-slate-100 text-sm block">Im Verteiler eintragen</span>
                        <span class="text-xs text-slate-500 dark:text-slate-400 mt-1 block">Ihre E-Mail-Adresse ({userEmail || 'Ihre Adresse'}) wird für automatische Benachrichtigungen hinterlegt.</span>
                    </div>
                </label>
            </div>
        {/if}
    </div>
</dialog>

<!-- Vergangene Termine (Historie) Dialog -->
<dialog 
    bind:this={historyDialog} 
    class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-2xl mx-auto my-auto rounded-3xl border-none shadow-2xl outline-none" 
    onclick={(e) => { if (e.target === historyDialog) { historyDialog?.close(); historySearchQuery = ""; } }}
>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-h-[85vh] flex flex-col relative shadow-2xl overflow-hidden animate-enter">
        <div class="px-6 md:px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20">
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>🕰️</span> Vergangene Termine
                </h2>
                <button 
                    type="button"
                    aria-label="Schließen" 
                    onclick={() => { historyDialog?.close(); historySearchQuery = ""; }} 
                    class="min-w-[44px] min-h-[44px] w-11 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>
            <div class="relative">
                <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input 
                    type="search" 
                    id="portal-history-search-filter"
                    name="portal_history_search_filter"
                    autocomplete="off"
                    bind:value={historySearchQuery} 
                    placeholder={userType === 'contact' ? 'Nach Beschreibung, Datum oder Klient suchen...' : 'Nach Beschreibung, Datum oder Assistenz suchen...'} 
                    class="orga-input-clear py-2.5 pl-10 pr-9 text-sm w-full" 
                />
                {#if historySearchQuery}
                    <button 
                        type="button" 
                        onclick={() => historySearchQuery = ""} 
                        class="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                        title="Suche leeren"
                        aria-label="Suche leeren">
                        ✕
                    </button>
                {/if}
            </div>
        </div>
        
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 flex flex-col gap-3.5 bg-slate-50/50 dark:bg-slate-950/40">
            {#if filteredPastAppointments.length === 0}
                <div class="flex flex-col items-center justify-center py-10 opacity-60">
                    <span class="text-3xl mb-2">🔍</span>
                    <p class="text-sm font-bold text-slate-600 dark:text-slate-400">Keine Termine zur Suche gefunden.</p>
                </div>
            {:else}
                {#each groupedPastAppointments as group}
                    <div class="mb-6 last:mb-0">
                        <h3 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Calendar class="w-3.5 h-3.5 text-indigo-500" /> {group.monthYear}
                        </h3>
                        <div class="flex flex-col gap-3">
                            {#each group.apps as app}
                            <button 
                                type="button" 
                                onclick={() => { historyDialog?.close(); selectedAppointment = app; }} 
                                class="w-full text-left bg-white dark:bg-slate-900 hover:bg-indigo-50/60 dark:hover:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all flex flex-col gap-2.5 group active:scale-95 shadow-2xs hover:shadow-md cursor-pointer"
                            >
                                <div class="flex items-center justify-between w-full">
                                    <span class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                        {new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                    </span>
                                    <div class="flex gap-1.5">
                                        {#if app.report}<span class="w-5 h-5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[10px] shadow-xs" title="Bericht vorhanden">📝</span>{/if}
                                        {#if app.settled}<span class="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] shadow-xs" title="Abgerechnet">✓</span>{/if}
                                    </div>
                                </div>
                                
                                <p class="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">{app.description || 'Termin ohne Beschreibung'}</p>
                                
                                <div class="mt-1 flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                    Details ansehen <ArrowRight class="w-3 h-3" />
                                </div>
                            </button>
                            {/each}
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    </div>
</dialog>