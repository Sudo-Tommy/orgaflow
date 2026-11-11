<script lang="ts">
    interface Props {
        totalCount: number;
        inProgressCount: number;
        plannedCount: number;
        implementedCount: number;
    }

    let { totalCount, inProgressCount, plannedCount, implementedCount }: Props = $props();
</script>

<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Gesamt</span>
        <div class="flex items-baseline justify-between">
            <span class="text-2xl font-black text-slate-900">{totalCount}</span>
            <span class="text-xs text-slate-500 font-medium">Vorschläge</span>
        </div>
    </div>

    <div class="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-200/80 shadow-xs">
        <div class="flex items-center justify-between mb-1">
            <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-700">In Bearbeitung</span>
            <span class="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
        </div>
        <div class="flex items-baseline justify-between">
            <span class="text-2xl font-black text-indigo-900">{inProgressCount}</span>
            <span class="text-[11px] font-bold text-indigo-700">Bereit für Synthese</span>
        </div>
    </div>

    <div class="bg-blue-50/70 rounded-2xl p-4 border border-blue-200/80 shadow-xs">
        <span class="text-[11px] font-bold uppercase tracking-wider text-blue-700 block mb-1">Geplant</span>
        <div class="flex items-baseline justify-between">
            <span class="text-2xl font-black text-blue-900">{plannedCount}</span>
            <span class="text-xs text-blue-600 font-medium">in Pipeline</span>
        </div>
    </div>

    <div class="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/80 shadow-xs">
        <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">Umgesetzt</span>
        <div class="flex items-baseline justify-between">
            <span class="text-2xl font-black text-emerald-900">{implementedCount}</span>
            <span class="text-xs text-emerald-600 font-medium">Erledigt</span>
        </div>
    </div>
</div>
