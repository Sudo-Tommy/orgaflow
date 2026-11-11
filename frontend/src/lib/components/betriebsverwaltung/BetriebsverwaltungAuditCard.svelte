<script lang="ts">
    import { FileCheck, ArrowUpRight } from "lucide-svelte";
</script>

<div class="orga-card-white p-6 flex flex-col justify-between hover:border-amber-300 dark:hover:border-amber-500/50 transition-all shadow-sm">
    <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div class="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                <FileCheck class="w-6 h-6" />
            </div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                Unveränderbar
            </span>
        </div>

        <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">System-Auditlogs</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                GoBD-konforme Historisierung aller Schreib- und Zeiterfassungs-Transaktionen.
            </p>
        </div>

        <div class="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <div class="flex items-center justify-between">
                <span class="text-slate-600 dark:text-slate-400">Protokollierungsstatus:</span>
                <span class="font-bold text-emerald-600">Aktiv &amp; verifiziert</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-slate-600 dark:text-slate-400">Zeiterfassungs-Audit:</span>
                <span class="font-bold text-slate-800 dark:text-slate-200">Revisionssicher</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-slate-600 dark:text-slate-400">DSGVO Löschfristen:</span>
                <span class="font-bold text-slate-800 dark:text-slate-200">Konform</span>
            </div>
        </div>
    </div>

    <div class="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
        <a
            href="/admin"
            class="w-full min-h-[44px] px-4 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
            <span>System-Protokolle einsehen</span>
            <ArrowUpRight class="w-4 h-4" />
        </a>
    </div>
</div>
