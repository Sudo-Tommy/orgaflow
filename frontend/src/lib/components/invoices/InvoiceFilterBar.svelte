<script lang="ts">
    import { Search, Hourglass } from "lucide-svelte";

    let {
        searchQuery = $bindable(''),
        statusFilter = $bindable('all')
    }: {
        searchQuery?: string;
        statusFilter?: string;
    } = $props();
</script>

<div class="px-4 sm:px-6 mb-4 animate-enter delay-100">
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2 rounded-2xl border border-neutral-200 shadow-sm w-full">
        <div class="flex-1 relative">
            <span class="absolute inset-y-0 left-3 flex items-center text-neutral-400 text-base"><Search class="w-4 h-4" /></span>
            <input 
                id="search-inv"
                type="text" 
                aria-label="Rechnungen durchsuchen"
                bind:value={searchQuery} 
                placeholder="Rechnungsnummer, Klient..." 
                class="w-full bg-transparent border-none py-3 min-h-12 pl-9 pr-3 text-sm focus:ring-0 outline-none text-neutral-800 placeholder:text-neutral-400 rounded-xl"
            />
        </div>
        <div class="w-px h-8 hidden sm:block bg-neutral-200" aria-hidden="true"></div>
        <div class="w-full sm:w-48 shrink-0 relative border-t sm:border-t-0 border-neutral-100 pt-2 sm:pt-0">
            <span class="absolute inset-y-0 left-3 flex items-center text-neutral-400 text-base"><Hourglass class="w-4 h-4" /></span>
            <select id="status-filter" aria-label="Status Filter" bind:value={statusFilter} class="w-full min-h-12 bg-transparent border-none py-3 pl-9 pr-3 text-sm focus:ring-0 outline-none cursor-pointer font-semibold text-neutral-700 appearance-none rounded-xl">
                <option value="all">Alle Status anzeigen</option>
                <option value="Entwurf">Entwurf</option>
                <option value="Eingereicht">Eingereicht</option>
                <option value="In Bearbeitung">In Bearbeitung</option>
                <option value="Teilweise bezahlt">Teilweise bezahlt</option>
                <option value="Abgeschlossen">Abgeschlossen (Bezahlt)</option>
                <option value="Abgelehnt">Abgelehnt</option>
                <option value="Storniert">Storniert</option>
            </select>
        </div>
    </div>
</div>
