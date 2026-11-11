<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import type { ClientRecord, RetirementHomeRecord } from "$lib/types/orgaTypes";
    import type { ContactModalState } from "./contactModalState.svelte";
    import { autoGrow } from "$lib/actions/autoGrow";
    import ContactSignaturePad from "./ContactSignaturePad.svelte";
    import ContactDocumentsSection from "./ContactDocumentsSection.svelte";
    import ContactBasicInfoFields from "./ContactBasicInfoFields.svelte";
    import ContactAssignmentsSection from "./ContactAssignmentsSection.svelte";

    let { 
        state, 
        dialog,
        onCancel,
        onGoogleLookup
    }: { 
        state: ContactModalState; 
        dialog?: HTMLDialogElement;
        onCancel?: () => void;
        onGoogleLookup?: (query: string) => void;
    } = $props();

    let filteredClients = $derived.by(() => {
        const list = ((orgaStore.clients?.data || []) as ClientRecord[]);
        if (!state.clientSearchFilter.trim()) return list;
        const q = state.clientSearchFilter.toLowerCase();
        return list.filter(c => 
            (c.name_first || '').toLowerCase().includes(q) ||
            (c.name_last || '').toLowerCase().includes(q) ||
            (c.city || '').toLowerCase().includes(q)
        );
    });

    let filteredHomes = $derived.by(() => {
        const list = ((orgaStore.retirement_homes?.data || []) as RetirementHomeRecord[]);
        if (!state.homeSearchFilter.trim()) return list;
        const q = state.homeSearchFilter.toLowerCase();
        return list.filter(h => 
            (h.name || '').toLowerCase().includes(q) ||
            (h.address || '').toLowerCase().includes(q) ||
            (h.city || '').toLowerCase().includes(q)
        );
    });

    function triggerGoogleSearch() {
        const query = state.company_name || `${state.name_first} ${state.name_last}`.trim() || state.city;
        if (onGoogleLookup) onGoogleLookup(query);
    }
</script>

<form onsubmit={(e) => state.onSubmit(e, dialog)} class="space-y-5 sm:space-y-6">
    <!-- Google-Lookup-Banner -->
    {#if onGoogleLookup}
        <div class="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-950 p-3.5 sm:p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div class="flex items-center gap-3">
                <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg sm:text-xl shrink-0 shadow-2xs">🔍</span>
                <div>
                    <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Arzt, Praxis oder Einrichtung via Google suchen?</p>
                    <p class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Automatische Übernahme von Anschrift, Telefon und E-Mail.</p>
                </div>
            </div>
            <button 
                type="button" 
                onclick={triggerGoogleSearch}
                class="w-full sm:w-auto px-3.5 py-2 min-h-[38px] text-xs font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
            >
                <span>Google-Suche öffnen</span>
            </button>
        </div>
    {/if}

    <!-- Basisdaten & Anschrift (inkl. Schnellsuche im Firmenfeld) -->
    <ContactBasicInfoFields {state} {onGoogleLookup} />

    <!-- Notizen (Auto-Grow ohne inneren Scrollbar) -->
    <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
        <label for="contact-notes" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Notizen & Besonderheiten</label>
        <textarea use:autoGrow id="contact-notes" bind:value={state.notes} placeholder="z. B. Sprechzeiten, Facharzt-Bereich, Beziehungsstatus zum Klienten..." class="auto-grow orga-input-clear resize-none overflow-hidden min-h-20 text-xs sm:text-sm" rows="3" disabled={state.isLoading}></textarea>
    </div>

    <!-- Zuweisungen (Standardmäßig zugeklappte Akkordeons) -->
    <ContactAssignmentsSection {state} {filteredClients} {filteredHomes} />

    <!-- Signatur-Pad (Immer direkt sichtbares Zeichenfeld oder Upload) -->
    <ContactSignaturePad {state} />

    <!-- Dokumente & Nachweise (Upload von Vollmachten, Ausweisen, Nachweisen bis 15 MB) -->
    <ContactDocumentsSection {state} />

    <!-- Sticky Formular-Footer -->
    <div class="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-3.5 sm:py-4 border-t border-slate-200/80 dark:border-slate-800 z-20 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 rounded-b-3xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-lg shadow-black/5">
        {#if state.editId}
            <button 
                type="button" 
                onclick={() => state.onDelete(dialog)} 
                class="w-full sm:w-auto min-h-[42px] px-4 py-2 text-xs sm:text-sm font-bold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5" 
                disabled={state.isLoading}
            >
                <span>🗑️</span> Kontakt löschen
            </button>
        {:else}
            <div class="hidden sm:block"></div>
        {/if}
        <div class="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button 
                type="button" 
                onclick={() => {
                    if (onCancel) onCancel();
                    else state.cancelEdit(dialog);
                }} 
                class="orga-button-ghost w-full sm:w-auto min-h-[42px] py-2 px-5 font-bold cursor-pointer text-xs sm:text-sm" 
                disabled={state.isLoading}
            >
                Abbrechen
            </button>
            <button 
                type="submit" 
                class="orga-button-primary w-full sm:w-auto min-h-[42px] py-2 px-6 font-bold cursor-pointer shadow-indigo-600/20 text-xs sm:text-sm" 
                disabled={state.isLoading}
            >
                {#if state.isLoading}
                    <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                    <span>Speichert...</span>
                {:else}
                    <span>✓ Kontakt speichern</span>
                {/if}
            </button>
        </div>
    </div>
</form>
