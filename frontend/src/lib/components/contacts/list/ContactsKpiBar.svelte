<script lang="ts">
    interface Props {
        totalContactsCount: number;
        linkedContactsCount: number;
        portalContactsCount: number;
        totalHomesCount: number;
        unverifiedHomesCount: number;
    }

    let {
        totalContactsCount,
        linkedContactsCount,
        portalContactsCount,
        totalHomesCount,
        unverifiedHomesCount
    }: Props = $props();
</script>

<!-- === KPI-KACHELN / STATISTIK-LEISTE === -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 animate-enter delay-100">
    <!-- Kontakte Gesamt -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xl shrink-0">
            👥
        </div>
        <div class="min-w-0">
            <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Kontakte</p>
            <p class="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{totalContactsCount}</p>
        </div>
    </div>

    <!-- Verknüpfte Kontakte -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xl shrink-0">
            🔗
        </div>
        <div class="min-w-0">
            <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Verknüpft</p>
            <p class="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{linkedContactsCount}</p>
        </div>
    </div>

    <!-- Portal-Zugänge Freigegeben -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-xl shrink-0">
            🪪
        </div>
        <div class="min-w-0">
            <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Portal aktiv</p>
            <p class="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{portalContactsCount}</p>
        </div>
    </div>

    <!-- Einrichtungen & Heime -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-3.5">
        <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center text-xl shrink-0">
                🏥
            </div>
            <div class="min-w-0">
                <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Pflegeheime</p>
                <p class="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{totalHomesCount}</p>
            </div>
        </div>
        {#if unverifiedHomesCount > 0}
            <span class="px-2 py-1 text-[11px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-xl shrink-0" title="{unverifiedHomesCount} unüberprüfte Einträge">
                {unverifiedHomesCount} neu
            </span>
        {/if}
    </div>
</div>
