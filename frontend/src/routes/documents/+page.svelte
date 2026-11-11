<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { pb } from "$lib/services/pocketbase";
    import DocumentGeneratorModal from "$lib/components/DocumentGeneratorModal.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";

    let searchQuery = $state("");
    // svelte-ignore non_reactive_update
    let generatorModal: ReturnType<typeof DocumentGeneratorModal>;
    
    let documents = $derived.by(() => {
        const allDocs = orgaStore.document_templates?.data || [];
        if (!searchQuery) return allDocs;
        return allDocs.filter(d => 
            (d.title || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    async function duplicateDoc(doc: any) {
        try {
            const data = {
                title: doc.title + " (Kopie)",
                type: doc.type,
                content_html: doc.content_html,
                css_style: doc.css_style
            };
            await pb.collection('document_templates').create(data);
            toastStore.success(`Vorlage "${doc.title}" wurde erfolgreich dupliziert.`);
        } catch (err) {
            toastStore.error("Fehler beim Duplizieren der Vorlage.");
        }
    }

    async function deleteDoc(id: string) {
        if (await confirmStore.ask("Möchten Sie diese Vorlage wirklich löschen?", "Vorlage löschen?", "Löschen", "Abbrechen", true)) {
            await pb.collection('document_templates').delete(id);
            toastStore.info("Vorlage wurde gelöscht.");
        }
    }

    async function migrateInheritorToCaregiver() {
        if (await confirmStore.ask("Möchten Sie alle alten Platzhalter (Erbe) in den Vorlagen zu Betreuer (Caregiver) korrigieren?", "Platzhalter reparieren?", "Ja, reparieren", "Abbrechen", true)) {
            try {
                let count = 0;
                for (const doc of documents) {
                    if (doc.content_html && JSON.stringify(doc.content_html).includes('{{inheritor.')) {
                        const newHtml = JSON.parse(JSON.stringify(doc.content_html).replace(/\{\{inheritor\./g, '{{caregiver.'));
                        await pb.collection('document_templates').update(doc.id, { content_html: newHtml });
                        count++;
                    }
                }
                toastStore.success(`${count} Vorlage(n) erfolgreich aktualisiert!`);
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                toastStore.error("Fehler bei der Reparatur der Platzhalter.");
            }
        }
    }
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Vorlagenverwaltung</h1>
        <p class="orga-page-subtitle">Erstellen und verwalten Sie hier Master-Vorlagen für Rechnungen, Formulare und Briefe.</p>
    </div>
    <div class="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto mt-4 sm:mt-0">
        <button onclick={migrateInheritorToCaregiver} class="orga-button-ghost inline-flex w-full sm:w-auto justify-center py-3 sm:py-2.5" title="Alte Platzhalter korrigieren">
            ✨ Platzhalter reparieren
        </button>
        <button onclick={() => generatorModal?.open()} class="orga-button-primary bg-neutral-900 hover:bg-neutral-800 shadow-neutral-900/20 inline-flex w-full sm:w-auto justify-center py-3 sm:py-2.5">
            Dokument generieren
        </button>
        <a href="/documents/new?preset=letterhead" class="orga-button-primary inline-flex w-full sm:w-auto justify-center py-3 sm:py-2.5 shadow-brand-600/20" title="Erstellt einen neuen Geschäftsbrief mit Firmenlogo nach DIN 5008">
            ✉️ Neuer Brief (DIN 5008)
        </a>
        <a href="/documents/new" class="orga-button-ghost inline-flex w-full sm:w-auto justify-center py-3 sm:py-2.5">
            + Neue Vorlage
        </a>
    </div>
</div>

<div class="orga-filter-bar animate-enter delay-100">
    <div class="flex-1">
        <label for="search-docs" class="sr-only">Vorlagen durchsuchen</label>
    <input id="search-docs" type="text" bind:value={searchQuery} placeholder="Nach Titel suchen..." class="orga-input-clear py-3 sm:py-2.5" />
    </div>
</div>

<div class="orga-card-white overflow-hidden animate-enter delay-200">
    <!-- Desktop Table View -->
    <div class="hidden md:block overflow-x-auto custom-scrollbar">
        <table class="w-full text-left border-collapse min-w-150">
            <thead class="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
                <tr>
                    <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Titel</th>
                    <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Typ</th>
                    <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Zuletzt bearbeitet</th>
                    <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider text-right">Aktionen</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                {#each documents as doc (doc.id)}
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group">
                        <td class="p-3.5 sm:p-4">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 rounded-lg flex items-center justify-center text-lg shrink-0 shadow-inner">📄</div>
                                <div>
                                    <a href="/documents/{doc.id}" class="font-bold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-sm sm:text-base">{doc.title || 'Unbenannte Vorlage'}</a>
                                    {#if doc.content_html?.fields}
                                        <span class="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">{doc.content_html.fields.length} Elemente</span>
                                    {:else}
                                        <span class="text-xs text-slate-400 dark:text-slate-500 block mt-0.5 italic">Leere Vorlage</span>
                                    {/if}
                                </div>
                            </div>
                        </td>
                        <td class="p-3.5 sm:p-4">
                            <span class="inline-block px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 w-max uppercase tracking-wider">{doc.type || 'Dokument'}</span>
                        </td>
                        <td class="p-3.5 sm:p-4 text-slate-700 dark:text-slate-200 font-medium text-sm tabular-nums">
                            {new Date(doc.updated || doc.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td class="p-3.5 sm:p-4">
                            <div class="flex items-center justify-end gap-2">
                                <button onclick={() => duplicateDoc(doc)} class="p-2 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors" title="Duplizieren"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                                <button onclick={() => deleteDoc(doc.id)} class="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors" title="Löschen"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                <a href="/documents/{doc.id}" class="text-brand-700 dark:text-brand-300 hover:text-brand-900 font-bold text-sm bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 px-3.5 py-2 rounded-lg border border-brand-200 dark:border-brand-800 transition-colors ml-2">Bearbeiten</a>
                            </div>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    <!-- Mobile Card View -->
    <div class="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {#each documents as doc (doc.id)}
            <div class="p-4 flex flex-col gap-3">
                <div class="flex items-start gap-3">
                    <div class="w-10 h-10 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 rounded-lg flex items-center justify-center text-lg shrink-0 shadow-inner">📄</div>
                    <div class="flex-1 min-w-0">
                        <a href="/documents/{doc.id}" class="font-bold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors line-clamp-2">{doc.title || 'Unbenannte Vorlage'}</a>
                        <span class="inline-block mt-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 w-max uppercase tracking-wider">{doc.type || 'Dokument'}</span>
                    </div>
                </div>
                <div class="flex items-center justify-between gap-2 mt-1 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span class="text-xs text-slate-500 dark:text-slate-400 font-semibold">{new Date(doc.updated || doc.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                    <div class="flex items-center gap-1.5">
                        <button onclick={() => duplicateDoc(doc)} class="p-2 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors" title="Duplizieren"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                        <button onclick={() => deleteDoc(doc.id)} class="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors" title="Löschen"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        <a href="/documents/{doc.id}" class="text-brand-700 dark:text-brand-300 hover:text-brand-900 font-bold text-sm bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/60 px-3 py-1.5 rounded-md border border-brand-200 dark:border-brand-800 transition-colors ml-1">Bearbeiten</a>
                    </div>
                </div>
            </div>
        {/each}
    </div>
</div>

<DocumentGeneratorModal bind:this={generatorModal} />