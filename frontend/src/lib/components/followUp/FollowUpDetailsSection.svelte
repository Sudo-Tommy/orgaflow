<script lang="ts">
    interface Props {
        description: string;
        locationAddress: string;
        internalNotes: string;
        clientName: string;
    }

    let {
        description = $bindable(),
        locationAddress = $bindable(),
        internalNotes = $bindable(),
        clientName
    }: Props = $props();
</script>

<div class="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
    <!-- 3. Termin-Beschreibung (Neu & Editierbar vorbefüllt) -->
    <div>
        <div class="flex items-center justify-between mb-1">
            <label for="fu-description" class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Termin-Beschreibung
            </label>
            <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                Folgetermin
            </span>
        </div>
        <div class="relative">
            <input 
                id="fu-description"
                type="text" 
                bind:value={description} 
                placeholder="z. B. {clientName ? `Folgetermin: ${clientName}` : 'Termin-Beschreibung'}"
                class="orga-input-clear min-h-[44px] text-xs sm:text-sm font-semibold pl-9"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 pointer-events-none">
                📝
            </span>
        </div>
        <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Wird als Titel für den Kalender und Berichte übernommen.
        </p>
    </div>

    <!-- 4. Einsatzort / Adresse -->
    <div>
        <label for="fu-location" class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Einsatzort / Adresse
        </label>
        <div class="relative">
            <input 
                id="fu-location"
                type="text" 
                bind:value={locationAddress} 
                placeholder="Adresse des Klienten"
                class="orga-input-clear min-h-[44px] text-xs sm:text-sm pl-9"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 pointer-events-none">
                📍
            </span>
        </div>
    </div>

    <!-- 5. Kurznotiz für Folgetermin -->
    <div>
        <label for="fu-notes" class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Kurznotiz für Folgetermin (Optional)
        </label>
        <div class="relative">
            <input 
                id="fu-notes"
                type="text" 
                bind:value={internalNotes} 
                placeholder="z. B. Arztbegleitung, Einkauf, Befundbesprechung..."
                class="orga-input-clear min-h-[44px] text-xs sm:text-sm pl-9"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 pointer-events-none">
                💬
            </span>
        </div>
    </div>
</div>
