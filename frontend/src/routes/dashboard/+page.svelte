<script lang="ts">
	import { orgaStore } from "$lib/stores/orgaStore.svelte";
	import Calendar from "$lib/components/Calendar.svelte";
	import AppointmentModal from "$lib/components/AppointmentModal.svelte";
	import Greetings from "$lib/components/Greetings.svelte";
	import ChatWidget from "$lib/components/ChatWidget.svelte";
	import AppointmentRequestsWidget from "$lib/components/AppointmentRequestsWidget.svelte";
	import AppointmentDetailModal from "$lib/components/AppointmentDetailModal.svelte";
	import StickiesLayer from "$lib/components/StickiesLayer.svelte";
	import { pb } from "$lib/services/pocketbase";
	import BirthdayTimeline from "$lib/components/BirthdayTimeline.svelte";
	import MissingFollowUpsModal from "$lib/components/MissingFollowUpsModal.svelte";

	// svelte-ignore non_reactive_update
	let appointmentModal: ReturnType<typeof AppointmentModal>;
	// svelte-ignore non_reactive_update
	let detailModal: ReturnType<typeof AppointmentDetailModal>;
	// svelte-ignore non_reactive_update
	let followUpsModal: ReturnType<typeof MissingFollowUpsModal>;

	let isSuperAdmin = $state(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin');

	// 1. Heutige Termine herausfiltern
	let todaysAppointments = $derived.by(() => {
		const today = new Date();
		return (orgaStore.appointments?.data || []).filter((app: any) => {
			if (!app.appointment) return false;
			const d = new Date(app.appointment);
			const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
			return isToday && (isSuperAdmin || app.user === pb.authStore.model?.id);
		}).sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
	});

	// 2. Offene Rechnungen & Summe berechnen
	let openInvoices = $derived((orgaStore.invoices?.data || []).filter((inv: any) => {
		const isMyInvoice = isSuperAdmin || inv.user === pb.authStore.model?.id || (Array.isArray(inv.user) && inv.user.includes(pb.authStore.model?.id));
		return isMyInvoice && inv.status !== 'Abgeschlossen' && inv.status !== 'Storniert' && inv.status !== 'Abgelehnt';
	}));
	let openInvoicesSum = $derived(openInvoices.reduce((sum: number, inv: any) => sum + (inv.brutto || 0), 0));

	// 3. Aktive Klienten zählen (Alle sichtbaren aktiven Klienten)
	let activeClientsCount = $derived.by(() => {
		return (orgaStore.clients?.data || []).filter((c: any) => {
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
			if (!isSuperAdmin && app.user !== myUserId) return; // Nur eigene Termine auswerten, es sei denn man ist Admin

			const d = new Date(app.appointment);

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
			if ((!isSuperAdmin && app.user !== myUserId) || app.settled) return false;
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
                <button onclick={() => window.dispatchEvent(new CustomEvent('add-sticky'))} class="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5">
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

        <!-- KPI Statistiken (QOL Update) -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 w-full animate-enter delay-50 auto-rows-fr">
            <a href="/clients" class="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-3 hover:border-indigo-300 transition-colors group">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg sm:text-xl shadow-inner group-hover:scale-110 transition-transform shrink-0">👥</div>
                <div class="min-w-0"><p class="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-wider truncate">{isSuperAdmin ? 'Aktive Klienten' : 'Meine Klienten'}</p><p class="text-lg sm:text-2xl font-black text-neutral-900 leading-none mt-0.5">{activeClientsCount}</p></div>
            </a>
            <a href="/invoices" class="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-3 hover:border-rose-300 transition-colors group">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-lg sm:text-xl shadow-inner group-hover:scale-110 transition-transform shrink-0">💶</div>
                <div class="min-w-0"><p class="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-wider truncate">{isSuperAdmin ? 'Offene Rechnungen' : 'Meine Rechnungen'}</p><p class="text-lg sm:text-2xl font-black text-neutral-900 leading-none mt-0.5">{openInvoices.length}</p></div>
            </a>
            <a href="/invoices" class="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-3 hover:border-emerald-300 transition-colors group">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg sm:text-xl shadow-inner group-hover:scale-110 transition-transform shrink-0">💰</div>
                <div class="min-w-0"><p class="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-wider truncate">Offener Betrag</p><p class="text-lg sm:text-2xl font-black text-emerald-700 leading-none mt-0.5">{openInvoicesSum.toFixed(2).replace('.', ',')} €</p></div>
            </a>
            <button type="button" onclick={() => followUpsModal?.open()} class="text-left bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-3 hover:border-orange-300 transition-colors group active:scale-[0.98]">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-lg sm:text-xl shadow-inner group-hover:scale-110 transition-transform shrink-0">⚠️</div>
                <div class="min-w-0"><p class="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-wider truncate">Nachbereitungen</p><p class="text-lg sm:text-2xl font-black {missingFollowUpsCount > 0 ? 'text-orange-600' : 'text-neutral-900'} leading-none mt-0.5">{missingFollowUpsCount}</p></div>
            </button>
            <div class="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-3 transition-colors group">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg sm:text-xl shadow-inner shrink-0">⏱️</div>
                <div class="min-w-0"><p class="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-wider truncate">{isSuperAdmin ? 'Team-Stunden (Monat)' : 'Stunden (Monat)'}</p><p class="text-lg sm:text-2xl font-black text-neutral-900 leading-none mt-0.5">{monthlyStats.hours.toFixed(1).replace('.', ',')} h</p></div>
            </div>
            <div class="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-3 transition-colors group">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-lg sm:text-xl shadow-inner shrink-0">🚗</div>
                <div class="min-w-0"><p class="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-wider truncate">{isSuperAdmin ? 'Team-KM (Monat)' : 'Gefahrene KM'}</p><p class="text-lg sm:text-2xl font-black text-neutral-900 leading-none mt-0.5">{monthlyStats.kms.toFixed(0)} km</p></div>
            </div>
        </div>

        <!-- Oberes Grid: Termine & Kalender -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <!-- Termine -->
            <div class="orga-card-white p-6 animate-enter delay-100 flex flex-col lg:col-span-1 h-full">
                <h2 class="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2"><span>📅</span> {isSuperAdmin ? 'Heutige Termine' : 'Meine heutigen Termine'}</h2>
                {#if todaysAppointments.length === 0}
                    <div class="flex flex-col items-center justify-center py-10 text-center h-full opacity-90">
                        <span class="text-5xl mb-4">🍃</span>
                        <p class="text-neutral-900 font-bold text-lg mb-2">Heute ist es wunderbar ruhig!</p>
                        <p class="text-neutral-500 text-sm mb-6 max-w-xs leading-relaxed">Es stehen keine Termine an. Perfekte Gelegenheit, um Akten zu pflegen oder etwas Papierkram aufzuholen.</p>
                        
                        <div class="grid grid-cols-2 gap-3 w-full max-w-sm">
                            <button onclick={() => handleNewAppointment()} class="orga-button-primary shadow-indigo-600/20 py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 w-full">
                                <span class="text-sm">📅</span> Neuer Termin
                            </button>
                            <a href="/clients" class="orga-button-ghost bg-neutral-100 hover:bg-neutral-200 py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 w-full text-neutral-700">
                                <span class="text-sm">📂</span> Klienten-Akten
                            </a>
                            <a href="/invoices" class="orga-button-ghost bg-neutral-100 hover:bg-neutral-200 py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 w-full text-neutral-700">
                                <span class="text-sm">💶</span> Abrechnungen
                            </a>
                            <a href="/mail" class="orga-button-ghost bg-neutral-100 hover:bg-neutral-200 py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 w-full text-neutral-700">
                                <span class="text-sm">✉️</span> Posteingang
                            </a>
                        </div>
                    </div>
                {:else}
                    <div class="space-y-3 mt-2 flex-1 max-h-100 overflow-y-auto custom-scrollbar pr-2">
                        {#each todaysAppointments as app}
                            {#if app.description?.includes('[BLOCK]')}
                                <button type="button" onclick={() => detailModal?.open(app.id)} class="w-full text-left block p-3 rounded-xl border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 transition-all shadow-sm hover:shadow-md">
                                    <div class="flex justify-between items-start mb-1">
                                        <span class="text-xs font-bold text-neutral-600">Ganztägig blockiert</span>
                                    </div>
                                    <p class="text-sm font-semibold text-neutral-900 truncate">🚫 {app.description.replace('[BLOCK]', '').trim() || 'Urlaub / Abwesend'}</p>
                                </button>
                            {:else}
                                {@const isPast = app.appointment ? new Date(app.appointment).getTime() < new Date().getTime() : false}
                                {@const isMissingReport = isPast && !app.report && !app.notes && !app.internal_notes}
                                {@const isMissingTime = isPast && (!app.expand?.time_record || app.expand.time_record.length === 0)}
                                {@const isMissingTasks = isPast && (!app.expand?.tasks || app.expand.tasks.length === 0)}
                                <button type="button" onclick={() => detailModal?.open(app.id)} class="w-full text-left block p-3 rounded-xl border border-neutral-100 hover:border-indigo-300 bg-neutral-50 hover:bg-white transition-all group shadow-sm hover:shadow-md {app.settled ? 'opacity-60 grayscale hover:grayscale-0' : ''}">
                                    <div class="flex justify-between items-start mb-1 gap-2">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="text-xs font-bold shrink-0 {app.is_private ? 'text-rose-600' : 'text-indigo-600'}">{new Date(app.appointment as string).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                                            {#if !app.settled && isPast}
                                                {#if isMissingTime}
                                                    <span class="text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md animate-pulse whitespace-nowrap" title="Es wurde noch keine Zeit für diesen Termin erfasst.">⚠️ Zeit fehlt</span>
                                                {/if}
                                                {#if isMissingTasks}
                                                    <span class="text-[9px] font-bold bg-orange-100 text-orange-800 border border-orange-200 px-1.5 py-0.5 rounded-md animate-pulse whitespace-nowrap" title="Es wurden keine abrechenbaren Leistungen (Tasks) zugewiesen.">⚠️ Leistung fehlt</span>
                                                {/if}
                                                {#if isMissingReport}
                                                    <span class="text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded-md animate-pulse whitespace-nowrap" title="Es wurde noch kein Besuchsbericht oder eine interne Notiz hinterlegt.">⚠️ Bericht fehlt</span>
                                                {/if}
                                            {/if}
                                        </div>
                                        <div class="flex items-center gap-1.5 min-w-0 justify-end text-right">
                                            {#if app.settled}
                                                <span class="text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-md whitespace-nowrap">✓ Abgerechnet</span>
                                            {/if}
                                        </div>
                                            {#if app.expand?.client?.[0]}
                                                <span class="inline-block text-[10px] font-bold text-neutral-600 bg-neutral-200 px-1.5 py-0.5 rounded truncate max-w-32.5 sm:max-w-32" title="{app.expand.client[0].name_first} {app.expand.client[0].name_last}">{app.expand.client[0].name_first} {app.expand.client[0].name_last}</span>
                                            {/if}
                                    </div>
                                    <p class="text-sm font-semibold text-neutral-900 truncate">{app.description || 'Termin ohne Beschreibung'}</p>
                                    
                                    {#if true}
                                        {@const locationContact = app.expand?.appointment_at?.[0]}
                                        {@const locationText = locationContact ? `${locationContact.company_name || ''} ${locationContact.name_first || ''} ${locationContact.name_last || ''}`.trim() : app.location_address}
                                        {#if locationText}
                                        <div class="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg w-fit max-w-full shadow-sm" title="Standort / Adresse">
                                            <span class="shrink-0 text-[11px]">📍</span>
                                            <span class="truncate">{locationText}</span>
                                        </div>
                                        {/if}
                                    {/if}

                                    {#if app.expand?.client?.[0]?.notes || app.notes || app.internal_notes}
                                        <div class="flex flex-col gap-1.5 mt-2.5">
                                            {#if app.expand?.client?.[0]?.notes}
                                                <div class="text-[10px] font-medium text-sky-800 bg-sky-50 border border-sky-100 px-2.5 py-1.5 rounded-lg line-clamp-2 leading-snug" title={app.expand.client[0].notes}>💬 {app.expand.client[0].notes}</div>
                                            {/if}
                                            {#if app.notes || app.internal_notes}
                                                <div class="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-lg line-clamp-2 leading-snug" title={app.notes || app.internal_notes}>🔒 {app.notes || app.internal_notes}</div>
                                            {/if}
                                        </div>
                                    {/if}
                                </button>
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
                <div class="p-0 sm:p-6 bg-white flex-1 min-h-100">
                    <Calendar 
                        appointments={orgaStore.appointments?.data || []} 
                        clients={orgaStore.clients?.data || []} 
                        onNewAppointment={handleNewAppointment}
                        isWidget={true}
                    />
                </div>
            </div>
        </div>

        <!-- Unteres Grid: Terminanfragen & Chat -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="animate-enter delay-300 h-full">
                <AppointmentRequestsWidget />
            </div>
            <div class="animate-enter delay-400 h-full">
                <ChatWidget />
            </div>
        </div>

    </div>
</div>

<AppointmentModal bind:this={appointmentModal} />
<AppointmentDetailModal bind:this={detailModal} />
<MissingFollowUpsModal bind:this={followUpsModal} {missingFollowUps} onOpenDetail={(id) => detailModal?.open(id)} />