<script lang="ts">
    import { caregiverPortal } from '$lib/services/caregiverPortalService.svelte';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { 
        X, Users, MapPin, Phone, ShieldAlert, Heart, 
        FileText, Calendar, Building, ChevronRight, Navigation
    } from 'lucide-svelte';
    import type { ClientRecord, AppointmentRecord, ContactRecord } from '$lib/types/orgaTypes';

    let isOpen = $state(false);
    let client = $state<ClientRecord | null>(null);
    let dialog = $state<HTMLDialogElement | null>(null);

    $effect(() => {
        if (isOpen && client) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    });

    export function open(c: ClientRecord) {
        client = c;
        isOpen = true;
    }

    export function close() {
        isOpen = false;
        client = null;
    }

    // Vorberichte und historische Einsätze dieses Klienten
    const clientHistory = $derived.by(() => {
        if (!client) return [];
        const appts = orgaStore.appointments.data || [];
        return appts
            .filter(a => {
                const raw = a.client as any;
                if (Array.isArray(raw)) return raw.some(cid => (typeof cid === 'string' ? cid : cid?.id) === client?.id);
                return raw === client?.id || raw?.id === client?.id;
            })
            .sort((a, b) => (b.appointment || '').localeCompare(a.appointment || ''));
    });

    // Verknüpfte Kontakte (z.B. Ärzte, Angehörige)
    const linkedContacts = $derived.by(() => {
        if (!client) return [];
        const allContacts = orgaStore.contacts.data || [];
        const contactIds = Array.isArray(client.contacts) ? client.contacts : [];
        return allContacts.filter(ct => contactIds.includes(ct.id));
    });

    const fullAddress = $derived.by(() => caregiverPortal.getClientAddress(client));
    const phone = $derived(client?.phone || client?.handy);

    function viewAppointmentsForClient() {
        if (!client) return;
        caregiverPortal.selectedClientId = client.id;
        caregiverPortal.activeTab = 'appointments';
        close();
    }

    function openMaps() {
        if (!fullAddress) return;
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`, '_blank');
    }

    function call(num?: string) {
        if (!num) return;
        window.location.href = `tel:${num.replace(/\s+/g, '')}`;
    }

    function formatDate(d?: string) {
        if (!d) return '–';
        try { return new Date(d).toLocaleDateString('de-DE'); } catch { return d; }
    }

    function formatDateTime(d?: string) {
        if (!d) return '–';
        try { return new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; }
    }
</script>

{#if isOpen && client}
    <dialog
        bind:this={dialog}
        class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-xs w-full max-w-xl mx-auto my-auto rounded-3xl border-none outline-none animate-enter z-50"
        onclick={(e) => { if (e.target === dialog) close(); }}
        oncancel={(e) => { e.preventDefault(); close(); }}
    >
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full flex flex-col h-auto">
            
            <!-- Header -->
            <div class="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0 rounded-t-3xl">
                <div class="flex items-center gap-3 min-w-0 pr-2">
                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 text-white font-black text-xl flex items-center justify-center shrink-0">
                        {client.name_last ? client.name_last[0] : 'K'}
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                                {client.name_last}, {client.name_first}
                            </h2>
                            {#if client.level_of_care}
                                <span class="px-2 py-0.5 rounded-md text-xs font-black bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                                    Pflegegrad {client.level_of_care}
                                </span>
                            {/if}
                        </div>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Klienten-Akte (Mitarbeiteransicht)</p>
                    </div>
                </div>
                <button type="button" onclick={close} aria-label="Schließen" class="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Content -->
            <div class="p-4 sm:p-6 space-y-4">
                
                <!-- Schnellaktionen (Navigation & Anruf) -->
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick={openMaps} disabled={!fullAddress} class="p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 transition text-left cursor-pointer disabled:opacity-40">
                        <div class="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <Navigation class="w-4 h-4" />
                        </div>
                        <div class="min-w-0">
                            <span class="block text-xs font-bold text-slate-900 dark:text-white">Route starten</span>
                            <span class="block text-[10px] text-slate-500 truncate">{fullAddress || 'Keine Adresse'}</span>
                        </div>
                    </button>

                    <button type="button" onclick={() => call(phone)} disabled={!phone} class="p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 transition text-left cursor-pointer disabled:opacity-40">
                        <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Phone class="w-4 h-4" />
                        </div>
                        <div class="min-w-0">
                            <span class="block text-xs font-bold text-slate-900 dark:text-white">Klienten anrufen</span>
                            <span class="block text-[10px] text-slate-500 truncate">{phone || 'Keine Nummer'}</span>
                        </div>
                    </button>
                </div>

                <!-- Wichtige Hinweise / Besonderheiten -->
                {#if client.notes}
                    <div class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                        <div class="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                            <ShieldAlert class="w-4 h-4 shrink-0" />
                            <span>Wichtige Betreuungshinweise</span>
                        </div>
                        <p class="text-xs text-amber-900 dark:text-amber-200 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
                    </div>
                {/if}

                <!-- Stammdaten & Details -->
                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                    <div class="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                        <span class="text-slate-500">Adresse</span>
                        <span class="font-bold text-slate-800 dark:text-slate-200 text-right">{fullAddress || '–'}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                        <span class="text-slate-500">Telefon / Mobil</span>
                        <span class="font-bold text-slate-800 dark:text-slate-200">{phone || '–'}</span>
                    </div>
                    {#if client.email}
                        <div class="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                            <span class="text-slate-500">E-Mail</span>
                            <span class="font-bold text-slate-800 dark:text-slate-200">{client.email}</span>
                        </div>
                    {/if}
                    {#if client.birthdate}
                        <div class="flex justify-between py-1">
                            <span class="text-slate-500">Geburtsdatum</span>
                            <span class="font-bold text-slate-800 dark:text-slate-200">{formatDate(client.birthdate)}</span>
                        </div>
                    {/if}
                </div>

                <!-- Notfall- & Angehörigenkontakte -->
                {#if linkedContacts.length > 0}
                    <div class="space-y-2">
                        <h3 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Users class="w-3.5 h-3.5 text-indigo-500" /><span>Wichtige Kontakte / Angehörige</span>
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {#each linkedContacts as ct}
                                <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                                    <div class="min-w-0 pr-2">
                                        <div class="font-bold text-slate-900 dark:text-white truncate">{ct.name_last}, {ct.name_first}</div>
                                        <div class="text-[10px] text-slate-500 truncate">{ct.relationship || ct.company || 'Kontaktperson'}</div>
                                    </div>
                                    {#if ct.phone || ct.mobile}
                                        <button type="button" onclick={() => call(ct.mobile || ct.phone)} aria-label="Anrufen" class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                            <Phone class="w-3.5 h-3.5" />
                                        </button>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- Letzte Berichte & Vor-Einsätze -->
                <div class="space-y-2">
                    <h3 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText class="w-3.5 h-3.5 text-indigo-500" /><span>Letzte Einsatzberichte ({clientHistory.length})</span>
                    </h3>
                    {#if clientHistory.length === 0}
                        <p class="text-xs text-slate-400 py-3 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl">Bisher keine dokumentierten Einsätze vorhanden.</p>
                    {:else}
                        <div class="space-y-2">
                            {#each clientHistory.slice(0, 5) as hAppt}
                                {@const hDate = formatDateTime(hAppt.appointment)}
                                <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                                    <div class="flex items-center justify-between">
                                        <span class="font-bold text-indigo-600 dark:text-indigo-400">📅 {hDate}</span>
                                        <span class="text-[10px] px-2 py-0.5 rounded-md font-bold {hAppt.status === 'Erledigt' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}">
                                            {hAppt.status || 'Offen'}
                                        </span>
                                    </div>
                                    <p class="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{hAppt.report || 'Kein schriftlicher Bericht hinterlegt.'}</p>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>

            </div>

            <!-- Footer -->
            <div class="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-2 shrink-0 sticky bottom-0 z-10 backdrop-blur-md">
                <button type="button" onclick={viewAppointmentsForClient} class="min-h-11 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs">
                    <Calendar class="w-4 h-4" /><span>Einsätze dieses Klienten</span>
                </button>
                <button type="button" onclick={close} class="min-h-11 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-200">
                    Schließen
                </button>
            </div>

        </div>
    </dialog>
{/if}
