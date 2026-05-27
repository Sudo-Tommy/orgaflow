<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { X, Calendar, Clock, MapPin, User, CheckCircle2, ListTodo, FileText } from "lucide-svelte";

    let { appointment, onClose, isContactMode = false, isAdminMode = false } = $props<{
        appointment: any | null;
        onClose: () => void;
        isContactMode?: boolean;
        isAdminMode?: boolean;
    }>();

    let client = $derived((isContactMode || isAdminMode) ? appointment?.expand?.client?.[0] : null);
    let user = $derived(appointment?.expand?.user);
    let locationContact = $derived(appointment?.expand?.appointment_at?.[0]);
    let locationText = $derived(locationContact ? `${locationContact.company_name || ''} ${locationContact.name_first || ''} ${locationContact.name_last || ''}`.trim() : appointment?.location_address);
    
    let isFuture = $derived(appointment ? new Date(appointment.appointment) >= new Date() : false);
    let hasPendingChange = $derived(appointment?.requestet_changes?.status === 'pending');
    
    let isRequestingChange = $state(false);
    let changeText = $state("");
    let isSubmittingChange = $state(false);

    async function submitChangeRequest() {
        if (!changeText.trim()) return;
        isSubmittingChange = true;
        try {
            const payload = { status: 'pending', text: changeText.trim(), created: new Date().toISOString() };
            await pb.collection('appointments').update(appointment.id, { requestet_changes: payload });
            appointment.requestet_changes = payload; // Lokales UI-Update
            toastStore.success("Änderungswunsch erfolgreich übermittelt.");
            isRequestingChange = false;
        } catch (e) {
            toastStore.error("Fehler beim Senden der Anfrage.");
        } finally {
            isSubmittingChange = false;
        }
    }

    let userType = $state("client");
    $effect(() => {
        if (typeof window !== 'undefined') {
            const t = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            if (t) try { userType = JSON.parse(atob(t.split('.')[1])).type; } catch(e){}
        }
    });
</script>

{#if appointment}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4 transition-all" onclick={onClose} transition:fade={{duration: 200}}>
        <!-- Mobile: Bottom-Sheet (rounded-t), Desktop: Modal im Zentrum (rounded) -->
        <div class="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onclick={e => e.stopPropagation()} in:fly={{ y: 100, duration: 300, opacity: 0 }} out:fly={{ y: 100, duration: 250, opacity: 0 }}>
            
            <!-- Header -->
            <div class="px-6 py-4 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10 shrink-0">
                <h2 class="text-xl font-black text-neutral-900 truncate pr-4">Termindetails</h2>
                <button aria-label="Schließen" onclick={onClose} class="w-10 h-10 min-w-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 outline-none">
                    <X class="w-5 h-5" />
                </button>
            </div>
            
            <div class="overflow-y-auto custom-scrollbar p-5 sm:p-8 bg-neutral-50/50 flex-1">
                <!-- Top Card: Datum, Zeit & Ort -->
                <div class="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm mb-6 transition-all hover:shadow-md">
                    <div class="flex items-start gap-4">
                        <div class="w-14 h-14 min-w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner shrink-0">
                            <Calendar class="w-7 h-7" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <h3 class="font-black text-xl text-neutral-900 leading-tight mb-3 truncate" title={appointment.description || 'Betreuungstermin'}>{appointment.description || 'Betreuungstermin'}</h3>
                            <div class="flex flex-col gap-2.5">
                                <p class="text-sm font-semibold text-neutral-600 flex items-center gap-3">
                                    <Clock class="w-4 h-4 shrink-0 text-brand-500" />
                                    <span class="truncate">{new Date(appointment.appointment).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} um {new Date(appointment.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                                </p>
                                {#if locationText}
                                    <p class="text-sm font-semibold text-neutral-600 flex items-start gap-3">
                                        <MapPin class="w-4 h-4 shrink-0 text-brand-500 mt-0.5" />
                                        <span class="leading-snug">{locationText}</span>
                                    </p>
                                {/if}
                            </div>
                        </div>
                    </div>

                    {#if user}
                        <div class="mt-6 pt-5 border-t border-neutral-100 flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-sm border border-emerald-100 shrink-0">
                                {(user.name_first?.charAt(0) || '')}{(user.name_last?.charAt(0) || '')}
                            </div>
                            <div class="min-w-0">
                                <p class="text-[10px] uppercase tracking-wider font-black text-neutral-400">{userType === 'client' ? 'Ihr Assistent' : 'Zuständige Assistenz'}</p>
                                <p class="text-base font-bold text-neutral-900 truncate">{user.name_first} {user.name_last}</p>
                            </div>
                            {#if client}
                                <div class="ml-auto text-right min-w-0 pl-4 border-l border-neutral-100">
                                    <p class="text-[10px] uppercase tracking-wider font-black text-neutral-400">Für Klient</p>
                                    <p class="text-base font-bold text-brand-700 truncate">{client.name_first} {client.name_last}</p>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>

                <!-- Tasks Section -->
                {#if appointment.expand?.tasks && appointment.expand.tasks.length > 0}
                    <div class="mb-6">
                        <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-2 pl-1">
                            <ListTodo class="w-4 h-4" /> Leistungen
                        </h4>
                        <div class="flex flex-col gap-2">
                            {#each appointment.expand.tasks as task}
                                <div class="flex items-center gap-3 bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50/30">
                                    <CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" />
                                    <span class="text-sm font-semibold text-neutral-800 leading-snug">{task.title}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- Report Section -->
                {#if appointment.report}
                    <div class="mb-2">
                        <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-2 pl-1">
                            <FileText class="w-4 h-4" /> Besuchsbericht
                        </h4>
                        <div class="bg-amber-50/50 border border-amber-200/60 p-6 rounded-3xl text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed shadow-inner">
                            {appointment.report}
                        </div>
                    </div>
                {/if}

                {#if (!appointment.expand?.tasks?.length) && !appointment.report}
                    <div class="flex flex-col items-center justify-center p-10 bg-white rounded-3xl border border-dashed border-neutral-200 text-center shadow-sm">
                        <FileText class="w-10 h-10 text-neutral-300 mb-4" />
                        <p class="text-sm text-neutral-500 font-semibold">Noch keine detaillierten Dokumentationen oder Berichte vorhanden.</p>
                    </div>
                {/if}
                
                <!-- Änderung anfragen (Nur für zukünftige Termine im Portal) -->
                {#if isFuture && !isAdminMode}
                    <div class="mt-6 pt-6 border-t border-neutral-100">
                        {#if hasPendingChange}
                            <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-enter">
                                <span class="text-xl">🔄</span>
                                <div>
                                    <p class="font-bold text-blue-900 text-sm">Änderung angefragt</p>
                                    <p class="text-xs text-blue-700 mt-1">{userType === 'client' ? 'Ihre' : 'Die'} Anfrage wird von uns bearbeitet: <br> <span class="italic">"{appointment.requestet_changes?.text}"</span></p>
                                </div>
                            </div>
                        {:else if isRequestingChange}
                            <div class="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm animate-enter">
                                <h4 class="text-sm font-bold text-neutral-900 mb-2">Termin ändern oder absagen</h4>
                                <textarea bind:value={changeText} class="orga-input-clear w-full text-sm min-h-24 resize-y mb-3" placeholder="Bitte beschreiben Sie kurz {userType === 'client' ? 'Ihren' : 'den'} Änderungswunsch (z.B. neues Datum oder Grund für die Absage)..." disabled={isSubmittingChange}></textarea>
                                <div class="flex justify-end gap-2">
                                    <button onclick={() => isRequestingChange = false} class="px-4 py-2 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors" disabled={isSubmittingChange}>Abbrechen</button>
                                    <button onclick={submitChangeRequest} class="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 rounded-lg transition-colors flex items-center gap-2" disabled={isSubmittingChange || !changeText.trim()}>
                                        {#if isSubmittingChange}<div class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>{/if} Anfrage senden
                                    </button>
                                </div>
                            </div>
                        {:else}
                            <button onclick={() => isRequestingChange = true} class="w-full bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 font-bold text-sm py-3.5 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"><span class="text-base leading-none">🔄</span> Termin verschieben / absagen</button>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
