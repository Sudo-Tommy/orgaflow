<script lang="ts">
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";

    let appointments = $state<any[]>([]);
    let clients = $state<any[]>([]);
    let isLoading = $state(true);
    let errorMsg = $state("");
    let selectedClientId = $state("");

    let visibleAppointments = $derived.by(() => {
        if (!isAdminMode || !selectedClientId) return appointments;
        return appointments.filter(app => {
            if (!app.client) return false;
            if (Array.isArray(app.client)) return app.client.includes(selectedClientId);
            return app.client === selectedClientId;
        });
    });

    let isAdminMode = $state(false);

    const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';

    onMount(() => {
        if (typeof localStorage !== 'undefined') {
            isAdminMode = localStorage.getItem('portal_admin_mode') === 'true';
        }
        if (isAdminMode) {
            loadClients();
        }
        loadAppointments();
    });

    async function loadClients() {
        try {
            const token = localStorage.getItem('portal_token') || pb.authStore.token;
            const res = await fetch(`${apiBaseUrl}/clients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                clients = data.clients;
            }
        } catch (err) {
            console.error("Konnte Klienten nicht laden", err);
        }
    }

    async function loadAppointments() {
        isLoading = true;
        errorMsg = "";
        try {
            const token = localStorage.getItem('portal_token') || pb.authStore.token;
            let url = `${apiBaseUrl}/appointments`;
            
            
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Fehler beim Laden der Termine.");
            
            appointments = data.appointments || [];
        } catch (err: any) {
            errorMsg = err.message;
        } finally {
            isLoading = false;
        }
    }

    function getDuration(startStr: string, endStr: string) {
        if (!startStr || !endStr) return "-";
        const diffMs = new Date(endStr).getTime() - new Date(startStr).getTime();
        if (diffMs < 0) return "Fehler";
        const diffMins = Math.round(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        if (hours === 0) return `${mins} min`;
        return `${hours}h ${mins}m`;
    }
</script>

<svelte:head><title>Meine Termine - Klienten-Portal</title></svelte:head>

<div class="w-full max-w-4xl mx-auto animate-enter">
    <div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h1 class="text-2xl md:text-3xl font-black text-brand-950 tracking-tight mb-2">Ihre Termine</h1>
            <p class="text-neutral-500 font-medium">Hier sehen Sie alle geplanten und kürzlich vergangenen Einsätze im Detail.</p>
        </div>
        
        <!-- Admin Filter Control -->
        {#if isAdminMode}
            <div class="bg-indigo-50/50 border border-indigo-200 p-3 rounded-xl flex items-center gap-3 shadow-sm shrink-0 w-full md:w-auto">
                <span class="text-xl hidden sm:block">🛡️</span>
                <div class="w-full md:w-auto">
                    <label for="client-filter" class="block text-xs font-bold text-indigo-900 mb-1">Ansicht filtern (God Mode)</label>
                    <select id="client-filter" bind:value={selectedClientId} class="text-sm font-semibold text-indigo-800 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 outline-none cursor-pointer w-full">
                        <option value="">Alle Termine anzeigen</option>
                        {#each clients as c}
                            <option value={c.id}>{c.name_first} {c.name_last}</option>
                        {/each}
                    </select>
                </div>
            </div>
        {/if}
    </div>

    {#if errorMsg}
        <div class="bg-rose-50 text-rose-700 p-4 rounded-xl mb-6 text-sm font-bold border border-rose-100 flex items-center gap-2">
            <span class="text-lg">⚠️</span> {errorMsg}
        </div>
    {/if}

    {#if isLoading}
        <div class="flex justify-center py-20"><div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
    {:else if visibleAppointments.length === 0}
        <div class="bg-white p-12 rounded-3xl border border-neutral-200 shadow-sm text-center">
            <span class="text-4xl mb-4 block opacity-50">📅</span>
            <h3 class="text-lg font-bold text-neutral-900 mb-2">Keine Termine gefunden</h3>
            <p class="text-neutral-500">Aktuell liegen keine zukünftigen oder kürzlich vergangenen Termine vor.</p>
        </div>
    {:else}
        <div class="space-y-6">
            {#each visibleAppointments as app}
                {@const locationContact = app.expand?.appointment_at?.[0]}
                {@const locationText = locationContact ? `${locationContact.company_name || ''} ${locationContact.name_first || ''} ${locationContact.name_last || ''}`.trim() : app.location_address}
                <div class="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden transition-all hover:shadow-lg">
                    <!-- Termin Header -->
                    <div class="p-5 sm:p-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-neutral-50/50">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl shrink-0 shadow-inner">
                                📅
                            </div>
                            <div class="min-w-0">
                                <h3 class="font-bold text-lg text-neutral-900 leading-tight mb-1.5 truncate" title={app.description || 'Betreuungstermin'}>{app.description || 'Betreuungstermin'}</h3>
                                <div class="flex flex-col gap-1.5">
                                    <p class="text-sm font-semibold text-neutral-600 flex items-center gap-2">
                                        <span class="shrink-0">🕒</span>
                                        <span class="truncate">{new Date(app.appointment).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} um {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                                    </p>
                                    {#if locationText}
                                        <p class="text-sm font-semibold text-neutral-600 flex items-start gap-2">
                                            <span class="shrink-0">📍</span>
                                            <span class="truncate" title={locationText}>{locationText}</span>
                                        </p>
                                    {/if}
                                </div>
                            </div>
                        </div>
                        
                        {#if app.expand?.user}
                            <div class="bg-white px-3 py-2 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-3 shrink-0 self-start sm:self-auto">
                                <div class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-xs">{(app.expand.user.name_first?.charAt(0) || '')}</div>
                                <div>
                                    <p class="text-[10px] uppercase tracking-wider font-bold text-neutral-400">Assistent/in</p>
                                    <p class="text-sm font-bold text-neutral-800">{app.expand.user.name_first} {app.expand.user.name_last}</p>
                                </div>
                            </div>
                        {/if}
                    </div>
                    
                    <!-- Detaillierte Infos (Leistungen & Berichte) -->
                    <div class="p-5 sm:p-6 bg-white">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="space-y-6">
                                {#if app.expand?.tasks && app.expand.tasks.length > 0}
                                    <div>
                                        <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><span>📋</span> Geplante/Erbrachte Leistungen</h4>
                                        <ul class="space-y-2">
                                            {#each app.expand.tasks as task}
                                                <li class="flex items-start gap-2 text-sm text-neutral-700 bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-100">
                                                    <span class="text-emerald-500 mt-0.5 font-bold">✓</span>
                                                    <span class="font-medium">{task.title}</span>
                                                </li>
                                            {/each}
                                        </ul>
                                    </div>
                                {/if}
                                
                                {#if !(app.expand?.tasks?.length > 0) && !app.report}
                                    <p class="text-sm text-neutral-400 italic bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-center">Noch keine detaillierten Dokumentationen vorhanden.</p>
                                {/if}
                            </div>
                            
                            <div class="space-y-6">
                                {#if app.report}
                                    <div>
                                        <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><span>📝</span> Besuchsbericht</h4>
                                        <div class="bg-amber-50/50 border border-amber-100 p-4 rounded-xl text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed shadow-sm">
                                            {app.report}
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>