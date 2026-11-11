<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { X, Calendar, Clock, MapPin, User, CheckCircle2, ListTodo, FileText } from "lucide-svelte";
    import { sanitizeReportText } from "$lib/utils/reportSanitizer";
    import { autoGrow } from "$lib/actions/autoGrow";

    let { appointment, onClose, isContactMode = false, isAdminMode = false } = $props<{
        appointment: any | null;
        onClose: () => void;
        isContactMode?: boolean;
        isAdminMode?: boolean;
    }>();

    let dialog = $state<HTMLDialogElement | null>(null);

    $effect(() => {
        if (appointment) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    });

    let client = $derived((isContactMode || isAdminMode) ? appointment?.expand?.client?.[0] : null);
    let user = $derived(appointment?.expand?.user);
    let locationContact = $derived(appointment?.expand?.appointment_at?.[0]);
    let locationText = $derived(locationContact ? `${locationContact.company_name || ''} ${locationContact.name_first || ''} ${locationContact.name_last || ''}`.trim() : appointment?.location_address);
    
    let isFuture = $derived(appointment ? new Date(appointment.appointment) >= new Date() : false);
    let hasPendingChange = $derived(appointment?.requestet_changes?.status === 'pending');
    let sanitizedReport = $derived(sanitizeReportText(appointment?.report));
    
    let isRequestingChange = $state(false);
    let changeText = $state("");
    let isSubmittingChange = $state(false);

    async function submitChangeRequest() {
        if (!changeText.trim()) return;
        isSubmittingChange = true;
        try {
            const payload = { status: 'pending', text: changeText.trim(), created: new Date().toISOString() };
            await pb.collection('appointments').update(appointment.id, { requestet_changes: payload });
            appointment.requestet_changes = payload;
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
    <dialog
        bind:this={dialog}
        class="zero-inner-scroll-modal fixed inset-0 m-auto w-full max-w-2xl bg-transparent p-3 sm:p-4 border-none outline-none backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm animate-enter z-50 overflow-visible"
        onclick={(e) => { if (e.target === dialog) onClose(); }}
        oncancel={(e) => { e.preventDefault(); onClose(); }}
    >
        <div class="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-neutral-100 dark:border-slate-800 rounded-3xl flex flex-col shadow-2xl my-auto sm:my-8 overflow-hidden">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10 shrink-0 rounded-t-3xl">
                <h2 class="text-xl font-black text-neutral-900 dark:text-white truncate pr-4">Termindetails</h2>
                <button aria-label="Schließen" onclick={onClose} class="w-11 h-11 min-w-[44px] min-h-[44px] bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 outline-none cursor-pointer">
                    <X class="w-5 h-5" />
                </button>
            </div>
            
            <div class="p-5 sm:p-8 bg-neutral-50/50 dark:bg-slate-950/50 flex-1">
                <!-- Top Card: Datum, Zeit & Ort -->
                <div class="bg-white dark:bg-slate-800/80 p-6 rounded-3xl border border-neutral-100 dark:border-slate-700/60 shadow-sm mb-6 transition-all hover:shadow-md">
                    <div class="flex items-start gap-4">
                        <div class="w-14 h-14 min-w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner shrink-0">
                            <Calendar class="w-7 h-7" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <h3 class="font-black text-xl text-neutral-900 dark:text-white leading-tight mb-3 truncate" title={appointment.description || 'Betreuungstermin'}>{appointment.description || 'Betreuungstermin'}</h3>
                            <div class="flex flex-col gap-2.5">
                                <p class="text-sm font-semibold text-neutral-600 dark:text-slate-300 flex items-center gap-3">
                                    <Clock class="w-4 h-4 shrink-0 text-brand-500" />
                                    <span class="truncate">{new Date(appointment.appointment).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} um {new Date(appointment.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                                </p>
                                {#if locationText}
                                    <p class="text-sm font-semibold text-neutral-600 dark:text-slate-300 flex items-start gap-3">
                                        <MapPin class="w-4 h-4 shrink-0 text-brand-500 mt-0.5" />
                                        <span class="leading-snug">{locationText}</span>
                                    </p>
                                {/if}
                            </div>
                        </div>
                    </div>

                    {#if user}
                        <div class="mt-6 pt-5 border-t border-neutral-100 dark:border-slate-700/60 flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-100 dark:border-emerald-900/60 shrink-0">
                                {(user.name_first?.charAt(0) || '')}{(user.name_last?.charAt(0) || '')}
                            </div>
                            <div class="min-w-0">
                                <p class="text-[10px] uppercase tracking-wider font-black text-neutral-400 dark:text-slate-400">{userType === 'client' ? 'Ihr Assistent' : 'Zuständige Assistenz'}</p>
                                <p class="text-base font-bold text-neutral-900 dark:text-white truncate">{user.name_first} {user.name_last}</p>
                            </div>
                            {#if client}
                                <div class="ml-auto text-right min-w-0 pl-4 border-l border-neutral-100 dark:border-slate-700">
                                    <p class="text-[10px] uppercase tracking-wider font-black text-neutral-400 dark:text-slate-400">Für Klient</p>
                                    <p class="text-base font-bold text-brand-600 dark:text-brand-400 truncate">{client.name_first} {client.name_last}</p>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>

                <!-- Tasks Section -->
                {#if appointment.expand?.tasks && appointment.expand.tasks.length > 0}
                    <div class="mb-6">
                        <h4 class="text-xs font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 pl-1">
                            <ListTodo class="w-4 h-4" /> Leistungen
                        </h4>
                        <div class="flex flex-col gap-2">
                            {#each appointment.expand.tasks as task}
                                <div class="flex items-center gap-3 bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-neutral-100 dark:border-slate-700/60 shadow-sm transition-all hover:border-emerald-200 dark:hover:border-emerald-700/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20">
                                    <CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" />
                                    <span class="text-sm font-semibold text-neutral-800 dark:text-slate-200 leading-snug">{task.title}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- Report Section -->
                {#if appointment.report}
                    <div class="mb-2">
                        <h4 class="text-xs font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 pl-1">
                            <FileText class="w-4 h-4" /> Besuchsbericht
                        </h4>
                        <div class="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-6 rounded-3xl text-sm text-neutral-800 dark:text-amber-100/90 whitespace-pre-wrap leading-relaxed shadow-inner">
                            {sanitizedReport}
                        </div>
                    </div>
                {/if}

                {#if (!appointment.expand?.tasks?.length) && !appointment.report}
                    <div class="flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800/60 rounded-3xl border border-dashed border-neutral-200 dark:border-slate-700 text-center shadow-sm">
                        <FileText class="w-10 h-10 text-neutral-300 dark:text-slate-600 mb-4" />
                        <p class="text-sm text-neutral-500 dark:text-slate-400 font-semibold">Noch keine detaillierten Dokumentationen oder Berichte vorhanden.</p>
                    </div>
                {/if}
                
                <!-- Änderung anfragen (Nur für zukünftige Termine im Portal) -->
                {#if isFuture && !isAdminMode}
                    <div class="mt-6 pt-6 border-t border-neutral-100 dark:border-slate-800">
                        {#if hasPendingChange}
                            <div class="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-enter">
                                <span class="text-xl">🔄</span>
                                <div>
                                    <p class="font-bold text-blue-900 dark:text-blue-300 text-sm">Änderung angefragt</p>
                                    <p class="text-xs text-blue-700 dark:text-blue-400 mt-1">{userType === 'client' ? 'Ihre' : 'Die'} Anfrage wird von uns bearbeitet: <br> <span class="italic">"{appointment.requestet_changes?.text}"</span></p>
                                </div>
                            </div>
                        {:else if isRequestingChange}
                            <div class="bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm animate-enter">
                                <h4 class="text-sm font-bold text-neutral-900 dark:text-white mb-2">Termin ändern oder absagen</h4>
                                <textarea use:autoGrow bind:value={changeText} class="auto-grow orga-input-clear w-full text-sm min-h-24 mb-3 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 resize-none overflow-hidden" placeholder="Bitte beschreiben Sie kurz {userType === 'client' ? 'Ihren' : 'den'} Änderungswunsch (z.B. neues Datum oder Grund für die Absage)..." disabled={isSubmittingChange}></textarea>
                                <div class="flex justify-end gap-2">
                                    <button onclick={() => isRequestingChange = false} class="px-4 py-2.5 min-h-[44px] text-xs font-bold text-neutral-600 dark:text-slate-300 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer" disabled={isSubmittingChange}>Abbrechen</button>
                                    <button onclick={submitChangeRequest} class="px-5 py-2.5 min-h-[44px] text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 rounded-xl transition-colors flex items-center gap-2 cursor-pointer" disabled={isSubmittingChange || !changeText.trim()}>
                                        {#if isSubmittingChange}<div class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>{/if} Anfrage senden
                                    </button>
                                </div>
                            </div>
                        {:else}
                            <button onclick={() => isRequestingChange = true} class="w-full min-h-[48px] bg-neutral-50 dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 border border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-slate-200 font-bold text-sm py-3.5 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 cursor-pointer"><span class="text-base leading-none">🔄</span> Termin verschieben / absagen</button>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    </dialog>
{/if}
