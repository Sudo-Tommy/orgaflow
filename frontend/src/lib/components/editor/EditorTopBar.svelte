<script lang="ts">
    let { title = $bindable(), type = $bindable(), saveMessage, isSaving, onSave, onAdd } = $props<{
        title: string;
        type: string;
        saveMessage: string;
        isSaving: boolean;
        onSave: () => void;
        onAdd: (type: 'text' | 'logo' | 'table') => void;
    }>();
</script>

<!-- Wird nun als linkes Menü (Sidebar) gerendert, Dateiname historisch bedingt -->
<aside class="bg-neutral-950 text-neutral-400 w-64 md:w-72 flex flex-col border-r border-neutral-900 shrink-0 h-full shadow-2xl z-20 relative overflow-hidden">
    <!-- Subtiler Hintergrund-Glow für mehr Tiefe -->
    <div class="absolute top-0 left-0 w-full h-32 bg-indigo-500/5 blur-3xl pointer-events-none"></div>

    <!-- Back Button & Header -->
    <div class="p-5 border-b border-neutral-900/80 flex items-center gap-4 relative z-10">
        <a href="/documents" class="w-10 h-10 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl transition-colors shadow-sm border border-neutral-800" title="Zurück zur Übersicht">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </a>
        <div>
            <h1 class="font-bold text-white text-lg leading-tight">Editor</h1>
            <p class="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Vorlagen-Design</p>
        </div>
    </div>
    
    <div class="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8 relative z-10">
        <!-- Dokumenten-Einstellungen -->
        <div class="space-y-4">
            <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-500">Dokument</h3>
            
            <div>
                <label for="doc-title" class="block text-xs font-semibold text-neutral-400 mb-1.5">Titel der Vorlage</label>
                <input 
                    id="doc-title"
                    type="text" 
                    bind:value={title} 
                    class="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors" 
                    placeholder="z.B. Standard Rechnung"
                />
            </div>
            
            <div>
                <label for="doc-type" class="block text-xs font-semibold text-neutral-400 mb-1.5">Dokumententyp</label>
                <div class="relative">
                    <select id="doc-type" bind:value={type} class="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer appearance-none">
                        <option value="rechnung">Rechnung</option>
                        <option value="arbeitszeitnachweis">Arbeitszeitnachweis</option>
                        <option value="allgemein">Brief / Allgemein</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-neutral-500">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="h-px w-full bg-neutral-900"></div>
        
        <!-- Elemente hinzufügen -->
        <div class="space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Elemente einfügen</h3>
            
            <button onclick={() => onAdd('text')} class="w-full flex items-center gap-3 p-3 rounded-xl bg-neutral-900/40 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-all group shadow-sm hover:shadow-md">
                <div class="w-10 h-10 rounded-lg bg-neutral-800 group-hover:bg-indigo-500/20 text-neutral-300 group-hover:text-indigo-400 flex items-center justify-center text-xl shadow-inner transition-colors border border-neutral-700 group-hover:border-indigo-500/30">T</div>
                <div class="text-left">
                    <p class="text-sm font-bold text-neutral-200 group-hover:text-white transition-colors">Textfeld</p>
                    <p class="text-[10px] text-neutral-500 group-hover:text-neutral-400 transition-colors">Für Variablen & Fließtext</p>
                </div>
            </button>
            
            <button onclick={() => onAdd('logo')} class="w-full flex items-center gap-3 p-3 rounded-xl bg-neutral-900/40 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-all group shadow-sm hover:shadow-md">
                <div class="w-10 h-10 rounded-lg bg-neutral-800 group-hover:bg-emerald-500/20 text-neutral-300 group-hover:text-emerald-400 flex items-center justify-center text-xl shadow-inner transition-colors border border-neutral-700 group-hover:border-emerald-500/30">🖼️</div>
                <div class="text-left">
                    <p class="text-sm font-bold text-neutral-200 group-hover:text-white transition-colors">Firmenlogo</p>
                    <p class="text-[10px] text-neutral-500 group-hover:text-neutral-400 transition-colors">Lädt Ihr hinterlegtes Logo</p>
                </div>
            </button>
            
            <button onclick={() => onAdd('table')} class="w-full flex items-center gap-3 p-3 rounded-xl bg-neutral-900/40 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-all group shadow-sm hover:shadow-md">
                <div class="w-10 h-10 rounded-lg bg-neutral-800 group-hover:bg-amber-500/20 text-neutral-300 group-hover:text-amber-400 flex items-center justify-center text-xl shadow-inner transition-colors border border-neutral-700 group-hover:border-amber-500/30">📊</div>
                <div class="text-left">
                    <p class="text-sm font-bold text-neutral-200 group-hover:text-white transition-colors">Tabelle</p>
                    <p class="text-[10px] text-neutral-500 group-hover:text-neutral-400 transition-colors">Für Rechnungspositionen</p>
                </div>
            </button>
        </div>
    </div>
    
    <!-- Speichern Bereich -->
    <div class="p-5 border-t border-neutral-900 bg-neutral-950/80 shrink-0 relative z-10">
        {#if saveMessage}
            <div class="mb-3 flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg bg-neutral-900 border {saveMessage.includes('Fehler') ? 'text-rose-400 border-rose-900/50' : 'text-emerald-400 border-emerald-900/50'} animate-enter">
                <span>{saveMessage.includes('Fehler') ? '❌' : '✅'}</span>
                {saveMessage}
            </div>
        {/if}
        <button onclick={onSave} disabled={isSaving} class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
            {#if isSaving}
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Speichert...
            {:else}
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                Vorlage speichern
            {/if}
        </button>
    </div>
</aside>