<script lang="ts">
    import { Building2, ArrowUpRight } from "lucide-svelte";

    let { companies = [] }: { companies: any[] } = $props();
</script>

<div class="orga-card-white p-6 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all shadow-sm">
    <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div class="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                <Building2 class="w-6 h-6" />
            </div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {companies.length} Mandant{companies.length === 1 ? '' : 'en'}
            </span>
        </div>

        <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Angemeldete Mandanten</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Unternehmensstrukturen, Briefkopf-Konfigurationen und Abrechnungs-IK-Nummern.
            </p>
        </div>

        <div class="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
            {#each companies.slice(0, 2) as comp}
                <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-slate-800 dark:text-slate-200 truncate">{comp.name}</span>
                    <span class="text-[10px] text-slate-500 font-mono">{comp.city || 'Standard'}</span>
                </div>
            {:else}
                <p class="text-xs text-slate-400 italic">Keine Firmen hinterlegt</p>
            {/each}
        </div>
    </div>

    <div class="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
        <a
            href="/company"
            class="w-full min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
            <span>Firmendaten bearbeiten</span>
            <ArrowUpRight class="w-4 h-4" />
        </a>
    </div>
</div>
