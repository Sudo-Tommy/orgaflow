<script lang="ts">
    import { Users, ArrowUpRight } from "lucide-svelte";

    let { activeClients = 0, pendingAdmissions = 0 }: { activeClients: number; pendingAdmissions: number } = $props();
</script>

<div class="orga-card-white p-6 flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all shadow-sm">
    <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div class="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <Users class="w-6 h-6" />
            </div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                {activeClients} aktiv
            </span>
        </div>

        <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Klienten &amp; Anmeldestatus</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Portal-Zugänge, Erstaufnahmen und Verifikation der Stammdaten.
            </p>
        </div>

        <div class="grid grid-cols-2 gap-2 text-center">
            <div class="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                <span class="text-lg font-black text-emerald-700 dark:text-emerald-400">{activeClients}</span>
                <span class="block text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase">Aktive Akten</span>
            </div>
            <div class="p-2.5 bg-amber-50/50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/40">
                <span class="text-lg font-black text-amber-700 dark:text-amber-400">{pendingAdmissions}</span>
                <span class="block text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase">Neuaufnahmen</span>
            </div>
        </div>
    </div>

    <div class="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
        <a
            href="/clients"
            class="w-full min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
        >
            <span>Klientenübersicht öffnen</span>
            <ArrowUpRight class="w-4 h-4" />
        </a>
    </div>
</div>
