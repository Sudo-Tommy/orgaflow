<script lang="ts">
    import { Activity, ArrowRight } from "lucide-svelte";
    import AdminPushNotificationForm from "./AdminPushNotificationForm.svelte";

    let {
        totalUsers = 0,
        totalClients = 0,
        totalAppointments = 0,
        totalInvoices = 0,
        openSystemPromptsCount = 0,
        isOwner = false,
        canAccessSystemPrompts = false,
        onSelectFeedbackTab
    }: {
        totalUsers: number;
        totalClients: number;
        totalAppointments: number;
        totalInvoices: number;
        openSystemPromptsCount: number;
        isOwner: boolean;
        canAccessSystemPrompts: boolean;
        onSelectFeedbackTab: () => void;
    } = $props();
</script>

<div class="space-y-6 animate-enter">
    <!-- 1. System-Integrität & Health Kacheln -->
    <div>
        <h3 class="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Activity class="w-4 h-4 text-emerald-500" />
            <span>System-Integrität & Dienste</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- PocketBase Backend -->
            <div class="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <span class="text-xl">🗄️</span>
                        <h4 class="font-bold text-slate-900 dark:text-white text-sm">PocketBase Backend</h4>
                    </div>
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs"></span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2">
                    Verbindung stabil & verschlüsselt
                </p>
                <div class="mt-3 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded w-fit border border-emerald-200 dark:border-emerald-800">
                    Echtzeit-Synchronisation aktiv
                </div>
            </div>

            <!-- Microservice API -->
            <div class="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <span class="text-xl">🌐</span>
                        <h4 class="font-bold text-slate-900 dark:text-white text-sm">Microservice API</h4>
                    </div>
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs"></span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2">
                    Hintergrund-Dienste & PDF-Engine
                </p>
                <div class="mt-3 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 rounded w-fit border border-blue-200 dark:border-blue-800">
                    Port 3000 online
                </div>
            </div>

            <!-- Sicherheit & Rollen -->
            <div class="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <span class="text-xl">🛡️</span>
                        <h4 class="font-bold text-slate-900 dark:text-white text-sm">Sicherheit & Rollen</h4>
                    </div>
                    <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-xs"></span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2">
                    {totalUsers} aktive Identitäten
                </p>
                <div class="mt-3 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded w-fit border border-indigo-200 dark:border-indigo-800">
                    Rolle: {isOwner ? 'Inhaber / Superadmin' : 'Betriebsleitung'}
                </div>
            </div>

            <!-- System-Konformität -->
            <div class="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <span class="text-xl">⚖️</span>
                        <h4 class="font-bold text-slate-900 dark:text-white text-sm">Prüfrichtlinien</h4>
                    </div>
                    <span class="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-xs"></span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2">
                    GoBD- & DIN 5008-konform
                </p>
                <div class="mt-3 text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-1 rounded w-fit border border-purple-200 dark:border-purple-800">
                    Automatisches Audit aktiv
                </div>
            </div>
        </div>
    </div>

    <!-- 2. Live Datenbank-Zähler -->
    <div>
        <h3 class="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Echtzeit-Datenbestand
        </h3>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex flex-col items-center justify-center text-center">
                <span class="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 mb-1">{totalUsers}</span>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Benutzer</span>
            </div>
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex flex-col items-center justify-center text-center">
                <span class="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 mb-1">{totalClients}</span>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Klienten</span>
            </div>
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex flex-col items-center justify-center text-center">
                <span class="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 mb-1">{totalAppointments}</span>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Termine</span>
            </div>
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex flex-col items-center justify-center text-center">
                <span class="text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-400 mb-1">{totalInvoices}</span>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rechnungen</span>
            </div>
        </div>
    </div>

    <!-- 3. Admin-Module: Schnellzugriff auf Fachbereiche -->
    <div>
        <h3 class="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Spezialisierte Verwaltungsbereiche
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a href="/admin/mitarbeiter" class="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer">
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-xl">👥</div>
                        <span class="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all"><ArrowRight class="w-4 h-4" /></span>
                    </div>
                    <h4 class="font-bold text-slate-900 dark:text-white text-base">Mitarbeiter & QR-Zugang</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Klientenbegleiter, Außendienst-Zuweisungen und QR-Code-Login für mobile Endgeräte.</p>
                </div>
                <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <span>Verwaltung öffnen</span><span>→</span>
                </div>
            </a>

            <a href="/admin/iam" class="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer">
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-xl">🛡️</div>
                        <span class="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all"><ArrowRight class="w-4 h-4" /></span>
                    </div>
                    <h4 class="font-bold text-slate-900 dark:text-white text-base">IAM & Zugriffsrechte</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Rollen-Matrix, Policy-Simulator und feingranulare Zugriffsregeln für alle Entitäten.</p>
                </div>
                <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                    <span>Rechtestruktur prüfen</span><span>→</span>
                </div>
            </a>

            {#if canAccessSystemPrompts}
                <a href="/admin/system-prompts" class="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer">
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800 flex items-center justify-center text-xl">🧠</div>
                            <span class="text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all"><ArrowRight class="w-4 h-4" /></span>
                        </div>
                        <h4 class="font-bold text-slate-900 dark:text-white text-base">Prompt Studio & KI</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Antigravity Prompt-Synthese, wöchentliche Updates und KI-Vorgaben.</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
                        <span>{openSystemPromptsCount} offene Spezifikation(en)</span><span>→</span>
                    </div>
                </a>
            {/if}

            <!-- Feedback & Anfragen Hub Button -->
            <button
                type="button"
                onclick={onSelectFeedbackTab}
                class="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer text-left"
            >
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800 flex items-center justify-center text-xl">💬</div>
                        <span class="text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all"><ArrowRight class="w-4 h-4" /></span>
                    </div>
                    <h4 class="font-bold text-slate-900 dark:text-white text-base">Feedback & Support Hub</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Zentraler Überblick über Support-Tickets, Fehlerberichte und Verbesserungsvorschläge.</p>
                </div>
                <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                    <span>Hub öffnen</span><span>→</span>
                </div>
            </button>
        </div>
    </div>

    <!-- 4. Push-Benachrichtigung -->
    <AdminPushNotificationForm />
</div>
