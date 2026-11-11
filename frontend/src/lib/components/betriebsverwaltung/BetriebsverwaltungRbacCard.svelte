<script lang="ts">
    import { ShieldCheck, KeyRound } from "lucide-svelte";
</script>

<div class="orga-card-white p-6 flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-500/50 transition-all shadow-sm">
    <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div class="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                <ShieldCheck class="w-6 h-6" />
            </div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                HRBAC aktiv
            </span>
        </div>

        <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Ansichtsberechtigungen &amp; Rollen</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Hierarchische Rollenabsicherung (HRBAC): Inhaber, Betriebsleitung, Mitarbeiter und Portal-Gäste.
            </p>
        </div>

        <div class="space-y-1.5 text-xs">
            <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                <span class="font-bold text-slate-800 dark:text-slate-200">👑 Inhaber (Superadmin)</span>
                <span class="text-[11px] text-emerald-600 font-bold">Vollzugriff</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                <span class="font-bold text-slate-800 dark:text-slate-200">🏢 Betriebsleiter (Admin)</span>
                <span class="text-[11px] text-blue-600 font-bold">Mandant</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                <span class="font-bold text-slate-800 dark:text-slate-200">💼 Außendienst (User)</span>
                <span class="text-[11px] text-slate-500 font-bold">Zugeordnet</span>
            </div>
        </div>
    </div>

    <div class="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
        <a
            href="/admin/iam"
            class="w-full min-h-[44px] px-4 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
            <KeyRound class="w-4 h-4" />
            <span>IAM-Rollenmatrix öffnen</span>
        </a>
    </div>
</div>
