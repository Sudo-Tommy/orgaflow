<script lang="ts">
	import { orgaStore } from "$lib/stores/orgaStore.svelte";
	import Calendar from "$lib/components/Calendar.svelte";
	import AppointmentModal from "$lib/components/AppointmentModal.svelte";
	import Greetings from "$lib/components/Greetings.svelte";
	import ChatWidget from "$lib/components/ChatWidget.svelte";
	import AppointmentRequestsModal from "$lib/components/AppointmentRequestsModal.svelte";
	import AppointmentDetailModal from "$lib/components/AppointmentDetailModal.svelte";
	import StickiesLayer from "$lib/components/StickiesLayer.svelte";
	import { pb } from "$lib/services/pocketbase";
	import BirthdayTimeline from "$lib/components/BirthdayTimeline.svelte";
	import MissingFollowUpsModal from "$lib/components/MissingFollowUpsModal.svelte";
	import UnsettledAppointmentsModal from "$lib/components/UnsettledAppointmentsModal.svelte";
	import FollowUpAppointmentModal from "$lib/components/FollowUpAppointmentModal.svelte";
	import QuickAccessMailModal from "$lib/components/portal/QuickAccessMailModal.svelte";
	import QuickAccessGrid from "$lib/components/dashboard/QuickAccessGrid.svelte";
	import QuickLetterModal from "$lib/components/dashboard/QuickLetterModal.svelte";
	import ShareQrModal from "$lib/components/dashboard/ShareQrModal.svelte";
	import { rbacService } from "$lib/services/rbacService.svelte";
	import { useRequestAdmin } from "$lib/services/requestAdminService.svelte";
	import { onMount, onDestroy } from "svelte";
	import { toastStore } from "$lib/services/toastService.svelte";

	// svelte-ignore non_reactive_update
	let appointmentModal: ReturnType<typeof AppointmentModal>;
	// svelte-ignore non_reactive_update
	let detailModal: ReturnType<typeof AppointmentDetailModal>;
	// svelte-ignore non_reactive_update
	let followUpsModal: ReturnType<typeof MissingFollowUpsModal>;
	// svelte-ignore non_reactive_update
	let unsettledModal: ReturnType<typeof UnsettledAppointmentsModal>;
	let followUpModal = $state() as any;
	let quickMailModal = $state() as any;
	let quickLetterModal = $state() as any;
	let shareQrModal = $state() as any;
	let requestsModal = $state() as any;

	const reqAdmin = useRequestAdmin();

	let isSuperAdmin = $derived(rbacService.isOwner);
	let isAdmin = $derived(rbacService.isOwner || rbacService.isFacilityAdmin);
	let isCaregiver = $derived(rbacService.isCaregiver);
	let unhandledInquiriesCount = $derived(
		reqAdmin.requests.filter(r => r.status !== 'accepted' && r.status !== 'denied').length
	);
	let appointmentViewTab = $state<'today' | 'upcoming'>('today');

	function handleOpenInquiries() {
		requestsModal?.open();
	}

	onDestroy(() => {
		reqAdmin.cleanup();
	});

	// --- Admin-Filter: Wessen heutige Termine werden angezeigt? ---
	// Standard: immer nur eigene Termine (auch für Admins)
	let dashboardUserFilter = $state<'mine' | 'all' | string>('mine');
	let dashboardUsers = $state<any[]>([]);

	onMount(async () => {
		reqAdmin.init();

		// Für Admins: alle Mitarbeiter laden für den Nutzer-Filter
		if (isAdmin) {
			try {
				const users = await pb.collection('users').getFullList({ sort: 'name_first', requestKey: null });
				const myCompanyId = pb.authStore.model?.company;
				if (isSuperAdmin) {
					dashboardUsers = users;
				} else if (myCompanyId) {
					// Admins sehen nur ihre Firmen-Mitarbeiter
					dashboardUsers = users.filter((u: any) => {
						const uc = Array.isArray(u.company) ? u.company : [u.company];
						return uc.includes(myCompanyId);
					});
				}
			} catch {}
		}
	});

	// 1. Heutige Termine herausfiltern — reaktiv auf dashboardUserFilter
	let todaysAppointments = $derived.by(() => {
		const today = new Date();
		const myUserId = pb.authStore.model?.id;
		return (orgaStore.appointments?.data || []).filter((app: any) => {
			if (!app.appointment) return false;
			const d = new Date(app.appointment);
			const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
			if (!isToday) return false;

			// Filterlogik:
			if (!isAdmin) {
				// Normale Mitarbeiter: immer nur eigene Termine
				return app.user === myUserId || (Array.isArray(app.user) && app.user.includes(myUserId));
			}
			// Admins: abhängig vom gesetzten Filter
			if (dashboardUserFilter === 'mine') {
				return app.user === myUserId || (Array.isArray(app.user) && app.user.includes(myUserId));
			}
			if (dashboardUserFilter === 'all') return true;
			// Spezifischer Nutzer
			return app.user === dashboardUserFilter || (Array.isArray(app.user) && app.user.includes(dashboardUserFilter));
		}).sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
	});

	// 1b. Anstehende Termine der nächsten 7 Tage herausfiltern
	let upcoming7DaysAppointments = $derived.by(() => {
		const today = new Date();
		today.setHours(23, 59, 59, 999);
		const in7Days = new Date();
		in7Days.setDate(in7Days.getDate() + 7);
		in7Days.setHours(23, 59, 59, 999);

		const myUserId = pb.authStore.model?.id;

		return (orgaStore.appointments?.data || []).filter((app: any) => {
			if (!app.appointment) return false;
			const d = new Date(app.appointment);
			const isUpcoming = d.getTime() > today.getTime() && d.getTime() <= in7Days.getTime();
			const isMy = isSuperAdmin || app.user === myUserId || (Array.isArray(app.user) && app.user.includes(myUserId));
			return isUpcoming && isMy;
		}).sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
	});

	let currentList = $derived(appointmentViewTab === 'today' ? todaysAppointments : upcoming7DaysAppointments);

	// 2. Offene Rechnungen & Summe berechnen
	let openInvoices = $derived((orgaStore.invoices?.data || []).filter((inv: any) => {
		if (!rbacService.canAccessFinances) return false;
		if (!rbacService.isRecordInScope(inv)) return false;
		const isMyInvoice = isSuperAdmin || inv.user === pb.authStore.model?.id || (Array.isArray(inv.user) && inv.user.includes(pb.authStore.model?.id));
		return isMyInvoice && inv.status !== 'Abgeschlossen' && inv.status !== 'Storniert' && inv.status !== 'Abgelehnt';
	}));
	let openInvoicesSum = $derived(openInvoices.reduce((sum: number, inv: any) => sum + (inv.brutto || 0), 0));

	// 3. Aktive Klienten zählen (Alle im Scope sichtbaren aktiven Klienten)
	let activeClientsCount = $derived.by(() => {
		return (orgaStore.clients?.data || []).filter((c: any) => {
			if (!rbacService.isRecordInScope(c)) return false;
			return (c.status || '').toLowerCase() === 'aktiv';
		}).length;
	});

	// 4. QOL Update: Erweiterte Statistiken für Stunden und Fahrten
	let monthlyStats = $derived.by(() => {
		let hours = 0;
		let kms = 0;

		const today = new Date();

		const currentMonth = today.getMonth();
		const currentYear = today.getFullYear();
		const myUserId = pb.authStore.model?.id;

		(orgaStore.appointments?.data || []).forEach((app: any) => {
			if (!app.appointment) return;
			if (!rbacService.isRecordInScope(app)) return;
			if (!isAdmin && app.user !== myUserId) return; // Nur eigene Termine auswerten, es sei denn man ist Admin

			const d = new Date(app.appointment);

			// Zukünftige Termine exkludieren, damit nur bereits abgeleistete Stunden/KM zählen
			if (d.getTime() > today.getTime()) return;

			if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
				if (app.expand?.time_record) {
					app.expand.time_record.forEach((tr: any) => {
						if (tr.start && tr.end) {
							const diffMs = new Date(tr.end).getTime() - new Date(tr.start).getTime();
							if (diffMs > 0) hours += diffMs / 3600000;
						}
					});
				}
				if (app.expand?.drive_record) {
					app.expand.drive_record.forEach((dr: any) => { kms += (dr.km || 0); });
				}
			}
		});

		return { hours, kms };
	});

	// 5. Zu erledigende Nachbereitungen (Vergangene Termine ohne Zeiten/Bericht/Leistung)
	let missingFollowUps = $derived.by(() => {
		const now = new Date().getTime();
		const myUserId = pb.authStore.model?.id;
		return (orgaStore.appointments?.data || []).filter((app: any) => {
			if (!rbacService.isRecordInScope(app)) return false;
			if ((!isAdmin && app.user !== myUserId) || app.settled) return false;
			if (app.description?.includes('[BLOCK]')) return false;
			if (app.is_private) return false; // Private Termine ignorieren
			if (!app.appointment) return false;

			const isPast = new Date(app.appointment).getTime() < now;
			if (!isPast) return false;

			// Laufende Termine (gestartete, aber noch nicht beendete Zeiterfassung) ignorieren
			if (app.expand?.time_record && app.expand.time_record.some((tr: any) => tr.start && !tr.end)) return false;

			const isMissingReport = !app.report && !app.notes && !app.internal_notes;
			const isMissingTime = !app.expand?.time_record || app.expand.time_record.length === 0;
			const isMissingTasks = !app.expand?.tasks || app.expand.tasks.length === 0;

			return isMissingReport || isMissingTime || isMissingTasks;
		}).sort((a: any, b: any) => new Date(b.appointment).getTime() - new Date(a.appointment).getTime());
	});

	let missingFollowUpsCount = $derived(missingFollowUps.length);

	// 6. Termine ohne Rechnung (Vergangene Termine, die noch nicht abgerechnet sind)
	let unsettledAppointments = $derived.by(() => {
		const now = new Date().getTime();
		const myUserId = pb.authStore.model?.id;
		return (orgaStore.appointments?.data || []).filter((app: any) => {
			if (!rbacService.isRecordInScope(app)) return false;
			if ((!isAdmin && app.user !== myUserId) || app.settled) return false;
			if (app.description?.includes('[BLOCK]')) return false;
			if (app.is_private) return false; // Private Termine ignorieren
			if (!app.appointment) return false;

			return new Date(app.appointment).getTime() < now;
		}).sort((a: any, b: any) => new Date(b.appointment).getTime() - new Date(a.appointment).getTime());
	});
	let unsettledAppointmentsCount = $derived(unsettledAppointments.length);

	function handleNewAppointment(date?: Date) {
		appointmentModal?.open(date);
	}
</script>

<div class="orga-layout-wrapper">
    <div class="orga-layout-content">
        <StickiesLayer />
        
        <!-- Dashboard Header -->
        <header class="orga-dashboard-header animate-enter flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <h1 class="orga-dashboard-title">Dashboard</h1>
                <button onclick={() => window.dispatchEvent(new CustomEvent('add-sticky'))} class="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 min-h-[44px]">
                    <span class="text-sm">📌</span> Notizzettel
                </button>
            </div>
        </header>
        
        <!-- Dashboard Begrüßung -->
        <div class="mb-10 w-full animate-enter">
            <Greetings />
        </div>

        <!-- Geburtstag-Zeitstrahl -->
        <div class="mb-8 w-full animate-enter delay-75">
            <BirthdayTimeline />
        </div>        

        <!-- Modernisierter Quick-Access Grid (Rollen-basiert) mit integrierten Status- & Kennzahl-Aktionen -->
        <QuickAccessGrid 
            unhandledInquiriesCount={unhandledInquiriesCount}
            activeClientsCount={activeClientsCount}
            openInvoicesCount={openInvoices.length}
            openInvoicesSum={openInvoicesSum}
            missingFollowUpsCount={missingFollowUpsCount}
            unsettledAppointmentsCount={unsettledAppointmentsCount}
            monthlyKms={monthlyStats.kms}
            onOpenFollowUp={() => {
                const myApp = todaysAppointments.find((a: any) => a.user === pb.authStore.model?.id || (Array.isArray(a.user) && a.user.includes(pb.authStore.model?.id))) ||
                              (orgaStore.appointments?.data || []).find((a: any) => a.user === pb.authStore.model?.id || (Array.isArray(a.user) && a.user.includes(pb.authStore.model?.id)));
                if (myApp) {
                    followUpModal?.open(myApp);
                } else {
                    toastStore.info("Kein eigener Termin als Vorlage gefunden.");
                }
            }}
            onOpenShareQr={() => shareQrModal?.open()}
            onOpenLetter={() => quickLetterModal?.open()}
            onOpenInquiries={handleOpenInquiries}
            onOpenFollowUps={() => followUpsModal?.open()}
            onOpenUnsettled={() => unsettledModal?.open()}
        />

        <!-- Oberes Grid: Termine & Kalender -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <!-- Termine Widget (Heute & Nächste 7 Tage) -->
            <div class="orga-card-white p-5 sm:p-6 animate-enter delay-100 flex flex-col lg:col-span-1 h-full">
                <!-- Tab Header -->
                <div class="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-neutral-100">
                    <div class="flex bg-neutral-100 p-1 rounded-xl">
                        <button 
                            type="button" 
                            onclick={() => appointmentViewTab = 'today'}
                            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all {appointmentViewTab === 'today' ? 'bg-white text-indigo-700 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}"
                        >
                            📅 Heute ({todaysAppointments.length})
                        </button>
                        <button 
                            type="button" 
                            onclick={() => appointmentViewTab = 'upcoming'}
                            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all {appointmentViewTab === 'upcoming' ? 'bg-white text-indigo-700 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}"
                        >
                            🗓️ Nächste 7 Tage ({upcoming7DaysAppointments.length})
                        </button>
                    </div>
                    <button 
                        onclick={() => handleNewAppointment()} 
                        class="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                        title="Neuen Termin erstellen"
                    >
                        + Neu
                    </button>
                </div>

                <!-- Admin-Filter: Wessen Termine? (nur für Admins sichtbar) -->
                {#if isAdmin && appointmentViewTab === 'today'}
                    <div class="mb-3 flex items-center gap-2 flex-wrap">
                        <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">Anzeigen:</span>
                        <div class="flex items-center gap-1 flex-wrap">
                            <button
                                type="button"
                                onclick={() => dashboardUserFilter = 'mine'}
                                class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border {dashboardUserFilter === 'mine' ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'}"
                            >
                                👤 Meine
                            </button>
                            <button
                                type="button"
                                onclick={() => dashboardUserFilter = 'all'}
                                class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border {dashboardUserFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'}"
                            >
                                👥 Alle
                            </button>
                            {#each dashboardUsers.filter(u => u.id !== pb.authStore.model?.id) as u}
                                <button
                                    type="button"
                                    onclick={() => dashboardUserFilter = u.id}
                                    class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border {dashboardUserFilter === u.id ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'}"
                                    title="{u.name_first} {u.name_last}"
                                >
                                    {u.name_first?.charAt(0)}{u.name_last?.charAt(0) ?? ''}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if currentList.length === 0}
                    <div class="flex flex-col items-center justify-center py-10 text-center h-full opacity-90">
                        <span class="text-5xl mb-4">🍃</span>
                        <p class="text-neutral-900 font-bold text-base mb-1">
                            {appointmentViewTab === 'today' ? 'Heute ist es wunderbar ruhig!' : 'Keine Termine in den nächsten 7 Tagen.'}
                        </p>
                        <p class="text-neutral-500 text-xs mb-6 max-w-xs leading-relaxed">
                            {appointmentViewTab === 'today' ? 'Es stehen keine Termine an. Nutzen Sie die Zeit für Klienten-Akten oder Vorbereitung.' : 'Planen Sie rechtzeitig Folgetermine für Ihre Klienten.'}
                        </p>
                        
                        <div class="grid grid-cols-2 gap-2 w-full max-w-sm">
                            <button onclick={() => handleNewAppointment()} class="orga-button-primary py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 w-full">
                                <span>📅</span> Termin planen
                            </button>
                            <a href="/clients" class="orga-button-ghost bg-neutral-100 hover:bg-neutral-200 py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 w-full text-neutral-700">
                                <span>📂</span> Klienten
                            </a>
                        </div>
                    </div>
                {:else}
                    <div class="space-y-3 mt-1 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[520px]">
                        {#each currentList as app}
                            {#if app.description?.includes('[BLOCK]')}
                                <div class="p-3 rounded-2xl border border-neutral-200 bg-neutral-100 shadow-sm">
                                    <span class="text-xs font-bold text-neutral-600">🚫 Ganztägig blockiert</span>
                                    <p class="text-sm font-semibold text-neutral-900 truncate mt-0.5">{app.description.replace('[BLOCK]', '').trim() || 'Urlaub / Abwesend'}</p>
                                </div>
                            {:else}
                                {@const isPast = app.appointment ? new Date(app.appointment).getTime() < new Date().getTime() : false}
                                {@const isMissingReport = isPast && !app.report && !app.notes && !app.internal_notes}
                                {@const isMissingTime = isPast && (!app.expand?.time_record || app.expand.time_record.length === 0)}
                                {@const locationContact = app.expand?.appointment_at?.[0]}
                                {@const locationText = locationContact ? `${locationContact.company_name || ''} ${locationContact.name_first || ''} ${locationContact.name_last || ''}`.trim() : app.location_address}
                                {@const clientData = app.expand?.client?.[0]}

                                <div 
                                    role="button"
                                    tabindex="0"
                                    onclick={() => detailModal?.open(app.id)}
                                    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); detailModal?.open(app.id); } }}
                                    class="p-3.5 rounded-2xl border border-neutral-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/30 transition-all shadow-sm hover:shadow-md space-y-2.5 cursor-pointer text-left w-full group focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    title="Klicken, um Termindetails zu öffnen"
                                >
                                    <div class="flex items-start justify-between gap-2">
                                        <div>
                                            <div class="flex items-center gap-1.5">
                                                <span class="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                                    {#if appointmentViewTab === 'upcoming' && app.appointment}
                                                        {new Date(app.appointment).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} · 
                                                    {/if}
                                                    {app.appointment ? new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '--:--'} Uhr
                                                </span>
                                                {#if app.settled}
                                                    <span class="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">✓ Abgerechnet</span>
                                                {:else if isPast && (isMissingReport || isMissingTime)}
                                                    <span class="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded animate-pulse">⚠️ Offen</span>
                                                {/if}
                                            </div>
                                            {#if clientData}
                                                <p class="text-sm font-bold text-neutral-900 mt-1">
                                                    {clientData.name_first} {clientData.name_last}
                                                </p>
                                            {/if}
                                        </div>
                                    </div>

                                    <p class="text-xs text-neutral-600 line-clamp-1">{app.description || 'Regulärer Termin'}</p>

                                    {#if locationText}
                                        <div class="flex items-center gap-1 text-[11px] text-neutral-500 truncate">
                                            <span>📍</span> <span class="truncate">{locationText}</span>
                                        </div>
                                    {/if}

                                    <!-- Quick Action Toolbar pro Termin -->
                                    <div class="flex items-center gap-2 pt-2 border-t border-neutral-100">
                                        {#if app.user === pb.authStore.model?.id || (Array.isArray(app.user) && app.user.includes(pb.authStore.model?.id)) || pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin'}
                                            <button 
                                                type="button" 
                                                onclick={(e) => { e.stopPropagation(); followUpModal?.open(app); }}
                                                class="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 active:scale-95 min-h-[44px]"
                                                title="Folgetermin vereinbaren"
                                            >
                                                <span>⚡</span> <span>Folgetermin</span>
                                            </button>
                                        {/if}

                                        <button 
                                            type="button" 
                                            onclick={(e) => { e.stopPropagation(); detailModal?.open(app.id); }}
                                            class="py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 active:scale-95 min-h-[44px]"
                                            title="Details & Bericht öffnen"
                                        >
                                            <span>🔍</span> <span>Details</span>
                                        </button>

                                        {#if locationText}
                                            <a 
                                                href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(locationText)}" 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                onclick={(e) => e.stopPropagation()}
                                                class="py-1.5 px-2 bg-neutral-100 hover:bg-blue-50 text-neutral-600 hover:text-blue-700 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
                                                title="Route in Google Maps öffnen"
                                            >
                                                <span>🗺️</span>
                                            </a>
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Eingebetteter Kalender -->
            <div class="orga-card-white overflow-hidden animate-enter delay-200 flex flex-col lg:col-span-2">
                <div class="p-4 sm:p-6 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
                    <h2 class="text-lg font-bold text-neutral-900 flex items-center gap-2"><span>🗓️</span> Kalenderübersicht</h2>
                </div>
                <div class="p-0 sm:p-6 bg-white flex-1">
                    <Calendar 
                        appointments={orgaStore.appointments?.data || []} 
                        clients={orgaStore.clients?.data || []} 
                        onNewAppointment={handleNewAppointment}
                        isWidget={true}
                    />
                </div>
            </div>
        </div>

        <!-- Chat Widget -->
        <div class="animate-enter delay-400 h-full">
            <ChatWidget />
        </div>

    </div>
</div>

<AppointmentModal bind:this={appointmentModal} />
<AppointmentDetailModal bind:this={detailModal} />
<MissingFollowUpsModal bind:this={followUpsModal} {missingFollowUps} onOpenDetail={(id) => detailModal?.open(id)} />
<UnsettledAppointmentsModal bind:this={unsettledModal} {unsettledAppointments} onOpenDetail={(id) => detailModal?.open(id)} />
<FollowUpAppointmentModal bind:this={followUpModal} />
<QuickAccessMailModal bind:this={quickMailModal} />
<QuickLetterModal bind:this={quickLetterModal} />
<ShareQrModal bind:this={shareQrModal} />
<AppointmentRequestsModal bind:this={requestsModal} />