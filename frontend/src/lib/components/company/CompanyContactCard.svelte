<script lang="ts">
    let { formData, logoFile = $bindable(), deleteLogo = $bindable(), existingLogoUrl, isLoading } = $props<{
        formData: any;
        logoFile: File | null;
        deleteLogo: boolean;
        existingLogoUrl: string;
        isLoading: boolean;
    }>();

    let localPreviewUrl = $derived(logoFile ? URL.createObjectURL(logoFile) : "");

    function handleFileChange(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            logoFile = target.files[0];
            deleteLogo = false;
        } else {
            logoFile = null;
        }
    }
</script>

<div class="orga-card-white p-6 md:p-8">
    <h2 class="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2 border-b border-neutral-100 pb-4">
        <span class="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-lg shadow-inner text-sm">🏢</span> Stammdaten
    </h2>
    
    <div class="space-y-4">
        <div><label for="comp-name" class="block text-sm font-semibold text-neutral-700 mb-1.5">Firmenname <span class="text-red-500">*</span></label><input id="comp-name" type="text" bind:value={formData.name} class="orga-input-clear" required disabled={isLoading} /></div>
        
        <div class="pt-2">
            <span class="block text-sm font-semibold text-neutral-700 mb-1.5">Firmenlogo (Optional)</span>
            <div class="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 flex flex-col items-center gap-4">
                {#if localPreviewUrl || (existingLogoUrl && !deleteLogo)}
                    <div class="relative bg-white p-2 rounded-lg border border-neutral-200 shadow-sm">
                        <img src={localPreviewUrl || existingLogoUrl} alt="Logo Vorschau" class="max-h-16 object-contain" />
                        <button type="button" onclick={() => { deleteLogo = true; logoFile = null; }} class="absolute -top-2 -right-2 bg-red-100 text-red-600 hover:bg-red-500 hover:text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-sm transition-colors" title="Entfernen">✕</button>
                    </div>
                {:else}
                    <div class="w-16 h-16 bg-neutral-200 rounded-lg flex items-center justify-center text-neutral-400 text-2xl">🖼️</div>
                {/if}
                <input type="file" accept="image/png, image/jpeg, image/svg+xml" class="w-full text-sm text-neutral-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors" onchange={handleFileChange} disabled={isLoading} />
            </div>
        </div>

        <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider pt-4 pb-1">Kontaktdaten</h3>
        <div><label for="comp-email" class="block text-sm font-semibold text-neutral-700 mb-1.5">E-Mail</label><input id="comp-email" type="email" bind:value={formData.email} class="orga-input-clear" disabled={isLoading} /></div>
        <div class="grid grid-cols-2 gap-4">
            <div><label for="comp-tel" class="block text-sm font-semibold text-neutral-700 mb-1.5">Telefon</label><input id="comp-tel" type="text" bind:value={formData.number_telephone} class="orga-input-clear" disabled={isLoading} /></div>
            <div><label for="comp-mob" class="block text-sm font-semibold text-neutral-700 mb-1.5">Mobil</label><input id="comp-mob" type="text" bind:value={formData.number_mobile} class="orga-input-clear" disabled={isLoading} /></div>
        </div>
        <div>
            <label for="comp-web" class="block text-sm font-semibold text-neutral-700 mb-1.5">Webseite</label>
            <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span class="text-neutral-400 text-sm font-medium">https://</span>
                </div>
                <input id="comp-web" type="text" bind:value={formData.website} class="orga-input-clear pl-16" disabled={isLoading} />
            </div>
        </div>
        <div><label for="comp-color" class="block text-sm font-semibold text-neutral-700 mb-1.5">Kalender-Farbe (Für Superadmins)</label><div class="flex items-center gap-3"><input id="comp-color" type="color" bind:value={formData.calendar_color} class="h-10 w-14 rounded cursor-pointer border border-neutral-200" disabled={isLoading} /><span class="text-xs text-neutral-500 font-mono">{formData.calendar_color}</span></div></div>
    </div>
</div>