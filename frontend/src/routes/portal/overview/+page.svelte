<script lang="ts">
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";
    import { fade } from "svelte/transition";
    import PortalAppointmentDetail from "$lib/components/portal/PortalAppointmentDetail.svelte";
    import PortalCalendarGrid from "$lib/components/portal/PortalCalendarGrid.svelte";
    import PortalInvoiceList from "$lib/components/portal/PortalInvoiceList.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import { Calendar, Clock, MapPin, ArrowRight, FileText, Inbox, CreditCard, Star, LogOut, Home, Mail, X, User, UserPlus } from "lucide-svelte";
    import LandingAppointmentModal from "$lib/components/LandingAppointmentModal.svelte";
    import FeedbackModal from "$lib/components/feedback/FeedbackModal.svelte";
    import PortalProfileModal from "$lib/components/portal/PortalProfileModal.svelte";
    import PortalNewClientModal from "$lib/components/portal/PortalNewClientModal.svelte";

    let appointments = $state<any[]>([]);
    let invoices = $state<any[]>([]);
    let isLoading = $state(true);
    let errorMsg = $state("");
    let selectedAppointment = $state<any>(null);
    
    // Tab Navigation: overview | calendar | invoices
    let activeTab = $state<'overview' | 'calendar' | 'invoices'>('overview');

    let pdfPreviewModal: ReturnType<typeof PdfPreviewModal>;
    let appointmentModal: ReturnType<typeof LandingAppointmentModal>;
    let feedbackModal: ReturnType<typeof FeedbackModal>;
    let profileModal: ReturnType<typeof PortalProfileModal>;
    let newClientModal: ReturnType<typeof PortalNewClientModal>;

    let mailingListDialog: HTMLDialogElement | undefined = $state();
    let isSubscribed = $state(false);
    let isMailingLoading = $state(false);
    let mailingMsg = $state("");
    let userEmail = $state("");

    const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';

    function handleLogout() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('portal_token');
            sessionStorage.removeItem('portal_token');
            window.location.href = '/';
        }
    }

    onMount(() => {
        loadData();
    });

    async function loadData() {
        isLoading = true;
        errorMsg = "";
        try {
            const token = (localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token')) || pb.authStore.token;
            
            const [appRes, invRes] = await Promise.all([
                fetch(`${apiBaseUrl}/appointments`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiBaseUrl}/invoices`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            if (!appRes.ok) throw new Error("Fehler beim Laden der Termine.");
            // Wir fangen Rechnungsfehler weich ab, falls der Endpunkt noch nicht existiert
            const invData = invRes.ok ? await invRes.json() : { invoices: [] };
            const appData = await appRes.json();
            
            appointments = appData.appointments || [];
            invoices = invData.invoices || [];
        } catch (err: any) {
            errorMsg = err.message;
        } finally {
            isLoading = false;
        }
    }

    let now = new Date();
    let upcomingAppointments = $derived(appointments.filter(a => new Date(a.appointment) >= now).sort((a, b) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime()));
    let pastAppointments = $derived(appointments.filter(a => new Date(a.appointment) < now).sort((a, b) => new Date(b.appointment).getTime() - new Date(a.appointment).getTime()));
    
    let nextAppointment = $derived(upcomingAppointments.length > 0 ? upcomingAppointments[0] : null);

    let overdueInvoices = $derived(invoices.filter(inv => {
        if (['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(inv.status)) return false;
        if (!inv.due_date) return false;
        return new Date(inv.due_date).getTime() < new Date().setHours(0,0,0,0);
    }));
    
    let userName = $state("");
    let userType = $state("client");

    onMount(() => {
        const token = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                userName = payload.name_first || "Gast";
                userType = payload.type || "client";
            } catch(e) {}
        } else if (pb.authStore.model) {
            userName = pb.authStore.model.name_first || "Team";
            userType = "admin";
        }
    });

    async function openMailingList() {
        mailingMsg = "";
        isMailingLoading = true;
        mailingListDialog?.showModal();
        try {
            const token = (localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token')) || pb.authStore.token;
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
            const token = (localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token')) || pb.authStore.token;
            const res = await fetch(`${apiBaseUrl}/mailing-list`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscribed: isSubscribed })
            });
            if (!res.ok) throw new Error("Fehler beim Speichern");
            mailingMsg = isSubscribed ? "Erfolgreich in den Verteiler eingetragen!" : "Erfolgreich ausgetragen.";
        } catch (e) {
            mailingMsg = "Fehler bei der Aktualisierung.";
            isSubscribed = !isSubscribed; // Revert Toggle
        } finally {
            isMailingLoading = false;
        }
    }
</script>

<svelte:head><title>Übersicht - Klienten-Portal</title></svelte:head>

<div class="w-full max-w-5xl mx-auto animate-enter pb-10">
    <!-- Header / Greeting -->
    <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 md:p-10 rounded-3xl border border-neutral-100 shadow-xl relative overflow-hidden">
        <div class="absolute top-0 right-0 w-80 h-80 bg-brand-50 rounded-full blur-3xl -mr-20 -mt-20 z-0 pointer-events-none transition-transform duration-1000 hover:scale-150"></div>
        
        <div class="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-20">
            {#if overdueInvoices.length > 0}
                <button onclick={() => activeTab = 'invoices'} class="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-500 text-rose-700 hover:text-white text-xs font-bold rounded-lg border border-rose-200 hover:border-rose-500 shadow-sm backdrop-blur-md transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500 outline-none" title="{overdueInvoices.length} unbezahlte Rechnung(en)">
                    <span class="text-sm leading-none">⚠️</span> <span class="hidden sm:inline">{overdueInvoices.length} unbezahlt</span>
                </button>
            {/if}
            <a href="/" class="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 hover:bg-white text-neutral-600 hover:text-brand-700 text-xs font-bold rounded-lg border border-neutral-200 shadow-sm backdrop-blur-md transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 outline-none">
                <Home class="w-3.5 h-3.5" /> <span class="hidden sm:inline">Startseite</span>
            </a>
            <button onclick={() => profileModal?.open()} class="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 hover:bg-emerald-500 text-emerald-600 hover:text-white text-xs font-bold rounded-lg border border-emerald-100 hover:border-emerald-500 shadow-sm backdrop-blur-md transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none" title="Mein Profil">
                <User class="w-3.5 h-3.5" /> <span class="hidden sm:inline">Profil</span>
            </button>
            <button onclick={openMailingList} class="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 hover:bg-indigo-500 text-indigo-600 hover:text-white text-xs font-bold rounded-lg border border-indigo-100 hover:border-indigo-500 shadow-sm backdrop-blur-md transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none" title="Info-Verteiler">
                <Mail class="w-3.5 h-3.5" /> <span class="hidden sm:inline">Info-Verteiler</span>
            </button>
            <button onclick={handleLogout} class="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 hover:bg-rose-500 text-rose-600 hover:text-white text-xs font-bold rounded-lg border border-rose-100 hover:border-rose-500 shadow-sm backdrop-blur-md transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500 outline-none">
                <LogOut class="w-3.5 h-3.5" /> <span class="hidden sm:inline">Abmelden</span>
            </button>
        </div>

        <div class="relative z-10 w-full mt-8 sm:mt-0">
            <p class="text-xs font-black text-brand-600 uppercase tracking-widest mb-1.5">Willkommen zurück</p>
            <h1 class="text-3xl md:text-5xl font-black text-neutral-900 tracking-tight mb-3">Hallo {userName}! 👋</h1>
            <p class="text-neutral-500 font-medium max-w-lg leading-relaxed text-sm md:text-base">Schön, Sie im Portal zu sehen. Hier haben Sie alle {userType === 'client' ? 'Ihre' : 'die'} Termine, Berichte und Dokumente auf einen Blick.</p>
            <!-- Elegante Tab-Navigation -->
            <div class="flex items-center gap-1.5 bg-neutral-100 p-1.5 rounded-2xl shadow-inner mt-8 w-full sm:w-max overflow-x-auto custom-scrollbar border border-neutral-200/60">
                <button onclick={() => activeTab = 'overview'} class="flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap active:scale-95 {activeTab === 'overview' ? 'bg-white text-brand-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}">Übersicht</button>
                <button onclick={() => activeTab = 'calendar'} class="flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap active:scale-95 {activeTab === 'calendar' ? 'bg-white text-brand-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}">Kalender</button>
                <button onclick={() => activeTab = 'invoices'} class="relative flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap active:scale-95 {activeTab === 'invoices' ? 'bg-white text-brand-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}">
                    Dokumente
                    {#if overdueInvoices.length > 0}
                        <span class="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
                    {/if}
                </button>
            </div>
        </div>
    </div>

    {#if errorMsg}
        <div class="bg-rose-50 text-rose-700 p-5 rounded-2xl mb-8 text-sm font-bold border border-rose-100 flex items-center gap-3 shadow-sm animate-enter">
            <span class="text-xl">⚠️</span> {errorMsg}
        </div>
    {/if}

    

    {#if isLoading}
        <div class="flex flex-col items-center justify-center py-24 animate-pulse">
            <div class="w-14 h-14 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-5"></div>
            <p class="text-neutral-500 font-medium">Lade Ihre persönliche Übersicht...</p>
        </div>
    {:else}
        {#if activeTab === 'overview'}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8" transition:fade={{ duration: 200 }}>
            
            <div class="lg:col-span-2 flex flex-col gap-6 lg:gap-8">
                <!-- Nächster Termin -->
                <div class="bg-white rounded-3xl border border-neutral-100 shadow-xl overflow-hidden flex flex-col group hover:shadow-2xl hover:border-brand-200 transition-all">
                    <div class="px-6 py-4 border-b border-neutral-50 bg-neutral-50/50 flex items-center gap-2.5">
                        <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm"></div>
                        <h2 class="text-xs font-black text-neutral-500 uppercase tracking-widest">{userType === 'client' ? 'Ihr nächster Termin' : 'Nächster Termin Ihres/r Klienten/in'}</h2>
                    </div>
                    
                    {#if nextAppointment}
                        <div class="p-6 md:p-8 flex flex-col sm:flex-row gap-6 sm:items-center">
                            <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-brand-50 text-brand-600 flex flex-col items-center justify-center shadow-inner border border-brand-100 shrink-0 group-hover:scale-105 transition-transform">
                                <span class="text-4xl sm:text-5xl font-black leading-none">{new Date(nextAppointment.appointment).getDate()}</span>
                                <span class="text-[10px] sm:text-xs font-black uppercase tracking-widest mt-1">{new Date(nextAppointment.appointment).toLocaleDateString('de-DE', { month: 'short' })}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3 class="text-xl sm:text-2xl font-black text-neutral-900 mb-3 leading-tight truncate">{nextAppointment.description || 'Betreuungstermin'}</h3>
                                <div class="space-y-2.5">
                                    <p class="text-sm font-semibold text-neutral-600 flex items-center gap-3">
                                        <Clock class="w-4 h-4 text-brand-500 shrink-0" />
                                        {new Date(nextAppointment.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                    </p>
                                    {#if nextAppointment.location_address || nextAppointment.expand?.appointment_at?.[0]}
                                        <p class="text-sm font-semibold text-neutral-600 flex items-start gap-3">
                                            <MapPin class="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                                            <span class="line-clamp-2 leading-snug">{nextAppointment.expand?.appointment_at?.[0] ? `${nextAppointment.expand.appointment_at[0].company_name || ''} ${nextAppointment.expand.appointment_at[0].name_first} ${nextAppointment.expand.appointment_at[0].name_last}` : nextAppointment.location_address}</span>
                                        </p>
                                    {/if}
                                </div>
                            </div>
                            <div class="shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                                <button onclick={() => selectedAppointment = nextAppointment} class="w-full sm:w-auto bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold px-8 min-h-14 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2.5 shadow-sm border border-brand-200 focus-visible:ring-2 focus-visible:ring-brand-500 outline-none">
                                    Details <ArrowRight class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    {:else}
                        <div class="p-12 text-center flex flex-col items-center">
                            <div class="w-16 h-16 bg-neutral-50 rounded-2xl flex items-center justify-center text-3xl mb-5 shadow-inner">🍃</div>
                            <p class="text-xl font-bold text-neutral-900 mb-2">Keine anstehenden Termine</p>
                            <p class="text-sm text-neutral-500 max-w-sm">Es sind aktuell keine zukünftigen Termine für {userType === 'client' ? 'Sie' : 'Ihre Klienten'} geplant.</p>
                            <button onclick={() => appointmentModal?.open()} class="mt-8 orga-button-primary bg-neutral-900 hover:bg-neutral-800 shadow-neutral-900/20 min-h-14 px-10">Neuen Termin anfragen</button>
                        </div>
                    {/if}
                </div>

                <!-- Quick Actions Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <button onclick={() => activeTab = 'invoices'} class="text-left bg-white p-6 md:p-8 rounded-3xl border border-neutral-100 shadow-lg hover:shadow-xl hover:-translate-y-1.5 transition-all group flex flex-col items-start gap-5 focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none w-full">
                        <div class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner border border-emerald-100 group-hover:scale-110 transition-transform"><FileText class="w-7 h-7" /></div>
                        <div>
                            <h3 class="font-black text-neutral-900 text-xl mb-1.5">{userType === 'client' ? 'Meine Rechnungen' : 'Rechnungen der Klienten'}</h3>
                            <p class="text-sm text-neutral-500 font-medium leading-relaxed">Rechnungen und Zeitnachweise sicher einsehen und herunterladen.</p>
                        </div>
                    </button>
                    <button onclick={() => appointmentModal?.open()} class="text-left bg-white p-6 md:p-8 rounded-3xl border border-neutral-100 shadow-lg hover:shadow-xl hover:-translate-y-1.5 transition-all group flex flex-col items-start gap-5 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none w-full">
                        <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner border border-blue-100 group-hover:scale-110 transition-transform"><Inbox class="w-7 h-7" /></div>
                        <div>
                            <h3 class="font-black text-neutral-900 text-xl mb-1.5">Termin anfragen</h3>
                            <p class="text-sm text-neutral-500 font-medium leading-relaxed">Buchen Sie bequem neue Einsätze oder senden Sie uns eine Nachricht.</p>
                        </div>
                    </button>
                    <button onclick={() => feedbackModal?.open()} class="text-left bg-white p-6 md:p-8 rounded-3xl border border-neutral-100 shadow-lg hover:shadow-xl hover:-translate-y-1.5 transition-all group flex flex-col items-start gap-5 focus-visible:ring-2 focus-visible:ring-amber-500 outline-none w-full">
                        <div class="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shadow-inner border border-amber-100 group-hover:scale-110 transition-transform"><Star class="w-7 h-7 fill-current" /></div>
                        <div>
                            <h3 class="font-black text-neutral-900 text-xl mb-1.5">Feedback geben</h3>
                            <p class="text-sm text-neutral-500 font-medium leading-relaxed">Ihre Meinung ist uns wichtig! Bewerten Sie unsere Leistungen.</p>
                        </div>
                    </button>
                    {#if userType === 'contact' || userType === 'admin'}
                        <button onclick={() => newClientModal?.open()} class="text-left bg-white p-6 md:p-8 rounded-3xl border border-neutral-100 shadow-lg hover:shadow-xl hover:-translate-y-1.5 transition-all group flex flex-col items-start gap-5 focus-visible:ring-2 focus-visible:ring-brand-500 outline-none w-full">
                            <div class="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-inner border border-brand-100 group-hover:scale-110 transition-transform"><UserPlus class="w-7 h-7" /></div>
                            <div>
                                <h3 class="font-black text-neutral-900 text-xl mb-1.5">Klient anmelden</h3>
                                <p class="text-sm text-neutral-500 font-medium leading-relaxed">Beantragen Sie die Neuaufnahme eines weiteren Klienten.</p>
                            </div>
                        </button>
                    {/if}
                </div>
            </div>

            <!-- Rechts: Letzte Termine (Historie) -->
            <div class="bg-white rounded-3xl border border-neutral-100 shadow-xl overflow-hidden flex flex-col h-full max-h-175">
                <div class="px-6 py-5 border-b border-neutral-50 bg-neutral-50/50 flex items-center justify-between sticky top-0 z-10 shrink-0">
                    <h2 class="text-xs font-black text-neutral-400 uppercase tracking-widest">Vergangene Termine</h2>
                    <button onclick={() => activeTab = 'calendar'} class="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 outline-none rounded px-1">Alle ansehen</button>
                </div>
                
                <div class="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-3.5">
                    {#if pastAppointments.length > 0}
                        {#each pastAppointments.slice(0, 5) as app}
                            <button type="button" onclick={() => selectedAppointment = app} class="w-full text-left bg-neutral-50 hover:bg-brand-50/60 p-5 rounded-2xl border border-neutral-100 hover:border-brand-200 transition-all flex flex-col gap-2.5 group active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 outline-none shadow-sm hover:shadow-md">
                                <div class="flex items-center justify-between w-full">
                                    <span class="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                    <div class="flex gap-1.5">
                                        {#if app.report}<span class="w-5 h-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] shadow-sm" title="Bericht vorhanden">📝</span>{/if}
                                        {#if app.settled}<span class="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] shadow-sm" title="Abgerechnet">✓</span>{/if}
                                    </div>
                                </div>
                                <p class="text-sm font-bold text-neutral-900 leading-snug line-clamp-2">{app.description || 'Termin ohne Beschreibung'}</p>
                                <div class="mt-1 flex items-center gap-1.5 text-[10px] font-black text-brand-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                    Details ansehen <ArrowRight class="w-3 h-3" />
                                </div>
                            </button>
                        {/each}
                    {:else}
                        <div class="flex flex-col items-center justify-center h-full opacity-60 py-12">
                            <span class="text-4xl mb-4">🕰️</span>
                            <p class="text-sm text-neutral-500 font-bold text-center">Noch keine Historie vorhanden.</p>
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
            onPreview={(url, title, file) => pdfPreviewModal?.open(url, title, file)} 
        />
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

<dialog bind:this={mailingListDialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-md mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === mailingListDialog) mailingListDialog?.close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" onclick={() => mailingListDialog?.close()} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <X class="w-5 h-5" />
        </button>
        
        <h2 class="text-xl font-bold text-neutral-900 mb-2 flex items-center gap-2"><span>📧</span> Info-Verteiler</h2>
        <p class="text-sm text-neutral-500 mb-6">Erhalten Sie wichtige Updates als Kopie per E-Mail.</p>

        {#if isMailingLoading}
            <div class="flex justify-center my-4"><div class="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
        {:else}
            {#if mailingMsg}
                <div class="mb-4 p-3 rounded-xl text-sm font-semibold {mailingMsg.includes('Fehler') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'} border animate-enter">
                    {mailingMsg}
                </div>
            {/if}

            <div class="flex flex-col gap-4">
                <label class="flex items-start gap-3 p-4 border border-neutral-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors bg-neutral-50/50 focus-within:ring-2 focus-within:ring-indigo-500">
                    <input type="checkbox" bind:checked={isSubscribed} onchange={updateSubscription} class="w-5 h-5 mt-0.5 text-indigo-600 rounded focus:ring-indigo-500" disabled={isMailingLoading} />
                    <div>
                        <span class="font-bold text-neutral-900 text-sm block">Im Verteiler eintragen</span>
                        <span class="text-xs text-neutral-500 mt-1 block">Ihre E-Mail-Adresse wird für automatische CC-Kopien (z.B. bei Terminerinnerungen) hinterlegt.</span>
                    </div>
                </label>
            </div>
        {/if}
    </div>
</dialog>