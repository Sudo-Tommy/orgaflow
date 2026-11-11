<script lang="ts">
    import { caregiverPortal } from '$lib/services/caregiverPortalService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { 
        Clock, MapPin, Phone, Navigation, CheckCircle2, 
        Circle, FileText, Ban
    } from 'lucide-svelte';
    import type { AppointmentRecord, ClientRecord } from '$lib/types/orgaTypes';

    interface Props {
        appointment: AppointmentRecord;
        isDirectOwner: boolean;
        onOpenModal: (appt: AppointmentRecord) => void;
    }

    let { appointment, isDirectOwner, onOpenModal }: Props = $props();

    const isBlock = $derived(caregiverPortal.isBlockAppointment(appointment));
    const isDone = $derived(appointment.status === 'Erledigt');

    let client = $derived.by(() => {
        const exp = (appointment as any).expand?.client?.[0] || (Array.isArray((appointment as any).expand?.client) ? (appointment as any).expand.client[0] : (appointment as any).expand?.client);
        return exp as ClientRecord | null;
    });

    let clientName = $derived.by(() => {
        if (isBlock) return appointment.title || 'Sperrzeit / Abwesenheit';
        return caregiverPortal.getClientFullName(client);
    });

    let address = $derived.by(() => {
        return appointment.location_address || caregiverPortal.getClientAddress(client);
    });

    let phone = $derived(client?.phone || client?.handy);

    let dateObj = $derived(appointment.appointment ? new Date(appointment.appointment) : null);
    let timeStr = $derived(dateObj ? dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '--:--');

    function openNavigation() {
        if (!address) {
            toastStore.warning('Keine Adresse für Navigation hinterlegt.');
            return;
        }
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
    }

    function callClient() {
        if (!phone) {
            toastStore.warning('Keine Telefonnummer hinterlegt.');
            return;
        }
        window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
    }
</script>

{#if isBlock}
    <!-- Optisch dezenter Infostreifen für organisatorische Blöcke / Wochenenden -->
    <div class="bg-slate-100/80 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-slate-500 dark:text-slate-400">
        <div class="flex items-center gap-2.5 min-w-0">
            <Ban class="w-4 h-4 text-slate-400 shrink-0" />
            <div class="min-w-0">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-300 block truncate">
                    {timeStr} Uhr • {appointment.title || 'Sperrzeit / Büro'}
                </span>
                {#if appointment.description}
                    <p class="text-[11px] text-slate-500 truncate">{appointment.description}</p>
                {/if}
            </div>
        </div>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
            Geschlossen
        </span>
    </div>
{:else}
    <!-- Reguläre Einsatzkarte mit OrgaFlow-Theming -->
    <div class="bg-white dark:bg-slate-900 border {isDirectOwner ? 'border-l-4 border-l-indigo-600 dark:border-l-indigo-500 border-slate-200 dark:border-slate-800' : 'border-slate-200 dark:border-slate-800'} rounded-3xl p-4 sm:p-5 shadow-xs transition-all hover:border-indigo-300 dark:hover:border-indigo-700 space-y-3.5 {isDone ? 'opacity-90 bg-slate-50/50 dark:bg-slate-900/60' : ''}">
        
        <!-- Header mit Zeit, Klient, Pflegegrad & Status -->
        <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0">
                <!-- Uhrzeit-Kapsel -->
                <div class="w-13 h-13 rounded-2xl {isDone ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900'} border flex flex-col items-center justify-center shrink-0">
                    <span class="text-xs font-black">{timeStr}</span>
                    <span class="text-[10px] font-bold opacity-75">Uhr</span>
                </div>

                <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <h3 class="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                            {clientName}
                        </h3>
                        {#if client?.level_of_care}
                            <span class="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 shrink-0">
                                PG {client.level_of_care}
                            </span>
                        {/if}
                    </div>
                    <p class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold truncate mt-0.5">
                        {appointment.description || 'Pflege- & Betreuungstermin'}
                    </p>
                </div>
            </div>

            <!-- 1-Tap Status-Umschalter -->
            <button
                type="button"
                onclick={() => caregiverPortal.toggleStatus(appointment)}
                class="min-h-8 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer {
                    isDone 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                        : appointment.status === 'In Bearbeitung'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                        : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                }"
            >
                {#if isDone}
                    <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Erledigt</span>
                {:else if appointment.status === 'In Bearbeitung'}
                    <Clock class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>In Arbeit</span>
                {:else}
                    <Circle class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Offen</span>
                {/if}
            </button>
        </div>

        <!-- Adresse -->
        {#if address}
            <div class="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl">
                <MapPin class="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                <span class="truncate">{address}</span>
            </div>
        {/if}

        <!-- Dokumentierter Bericht Preview falls vorhanden -->
        {#if appointment.report}
            <div class="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 line-clamp-2">
                <span class="font-bold">Bericht: </span>{appointment.report}
            </div>
        {/if}

        <!-- 1-Tap Schnell-Aktionen (Mindestens 44px Touch) -->
        <div class="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <!-- Hauptbutton: Bearbeiten & Dokumentieren -->
            <button
                type="button"
                onclick={() => onOpenModal(appointment)}
                class="w-full min-h-11 px-4 py-2.5 rounded-xl {
                    isDone 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                } text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
                <FileText class="w-4 h-4" />
                <span>{isDone ? 'Dokumentation einsehen & anpassen' : 'Einsatz bearbeiten & dokumentieren'}</span>
            </button>

            <!-- Schnellanruf und Navigation -->
            <div class="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onclick={openNavigation}
                    disabled={!address}
                    class="min-h-11 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-xs"
                >
                    <Navigation class="w-4 h-4" />
                    <span>Navigation</span>
                </button>

                <button
                    type="button"
                    onclick={callClient}
                    disabled={!phone}
                    class="min-h-11 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                    <Phone class="w-4 h-4 text-emerald-500" />
                    <span>Anrufen</span>
                </button>
            </div>
        </div>

    </div>
{/if}
