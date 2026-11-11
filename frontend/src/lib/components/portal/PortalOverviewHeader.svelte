<script lang="ts">
    import { Home, User, Mail, LogOut } from "lucide-svelte";

    let {
        formalGreeting = "",
        userType = "client",
        activeTab = $bindable<'overview' | 'calendar' | 'invoices' | 'documents' | 'clients'>('overview'),
        overdueInvoicesCount = 0,
        documentsCount = 0,
        onOpenProfile = () => {},
        onOpenMailingList = () => {},
        onLogout = () => {}
    }: {
        formalGreeting?: string;
        userType?: string;
        activeTab?: 'overview' | 'calendar' | 'invoices' | 'documents' | 'clients';
        overdueInvoicesCount?: number;
        documentsCount?: number;
        onOpenProfile?: () => void;
        onOpenMailingList?: () => void;
        onLogout?: () => void;
    } = $props();
</script>

<div class="mb-6 sm:mb-8 bg-white dark:bg-slate-900 p-5 sm:p-8 md:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col gap-4 sm:gap-6 transition-colors">
    <div class="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 z-0 pointer-events-none"></div>

    <div class="flex flex-wrap items-center justify-end gap-2 z-20 w-full">
        {#if overdueInvoicesCount > 0}
            <button onclick={() => activeTab = 'invoices'} class="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-500 text-rose-700 dark:text-rose-300 hover:text-white text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-xs transition-all active:scale-95 cursor-pointer">
                <span>⚠️</span> <span>{overdueInvoicesCount} unbezahlt</span>
            </button>
        {/if}
        <a href="/" class="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-white text-slate-700 dark:text-slate-300 hover:text-indigo-600 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs transition-all">
            <Home class="w-3.5 h-3.5" /> <span class="hidden sm:inline">Startseite</span>
        </a>
        <button onclick={onOpenProfile} class="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 text-slate-700 dark:text-slate-300 hover:text-emerald-700 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs transition-all">
            <User class="w-3.5 h-3.5 text-emerald-600" /> <span class="hidden sm:inline">Ihr Profil</span>
        </button>
        <button onclick={onOpenMailingList} class="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 text-slate-700 dark:text-slate-300 hover:text-indigo-700 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs transition-all">
            <Mail class="w-3.5 h-3.5 text-indigo-600" /> <span class="hidden sm:inline">Info-Verteiler</span>
        </button>
        <button onclick={onLogout} class="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs transition-all">
            <LogOut class="w-3.5 h-3.5 text-rose-500" /> <span class="hidden sm:inline">Abmelden</span>
        </button>
    </div>

    <div class="relative z-10 w-full">
        <p class="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1.5">Willkommen im Portal</p>
        <h1 class="text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2 sm:mb-3">{formalGreeting}</h1>
        <p class="text-slate-600 dark:text-slate-400 font-medium max-w-lg leading-relaxed text-sm md:text-base">
            Hier haben Sie alle {userType === 'client' ? 'Ihre' : 'die'} Termine, Betreuer, Notfallkontakte, Rechnungen und Dokumente sicher und übersichtlich im Blick.
        </p>

        <div class="overflow-x-auto custom-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
            <div class="flex items-center gap-1 sm:gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-2xl shadow-inner mt-5 sm:mt-8 w-max min-w-full sm:min-w-0 border border-slate-200 dark:border-slate-700">
                <button onclick={() => activeTab = 'overview'} class="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all {activeTab === 'overview' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'}">Übersicht</button>
                <button onclick={() => activeTab = 'calendar'} class="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all {activeTab === 'calendar' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'}">Kalender</button>
                <button onclick={() => activeTab = 'invoices'} class="relative px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all {activeTab === 'invoices' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'}">
                    Rechnungen
                    {#if overdueInvoicesCount > 0}<span class="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>{/if}
                </button>
                <button onclick={() => activeTab = 'documents'} class="relative px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all {activeTab === 'documents' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'}">
                    Dokumente
                    {#if documentsCount > 0}<span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">{documentsCount}</span>{/if}
                </button>
                <button onclick={() => activeTab = 'clients'} class="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all {activeTab === 'clients' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'}">
                    {userType === 'contact' ? 'Klienten & Kontakte' : 'Betreuer & Kontakte'}
                </button>
            </div>
        </div>
    </div>
</div>
