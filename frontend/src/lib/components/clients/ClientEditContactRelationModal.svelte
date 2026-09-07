<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { X, Link2Off, Check, HeartHandshake } from "lucide-svelte";

    let { clientId } = $props<{ clientId: string }>();

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let contact = $state<any>(null);
    let relation = $state("Angehörige/r");
    let isPrimary = $state(false);
    let hasPowerOfAttorney = $state(false);
    let notes = $state("");
    let isLoading = $state(false);

    const commonRelations = [
        { group: "Familie", items: ["Tochter", "Sohn", "Ehepartner/in", "Mutter", "Vater", "Enkel/in", "Schwiegertochter", "Schwiegersohn", "Geschwister"] },
        { group: "Umfeld", items: ["Pflegeperson", "Nachbar/in", "Freund/in", "Bekannte/r"] },
        { group: "Recht & Betreuung", items: ["Gesetzliche/r Betreuer/in", "Bevollmächtigte/r"] },
        { group: "Medizin & Pflege", items: ["Hausarzt / Hausärztin", "Facharzt / Fachärztin", "Pflegedienst"] }
    ];

    export function open(c: any, currentRelationData?: any) {
        contact = c;
        if (typeof currentRelationData === 'string') {
            relation = currentRelationData;
            isPrimary = false;
            hasPowerOfAttorney = false;
            notes = "";
        } else if (currentRelationData && typeof currentRelationData === 'object') {
            relation = currentRelationData.relation || "Angehörige/r";
            isPrimary = Boolean(currentRelationData.is_primary);
            hasPowerOfAttorney = Boolean(currentRelationData.has_power_of_attorney);
            notes = currentRelationData.notes || "";
        } else {
            relation = c.company_name || "Angehörige/r";
            isPrimary = false;
            hasPowerOfAttorney = false;
            notes = "";
        }

        try {
            if (!dialog?.open) {
                dialog?.showModal();
            }
        } catch (e) {
            console.warn(e);
        }
    }

    export function close() {
        try {
            if (dialog?.open) {
                dialog.close();
            }
        } catch (e) {
            console.warn(e);
        }
    }

    async function handleSave() {
        if (!contact || !clientId) return;
        isLoading = true;
        try {
            const client = orgaStore.clients?.getById(clientId);
            const currentRelations = { ...(client?.contact_relations || {}) };
            
            currentRelations[contact.id] = {
                relation: relation.trim() || "Angehörige/r",
                is_primary: isPrimary,
                has_power_of_attorney: hasPowerOfAttorney,
                notes: notes.trim()
            };

            await pb.collection('clients').update(clientId, {
                contact_relations: currentRelations
            });

            // Store aktualisieren
            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(clientId, { 
                    expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', 
                    requestKey: null 
                }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === clientId) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 300);

            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try { navigator.vibrate(40); } catch {}
            }

            toastStore.success(`Beziehung zu "${contact.name_first || ''} ${contact.name_last || ''}" gespeichert.`);
            close();
        } catch (err: any) {
            console.error(err);
            toastStore.error("Fehler beim Speichern der Beziehung.");
        } finally {
            isLoading = false;
        }
    }

    async function handleUnlink() {
        if (!contact || !clientId) return;
        const contactName = `${contact.name_first || ''} ${contact.name_last || ''}`.trim() || contact.company_name || 'Kontakt';
        
        if (!(await confirmStore.ask(
            `Möchten Sie die Verknüpfung zu "${contactName}" wirklich aufheben?\n\nDer Kontakt bleibt im System erhalten und wird lediglich von dieser Klienten-Akte getrennt.`,
            "Verknüpfung aufheben?",
            "Verknüpfung aufheben",
            "Abbrechen",
            true
        ))) return;

        isLoading = true;
        try {
            const client = orgaStore.clients?.getById(clientId);
            const existingIds = Array.isArray(client?.contacts) ? client.contacts : (client?.contacts ? [client.contacts] : []);
            const updatedContacts = existingIds.filter((id: string) => id !== contact.id);
            
            const currentRelations = { ...(client?.contact_relations || {}) };
            delete currentRelations[contact.id];

            await pb.collection('clients').update(clientId, {
                contacts: updatedContacts,
                contact_relations: currentRelations
            });

            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(clientId, { 
                    expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', 
                    requestKey: null 
                }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === clientId) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 300);

            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try { navigator.vibrate(40); } catch {}
            }

            toastStore.success(`Verknüpfung zu "${contactName}" erfolgreich aufgehoben.`);
            close();
        } catch (err: any) {
            console.error(err);
            toastStore.error("Fehler beim Aufheben der Verknüpfung.");
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-lg m-0 sm:m-auto fixed sm:relative inset-x-0 bottom-0 sm:bottom-auto max-h-[92vh] rounded-t-3xl sm:rounded-3xl border-none shadow-2xl z-[9999] touch-pan-y"
    onclick={(e) => { if (e.target === dialog) close(); }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    <!-- Mobile Drag Handle -->
    <div class="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto my-2 sm:hidden shrink-0"></div>

    <div class="bg-white rounded-t-3xl sm:rounded-3xl w-full max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl border border-neutral-100">
        <!-- Header -->
        <div class="bg-white px-5 sm:px-7 py-4 sm:py-5 border-b border-neutral-200 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-sm">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shadow-inner text-xl shrink-0">
                    <HeartHandshake class="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                    <h2 class="text-base sm:text-lg font-bold text-neutral-900 leading-tight">Beziehung zum Klienten festlegen</h2>
                    <p class="text-xs text-neutral-500 font-medium mt-0.5">
                        {contact ? `${contact.name_first || ''} ${contact.name_last || ''}`.trim() || contact.company_name : 'Kontakt'}
                    </p>
                </div>
            </div>
            <button aria-label="Schließen" onclick={close} class="w-9 h-9 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors shadow-sm shrink-0">
                <X class="w-4 h-4" />
            </button>
        </div>

        <!-- Body -->
        <div class="p-5 sm:p-7 overflow-y-auto custom-scrollbar space-y-5">
            <div>
                <label for="relation-input" class="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Beziehung / Rolle</label>
                <input 
                    id="relation-input"
                    type="text" 
                    bind:value={relation} 
                    placeholder="z.B. Tochter, Ehepartner/in, Hausarzt..."
                    class="orga-input-clear text-base font-bold min-h-[44px]" 
                />
            </div>

            <!-- Schnellauswahl Chips -->
            <div class="space-y-3">
                <p class="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Schnellauswahl</p>
                {#each commonRelations as group}
                    <div class="space-y-1.5">
                        <span class="text-[10px] font-bold text-neutral-500">{group.group}:</span>
                        <div class="flex flex-wrap gap-1.5">
                            {#each group.items as item}
                                <button 
                                    type="button"
                                    onclick={() => relation = item}
                                    class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px] {relation === item ? 'bg-indigo-600 text-white shadow-xs font-bold' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'}"
                                >
                                    {item}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Zusätzliche Optionen -->
            <div class="pt-4 border-t border-neutral-100 space-y-3">
                <label class="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-neutral-800 select-none">
                    <input type="checkbox" bind:checked={isPrimary} class="w-4 h-4 text-indigo-600 rounded" />
                    <span>⭐ Hauptansprechpartner/in für diesen Klienten</span>
                </label>

                <label class="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-neutral-800 select-none">
                    <input type="checkbox" bind:checked={hasPowerOfAttorney} class="w-4 h-4 text-indigo-600 rounded" />
                    <span>📜 Hat Vollmacht / Vorsorgevollmacht</span>
                </label>
            </div>

            <!-- Notiz -->
            <div>
                <label for="relation-notes" class="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Zusätzliche Notiz zur Verknüpfung (optional)</label>
                <input 
                    id="relation-notes"
                    type="text" 
                    bind:value={notes} 
                    placeholder="z.B. Nur im Notfall anrufen, erreichbar ab 17 Uhr..."
                    class="orga-input-clear text-xs min-h-[40px]" 
                />
            </div>
        </div>

        <!-- Footer Actions -->
        <div class="p-4 sm:p-5 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <button 
                type="button" 
                onclick={handleUnlink}
                class="orga-button-ghost text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 py-2.5 px-3.5 flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[44px]"
                disabled={isLoading}
                title="Verknüpfung zu diesem Klienten aufheben"
            >
                <Link2Off class="w-4 h-4" />
                <span>Verknüpfung aufheben</span>
            </button>

            <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button 
                    type="button" 
                    onclick={close}
                    class="orga-button-ghost text-xs py-2.5 px-4 w-full sm:w-auto min-h-[44px]"
                    disabled={isLoading}
                >
                    Abbrechen
                </button>
                <button 
                    type="button" 
                    onclick={handleSave}
                    class="orga-button-primary text-xs py-2.5 px-5 flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[44px] shadow-brand-600/20"
                    disabled={isLoading}
                >
                    <Check class="w-4 h-4" />
                    <span>{isLoading ? 'Speichert...' : 'Beziehung speichern'}</span>
                </button>
            </div>
        </div>
    </div>
</dialog>
