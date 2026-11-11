<script lang="ts">
    import { fade } from "svelte/transition";
    import NextAppointmentCard from "./NextAppointmentCard.svelte";
    import { HeartHandshake, CreditCard, Folder, Inbox, UserPlus, ArrowRight } from "lucide-svelte";

    let {
        nextAppointment = null,
        nextClientName = "",
        userType = "client",
        pastAppointments = [],
        onSelectAppointment = () => {},
        onRequestAppointment = () => {},
        onOpenNewClient = () => {},
        onNavigateTab = () => {},
        onOpenHistory = () => {}
    }: {
        nextAppointment?: any;
        nextClientName?: string;
        userType?: string;
        pastAppointments?: any[];
        onSelectAppointment?: (app: any) => void;
        onRequestAppointment?: () => void;
        onOpenNewClient?: () => void;
        onNavigateTab?: (tab: 'overview' | 'calendar' | 'invoices' | 'documents' | 'clients') => void;
        onOpenHistory?: () => void;
    } = $props();
</script>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8" transition:fade={{ duration: 200 }}>
    <div class="lg:col-span-2 flex flex-col gap-6 lg:gap-8">
        <NextAppointmentCard appointment={nextAppointment} clientName={nextClientName} {userType} onSelectDetails={onSelectAppointment} onRequestAppointment={onRequestAppointment} />

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            <button onclick={() => onNavigateTab('clients')} class="text-left bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-start gap-5 cursor-pointer w-full">
                <div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner border border-indigo-100 group-hover:scale-110 transition-transform">
                    <HeartHandshake class="w-7 h-7" />
                </div>
                <div>
                    <h3 class="font-black text-slate-900 dark:text-slate-100 text-xl mb-1.5">{userType === 'contact' ? 'Klienten & Kontakte' : 'Betreuer & Kontakte'}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{userType === 'contact' ? 'Klientenakten, Bezugspersonen und Notfallnummern einsehen.' : 'Ihre Assistenz, gesetzliche Betreuer und Notfallkontakte direkt anrufen.'}</p>
                </div>
            </button>

            <button onclick={() => onNavigateTab('invoices')} class="text-left bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-start gap-5 cursor-pointer w-full">
                <div class="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner border border-emerald-100 group-hover:scale-110 transition-transform">
                    <CreditCard class="w-7 h-7" />
                </div>
                <div>
                    <h3 class="font-black text-slate-900 dark:text-slate-100 text-xl mb-1.5">{userType === 'client' ? 'Ihre Rechnungen' : 'Rechnungen der Klienten'}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Zahlungsstatus prüfen, Rechnungen und Zeitnachweise sicher einsehen.</p>
                </div>
            </button>

            <button onclick={() => onNavigateTab('documents')} class="text-left bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-start gap-5 cursor-pointer w-full">
                <div class="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner border border-blue-100 group-hover:scale-110 transition-transform">
                    <Folder class="w-7 h-7" />
                </div>
                <div>
                    <h3 class="font-black text-slate-900 dark:text-slate-100 text-xl mb-1.5">{userType === 'client' ? 'Ihre Dokumente' : 'Dokumenten-Ablage'}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Pflegeverträge, Bescheide und Vollmachten digital verwalten und hochladen.</p>
                </div>
            </button>

            <button onclick={onRequestAppointment} class="text-left bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-start gap-5 cursor-pointer w-full">
                <div class="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner border border-amber-100 group-hover:scale-110 transition-transform">
                    <Inbox class="w-7 h-7" />
                </div>
                <div>
                    <h3 class="font-black text-slate-900 dark:text-slate-100 text-xl mb-1.5">Termin anfragen</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Buchen Sie bequem neue Einsätze oder senden Sie uns eine Nachricht.</p>
                </div>
            </button>

            {#if userType === 'contact' || userType === 'admin'}
                <button onclick={onOpenNewClient} class="text-left bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-start gap-5 cursor-pointer w-full sm:col-span-2">
                    <div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner border border-indigo-100 group-hover:scale-110 transition-transform">
                        <UserPlus class="w-7 h-7" />
                    </div>
                    <div>
                        <h3 class="font-black text-slate-900 dark:text-slate-100 text-xl mb-1.5">Weiteren Klienten anmelden</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Beantragen Sie die Neuaufnahme eines weiteren Klienten oder Angehörigen.</p>
                    </div>
                </button>
            {/if}
        </div>
    </div>

    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
        <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between sticky top-0 z-10 shrink-0">
            <h2 class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Vergangene Termine</h2>
            <button onclick={() => onNavigateTab('calendar')} class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors cursor-pointer px-1">Alle ansehen</button>
        </div>
        <div class="p-5 flex flex-col gap-3.5 flex-1">
            {#if pastAppointments.length > 0}
                {#each pastAppointments.slice(0, 5) as app}
                    <button type="button" onclick={() => onSelectAppointment(app)} class="w-full text-left bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/60 dark:hover:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 transition-all flex flex-col gap-2.5 group active:scale-95 shadow-2xs hover:shadow-md cursor-pointer">
                        <div class="flex items-center justify-between w-full">
                            <span class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{new Date(app.appointment).toLocaleDateString('de-DE')}</span>
                            <div class="flex gap-1.5 items-center">
                                {#if app.status === 'abgesagt'}<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">🚫 Abgesagt</span>{/if}
                                {#if app.report}<span class="w-5 h-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-[10px]" title="Bericht">📝</span>{/if}
                                {#if app.settled}<span class="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]" title="Abgerechnet">✓</span>{/if}
                            </div>
                        </div>
                        <p class="text-sm font-bold leading-snug line-clamp-2 {app.status === 'abgesagt' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}">{app.description || 'Termin ohne Beschreibung'}</p>
                        {#if app.status === 'abgesagt' && app.cancellation_reason}
                            <p class="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 truncate" title="Ausfallgrund: {app.cancellation_reason}">
                                <span class="shrink-0">⚠️</span>
                                <span class="truncate">Ausfallgrund: {app.cancellation_reason}</span>
                            </p>
                        {/if}
                        <div class="mt-1 flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            Details ansehen <ArrowRight class="w-3 h-3" />
                        </div>
                    </button>
                {/each}
                {#if pastAppointments.length > 5}
                    <button type="button" onclick={onOpenHistory} class="w-full mt-2 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors shadow-xs active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
                        Alle {pastAppointments.length} Historien ansehen <ArrowRight class="w-3.5 h-3.5" />
                    </button>
                {/if}
            {:else}
                <div class="flex flex-col items-center justify-center h-full opacity-60 py-12">
                    <span class="text-4xl mb-4">🕰️</span>
                    <p class="text-sm text-slate-500 font-bold text-center">Noch keine Historie vorhanden.</p>
                </div>
            {/if}
        </div>
    </div>
</div>
