<script lang="ts">
    import type { ContactRecord } from '$lib/types/orgaTypes';
    import { useGoogleContactSelection, type OpenGoogleContactParams } from './useGoogleContactSelection.svelte';
    import GoogleContactEditForm from './GoogleContactEditForm.svelte';

    let dialog = $state<HTMLDialogElement>();
    const controller = useGoogleContactSelection();

    $effect(() => {
        if (controller.isOpen && dialog && !dialog.open) {
            dialog.showModal();
        } else if (!controller.isOpen && dialog && dialog.open) {
            dialog.close();
        }
    });

    export function open(params: OpenGoogleContactParams): Promise<ContactRecord | null> {
        return controller.open(dialog, params);
    }

    export function close(result: ContactRecord | null = null) {
        controller.close(dialog, result);
    }
</script>

<dialog 
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-xs w-full max-w-2xl mx-auto my-6 sm:my-10 rounded-2xl border-0 overflow-visible z-[999999]"
    onclick={(e) => { if (e.target === dialog) close(null); }}
    oncancel={(e) => { e.preventDefault(); close(null); }}
>
    {#if controller.isOpen}
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-slate-800 w-full max-w-2xl flex flex-col animate-in zoom-in-95 duration-200">
        
        <!-- Header -->
        <div class="p-4 sm:p-5 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/80 via-neutral-50 to-white dark:from-slate-850 dark:via-slate-900 dark:to-slate-900">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                    {controller.searchType === 'location' ? '📍' : '🩺'}
                </div>
                <div>
                    <h2 class="text-base font-bold text-neutral-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{controller.searchType === 'location' ? 'Ort / Zieladresse ermitteln' : 'Kontakt / Arzt ermitteln'}</span>
                        <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold border border-blue-200 dark:border-blue-800">Schnellsuche</span>
                    </h2>
                    <p class="text-xs text-neutral-500 dark:text-slate-400">
                        {controller.searchType === 'location' ? 'Aus Zieladresse einen Kontakt im System anlegen.' : 'Prüfen, ergänzen und direkt mit Klient & Anfrage verknüpfen.'}
                    </p>
                </div>
            </div>
            <button 
                type="button" 
                onclick={() => close(null)}
                class="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Schließen"
            >✕</button>
        </div>

        <!-- Suchleiste & Filter (Non-Blocking) -->
        <div class="p-3 sm:p-4 bg-neutral-50 dark:bg-slate-850 border-b border-neutral-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-2">
            <div class="flex-1 w-full relative">
                <input 
                    type="text" 
                    bind:value={controller.searchQuery} 
                    placeholder="Arztname, Praxis oder Einrichtung..."
                    class="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 shadow-2xs font-medium"
                    onkeydown={(e) => e.key === 'Enter' && controller.performSearch()}
                />
                <span class="absolute left-2.5 top-2.5 text-neutral-400 text-xs">🔍</span>
            </div>
            <div class="w-full sm:w-44 relative">
                <input 
                    type="text" 
                    bind:value={controller.searchLocation} 
                    placeholder="Stadt / PLZ..."
                    class="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 shadow-2xs font-medium"
                    onkeydown={(e) => e.key === 'Enter' && controller.performSearch()}
                />
                <span class="absolute left-2.5 top-2.5 text-neutral-400 text-xs">📍</span>
            </div>
            <button 
                type="button" 
                onclick={() => controller.performSearch()}
                disabled={controller.isLoading}
                class="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95"
            >
                {#if controller.isLoading}
                    <svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                    <span>Sucht...</span>
                {:else}
                    <span>Google-Suche</span>
                {/if}
            </button>
        </div>

        <!-- Non-Blocking Ladehinweis -->
        {#if controller.isLoading}
            <div class="px-5 py-2.5 bg-blue-50/70 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-300">
                <svg class="animate-spin w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                <span>Google-Recherche läuft im Hintergrund... Sie können die Daten unten bereits prüfen und bearbeiten.</span>
            </div>
        {/if}

        <!-- Duplikats-Hinweis: Bereits in PocketBase vorhanden -->
        {#if controller.existingContact}
            <div class="mx-5 mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3 text-xs">
                <div>
                    <span class="font-bold text-amber-900 dark:text-amber-200 block">Bereits in OrgaFlow vorhanden:</span>
                    <span class="text-amber-700 dark:text-amber-300">
                        {controller.existingContact.company_name || `${controller.existingContact.name_first || ''} ${controller.existingContact.name_last}`} &bull; {controller.existingContact.city || ''}
                    </span>
                </div>
                <button 
                    type="button" 
                    onclick={() => close(controller.existingContact)}
                    class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shrink-0 transition-colors shadow-2xs"
                >
                    Vorhandenen übernehmen
                </button>
            </div>
        {/if}

        <!-- Content Area: Formular ist sofort sichtbar und bedienbar -->
        <div class="flex-1 p-5 space-y-4">
            <!-- Gefundene Google-Treffer (falls vorhanden) -->
            {#if controller.results.length > 0}
                <div>
                    <span class="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-slate-400 block mb-2">
                        Gefundene Google-Ergebnisse ({controller.results.length}):
                    </span>
                    <div class="grid grid-cols-1 gap-2">
                        {#each controller.results as res, idx}
                            <button 
                                type="button" 
                                onclick={() => controller.selectResult(idx)}
                                class="w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 {controller.selectedIndex === idx ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-xs ring-1 ring-blue-500/30' : 'border-neutral-200 dark:border-slate-800 hover:border-neutral-300 bg-white dark:bg-slate-850'}"
                            >
                                <div class="space-y-1">
                                    <div class="flex items-center gap-2">
                                        <span class="font-bold text-sm text-neutral-900 dark:text-slate-100">
                                            {res.company_name || `${res.name_first || ''} ${res.name_last || ''}`.trim()}
                                        </span>
                                        {#if res.category}
                                            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-slate-700">
                                                {res.category}
                                            </span>
                                        {/if}
                                    </div>
                                    <p class="text-xs text-neutral-500 dark:text-slate-400 flex items-center gap-1">
                                        <span>📍</span>
                                        <span>{res.street} {res.housenr}, {res.zip} {res.city}</span>
                                    </p>
                                    <div class="flex flex-wrap items-center gap-3 text-xs text-neutral-600 dark:text-slate-300 pt-0.5">
                                        {#if res.phone}<span class="font-mono text-[11px]">📞 {res.phone}</span>{/if}
                                        {#if res.email}<span class="text-[11px] text-blue-600">✉️ {res.email}</span>{/if}
                                    </div>
                                </div>
                                <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 {controller.selectedIndex === idx ? 'bg-blue-600 text-white' : 'border border-neutral-300 dark:border-slate-700 text-neutral-400'}">
                                    {controller.selectedIndex === idx ? '✓' : ''}
                                </span>
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Direkt editierbares Kontaktformular -->
            <GoogleContactEditForm bind:form={controller.form} />
        </div>

        <!-- Footer Actions -->
        <div class="p-4 bg-neutral-50 dark:bg-slate-850 border-t border-neutral-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <button 
                type="button" 
                onclick={() => close(null)}
                class="px-3 py-2 text-xs font-bold text-neutral-600 dark:text-slate-300 hover:text-neutral-800 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            >
                Ohne Kontakt fortfahren
            </button>

            <div class="flex items-center gap-2">
                <button 
                    type="button" 
                    onclick={() => close(null)}
                    class="px-3 py-2 text-xs font-bold text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                    Abbrechen
                </button>
                <button 
                    type="button" 
                    onclick={() => controller.handleSaveContact((contact) => close(contact))}
                    disabled={controller.isSaving}
                    class="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                    {#if controller.isSaving}
                        <svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                        <span>Speichert...</span>
                    {:else}
                        <span>✓</span>
                        <span>Als Kontakt anlegen & verknüpfen</span>
                    {/if}
                </button>
            </div>
        </div>

    </div>
    {/if}
</dialog>
