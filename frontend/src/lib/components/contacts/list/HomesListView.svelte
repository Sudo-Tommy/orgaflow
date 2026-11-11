<script lang="ts">
    import { getInitials } from "$lib/components/contacts/contactDetailHelpers";

    interface Props {
        filteredHomes: any[];
        viewMode: "table" | "grid";
        searchQuery: string;
        onOpenHome: (home: any) => void;
        onToggleVerification: (home: any, event?: Event) => void;
    }

    let {
        filteredHomes,
        viewMode,
        searchQuery,
        onOpenHome,
        onToggleVerification
    }: Props = $props();
</script>

{#if filteredHomes.length === 0}
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-xs max-w-xl mx-auto">
        <div class="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
            🏥
        </div>
        <h3 class="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 mb-2">Keine Pflegeheime gefunden</h3>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
            {#if searchQuery}
                Für die Suche „{searchQuery}“ existiert keine Einrichtung.
            {:else}
                Es sind noch keine Pflegeheime oder Seniorenresidenzen hinterlegt.
            {/if}
        </p>
        <button type="button" onclick={() => onOpenHome(undefined)} class="orga-button-primary bg-teal-600 hover:bg-teal-700 py-2.5 px-6 min-h-[44px] text-xs sm:text-sm font-bold cursor-pointer">
            + Neues Pflegeheim anlegen
        </button>
    </div>
{:else if viewMode === 'grid'}
    <!-- Grid-Ansicht Heime -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {#each filteredHomes as home (home.id)}
            <div 
                role="button" 
                tabindex="0" 
                onclick={() => onOpenHome(home)} 
                onkeydown={(e) => { if (e.key === 'Enter') onOpenHome(home); }} 
                class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700 transition-all cursor-pointer flex flex-col justify-between group"
            >
                <div>
                    <div class="flex items-start justify-between gap-3 mb-3">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center text-xl shrink-0 border border-teal-100 dark:border-teal-900/60 shadow-2xs">
                                🏥
                            </div>
                            <div class="min-w-0">
                                <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate">
                                    {home.name || 'Unbenanntes Heim'}
                                </h3>
                                {#if home.source === 'portal'}
                                    <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">🌐 Eingereicht via Portal</span>
                                {/if}
                            </div>
                        </div>
                        <label 
                            class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl text-xs cursor-pointer border shadow-2xs select-none {home.is_verified ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-bold'}"
                        >
                            <input 
                                type="checkbox" 
                                checked={!!home.is_verified} 
                                onclick={(e) => e.stopPropagation()}
                                onchange={(e) => onToggleVerification(home, e)} 
                                class="w-4 h-4 text-emerald-600 rounded cursor-pointer" 
                            />
                            <span>{home.is_verified ? '✓ Geprüft' : '⚠️ Ungeprüft'}</span>
                        </label>
                    </div>

                    <div class="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 py-2 border-t border-slate-100 dark:border-slate-800/80">
                        <p class="truncate">📍 {home.address || 'Keine Adresse hinterlegt'}</p>
                        {#if home.address_addition}<p class="text-[11px] text-slate-400 truncate">{home.address_addition}</p>{/if}
                        {#if home.phone}<p class="font-mono">📞 {home.phone}</p>{/if}
                        {#if home.email}<p class="text-emerald-600 dark:text-emerald-400 truncate">✉️ {home.email}</p>{/if}
                    </div>
                </div>

                <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 mt-2">
                    <div class="flex items-center gap-1">
                        {#if home.phone}
                            <a href="tel:{home.phone}" onclick={(e) => e.stopPropagation()} class="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 flex items-center justify-center shadow-2xs" title="Anrufen">📞</a>
                        {/if}
                        {#if home.email}
                            <a href="mailto:{home.email}" onclick={(e) => e.stopPropagation()} class="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 flex items-center justify-center shadow-2xs" title="E-Mail schreiben">✉️</a>
                        {/if}
                        {#if home.website}
                            <a href={home.website} target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 flex items-center justify-center shadow-2xs" title="Webseite öffnen">🌐</a>
                        {/if}
                        {#if home.address}
                            <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${home.name}, ${home.address}`)}" target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 flex items-center justify-center shadow-2xs" title="Google Maps Route">🗺️</a>
                        {/if}
                    </div>

                    <div class="text-[11px] text-slate-500 font-bold">
                        {#if home.expand?.contacts && home.expand.contacts.length > 0}
                            <span>👥 {home.expand.contacts.length} Kontakte</span>
                        {:else}
                            <span class="italic text-slate-400">0 Kontakte</span>
                        {/if}
                    </div>
                </div>
            </div>
        {/each}
    </div>
{:else}
    <!-- Tabellen-Ansicht Heime -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-left border-collapse min-w-160">
                <thead class="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/80">
                    <tr>
                        <th class="p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Einrichtung</th>
                        <th class="p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Adresse</th>
                        <th class="p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Prüfstatus</th>
                        <th class="p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Ansprechpartner</th>
                        <th class="p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider text-right">Schnellzugriff</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                    {#each filteredHomes as home (home.id)}
                        <tr onclick={() => onOpenHome(home)} class="hover:bg-teal-50/50 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer">
                            <td class="p-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center text-lg shrink-0 border border-teal-100 dark:border-teal-900/60 shadow-2xs">
                                        🏥
                                    </div>
                                    <div>
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <p class="font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{home.name || 'Unbenannt'}</p>
                                            {#if home.source === 'portal'}
                                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                    🌐 Portal
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td class="p-4 text-xs text-slate-600 dark:text-slate-300">
                                <p class="font-medium text-slate-900 dark:text-slate-200">{home.address || '-'}</p>
                                {#if home.address_addition}<p class="text-[11px] text-slate-400 mt-0.5">{home.address_addition}</p>{/if}
                            </td>
                            <td class="p-4">
                                <label class="inline-flex items-center gap-2 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-semibold cursor-pointer transition-all border shadow-2xs select-none {home.is_verified ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-bold hover:bg-amber-100'}">
                                    <input 
                                        type="checkbox" 
                                        checked={!!home.is_verified} 
                                        onclick={(e) => e.stopPropagation()}
                                        onchange={(e) => onToggleVerification(home, e)} 
                                        class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer" 
                                    />
                                    <span>{home.is_verified ? '✓ Überprüft' : '⚠️ Ungeprüft'}</span>
                                </label>
                            </td>
                            <td class="p-4">
                                {#if home.expand?.contacts && home.expand.contacts.length > 0}
                                    <div class="flex -space-x-2 overflow-hidden">
                                        {#each home.expand.contacts.slice(0, 3) as hc}
                                            <div class="flex h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-200 dark:bg-slate-700 items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200" title="{hc.name_first || ''} {hc.name_last || ''}">
                                                {getInitials(hc.name_first, hc.name_last, hc.company_name)}
                                            </div>
                                        {/each}
                                        {#if home.expand.contacts.length > 3}
                                            <div class="flex h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800 items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                +{home.expand.contacts.length - 3}
                                            </div>
                                        {/if}
                                    </div>
                                {:else}
                                    <p class="text-xs text-slate-400 italic">Keine</p>
                                {/if}
                            </td>
                            <td class="p-4">
                                <div class="flex items-center justify-end gap-1">
                                    {#if home.phone}
                                        <a href="tel:{home.phone}" onclick={(e) => e.stopPropagation()} class="p-2 min-h-[38px] min-w-[38px] text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center" title="Anrufen"><span class="text-base">📞</span></a>
                                    {/if}
                                    {#if home.email}
                                        <a href="mailto:{home.email}" onclick={(e) => e.stopPropagation()} class="p-2 min-h-[38px] min-w-[38px] text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center" title="E-Mail"><span class="text-base">✉️</span></a>
                                    {/if}
                                    {#if home.website}
                                        <a href={home.website} target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="p-2 min-h-[38px] min-w-[38px] text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center" title="Webseite"><span class="text-base">🌐</span></a>
                                    {/if}
                                    {#if home.address}
                                        <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${home.name}, ${home.address}`)}" target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="p-2 min-h-[38px] min-w-[38px] text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center" title="Google Maps"><span class="text-base">🗺️</span></a>
                                    {/if}
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
{/if}
