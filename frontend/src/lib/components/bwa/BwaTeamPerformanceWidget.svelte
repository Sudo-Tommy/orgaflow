<script lang="ts">
    let { userStats, onOpenTeam } = $props<any>();
</script>

<div class="bg-white rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-5 group hover:shadow-md transition-shadow">
    <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-neutral-900 flex items-center gap-3 text-lg"><span class="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-base shadow-inner">👥</span> Team-Leistung</h3>
        <button onclick={onOpenTeam} class="w-10 h-10 rounded-full bg-neutral-50 hover:bg-sky-50 text-neutral-400 hover:text-sky-600 flex items-center justify-center transition-colors shrink-0" title="Team Details"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg></button>
    </div>
    <div class="flex-1 flex flex-col gap-2.5">
        {#each userStats.slice(0, 3) as u, i}
            <button onclick={onOpenTeam} class="w-full text-left flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-100 transition-colors">
                <div class="flex items-center gap-3 min-w-0"><span class="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">{u.name?.charAt(0) || '?'}</span><span class="text-sm font-bold text-neutral-800 truncate">{u.name || 'Unbekannt'}</span></div>
                <span class="text-sm font-bold text-emerald-600 shrink-0">{u.hours.toFixed(1).replace('.', ',')} h</span>
            </button>
        {/each}
        {#if userStats.length === 0}
            <p class="text-sm text-neutral-400 italic text-center py-4">Keine Daten</p>
        {/if}
    </div>
</div>