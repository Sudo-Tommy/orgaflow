<script lang="ts">
    let { formData, isLoading } = $props<{
        formData: any;
        isLoading: boolean;
    }>();
</script>

<div class="orga-card-white p-6 md:p-8">
    <div class="flex items-center justify-between mb-6 border-b border-neutral-100 pb-4">
        <h2 class="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <span class="w-8 h-8 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-lg shadow-inner text-sm">📍</span> Hauptstandort
        </h2>
        {#if formData.street || formData.city}
            <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${formData.street || ''} ${formData.housenr || ''}, ${formData.zip || ''} ${formData.city || ''}`)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors border border-blue-200 shadow-sm active:scale-95">
                <span>🗺️</span> Auf Karte prüfen
            </a>
        {/if}
    </div>
    
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="sm:col-span-3"><label for="comp-street" class="block text-sm font-semibold text-neutral-700 mb-1.5">Straße <span class="text-red-500">*</span></label><input id="comp-street" type="text" bind:value={formData.street} class="orga-input-clear" required disabled={isLoading} /></div>
        <div><label for="comp-housenr" class="block text-sm font-semibold text-neutral-700 mb-1.5">Hausnr. <span class="text-red-500">*</span></label><input id="comp-housenr" type="text" bind:value={formData.housenr} class="orga-input-clear" required disabled={isLoading} /></div>
        <div class="sm:col-span-1"><label for="comp-zip" class="block text-sm font-semibold text-neutral-700 mb-1.5">PLZ <span class="text-red-500">*</span></label><input id="comp-zip" type="text" bind:value={formData.zip} class="orga-input-clear" required disabled={isLoading} /></div>
        <div class="sm:col-span-3"><label for="comp-city" class="block text-sm font-semibold text-neutral-700 mb-1.5">Stadt <span class="text-red-500">*</span></label><input id="comp-city" type="text" bind:value={formData.city} class="orga-input-clear" required disabled={isLoading} /></div>
    </div>
</div>