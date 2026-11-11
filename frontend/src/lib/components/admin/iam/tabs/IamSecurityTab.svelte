<script lang="ts">
    import { Key, Lock } from "lucide-svelte";
</script>

<div class="space-y-6 animate-enter">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            <h3 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Key class="w-5 h-5 text-indigo-600" />
                <span>Authentifizierungs- &amp; Token-Richtlinien</span>
            </h3>
            <div class="space-y-3 text-xs">
                <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <div class="font-bold text-slate-900 dark:text-white">Auth Token Duration</div>
                        <div class="text-[11px] text-slate-500">Gültigkeit des JWT-Sitzungs-Tokens</div>
                    </div>
                    <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">1.209.600 s (14 Tage)</span>
                </div>

                <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <div class="font-bold text-slate-900 dark:text-white">OTP (One-Time-Password) Duration</div>
                        <div class="text-[11px] text-slate-500">Zeitfenster für Einmal-Passwörter</div>
                    </div>
                    <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">180 s (3 Min.) / 8 Ziffern</span>
                </div>

                <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <div class="font-bold text-slate-900 dark:text-white">Passwort-Mindestlänge</div>
                        <div class="text-[11px] text-slate-500">Mindestanforderung für PB Users</div>
                    </div>
                    <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">Mindestens 6 Zeichen</span>
                </div>

                <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <div class="font-bold text-slate-900 dark:text-white">File Token Duration</div>
                        <div class="text-[11px] text-slate-500">Sicherer Dokumenten-Download-Token</div>
                    </div>
                    <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">120 s (2 Min.)</span>
                </div>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            <h3 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Lock class="w-5 h-5 text-indigo-600" />
                <span>Zero-Trust &amp; Scope-Garantien</span>
            </h3>
            <div class="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p>
                    OrgaFlow verwendet eine strikte <strong>Hierarchical Role-Based Access Control (HRBAC)</strong> Architektur:
                </p>
                <ul class="space-y-2 list-disc list-inside">
                    <li><strong>Tenant Scoping</strong>: Jeder Betriebsleiter kann nur Daten seiner eigenen Firmen-ID modifizieren.</li>
                    <li><strong>Caregiver Isolation</strong>: Betreuer haben keinen Einblick in Finanzen, BWA oder firmenfremde Klienten.</li>
                    <li><strong>Superadmin Separation</strong>: Nur die globale Inhaber-Identität hat Zugriff auf Raw Database und System-Prompts.</li>
                </ul>
            </div>
        </div>
    </div>
</div>
