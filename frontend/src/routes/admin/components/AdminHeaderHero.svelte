<script lang="ts">
    import { Radio } from "lucide-svelte";

    let {
        canAccessGodMode = false,
        onOpenLogs,
        onOpenFinance,
        onOpenControl
    }: {
        canAccessGodMode: boolean;
        onOpenLogs: () => void;
        onOpenFinance: () => void;
        onOpenControl: () => void;
    } = $props();
</script>

<div class="orga-card-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
            <div class="flex items-center gap-3 flex-wrap">
                <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                    <span class="text-2xl sm:text-3xl">⚙️</span>
                    <span>System-Administration</span>
                </h1>
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 shadow-2xs">
                    <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>System aktiv</span>
                </div>
            </div>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
                Zentrale Verwaltung für System-Status, Sicherheitsrichtlinien, Rohdaten-Tabellen und administrative Module.
            </p>
        </div>

        <!-- Schnellaktionen (Live-Logs, Finanzprognose, Notfallsteuerung) -->
        <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <button
                type="button"
                onclick={onOpenLogs}
                class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs min-h-[44px]"
                title="Live Server- und Audit-Logs anzeigen"
            >
                <Radio class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Live-Logs</span>
            </button>

            <button
                type="button"
                onclick={onOpenFinance}
                class="px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs min-h-[44px]"
                title="Konsolidierte Finanzprognose öffnen"
            >
                <span>🔮</span>
                <span>Finanzprognose</span>
            </button>

            {#if canAccessGodMode}
                <button
                    type="button"
                    onclick={onOpenControl}
                    class="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm shadow-indigo-600/20 min-h-[44px]"
                    title="Erweiterte Notfall- und Systemsteuerung öffnen"
                >
                    <span>🎛️</span>
                    <span>System-Kontrolle</span>
                </button>
            {/if}
        </div>
    </div>
</div>
