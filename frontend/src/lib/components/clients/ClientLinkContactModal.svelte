<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    // @ts-ignore
    import type { ContactRecord } from "$lib/types/pocketbase-types";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import {
        getNormalizedContactRelation,
        buildRoleRelationFields,
        type ContactRoleRelation
    } from "$lib/services/clientContactRoleHelper";
    import { Users, Search, Check, Plus } from "lucide-svelte";

    let { client, onCreateNewContact } = $props<{
        client: any;
        onCreateNewContact?: (onSaved: (c: any) => void) => void;
    }>();

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");
    let searchQuery = $state("");

    let contacts = $state<string[]>([]);
    let contact_relations = $state<Record<string, ContactRoleRelation>>({});

    const RELATION_OPTIONS = [
        "Angehörige/r", "Bevollmächtigte/r", "Ehepartner/in", "Enkel/in",
        "Facharzt / Fachärztin", "Freund/in", "Gesetzliche/r Betreuer/in", "Geschwister",
        "Hausarzt / Hausärztin", "Mutter", "Nachbar/in", "Pflegedienst", "Pflegeperson",
        "Schwiegersohn", "Schwiegertochter", "Sohn", "Sonstiges", "Tochter", "Vater"
    ];

    export function open() {
        contacts = Array.isArray(client?.contacts) ? [...client.contacts] : (client?.contacts ? [client.contacts] : []);
        contact_relations = {};
        for (const cId of contacts) {
            contact_relations[cId] = getNormalizedContactRelation(client, cId);
        }
        errorMsg = "";
        try {
            if (!dialog?.open) dialog?.showModal();
        } catch (e) {}
    }

    export function close() {
        try {
            if (dialog?.open) dialog.close();
        } catch (e) {}
    }

    function ensureRelationEntry(id: string, defaultRel = "Angehörige/r") {
        if (!contact_relations[id]) {
            contact_relations[id] = {
                relation: defaultRel,
                is_primary: contacts.length === 1,
                is_careperson: defaultRel === "Pflegeperson",
                has_power_of_attorney: defaultRel === "Bevollmächtigte/r" || defaultRel === "Gesetzliche/r Betreuer/in",
                notes: ""
            };
        }
    }

    function toggleContact(id: string, defaultRelation?: string) {
        if (contacts.includes(id)) {
            contacts = contacts.filter((cId) => cId !== id);
        } else {
            contacts = [...contacts, id];
            const validRel = defaultRelation && RELATION_OPTIONS.includes(defaultRelation) ? defaultRelation : "Angehörige/r";
            ensureRelationEntry(id, validRel);
        }
    }

    function handleCreateContactClick() {
        if (!onCreateNewContact) return;
        onCreateNewContact((saved: any) => {
            if (saved?.id && !contacts.includes(saved.id)) {
                contacts = [...contacts, saved.id];
                ensureRelationEntry(saved.id, "Angehörige/r");
            }
        });
    }

    let filteredContacts: ContactRecord[] = $derived.by(() => {
        const allContacts = (orgaStore.contacts?.data || []).slice().sort((a: any, b: any) => {
            const nameA = (a.name_last ? `${a.name_last} ${a.name_first || ""}` : a.company_name || a.email || "").trim();
            const nameB = (b.name_last ? `${b.name_last} ${b.name_first || ""}` : b.company_name || b.email || "").trim();
            return nameA.localeCompare(nameB, "de", { sensitivity: "base" });
        });
        if (!searchQuery) return allContacts;
        const lowerCaseQuery = searchQuery.toLowerCase();
        return allContacts.filter((c: any) =>
            (c.name_first && c.name_first.toLowerCase().includes(lowerCaseQuery)) ||
            (c.name_last && c.name_last.toLowerCase().includes(lowerCaseQuery)) ||
            (c.company_name && c.company_name.toLowerCase().includes(lowerCaseQuery))
        );
    });

    async function onSubmit(e: Event) {
        e.preventDefault();
        if (!client?.id) return;
        isLoading = true;
        errorMsg = "";
        try {
            const relationsPayload: Record<string, ContactRoleRelation> = {};
            for (const cId of contacts) {
                relationsPayload[cId] = contact_relations[cId] || {
                    relation: "Angehörige/r",
                    is_primary: false,
                    is_careperson: false,
                    has_power_of_attorney: false
                };
            }
            const { caregiver, inheritor } = buildRoleRelationFields(relationsPayload);
            await pb.collection("clients").update(client.id, {
                contacts,
                contact_relations: relationsPayload,
                caregiver,
                inheritor
            });
            if (orgaStore.clients) await orgaStore.clients.init();
            close();
        } catch (err: any) {
            errorMsg = err.message || "Fehler beim Speichern der Verknüpfungen.";
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-neutral-900/60 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-4 sm:my-8 landscape:my-2 rounded-3xl border-none shadow-2xl z-50 outline-none"
    onclick={(e) => { if (e.target === dialog) close(); }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-slate-800 w-full flex flex-col relative overflow-hidden transition-colors">
        <div class="p-5 sm:p-6 bg-gradient-to-r from-indigo-500/10 via-sky-500/5 to-transparent border-b border-neutral-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                    <Users class="w-5 h-5" />
                </div>
                <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                        Bezugspersonen & Rollen
                    </span>
                    <h3 class="text-base sm:text-lg font-bold text-neutral-900 dark:text-white mt-0.5">
                        Kontakte verknüpfen
                    </h3>
                </div>
            </div>
            <button type="button" aria-label="Schließen" onclick={close} class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center transition-colors text-sm shrink-0 cursor-pointer">✕</button>
        </div>

        <form onsubmit={onSubmit} class="flex flex-col flex-1">
            <div class="p-5 sm:p-6 space-y-3.5 flex-1">
                {#if errorMsg}
                    <div class="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 p-3 rounded-2xl text-xs font-bold border border-rose-200 dark:border-rose-900">{errorMsg}</div>
                {/if}

                <div class="flex gap-2">
                    <div class="relative flex-1">
                        <Search class="w-4 h-4 text-neutral-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            bind:value={searchQuery}
                            placeholder="Kontakte nach Namen suchen..."
                            class="orga-input-clear pl-10 text-xs sm:text-sm dark:bg-slate-800 dark:text-white dark:border-slate-700"
                        />
                    </div>
                    {#if onCreateNewContact}
                        <button type="button" onclick={handleCreateContactClick} class="orga-button-secondary px-3 py-2 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer">
                            <Plus class="w-3.5 h-3.5" /> Neu
                        </button>
                    {/if}
                </div>

                <div class="border border-neutral-100 dark:border-slate-800 rounded-2xl p-2 bg-neutral-50/50 dark:bg-slate-900/60 space-y-2">
                    {#each filteredContacts as c (c.id)}
                        {@const isChecked = contacts.includes(c.id)}
                        <div class="p-3 hover:bg-white dark:hover:bg-slate-800/80 rounded-xl transition-all border {isChecked ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/40 shadow-xs' : 'border-neutral-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-800/50'}">
                            <label class="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onchange={() => toggleContact(c.id, c.company_name)}
                                    class="w-4 h-4 text-indigo-600 border-neutral-300 dark:border-slate-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                                    disabled={isLoading}
                                />
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-bold text-neutral-900 dark:text-white truncate">{c.name_first} {c.name_last}</p>
                                    {#if c.company_name}<p class="text-xs text-neutral-500 dark:text-slate-400 truncate">{c.company_name}</p>{/if}
                                </div>
                            </label>

                            {#if isChecked && contact_relations[c.id]}
                                <div class="mt-2.5 pl-7 space-y-2">
                                    <div class="flex items-center gap-2">
                                        <label for="rel-select-{c.id}" class="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 shrink-0">Beziehung:</label>
                                        <select
                                            id="rel-select-{c.id}"
                                            bind:value={contact_relations[c.id].relation}
                                            class="text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-indigo-900 dark:text-indigo-200 font-bold focus:ring-indigo-500 w-full cursor-pointer shadow-2xs"
                                        >
                                            {#each RELATION_OPTIONS as opt}
                                                <option value={opt}>{opt}</option>
                                            {/each}
                                        </select>
                                    </div>
                                    <div class="flex flex-wrap gap-2 pt-0.5">
                                        <label class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 cursor-pointer">
                                            <input type="checkbox" bind:checked={contact_relations[c.id].is_primary} class="w-3.5 h-3.5 rounded text-amber-600" />
                                            <span>⭐ Hauptkontakt</span>
                                        </label>
                                        <label class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 cursor-pointer">
                                            <input type="checkbox" bind:checked={contact_relations[c.id].is_careperson} class="w-3.5 h-3.5 rounded text-indigo-600" />
                                            <span>🤝 Pflegeperson (§ 39)</span>
                                        </label>
                                        <label class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 cursor-pointer">
                                            <input type="checkbox" bind:checked={contact_relations[c.id].has_power_of_attorney} class="w-3.5 h-3.5 rounded text-emerald-600" />
                                            <span>📜 Vollmacht / Vertretung</span>
                                        </label>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                    {#if filteredContacts.length === 0}
                        <p class="text-xs text-neutral-400 dark:text-slate-500 p-4 italic text-center">Keine Kontakte gefunden.</p>
                    {/if}
                </div>
            </div>

            <div class="p-4 bg-neutral-50 dark:bg-slate-900/80 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <button type="button" onclick={close} class="orga-button-ghost py-2.5 px-4 text-xs dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer" disabled={isLoading}>
                    Schließen
                </button>
                <button type="submit" class="orga-button-primary py-2.5 px-5 text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer" disabled={isLoading}>
                    <Check class="w-3.5 h-3.5" />
                    <span>{isLoading ? "Speichert..." : "Verknüpfen"}</span>
                </button>
            </div>
        </form>
    </div>
</dialog>
