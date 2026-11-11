<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { getNormalizedContactRelation, buildRoleRelationFields } from "$lib/services/clientContactRoleHelper";
    import { X, Link2Off, Check, HeartHandshake } from "lucide-svelte";
    import { COMMON_RELATIONS } from "./clientRelationData";

    let { clientId } = $props<{ clientId: string }>();

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let contact = $state<any>(null);
    let relation = $state("Angehörige/r");
    let isPrimary = $state(false);
    let isCareperson = $state(false);
    let hasPowerOfAttorney = $state(false);
    let notes = $state("");
    let isLoading = $state(false);

    export function open(c: any, currentRelationData?: any) {
        contact = c;
        const client = orgaStore.clients?.getById(clientId);
        const norm = c?.id ? getNormalizedContactRelation(client, c.id) : null;

        if (typeof currentRelationData === 'string') {
            relation = currentRelationData;
            isPrimary = Boolean(norm?.is_primary);
            isCareperson = Boolean(norm?.is_careperson || currentRelationData.toLowerCase().includes('pflegeperson'));
            hasPowerOfAttorney = Boolean(norm?.has_power_of_attorney);
            notes = "";
        } else if (currentRelationData && typeof currentRelationData === 'object') {
            relation = currentRelationData.relation || "Angehörige/r";
            isPrimary = Boolean(currentRelationData.is_primary);
            isCareperson = Boolean(currentRelationData.is_careperson ?? norm?.is_careperson);
            hasPowerOfAttorney = Boolean(currentRelationData.has_power_of_attorney ?? norm?.has_power_of_attorney);
            notes = currentRelationData.notes || "";
        } else {
            relation = c?.company_name || "Angehörige/r";
            isPrimary = Boolean(norm?.is_primary);
            isCareperson = Boolean(norm?.is_careperson);
            hasPowerOfAttorney = Boolean(norm?.has_power_of_attorney);
            notes = "";
        }

        try {
            if (!dialog?.open) dialog?.showModal();
        } catch (e) {
            console.warn(e);
        }
    }

    export function close() {
        try {
            if (dialog?.open) dialog.close();
        } catch (e) {
            console.warn(e);
        }
    }

    async function refreshClientStore(id: string) {
        const updatedClient = await pb.collection('clients').getOne(id, { 
            expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', 
            requestKey: null 
        }) as any;
        const index = orgaStore.clients?.data.findIndex((c: any) => c.id === id) ?? -1;
        if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
    }

    async function handleSave() {
        if (!contact || !clientId) return;
        isLoading = true;
        try {
            const client = orgaStore.clients?.getById(clientId);
            const currentRelations: Record<string, any> = { ...(client?.contact_relations || {}) };
            if (isPrimary) {
                for (const [cid, r] of Object.entries(currentRelations)) {
                    if (cid !== contact.id && typeof r === 'object' && r) {
                        currentRelations[cid] = { ...r, is_primary: false };
                    }
                }
            }
            currentRelations[contact.id] = {
                relation: relation.trim() || "Angehörige/r",
                is_primary: isPrimary,
                is_careperson: isCareperson,
                has_power_of_attorney: hasPowerOfAttorney,
                notes: notes.trim()
            };

            const contactIds = Array.isArray(client?.contacts) ? client.contacts : (client?.contacts ? [client.contacts] : []);
            const roleFields = buildRoleRelationFields(contactIds, currentRelations);

            await pb.collection('clients').update(clientId, {
                contact_relations: currentRelations,
                caregiver: roleFields.caregiver,
                inheritor: roleFields.inheritor
            });
            setTimeout(() => refreshClientStore(clientId), 200);

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
            "Verknüpfung aufheben?", "Verknüpfung aufheben", "Abbrechen", true
        ))) return;

        isLoading = true;
        try {
            const client = orgaStore.clients?.getById(clientId);
            const existingIds = Array.isArray(client?.contacts) ? client.contacts : (client?.contacts ? [client.contacts] : []);
            const updatedContacts = existingIds.filter((id: string) => id !== contact.id);
            const currentRelations = { ...(client?.contact_relations || {}) };
            delete currentRelations[contact.id];
            const roleFields = buildRoleRelationFields(updatedContacts, currentRelations);

            await pb.collection('clients').update(clientId, {
                contacts: updatedContacts,
                contact_relations: currentRelations,
                caregiver: roleFields.caregiver,
                inheritor: roleFields.inheritor
            });

            setTimeout(() => refreshClientStore(clientId), 200);
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
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-md w-full max-w-lg mx-auto my-6 sm:my-10 rounded-3xl border-none shadow-2xl z-[9999]"
    onclick={(e) => { if (e.target === dialog) close(); }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    <div class="bg-white dark:bg-slate-900 rounded-3xl w-full flex flex-col relative shadow-2xl border border-neutral-100 dark:border-slate-800 text-neutral-900 dark:text-slate-100">
        <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 sm:px-7 py-4 sm:py-5 border-b border-indigo-900/60 flex items-center justify-between shrink-0 rounded-t-3xl text-white relative overflow-hidden">
            <div class="flex items-center gap-3 relative z-10 min-w-0 pr-10">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-500/30 border border-white/20 shrink-0">
                    <HeartHandshake class="w-5 h-5" />
                </div>
                <div class="min-w-0">
                    <h2 class="text-base sm:text-lg font-black text-white leading-tight truncate drop-shadow-sm">Beziehung zum Klienten</h2>
                    <p class="text-xs text-indigo-200/80 font-medium mt-0.5 truncate">
                        {contact ? `${contact.name_first || ''} ${contact.name_last || ''}`.trim() || contact.company_name : 'Kontakt'} · Rolle & Vollmachten
                    </p>
                </div>
            </div>
            <button aria-label="Schließen" onclick={close} class="min-w-[44px] min-h-[44px] bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0 cursor-pointer border border-white/10 z-10 touch-manipulation">
                <X class="w-4 h-4" />
            </button>
        </div>

        <div class="p-5 sm:p-7 space-y-5">
            <div>
                <label for="relation-input" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 uppercase tracking-wider mb-2">Beziehung / Rolle</label>
                <input 
                    id="relation-input"
                    type="text" 
                    bind:value={relation} 
                    placeholder="z.B. Tochter, Ehepartner/in, Hausarzt..."
                    class="orga-input-clear dark:bg-slate-800 dark:text-white dark:border-slate-700 text-base font-bold min-h-[44px] touch-manipulation" 
                />
            </div>

            <div class="space-y-3">
                <p class="text-[11px] font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider">Schnellauswahl</p>
                {#each COMMON_RELATIONS as group}
                    <div class="space-y-1.5">
                        <span class="text-[10px] font-bold text-neutral-500 dark:text-slate-400">{group.group}:</span>
                        <div class="flex flex-wrap gap-1.5">
                            {#each group.items as item}
                                <button 
                                    type="button" 
                                    onclick={() => relation = item}
                                    class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all min-h-[36px] cursor-pointer touch-manipulation {relation === item ? 'bg-indigo-600 text-white shadow-xs font-bold' : 'bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 hover:bg-neutral-200 dark:hover:bg-slate-700 border border-neutral-200 dark:border-slate-700'}"
                                >
                                    {item}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/each}
            </div>

            <div class="pt-4 border-t border-neutral-100 dark:border-slate-800 space-y-3">
                <label class="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-neutral-800 dark:text-slate-200 select-none touch-manipulation">
                    <input type="checkbox" bind:checked={isPrimary} class="w-5 h-5 text-indigo-600 rounded" />
                    <span>⭐ Hauptansprechpartner/in für diesen Klienten</span>
                </label>

                <label class="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-neutral-800 dark:text-slate-200 select-none touch-manipulation">
                    <input type="checkbox" bind:checked={isCareperson} class="w-5 h-5 text-indigo-600 rounded" />
                    <span>🤝 Ist Pflegeperson (§ 39 SGB XI Verhinderungspflege)</span>
                </label>

                <label class="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-neutral-800 dark:text-slate-200 select-none touch-manipulation">
                    <input type="checkbox" bind:checked={hasPowerOfAttorney} class="w-5 h-5 text-indigo-600 rounded" />
                    <span>📜 Rechtliche Vertretung / Vorsorgevollmacht / Erbe</span>
                </label>
            </div>

            <div>
                <label for="relation-notes" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Zusätzliche Notiz zur Verknüpfung (optional)</label>
                <input 
                    id="relation-notes"
                    type="text" 
                    bind:value={notes} 
                    placeholder="z.B. Nur im Notfall anrufen, erreichbar ab 17 Uhr..."
                    class="orga-input-clear dark:bg-slate-800 dark:text-white dark:border-slate-700 text-xs min-h-[44px] touch-manipulation" 
                />
            </div>
        </div>

        <div class="p-4 sm:p-5 bg-neutral-50 dark:bg-slate-900/90 border-t border-neutral-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 rounded-b-3xl">
            <button 
                type="button" 
                onclick={handleUnlink}
                class="orga-button-ghost text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 py-2.5 px-3.5 flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[44px] cursor-pointer touch-manipulation"
                disabled={isLoading}
            >
                <Link2Off class="w-4 h-4" />
                <span>Verknüpfung aufheben</span>
            </button>

            <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button type="button" onclick={close} class="orga-button-ghost dark:text-slate-300 dark:hover:bg-slate-800 text-xs py-2.5 px-4 w-full sm:w-auto min-h-[44px] cursor-pointer touch-manipulation" disabled={isLoading}>Abbrechen</button>
                <button type="button" onclick={handleSave} class="orga-button-primary text-xs py-2.5 px-5 flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[44px] shadow-brand-600/20 cursor-pointer touch-manipulation" disabled={isLoading}>
                    <Check class="w-4 h-4" />
                    <span>{isLoading ? 'Speichert...' : 'Beziehung speichern'}</span>
                </button>
            </div>
        </div>
    </div>
</dialog>
