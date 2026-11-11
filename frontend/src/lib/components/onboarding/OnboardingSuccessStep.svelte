<script lang="ts">
    import { CheckCircle, LogIn, Sparkles, ShieldCheck } from 'lucide-svelte';

    let { 
        name = '',
        email = '',
        role = 'employee'
    } = $props<{
        name: string;
        email: string;
        role?: string;
    }>();

    let roleName = $derived(role === 'developer' ? 'Entwickler' : role === 'superadmin' ? 'Administrator' : 'Mitarbeiter / Betreuungskraft');
</script>

<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6 max-w-xl mx-auto mb-12 animate-enter">
    <!-- Success Icon Animation -->
    <div class="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
        <CheckCircle class="w-10 h-10 stroke-[2.5]" />
    </div>

    <div class="space-y-2">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-800">
            <Sparkles class="w-3.5 h-3.5" />
            <span>Registrierung erfolgreich abgeschlossen</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Herzlich willkommen, {name || 'im Team'}!
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Dein Mitarbeiterprofil wurde erfolgreich und verbindlich angelegt. Dein Zugang ist sofort einsatzbereit.
        </p>
    </div>

    <!-- Login Details Card -->
    <div class="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-left space-y-3">
        <div class="flex items-center justify-between text-xs">
            <span class="text-slate-500 font-medium">Rolle & Funktion:</span>
            <span class="font-bold text-slate-900 dark:text-white">{roleName}</span>
        </div>
        <div class="flex items-center justify-between text-xs">
            <span class="text-slate-500 font-medium">Login-Benutzername:</span>
            <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400 break-all">{email}</span>
        </div>
        <div class="flex items-center justify-between text-xs">
            <span class="text-slate-500 font-medium">Status:</span>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Sofort Aktiv</span>
            </span>
        </div>
    </div>

    <!-- Link-Entwertung Info -->
    <div class="flex items-center justify-center gap-2 text-[11px] text-slate-400">
        <ShieldCheck class="w-4 h-4 text-emerald-500" />
        <span>Dieser Einladungslink wurde nun aus Sicherheitsgründen entwertet.</span>
    </div>

    <!-- Direct Login Button -->
    <a 
        href="/dashboard" 
        class="min-h-12 w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95"
    >
        <LogIn class="w-4 h-4" />
        <span>Jetzt direkt anmelden & starten</span>
    </a>
</div>
