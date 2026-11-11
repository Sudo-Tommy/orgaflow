<script lang="ts">
    let {
        appDate = $bindable(""),
        appTime = $bindable(""),
        appLocation = $bindable(""),
        appDesc = $bindable(""),
        isSending = false
    }: {
        appDate: string;
        appTime: string;
        appLocation: string;
        appDesc: string;
        isSending: boolean;
    } = $props();
</script>

<div class="p-4 bg-brand-50 border border-brand-100 rounded-2xl animate-enter">
    <h3 class="font-bold text-brand-900 text-sm mb-1">Sichtbare Termindaten anpassen</h3>
    <p class="text-xs text-brand-700 mb-4">Ändern Sie die Daten nur für diese Benachrichtigung, ohne den Original-Termin zu überschreiben.</p>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
            <label for="rem-app-date" class="block text-[11px] font-bold text-brand-800 uppercase tracking-wider mb-1.5">Datum</label>
            <input id="rem-app-date" type="text" bind:value={appDate} class="orga-input-clear min-h-12 text-sm bg-white border-brand-200 focus:ring-brand-500" disabled={isSending} />
        </div>
        <div>
            <label for="rem-app-time" class="block text-[11px] font-bold text-brand-800 uppercase tracking-wider mb-1.5">Uhrzeit</label>
            <input id="rem-app-time" type="text" bind:value={appTime} class="orga-input-clear min-h-12 text-sm bg-white border-brand-200 focus:ring-brand-500" disabled={isSending} />
        </div>
    </div>
    <div class="mb-4">
        <label for="rem-app-location" class="block text-[11px] font-bold text-brand-800 uppercase tracking-wider mb-1.5">Ort</label>
        <textarea id="rem-app-location" bind:value={appLocation} rows="2" class="orga-input-clear min-h-12 py-3 text-sm resize-none custom-scrollbar bg-white border-brand-200 focus:ring-brand-500" disabled={isSending}></textarea>
    </div>
    <div>
        <label for="rem-app-desc" class="block text-[11px] font-bold text-brand-800 uppercase tracking-wider mb-1.5">Anliegen / Beschreibung</label>
        <textarea id="rem-app-desc" bind:value={appDesc} rows="2" class="orga-input-clear min-h-12 py-3 text-sm resize-none custom-scrollbar bg-white border-brand-200 focus:ring-brand-500" disabled={isSending}></textarea>
    </div>
</div>
