<script lang="ts">
    import { Award } from "lucide-svelte";
    import { toastStore } from "$lib/services/toastService.svelte";

    let { usersCount = 0 }: { usersCount: number } = $props();
</script>

<div class="orga-card-white p-6 flex flex-col justify-between hover:border-rose-300 dark:hover:border-rose-500/50 transition-all shadow-sm">
    <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div class="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
                <Award class="w-6 h-6" />
            </div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                Enterprise
            </span>
        </div>

        <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Lizenz- &amp; Paketübersicht</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gebuchtes Leistungspaket, Mitarbeiter-Lizenzen und Service-Level-Agreements.
            </p>
        </div>

        <div class="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <div class="flex items-center justify-between">
                <span class="text-slate-600 dark:text-slate-400">Tarifpaket:</span>
                <span class="font-bold text-slate-900 dark:text-white">OrgaFlow Professional</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-slate-600 dark:text-slate-400">Mitarbeiterkontingent:</span>
                <span class="font-bold text-slate-900 dark:text-white">{usersCount} / Unbegrenzt</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-slate-600 dark:text-slate-400">Datenspeicherung:</span>
                <span class="font-bold text-emerald-600">Deutschland (DSGVO)</span>
            </div>
        </div>
    </div>

    <div class="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
        <button
            type="button"
            onclick={() => toastStore.info("Ihre Lizenz ist unbefristet für diesen Mandanten aktiviert.")}
            class="w-full min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
            <Award class="w-4 h-4" />
            <span>Lizenz-Details anzeigen</span>
        </button>
    </div>
</div>
