<script lang="ts">
    interface Props {
        activeTab: "contacts" | "homes";
        filteredContactsCount: number;
        onGoogleSearch: () => void;
        onExportVCard: () => void;
        onShareQr: () => void;
        onNewContact: () => void;
        onNewHome: () => void;
    }

    let {
        activeTab,
        filteredContactsCount,
        onGoogleSearch,
        onExportVCard,
        onShareQr,
        onNewContact,
        onNewHome
    }: Props = $props();
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Kontakte & Einrichtungen</h1>
        <p class="orga-page-subtitle">Zentrale Schaltstelle für Ansprechpartner, Betreuer, Ärzte, Praxen und Pflegeeinrichtungen.</p>
    </div>
    
    <div class="flex flex-wrap items-center gap-2.5 mt-4 sm:mt-0 w-full sm:w-auto">
        <button 
            type="button" 
            onclick={onGoogleSearch} 
            class="orga-button-ghost inline-flex flex-1 sm:flex-none justify-center py-2.5 px-3.5 min-h-[44px] items-center gap-2 border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold shadow-xs cursor-pointer active:scale-95 transition-all text-xs sm:text-sm" 
            title="Arzt, Praxis oder Einrichtung live via Google ermitteln und direkt anlegen"
        >
            <span class="text-base">🔍</span>
            <span>Google-Suche</span>
        </button>

        {#if activeTab === 'contacts' && filteredContactsCount > 0}
            <button 
                type="button" 
                onclick={onExportVCard} 
                class="orga-button-ghost inline-flex flex-1 sm:flex-none justify-center py-2.5 px-3.5 min-h-[44px] items-center gap-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold shadow-xs cursor-pointer active:scale-95 transition-all text-xs sm:text-sm" 
                title="Alle gefilterten Kontakte als vCard (.vcf) herunterladen"
            >
                <span class="text-base">📥</span>
                <span>vCard Export ({filteredContactsCount})</span>
            </button>
        {/if}

        <button 
            type="button" 
            onclick={onShareQr} 
            class="orga-button-ghost inline-flex flex-1 sm:flex-none justify-center py-2.5 px-3.5 min-h-[44px] items-center gap-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold shadow-xs cursor-pointer active:scale-95 transition-all text-xs sm:text-sm" 
            title="QR-Code Vor-Ort-Freigabe"
        >
            <span class="text-base">📱</span>
            <span>QR-Freigabe</span>
        </button>

        {#if activeTab === 'contacts'}
            <button 
                type="button" 
                onclick={onNewContact} 
                class="orga-button-primary inline-flex w-full sm:w-auto justify-center py-2.5 px-4 min-h-[44px] items-center gap-2 shadow-indigo-600/20 text-xs sm:text-sm cursor-pointer"
            >
                <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                <span>Neuer Kontakt</span>
            </button>
        {:else}
            <button 
                type="button" 
                onclick={onNewHome} 
                class="orga-button-primary inline-flex w-full sm:w-auto justify-center py-2.5 px-4 min-h-[44px] items-center gap-2 shadow-teal-600/20 bg-teal-600 hover:bg-teal-700 text-xs sm:text-sm cursor-pointer"
            >
                <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                <span>Neues Pflegeheim</span>
            </button>
        {/if}
    </div>
</div>
