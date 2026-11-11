<script lang="ts">
    import { Play } from "lucide-svelte";

    let {
        superadminCount,
        adminCount,
        caregiverCount,
        guestCount,
        onNavigateSimulator
    } = $props<{
        superadminCount: number;
        adminCount: number;
        caregiverCount: number;
        guestCount: number;
        onNavigateSimulator: () => void;
    }>();
</script>

<div class="space-y-6 animate-enter">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Role Card 1: Superadmin -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-purple-200/60 dark:border-purple-900/40 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-purple-600 uppercase tracking-wider">God Mode</span>
                <span class="text-xs font-mono font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 px-2 py-0.5 rounded">{superadminCount}</span>
            </div>
            <h4 class="font-black text-slate-900 dark:text-white text-base">superadmin / owner</h4>
            <p class="text-xs text-slate-500">Vollzugriff auf alle Firmen, Datenbanktabellen, Spezifikationen, Live Logs und Systemprompts.</p>
        </div>

        <!-- Role Card 2: Admin -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-blue-600 uppercase tracking-wider">Betriebsleiter</span>
                <span class="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 px-2 py-0.5 rounded">{adminCount}</span>
            </div>
            <h4 class="font-black text-slate-900 dark:text-white text-base">admin</h4>
            <p class="text-xs text-slate-500">Volle Betriebsverwaltung im eigenen Mandanten: Rechnungen, BWA, Klienten, Termine und Mitarbeiter.</p>
        </div>

        <!-- Role Card 3: User / Caregiver -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-emerald-600 uppercase tracking-wider">Betreuer</span>
                <span class="text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 px-2 py-0.5 rounded">{caregiverCount}</span>
            </div>
            <h4 class="font-black text-slate-900 dark:text-white text-base">user / caregiver</h4>
            <p class="text-xs text-slate-500">Persönliche Termine und zugewiesene Klienten. Keine Einsicht in BWA oder Betriebsfinanzen.</p>
        </div>

        <!-- Role Card 4: Guest / Client -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-amber-600 uppercase tracking-wider">Portal-Gast</span>
                <span class="text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 px-2 py-0.5 rounded">{guestCount}</span>
            </div>
            <h4 class="font-black text-slate-900 dark:text-white text-base">guest / client</h4>
            <p class="text-xs text-slate-500">Ausschließlich Klienten-Portal (/portal) zur Einsicht freigegebener Dokumente und Termine.</p>
        </div>
    </div>

    <!-- Permission Matrix Table -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
        <div class="flex items-center justify-between">
            <div>
                <h4 class="text-base font-black text-slate-900 dark:text-white">HRBAC Berechtigungs-Matrix</h4>
                <p class="text-xs text-slate-500 mt-0.5">Übersicht aller Rechte pro Modul und Ressource im System.</p>
            </div>
            <button 
                type="button" 
                onclick={onNavigateSimulator}
                class="min-h-[44px] px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
                <Play class="w-3.5 h-3.5 fill-current" />
                <span>Im Policy Simulator testen</span>
            </button>
        </div>

        <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-left border-collapse min-w-160">
                <thead class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                        <th class="p-3.5">Modul / Ressource</th>
                        <th class="p-3.5 text-center">Superadmin</th>
                        <th class="p-3.5 text-center">Admin (Betrieb)</th>
                        <th class="p-3.5 text-center">Caregiver (User)</th>
                        <th class="p-3.5 text-center">Guest (Portal)</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    <tr>
                        <td class="p-3.5 font-bold text-slate-900 dark:text-white">Klientenstammdaten</td>
                        <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Alle Mandanten</td>
                        <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Eigener Mandant</td>
                        <td class="p-3.5 text-center text-blue-600 font-medium">✓ Zugewiesene</td>
                        <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                    </tr>
                    <tr>
                        <td class="p-3.5 font-bold text-slate-900 dark:text-white">Termine &amp; Einsätze</td>
                        <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Alle Mandanten</td>
                        <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Eigener Mandant</td>
                        <td class="p-3.5 text-center text-blue-600 font-medium">✓ Eigene Termine</td>
                        <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                    </tr>
                    <tr>
                        <td class="p-3.5 font-bold text-slate-900 dark:text-white">Rechnungen &amp; Finanzen</td>
                        <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Vollzugriff</td>
                        <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Eigener Mandant</td>
                        <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                        <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                    </tr>
                    <tr>
                        <td class="p-3.5 font-bold text-slate-900 dark:text-white">BWA &amp; Controlling</td>
                        <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Vollzugriff</td>
                        <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Eigener Mandant</td>
                        <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                        <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                    </tr>
                    <tr>
                        <td class="p-3.5 font-bold text-slate-900 dark:text-white">System-Admin &amp; IAM</td>
                        <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Vollzugriff</td>
                        <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Eigener Betrieb</td>
                        <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                        <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                    </tr>
                    <tr>
                        <td class="p-3.5 font-bold text-slate-900 dark:text-white">God Mode &amp; Raw Database</td>
                        <td class="p-3.5 text-center text-emerald-600 font-bold">✓ Vollzugriff</td>
                        <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                        <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                        <td class="p-3.5 text-center text-rose-500 font-bold">✗ Gesperrt</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
